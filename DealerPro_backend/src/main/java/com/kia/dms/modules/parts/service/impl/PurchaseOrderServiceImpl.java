package com.kia.dms.modules.parts.service.impl;

import com.kia.dms.common.response.PaginationResponse;
import com.kia.dms.exception.ResourceNotFoundException;
import com.kia.dms.modules.parts.dto.request.PurchaseOrderRequest;
import com.kia.dms.modules.parts.dto.response.PurchaseOrderResponse;
import com.kia.dms.modules.parts.entity.PartEntity;
import com.kia.dms.modules.parts.entity.PurchaseOrderEntity;
import com.kia.dms.modules.parts.exception.InsufficientPartsException;
import com.kia.dms.modules.parts.repository.PartRepository;
import com.kia.dms.modules.parts.repository.PurchaseOrderRepository;
import com.kia.dms.modules.parts.service.PurchaseOrderService;
import com.kia.dms.modules.user.entity.UserEntity;
import com.kia.dms.modules.user.repository.UserRepository;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class PurchaseOrderServiceImpl implements PurchaseOrderService {

    @Autowired
    private PurchaseOrderRepository purchaseOrderRepository;

    @Autowired
    private PartRepository partRepository;

    @Autowired
    private UserRepository userRepository;

    private UserEntity getCurrentUser() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByEmailWithRole(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }

    @Override
    @Transactional(readOnly = true)
    public PaginationResponse<PurchaseOrderResponse> getAllPurchaseOrders(Pageable pageable) {
        UserEntity currentUser = getCurrentUser();
        Page<PurchaseOrderEntity> page;
        if (currentUser.getRole().getName().equalsIgnoreCase("ROLE_DEALER")) {
            if (currentUser.getDealer() == null) throw new AccessDeniedException("No dealer context");
            page = purchaseOrderRepository.findByDealerIdAndIsDeletedFalse(currentUser.getDealer().getId(), pageable);
        } else if (currentUser.getRole().getName().equalsIgnoreCase("ROLE_MANAGER")) {
            if (currentUser.getManagerProfile() == null) throw new AccessDeniedException("No manager context");
            page = purchaseOrderRepository.findByManagerIdAndIsDeletedFalse(currentUser.getManagerProfile().getId(), pageable);
        } else {
            page = purchaseOrderRepository.findByIsDeletedFalse(pageable);
        }
        List<PurchaseOrderResponse> content = page.getContent().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
        return new PaginationResponse<>(content, page.getNumber(), page.getSize(), page.getTotalElements(), page.getTotalPages());
    }

    @Override
    @Transactional
    public PurchaseOrderResponse createPurchaseOrder(PurchaseOrderRequest request) {
        UserEntity currentUser = getCurrentUser();
        PartEntity part = partRepository.findById(request.getPartId())
                .filter(p -> !p.getIsDeleted())
                .orElseThrow(() -> new ResourceNotFoundException("Part not found with ID: " + request.getPartId()));

        int newStock = part.getStock() - request.getQuantity();
        if (newStock < 0) {
            throw new InsufficientPartsException("Insufficient stock for part: " + part.getName());
        }

        part.setStock(newStock);
        partRepository.save(part);

        PurchaseOrderEntity order = new PurchaseOrderEntity();
        order.setPart(part);
        order.setQuantity(request.getQuantity());
        order.setTotalCost(part.getPrice().multiply(new BigDecimal(request.getQuantity())));
        order.setJustification(request.getJustification());
        
        // Data isolation links
        if (currentUser.getRole().getName().equalsIgnoreCase("ROLE_DEALER")) {
            order.setDealer(currentUser.getDealer());
            if (currentUser.getDealer() != null && currentUser.getDealer().getManager() != null) {
                order.setManager(currentUser.getDealer().getManager());
            }
        }

        PurchaseOrderEntity savedOrder = purchaseOrderRepository.save(order);
        return mapToResponse(savedOrder);
    }

    private PurchaseOrderResponse mapToResponse(PurchaseOrderEntity entity) {
        PurchaseOrderResponse res = new PurchaseOrderResponse();
        res.setId(entity.getId());
        res.setPartId(entity.getPart().getId());
        res.setPartName(entity.getPart().getName());
        try {
            if (entity.getDealer() != null) {
                res.setDealerName(entity.getDealer().getName());
            } else {
                res.setDealerName("—");
            }
        } catch (Exception e) {
            res.setDealerName("—");
        }
        res.setQuantity(entity.getQuantity());
        res.setTotalCost(entity.getTotalCost());
        res.setJustification(entity.getJustification());
        res.setCreatedAt(entity.getCreatedAt());
        return res;
    }
}
