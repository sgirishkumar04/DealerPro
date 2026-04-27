package com.kia.dms.modules.leads.dto.request;

import java.time.LocalDateTime;

public class TestDriveRequest {
    private Long leadId;
    private Long vehicleId;
    private LocalDateTime scheduledAt;

    public Long getLeadId() { return leadId; }
    public void setLeadId(Long leadId) { this.leadId = leadId; }
    public Long getVehicleId() { return vehicleId; }
    public void setVehicleId(Long vehicleId) { this.vehicleId = vehicleId; }
    public LocalDateTime getScheduledAt() { return scheduledAt; }
    public void setScheduledAt(LocalDateTime scheduledAt) { this.scheduledAt = scheduledAt; }
}
