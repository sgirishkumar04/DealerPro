package com.kia.dms.modules.leads.repository;

import com.kia.dms.modules.leads.entity.LeadEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

@Repository
public interface LeadRepository extends JpaRepository<LeadEntity, Long>, JpaSpecificationExecutor<LeadEntity> {
    
    @Query("SELECT DISTINCT l FROM LeadEntity l LEFT JOIN FETCH l.dealer d LEFT JOIN FETCH d.manager LEFT JOIN FETCH l.kiaCar WHERE l.isDeleted = false")
    Page<LeadEntity> findByIsDeletedFalse(Pageable pageable);
    
    @Query("SELECT DISTINCT l FROM LeadEntity l LEFT JOIN FETCH l.dealer d LEFT JOIN FETCH d.manager LEFT JOIN FETCH l.kiaCar WHERE l.dealer.id = :dealerId AND l.isDeleted = false")
    Page<LeadEntity> findByDealerIdAndIsDeletedFalse(@Param("dealerId") Long dealerId, Pageable pageable);
    
    @Query("SELECT DISTINCT l FROM LeadEntity l LEFT JOIN FETCH l.dealer d LEFT JOIN FETCH d.manager LEFT JOIN FETCH l.kiaCar WHERE d.manager.id = :managerId AND l.isDeleted = false")
    Page<LeadEntity> findByManagerIdAndIsDeletedFalse(@Param("managerId") Long managerId, Pageable pageable);

    long countByIsDeletedFalse();
}
