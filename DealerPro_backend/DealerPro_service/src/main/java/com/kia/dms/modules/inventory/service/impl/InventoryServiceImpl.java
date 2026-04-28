package com.kia.dms.modules.inventory.service.impl;

import com.kia.dms.common.response.PaginationResponse;
import com.kia.dms.exception.ResourceNotFoundException;
import com.kia.dms.modules.dealer.entity.DealerEntity;
import com.kia.dms.modules.inventory.dto.request.InventoryRequest;
import com.kia.dms.modules.inventory.dto.response.InventoryResponse;
import com.kia.dms.modules.inventory.entity.InventoryEntity;
import com.kia.dms.modules.inventory.repository.InventoryRepository;
import com.kia.dms.modules.inventory.service.InventoryService;
import com.kia.dms.modules.user.entity.UserEntity;
import com.kia.dms.modules.user.repository.UserRepository;
import com.kia.dms.modules.vehicle.entity.KiaCarEntity;
import com.kia.dms.modules.vehicle.entity.VehicleEntity;
import com.kia.dms.modules.vehicle.repository.KiaCarRepository;
import com.kia.dms.modules.vehicle.repository.VehicleRepository;
import com.kia.dms.modules.dealer.repository.DealerRepository;
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
import java.util.ArrayList;
import java.util.Arrays;
import java.util.stream.Collectors;

import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class InventoryServiceImpl implements InventoryService {

    @Autowired private InventoryRepository inventoryRepository;
    @Autowired private VehicleRepository vehicleRepository;
    @Autowired private KiaCarRepository kiaCarRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private DealerRepository dealerRepository;

    private UserEntity getCurrentUser() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByEmailWithRole(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }

    @Override
    @Transactional(readOnly = true)
    public PaginationResponse<InventoryResponse> getInventory(Long vehicleId, Long dealerId, String status, String model, String variant, String color, Pageable pageable) {
        UserEntity currentUser = getCurrentUser();
        Long managerId = null;
        String roleName = currentUser.getRole().getName().toUpperCase();
        
        if (roleName.equals("ROLE_DEALER") || roleName.equals("DEALER")) {
            if (currentUser.getDealer() == null) throw new AccessDeniedException("Dealer association missing");
            dealerId = currentUser.getDealer().getId();
        } else if (roleName.equals("ROLE_MANAGER") || roleName.equals("MANAGER")) {
            if (currentUser.getManagerProfile() == null) throw new AccessDeniedException("Manager association missing");
            managerId = currentUser.getManagerProfile().getId();
        }
        
        Page<InventoryEntity> page = inventoryRepository.findWithFilters(vehicleId, dealerId, managerId, status, model, variant, color, pageable);
        List<InventoryResponse> content = page.getContent().stream().map(this::mapToResponse).collect(Collectors.toList());
        return new PaginationResponse<>(content, page.getNumber(), page.getSize(), page.getTotalElements(), page.getTotalPages());
    }

    @Override
    @Transactional
    public InventoryResponse createInventory(InventoryRequest request) {
        InventoryEntity entity = new InventoryEntity();

        // Resolve vehicle — if kiaCarId provided, use KIA car path; else use vehicleId
        if (request.getKiaCarId() != null) {
            KiaCarEntity kiaCar = kiaCarRepository.findById(request.getKiaCarId())
                    .orElseThrow(() -> new ResourceNotFoundException("KIA car not found with id: " + request.getKiaCarId()));
            entity.setKiaCar(kiaCar);

            VehicleEntity vehicle = vehicleRepository.findByKiaCarId(request.getKiaCarId())
                    .orElseGet(() -> {
                        VehicleEntity v = new VehicleEntity();
                        v.setKiaCar(kiaCar);
                        v.setCategory(kiaCar.getCategory());
                        v.setPrice(kiaCar.getPrice());
                        return vehicleRepository.save(v);
                    });
            entity.setVehicle(vehicle);
        } else if (request.getVehicleId() != null && request.getVehicleId() > 0) {
            VehicleEntity vehicle = vehicleRepository.findById(request.getVehicleId())
                    .orElseThrow(() -> new ResourceNotFoundException("Vehicle not found with id: " + request.getVehicleId()));
            entity.setVehicle(vehicle);
        } else {
            throw new IllegalArgumentException("Either kiaCarId or a valid vehicleId must be provided");
        }

        UserEntity currentUser = getCurrentUser();
        DealerEntity dealer;
        String roleName = currentUser.getRole().getName().toUpperCase();
        if (roleName.equals("ROLE_DEALER") || roleName.equals("DEALER")) {
            dealer = currentUser.getDealer();
            if (dealer == null) throw new ResourceNotFoundException("Dealer association missing for this user");
        } else {
            Long dealerId = request.getDealerId();
            if (dealerId == null) {
                throw new IllegalArgumentException("dealerId is required for admin/manager when creating inventory");
            }
            dealer = dealerRepository.findById(dealerId)
                    .orElseThrow(() -> new ResourceNotFoundException("Dealer not found with id: " + dealerId));
        }
        entity.setDealer(dealer);
        entity.setQuantity(request.getQuantity());

        // Auto-compute status from quantity (server-side safety net)
        int qty = request.getQuantity() != null ? request.getQuantity() : 0;
        String status = qty <= 0 ? "OUT_OF_STOCK" : qty < 10 ? "LOW_STOCK" : "IN_STOCK";
        entity.setStatus(status);

        return mapToResponse(inventoryRepository.save(entity));
    }

    @Override
    @Transactional
    public InventoryResponse updateInventory(Long id, InventoryRequest request) {
        InventoryEntity entity = inventoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Inventory not found"));

        UserEntity currentUser = getCurrentUser();
        String roleName = currentUser.getRole().getName().toUpperCase();
        if ((roleName.equals("ROLE_DEALER") || roleName.equals("DEALER")) &&
            !entity.getDealer().getId().equals(currentUser.getDealer().getId())) {
            throw new AccessDeniedException("Cannot modify other dealer's inventory");
        }
        if (request.getQuantity() != null) entity.setQuantity(request.getQuantity());
        if (request.getStatus() != null) entity.setStatus(request.getStatus());
        // Optimistic locking: compare versions, let Hibernate manage @Version automatically
        Long currentVersion = entity.getVersion() != null ? entity.getVersion() : 0L;
        if (request.getVersion() != null && !request.getVersion().equals(currentVersion)) {
            throw new org.springframework.orm.ObjectOptimisticLockingFailureException(InventoryEntity.class, id);
        }
        return mapToResponse(inventoryRepository.save(entity));
    }

    @Override
    @Transactional
    public void deleteInventory(Long id) {
        InventoryEntity entity = inventoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Inventory not found"));
        entity.setIsDeleted(true);
        inventoryRepository.save(entity);
    }

    @Override
    @Transactional(readOnly = true)
    public PaginationResponse<InventoryResponse> searchInventory(GlobalSearchRequest request) {
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
            "dealer.name", 
            "vehicle.model", 
            "kiaCar.modelName", 
            "kiaCar.variant", 
            "kiaCar.color"
        );

        // 3. Build Specification
        Specification<InventoryEntity> spec = GenericSpecificationBuilder.build(request, searchableColumns);

        // 4. Role-based constraints
        Specification<InventoryEntity> roleSpec = (root, query, cb) -> {
            if (roleName.equals("ROLE_DEALER") || roleName.equals("DEALER")) {
                return cb.equal(root.get("dealer").get("id"), currentUser.getDealer().getId());
            } else if (roleName.equals("ROLE_MANAGER") || roleName.equals("MANAGER")) {
                return cb.equal(root.get("dealer").get("manager").get("id"), currentUser.getManagerProfile().getId());
            }
            return cb.conjunction();
        };

        spec = spec.and(roleSpec);

        // 5. Execute Search
        Page<InventoryEntity> page = inventoryRepository.findAll(spec, pageable);
        
        List<InventoryResponse> content = page.getContent().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
        
        return new PaginationResponse<>(content, page.getNumber(), page.getSize(), page.getTotalElements(), page.getTotalPages());
    }

    private InventoryResponse mapToResponse(InventoryEntity entity) {
        InventoryResponse response = new InventoryResponse();
        response.setId(entity.getId());
        response.setVehicleId(entity.getVehicle().getId());
        response.setVehicleName(entity.getVehicle().getModel()); // model name e.g. "EV6"
        response.setVehicleModel(entity.getVehicle().getModel());

        // Populate variant and color from KiaCar if available
        if (entity.getKiaCar() != null) {
            response.setKiaCarId(entity.getKiaCar().getId());
            response.setVehicleName(entity.getKiaCar().getModelName());
            response.setVehicleVariant(entity.getKiaCar().getVariant());
            response.setVehicleColor(entity.getKiaCar().getColor());
        } else {
            // Retrieve from vehicle's linked KIA car model
            VehicleEntity vehicle = entity.getVehicle();
            if (vehicle.getKiaCar() != null) {
                response.setKiaCarId(vehicle.getKiaCar().getId());
                response.setVehicleName(vehicle.getKiaCar().getModelName());
                response.setVehicleVariant(vehicle.getKiaCar().getVariant());
                response.setVehicleColor(vehicle.getKiaCar().getColor());
            } else {
                response.setVehicleName("Unknown");
                response.setVehicleVariant("—");
                response.setVehicleColor("—");
            }
        }

        response.setDealerId(entity.getDealer().getId());
        response.setDealerName(entity.getDealer().getName());
        // Get manager ID from dealer's current manager
        response.setManagerId(entity.getDealer().getManager() != null ? entity.getDealer().getManager().getId() : null);
        response.setQuantity(entity.getQuantity());
        response.setStatus(entity.getStatus());
        java.time.LocalDateTime lastUpd = entity.getUpdatedAt() != null ? entity.getUpdatedAt() : entity.getCreatedAt();
        if (lastUpd == null) lastUpd = java.time.LocalDateTime.now();
        response.setLastUpdated(lastUpd.format(java.time.format.DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")));
        response.setVersion(entity.getVersion());
        return response;
    }
}
