package com.kia.dms.modules.analytics.dto.response;

import java.math.BigDecimal;

public class MonthlyDataResponse {
    private String name;  // Month name (e.g., "Oct", "Nov")
    private Integer sales;  // Total quantity sold
    private BigDecimal revenue;  // Total revenue

    public MonthlyDataResponse() {}

    public MonthlyDataResponse(String name, Integer sales, BigDecimal revenue) {
        this.name = name;
        this.sales = sales;
        this.revenue = revenue;
    }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public Integer getSales() { return sales; }
    public void setSales(Integer sales) { this.sales = sales; }
    public BigDecimal getRevenue() { return revenue; }
    public void setRevenue(BigDecimal revenue) { this.revenue = revenue; }
}
