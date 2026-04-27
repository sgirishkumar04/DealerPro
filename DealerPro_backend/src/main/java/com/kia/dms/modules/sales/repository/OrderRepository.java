package com.kia.dms.modules.sales.repository;

import com.kia.dms.modules.sales.entity.OrderEntity;
import com.kia.dms.modules.sales.repository.custom.OrderCustomRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

@Repository
public interface OrderRepository extends JpaRepository<OrderEntity, Long>, OrderCustomRepository, JpaSpecificationExecutor<OrderEntity> {
    
    @Query(value = "SELECT o FROM OrderEntity o JOIN FETCH o.vehicle v LEFT JOIN FETCH v.kiaCar JOIN FETCH o.dealer WHERE o.isDeleted = false",
           countQuery = "SELECT COUNT(o) FROM OrderEntity o WHERE o.isDeleted = false")
    Page<OrderEntity> findByIsDeletedFalse(Pageable pageable);
    
    @Query(value = "SELECT o FROM OrderEntity o JOIN FETCH o.vehicle v LEFT JOIN FETCH v.kiaCar JOIN FETCH o.dealer WHERE o.dealer.id = :dealerId AND o.isDeleted = false",
           countQuery = "SELECT COUNT(o) FROM OrderEntity o WHERE o.dealer.id = :dealerId AND o.isDeleted = false")
    Page<OrderEntity> findByDealerIdAndIsDeletedFalse(@Param("dealerId") Long dealerId, Pageable pageable);
    
    @Query(value = "SELECT o FROM OrderEntity o JOIN FETCH o.vehicle v LEFT JOIN FETCH v.kiaCar JOIN FETCH o.dealer d LEFT JOIN FETCH d.manager WHERE d.manager.id = :managerId AND o.isDeleted = false",
           countQuery = "SELECT COUNT(o) FROM OrderEntity o JOIN o.dealer d WHERE d.manager.id = :managerId AND o.isDeleted = false")
    Page<OrderEntity> findByManagerIdAndIsDeletedFalse(@Param("managerId") Long managerId, Pageable pageable);
}
