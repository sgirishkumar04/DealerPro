package com.kia.dms.modules.analytics.service;

import com.kia.dms.common.response.PaginationResponse;
import com.kia.dms.modules.analytics.dto.response.AnalyticsSummaryResponse;
import com.kia.dms.modules.analytics.dto.response.ConversionSplitResponse;
import com.kia.dms.modules.analytics.dto.response.DealerPerformanceResponse;
import com.kia.dms.modules.analytics.dto.response.MonthlyDataResponse;
import org.springframework.data.domain.Pageable;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

public interface AnalyticsService {
    
    PaginationResponse<DealerPerformanceResponse> getDealerPerformance(Long dealerId, LocalDateTime startDate, LocalDateTime endDate, Pageable pageable);
    
    PaginationResponse<DealerPerformanceResponse> getMyPerformance(String email, Pageable pageable);
    
    AnalyticsSummaryResponse getAnalyticsSummary(String email);
    
    List<ConversionSplitResponse> getConversionSplit(String email);
    
    List<MonthlyDataResponse> getMonthlySalesData(String email);

    Map<String, Object> getDashboardData();
}
