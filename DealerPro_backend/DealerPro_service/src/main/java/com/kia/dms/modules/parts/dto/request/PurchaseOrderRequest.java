package com.kia.dms.modules.parts.dto.request;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public class PurchaseOrderRequest {

    @NotNull(message = "Part ID is required")
    private Long partId;

    @NotNull(message = "Quantity is required")
    @Min(value = 1, message = "Quantity must be at least 1")
    private Integer quantity;

    @NotBlank(message = "Justification is required")
    @Size(min = 5, message = "Justification must be at least 5 characters")
    private String justification;

    public Long getPartId() { return partId; }
    public void setPartId(Long partId) { this.partId = partId; }
    public Integer getQuantity() { return quantity; }
    public void setQuantity(Integer quantity) { this.quantity = quantity; }
    public String getJustification() { return justification; }
    public void setJustification(String justification) { this.justification = justification; }
}
