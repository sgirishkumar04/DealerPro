package com.kia.dms.modules.vehicle.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "kia_cars")
public class KiaCarEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "model_name", length = 100, nullable = false)
    private String modelName;

    @Column(length = 100, nullable = false)
    private String variant;

    @Column(length = 60, nullable = false)
    private String color;

    @Column(length = 50, nullable = false)
    private String category; // ELECTRIC, SUV, SEDAN, HATCHBACK, MPV

    @Column(precision = 12, scale = 2, nullable = false)
    private BigDecimal price;

    @Column(name = "fuel_type", length = 30)
    private String fuelType; // ELECTRIC, PETROL, DIESEL, HYBRID

    @Column(name = "seating_capacity")
    private Integer seatingCapacity;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }

    // ---- Convenience label ----
    @Transient
    public String getDisplayName() {
        return modelName + " " + variant + " (" + color + ")";
    }

    // Getters & Setters
    public Long getId() { return id; }
    public String getModelName() { return modelName; }
    public void setModelName(String modelName) { this.modelName = modelName; }
    public String getVariant() { return variant; }
    public void setVariant(String variant) { this.variant = variant; }
    public String getColor() { return color; }
    public void setColor(String color) { this.color = color; }
    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }
    public BigDecimal getPrice() { return price; }
    public void setPrice(BigDecimal price) { this.price = price; }
    public String getFuelType() { return fuelType; }
    public void setFuelType(String fuelType) { this.fuelType = fuelType; }
    public Integer getSeatingCapacity() { return seatingCapacity; }
    public void setSeatingCapacity(Integer seatingCapacity) { this.seatingCapacity = seatingCapacity; }
    public LocalDateTime getCreatedAt() { return createdAt; }
}
