package com.kia.dms.modules.inventory.dto.response;
public class InventoryResponse {
    private Long id;
    private Long vehicleId;
    private Long kiaCarId;
    private String vehicleName;    // model name e.g. "EV6"
    private String vehicleVariant; // e.g. "GT-Line AWD"
    private String vehicleColor;   // e.g. "Glacier White Pearl"
    private String vehicleModel;
    private Long dealerId;
    private String dealerName;
    private Long managerId;
    private Integer quantity;
    private String status;
    private String lastUpdated;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getVehicleId() { return vehicleId; }
    public void setVehicleId(Long vehicleId) { this.vehicleId = vehicleId; }
    public Long getKiaCarId() { return kiaCarId; }
    public void setKiaCarId(Long kiaCarId) { this.kiaCarId = kiaCarId; }
    public String getVehicleName() { return vehicleName; }
    public void setVehicleName(String vehicleName) { this.vehicleName = vehicleName; }
    public String getVehicleVariant() { return vehicleVariant; }
    public void setVehicleVariant(String vehicleVariant) { this.vehicleVariant = vehicleVariant; }
    public String getVehicleColor() { return vehicleColor; }
    public void setVehicleColor(String vehicleColor) { this.vehicleColor = vehicleColor; }
    public String getVehicleModel() { return vehicleModel; }
    public void setVehicleModel(String vehicleModel) { this.vehicleModel = vehicleModel; }
    public Long getDealerId() { return dealerId; }
    public void setDealerId(Long dealerId) { this.dealerId = dealerId; }
    public String getDealerName() { return dealerName; }
    public void setDealerName(String dealerName) { this.dealerName = dealerName; }
    public Long getManagerId() { return managerId; }
    public void setManagerId(Long managerId) { this.managerId = managerId; }
    public Integer getQuantity() { return quantity; }
    public void setQuantity(Integer quantity) { this.quantity = quantity; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getLastUpdated() { return lastUpdated; }
    public void setLastUpdated(String lastUpdated) { this.lastUpdated = lastUpdated; }

    private Long version;
    public Long getVersion() { return version; }
    public void setVersion(Long version) { this.version = version; }
}
