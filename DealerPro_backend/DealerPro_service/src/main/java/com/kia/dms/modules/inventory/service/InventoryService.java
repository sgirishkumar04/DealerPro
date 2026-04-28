package com.kia.dms.modules.inventory.service;

import com.kia.dms.common.response.PaginationResponse;
import com.kia.dms.modules.inventory.dto.request.InventoryRequest;
import com.kia.dms.modules.inventory.dto.response.InventoryResponse;
import org.springframework.data.domain.Pageable;

public interface InventoryService {
    PaginationResponse<InventoryResponse> getInventory(Long vehicleId, Long dealerId, String status, String model, String variant, String color, Pageable pageable);
    InventoryResponse createInventory(InventoryRequest request);
    InventoryResponse updateInventory(Long id, InventoryRequest request);
    void deleteInventory(Long id);
    PaginationResponse<InventoryResponse> searchInventory(com.kia.dms.common.dto.request.GlobalSearchRequest request);
}
