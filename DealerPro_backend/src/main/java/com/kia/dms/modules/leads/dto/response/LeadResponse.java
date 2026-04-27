package com.kia.dms.modules.leads.dto.response;

public class LeadResponse {
    private Long id;
    private String firstName;
    private String lastName;
    private String email;
    private String phone;
    private String vehicleInterest;
    private String status;
    private String notes;
    private Long dealerId;
    private String dealerName;
    private Long managerId;
    private String lastUpdated;
    private Long kiaCarId;
    private String modelName;
    private String variant;
    private String color;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getFirstName() { return firstName; }
    public void setFirstName(String firstName) { this.firstName = firstName; }
    public String getLastName() { return lastName; }
    public void setLastName(String lastName) { this.lastName = lastName; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }
    public String getVehicleInterest() { return vehicleInterest; }
    public void setVehicleInterest(String vehicleInterest) { this.vehicleInterest = vehicleInterest; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
    public Long getDealerId() { return dealerId; }
    public void setDealerId(Long dealerId) { this.dealerId = dealerId; }
    public String getDealerName() { return dealerName; }
    public void setDealerName(String dealerName) { this.dealerName = dealerName; }
    public Long getManagerId() { return managerId; }
    public void setManagerId(Long managerId) { this.managerId = managerId; }
    public String getLastUpdated() { return lastUpdated; }
    public void setLastUpdated(String lastUpdated) { this.lastUpdated = lastUpdated; }
    public Long getKiaCarId() { return kiaCarId; }
    public void setKiaCarId(Long kiaCarId) { this.kiaCarId = kiaCarId; }
    public String getModelName() { return modelName; }
    public void setModelName(String modelName) { this.modelName = modelName; }
    public String getVariant() { return variant; }
    public void setVariant(String variant) { this.variant = variant; }
    public String getColor() { return color; }
    public void setColor(String color) { this.color = color; }

    private Integer leadScore;
    public Integer getLeadScore() { return leadScore; }
    public void setLeadScore(Integer leadScore) { this.leadScore = leadScore; }

    private Long version;
    public Long getVersion() { return version; }
    public void setVersion(Long version) { this.version = version; }
}
