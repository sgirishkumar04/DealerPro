package com.kia.dms.modules.analytics.repository.custom;

import com.kia.dms.modules.analytics.entity.DealerPerformanceEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import java.time.LocalDateTime;

public interface DealerPerformanceCustomRepository {
    Page<DealerPerformanceEntity> findPerformances(Long dealerId, LocalDateTime startDate, LocalDateTime endDate, Pageable pageable);
}
