package com.kia.dms.modules.parts.repository;

import com.kia.dms.modules.parts.entity.PurchaseOrderEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface PurchaseOrderRepository extends JpaRepository<PurchaseOrderEntity, Long> {
    
    @Query(value = "SELECT p FROM PurchaseOrderEntity p LEFT JOIN FETCH p.dealer WHERE p.dealer.id = :dealerId AND p.isDeleted = false", 
           countQuery = "SELECT COUNT(p) FROM PurchaseOrderEntity p WHERE p.dealer.id = :dealerId AND p.isDeleted = false")
    Page<PurchaseOrderEntity> findByDealerIdAndIsDeletedFalse(@Param("dealerId") Long dealerId, Pageable pageable);
    
    @Query(value = "SELECT p FROM PurchaseOrderEntity p LEFT JOIN FETCH p.dealer d LEFT JOIN FETCH d.manager WHERE d.manager.id = :managerId AND p.isDeleted = false", 
           countQuery = "SELECT COUNT(p) FROM PurchaseOrderEntity p JOIN p.dealer d WHERE d.manager.id = :managerId AND p.isDeleted = false")
    Page<PurchaseOrderEntity> findByManagerIdAndIsDeletedFalse(@Param("managerId") Long managerId, Pageable pageable);
    
    @Query(value = "SELECT p FROM PurchaseOrderEntity p LEFT JOIN FETCH p.dealer WHERE p.isDeleted = false", 
           countQuery = "SELECT COUNT(p) FROM PurchaseOrderEntity p WHERE p.isDeleted = false")
    Page<PurchaseOrderEntity> findByIsDeletedFalse(Pageable pageable);
}
