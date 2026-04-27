package com.kia.dms.modules.parts.repository;

import com.kia.dms.modules.parts.entity.PartEntity;
import com.kia.dms.modules.parts.repository.custom.PartCustomRepository;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface PartRepository extends JpaRepository<PartEntity, Long>, org.springframework.data.jpa.repository.JpaSpecificationExecutor<PartEntity>, PartCustomRepository {
}
