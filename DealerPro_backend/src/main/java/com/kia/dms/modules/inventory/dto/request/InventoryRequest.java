package com.kia.dms.modules.inventory.dto.request;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public class InventoryRequest {
    private Long vehicleId;
    private Long kiaCarId;  // links to kia_cars for variant+color tracking
    private Long dealerId;
    @NotNull
    @Min(0)
    private Integer quantity;
    private String status;

    public Long getVehicleId() { return vehicleId; }
    public void setVehicleId(Long vehicleId) { this.vehicleId = vehicleId; }
    public Long getKiaCarId() { return kiaCarId; }
    public void setKiaCarId(Long kiaCarId) { this.kiaCarId = kiaCarId; }
    public Long getDealerId() { return dealerId; }
    public void setDealerId(Long dealerId) { this.dealerId = dealerId; }
    public Integer getQuantity() { return quantity; }
    public void setQuantity(Integer quantity) { this.quantity = quantity; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    private Long version;
    public Long getVersion() { return version; }
    public void setVersion(Long version) { this.version = version; }
}
