package com.kia.dms.modules.finance.repository;

import com.kia.dms.modules.finance.entity.TransactionEntity;
import com.kia.dms.modules.finance.repository.custom.TransactionCustomRepository;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface TransactionRepository extends JpaRepository<TransactionEntity, Long>, org.springframework.data.jpa.repository.JpaSpecificationExecutor<TransactionEntity>, TransactionCustomRepository {
    org.springframework.data.domain.Page<TransactionEntity> findByIsDeletedFalse(org.springframework.data.domain.Pageable pageable);
    org.springframework.data.domain.Page<TransactionEntity> findByDealerIdAndIsDeletedFalse(Long dealerId, org.springframework.data.domain.Pageable pageable);
    org.springframework.data.domain.Page<TransactionEntity> findByManagerIdAndIsDeletedFalse(Long managerId, org.springframework.data.domain.Pageable pageable);
}
