package com.kia.dms.modules.dealer.repository;

import com.kia.dms.modules.dealer.entity.DealerEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

@Repository
public interface DealerRepository extends JpaRepository<DealerEntity, Long>, JpaSpecificationExecutor<DealerEntity> {
    
    @Query("SELECT d FROM DealerEntity d WHERE d.manager IS NULL")
    List<DealerEntity> findDealersWithoutManager();
}
