package com.kia.dms.modules.audit.repository;

import com.kia.dms.modules.audit.entity.AuditLogEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface AuditLogRepository extends JpaRepository<AuditLogEntity, Long>, org.springframework.data.jpa.repository.JpaSpecificationExecutor<AuditLogEntity> {

    @Query("SELECT a FROM AuditLogEntity a WHERE a.isDeleted = false ORDER BY a.performedAt DESC")
    Page<AuditLogEntity> findAllAuditLogs(Pageable pageable);

    @Query("SELECT a FROM AuditLogEntity a WHERE a.entityName = :entityName AND a.entityId = :entityId AND a.isDeleted = false ORDER BY a.performedAt DESC")
    List<AuditLogEntity> findByEntityNameAndEntityId(@Param("entityName") String entityName, @Param("entityId") Long entityId);

    @Query("SELECT a FROM AuditLogEntity a WHERE a.performedBy = :performedBy AND a.isDeleted = false ORDER BY a.performedAt DESC")
    Page<AuditLogEntity> findByPerformedBy(@Param("performedBy") String performedBy, Pageable pageable);

    @Query("SELECT a FROM AuditLogEntity a WHERE a.action = :action AND a.isDeleted = false ORDER BY a.performedAt DESC")
    Page<AuditLogEntity> findByAction(@Param("action") String action, Pageable pageable);

    @Query("SELECT a FROM AuditLogEntity a WHERE a.entityName = :entityName AND a.isDeleted = false ORDER BY a.performedAt DESC")
    Page<AuditLogEntity> findByEntityName(@Param("entityName") String entityName, Pageable pageable);

    @Query("SELECT a FROM AuditLogEntity a WHERE a.performedAt BETWEEN :startDate AND :endDate AND a.isDeleted = false ORDER BY a.performedAt DESC")
    Page<AuditLogEntity> findByDateRange(@Param("startDate") LocalDateTime startDate, @Param("endDate") LocalDateTime endDate, Pageable pageable);

    @Query("SELECT a FROM AuditLogEntity a WHERE " +
           "(LOWER(a.entityName) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(a.performedBy) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(a.action) LIKE LOWER(CONCAT('%', :search, '%'))) AND " +
           "a.isDeleted = false ORDER BY a.performedAt DESC")
    Page<AuditLogEntity> searchAuditLogs(@Param("search") String search, Pageable pageable);
}
