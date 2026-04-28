package com.kia.dms.modules.parts.repository.custom;

import com.kia.dms.modules.parts.entity.PartEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface PartCustomRepository {
    Page<PartEntity> findPartsByCriteria(String name, String supplier, Long dealerId, Long managerId, Pageable pageable);
}
