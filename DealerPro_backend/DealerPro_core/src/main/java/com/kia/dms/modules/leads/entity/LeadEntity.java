package com.kia.dms.modules.leads.entity;

import com.kia.dms.audit.BaseEntity;
import com.kia.dms.modules.dealer.entity.DealerEntity;
import com.kia.dms.common.specification.EncryptionConverter;
import jakarta.persistence.*;

@Entity
@Table(name = "leads")
public class LeadEntity extends BaseEntity {

    @Column(name = "first_name", length = 50)
    private String firstName;

    @Column(name = "last_name", length = 50)
    private String lastName;

    @Convert(converter = EncryptionConverter.class)
    @Column(length = 100)
    private String email;

    @Convert(converter = EncryptionConverter.class)
    @Column(length = 20)
    private String phone;

    @Column(name = "vehicle_interest", length = 100)
    private String vehicleInterest;

    @Column(length = 50)
    private String status;

    @Convert(converter = EncryptionConverter.class)
    @Column(columnDefinition = "TEXT")
    private String notes;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "dealer_id", nullable = false)
    private DealerEntity dealer;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "kia_car_id")
    private com.kia.dms.modules.vehicle.entity.KiaCarEntity kiaCar;

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
    public DealerEntity getDealer() { return dealer; }
    public void setDealer(DealerEntity dealer) { this.dealer = dealer; }
    public com.kia.dms.modules.vehicle.entity.KiaCarEntity getKiaCar() { return kiaCar; }
    public void setKiaCar(com.kia.dms.modules.vehicle.entity.KiaCarEntity kiaCar) { this.kiaCar = kiaCar; }
    
    // Helper method to get manager through dealer
    public com.kia.dms.modules.user.entity.ManagerEntity getManager() { 
        return dealer != null ? dealer.getManager() : null; 
    }

    @Transient
    public Integer getLeadScore() {
        int score = 0;
        
        // Status weightage
        if ("NEW".equalsIgnoreCase(status)) score += 20;
        else if ("CONTACTED".equalsIgnoreCase(status)) score += 50;
        else if ("QUALIFIED".equalsIgnoreCase(status)) score += 80;
        else if ("CONVERTED".equalsIgnoreCase(status)) score += 100;
        else if ("LOST".equalsIgnoreCase(status)) return 0;

        // Bonus for having notes
        if (notes != null && notes.length() > 10) score += 10;
        
        // Bonus for vehicle interest
        if (vehicleInterest != null && !vehicleInterest.isEmpty()) score += 10;

        return Math.min(score, 100);
    }
}
