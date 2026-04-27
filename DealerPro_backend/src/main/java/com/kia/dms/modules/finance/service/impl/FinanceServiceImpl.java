package com.kia.dms.modules.finance.service.impl;

import com.kia.dms.common.response.PaginationResponse;
import com.kia.dms.modules.finance.dto.response.TransactionResponse;
import com.kia.dms.modules.finance.entity.TransactionEntity;
import com.kia.dms.modules.finance.repository.TransactionRepository;
import com.kia.dms.modules.finance.service.FinanceService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.stream.Collectors;
import com.kia.dms.common.dto.request.GlobalSearchRequest;
import com.kia.dms.common.specification.GenericSpecificationBuilder;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import java.util.ArrayList;
import java.util.Arrays;

@Service
public class FinanceServiceImpl implements FinanceService {

    @Autowired private TransactionRepository transactionRepository;
    @Autowired private com.kia.dms.modules.user.repository.UserRepository userRepository;
    @Autowired private com.kia.dms.modules.files.service.PdfService pdfService;

    private com.kia.dms.modules.user.entity.UserEntity getCurrentUser() {
        String email = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByEmailWithRole(email)
                .orElseThrow(() -> new com.kia.dms.exception.ResourceNotFoundException("User not found"));
    }

    @Override
    public PaginationResponse<TransactionResponse> getTransactions(Long dealerId, String type, String startDate, String endDate, Pageable pageable) {
        com.kia.dms.modules.user.entity.UserEntity currentUser = getCurrentUser();
        Long filterDealerId = dealerId;
        Long filterManagerId = null;

        if (currentUser.getRole().getName().equalsIgnoreCase("ROLE_DEALER")) {
            filterDealerId = currentUser.getDealer().getId();
        } else if (currentUser.getRole().getName().equalsIgnoreCase("ROLE_MANAGER")) {
            filterManagerId = currentUser.getManagerProfile().getId();
        }

        LocalDateTime start = startDate != null ? LocalDateTime.parse(startDate, DateTimeFormatter.ISO_DATE_TIME) : null;
        LocalDateTime end = endDate != null ? LocalDateTime.parse(endDate, DateTimeFormatter.ISO_DATE_TIME) : null;

        Page<TransactionEntity> page = transactionRepository.findWithFilters(filterDealerId, filterManagerId, type, start, end, pageable);
        List<TransactionResponse> content = page.getContent().stream().map(this::mapToResponse).collect(Collectors.toList());
        return new PaginationResponse<>(content, page.getNumber(), page.getSize(), page.getTotalElements(), page.getTotalPages());
    }

    @Override
    @org.springframework.transaction.annotation.Transactional(readOnly = true)
    public PaginationResponse<TransactionResponse> searchTransactions(GlobalSearchRequest request) {
        com.kia.dms.modules.user.entity.UserEntity currentUser = getCurrentUser();
        String roleName = currentUser.getRole().getName().toUpperCase();
        
        // 1. Build Sorting
        List<Sort.Order> orders = new ArrayList<>();
        if (request.getSorts() != null && !request.getSorts().isEmpty()) {
            for (GlobalSearchRequest.SortRequest sort : request.getSorts()) {
                orders.add(new Sort.Order(
                    Sort.Direction.fromString(sort.getDirection() != null ? sort.getDirection() : "DESC"),
                    sort.getField()
                ));
            }
        } else {
            orders.add(new Sort.Order(Sort.Direction.DESC, "id"));
        }
        
        Pageable pageable = PageRequest.of(request.getPage(), request.getSize(), Sort.by(orders));

        // 2. Build searchable columns
        List<String> searchableColumns = Arrays.asList("type", "description", "dealer.name"); 

        // 3. Build Specification
        Specification<TransactionEntity> spec = GenericSpecificationBuilder.build(request, searchableColumns);

        // 4. Role-based constraints
        Specification<TransactionEntity> roleSpec = (root, query, cb) -> {
            if (roleName.equals("ROLE_DEALER") || roleName.equals("DEALER")) {
                return cb.equal(root.get("dealer").get("id"), currentUser.getDealer().getId());
            } else if (roleName.equals("ROLE_MANAGER") || roleName.equals("MANAGER")) {
                return cb.equal(root.get("dealer").get("manager").get("id"), currentUser.getManagerProfile().getId());
            }
            return cb.conjunction();
        };

        spec = spec.and(roleSpec);

        // 5. Execute Search
        Page<TransactionEntity> page = transactionRepository.findAll(spec, pageable);
        
        List<TransactionResponse> content = page.getContent().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
        
        return new PaginationResponse<>(content, page.getNumber(), page.getSize(), page.getTotalElements(), page.getTotalPages());
    }

    private TransactionResponse mapToResponse(TransactionEntity entity) {
        TransactionResponse res = new TransactionResponse();
        res.setId(entity.getId());
        res.setDealerId(entity.getDealer().getId());
        res.setDealerName(entity.getDealer().getName());
        // Get manager ID from transaction's own manager field (historical data)
        res.setManagerId(entity.getManager() != null ? entity.getManager().getId() : null);
        res.setType(entity.getType());
        res.setAmount(entity.getAmount());
        res.setDescription(entity.getDescription());
        res.setCreatedAt(entity.getCreatedAt());
        res.setVersion(entity.getVersion());
        applyMasking(res);
        return res;
    }

    private void applyMasking(TransactionResponse res) {
        String role = com.kia.dms.common.utils.SecurityUtils.getCurrentUserRole();
        if (role.equals("ADMIN") || role.equals("ROLE_ADMIN")) return;
        
        // For Manager/Dealer, mask middle of description if it looks like it has sensitive info
        // (Simple implementation: mask if length > 10)
        if (res.getDescription() != null && res.getDescription().length() > 10) {
            res.setDescription(res.getDescription().substring(0, 5) + "..." + res.getDescription().substring(res.getDescription().length() - 5));
        }
    }

    private String getQuarter(LocalDateTime date) {
        if (date == null) return "Unknown";
        int month = date.getMonthValue();
        if (month <= 3) return "Q1";
        else if (month <= 6) return "Q2";
        else if (month <= 9) return "Q3";
        else return "Q4";
    }

    private java.util.Map<String, java.util.Map<String, java.math.BigDecimal>> calculatePnL(List<TransactionEntity> transactions) {
        java.util.Map<String, java.util.Map<String, java.math.BigDecimal>> result = new java.util.HashMap<>();

        for (TransactionEntity tx : transactions) {
            String quarter = getQuarter(tx.getCreatedAt());

            result.putIfAbsent(quarter, new java.util.HashMap<>());
            java.util.Map<String, java.math.BigDecimal> quarterData = result.get(quarter);

            quarterData.putIfAbsent("Income", java.math.BigDecimal.ZERO);
            quarterData.putIfAbsent("Expenses", java.math.BigDecimal.ZERO);

            if (tx.getAmount() == null) continue;

            if ("INCOME".equalsIgnoreCase(tx.getType()) || "REVENUE".equalsIgnoreCase(tx.getType()) || "CREDIT".equalsIgnoreCase(tx.getType())) {
                quarterData.put("Income", quarterData.get("Income").add(tx.getAmount()));
            } else if ("EXPENSE".equalsIgnoreCase(tx.getType()) || "DEBIT".equalsIgnoreCase(tx.getType())) {
                quarterData.put("Expenses", quarterData.get("Expenses").add(tx.getAmount()));
            }
        }

        // Calculate profit
        for (java.util.Map<String, java.math.BigDecimal> qData : result.values()) {
            java.math.BigDecimal profit = qData.get("Income").subtract(qData.get("Expenses"));
            qData.put("Profit", profit);
        }

        return result;
    }

    private java.util.Map<String, Object> transpose(java.util.Map<String, java.util.Map<String, java.math.BigDecimal>> input) {
        List<String> quarters = new ArrayList<>(input.keySet());
        quarters.sort(String::compareTo); // Sort Q1, Q2, Q3, Q4

        java.util.Map<String, List<java.math.BigDecimal>> data = new java.util.LinkedHashMap<>();

        for (String metric : List.of("Income", "Expenses", "Profit")) {
            List<java.math.BigDecimal> values = new ArrayList<>();

            for (String q : quarters) {
                values.add(input.get(q).getOrDefault(metric, java.math.BigDecimal.ZERO));
            }

            data.put(metric, values);
        }

        java.util.Map<String, Object> result = new java.util.HashMap<>();
        result.put("quarters", quarters);
        result.put("data", data);

        return result;
    }

    @Override
    public java.util.Map<String, Object> getTransposedData() {
        // Find all transactions using role filtering from getTransactions logic or directly
        // Fetch all transactions to aggregate (simplified to use repository)
        List<TransactionEntity> transactions;
        com.kia.dms.modules.user.entity.UserEntity currentUser = getCurrentUser();
        
        if (currentUser.getRole().getName().equalsIgnoreCase("ROLE_DEALER")) {
            transactions = transactionRepository.findWithFilters(currentUser.getDealer().getId(), null, null, null, null, Pageable.unpaged()).getContent();
        } else if (currentUser.getRole().getName().equalsIgnoreCase("ROLE_MANAGER")) {
            transactions = transactionRepository.findWithFilters(null, currentUser.getManagerProfile().getId(), null, null, null, Pageable.unpaged()).getContent();
        } else {
            transactions = transactionRepository.findAll();
        }

        java.util.Map<String, java.util.Map<String, java.math.BigDecimal>> pnl = calculatePnL(transactions);

        return transpose(pnl);
    }

    @Override
    public byte[] generateInvoice(Long id) {
        TransactionEntity tx = transactionRepository.findById(id)
                .orElseThrow(() -> new com.kia.dms.exception.ResourceNotFoundException("Transaction not found"));
        
        String date = tx.getCreatedAt().format(DateTimeFormatter.ofPattern("dd-MMM-yyyy HH:mm"));
        String customerName = tx.getDealer() != null ? tx.getDealer().getName() : "Valued Customer";
        String email = "finance@dealerpro.com"; // Default for invoice
        
        return pdfService.generateInvoice(tx.getId(), customerName, email, tx.getAmount(), date);
    }
}
