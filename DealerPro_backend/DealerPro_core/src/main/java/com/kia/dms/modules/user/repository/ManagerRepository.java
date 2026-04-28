package com.kia.dms.modules.user.repository;

import com.kia.dms.modules.user.entity.ManagerEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

@Repository
public interface ManagerRepository extends JpaRepository<ManagerEntity, Long>, JpaSpecificationExecutor<ManagerEntity> {
    Optional<ManagerEntity> findByEmail(String email);
    Optional<ManagerEntity> findByManagerUniqueId(String managerUniqueId);
}
