package com.kia.dms.modules.vehicle.entity;

import com.kia.dms.audit.BaseEntity;
import jakarta.persistence.*;
import java.math.BigDecimal;

@Entity
@Table(name = "vehicles")
public class VehicleEntity extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "kia_id")
    private KiaCarEntity kiaCar;

    @Column(precision = 10, scale = 2)
    private BigDecimal price;

    @Column(length = 50)
    private String category;

    public KiaCarEntity getKiaCar() { return kiaCar; }
    public void setKiaCar(KiaCarEntity kiaCar) { this.kiaCar = kiaCar; }
    public BigDecimal getPrice() { return price; }
    public void setPrice(BigDecimal price) { this.price = price; }
    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    // Delegates for model/variant/color information from KiaCar
    public String getName() { 
        return kiaCar != null ? kiaCar.getDisplayName() : "Unknown Vehicle"; 
    }
    public String getModel() { 
        return kiaCar != null ? kiaCar.getModelName() : "Unknown"; 
    }
    public String getVariant() {
        return kiaCar != null ? kiaCar.getVariant() : "—";
    }
    public String getColor() {
        return kiaCar != null ? kiaCar.getColor() : "—";
    }
}
