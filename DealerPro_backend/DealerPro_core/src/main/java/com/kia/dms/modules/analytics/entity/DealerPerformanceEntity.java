package com.kia.dms.modules.analytics.entity;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.kia.dms.audit.BaseEntity;
import com.kia.dms.modules.dealer.entity.DealerEntity;
import jakarta.persistence.*;
import java.math.BigDecimal;

@Entity
@Table(name = "dealer_performance")
public class DealerPerformanceEntity extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "dealer_id", nullable = false)
    private DealerEntity dealer;

    @Column(name = "sales_count")
    private Integer salesCount;

    @Column(precision = 12, scale = 2)
    private BigDecimal revenue;

    @Column(name = "conversion_rate", precision = 5, scale = 2)
    private BigDecimal conversionRate;

    private Integer score;

    public DealerEntity getDealer() { return dealer; }
    public void setDealer(DealerEntity dealer) { this.dealer = dealer; }
    public Integer getSalesCount() { return salesCount; }
    public void setSalesCount(Integer salesCount) { this.salesCount = salesCount; }
    public BigDecimal getRevenue() { return revenue; }
    public void setRevenue(BigDecimal revenue) { this.revenue = revenue; }
    public BigDecimal getConversionRate() { return conversionRate; }
    public void setConversionRate(BigDecimal conversionRate) { this.conversionRate = conversionRate; }
    public Integer getScore() { return score; }
    public void setScore(Integer score) { this.score = score; }

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
