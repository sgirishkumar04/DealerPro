package com.kia.dms.modules.inventory.repository.custom;

import com.kia.dms.modules.inventory.entity.InventoryEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface InventoryCustomRepository {
    Page<InventoryEntity> findWithFilters(Long vehicleId, Long dealerId, Long managerId, String status, String model, String variant, String color, Pageable pageable);
}
