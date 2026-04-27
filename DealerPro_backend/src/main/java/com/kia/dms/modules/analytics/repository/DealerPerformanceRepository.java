package com.kia.dms.modules.analytics.repository;

import com.kia.dms.modules.analytics.entity.DealerPerformanceEntity;
import com.kia.dms.modules.analytics.repository.custom.DealerPerformanceCustomRepository;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DealerPerformanceRepository extends JpaRepository<DealerPerformanceEntity, Long>, DealerPerformanceCustomRepository {
    org.springframework.data.domain.Page<DealerPerformanceEntity> findByDealerIdOrderByCreatedAtDesc(Long dealerId, org.springframework.data.domain.Pageable pageable);
    org.springframework.data.domain.Page<DealerPerformanceEntity> findByManagerIdOrderByCreatedAtDesc(Long managerId, org.springframework.data.domain.Pageable pageable);
}
