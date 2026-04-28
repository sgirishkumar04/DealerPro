package com.kia.dms.modules.parts.entity;

import com.kia.dms.audit.BaseEntity;
import jakarta.persistence.*;
import java.math.BigDecimal;

@Entity
@Table(name = "purchase_orders")
public class PurchaseOrderEntity extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "part_id", nullable = false)
    private PartEntity part;

    private Integer quantity;

    @Column(name = "total_cost", precision = 12, scale = 2)
    private BigDecimal totalCost;

    public PartEntity getPart() { return part; }
    public void setPart(PartEntity part) { this.part = part; }
    public Integer getQuantity() { return quantity; }
    public void setQuantity(Integer quantity) { this.quantity = quantity; }
    public BigDecimal getTotalCost() { return totalCost; }
    public void setTotalCost(BigDecimal totalCost) { this.totalCost = totalCost; }

    @Column(length = 255)
    private String justification;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "dealer_id")
    private com.kia.dms.modules.dealer.entity.DealerEntity dealer;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "manager_id")
    private com.kia.dms.modules.user.entity.ManagerEntity manager;

    public String getJustification() { return justification; }
    public void setJustification(String justification) { this.justification = justification; }
    public com.kia.dms.modules.dealer.entity.DealerEntity getDealer() { return dealer; }
    public void setDealer(com.kia.dms.modules.dealer.entity.DealerEntity dealer) { this.dealer = dealer; }
    public com.kia.dms.modules.user.entity.ManagerEntity getManager() { return manager; }
    public void setManager(com.kia.dms.modules.user.entity.ManagerEntity manager) { this.manager = manager; }
}
