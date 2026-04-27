package com.kia.dms.modules.analytics.dto.response;

import java.math.BigDecimal;

public class AnalyticsSummaryResponse {
    private Long totalSales;
    private BigDecimal totalRevenue;
    private Long activeLeads;
    private Long serviceJobs;

    public Long getTotalSales() { return totalSales; }
    public void setTotalSales(Long totalSales) { this.totalSales = totalSales; }
    public BigDecimal getTotalRevenue() { return totalRevenue; }
    public void setTotalRevenue(BigDecimal totalRevenue) { this.totalRevenue = totalRevenue; }
    public Long getActiveLeads() { return activeLeads; }
    public void setActiveLeads(Long activeLeads) { this.activeLeads = activeLeads; }
    public Long getServiceJobs() { return serviceJobs; }
    public void setServiceJobs(Long serviceJobs) { this.serviceJobs = serviceJobs; }
}
