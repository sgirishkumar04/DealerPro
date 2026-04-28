package com.kia.dms.modules.service.entity;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.kia.dms.audit.BaseEntity;
import com.kia.dms.modules.dealer.entity.DealerEntity;
import com.kia.dms.modules.vehicle.entity.VehicleEntity;
import jakarta.persistence.*;

@Entity
@Table(name = "service_orders")
public class ServiceOrderEntity extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "dealer_id", nullable = false)
    private DealerEntity dealer;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "vehicle_id", nullable = false)
    private VehicleEntity vehicle;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(length = 50)
    private String status;

    public DealerEntity getDealer() { return dealer; }
    public void setDealer(DealerEntity dealer) { this.dealer = dealer; }
    public VehicleEntity getVehicle() { return vehicle; }
    public void setVehicle(VehicleEntity vehicle) { this.vehicle = vehicle; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    
    // Helper method to get manager through dealer
    public com.kia.dms.modules.user.entity.ManagerEntity getManager() { 
        return dealer != null ? dealer.getManager() : null; 
    }

    @JsonProperty("vehicleName")
    public String getVehicleName() {
        return vehicle != null ? vehicle.getName() + " " + vehicle.getModel() : null;
    }

    @JsonProperty("dealerName")
    public String getDealerName() {
        return dealer != null ? dealer.getName() : null;
    }

    @Transient
    public Integer getEstimatedWaitTimeMinutes() {
        if (status == null) return 0;
        String s = status.toUpperCase();
        if (s.contains("COMPLETED") || s.contains("DELIVERED")) return 0;
        if (s.contains("PROGRESS") || s.contains("WORKING")) return 30;
        if (s.contains("PENDING") || s.contains("NEW")) return 60;
        return 15; // Default for other active states
    }
}
