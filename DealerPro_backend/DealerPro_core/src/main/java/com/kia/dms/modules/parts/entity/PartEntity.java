package com.kia.dms.modules.parts.entity;

import com.kia.dms.audit.BaseEntity;
import com.kia.dms.modules.dealer.entity.DealerEntity;
import com.kia.dms.modules.user.entity.ManagerEntity;
import jakarta.persistence.*;
import java.math.BigDecimal;

@Entity
@Table(name = "parts")
public class PartEntity extends BaseEntity {

    @Column(length = 100)
    private String name;

    @Column(precision = 10, scale = 2)
    private BigDecimal price;

    private Integer stock;

    @Column(length = 100)
    private String supplier;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "dealer_id")
    private DealerEntity dealer;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "manager_id")
    private ManagerEntity manager;

    @Column(length = 50)
    private String status;

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public BigDecimal getPrice() { return price; }
    public void setPrice(BigDecimal price) { this.price = price; }
    public Integer getStock() { return stock; }
    public void setStock(Integer stock) { this.stock = stock; }
    public String getSupplier() { return supplier; }
    public void setSupplier(String supplier) { this.supplier = supplier; }
    public DealerEntity getDealer() { return dealer; }
    public void setDealer(DealerEntity dealer) { this.dealer = dealer; }
    public ManagerEntity getManager() { return manager; }
    public void setManager(ManagerEntity manager) { this.manager = manager; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
}
