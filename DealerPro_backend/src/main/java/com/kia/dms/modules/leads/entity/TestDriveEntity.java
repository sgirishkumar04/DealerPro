package com.kia.dms.modules.leads.entity;

import com.kia.dms.audit.BaseEntity;
import com.kia.dms.config.LocalDateTimeConverter;
import com.kia.dms.modules.user.entity.ManagerEntity;
import com.kia.dms.modules.vehicle.entity.VehicleEntity;
import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "test_drives")
public class TestDriveEntity extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "lead_id", nullable = false)
    private LeadEntity lead;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "vehicle_id", nullable = false)
    private VehicleEntity vehicle;

    @Column(name = "scheduled_at", nullable = false)
    @Convert(converter = LocalDateTimeConverter.class)
    private LocalDateTime scheduledAt;

    @Column(length = 50)
    private String status; // PENDING, COMPLETED, CANCELLED

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "dealer_id")
    private com.kia.dms.modules.dealer.entity.DealerEntity dealer;

    public LeadEntity getLead() {
        return lead;
    }

    public void setLead(LeadEntity lead) {
        this.lead = lead;
    }

    public VehicleEntity getVehicle() {
        return vehicle;
    }

    public void setVehicle(VehicleEntity vehicle) {
        this.vehicle = vehicle;
    }

    public LocalDateTime getScheduledAt() {
        return scheduledAt;
    }

    public void setScheduledAt(LocalDateTime scheduledAt) {
        this.scheduledAt = scheduledAt;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public com.kia.dms.modules.dealer.entity.DealerEntity getDealer() {
        return dealer;
    }

    public void setDealer(com.kia.dms.modules.dealer.entity.DealerEntity dealer) {
        this.dealer = dealer;
    }
    
    // Helper method to get manager through dealer
    public ManagerEntity getManager() {
        return dealer != null ? dealer.getManager() : null;
    }
}