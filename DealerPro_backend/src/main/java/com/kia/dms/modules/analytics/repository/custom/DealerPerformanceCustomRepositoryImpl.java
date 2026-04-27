package com.kia.dms.modules.analytics.repository.custom;

import com.kia.dms.modules.analytics.entity.DealerPerformanceEntity;
import jakarta.persistence.EntityManager;
import jakarta.persistence.TypedQuery;
import jakarta.persistence.criteria.*;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Repository
public class DealerPerformanceCustomRepositoryImpl implements DealerPerformanceCustomRepository {

    private final EntityManager entityManager;

    public DealerPerformanceCustomRepositoryImpl(EntityManager entityManager) {
        this.entityManager = entityManager;
    }

    @Override
    public Page<DealerPerformanceEntity> findPerformances(Long dealerId, LocalDateTime startDate,
                                                           LocalDateTime endDate, Pageable pageable) {
        CriteriaBuilder cb = entityManager.getCriteriaBuilder();
        
        // 1. Count Query
        CriteriaQuery<Long> countQuery = cb.createQuery(Long.class);
        Root<DealerPerformanceEntity> countRoot = countQuery.from(DealerPerformanceEntity.class);
        countQuery.select(cb.count(countRoot));
        countQuery.where(buildPredicates(cb, countRoot, dealerId, startDate, endDate));
        Long total = entityManager.createQuery(countQuery).getSingleResult();

        // 2. Data Query
        CriteriaQuery<DealerPerformanceEntity> dataQuery = cb.createQuery(DealerPerformanceEntity.class);
        Root<DealerPerformanceEntity> dataRoot = dataQuery.from(DealerPerformanceEntity.class);
        
        dataQuery.where(buildPredicates(cb, dataRoot, dealerId, startDate, endDate));
        dataQuery.orderBy(cb.desc(dataRoot.get("createdAt")));
        
        TypedQuery<DealerPerformanceEntity> typedQuery = entityManager.createQuery(dataQuery);
        typedQuery.setFirstResult((int) pageable.getOffset());
        typedQuery.setMaxResults(pageable.getPageSize());
        List<DealerPerformanceEntity> results = typedQuery.getResultList();

        return new PageImpl<>(results, pageable, total);
    }

    private Predicate[] buildPredicates(CriteriaBuilder cb, Root<DealerPerformanceEntity> root,
                                       Long dealerId, LocalDateTime startDate, LocalDateTime endDate) {
        List<Predicate> predicates = new ArrayList<>();

        if (dealerId != null) {
            predicates.add(cb.equal(root.get("dealer").get("id"), dealerId));
        }
        if (startDate != null && endDate != null) {
            predicates.add(cb.between(root.get("createdAt"), startDate, endDate));
        } else if (startDate != null) {
            predicates.add(cb.greaterThanOrEqualTo(root.get("createdAt"), startDate));
        } else if (endDate != null) {
            predicates.add(cb.lessThanOrEqualTo(root.get("createdAt"), endDate));
        }

        return predicates.toArray(new Predicate[0]);
    }
}
