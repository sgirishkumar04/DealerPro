package com.kia.dms.modules.parts.repository.custom;

import com.kia.dms.modules.parts.entity.PartEntity;
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
public class PartCustomRepositoryImpl implements PartCustomRepository {

    private final EntityManager entityManager;

    public PartCustomRepositoryImpl(EntityManager entityManager) {
        this.entityManager = entityManager;
    }

    @Override
    public Page<PartEntity> findPartsByCriteria(String name, String supplier, Long dealerId, Long managerId, Pageable pageable) {
        CriteriaBuilder cb = entityManager.getCriteriaBuilder();
        
        // 1. Count Query
        CriteriaQuery<Long> countQuery = cb.createQuery(Long.class);
        Root<PartEntity> countRoot = countQuery.from(PartEntity.class);
        countQuery.select(cb.count(countRoot));
        countQuery.where(buildPredicates(cb, countRoot, name, supplier, dealerId, managerId));
        Long total = entityManager.createQuery(countQuery).getSingleResult();

        // 2. Data Query
        CriteriaQuery<PartEntity> dataQuery = cb.createQuery(PartEntity.class);
        Root<PartEntity> dataRoot = dataQuery.from(PartEntity.class);
        
        // Fetch Joins to optimize performance
        dataRoot.fetch("dealer", JoinType.LEFT);
        dataRoot.fetch("manager", JoinType.LEFT);
        
        dataQuery.where(buildPredicates(cb, dataRoot, name, supplier, dealerId, managerId));
        dataQuery.orderBy(cb.asc(dataRoot.get("name")));
        
        TypedQuery<PartEntity> typedQuery = entityManager.createQuery(dataQuery);
        typedQuery.setFirstResult((int) pageable.getOffset());
        typedQuery.setMaxResults(pageable.getPageSize());
        List<PartEntity> results = typedQuery.getResultList();

        return new PageImpl<>(results, pageable, total);
    }

    private Predicate[] buildPredicates(CriteriaBuilder cb, Root<PartEntity> root, 
                                       String name, String supplier, Long dealerId, Long managerId) {
        List<Predicate> predicates = new ArrayList<>();
        predicates.add(cb.or(
            cb.equal(root.get("isDeleted"), false),
            cb.isNull(root.get("isDeleted"))
        ));

        if (name != null && !name.trim().isEmpty()) {
            predicates.add(cb.like(cb.lower(root.get("name")), "%" + name.toLowerCase() + "%"));
        }
        if (supplier != null && !supplier.trim().isEmpty()) {
            predicates.add(cb.like(cb.lower(root.get("supplier")), "%" + supplier.toLowerCase() + "%"));
        }
        if (dealerId != null) {
            predicates.add(cb.equal(root.get("dealer").get("id"), dealerId));
        }
        if (managerId != null) {
            predicates.add(cb.equal(root.get("manager").get("id"), managerId));
        }

        return predicates.toArray(new Predicate[0]);
    }
}
