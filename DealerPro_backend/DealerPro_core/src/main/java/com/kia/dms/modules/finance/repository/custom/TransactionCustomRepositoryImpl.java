package com.kia.dms.modules.finance.repository.custom;

import com.kia.dms.modules.finance.entity.TransactionEntity;
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
public class TransactionCustomRepositoryImpl implements TransactionCustomRepository {

    private final EntityManager entityManager;

    public TransactionCustomRepositoryImpl(EntityManager entityManager) {
        this.entityManager = entityManager;
    }

    @Override
    public Page<TransactionEntity> findWithFilters(Long dealerId, Long managerId, String type,
                                                    LocalDateTime startDate, LocalDateTime endDate,
                                                    Pageable pageable) {
        CriteriaBuilder cb = entityManager.getCriteriaBuilder();
        
        // 1. Count Query
        CriteriaQuery<Long> countQuery = cb.createQuery(Long.class);
        Root<TransactionEntity> countRoot = countQuery.from(TransactionEntity.class);
        countQuery.select(cb.count(countRoot));
        countQuery.where(buildPredicates(cb, countRoot, dealerId, managerId, type, startDate, endDate));
        Long total = entityManager.createQuery(countQuery).getSingleResult();

        // 2. Data Query
        CriteriaQuery<TransactionEntity> dataQuery = cb.createQuery(TransactionEntity.class);
        Root<TransactionEntity> dataRoot = dataQuery.from(TransactionEntity.class);
        
        dataQuery.where(buildPredicates(cb, dataRoot, dealerId, managerId, type, startDate, endDate));
        dataQuery.orderBy(cb.desc(dataRoot.get("createdAt")));
        
        TypedQuery<TransactionEntity> typedQuery = entityManager.createQuery(dataQuery);
        typedQuery.setFirstResult((int) pageable.getOffset());
        typedQuery.setMaxResults(pageable.getPageSize());
        List<TransactionEntity> results = typedQuery.getResultList();

        return new PageImpl<>(results, pageable, total);
    }

    private Predicate[] buildPredicates(CriteriaBuilder cb, Root<TransactionEntity> root,
                                       Long dealerId, Long managerId, String type,
                                       LocalDateTime startDate, LocalDateTime endDate) {
        List<Predicate> predicates = new ArrayList<>();
        predicates.add(cb.equal(root.get("isDeleted"), false));

        if (dealerId != null) {
            predicates.add(cb.equal(root.get("dealer").get("id"), dealerId));
        }
        if (managerId != null) {
            predicates.add(cb.equal(root.get("manager").get("id"), managerId));
        }
        if (type != null && !type.isEmpty() && !type.equalsIgnoreCase("ALL")) {
            predicates.add(cb.equal(root.get("type"), type));
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
