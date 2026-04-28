package com.kia.dms.modules.leads.service.impl;

import com.kia.dms.common.response.PaginationResponse;
import com.kia.dms.exception.ResourceNotFoundException;
import com.kia.dms.modules.leads.dto.request.TestDriveRequest;
import com.kia.dms.modules.leads.dto.response.LeadResponse;
import com.kia.dms.modules.leads.dto.response.TestDriveResponse;
import com.kia.dms.modules.leads.entity.LeadEntity;
import com.kia.dms.modules.leads.entity.TestDriveEntity;
import com.kia.dms.modules.leads.repository.LeadRepository;
import com.kia.dms.modules.leads.repository.TestDriveRepository;
import com.kia.dms.modules.leads.service.LeadService;
import com.kia.dms.modules.dealer.entity.DealerEntity;
import com.kia.dms.modules.dealer.repository.DealerRepository;
import com.kia.dms.modules.user.entity.UserEntity;
import com.kia.dms.modules.user.repository.UserRepository;
import com.kia.dms.modules.vehicle.entity.VehicleEntity;
import com.kia.dms.modules.vehicle.repository.VehicleRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.kia.dms.common.dto.request.GlobalSearchRequest;
import com.kia.dms.common.specification.GenericSpecificationBuilder;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import java.util.ArrayList;
import java.util.Arrays;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class LeadServiceImpl implements LeadService {

    @Autowired private LeadRepository leadRepository;
    @Autowired private TestDriveRepository testDriveRepository;
    @Autowired private VehicleRepository vehicleRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private DealerRepository dealerRepository;
    @Autowired private com.kia.dms.modules.files.service.FileService fileService;

    private void applyMasking(LeadResponse res) {
        String role = com.kia.dms.common.utils.SecurityUtils.getCurrentUserRole();
        
        // Admin: No masking
        if (role.equals("ADMIN") || role.equals("ROLE_ADMIN")) {
            return;
        }
        
        // Manager: Mask phone, keep email
        if (role.equals("MANAGER") || role.equals("ROLE_MANAGER")) {
            res.setPhone(com.kia.dms.common.utils.MaskingUtil.maskPhone(res.getPhone()));
            return;
        }
        
        // Dealer/Other: Mask both
        res.setEmail(com.kia.dms.common.utils.MaskingUtil.maskEmail(res.getEmail()));
        res.setPhone(com.kia.dms.common.utils.MaskingUtil.maskPhone(res.getPhone()));
    }

    private UserEntity getCurrentUser() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByEmailWithRole(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }

    @Override
    @Transactional(readOnly = true)
    @Cacheable(value = "leads", key = "#pageable.pageNumber + '-' + #pageable.pageSize + '-' + T(org.springframework.security.core.context.SecurityContextHolder).getContext().getAuthentication().getName()")
    public PaginationResponse<LeadResponse> getLeads(Pageable pageable) {
        UserEntity currentUser = getCurrentUser();
        Page<LeadEntity> page;
        String roleName = currentUser.getRole().getName().toUpperCase();
        
        if (roleName.equals("ROLE_DEALER") || roleName.equals("DEALER")) {
            if (currentUser.getDealer() == null) throw new AccessDeniedException("No dealer context");
            page = leadRepository.findByDealerIdAndIsDeletedFalse(currentUser.getDealer().getId(), pageable);
        } else if (roleName.equals("ROLE_MANAGER") || roleName.equals("MANAGER")) {
            if (currentUser.getManagerProfile() == null) throw new AccessDeniedException("No manager context");
            page = leadRepository.findByManagerIdAndIsDeletedFalse(currentUser.getManagerProfile().getId(), pageable);
        } else {
            page = leadRepository.findByIsDeletedFalse(pageable);
        }
        List<LeadResponse> content = page.getContent().stream()
                .map(this::mapToLeadResponse)
                .collect(Collectors.toList());
        return new PaginationResponse<>(content, page.getNumber(), page.getSize(), page.getTotalElements(), page.getTotalPages());
    }

    @Override
    @Transactional
    @CacheEvict(value = {"leads", "analytics"}, allEntries = true)
    public LeadResponse createLead(LeadEntity lead) {
        UserEntity currentUser = getCurrentUser();
        String roleName = currentUser.getRole().getName().toUpperCase();
        
        if (roleName.equals("ROLE_DEALER") || roleName.equals("DEALER")) {
            lead.setDealer(currentUser.getDealer());
        } else {
            // For admin/manager, dealer must be provided
            if (lead.getDealer() == null || lead.getDealer().getId() == null) {
                throw new IllegalArgumentException("Dealer must be specified for non-dealer users");
            }
            // Fetch the dealer entity
            DealerEntity dealer = dealerRepository.findById(lead.getDealer().getId())
                .orElseThrow(() -> new ResourceNotFoundException("Dealer not found"));
            lead.setDealer(dealer);
        }
        
        if (lead.getStatus() == null) lead.setStatus("NEW");
        
        return mapToLeadResponse(leadRepository.save(lead));
    }

    @Override
    @Transactional
    public LeadResponse createLeadWithFile(LeadEntity lead, java.util.List<org.springframework.web.multipart.MultipartFile> files) {
        LeadResponse response = createLead(lead);
        if (files != null && !files.isEmpty()) {
            for (org.springframework.web.multipart.MultipartFile file : files) {
                if (file != null && !file.isEmpty()) {
                    try {
                        fileService.uploadFile(file, "LEADS", response.getId());
                    } catch (java.io.IOException e) {
                        throw new RuntimeException("Failed to upload file: " + e.getMessage(), e);
                    }
                }
            }
        }
        return response;
    }

    @Override
    @Transactional
    @CacheEvict(value = {"leads", "analytics"}, allEntries = true)
    public LeadResponse updateLeadStatus(Long id, String status, Long version) {
        LeadEntity lead = leadRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Lead not found"));
        // Optimistic locking: compare versions, let Hibernate manage @Version automatically
        Long currentVersion = lead.getVersion() != null ? lead.getVersion() : 0L;
        if (version != null && !version.equals(currentVersion)) {
            throw new org.springframework.orm.ObjectOptimisticLockingFailureException(LeadEntity.class, id);
        }
        lead.setStatus(status);
        return mapToLeadResponse(leadRepository.save(lead));
    }

    @Override
    @Transactional(readOnly = true)
    public PaginationResponse<LeadResponse> searchLeads(GlobalSearchRequest request) {
        // 1. Build Sorting
        List<Sort.Order> orders = new ArrayList<>();
        if (request.getSorts() != null && !request.getSorts().isEmpty()) {
            for (GlobalSearchRequest.SortRequest sort : request.getSorts()) {
                orders.add(new Sort.Order(
                    Sort.Direction.fromString(sort.getDirection() != null ? sort.getDirection() : "DESC"),
                    sort.getField()
                ));
            }
        } else {
            orders.add(new Sort.Order(Sort.Direction.DESC, "id"));
        }
        
        Pageable pageable = PageRequest.of(request.getPage(), request.getSize(), Sort.by(orders));

        // 2. Build searchable columns for Leads
        List<String> searchableColumns = Arrays.asList("firstName", "lastName", "email", "phone", "status", "notes", "dealer.name");

        // 3. Build Specification
        Specification<LeadEntity> spec = GenericSpecificationBuilder.build(request, searchableColumns);

        // 4. Execute Search
        Page<LeadEntity> page = leadRepository.findAll(spec, pageable);
        
        List<LeadResponse> content = page.getContent().stream()
                .map(this::mapToLeadResponse)
                .collect(Collectors.toList());
        
        return new PaginationResponse<>(content, page.getNumber(), page.getSize(), page.getTotalElements(), page.getTotalPages());
    }

    @Override
    @Transactional(readOnly = true)
    public PaginationResponse<TestDriveResponse> getTestDrives(Pageable pageable) {
        UserEntity currentUser = getCurrentUser();
        Page<TestDriveEntity> page;
        String roleName = currentUser.getRole().getName().toUpperCase();

        if (roleName.equals("ROLE_DEALER") || roleName.equals("DEALER")) {
            if (currentUser.getDealer() == null) throw new AccessDeniedException("No dealer context");
            page = testDriveRepository.findByDealerIdAndIsDeletedFalse(currentUser.getDealer().getId(), pageable);
        } else if (roleName.equals("ROLE_MANAGER") || roleName.equals("MANAGER")) {
            if (currentUser.getManagerProfile() == null) throw new AccessDeniedException("No manager context");
            page = testDriveRepository.findByManagerIdAndIsDeletedFalse(currentUser.getManagerProfile().getId(), pageable);
        } else {
            page = testDriveRepository.findByIsDeletedFalse(pageable);
        }

        // Mapping happens inside @Transactional so all JOIN FETCH data is available.
        List<TestDriveResponse> content = page.getContent().stream()
                .map(this::mapToTestDriveResponse)
                .collect(Collectors.toList());

        return new PaginationResponse<>(content, page.getNumber(), page.getSize(), page.getTotalElements(), page.getTotalPages());
    }

    @Override
    @Transactional(readOnly = true)
    public PaginationResponse<TestDriveResponse> searchTestDrives(GlobalSearchRequest request) {
        // 1. Build Sorting
        List<Sort.Order> orders = new ArrayList<>();
        if (request.getSorts() != null && !request.getSorts().isEmpty()) {
            for (GlobalSearchRequest.SortRequest sort : request.getSorts()) {
                orders.add(new Sort.Order(
                    Sort.Direction.fromString(sort.getDirection() != null ? sort.getDirection() : "DESC"),
                    sort.getField()
                ));
            }
        } else {
            orders.add(new Sort.Order(Sort.Direction.DESC, "id"));
        }
        
        Pageable pageable = PageRequest.of(request.getPage(), request.getSize(), Sort.by(orders));

        // 2. Build searchable columns for Test Drives (including nested relations)
        List<String> searchableColumns = Arrays.asList(
            "status", 
            "lead.firstName", 
            "lead.lastName", 
            "lead.email", 
            "lead.phone", 
            "dealer.name", 
            "vehicle.kiaCar.modelName", 
            "vehicle.kiaCar.variant", 
            "vehicle.kiaCar.color"
        );

        // 3. Build Specification
        Specification<TestDriveEntity> spec = GenericSpecificationBuilder.build(request, searchableColumns);

        // 4. Role-based isolation
        UserEntity currentUser = getCurrentUser();
        String roleName = currentUser.getRole().getName().toUpperCase();
        
        Specification<TestDriveEntity> roleSpec = (root, query, cb) -> {
            if (roleName.equals("ROLE_DEALER") || roleName.equals("DEALER")) {
                return cb.equal(root.get("dealer").get("id"), currentUser.getDealer().getId());
            } else if (roleName.equals("ROLE_MANAGER") || roleName.equals("MANAGER")) {
                return cb.equal(root.get("dealer").get("manager").get("id"), currentUser.getManagerProfile().getId());
            }
            return cb.conjunction();
        };
        
        spec = spec.and(roleSpec);

        // 5. Execute Search
        Page<TestDriveEntity> page = testDriveRepository.findAll(spec, pageable);
        
        List<TestDriveResponse> content = page.getContent().stream()
                .map(this::mapToTestDriveResponse)
                .collect(Collectors.toList());
        
        return new PaginationResponse<>(content, page.getNumber(), page.getSize(), page.getTotalElements(), page.getTotalPages());
    }

    @Override
    @Transactional
    public TestDriveResponse scheduleTestDrive(TestDriveRequest request) {
        LeadEntity lead = leadRepository.findById(request.getLeadId())
                .orElseThrow(() -> new ResourceNotFoundException("Lead not found"));
        VehicleEntity vehicle = vehicleRepository.findById(request.getVehicleId())
                .orElseThrow(() -> new ResourceNotFoundException("Vehicle not found"));

        TestDriveEntity td = new TestDriveEntity();
        td.setLead(lead);
        td.setVehicle(vehicle);
        td.setScheduledAt(request.getScheduledAt());
        td.setStatus("PENDING");
        
        // Set dealer from lead
        if (lead.getDealer() != null) {
            td.setDealer(lead.getDealer());
        }

        return mapToTestDriveResponse(testDriveRepository.save(td));
    }

    @Override
    @Transactional
    public TestDriveResponse updateTestDrive(Long id, TestDriveRequest request) {
        TestDriveEntity td = testDriveRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Test drive not found"));
        
        LeadEntity lead = leadRepository.findById(request.getLeadId())
                .orElseThrow(() -> new ResourceNotFoundException("Lead not found"));
        VehicleEntity vehicle = vehicleRepository.findById(request.getVehicleId())
                .orElseThrow(() -> new ResourceNotFoundException("Vehicle not found"));

        td.setLead(lead);
        td.setVehicle(vehicle);
        td.setScheduledAt(request.getScheduledAt());
        
        // Update dealer from lead if changed
        if (lead.getDealer() != null) {
            td.setDealer(lead.getDealer());
        }

        return mapToTestDriveResponse(testDriveRepository.save(td));
    }

    // ─── Mappers ──────────────────────────────────────────────────────────────

    private LeadResponse mapToLeadResponse(LeadEntity entity) {
        LeadResponse res = new LeadResponse();
        res.setId(entity.getId());
        res.setFirstName(entity.getFirstName() != null ? entity.getFirstName() : "");
        res.setLastName(entity.getLastName() != null ? entity.getLastName() : "");
        res.setEmail(entity.getEmail());
        res.setPhone(entity.getPhone());
        res.setVehicleInterest(entity.getVehicleInterest());
        res.setStatus(entity.getStatus());
        res.setNotes(entity.getNotes());
        res.setLeadScore(entity.getLeadScore());
        
        applyMasking(res);
        try {
            if (entity.getDealer() != null) {
                res.setDealerId(entity.getDealer().getId());
                res.setDealerName(entity.getDealer().getName());
                
                // Get manager ID through dealer
                if (entity.getDealer().getManager() != null) {
                    res.setManagerId(entity.getDealer().getManager().getId());
                }
            } else {
                res.setDealerName("N/A");
            }
        } catch (Exception e) {
            res.setDealerName("N/A");
        }
        try {
            if (entity.getKiaCar() != null) {
                res.setKiaCarId(entity.getKiaCar().getId());
                res.setModelName(entity.getKiaCar().getModelName());
                res.setVariant(entity.getKiaCar().getVariant());
                res.setColor(entity.getKiaCar().getColor());
            }
        } catch (Exception e) {
            // KiaCar not loaded or null
        }
        try {
            java.time.LocalDateTime lastUpd = entity.getUpdatedAt() != null ? entity.getUpdatedAt() : entity.getCreatedAt();
            if (lastUpd == null) lastUpd = java.time.LocalDateTime.now();
            res.setLastUpdated(lastUpd.format(java.time.format.DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")));
        } catch (Exception e) {
            res.setLastUpdated("N/A");
        }
        res.setVersion(entity.getVersion());
        return res;
    }

    @Override
    @Transactional
    @CacheEvict(value = {"leads", "analytics"}, allEntries = true)
    public LeadResponse updateLead(Long id, LeadEntity lead) {
        LeadEntity existingLead = leadRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Lead not found"));

        // Optimistic locking: compare versions, let Hibernate manage @Version automatically
        Long currentVersion = existingLead.getVersion() != null ? existingLead.getVersion() : 0L;
        if (lead.getVersion() != null && !lead.getVersion().equals(currentVersion)) {
            throw new org.springframework.orm.ObjectOptimisticLockingFailureException(LeadEntity.class, id);
        }

        // Update only fields that exist on LeadEntity
        if (lead.getFirstName() != null) existingLead.setFirstName(lead.getFirstName());
        if (lead.getLastName() != null) existingLead.setLastName(lead.getLastName());
        if (lead.getEmail() != null) existingLead.setEmail(lead.getEmail());
        if (lead.getPhone() != null) existingLead.setPhone(lead.getPhone());
        if (lead.getStatus() != null) existingLead.setStatus(lead.getStatus());
        if (lead.getNotes() != null) existingLead.setNotes(lead.getNotes());
        if (lead.getVehicleInterest() != null) existingLead.setVehicleInterest(lead.getVehicleInterest());

        // Do NOT set kiaCar from incoming entity (would attach detached/partial object)
        // Vehicle interest string is sufficient for now

        return mapToLeadResponse(leadRepository.save(existingLead));
    }

    @Override
    @Transactional
    public LeadResponse updateLeadWithFile(Long id, LeadEntity lead, java.util.List<org.springframework.web.multipart.MultipartFile> files) {
        LeadResponse response = updateLead(id, lead);
        if (files != null && !files.isEmpty()) {
            for (org.springframework.web.multipart.MultipartFile file : files) {
                if (file != null && !file.isEmpty()) {
                    try {
                        fileService.uploadFile(file, "LEADS", response.getId());
                    } catch (java.io.IOException e) {
                        throw new RuntimeException("Failed to upload file: " + e.getMessage(), e);
                    }
                }
            }
        }
        return response;
    }

    @Override
    @Transactional
    @CacheEvict(value = {"leads", "analytics"}, allEntries = true)
    public void deleteLead(Long id) {
        LeadEntity existingLead = leadRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Lead not found"));
        // Soft delete
        existingLead.setIsDeleted(true);
        leadRepository.save(existingLead);
    }

    private TestDriveResponse mapToTestDriveResponse(TestDriveEntity entity) {
        TestDriveResponse res = new TestDriveResponse();
        res.setId(entity.getId());

        // lead and vehicle are guaranteed to be loaded via JOIN FETCH in the repository queries.
        // The try/catch guards against any edge-case where a record was saved without these.
        try {
            if (entity.getLead() != null) {
                String fname = entity.getLead().getFirstName() != null ? entity.getLead().getFirstName() : "";
                String lname = entity.getLead().getLastName() != null ? entity.getLead().getLastName() : "";
                res.setCustomerName((fname + " " + lname).trim());
            } else {
                res.setCustomerName("N/A");
            }
        } catch (Exception e) {
            res.setCustomerName("N/A");
        }

        try {
            if (entity.getVehicle() != null) {
                String vname = entity.getVehicle().getName() != null ? entity.getVehicle().getName() : "";
                String vmodel = entity.getVehicle().getModel() != null ? entity.getVehicle().getModel() : "";
                res.setVehicleName((vname + " " + vmodel).trim());
                
                // Populate model, variant, color from vehicle's kiaCar
                if (entity.getVehicle().getKiaCar() != null) {
                    res.setModelName(entity.getVehicle().getKiaCar().getModelName());
                    res.setVariant(entity.getVehicle().getKiaCar().getVariant());
                    res.setColor(entity.getVehicle().getKiaCar().getColor());
                } else {
                    res.setModelName(entity.getVehicle().getModel());
                    res.setVariant("—");
                    res.setColor("—");
                }
            } else {
                res.setVehicleName("N/A");
                res.setModelName("—");
                res.setVariant("—");
                res.setColor("—");
            }
        } catch (Exception e) {
            res.setVehicleName("N/A");
            res.setModelName("—");
            res.setVariant("—");
            res.setColor("—");
        }

        try {
            if (entity.getDealer() != null) {
                res.setDealerId(entity.getDealer().getId());
                res.setDealerName(entity.getDealer().getName());
                
                // Get manager ID through dealer
                if (entity.getDealer().getManager() != null) {
                    res.setManagerId(entity.getDealer().getManager().getId());
                }
            } else {
                res.setDealerName("—");
            }
        } catch (Exception e) {
            res.setDealerName("—");
        }

        try {
            res.setScheduledAt(entity.getScheduledAt() != null
                    ? entity.getScheduledAt().format(java.time.format.DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm"))
                    : "N/A");
        } catch (Exception e) {
            res.setScheduledAt("N/A");
        }

        res.setStatus(entity.getStatus());

        try {
            java.time.LocalDateTime lastUpd = entity.getUpdatedAt() != null ? entity.getUpdatedAt() : entity.getCreatedAt();
            if (lastUpd == null) lastUpd = java.time.LocalDateTime.now();
            res.setLastUpdated(lastUpd.format(java.time.format.DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")));
        } catch (Exception e) {
            res.setLastUpdated("N/A");
        }

        return res;
    }
}