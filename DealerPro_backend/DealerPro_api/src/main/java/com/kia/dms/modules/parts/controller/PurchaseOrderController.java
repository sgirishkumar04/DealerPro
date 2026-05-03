package com.kia.dms.modules.parts.controller;

import com.kia.dms.common.response.ApiResponse;
import com.kia.dms.common.response.PaginationResponse;
import com.kia.dms.modules.parts.dto.request.PurchaseOrderRequest;
import com.kia.dms.modules.parts.dto.response.PurchaseOrderResponse;
import com.kia.dms.modules.parts.service.PurchaseOrderService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/purchase-orders")
public class PurchaseOrderController {

    @Autowired
    private PurchaseOrderService purchaseOrderService;

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'DEALER')")
    public ResponseEntity<ApiResponse<PaginationResponse<PurchaseOrderResponse>>> getAllPurchaseOrders(Pageable pageable) {
        PaginationResponse<PurchaseOrderResponse> data = purchaseOrderService.getAllPurchaseOrders(pageable);
        return ResponseEntity.ok(new ApiResponse<>(HttpStatus.OK.value(), "Purchase orders retrieved successfully", data));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'DEALER')")
    public ResponseEntity<ApiResponse<PurchaseOrderResponse>> createPurchaseOrder(@Valid @RequestBody PurchaseOrderRequest request) {
        PurchaseOrderResponse data = purchaseOrderService.createPurchaseOrder(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(new ApiResponse<>(HttpStatus.CREATED.value(), "Purchase order created successfully", data));
    }
}
