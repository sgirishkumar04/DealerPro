package com.kia.dms.common.specification;

import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

public class SearchSpecification<T> {

    public static <T> Specification<T> build(String keyword, List<String> searchColumns, Map<String, String> filters) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            // 1. Keyword Search (OR logic across columns)
            if (keyword != null && !keyword.trim().isEmpty() && searchColumns != null && !searchColumns.isEmpty()) {
                String pattern = "%" + keyword.toLowerCase() + "%";
                List<Predicate> keywordPredicates = new ArrayList<>();
                
                for (String column : searchColumns) {
                    keywordPredicates.add(cb.like(cb.lower(root.get(column).as(String.class)), pattern));
                }
                predicates.add(cb.or(keywordPredicates.toArray(new Predicate[0])));
            }

            // 2. Dynamic Filters (AND logic)
            if (filters != null && !filters.isEmpty()) {
                for (Map.Entry<String, String> entry : filters.entrySet()) {
                    String field = entry.getKey();
                    String value = entry.getValue();
                    
                    if (value != null && !value.trim().isEmpty()) {
                        // Handle special cases like Boolean or Enums if needed
                        if (value.equalsIgnoreCase("true") || value.equalsIgnoreCase("false")) {
                            predicates.add(cb.equal(root.get(field), Boolean.parseBoolean(value)));
                        } else {
                            predicates.add(cb.equal(root.get(field).as(String.class), value));
                        }
                    }
                }
            }

            // 3. Always filter out deleted items if the column exists
            try {
                predicates.add(cb.equal(root.get("isDeleted"), false));
            } catch (Exception e) {
                // Ignore if isDeleted doesn't exist on entity
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}
