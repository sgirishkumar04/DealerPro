package com.kia.dms.modules.sales.service.impl;

import com.kia.dms.common.response.PaginationResponse;
import com.kia.dms.exception.InsufficientStockException;
import com.kia.dms.exception.ResourceNotFoundException;
import com.kia.dms.modules.dealer.entity.DealerEntity;
import com.kia.dms.modules.finance.entity.TransactionEntity;
import com.kia.dms.modules.finance.repository.TransactionRepository;
import com.kia.dms.modules.inventory.entity.InventoryEntity;
import com.kia.dms.modules.inventory.repository.InventoryRepository;
import com.kia.dms.modules.sales.dto.request.OrderRequest;
import com.kia.dms.modules.sales.dto.response.OrderResponse;
import com.kia.dms.modules.sales.entity.OrderEntity;
import com.kia.dms.modules.sales.repository.OrderRepository;
import com.kia.dms.modules.sales.service.OrderService;
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

import java.math.BigDecimal;
import java.util.List;
import java.util.Arrays;
import java.util.ArrayList;
import java.util.stream.Collectors;
import com.kia.dms.common.dto.request.GlobalSearchRequest;
import com.kia.dms.common.specification.GenericSpecificationBuilder;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;

@Service
public class OrderServiceImpl implements OrderService {

    @Autowired private OrderRepository orderRepository;
    @Autowired private InventoryRepository inventoryRepository;
    @Autowired private VehicleRepository vehicleRepository;
    @Autowired private TransactionRepository transactionRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private com.kia.dms.modules.dealer.repository.DealerRepository dealerRepository;

    private UserEntity getCurrentUser() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByEmailWithRole(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }

    @Override
    @Transactional(readOnly = true)
    @Cacheable(value = "orders", key = "T(java.util.Objects).hash(#orderId, #dealerId, #managerId, #pageable.pageNumber, #pageable.pageSize) + '-' + T(org.springframework.security.core.context.SecurityContextHolder).getContext().getAuthentication().getName()")
    public PaginationResponse<OrderResponse> getOrders(Long orderId, Long dealerId, Long managerId, Pageable pageable) {
        UserEntity currentUser = getCurrentUser();
        Page<OrderEntity> page;
        
        Long filterDealerId = dealerId;
        Long filterManagerId = managerId;
        
        if (currentUser.getRole().getName().equalsIgnoreCase("ROLE_DEALER")) {
            if (currentUser.getDealer() == null) throw new AccessDeniedException("No dealer context");
            filterDealerId = currentUser.getDealer().getId();
        } else if (currentUser.getRole().getName().equalsIgnoreCase("ROLE_MANAGER")) {
            if (currentUser.getManagerProfile() == null) throw new AccessDeniedException("No manager context");
            filterManagerId = currentUser.getManagerProfile().getId();
        }
        
        page = orderRepository.findWithFilters(orderId, filterDealerId, filterManagerId, pageable);

        List<OrderResponse> content = page.getContent().stream().map(this::mapToResponse).collect(Collectors.toList());
        return new PaginationResponse<>(content, page.getNumber(), page.getSize(), page.getTotalElements(), page.getTotalPages());
    }

    @Override
    @Transactional
    @CacheEvict(value = {"orders", "analytics", "inventory"}, allEntries = true)
    public OrderResponse createOrder(OrderRequest request) {
        UserEntity currentUser = getCurrentUser();
        DealerEntity dealer;
        if (currentUser.getRole().getName().equalsIgnoreCase("ROLE_DEALER")) {
            dealer = currentUser.getDealer();
            if (dealer == null) throw new AccessDeniedException("Dealer association missing");
        } else {
            dealer = dealerRepository.findById(request.getDealerId() != null ? request.getDealerId() : currentUser.getDealer().getId())
                    .orElseThrow(() -> new ResourceNotFoundException("Dealer not found"));
        }

        VehicleEntity vehicle = vehicleRepository.findById(request.getVehicleId())
                .orElseThrow(() -> new ResourceNotFoundException("Vehicle not found"));

        InventoryEntity inventory = inventoryRepository.findByVehicleIdAndDealerIdAndIsDeletedFalse(vehicle.getId(), dealer.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Inventory context not found for this dealer"));

        if (inventory.getQuantity() < request.getQuantity()) {
            throw new InsufficientStockException("Insufficient stock. Available: " + inventory.getQuantity());
        }

        inventory.setQuantity(inventory.getQuantity() - request.getQuantity());
        if (inventory.getQuantity() == 0) {
            inventory.setStatus("OUT_OF_STOCK");
        } else if (inventory.getQuantity() <= 5) {
            inventory.setStatus("LOW_STOCK");
        }
        inventoryRepository.save(inventory);

        OrderEntity order = new OrderEntity();
        order.setVehicle(vehicle);
        order.setDealer(dealer);
        // Set manager from dealer's manager
        if (dealer.getManager() != null) {
            order.setManager(dealer.getManager());
        }
        order.setQuantity(request.getQuantity());
        BigDecimal total = vehicle.getPrice().multiply(new BigDecimal(request.getQuantity()));
        order.setTotalPrice(total);
        order.setStatus("PLACED");
        order = orderRepository.save(order);

        TransactionEntity tx = new TransactionEntity();
        tx.setDealer(dealer);
        tx.setType("DEBIT");
        tx.setAmount(total);
        tx.setDescription("Order Placed: " + vehicle.getName() + " x" + request.getQuantity());
        transactionRepository.save(tx);

        return mapToResponse(order);
    }

    @Override
    @Transactional
    @CacheEvict(value = {"orders", "analytics"}, allEntries = true)
    public OrderResponse updateOrderStatus(Long id, String status, Long version) {
        OrderEntity order = orderRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Order not found"));
        // Optimistic locking: compare versions, let Hibernate manage @Version automatically
        Long currentVersion = order.getVersion() != null ? order.getVersion() : 0L;
        if (version != null && !version.equals(currentVersion)) {
            throw new org.springframework.orm.ObjectOptimisticLockingFailureException(OrderEntity.class, id);
        }
        order.setStatus(status);
        return mapToResponse(orderRepository.save(order));
    }

    @Override
    @Transactional
    public void deleteOrder(Long id) {
        OrderEntity order = orderRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Order not found"));
        order.setIsDeleted(true);
        orderRepository.save(order);
    }

    @Override
    @Transactional(readOnly = true)
    public PaginationResponse<OrderResponse> searchOrders(GlobalSearchRequest request) {
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
            "vehicle.kiaCar.modelName", 
            "vehicle.kiaCar.variant", 
            "vehicle.kiaCar.color"
        );

        // 3. Build Specification
        Specification<OrderEntity> spec = GenericSpecificationBuilder.build(request, searchableColumns);

        // 4. Role-based constraints
        Specification<OrderEntity> roleSpec = (root, query, cb) -> {
            if (roleName.equals("ROLE_DEALER") || roleName.equals("DEALER")) {
                return cb.equal(root.get("dealer").get("id"), currentUser.getDealer().getId());
            } else if (roleName.equals("ROLE_MANAGER") || roleName.equals("MANAGER")) {
                return cb.equal(root.get("dealer").get("manager").get("id"), currentUser.getManagerProfile().getId());
            }
            return cb.conjunction();
        };

        spec = spec.and(roleSpec);

        // 5. Execute Search
        Page<OrderEntity> page = orderRepository.findAll(spec, pageable);
        
        List<OrderResponse> content = page.getContent().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
        
        return new PaginationResponse<>(content, page.getNumber(), page.getSize(), page.getTotalElements(), page.getTotalPages());
    }

    private OrderResponse mapToResponse(OrderEntity entity) {
        OrderResponse res = new OrderResponse();
        res.setId(entity.getId());
        res.setVehicleId(entity.getVehicle().getId());
        res.setVehicleName(entity.getVehicle().getName());
        res.setDealerId(entity.getDealer().getId());
        res.setDealerName(entity.getDealer().getName());
        res.setManagerId(entity.getManager() != null ? entity.getManager().getId() : null);
        res.setQuantity(entity.getQuantity());
        res.setTotalPrice(entity.getTotalPrice());
        res.setStatus(entity.getStatus());
        res.setEstimatedMargin(entity.getEstimatedMargin());
        res.setCreatedAt(entity.getCreatedAt());
        
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
}
