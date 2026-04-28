package com.kia.dms.modules.vehicle.repository;

import com.kia.dms.modules.vehicle.entity.VehicleEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface VehicleRepository extends JpaRepository<VehicleEntity, Long> {
    Page<VehicleEntity> findByIsDeletedFalse(Pageable pageable);
    java.util.Optional<VehicleEntity> findByKiaCarId(Long kiaCarId);
}
