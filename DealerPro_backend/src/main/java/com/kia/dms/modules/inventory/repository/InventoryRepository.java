package com.kia.dms.modules.inventory.repository;

import com.kia.dms.modules.inventory.entity.InventoryEntity;
import com.kia.dms.modules.inventory.repository.custom.InventoryCustomRepository;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;
@Repository
public interface InventoryRepository extends JpaRepository<InventoryEntity, Long>, org.springframework.data.jpa.repository.JpaSpecificationExecutor<InventoryEntity>, InventoryCustomRepository {
    Optional<InventoryEntity> findByVehicleIdAndDealerIdAndIsDeletedFalse(Long vehicleId, Long dealerId);
}
