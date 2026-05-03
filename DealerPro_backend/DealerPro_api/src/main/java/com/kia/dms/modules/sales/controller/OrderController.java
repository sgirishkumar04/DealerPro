package com.kia.dms.modules.sales.controller;

import com.kia.dms.common.response.ApiResponse;
import com.kia.dms.common.response.PaginationResponse;
import com.kia.dms.modules.sales.dto.request.OrderRequest;
import com.kia.dms.modules.sales.dto.response.OrderResponse;
import com.kia.dms.modules.sales.service.OrderService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import com.kia.dms.common.dto.request.GlobalSearchRequest;

@RestController
@RequestMapping("/api/v1/orders")
public class OrderController {

    @Autowired private OrderService orderService;

    @GetMapping
    public ResponseEntity<ApiResponse<PaginationResponse<OrderResponse>>> getOrders(
            @RequestParam(required = false) Long orderId,
            @RequestParam(required = false) Long dealerId,
            @RequestParam(required = false) Long managerId,
            Pageable pageable) {
        return ResponseEntity.ok(new ApiResponse<>(true, orderService.getOrders(orderId, dealerId, managerId, pageable), "Success"));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<OrderResponse>> createOrder(@Validated @RequestBody OrderRequest request) {
        return ResponseEntity.ok(new ApiResponse<>(true, orderService.createOrder(request), "Created"));
    }

    @PutMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER','DEALER')")
    public ResponseEntity<ApiResponse<OrderResponse>> updateOrderStatus(
            @PathVariable Long id, 
            @RequestParam String status,
            @RequestParam(required = false) Long version) {
        return ResponseEntity.ok(new ApiResponse<>(true, orderService.updateOrderStatus(id, status, version), "Updated"));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> deleteOrder(@PathVariable Long id) {
        orderService.deleteOrder(id);
        return ResponseEntity.ok(new ApiResponse<>(true, null, "Deleted"));
    }

    @PostMapping("/search")
    public ResponseEntity<ApiResponse<PaginationResponse<OrderResponse>>> searchOrders(@RequestBody GlobalSearchRequest request) {
        return ResponseEntity.ok(new ApiResponse<>(true, orderService.searchOrders(request), "Search successful"));
    }
}
