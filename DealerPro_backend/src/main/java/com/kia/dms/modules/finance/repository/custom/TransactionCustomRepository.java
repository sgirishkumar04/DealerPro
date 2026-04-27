package com.kia.dms.modules.finance.repository.custom;

import com.kia.dms.modules.finance.entity.TransactionEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import java.time.LocalDateTime;

public interface TransactionCustomRepository {
    Page<TransactionEntity> findWithFilters(Long dealerId, Long managerId, String type, LocalDateTime startDate, LocalDateTime endDate, Pageable pageable);
}
