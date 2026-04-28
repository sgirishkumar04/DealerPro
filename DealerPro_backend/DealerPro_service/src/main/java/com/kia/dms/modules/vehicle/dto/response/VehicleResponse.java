package com.kia.dms.modules.vehicle.dto.response;

import java.math.BigDecimal;

public class VehicleResponse {
    private Long id;
    private Long kiaCarId;
    private String name;
    private String model;
    private String variant;
    private String color;
    private BigDecimal price;
    private String category;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getKiaCarId() { return kiaCarId; }
    public void setKiaCarId(Long kiaCarId) { this.kiaCarId = kiaCarId; }
    public String getVariant() { return variant; }
    public void setVariant(String variant) { this.variant = variant; }
    public String getColor() { return color; }
    public void setColor(String color) { this.color = color; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getModel() { return model; }
    public void setModel(String model) { this.model = model; }
    public BigDecimal getPrice() { return price; }
    public void setPrice(BigDecimal price) { this.price = price; }
    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }
    private String lastUpdated;
    public String getLastUpdated() { return lastUpdated; }
    public void setLastUpdated(String lastUpdated) { this.lastUpdated = lastUpdated; }
}
