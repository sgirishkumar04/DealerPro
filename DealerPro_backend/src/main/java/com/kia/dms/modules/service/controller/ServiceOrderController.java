package com.kia.dms.modules.service.controller;

import com.kia.dms.common.response.ApiResponse;
import com.kia.dms.common.response.PaginationResponse;
import com.kia.dms.modules.service.dto.request.ServiceOrderRequest;
import com.kia.dms.modules.service.dto.response.ServiceOrderResponse;
import com.kia.dms.modules.service.service.ServiceOrderService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import com.kia.dms.common.dto.request.GlobalSearchRequest;

@RestController
@RequestMapping("/api/service-orders")
@Tag(name = "Service Orders", description = "Service Order Management APIs")
@SecurityRequirement(name = "Bearer Authentication")
public class ServiceOrderController {

    @Autowired private ServiceOrderService serviceOrderService;

    @GetMapping
    @Operation(summary = "Get all service orders", description = "Retrieve paginated list of service orders")
    public ResponseEntity<ApiResponse<PaginationResponse<ServiceOrderResponse>>> getServiceOrders(
            @Parameter(description = "Pagination parameters") Pageable pageable) {
        return ResponseEntity.ok(new ApiResponse<>(true, serviceOrderService.getServiceOrders(pageable), "Service orders retrieved successfully"));
    }

    @PostMapping
    @Operation(summary = "Create service order", description = "Create a new service order")
    public ResponseEntity<ApiResponse<ServiceOrderResponse>> createServiceOrder(
            @io.swagger.v3.oas.annotations.parameters.RequestBody(description = "Service order details", required = true)
            @RequestBody ServiceOrderRequest request) {
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(new ApiResponse<>(true, serviceOrderService.createServiceOrder(request), "Service order created successfully"));
    }

    @PutMapping("/{id}/status")
    @Operation(summary = "Update service order status", description = "Update the status of an existing service order")
    public ResponseEntity<ApiResponse<ServiceOrderResponse>> updateServiceStatus(
            @Parameter(description = "Service order ID") @PathVariable Long id,
            @Parameter(description = "New status") @RequestParam String status,
            @Parameter(description = "Record version") @RequestParam(required = false) Long version) {
        return ResponseEntity.ok(new ApiResponse<>(true, serviceOrderService.updateServiceStatus(id, status, version), "Service order status updated successfully"));
    }

    @PostMapping("/search")
    @Operation(summary = "Search service orders", description = "Standardized advanced search for service orders")
    public ResponseEntity<ApiResponse<PaginationResponse<ServiceOrderResponse>>> searchServiceOrders(@RequestBody GlobalSearchRequest request) {
        return ResponseEntity.ok(new ApiResponse<>(true, serviceOrderService.searchServiceOrders(request), "Search successful"));
    }

    @GetMapping("/{id}/report")
    @Operation(summary = "Download service report", description = "Generate and download a PDF report for a service order")
    public ResponseEntity<byte[]> downloadServiceReport(@PathVariable Long id) {
        byte[] pdf = serviceOrderService.generateServiceReport(id);
        return ResponseEntity.ok()
                .header("Content-Type", "application/pdf")
                .header("Content-Disposition", "attachment; filename=service_report_" + id + ".pdf")
                .body(pdf);
    }
}
