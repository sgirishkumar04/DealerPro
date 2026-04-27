package com.kia.dms.modules.inventory.repository.custom;

import com.kia.dms.modules.inventory.entity.InventoryEntity;
import jakarta.persistence.EntityManager;
import jakarta.persistence.TypedQuery;
import jakarta.persistence.criteria.*;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Repository;

import java.util.ArrayList;
import java.util.List;

@Repository
public class InventoryCustomRepositoryImpl implements InventoryCustomRepository {

    private final EntityManager entityManager;

    public InventoryCustomRepositoryImpl(EntityManager entityManager) {
        this.entityManager = entityManager;
    }

    @Override
    public Page<InventoryEntity> findWithFilters(Long vehicleId, Long dealerId, Long managerId, 
                                                   String status, String model, String variant, 
                                                   String color, Pageable pageable) {
        CriteriaBuilder cb = entityManager.getCriteriaBuilder();
        
        // 1. Count Query
        CriteriaQuery<Long> countQuery = cb.createQuery(Long.class);
        Root<InventoryEntity> countRoot = countQuery.from(InventoryEntity.class);
        countQuery.select(cb.count(countRoot));
        countQuery.where(buildPredicates(cb, countRoot, vehicleId, dealerId, managerId, status, model, variant, color));
        Long total = entityManager.createQuery(countQuery).getSingleResult();

        // 2. Data Query
        CriteriaQuery<InventoryEntity> dataQuery = cb.createQuery(InventoryEntity.class);
        Root<InventoryEntity> dataRoot = dataQuery.from(InventoryEntity.class);
        
        // Fetch Joins
        dataRoot.fetch("vehicle", JoinType.LEFT).fetch("kiaCar", JoinType.LEFT);
        dataRoot.fetch("dealer", JoinType.LEFT);
        
        dataQuery.where(buildPredicates(cb, dataRoot, vehicleId, dealerId, managerId, status, model, variant, color));
        dataQuery.orderBy(cb.desc(dataRoot.get("createdAt")));
        
        TypedQuery<InventoryEntity> typedQuery = entityManager.createQuery(dataQuery);
        typedQuery.setFirstResult((int) pageable.getOffset());
        typedQuery.setMaxResults(pageable.getPageSize());
        List<InventoryEntity> results = typedQuery.getResultList();

        return new PageImpl<>(results, pageable, total);
    }

    private Predicate[] buildPredicates(CriteriaBuilder cb, Root<InventoryEntity> root,
                                       Long vehicleId, Long dealerId, Long managerId,
                                       String status, String model, String variant, String color) {
        List<Predicate> predicates = new ArrayList<>();
        predicates.add(cb.equal(root.get("isDeleted"), false));

        if (vehicleId != null) {
            predicates.add(cb.equal(root.get("vehicle").get("id"), vehicleId));
        }
        if (dealerId != null) {
            predicates.add(cb.equal(root.get("dealer").get("id"), dealerId));
        }
        if (managerId != null) {
            predicates.add(cb.equal(root.get("dealer").get("manager").get("id"), managerId));
        }
        if (status != null && !status.isEmpty()) {
            predicates.add(cb.equal(root.get("status"), status));
        }
        
        if (model != null && !model.trim().isEmpty()) {
            String pattern = "%" + model.toLowerCase().trim() + "%";
            predicates.add(cb.or(
                cb.like(cb.lower(root.get("vehicle").get("kiaCar").get("modelName")), pattern),
                cb.like(cb.lower(root.get("kiaCar").get("modelName")), pattern)
            ));
        }
        
        if (variant != null && !variant.trim().isEmpty()) {
            String pattern = "%" + variant.toLowerCase().trim() + "%";
            predicates.add(cb.or(
                cb.like(cb.lower(root.get("vehicle").get("kiaCar").get("variant")), pattern),
                cb.like(cb.lower(root.get("kiaCar").get("variant")), pattern)
            ));
        }
        
        if (color != null && !color.trim().isEmpty()) {
            String pattern = "%" + color.toLowerCase().trim() + "%";
            predicates.add(cb.or(
                cb.like(cb.lower(root.get("vehicle").get("kiaCar").get("color")), pattern),
                cb.like(cb.lower(root.get("kiaCar").get("color")), pattern)
            ));
        }

        return predicates.toArray(new Predicate[0]);
    }
}
