package com.kia.dms.modules.service.repository;

import com.kia.dms.modules.service.entity.ServiceOrderEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface ServiceOrderRepository extends JpaRepository<ServiceOrderEntity, Long>, org.springframework.data.jpa.repository.JpaSpecificationExecutor<ServiceOrderEntity> {
    
    @Query(value = "SELECT s FROM ServiceOrderEntity s JOIN FETCH s.vehicle v LEFT JOIN FETCH v.kiaCar JOIN FETCH s.dealer d LEFT JOIN FETCH d.manager WHERE s.isDeleted = false",
           countQuery = "SELECT COUNT(s) FROM ServiceOrderEntity s WHERE s.isDeleted = false")
    Page<ServiceOrderEntity> findByIsDeletedFalse(Pageable pageable);
    
    @Query(value = "SELECT s FROM ServiceOrderEntity s JOIN FETCH s.vehicle v LEFT JOIN FETCH v.kiaCar JOIN FETCH s.dealer d LEFT JOIN FETCH d.manager WHERE s.dealer.id = :dealerId AND s.isDeleted = false",
           countQuery = "SELECT COUNT(s) FROM ServiceOrderEntity s WHERE s.dealer.id = :dealerId AND s.isDeleted = false")
    Page<ServiceOrderEntity> findByDealerIdAndIsDeletedFalse(@Param("dealerId") Long dealerId, Pageable pageable);
    
    @Query(value = "SELECT s FROM ServiceOrderEntity s JOIN FETCH s.vehicle v LEFT JOIN FETCH v.kiaCar JOIN FETCH s.dealer d LEFT JOIN FETCH d.manager WHERE d.manager.id = :managerId AND s.isDeleted = false",
           countQuery = "SELECT COUNT(s) FROM ServiceOrderEntity s JOIN s.dealer d WHERE d.manager.id = :managerId AND s.isDeleted = false")
    Page<ServiceOrderEntity> findByManagerIdAndIsDeletedFalse(@Param("managerId") Long managerId, Pageable pageable);
}
