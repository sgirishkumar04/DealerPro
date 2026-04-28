package com.kia.dms.modules.analytics.service.impl;

import com.kia.dms.common.response.PaginationResponse;
import com.kia.dms.exception.ResourceNotFoundException;
import com.kia.dms.modules.analytics.dto.response.AnalyticsSummaryResponse;
import com.kia.dms.modules.analytics.dto.response.ConversionSplitResponse;
import com.kia.dms.modules.analytics.dto.response.DealerPerformanceResponse;
import com.kia.dms.modules.analytics.dto.response.MonthlyDataResponse;
import com.kia.dms.modules.analytics.service.AnalyticsService;
import com.kia.dms.modules.finance.entity.TransactionEntity;
import com.kia.dms.modules.finance.repository.TransactionRepository;
import com.kia.dms.modules.inventory.repository.InventoryRepository;
import com.kia.dms.modules.leads.repository.LeadRepository;
import com.kia.dms.modules.user.entity.UserEntity;
import com.kia.dms.modules.user.repository.UserRepository;
import jakarta.persistence.EntityManager;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Pageable;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.TextStyle;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class AnalyticsServiceImpl implements AnalyticsService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private EntityManager entityManager;

    @Autowired
    private TransactionRepository transactionRepository;

    @Autowired
    private LeadRepository leadRepository;

    @Autowired
    private InventoryRepository inventoryRepository;

    @Override
    public PaginationResponse<DealerPerformanceResponse> getDealerPerformance(Long dealerId, LocalDateTime startDate, LocalDateTime endDate, Pageable pageable) {
        UserEntity currentUser = getCurrentUser();
        String role = currentUser.getRole().getName();
        
        StringBuilder sql = new StringBuilder();
        sql.append("SELECT ");
        sql.append("  d.id, ");
        sql.append("  d.name, ");
        sql.append("  d.manager_id, ");
        sql.append("  COUNT(DISTINCT o.id), ");
        sql.append("  COALESCE(SUM(o.total_price), 0), ");
        sql.append("  CASE ");
        sql.append("    WHEN COUNT(DISTINCT l.id) > 0 THEN ");
        sql.append("      ROUND((CAST(COUNT(DISTINCT o.id) AS REAL) / CAST(COUNT(DISTINCT l.id) AS REAL)) * 100, 2) ");
        sql.append("    ELSE 0.0 ");
        sql.append("  END, ");
        sql.append("  50 ");
        sql.append("FROM dealers d ");
        sql.append("LEFT JOIN orders o ON d.id = o.dealer_id AND o.status = 'DELIVERED' ");
        sql.append("LEFT JOIN leads l ON d.id = l.dealer_id ");
        sql.append("WHERE 1=1 ");
        
        if (role.equalsIgnoreCase("ROLE_DEALER")) {
            sql.append("AND d.id = ").append(currentUser.getDealer().getId()).append(" ");
        } else if (role.equalsIgnoreCase("ROLE_MANAGER")) {
            sql.append("AND d.manager_id = ").append(currentUser.getManagerProfile().getId()).append(" ");
        } else if (dealerId != null) {
            sql.append("AND d.id = ").append(dealerId).append(" ");
        }
        
        sql.append("GROUP BY d.id, d.name, d.manager_id ");
        sql.append("ORDER BY COALESCE(SUM(o.total_price), 0) DESC ");
        sql.append("LIMIT ").append(pageable.getPageSize()).append(" ");
        sql.append("OFFSET ").append(pageable.getOffset());
        
        @SuppressWarnings("unchecked")
        List<Object[]> results = entityManager.createNativeQuery(sql.toString()).getResultList();
        
        List<DealerPerformanceResponse> content = results.stream()
                .map(row -> {
                    DealerPerformanceResponse res = new DealerPerformanceResponse();
                    res.setId(((Number) row[0]).longValue());
                    res.setDealerId(((Number) row[0]).longValue());
                    res.setDealerName((String) row[1]);
                    res.setManagerId(row[2] != null ? ((Number) row[2]).longValue() : null);
                    res.setSalesCount(((Number) row[3]).intValue());
                    
                    Object revenueObj = row[4];
                    BigDecimal revenue = BigDecimal.ZERO;
                    if (revenueObj instanceof BigDecimal bd) {
                        revenue = bd;
                    } else if (revenueObj instanceof Number num) {
                        revenue = BigDecimal.valueOf(num.doubleValue());
                    }
                    res.setRevenue(revenue);
                    
                    Object convObj = row[5];
                    BigDecimal convRate = BigDecimal.ZERO;
                    if (convObj instanceof BigDecimal bd) {
                        convRate = bd;
                    } else if (convObj instanceof Number num) {
                        convRate = BigDecimal.valueOf(num.doubleValue());
                    }
                    res.setConversionRate(convRate);
                    
                    res.setScore(((Number) row[6]).intValue());
                    res.setCreatedAt(LocalDateTime.now());
                    return res;
                })
                .toList();
        
        long total = content.size();
        
        return new PaginationResponse<>(content, pageable.getPageNumber(), pageable.getPageSize(), total, (int) Math.ceil((double) total / pageable.getPageSize()));
    }

    private UserEntity getCurrentUser() {
        String email = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByEmailWithRole(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }

    @Override
    public PaginationResponse<DealerPerformanceResponse> getMyPerformance(String email, Pageable pageable) {
        UserEntity user = userRepository.findByEmailWithRole(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        
        if (user.getRole().getName().equalsIgnoreCase("ROLE_DEALER")) {
            return getDealerPerformance(user.getDealer().getId(), null, null, pageable);
        } else if (user.getRole().getName().equalsIgnoreCase("ROLE_MANAGER")) {
            return getDealerPerformance(null, null, null, pageable);
        }
        
        return getDealerPerformance(null, null, null, pageable);
    }

    @Override
    @Cacheable(value = "analytics", key = "'summary-' + #email")
    public AnalyticsSummaryResponse getAnalyticsSummary(String email) {
        UserEntity user = userRepository.findByEmailWithRole(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        
        String role = user.getRole().getName();
        boolean isAdmin = role.equals("ROLE_ADMIN");
        boolean isManager = role.equals("ROLE_MANAGER");
        boolean isDealer = role.equals("ROLE_DEALER");
        
        Long dealerId = user.getDealer() != null ? user.getDealer().getId() : null;
        Long managerId = user.getManagerProfile() != null ? user.getManagerProfile().getId() : null;
        
        if (!isAdmin && !isManager && !isDealer) {
            return new AnalyticsSummaryResponse();
        }

        StringBuilder salesHql = new StringBuilder("SELECT SUM(o.quantity), SUM(o.totalPrice) FROM OrderEntity o WHERE (o.status = 'DELIVERED' OR o.status = 'COMPLETED')");
        if (isManager) salesHql.append(" AND o.manager.id = :managerId");
        else if (isDealer) salesHql.append(" AND o.dealer.id = :dealerId");
        
        var salesQuery = entityManager.createQuery(salesHql.toString());
        if (isManager) salesQuery.setParameter("managerId", managerId);
        else if (isDealer) salesQuery.setParameter("dealerId", dealerId);
        
        Object[] salesStats = (Object[]) salesQuery.getSingleResult();
        Long totalSales = salesStats[0] != null ? ((Number) salesStats[0]).longValue() : 0L;
        BigDecimal totalRevenue = salesStats[1] != null ? (BigDecimal) salesStats[1] : BigDecimal.ZERO;

        StringBuilder leadsHql = new StringBuilder("SELECT COUNT(l) FROM LeadEntity l WHERE l.status != 'CONVERTED'");
        if (isManager) leadsHql.append(" AND l.manager.id = :managerId");
        else if (isDealer) leadsHql.append(" AND l.dealer.id = :dealerId");
        
        var leadsQuery = entityManager.createQuery(leadsHql.toString(), Long.class);
        if (isManager) leadsQuery.setParameter("managerId", managerId);
        else if (isDealer) leadsQuery.setParameter("dealerId", dealerId);
        Long activeLeads = leadsQuery.getSingleResult();

        StringBuilder serviceHql = new StringBuilder("SELECT COUNT(s) FROM ServiceOrderEntity s WHERE (s.status = 'IN_PROGRESS' OR s.status = 'PENDING')");
        if (isManager) serviceHql.append(" AND s.manager.id = :managerId");
        else if (isDealer) serviceHql.append(" AND s.dealer.id = :dealerId");
        
        var serviceQuery = entityManager.createQuery(serviceHql.toString(), Long.class);
        if (isManager) serviceQuery.setParameter("managerId", managerId);
        else if (isDealer) serviceQuery.setParameter("dealerId", dealerId);
        Long serviceJobs = serviceQuery.getSingleResult();

        AnalyticsSummaryResponse summary = new AnalyticsSummaryResponse();
        summary.setTotalSales(totalSales);
        summary.setTotalRevenue(totalRevenue);
        summary.setActiveLeads(activeLeads != null ? activeLeads : 0L);
        summary.setServiceJobs(serviceJobs != null ? serviceJobs : 0L);
        
        return summary;
    }


    @Override
    public List<ConversionSplitResponse> getConversionSplit(String email) {
        UserEntity user = userRepository.findByEmailWithRole(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        
        String role = user.getRole().getName();
        boolean isManager = role.equals("ROLE_MANAGER");
        boolean isDealer = role.equals("ROLE_DEALER");
        
        Long dealerId = user.getDealer() != null ? user.getDealer().getId() : null;
        Long managerId = user.getManagerProfile() != null ? user.getManagerProfile().getId() : null;
        
        StringBuilder hql = new StringBuilder("SELECT l.status, COUNT(l) FROM LeadEntity l WHERE 1=1");
        if (isManager) hql.append(" AND l.manager.id = :managerId");
        else if (isDealer) hql.append(" AND l.dealer.id = :dealerId");
        hql.append(" GROUP BY l.status");
        
        var query = entityManager.createQuery(hql.toString());
        if (isManager) query.setParameter("managerId", managerId);
        else if (isDealer) query.setParameter("dealerId", dealerId);
        
        @SuppressWarnings("unchecked")
        List<Object[]> results = query.getResultList();
        List<ConversionSplitResponse> responseList = results.stream()
                .map(row -> {
                    ConversionSplitResponse response = new ConversionSplitResponse();
                    response.setStatus((String) row[0]);
                    response.setCount(((Number) row[1]).longValue());
                    return response;
                })
                .toList();
        return responseList;
    }

    @Override
    @Cacheable(value = "analytics", key = "'monthly-' + #email")
    public List<MonthlyDataResponse> getMonthlySalesData(String email) {
        UserEntity user = userRepository.findByEmailWithRole(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        
        String role = user.getRole().getName();
        boolean isManager = role.equals("ROLE_MANAGER");
        boolean isDealer = role.equals("ROLE_DEALER");
        
        Long dealerId = user.getDealer() != null ? user.getDealer().getId() : null;
        Long managerId = user.getManagerProfile() != null ? user.getManagerProfile().getId() : null;
        
        StringBuilder sql = new StringBuilder();
        sql.append("SELECT ");
        sql.append("  strftime('%Y-%m', o.created_at) as month, ");
        sql.append("  SUM(o.quantity) as total_sales, ");
        sql.append("  SUM(o.total_price) as total_revenue ");
        sql.append("FROM orders o ");
        sql.append("WHERE o.is_deleted = 0 ");
        sql.append("  AND (o.status = 'DELIVERED' OR o.status = 'COMPLETED') ");
        sql.append("  AND o.created_at >= datetime('now', '-6 months') ");
        
        if (isManager) {
            sql.append("  AND o.manager_id = ").append(managerId).append(" ");
        } else if (isDealer) {
            sql.append("  AND o.dealer_id = ").append(dealerId).append(" ");
        }
        
        sql.append("GROUP BY strftime('%Y-%m', o.created_at) ");
        sql.append("ORDER BY month ASC");
        
        @SuppressWarnings("unchecked")
        List<Object[]> results = entityManager.createNativeQuery(sql.toString()).getResultList();
        
        List<MonthlyDataResponse> monthlyData = new ArrayList<>();
        
        for (Object[] row : results) {
            String yearMonth = (String) row[0];
            Integer sales = row[1] != null ? ((Number) row[1]).intValue() : 0;
            
            BigDecimal revenue = BigDecimal.ZERO;
            if (row[2] != null) {
                if (row[2] instanceof BigDecimal bd) {
                    revenue = bd;
                } else if (row[2] instanceof Number num) {
                    revenue = BigDecimal.valueOf(num.doubleValue());
                }
            }
            
            String[] parts = yearMonth.split("-");
            int month = Integer.parseInt(parts[1]);
            String monthName = java.time.Month.of(month).getDisplayName(TextStyle.SHORT, Locale.ENGLISH);
            
            MonthlyDataResponse response = new MonthlyDataResponse(monthName, sales, revenue);
            monthlyData.add(response);
        }
        
        return monthlyData;
    }

    @Override
    public Map<String, Object> getDashboardData() {
        Map<String, Object> dashboard = new HashMap<>();
        
        List<TransactionEntity> allTx = transactionRepository.findAll();
        BigDecimal totalRevenue = allTx.stream()
                .filter(t -> "CREDIT".equals(t.getType()))
                .map(t -> t.getAmount() != null ? t.getAmount() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        
        long activeLeads = leadRepository.countByIsDeletedFalse();
        long stockCount = inventoryRepository.count();

        Map<String, Object> kpis = new HashMap<>();
        kpis.put("totalRevenue", totalRevenue);
        kpis.put("activeLeads", activeLeads);
        kpis.put("stockCount", stockCount);
        dashboard.put("kpis", kpis);

        Map<String, BigDecimal> monthlyRevenue = allTx.stream()
                .filter(t -> "CREDIT".equals(t.getType()) && t.getCreatedAt() != null)
                .collect(Collectors.groupingBy(
                    t -> t.getCreatedAt().getMonth().getDisplayName(TextStyle.SHORT, Locale.ENGLISH),
                    Collectors.reducing(BigDecimal.ZERO, t -> t.getAmount() != null ? t.getAmount() : BigDecimal.ZERO, BigDecimal::add)
                ));

        Map<String, Long> monthlySalesCount = allTx.stream()
                .filter(t -> "CREDIT".equals(t.getType()) && t.getCreatedAt() != null)
                .collect(Collectors.groupingBy(
                    t -> t.getCreatedAt().getMonth().getDisplayName(TextStyle.SHORT, Locale.ENGLISH),
                    Collectors.counting()
                ));

        List<Map<String, Object>> salesChart = monthlyRevenue.entrySet().stream()
                .map(e -> {
                    Map<String, Object> m = new HashMap<>();
                    m.put("name", e.getKey());
                    m.put("revenue", e.getValue());
                    m.put("sales", monthlySalesCount.getOrDefault(e.getKey(), 0L));
                    return m;
                }).collect(Collectors.toList());
        dashboard.put("monthlySales", salesChart);

        Map<String, Long> leadDist = leadRepository.findAll().stream()
                .filter(l -> l.getIsDeleted() != null && !l.getIsDeleted())
                .collect(Collectors.groupingBy(l -> l.getStatus() != null ? l.getStatus() : "NEW", Collectors.counting()));
        
        List<Map<String, Object>> leadChart = leadDist.entrySet().stream()
                .map(e -> {
                    Map<String, Object> m = new HashMap<>();
                    m.put("name", e.getKey());
                    m.put("value", e.getValue());
                    return m;
                })
                .collect(Collectors.toList());
        dashboard.put("leadStatus", leadChart);

        return dashboard;
    }
}
