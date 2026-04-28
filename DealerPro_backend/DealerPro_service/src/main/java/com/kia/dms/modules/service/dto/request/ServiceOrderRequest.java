package com.kia.dms.modules.service.dto.request;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public class ServiceOrderRequest {

    @NotNull(message = "Vehicle ID is required")
    private Long vehicleId;

    @Size(min = 10, message = "Description must be at least 10 characters")
    private String description;

    private Long dealerId; // Optional: required for ADMIN/MANAGER, auto-filled for DEALER

    public Long getVehicleId() { return vehicleId; }
    public void setVehicleId(Long vehicleId) { this.vehicleId = vehicleId; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public Long getDealerId() { return dealerId; }
    public void setDealerId(Long dealerId) { this.dealerId = dealerId; }

    private Long version;
    public Long getVersion() { return version; }
    public void setVersion(Long version) { this.version = version; }
}
