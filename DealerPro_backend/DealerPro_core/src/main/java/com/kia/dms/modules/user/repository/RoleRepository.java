package com.kia.dms.modules.user.repository;

import com.kia.dms.modules.user.entity.RoleEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface RoleRepository extends JpaRepository<RoleEntity, Long> {
    Optional<RoleEntity> findByName(String name);

    @org.springframework.data.jpa.repository.Query(value = "SELECT r.name FROM roles r INNER JOIN user_roles ur ON r.id = ur.role_id WHERE ur.user_id = :userId", nativeQuery = true)
    java.util.List<String> findAllRoleNamesByUserId(@org.springframework.data.repository.query.Param("userId") Long userId);
}
