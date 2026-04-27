package com.kia.dms.modules.finance.entity;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.kia.dms.audit.BaseEntity;
import com.kia.dms.modules.dealer.entity.DealerEntity;
import jakarta.persistence.*;
import java.math.BigDecimal;

@Entity
@Table(name = "transactions")
public class TransactionEntity extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "dealer_id", nullable = false)
    private DealerEntity dealer;

    @Column(precision = 12, scale = 2)
    private BigDecimal amount;

    @Column(length = 50)
    private String type;

    @Convert(converter = com.kia.dms.common.specification.EncryptionConverter.class)
    @Column(length = 255)
    private String description;

    public DealerEntity getDealer() { return dealer; }
    public void setDealer(DealerEntity dealer) { this.dealer = dealer; }
    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }
    public String getType() { return type; }
    public void setType(String type) { this.type = type; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "manager_id")
    private com.kia.dms.modules.user.entity.ManagerEntity manager;

    public com.kia.dms.modules.user.entity.ManagerEntity getManager() { return manager; }
    public void setManager(com.kia.dms.modules.user.entity.ManagerEntity manager) { this.manager = manager; }

    @JsonProperty("dealerName")
    public String getDealerName() {
        return dealer != null ? dealer.getName() : null;
    }
}
