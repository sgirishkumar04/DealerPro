package com.kia.dms.scheduler;

import com.kia.dms.modules.analytics.entity.DealerPerformanceEntity;
import com.kia.dms.modules.dealer.entity.DealerEntity;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;

@Component
public class AnalyticsScheduler {

    private static final Logger log = LoggerFactory.getLogger(AnalyticsScheduler.class);

    @PersistenceContext
    private EntityManager entityManager;

    @Scheduled(cron = "0 0 2 * * *")
    @Transactional
    public void aggregateDealerPerformance() {
        log.info("Starting daily dealer performance aggregation...");
        
        List<DealerEntity> dealers = entityManager.createQuery("SELECT d FROM DealerEntity d", DealerEntity.class)
                .getResultList();
                
        for (DealerEntity dealer : dealers) {
            Long dealerId = dealer.getId();
            
            // 1. Aggregate Sales & Revenue
            Object[] salesStats = (Object[]) entityManager.createQuery(
                "SELECT SUM(o.quantity), SUM(o.totalPrice) FROM OrderEntity o WHERE o.dealer.id = :dealerId AND o.status = 'COMPLETED'")
                .setParameter("dealerId", dealerId)
                .getSingleResult();
                
            Long totalSalesObj = (Long) salesStats[0];
            BigDecimal totalRevenueObj = (BigDecimal) salesStats[1];
            
            int salesCount = totalSalesObj != null ? totalSalesObj.intValue() : 0;
            BigDecimal revenue = totalRevenueObj != null ? totalRevenueObj : BigDecimal.ZERO;
            
            // 2. Aggregate Leads
            Long totalLeads = entityManager.createQuery(
                "SELECT COUNT(l) FROM LeadEntity l WHERE l.dealer.id = :dealerId", Long.class)
                .setParameter("dealerId", dealerId)
                .getSingleResult();
                
            Long convertedLeads = entityManager.createQuery(
                "SELECT COUNT(l) FROM LeadEntity l WHERE l.dealer.id = :dealerId AND l.status = 'CONVERTED'", Long.class)
                .setParameter("dealerId", dealerId)
                .getSingleResult();
                
            BigDecimal conversionRate = BigDecimal.ZERO;
            if (totalLeads > 0) {
                conversionRate = new BigDecimal(convertedLeads)
                        .divide(new BigDecimal(totalLeads), 4, RoundingMode.HALF_UP)
                        .multiply(new BigDecimal(100)); // Percentage
            }
            
            // 3. Calculate Score
            int score = (salesCount * 10) + conversionRate.intValue();
            
            // 4. Save to DealerPerformanceEntity
            DealerPerformanceEntity performance = new DealerPerformanceEntity();
            performance.setDealer(dealer);
            performance.setSalesCount(salesCount);
            performance.setRevenue(revenue);
            performance.setConversionRate(conversionRate);
            performance.setScore(score);
            
            entityManager.persist(performance);
            log.info("Aggregated stats for dealer {}: Sales={}, Revenue={}, ConvRate={}, Score={}", 
                     dealerId, salesCount, revenue, conversionRate, score);
        }
        
        log.info("Finished daily dealer performance aggregation.");
    }
}
