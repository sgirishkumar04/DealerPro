package com.kia.dms.modules.parts.service.impl;

import com.kia.dms.common.response.PaginationResponse;
import com.kia.dms.exception.ResourceNotFoundException;
import com.kia.dms.modules.dealer.entity.DealerEntity;
import com.kia.dms.modules.dealer.repository.DealerRepository;
import com.kia.dms.modules.parts.dto.request.PartRequest;
import com.kia.dms.modules.parts.dto.response.PartResponse;
import com.kia.dms.modules.parts.entity.PartEntity;
import com.kia.dms.modules.parts.repository.PartRepository;
import com.kia.dms.modules.parts.service.PartService;
import com.kia.dms.modules.user.entity.UserEntity;
import com.kia.dms.modules.user.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;
import com.kia.dms.common.dto.request.GlobalSearchRequest;
import com.kia.dms.common.specification.GenericSpecificationBuilder;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import java.util.ArrayList;
import java.util.Arrays;

@Service
@Transactional(readOnly = true)
public class PartServiceImpl implements PartService {

    @Autowired
    private PartRepository partRepository;

    @Autowired
    private UserRepository userRepository;
    
    @Autowired
    private DealerRepository dealerRepository;

    private UserEntity getCurrentUser() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByEmailWithRole(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }

    @Override
    public PaginationResponse<PartResponse> getAllParts(String name, String supplier, Pageable pageable) {
        UserEntity currentUser = getCurrentUser();
        String roleName = currentUser.getRole().getName();
        
        Long dealerId = null;
        Long managerId = null;
        
        // Role-based filtering
        if ("ROLE_DEALER".equals(roleName)) {
            // Dealer: see only their own parts
            if (currentUser.getDealer() != null) {
                dealerId = currentUser.getDealer().getId();
            }
        } else if ("ROLE_MANAGER".equals(roleName)) {
            // Manager: see parts from all assigned dealers
            if (currentUser.getManagerProfile() != null) {
                managerId = currentUser.getManagerProfile().getId();
            }
        }
        // Admin: see all parts (no filtering)
        
        Page<PartEntity> page = partRepository.findPartsByCriteria(name, supplier, dealerId, managerId, pageable);
        List<PartResponse> content = page.getContent().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
        return new PaginationResponse<>(content, page.getNumber(), page.getSize(), page.getTotalElements(), page.getTotalPages());
    }

    @Override
    public PartResponse getPartById(Long id) {
        PartEntity part = partRepository.findById(id)
                .filter(p -> !p.getIsDeleted())
                .orElseThrow(() -> new ResourceNotFoundException("Part not found"));
        return mapToResponse(part);
    }

    @Override
    @Transactional
    public PartResponse createPart(PartRequest request) {
        PartEntity part = new PartEntity();
        updateEntityFromRequest(part, request);
        return mapToResponse(partRepository.save(part));
    }

    @Override
    @Transactional
    public PartResponse updatePart(Long id, PartRequest request) {
        PartEntity part = partRepository.findById(id)
                .filter(p -> !p.getIsDeleted())
                .orElseThrow(() -> new ResourceNotFoundException("Part not found"));
        updateEntityFromRequest(part, request);
        return mapToResponse(partRepository.save(part));
    }

    @Override
    @Transactional
    public void deletePart(Long id) {
        PartEntity part = partRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Part not found"));
        part.setIsDeleted(true);
        partRepository.save(part);
    }

    @Override
    @Transactional(readOnly = true)
    public PaginationResponse<PartResponse> searchParts(GlobalSearchRequest request) {
        UserEntity currentUser = getCurrentUser();
        String roleName = currentUser.getRole().getName().toUpperCase();
        
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

        // 2. Build searchable columns
        List<String> searchableColumns = Arrays.asList("name", "supplier", "status", "dealer.name"); 

        // 3. Build Specification
        Specification<PartEntity> spec = GenericSpecificationBuilder.build(request, searchableColumns);

        // 4. Role-based constraints
        Specification<PartEntity> roleSpec = (root, query, cb) -> {
            if (roleName.equals("ROLE_DEALER") || roleName.equals("DEALER")) {
                return cb.equal(root.get("dealer").get("id"), currentUser.getDealer().getId());
            } else if (roleName.equals("ROLE_MANAGER") || roleName.equals("MANAGER")) {
                return cb.equal(root.get("dealer").get("manager").get("id"), currentUser.getManagerProfile().getId());
            }
            return cb.conjunction();
        };

        spec = spec.and(roleSpec);

        // 5. Execute Search
        Page<PartEntity> page = partRepository.findAll(spec, pageable);
        
        List<PartResponse> content = page.getContent().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
        
        return new PaginationResponse<>(content, page.getNumber(), page.getSize(), page.getTotalElements(), page.getTotalPages());
    }

    private void updateEntityFromRequest(PartEntity part, PartRequest request) {
        UserEntity currentUser = getCurrentUser();
        String roleName = currentUser.getRole().getName();
        
        part.setName(request.getName());
        part.setPrice(request.getPrice());
        part.setStock(request.getStock());
        part.setSupplier(request.getSupplier());
        
        // Handle dealer assignment
        if ("ROLE_DEALER".equals(roleName)) {
            // Dealer: assign to their own dealer
            part.setDealer(currentUser.getDealer());
            if (currentUser.getDealer() != null && currentUser.getDealer().getManager() != null) {
                part.setManager(currentUser.getDealer().getManager());
            }
        } else if ("ROLE_ADMIN".equals(roleName) && request.getDealerId() != null) {
            // Admin: assign to specified dealer
            DealerEntity dealer = dealerRepository.findById(request.getDealerId())
                .orElseThrow(() -> new ResourceNotFoundException("Dealer not found"));
            part.setDealer(dealer);
            if (dealer.getManager() != null) {
                part.setManager(dealer.getManager());
            }
        }
    }

    private PartResponse mapToResponse(PartEntity entity) {
        PartResponse res = new PartResponse();
        res.setId(entity.getId());
        res.setName(entity.getName());
        res.setPrice(entity.getPrice());
        res.setStock(entity.getStock());
        res.setSupplier(entity.getSupplier());
        
        // Populate dealerId and managerId (now eagerly fetched)
        if (entity.getDealer() != null) {
            res.setDealerId(entity.getDealer().getId());
        }
        if (entity.getManager() != null) {
            res.setManagerId(entity.getManager().getId());
        }
        
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
