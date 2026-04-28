package com.kia.dms.modules.vehicle.repository;

import com.kia.dms.modules.vehicle.entity.KiaCarEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface KiaCarRepository extends JpaRepository<KiaCarEntity, Long> {
    List<KiaCarEntity> findByModelName(String modelName);
    List<KiaCarEntity> findByCategory(String category);
}
