package com.kia.dms.modules.sales.repository.custom;

import com.kia.dms.modules.sales.entity.OrderEntity;
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
public class OrderCustomRepositoryImpl implements OrderCustomRepository {

    private final EntityManager entityManager;

    public OrderCustomRepositoryImpl(EntityManager entityManager) {
        this.entityManager = entityManager;
    }

    @Override
    public Page<OrderEntity> findWithFilters(Long orderId, Long dealerId, Long managerId, Pageable pageable) {
        CriteriaBuilder cb = entityManager.getCriteriaBuilder();
        
        // 1. Count Query
        CriteriaQuery<Long> countQuery = cb.createQuery(Long.class);
        Root<OrderEntity> countRoot = countQuery.from(OrderEntity.class);
        countQuery.select(cb.count(countRoot));
        countQuery.where(buildPredicates(cb, countRoot, orderId, dealerId, managerId));
        Long total = entityManager.createQuery(countQuery).getSingleResult();

        // 2. Data Query
        CriteriaQuery<OrderEntity> dataQuery = cb.createQuery(OrderEntity.class);
        Root<OrderEntity> dataRoot = dataQuery.from(OrderEntity.class);
        
        // Fetch Joins to optimize performance
        dataRoot.fetch("vehicle", JoinType.LEFT).fetch("kiaCar", JoinType.LEFT);
        dataRoot.fetch("dealer", JoinType.LEFT);
        dataRoot.fetch("manager", JoinType.LEFT);
        
        dataQuery.where(buildPredicates(cb, dataRoot, orderId, dealerId, managerId));
        dataQuery.orderBy(cb.desc(dataRoot.get("createdAt")));
        
        TypedQuery<OrderEntity> typedQuery = entityManager.createQuery(dataQuery);
        typedQuery.setFirstResult((int) pageable.getOffset());
        typedQuery.setMaxResults(pageable.getPageSize());
        List<OrderEntity> results = typedQuery.getResultList();

        return new PageImpl<>(results, pageable, total);
    }

    private Predicate[] buildPredicates(CriteriaBuilder cb, Root<OrderEntity> root, 
                                       Long orderId, Long dealerId, Long managerId) {
        List<Predicate> predicates = new ArrayList<>();
        predicates.add(cb.equal(root.get("isDeleted"), false));

        if (orderId != null) {
            predicates.add(cb.equal(root.get("id"), orderId));
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
