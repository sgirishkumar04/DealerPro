package com.kia.dms.modules.sales.entity;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.kia.dms.audit.BaseEntity;
import com.kia.dms.modules.dealer.entity.DealerEntity;
import com.kia.dms.modules.vehicle.entity.VehicleEntity;
import jakarta.persistence.*;
import java.math.BigDecimal;

@Entity
@Table(name = "orders")
public class OrderEntity extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "dealer_id", nullable = false)
    private DealerEntity dealer;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "vehicle_id", nullable = false)
    private VehicleEntity vehicle;

    private Integer quantity;

    @Column(name = "total_price", precision = 12, scale = 2)
    private BigDecimal totalPrice;

    @Column(length = 50)
    private String status;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "manager_id")
    private com.kia.dms.modules.user.entity.ManagerEntity manager;

    public DealerEntity getDealer() { return dealer; }
    public void setDealer(DealerEntity dealer) { this.dealer = dealer; }
    public VehicleEntity getVehicle() { return vehicle; }
    public void setVehicle(VehicleEntity vehicle) { this.vehicle = vehicle; }
    public Integer getQuantity() { return quantity; }
    public void setQuantity(Integer quantity) { this.quantity = quantity; }
    public BigDecimal getTotalPrice() { return totalPrice; }
    public void setTotalPrice(BigDecimal totalPrice) { this.totalPrice = totalPrice; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public com.kia.dms.modules.user.entity.ManagerEntity getManager() { return manager; }
    public void setManager(com.kia.dms.modules.user.entity.ManagerEntity manager) { this.manager = manager; }

    @JsonProperty("vehicleName")
    public String getVehicleName() {
        return vehicle != null ? vehicle.getName() + " " + vehicle.getModel() : null;
    }

    @JsonProperty("dealerName")
    public String getDealerName() {
        return dealer != null ? dealer.getName() : null;
    }

    @Transient
    public BigDecimal getEstimatedMargin() {
        if (totalPrice == null || vehicle == null || quantity == null) {
            return BigDecimal.ZERO;
        }
        
        // Use vehicle price as base cost. If null, use a default 85% of total as cost
        BigDecimal costPerUnit = vehicle.getPrice();
        if (costPerUnit == null) {
            return totalPrice.multiply(new BigDecimal("0.15")); // 15% margin as fallback
        }
        
        BigDecimal totalCost = costPerUnit.multiply(new BigDecimal(quantity));
        return totalPrice.subtract(totalCost);
    }
}
