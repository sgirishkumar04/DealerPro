package com.kia.dms.modules.user.repository;

import com.kia.dms.modules.user.entity.UserEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.querydsl.QuerydslPredicateExecutor;

@Repository
public interface UserRepository extends JpaRepository<UserEntity, Long>, JpaSpecificationExecutor<UserEntity>, QuerydslPredicateExecutor<UserEntity> {
    
    @Query("SELECT u FROM UserEntity u LEFT JOIN FETCH u.roles WHERE u.email = :email AND u.isDeleted = false")
    Optional<UserEntity> findByEmailWithRole(@Param("email") String email);

    @Query("SELECT u FROM UserEntity u WHERE u.email = :email AND u.isDeleted = false")
    Optional<UserEntity> findByEmail(@Param("email") String email);

    boolean existsByEmail(String email);
}
