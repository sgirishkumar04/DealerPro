package com.kia.dms.modules.service.dto.response;

public class ServiceOrderResponse {
    private Long id;
    private Long dealerId;
    private String vehicleName;
    private String modelName;
    private String variant;
    private String color;
    private String dealerName;
    private Long managerId;
    private String description;
    private String status;
    private String lastUpdated;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getDealerId() { return dealerId; }
    public void setDealerId(Long dealerId) { this.dealerId = dealerId; }
    public String getVehicleName() { return vehicleName; }
    public void setVehicleName(String vehicleName) { this.vehicleName = vehicleName; }
    public String getDealerName() { return dealerName; }
    public void setDealerName(String dealerName) { this.dealerName = dealerName; }
    public Long getManagerId() { return managerId; }
    public void setManagerId(Long managerId) { this.managerId = managerId; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getLastUpdated() { return lastUpdated; }
    public void setLastUpdated(String lastUpdated) { this.lastUpdated = lastUpdated; }
    public String getModelName() { return modelName; }
    public void setModelName(String modelName) { this.modelName = modelName; }
    public String getVariant() { return variant; }
    public void setVariant(String variant) { this.variant = variant; }
    public String getColor() { return color; }
    public void setColor(String color) { this.color = color; }

    private Integer estimatedWaitTimeMinutes;
    public Integer getEstimatedWaitTimeMinutes() { return estimatedWaitTimeMinutes; }
    public void setEstimatedWaitTimeMinutes(Integer estimatedWaitTimeMinutes) { this.estimatedWaitTimeMinutes = estimatedWaitTimeMinutes; }

    private Long version;
    public Long getVersion() { return version; }
    public void setVersion(Long version) { this.version = version; }
}
