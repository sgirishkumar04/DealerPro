package com.kia.dms.common.specification;

import com.kia.dms.common.dto.request.GlobalSearchRequest;
import jakarta.persistence.criteria.*;
import org.springframework.data.jpa.domain.Specification;
import java.util.ArrayList;
import java.util.List;

public class GenericSpecificationBuilder<T> {

    public static <T> Specification<T> build(GlobalSearchRequest request, List<String> searchableColumns) {
        return (root, query, cb) -> {
            List<Predicate> mainPredicates = new ArrayList<>();

            // 1. Global Keyword Search (Enhanced to support multiple terms like "Kia Seltos")
            if (request.getKeyword() != null && !request.getKeyword().trim().isEmpty() && searchableColumns != null && !searchableColumns.isEmpty()) {
                String[] terms = request.getKeyword().trim().split("\\s+");
                List<Predicate> allTermsPredicates = new ArrayList<>();

                for (String term : terms) {
                    String pattern = "%" + term.toLowerCase() + "%";
                    List<Predicate> singleTermPredicates = new ArrayList<>();
                    
                    for (String column : searchableColumns) {
                        try {
                            Path<?> path = getPath(root, column);
                            singleTermPredicates.add(cb.like(cb.lower(path.as(String.class)), pattern));
                        } catch (Exception e) {
                            // Skip columns that don't exist or can't be cast to String
                        }
                    }
                    if (!singleTermPredicates.isEmpty()) {
                        allTermsPredicates.add(cb.or(singleTermPredicates.toArray(new Predicate[0])));
                    }
                }
                
                if (!allTermsPredicates.isEmpty()) {
                    mainPredicates.add(cb.and(allTermsPredicates.toArray(new Predicate[0])));
                }
            }

            // 2. Dynamic Column Filters (AND logic)
            if (request.getFilters() != null && !request.getFilters().isEmpty()) {
                for (GlobalSearchRequest.FilterRequest filter : request.getFilters()) {
                    String field = filter.getField();
                    String operator = filter.getOperator();
                    String value = filter.getValue();

                    if (value == null || value.trim().isEmpty()) continue;

                    try {
                        Path<?> path = getPath(root, field);
                        switch (operator.toUpperCase()) {
                            case "=":
                            case "EQUALS":
                                if (value.equalsIgnoreCase("true") || value.equalsIgnoreCase("false")) {
                                    mainPredicates.add(cb.equal(path, Boolean.parseBoolean(value)));
                                } else {
                                    mainPredicates.add(cb.equal(path.as(String.class), value));
                                }
                                break;
                            case "LIKE":
                            case "CONTAINS":
                                mainPredicates.add(cb.like(cb.lower(path.as(String.class)), "%" + value.toLowerCase() + "%"));
                                break;
                            case ">":
                            case "GT":
                                mainPredicates.add(cb.greaterThan(path.as(String.class), value));
                                break;
                            case "<":
                            case "LT":
                                mainPredicates.add(cb.lessThan(path.as(String.class), value));
                                break;
                            case ">=":
                            case "GTE":
                                mainPredicates.add(cb.greaterThanOrEqualTo(path.as(String.class), value));
                                break;
                            case "<=":
                            case "LTE":
                                mainPredicates.add(cb.lessThanOrEqualTo(path.as(String.class), value));
                                break;
                        }
                    } catch (Exception e) {
                        // Skip invalid filter fields
                    }
                }
            }

            // 3. Default soft-delete filter
            try {
                mainPredicates.add(cb.equal(root.get("isDeleted"), false));
            } catch (Exception e) {
                // Entity might not have isDeleted
            }

            return cb.and(mainPredicates.toArray(new Predicate[0]));
        };
    }

    /**
     * Helper to resolve path for nested fields like "dealer.name"
     */
    private static Path<?> getPath(Root<?> root, String field) {
        if (!field.contains(".")) {
            return root.get(field);
        }
        String[] parts = field.split("\\.");
        Path<?> path = root.get(parts[0]);
        for (int i = 1; i < parts.length; i++) {
            path = path.get(parts[i]);
        }
        return path;
    }
}
