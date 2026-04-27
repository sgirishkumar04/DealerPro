package com.kia.dms.modules.finance.service;

import com.kia.dms.common.response.PaginationResponse;
import com.kia.dms.modules.finance.dto.response.TransactionResponse;
import org.springframework.data.domain.Pageable;

public interface FinanceService {
    PaginationResponse<TransactionResponse> getTransactions(Long dealerId, String type, String startDate, String endDate, Pageable pageable);
    PaginationResponse<TransactionResponse> searchTransactions(com.kia.dms.common.dto.request.GlobalSearchRequest request);
    java.util.Map<String, Object> getTransposedData();
    byte[] generateInvoice(Long id);
}
