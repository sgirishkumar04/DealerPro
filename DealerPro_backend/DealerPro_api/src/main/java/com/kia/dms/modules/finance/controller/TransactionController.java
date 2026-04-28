package com.kia.dms.modules.finance.controller;

import com.kia.dms.common.response.ApiResponse;
import com.kia.dms.common.response.PaginationResponse;
import com.kia.dms.modules.finance.dto.response.TransactionResponse;
import com.kia.dms.modules.finance.service.FinanceService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import com.kia.dms.common.dto.request.GlobalSearchRequest;

@RestController
@RequestMapping("/api/transactions")
@PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
public class TransactionController {

    @Autowired private FinanceService financeService;

    @GetMapping
    public ResponseEntity<ApiResponse<PaginationResponse<TransactionResponse>>> getTransactions(
            @RequestParam(required = false) Long dealerId,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate,
            Pageable pageable) {
        return ResponseEntity.ok(new ApiResponse<>(true, financeService.getTransactions(dealerId, type, startDate, endDate, pageable), "Success"));
    }

    @PostMapping("/search")
    public ResponseEntity<ApiResponse<PaginationResponse<TransactionResponse>>> searchTransactions(@RequestBody GlobalSearchRequest request) {
        return ResponseEntity.ok(new ApiResponse<>(true, financeService.searchTransactions(request), "Search successful"));
    }

    @GetMapping("/analytics-transposed")
    public ResponseEntity<ApiResponse<java.util.Map<String, Object>>> getTransposedAnalytics() {
        // Fetch all transactions to aggregate
        java.util.List<TransactionResponse> allTx = financeService.getTransactions(null, null, null, null, Pageable.unpaged()).getContent();
        
        java.math.BigDecimal revenue = java.math.BigDecimal.ZERO;
        java.math.BigDecimal expenses = java.math.BigDecimal.ZERO;

        for (TransactionResponse tx : allTx) {
            if (tx.getAmount() == null) continue;
            if ("INCOME".equalsIgnoreCase(tx.getType()) || "REVENUE".equalsIgnoreCase(tx.getType())) {
                revenue = revenue.add(tx.getAmount());
            } else if ("EXPENSE".equalsIgnoreCase(tx.getType())) {
                expenses = expenses.add(tx.getAmount());
            }
        }
        
        java.math.BigDecimal profit = revenue.subtract(expenses);
        
        java.util.Map<String, Object> row = new java.util.HashMap<>();
        row.put("snapshot", "Current Finance");
        row.put("revenue", revenue);
        row.put("expenses", expenses);
        row.put("profit", profit);

        java.util.Map<String, Object> transposed = com.kia.dms.common.utils.TransposeUtil.transpose(
            java.util.List.of(row),
            java.util.List.of("revenue", "expenses", "profit"),
            "snapshot"
        );
        return ResponseEntity.ok(new ApiResponse<>(true, transposed, "Transposed finance successfully"));
    }

    @GetMapping("/transposed")
    public ResponseEntity<ApiResponse<java.util.Map<String, Object>>> getTransposedFinance() {
        return ResponseEntity.ok(new ApiResponse<>(true, financeService.getTransposedData(), "Transposed quarterly P&L successfully"));
    }

    @GetMapping("/invoice/{id}")
    public ResponseEntity<byte[]> getInvoice(@PathVariable Long id) {
        byte[] pdf = financeService.generateInvoice(id);
        return ResponseEntity.ok()
                .header(org.springframework.http.HttpHeaders.CONTENT_TYPE, org.springframework.http.MediaType.APPLICATION_PDF_VALUE)
                .header(org.springframework.http.HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=invoice-" + id + ".pdf")
                .body(pdf);
    }
}
