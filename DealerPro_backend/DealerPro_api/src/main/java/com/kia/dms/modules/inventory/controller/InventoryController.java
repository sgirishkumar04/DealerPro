package com.kia.dms.modules.inventory.controller;

import com.kia.dms.common.response.ApiResponse;
import com.kia.dms.common.response.PaginationResponse;
import com.kia.dms.modules.inventory.dto.request.InventoryRequest;
import com.kia.dms.modules.inventory.dto.response.InventoryResponse;
import com.kia.dms.modules.inventory.service.InventoryService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springdoc.core.annotations.ParameterObject;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import com.kia.dms.common.dto.request.GlobalSearchRequest;
import java.util.Map;
import java.util.List;
import java.util.Arrays;

@RestController
@RequestMapping("/api/v1/inventory")
public class InventoryController {

    @Autowired
    private InventoryService inventoryService;

    @GetMapping
    public ResponseEntity<ApiResponse<PaginationResponse<InventoryResponse>>> getInventory(
            @RequestParam(required = false) Long vehicleId,
            @RequestParam(required = false) Long dealerId,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String model,
            @RequestParam(required = false) String variant,
            @RequestParam(required = false) String color,
            @ParameterObject Pageable pageable) {
        return ResponseEntity.ok(new ApiResponse<>(true, inventoryService.getInventory(vehicleId, dealerId, status, model, variant, color, pageable), "Success"));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<InventoryResponse>> createInventory(@Validated @RequestBody InventoryRequest request) {
        return ResponseEntity.ok(new ApiResponse<>(true, inventoryService.createInventory(request), "Created"));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<InventoryResponse>> updateInventory(@PathVariable Long id, @Validated @RequestBody InventoryRequest request) {
        return ResponseEntity.ok(new ApiResponse<>(true, inventoryService.updateInventory(id, request), "Updated"));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> deleteInventory(@PathVariable Long id) {
        inventoryService.deleteInventory(id);
        return ResponseEntity.ok(new ApiResponse<>(true, null, "Deleted"));
    }

    @PostMapping("/search")
    public ResponseEntity<ApiResponse<PaginationResponse<InventoryResponse>>> searchInventory(@RequestBody GlobalSearchRequest request) {
        return ResponseEntity.ok(new ApiResponse<>(true, inventoryService.searchInventory(request), "Search successful"));
    }

    @GetMapping("/analytics-transposed")
    public ResponseEntity<ApiResponse<java.util.Map<String, Object>>> getTransposedAnalytics() {
        // Fetch all inventory to aggregate (in a real app, use a DB query for counts)
        java.util.List<InventoryResponse> allInventory = inventoryService.getInventory(null, null, null, null, null, null, Pageable.unpaged()).getContent();
            
        long availableCount = allInventory.stream().filter(i -> "AVAILABLE".equalsIgnoreCase(i.getStatus())).count();
        long reservedCount = allInventory.stream().filter(i -> "RESERVED".equalsIgnoreCase(i.getStatus())).count();
        long soldCount = allInventory.stream().filter(i -> "SOLD".equalsIgnoreCase(i.getStatus())).count();
        
        java.util.Map<String, Object> row = new java.util.HashMap<>();
        row.put("snapshot", "Current Inventory");
        row.put("available", availableCount);
        row.put("reserved", reservedCount);
        row.put("sold", soldCount);

        java.util.Map<String, Object> transposed = com.kia.dms.common.utils.TransposeUtil.transpose(
            java.util.List.of(row),
            java.util.List.of("available", "reserved", "sold"),
            "snapshot"
        );
        return ResponseEntity.ok(new ApiResponse<>(true, transposed, "Transposed inventory successfully"));
    }
}
