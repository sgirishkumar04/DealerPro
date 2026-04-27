package com.kia.dms.modules.parts.dto.response;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public class PurchaseOrderResponse {
    private Long id;
    private Long partId;
    private String partName;
    private String dealerName;
    private Integer quantity;
    private BigDecimal totalCost;
    private String justification;
    private LocalDateTime createdAt;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getPartId() { return partId; }
    public void setPartId(Long partId) { this.partId = partId; }
    public String getPartName() { return partName; }
    public void setPartName(String partName) { this.partName = partName; }
    public String getDealerName() { return dealerName; }
    public void setDealerName(String dealerName) { this.dealerName = dealerName; }
    public Integer getQuantity() { return quantity; }
    public void setQuantity(Integer quantity) { this.quantity = quantity; }
    public BigDecimal getTotalCost() { return totalCost; }
    public void setTotalCost(BigDecimal totalCost) { this.totalCost = totalCost; }
    public String getJustification() { return justification; }
    public void setJustification(String justification) { this.justification = justification; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
