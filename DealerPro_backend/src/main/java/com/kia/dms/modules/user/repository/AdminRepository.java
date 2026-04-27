package com.kia.dms.modules.user.repository;

import com.kia.dms.modules.user.entity.AdminEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

@Repository
public interface AdminRepository extends JpaRepository<AdminEntity, Long>, JpaSpecificationExecutor<AdminEntity> {
    Optional<AdminEntity> findByEmail(String email);
    Optional<AdminEntity> findByAdminUniqueId(String adminUniqueId);
}
