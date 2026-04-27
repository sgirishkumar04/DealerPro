# Technical Documentation Part 6: Additional Advanced Features

## 1. Redis Caching

### Overview
DealerPro implements Redis-based caching to improve performance by storing frequently accessed data in memory.

**Location**: `DealerPro_backend/src/main/java/com/kia/dms/config/CacheConfig.java`

```java
@Configuration
@EnableCaching
public class CacheConfig {

    @Bean
    @Primary
    public CacheManager cacheManager(RedisConnectionFactory redisConnectionFactory) {
        RedisCacheConfiguration config = RedisCacheConfiguration.defaultCacheConfig()
                .entryTtl(Duration.ofMinutes(5)) // Default TTL: 5 minutes
                .serializeKeysWith(RedisSerializationContext.SerializationPair
                    .fromSerializer(new StringRedisSerializer()))
                .serializeValuesWith(RedisSerializationContext.SerializationPair
                    .fromSerializer(jsonRedisSerializer()))
                .disableCachingNullValues();

        return RedisCacheManager.builder(redisConnectionFactory)
                .cacheDefaults(config)
                .withCacheConfiguration("leads", config.entryTtl(Duration.ofMinutes(5)))
                .withCacheConfiguration("dealers", config.entryTtl(Duration.ofMinutes(10)))
                .withCacheConfiguration("vehicles", config.entryTtl(Duration.ofMinutes(15)))
                .withCacheConfiguration("parts", config.entryTtl(Duration.ofMinutes(30)))
                .transactionAware()
                .build();
    }
}
```

**Configuration** (`application.properties`):
```properties
# Redis Configuration
spring.data.redis.host=localhost
spring.data.redis.port=6379
spring.cache.type=redis
spring.cache.redis.time-to-live=300000
```

**Key Features**:
- Different TTL for different cache types
- JSON serialization for complex objects
- Transaction-aware caching
- Null value handling

---

## 2. Scheduled Tasks

### Overview
Automated background jobs that run at specified intervals using Spring's `@Scheduled` annotation.

**Location**: `DealerPro_backend/src/main/java/com/kia/dms/scheduler/AnalyticsScheduler.java`

```java
@Component
public class AnalyticsScheduler {

    @Scheduled(cron = "0 0 2 * * *")  // Runs daily at 2 AM
    @Transactional
    public void aggregateDealerPerformance() {
        log.info("Starting daily dealer performance aggregation...");
        
        List<DealerEntity> dealers = entityManager
            .createQuery("SELECT d FROM DealerEntity d", DealerEntity.class)
            .getResultList();
                
        for (DealerEntity dealer : dealers) {
            // Calculate sales count and revenue
            Object[] salesStats = (Object[]) entityManager.createQuery(
                "SELECT SUM(o.quantity), SUM(o.totalPrice) " +
                "FROM OrderEntity o WHERE o.dealer.id = :dealerId")
                .setParameter("dealerId", dealer.getId())
                .getSingleResult();
            
            // Calculate conversion rate
            Long totalLeads = entityManager.createQuery(
                "SELECT COUNT(l) FROM LeadEntity l WHERE l.dealer.id = :dealerId", 
                Long.class)
                .setParameter("dealerId", dealer.getId())
                .getSingleResult();
            
            // Save aggregated data
            DealerPerformanceEntity performance = new DealerPerformanceEntity();
            performance.setDealer(dealer);
            performance.setSalesCount(salesCount);
            performance.setRevenue(revenue);
            entityManager.persist(performance);
        }
    }
}
```

**Key Features**:
- Cron expression scheduling
- Automatic transaction management
- Performance metrics aggregation
- Daily execution at 2 AM

---

## 3. Soft Delete Pattern

### Overview
Instead of permanently deleting records, mark them as deleted using an `isDeleted` flag, preserving data for audit and recovery.

**Entity Implementation**:
```java
@Entity
@Table(name = "vehicles")
public class VehicleEntity extends BaseEntity {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(name = "is_deleted")
    private Boolean isDeleted = false;  // Soft delete flag
    
    // Other fields...
}
```

**Repository Query**:
```java
@Repository
public interface VehicleRepository extends JpaRepository<VehicleEntity, Long> {
    
    Page<VehicleEntity> findByIsDeletedFalse(Pageable pageable);
    
    @Query("SELECT v FROM VehicleEntity v WHERE v.id = :id AND v.isDeleted = false")
    Optional<VehicleEntity> findActiveById(@Param("id") Long id);
}
```

**Service Implementation**:
```java
@Service
public class VehicleService {
    
    public void deleteVehicle(Long id) {
        VehicleEntity vehicle = vehicleRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Vehicle not found"));
        
        vehicle.setIsDeleted(true);  // Soft delete
        vehicleRepository.save(vehicle);
    }
}
```

**Key Features**:
- Data preservation for audit trail
- Easy recovery of deleted records
- Filtered queries exclude deleted records
- Used in: Vehicles, Parts, Orders, Service Orders

---

## 4. DTO Mapping Pattern

### Overview
Separation of entity and response objects using Data Transfer Objects (DTOs) for clean API design.

**Request DTO**:
```java
@Data
public class OrderRequest {
    @NotNull
    private Long vehicleId;
    
    @NotBlank
    private String customerName;
    
    @Positive
    private Double totalAmount;
}
```

**Response DTO**:
```java
@Data
public class OrderResponse {
    private Long id;
    private String orderNumber;
    private String customerName;
    private Double totalAmount;
    private String status;
    private String vehicleModel;
    private String dealerName;
    private LocalDateTime createdAt;
}
```

**Mapper Method**:
```java
@Service
public class OrderService {
    
    private OrderResponse mapToResponse(OrderEntity entity) {
        OrderResponse response = new OrderResponse();
        response.setId(entity.getId());
        response.setOrderNumber(entity.getOrderNumber());
        response.setCustomerName(entity.getCustomerName());
        response.setTotalAmount(entity.getTotalAmount());
        response.setStatus(entity.getStatus());
        
        // Map related entities
        if (entity.getVehicle() != null && entity.getVehicle().getKiaCar() != null) {
            response.setVehicleModel(entity.getVehicle().getKiaCar().getModelName());
        }
        if (entity.getDealer() != null) {
            response.setDealerName(entity.getDealer().getDealerName());
        }
        
        response.setCreatedAt(entity.getCreatedAt());
        return response;
    }
}
```

**Key Features**:
- Separation of concerns
- Hide sensitive entity data
- Flatten nested relationships
- Custom field formatting
- Used across all modules

---

## Summary of Additional Features

| Feature | Status | Location |
|---------|--------|----------|
| Redis Caching | ✅ Implemented | `config/CacheConfig.java` |
| Scheduled Tasks | ✅ Implemented | `scheduler/AnalyticsScheduler.java` |
| Soft Delete | ✅ Implemented | All major entities |
| DTO Mapping | ✅ Implemented | All service layers |
| Async Processing | ✅ Implemented | `@Async` in sync services |
| AOP Logging | ✅ Implemented | `logging/LoggingAspect.java` |
| Audit Aspect | ✅ Implemented | `audit/aspect/AuditAspect.java` |

These features enhance performance, maintainability, and data integrity across the DealerPro application.
