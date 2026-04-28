package com.kia.dms.modules.inventory.entity;

import com.kia.dms.audit.BaseEntity;
import com.kia.dms.modules.vehicle.entity.VehicleEntity;
import com.kia.dms.modules.vehicle.entity.KiaCarEntity;
import com.kia.dms.modules.dealer.entity.DealerEntity;
import jakarta.persistence.*;

@Entity
@Table(name = "inventory")
public class InventoryEntity extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "vehicle_id", nullable = false)
    private VehicleEntity vehicle;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "kia_car_id")
    private KiaCarEntity kiaCar;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "dealer_id", nullable = false)
    private DealerEntity dealer;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "manager_id")
    private com.kia.dms.modules.user.entity.ManagerEntity manager;

    private Integer quantity;

    @Column(length = 50)
    private String status;

    public VehicleEntity getVehicle() { return vehicle; }
    public void setVehicle(VehicleEntity vehicle) { this.vehicle = vehicle; }
    public KiaCarEntity getKiaCar() { return kiaCar; }
    public void setKiaCar(KiaCarEntity kiaCar) { this.kiaCar = kiaCar; }
    public DealerEntity getDealer() { return dealer; }
    public void setDealer(DealerEntity dealer) { this.dealer = dealer; }
    public com.kia.dms.modules.user.entity.ManagerEntity getManager() { return manager; }
    public void setManager(com.kia.dms.modules.user.entity.ManagerEntity manager) { this.manager = manager; }
    public Integer getQuantity() { return quantity; }
    public void setQuantity(Integer quantity) { this.quantity = quantity; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    @Transient
    public String getStockStatus() {
        if (quantity == null || quantity == 0) return "OUT_OF_STOCK";
        if (quantity < 5) return "LOW_STOCK";
        return "IN_STOCK";
    }
}
