package com.kia.dms.modules.vehicle.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

public class VehicleRequest {
    private Long id;
    private Long kiaCarId;
    private String name;
    private String model;
    @NotNull
    private BigDecimal price;
    @NotBlank
    private String category;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getKiaCarId() { return kiaCarId; }
    public void setKiaCarId(Long kiaCarId) { this.kiaCarId = kiaCarId; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getModel() { return model; }
    public void setModel(String model) { this.model = model; }
    public BigDecimal getPrice() { return price; }
    public void setPrice(BigDecimal price) { this.price = price; }
    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }
}
