package com.kia.dms.modules.sales.repository.custom;

import com.kia.dms.modules.sales.entity.OrderEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface OrderCustomRepository {
    Page<OrderEntity> findWithFilters(Long orderId, Long dealerId, Long managerId, Pageable pageable);
}
