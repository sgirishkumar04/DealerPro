package com.kia.dms.modules.leads.repository;

import com.kia.dms.modules.leads.entity.TestDriveEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface TestDriveRepository extends JpaRepository<TestDriveEntity, Long>, org.springframework.data.jpa.repository.JpaSpecificationExecutor<TestDriveEntity> {

    // JOIN FETCH eagerly loads lead, vehicle, dealer, and dealer.manager within the same transaction,
    // preventing LazyInitializationException when mapToTestDriveResponse accesses them.
    // countQuery is required by Spring Data when using JOIN FETCH with pagination.

    @Query(value = "SELECT t FROM TestDriveEntity t JOIN FETCH t.lead JOIN FETCH t.vehicle v LEFT JOIN FETCH v.kiaCar JOIN FETCH t.dealer d LEFT JOIN FETCH d.manager WHERE t.isDeleted = false", countQuery = "SELECT COUNT(t) FROM TestDriveEntity t WHERE t.isDeleted = false")
    Page<TestDriveEntity> findByIsDeletedFalse(Pageable pageable);

    @Query(value = "SELECT t FROM TestDriveEntity t JOIN FETCH t.lead l JOIN FETCH t.vehicle v LEFT JOIN FETCH v.kiaCar JOIN FETCH t.dealer d LEFT JOIN FETCH d.manager WHERE l.dealer.id = :dealerId AND t.isDeleted = false", countQuery = "SELECT COUNT(t) FROM TestDriveEntity t JOIN t.lead l WHERE l.dealer.id = :dealerId AND t.isDeleted = false")
    Page<TestDriveEntity> findByDealerIdAndIsDeletedFalse(@Param("dealerId") Long dealerId, Pageable pageable);

    @Query(value = "SELECT t FROM TestDriveEntity t JOIN FETCH t.lead l JOIN FETCH t.vehicle v LEFT JOIN FETCH v.kiaCar JOIN FETCH t.dealer d LEFT JOIN FETCH d.manager WHERE d.manager.id = :managerId AND t.isDeleted = false", countQuery = "SELECT COUNT(t) FROM TestDriveEntity t JOIN t.dealer d WHERE d.manager.id = :managerId AND t.isDeleted = false")
    Page<TestDriveEntity> findByManagerIdAndIsDeletedFalse(@Param("managerId") Long managerId, Pageable pageable);
}