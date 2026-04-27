# Technical Documentation Part 5: QueryDSL, Connection Pooling & Logging

## 1. Spring Service - QueryDSL

### Overview
QueryDSL provides type-safe SQL-like queries in Java, eliminating runtime errors from string-based queries and enabling IDE auto-completion.

### QueryDSL Configuration

**Location**: `DealerPro_backend/src/main/java/com/kia/dms/config/QueryDslConfig.java`

```java
package com.kia.dms.config;

import com.querydsl.jpa.impl.JPAQueryFactory;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class QueryDslConfig {

    @PersistenceContext
    private EntityManager entityManager;

    @Bean
    public JPAQueryFactory jpaQueryFactory() {
        return new JPAQueryFactory(entityManager);
    }
}
```

**Maven Dependencies** (`pom.xml`):
```xml
<!-- QueryDSL -->
<dependency>
    <groupId>com.querydsl</groupId>
    <artifactId>querydsl-jpa</artifactId>
    <version>5.1.0</version>
    <classifier>jakarta</classifier>
</dependency>

<dependency>
    <groupId>com.querydsl</groupId>
    <artifactId>querydsl-apt</artifactId>
    <version>5.1.0</version>
    <classifier>jakarta</classifier>
    <scope>provided</scope>
</dependency>

<!-- Annotation Processor Plugin -->
<build>
    <plugins>
        <plugin>
            <groupId>com.mysema.maven</groupId>
            <artifactId>apt-maven-plugin</artifactId>
            <version>1.1.3</version>
            <executions>
                <execution>
                    <goals>
                        <goal>process</goal>
                    </goals>
                    <configuration>
                        <outputDirectory>target/generated-sources/annotations</outputDirectory>
                        <processor>com.querydsl.apt.jpa.JPAAnnotationProcessor</processor>
                    </configuration>
                </execution>
            </executions>
        </plugin>
    </plugins>
</build>
```

### Generated Q Classes

**Location**: `DealerPro_backend/target/generated-sources/annotations/com/kia/dms/modules/sales/entity/QOrderEntity.java`

```java
package com.kia.dms.modules.sales.entity;

import static com.querydsl.core.types.PathMetadataFactory.*;
import com.querydsl.core.types.dsl.*;
import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;

@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QOrderEntity extends EntityPathBase<OrderEntity> {

    public static final QOrderEntity orderEntity = new QOrderEntity("orderEntity");

    public final NumberPath<Long> id = createNumber("id", Long.class);
    public final StringPath orderNumber = createString("orderNumber");
    public final StringPath customerName = createString("customerName");
    public final NumberPath<Double> totalAmount = createNumber("totalAmount", Double.class);
    public final StringPath status = createString("status");
    public final DateTimePath<java.time.LocalDateTime> createdAt = createDateTime("createdAt", java.time.LocalDateTime.class);
    
    // ... more fields
}
```

**Key Features**:
- Q classes generated automatically from entities
- Type-safe field references
- Used for building queries programmatically

### Custom Repository Implementation

**Location**: `DealerPro_backend/src/main/java/com/kia/dms/modules/sales/repository/OrderRepositoryCustom.java`

```java
package com.kia.dms.modules.sales.repository;

import com.kia.dms.modules.sales.entity.OrderEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.time.LocalDateTime;
import java.util.List;

public interface OrderRepositoryCustom {
    
    Page<OrderEntity> searchOrders(
        String searchTerm,
        String status,
        LocalDateTime startDate,
        LocalDateTime endDate,
        Pageable pageable
    );
    
    List<OrderEntity> findHighValueOrders(Double minAmount);
    
    Long countOrdersByStatus(String status);
}
```

**Location**: `DealerPro_backend/src/main/java/com/kia/dms/modules/sales/repository/OrderRepositoryImpl.java`

```java
package com.kia.dms.modules.sales.repository;

import com.kia.dms.modules.sales.entity.OrderEntity;
import com.kia.dms.modules.sales.entity.QOrderEntity;
import com.querydsl.core.BooleanBuilder;
import com.querydsl.core.types.dsl.BooleanExpression;
import com.querydsl.jpa.impl.JPAQuery;
import com.querydsl.jpa.impl.JPAQueryFactory;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
@RequiredArgsConstructor
public class OrderRepositoryImpl implements OrderRepositoryCustom {

    private final JPAQueryFactory queryFactory;
    private static final QOrderEntity order = QOrderEntity.orderEntity;

    @Override
    public Page<OrderEntity> searchOrders(
            String searchTerm,
            String status,
            LocalDateTime startDate,
            LocalDateTime endDate,
            Pageable pageable
    ) {
        // Build dynamic query with BooleanBuilder
        BooleanBuilder builder = new BooleanBuilder();

        // Add search term condition (case-insensitive)
        if (searchTerm != null && !searchTerm.isEmpty()) {
            BooleanExpression searchCondition = order.orderNumber.containsIgnoreCase(searchTerm)
                .or(order.customerName.containsIgnoreCase(searchTerm))
                .or(order.customerEmail.containsIgnoreCase(searchTerm));
            builder.and(searchCondition);
        }

        // Add status filter
        if (status != null && !status.isEmpty()) {
            builder.and(order.status.eq(status));
        }

        // Add date range filter
        if (startDate != null) {
            builder.and(order.createdAt.goe(startDate));  // Greater or equal
        }
        if (endDate != null) {
            builder.and(order.createdAt.loe(endDate));    // Less or equal
        }

        // Build query with pagination
        JPAQuery<OrderEntity> query = queryFactory
            .selectFrom(order)
            .where(builder)
            .offset(pageable.getOffset())
            .limit(pageable.getPageSize());

        // Add sorting
        if (pageable.getSort().isSorted()) {
            pageable.getSort().forEach(sortOrder -> {
                if (sortOrder.getProperty().equals("createdAt")) {
                    query.orderBy(sortOrder.isAscending() 
                        ? order.createdAt.asc() 
                        : order.createdAt.desc());
                } else if (sortOrder.getProperty().equals("totalAmount")) {
                    query.orderBy(sortOrder.isAscending() 
                        ? order.totalAmount.asc() 
                        : order.totalAmount.desc());
                }
            });
        }

        // Execute query
        List<OrderEntity> results = query.fetch();

        // Count total results
        long total = queryFactory
            .selectFrom(order)
            .where(builder)
            .fetchCount();

        return new PageImpl<>(results, pageable, total);
    }

    @Override
    public List<OrderEntity> findHighValueOrders(Double minAmount) {
        return queryFactory
            .selectFrom(order)
            .where(order.totalAmount.goe(minAmount))
            .orderBy(order.totalAmount.desc())
            .fetch();
    }

    @Override
    public Long countOrdersByStatus(String status) {
        return queryFactory
            .selectFrom(order)
            .where(order.status.eq(status))
            .fetchCount();
    }
}
```

**Main Repository Interface**:

**Location**: `DealerPro_backend/src/main/java/com/kia/dms/modules/sales/repository/OrderRepository.java`

```java
package com.kia.dms.modules.sales.repository;

import com.kia.dms.modules.sales.entity.OrderEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface OrderRepository extends 
        JpaRepository<OrderEntity, Long>, 
        OrderRepositoryCustom {  // Extends custom repository
    
    // Spring Data JPA methods + QueryDSL custom methods
}
```

### QueryDSL Features Used

**1. BooleanBuilder - Dynamic Query Building**:
```java
BooleanBuilder builder = new BooleanBuilder();
builder.and(order.status.eq("COMPLETED"));
builder.and(order.totalAmount.goe(1000.0));
```

**2. Type-safe Predicates**:
```java
// String operations
order.customerName.containsIgnoreCase("john")
order.orderNumber.startsWith("ORD-")
order.status.eq("PENDING")

// Numeric operations
order.totalAmount.goe(1000.0)  // Greater or equal
order.totalAmount.loe(5000.0)  // Less or equal
order.totalAmount.between(1000.0, 5000.0)

// Date operations
order.createdAt.after(LocalDateTime.now().minusDays(7))
order.createdAt.between(startDate, endDate)
```

**3. Fetch Joins**:
```java
queryFactory
    .selectFrom(order)
    .leftJoin(order.dealer).fetchJoin()
    .leftJoin(order.vehicle).fetchJoin()
    .where(order.id.eq(orderId))
    .fetchOne();
```

**4. Projections**:
```java
queryFactory
    .select(order.status, order.totalAmount.sum())
    .from(order)
    .groupBy(order.status)
    .fetch();
```

**Key Benefits**:
- Type-safe queries (compile-time error checking)
- IDE auto-completion
- Refactoring-friendly
- Dynamic query building
- Complex joins and subqueries
- Better than JPQL for complex queries

---

## 2. DB Connection Pooling

### Overview
HikariCP is the default connection pool in Spring Boot, providing high-performance database connection management.

### HikariCP Configuration

**Location**: `DealerPro_backend/src/main/resources/application.properties`

```properties
# HikariCP Connection Pool Configuration
spring.datasource.hikari.maximum-pool-size=10
spring.datasource.hikari.minimum-idle=5
spring.datasource.hikari.connection-timeout=30000
spring.datasource.hikari.idle-timeout=600000
spring.datasource.hikari.max-lifetime=1800000
spring.datasource.hikari.pool-name=DealerProHikariPool
spring.datasource.hikari.auto-commit=true
spring.datasource.hikari.leak-detection-threshold=60000
```

### Configuration Explained

**1. maximum-pool-size=10**
- Maximum number of connections in the pool
- Limits concurrent database connections
- Prevents database overload
- Formula: `connections = ((core_count * 2) + effective_spindle_count)`
- For 4-core CPU: `(4 * 2) + 1 = 9-10 connections`

**2. minimum-idle=5**
- Minimum number of idle connections maintained
- Ensures connections are ready for immediate use
- Reduces connection creation overhead
- Should be less than maximum-pool-size

**3. connection-timeout=30000 (30 seconds)**
- Maximum time to wait for a connection from pool
- Throws exception if timeout exceeded
- Prevents indefinite waiting

**4. idle-timeout=600000 (10 minutes)**
- Maximum time a connection can sit idle in pool
- Idle connections are closed after this time
- Keeps pool size optimal
- Only applies if connections > minimum-idle

**5. max-lifetime=1800000 (30 minutes)**
- Maximum lifetime of a connection in pool
- Connections are closed and recreated after this time
- Prevents stale connections
- Should be less than database's connection timeout

**6. pool-name=DealerProHikariPool**
- Name for the connection pool
- Useful for monitoring and logging
- Appears in thread names and logs

**7. auto-commit=true**
- Automatically commits transactions
- Can be set to false for manual transaction control
- Spring manages transactions with `@Transactional`

**8. leak-detection-threshold=60000 (60 seconds)**
- Detects connection leaks
- Logs warning if connection held longer than threshold
- Helps identify unclosed connections in code

### Connection Pool Monitoring

**Logging Configuration**:
```properties
# Enable HikariCP logging
logging.level.com.zaxxer.hikari=DEBUG
logging.level.com.zaxxer.hikari.HikariConfig=DEBUG
```

**Log Output Example**:
```
HikariPool-1 - Starting...
HikariPool-1 - Added connection org.sqlite.jdbc4.JDBC4Connection@1a2b3c4d
HikariPool-1 - Start completed.
HikariPool-1 - Pool stats (total=5, active=2, idle=3, waiting=0)
```

### Connection Pool Benefits

1. **Performance**: Reuses connections instead of creating new ones
2. **Resource Management**: Limits concurrent connections
3. **Scalability**: Handles multiple requests efficiently
4. **Reliability**: Detects and removes stale connections
5. **Monitoring**: Provides pool statistics

---

## 3. Configuration Management (Key-Value Configuration)

### Overview
DealerPro uses Spring Boot's `@ConfigurationProperties` pattern for type-safe configuration management.

### Configuration Properties Classes

**Location**: `DealerPro_backend/src/main/java/com/kia/dms/config/properties/SecurityProperties.java`

```java
package com.kia.dms.config.properties;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration
@ConfigurationProperties(prefix = "app.security")
public class SecurityProperties {

    private int maxLoginAttempts = 5;
    private int lockDurationMinutes = 5;
    private String jwtSecret;

    // Getters and Setters
    public int getMaxLoginAttempts() {
        return maxLoginAttempts;
    }

    public void setMaxLoginAttempts(int maxLoginAttempts) {
        this.maxLoginAttempts = maxLoginAttempts;
    }

    public int getLockDurationMinutes() {
        return lockDurationMinutes;
    }

    public void setLockDurationMinutes(int lockDurationMinutes) {
        this.lockDurationMinutes = lockDurationMinutes;
    }

    public String getJwtSecret() {
        return jwtSecret;
    }

    public void setJwtSecret(String jwtSecret) {
        this.jwtSecret = jwtSecret;
    }
}
```

**Location**: `DealerPro_backend/src/main/java/com/kia/dms/config/properties/CacheProperties.java`

```java
package com.kia.dms.config.properties;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

import java.util.List;

@Configuration
@ConfigurationProperties(prefix = "app.cache")
public class CacheProperties {

    private boolean enabled = true;
    private int ttlMinutes = 5;
    private List<String> cacheNames;

    // Getters and Setters
    public boolean isEnabled() {
        return enabled;
    }

    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }

    public int getTtlMinutes() {
        return ttlMinutes;
    }

    public void setTtlMinutes(int ttlMinutes) {
        this.ttlMinutes = ttlMinutes;
    }

    public List<String> getCacheNames() {
        return cacheNames;
    }

    public void setCacheNames(List<String> cacheNames) {
        this.cacheNames = cacheNames;
    }
}
```

**Location**: `DealerPro_backend/src/main/java/com/kia/dms/config/properties/DatabaseProperties.java`

```java
package com.kia.dms.config.properties;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration
@ConfigurationProperties(prefix = "app.database")
public class DatabaseProperties {

    private String type = "sqlite";
    private Sync sync = new Sync();

    public static class Sync {
        private boolean enabled = false;
        private String path;
        private int intervalMinutes = 30;

        // Getters and Setters
        public boolean isEnabled() {
            return enabled;
        }

        public void setEnabled(boolean enabled) {
            this.enabled = enabled;
        }

        public String getPath() {
            return path;
        }

        public void setPath(String path) {
            this.path = path;
        }

        public int getIntervalMinutes() {
            return intervalMinutes;
        }

        public void setIntervalMinutes(int intervalMinutes) {
            this.intervalMinutes = intervalMinutes;
        }
    }

    // Getters and Setters
    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public Sync getSync() {
        return sync;
    }

    public void setSync(Sync sync) {
        this.sync = sync;
    }
}
```

### Application Properties File

**Location**: `DealerPro_backend/src/main/resources/application.properties`

```properties
# Server Configuration
server.port=8083
spring.application.name=DealerProApplication

# Database Configuration
spring.datasource.url=jdbc:sqlite:D:/My Projects/DealerPro/db/DealerPro.db
spring.datasource.driver-class-name=org.sqlite.JDBC

# Security Configuration
app.security.max-login-attempts=5
app.security.lock-duration-minutes=5
app.security.jwt-secret=9a4f2c8d3b7a1e5f0d9c8b7a6e5f4d3c2b1a0f9e8d7c6b5a4f3e2d1c0b9a8f7e

# Cache Configuration
app.cache.enabled=true
app.cache.ttl-minutes=5
app.cache.cache-names=leads,dealers,managers,vehicles,inventory,sales,testDrives,serviceOrders,parts,analytics,finance

# Database Configuration
app.database.type=sqlite
app.database.sync.enabled=false
app.database.sync.path=D:/My Projects/DealerPro/db/DealerPro.db
app.database.sync.interval-minutes=30
```

### Using Configuration Properties

```java
@Service
@RequiredArgsConstructor
public class SomeService {

    private final SecurityProperties securityProperties;
    private final CacheProperties cacheProperties;

    public void someMethod() {
        int maxAttempts = securityProperties.getMaxLoginAttempts();
        boolean cacheEnabled = cacheProperties.isEnabled();
        
        // Use configuration values
    }
}
```

**Key Benefits**:
- Type-safe configuration
- IDE auto-completion
- Validation support
- Nested properties
- Default values
- Environment-specific overrides

---

## 4. Logging (SLF4J / Logback)

### Overview
DealerPro uses SLF4J (Simple Logging Facade for Java) with Logback as the logging implementation.

### Logging Configuration

**Location**: `DealerPro_backend/src/main/resources/logback-spring.xml`

```xml
<?xml version="1.0" encoding="UTF-8"?>
<configuration>
    
    <!-- Console Appender -->
    <appender name="CONSOLE" class="ch.qos.logback.core.ConsoleAppender">
        <encoder>
            <pattern>%d{yyyy-MM-dd HH:mm:ss.SSS} [%thread] %-5level %logger{36} - %msg%n</pattern>
        </encoder>
    </appender>

    <!-- File Appender -->
    <appender name="FILE" class="ch.qos.logback.core.rolling.RollingFileAppender">
        <file>logs/dms-application.log</file>
        <encoder>
            <pattern>%d{yyyy-MM-dd HH:mm:ss.SSS} [%thread] %-5level %logger{36} - %msg%n</pattern>
        </encoder>
        
        <!-- Rolling Policy -->
        <rollingPolicy class="ch.qos.logback.core.rolling.TimeBasedRollingPolicy">
            <fileNamePattern>logs/dms-application.%d{yyyy-MM-dd}.log</fileNamePattern>
            <maxHistory>30</maxHistory>
            <totalSizeCap>1GB</totalSizeCap>
        </rollingPolicy>
    </appender>

    <!-- Root Logger -->
    <root level="INFO">
        <appender-ref ref="CONSOLE" />
        <appender-ref ref="FILE" />
    </root>

    <!-- Package-specific Logging -->
    <logger name="com.kia.dms" level="DEBUG" />
    <logger name="org.springframework.web" level="INFO" />
    <logger name="org.hibernate.SQL" level="DEBUG" />
    <logger name="org.hibernate.type.descriptor.sql.BasicBinder" level="TRACE" />
    
</configuration>
```

### Application Properties Logging

**Location**: `DealerPro_backend/src/main/resources/application.properties`

```properties
# Logging Configuration
logging.level.org.hibernate.SQL=DEBUG
logging.level.org.hibernate.type.descriptor.sql.BasicBinder=TRACE
logging.level.com.querydsl.jpa=DEBUG
logging.level.com.kia.dms=DEBUG
```

### Logging in Code

**Location**: `DealerPro_backend/src/main/java/com/kia/dms/modules/sales/service/OrderService.java`

```java
package com.kia.dms.modules.sales.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j  // Lombok annotation for logger
public class OrderService {

    public OrderResponse createOrder(OrderRequest request) {
        // Different log levels
        log.trace("Trace level - very detailed");
        log.debug("Debug level - Creating order: {}", request);
        log.info("Info level - Order created with ID: {}", order.getId());
        log.warn("Warning level - Low stock for item: {}", itemName);
        log.error("Error level - Failed to create order", exception);
        
        // Conditional logging
        if (log.isDebugEnabled()) {
            log.debug("Expensive operation result: {}", expensiveOperation());
        }
        
        return response;
    }
}
```

### Logging Aspect (AOP)

**Location**: `DealerPro_backend/src/main/java/com/kia/dms/logging/LoggingAspect.java`

```java
package com.kia.dms.logging;

import lombok.extern.slf4j.Slf4j;
import org.aspectj.lang.JoinPoint;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.*;
import org.springframework.stereotype.Component;

import java.util.Arrays;

@Aspect
@Component
@Slf4j
public class LoggingAspect {

    // Log method entry
    @Before("execution(* com.kia.dms.modules.*.service.*.*(..))")
    public void logMethodEntry(JoinPoint joinPoint) {
        String methodName = joinPoint.getSignature().getName();
        String className = joinPoint.getTarget().getClass().getSimpleName();
        Object[] args = joinPoint.getArgs();
        
        log.debug("Entering {}.{} with arguments: {}", 
            className, methodName, Arrays.toString(args));
    }

    // Log method exit
    @AfterReturning(
        pointcut = "execution(* com.kia.dms.modules.*.service.*.*(..))",
        returning = "result"
    )
    public void logMethodExit(JoinPoint joinPoint, Object result) {
        String methodName = joinPoint.getSignature().getName();
        String className = joinPoint.getTarget().getClass().getSimpleName();
        
        log.debug("Exiting {}.{} with result: {}", 
            className, methodName, result);
    }

    // Log exceptions
    @AfterThrowing(
        pointcut = "execution(* com.kia.dms.modules.*.service.*.*(..))",
        throwing = "exception"
    )
    public void logException(JoinPoint joinPoint, Throwable exception) {
        String methodName = joinPoint.getSignature().getName();
        String className = joinPoint.getTarget().getClass().getSimpleName();
        
        log.error("Exception in {}.{}: {}", 
            className, methodName, exception.getMessage(), exception);
    }

    // Log execution time
    @Around("execution(* com.kia.dms.modules.*.service.*.*(..))")
    public Object logExecutionTime(ProceedingJoinPoint joinPoint) throws Throwable {
        long startTime = System.currentTimeMillis();
        
        Object result = joinPoint.proceed();
        
        long executionTime = System.currentTimeMillis() - startTime;
        String methodName = joinPoint.getSignature().getName();
        String className = joinPoint.getTarget().getClass().getSimpleName();
        
        log.info("{}.{} executed in {} ms", 
            className, methodName, executionTime);
        
        return result;
    }
}
```

### Log Levels

1. **TRACE**: Very detailed information (rarely used)
2. **DEBUG**: Detailed information for debugging
3. **INFO**: General informational messages
4. **WARN**: Warning messages (potential issues)
5. **ERROR**: Error messages (failures)

### Log Output Example

```
2026-04-05 10:30:15.123 [http-nio-8083-exec-1] DEBUG c.k.d.m.s.service.OrderService - Creating order: OrderRequest(customerId=123, items=[...])
2026-04-05 10:30:15.234 [http-nio-8083-exec-1] DEBUG org.hibernate.SQL - insert into orders (customer_id, total_amount, status) values (?, ?, ?)
2026-04-05 10:30:15.235 [http-nio-8083-exec-1] TRACE o.h.t.d.sql.BasicBinder - binding parameter [1] as [BIGINT] - [123]
2026-04-05 10:30:15.345 [http-nio-8083-exec-1] INFO  c.k.d.m.s.service.OrderService - Order created with ID: 456
2026-04-05 10:30:15.346 [http-nio-8083-exec-1] INFO  c.k.d.logging.LoggingAspect - OrderService.createOrder executed in 223 ms
```

**Key Features**:
- SLF4J facade for logging
- Logback implementation
- Console and file appenders
- Daily log rotation
- Log retention (30 days)
- Size-based rotation (1GB cap)
- Package-specific log levels
- AOP-based method logging
- Exception stack traces
- Execution time tracking

