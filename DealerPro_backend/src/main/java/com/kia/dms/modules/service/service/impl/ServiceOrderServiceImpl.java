package com.kia.dms.modules.service.service.impl;

import com.kia.dms.common.response.PaginationResponse;
import com.kia.dms.exception.ResourceNotFoundException;
import com.kia.dms.modules.dealer.entity.DealerEntity;
import com.kia.dms.modules.dealer.repository.DealerRepository;
import com.kia.dms.modules.service.dto.request.ServiceOrderRequest;
import com.kia.dms.modules.service.dto.response.ServiceOrderResponse;
import com.kia.dms.modules.service.entity.ServiceOrderEntity;
import com.kia.dms.modules.service.repository.ServiceOrderRepository;
import com.kia.dms.modules.service.service.ServiceOrderService;
import com.kia.dms.modules.user.entity.UserEntity;
import com.kia.dms.modules.user.repository.UserRepository;
import com.kia.dms.modules.vehicle.entity.VehicleEntity;
import com.kia.dms.modules.vehicle.repository.VehicleRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.kia.dms.common.dto.request.GlobalSearchRequest;
import com.kia.dms.common.specification.GenericSpecificationBuilder;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import java.util.List;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.stream.Collectors;

@Service
public class ServiceOrderServiceImpl implements ServiceOrderService {

    @Autowired private ServiceOrderRepository serviceOrderRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private VehicleRepository vehicleRepository;
    @Autowired private DealerRepository dealerRepository;
    @Autowired private com.kia.dms.modules.files.service.PdfService pdfService;

    private UserEntity getCurrentUser() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByEmailWithRole(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }

    @Override
    @Transactional(readOnly = true)
    public PaginationResponse<ServiceOrderResponse> getServiceOrders(Pageable pageable) {
        UserEntity currentUser = getCurrentUser();
        Page<ServiceOrderEntity> page;
        if (currentUser.getRole().getName().equalsIgnoreCase("ROLE_DEALER")) {
            if (currentUser.getDealer() == null) throw new AccessDeniedException("No dealer context");
            page = serviceOrderRepository.findByDealerIdAndIsDeletedFalse(currentUser.getDealer().getId(), pageable);
        } else if (currentUser.getRole().getName().equalsIgnoreCase("ROLE_MANAGER")) {
            if (currentUser.getManagerProfile() == null) throw new AccessDeniedException("No manager context");
            page = serviceOrderRepository.findByManagerIdAndIsDeletedFalse(currentUser.getManagerProfile().getId(), pageable);
        } else {
            page = serviceOrderRepository.findByIsDeletedFalse(pageable);
        }
        java.util.List<ServiceOrderResponse> content = page.getContent().stream()
                .map(this::mapToResponse)
                .collect(java.util.stream.Collectors.toList());
        return new PaginationResponse<>(content, page.getNumber(), page.getSize(), page.getTotalElements(), page.getTotalPages());
    }

    @Override
    @Transactional
    public ServiceOrderResponse createServiceOrder(ServiceOrderRequest request) {
        UserEntity currentUser = getCurrentUser();
        DealerEntity dealer;
        
        if (currentUser.getRole().getName().equalsIgnoreCase("ROLE_DEALER")) {
            dealer = currentUser.getDealer();
            if (dealer == null) throw new AccessDeniedException("Dealer association missing");
            // Fetch full dealer with manager
            dealer = dealerRepository.findById(dealer.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Dealer not found"));
        } else if (currentUser.getRole().getName().equalsIgnoreCase("ROLE_MANAGER") || 
                   currentUser.getRole().getName().equalsIgnoreCase("ROLE_ADMIN")) {
            // For MANAGER and ADMIN, dealer must be provided in request
            if (request.getDealerId() == null) {
                throw new IllegalArgumentException("Dealer must be specified for non-dealer users");
            }
            dealer = dealerRepository.findById(request.getDealerId())
                .orElseThrow(() -> new ResourceNotFoundException("Dealer not found"));
        } else {
            throw new AccessDeniedException("Invalid role for creating service orders");
        }

        VehicleEntity vehicle = vehicleRepository.findById(request.getVehicleId())
                .orElseThrow(() -> new ResourceNotFoundException("Vehicle not found"));

        ServiceOrderEntity serviceOrder = new ServiceOrderEntity();
        serviceOrder.setVehicle(vehicle);
        serviceOrder.setDealer(dealer);
        serviceOrder.setDescription(request.getDescription());
        serviceOrder.setStatus("PENDING");
        
        return mapToResponse(serviceOrderRepository.save(serviceOrder));
    }

    @Override
    @Transactional
    public ServiceOrderResponse updateServiceStatus(Long id, String status, Long version) {
        ServiceOrderEntity order = serviceOrderRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Service order not found"));
        // Optimistic locking: compare versions, let Hibernate manage @Version automatically
        Long currentVersion = order.getVersion() != null ? order.getVersion() : 0L;
        if (version != null && !version.equals(currentVersion)) {
            throw new org.springframework.orm.ObjectOptimisticLockingFailureException(ServiceOrderEntity.class, id);
        }
        order.setStatus(status);
        return mapToResponse(serviceOrderRepository.save(order));
    }

    @Override
    @Transactional(readOnly = true)
    public PaginationResponse<ServiceOrderResponse> searchServiceOrders(GlobalSearchRequest request) {
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

        // 2. Build searchable columns (including nested relations)
        List<String> searchableColumns = Arrays.asList(
            "status", 
            "description",
            "dealer.name", 
            "vehicle.kiaCar.modelName", 
            "vehicle.kiaCar.variant", 
            "vehicle.kiaCar.color"
        );

        // 3. Build Specification
        Specification<ServiceOrderEntity> spec = GenericSpecificationBuilder.build(request, searchableColumns);

        // 4. Role-based constraints
        Specification<ServiceOrderEntity> roleSpec = (root, query, cb) -> {
            if (roleName.equals("ROLE_DEALER") || roleName.equals("DEALER")) {
                return cb.equal(root.get("dealer").get("id"), currentUser.getDealer().getId());
            } else if (roleName.equals("ROLE_MANAGER") || roleName.equals("MANAGER")) {
                return cb.equal(root.get("dealer").get("manager").get("id"), currentUser.getManagerProfile().getId());
            }
            return cb.conjunction();
        };

        spec = spec.and(roleSpec);

        // 5. Execute Search
        Page<ServiceOrderEntity> page = serviceOrderRepository.findAll(spec, pageable);
        
        List<ServiceOrderResponse> content = page.getContent().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
        
        return new PaginationResponse<>(content, page.getNumber(), page.getSize(), page.getTotalElements(), page.getTotalPages());
    }

    private ServiceOrderResponse mapToResponse(ServiceOrderEntity entity) {
        ServiceOrderResponse res = new ServiceOrderResponse();
        res.setId(entity.getId());
        res.setVehicleName(entity.getVehicleName());
        res.setDealerName(entity.getDealerName());
        res.setDescription(entity.getDescription());
        res.setStatus(entity.getStatus());
        res.setEstimatedWaitTimeMinutes(entity.getEstimatedWaitTimeMinutes());
        
        // Populate dealerId and managerId through dealer
        try {
            if (entity.getDealer() != null) {
                res.setDealerId(entity.getDealer().getId());
                
                // Get manager ID through dealer
                if (entity.getDealer().getManager() != null) {
                    res.setManagerId(entity.getDealer().getManager().getId());
                }
            }
        } catch (Exception e) {
            // Dealer not loaded
        }
        
        // Populate model, variant, color from vehicle's kiaCar
        try {
            if (entity.getVehicle() != null && entity.getVehicle().getKiaCar() != null) {
                res.setModelName(entity.getVehicle().getKiaCar().getModelName());
                res.setVariant(entity.getVehicle().getKiaCar().getVariant());
                res.setColor(entity.getVehicle().getKiaCar().getColor());
            } else {
                res.setModelName(entity.getVehicle() != null ? entity.getVehicle().getModel() : "—");
                res.setVariant("—");
                res.setColor("—");
            }
        } catch (Exception e) {
            res.setModelName("—");
            res.setVariant("—");
            res.setColor("—");
        }
        
        java.time.LocalDateTime lastUpd = entity.getUpdatedAt() != null ? entity.getUpdatedAt() : entity.getCreatedAt();
        if (lastUpd == null) lastUpd = java.time.LocalDateTime.now();
        res.setLastUpdated(lastUpd.format(java.time.format.DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")));
        res.setVersion(entity.getVersion());
        return res;
    }

    @Override
    @Transactional(readOnly = true)
    public byte[] generateServiceReport(Long id) {
        ServiceOrderEntity order = serviceOrderRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Service order not found"));
        
        String dealerName = order.getDealer() != null ? order.getDealer().getName() : "Unknown Dealer";
        String vehicleName = order.getVehicleName() != null ? order.getVehicleName() : "Unknown Vehicle";
        String description = order.getDescription() != null ? order.getDescription() : "No description provided";
        String status = order.getStatus() != null ? order.getStatus() : "PENDING";
        String date = java.time.LocalDateTime.now().format(java.time.format.DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm"));

        return pdfService.generateServiceReport(id, dealerName, vehicleName, description, status, date);
    }
}
