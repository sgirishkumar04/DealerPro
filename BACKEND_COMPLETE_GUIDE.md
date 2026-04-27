# DealerPro Backend - Complete Guide

## 1. Architecture Overview

**Technology Stack:**
- Spring Boot 3.x
- Java 17+
- Spring Data JPA
- Spring Security + JWT
- QueryDSL 5.1.0
- SQLite/MySQL Database
- Redis Cache
- HikariCP Connection Pool

**Project Structure:**
```
DealerPro_backend/
├── config/              # Configuration classes
├── security/            # JWT & Security
├── modules/             # Business modules (dealer, sales, service, etc.)
├── common/              # Shared utilities
├── exception/           # Exception handling
├── logging/             # AOP logging
└── scheduler/           # Scheduled tasks
```

---

## 2. Database Layer

### Entity Example
```java
@Entity
@Table(name = "dealers")
@Data
public class DealerEntity extends BaseEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(nullable = false)
    private String dealerName;
    
    @ManyToOne
    @JoinColumn(name = "manager_id")
    private UserEntity manager;
    
    // Inherits: createdAt, updatedAt from BaseEntity
}
```

**Concepts:**
- `@Entity`: JPA entity mapped to database table
- `@ManyToOne`: Foreign key relationship
- `BaseEntity`: Provides audit fields (createdAt, updatedAt)

### Repository
```java
@Repository
public interface DealerRepository extends JpaRepository<DealerEntity, Long> {
    // Auto-provided: save(), findById(), findAll(), deleteById()
    
    List<DealerEntity> findByManagerId(Long managerId);
}
```

**Concepts:**
- `JpaRepository`: Provides CRUD methods automatically
- Method naming convention: `findBy` + field name

---

## 3. Service Layer

```java
@Service
@RequiredArgsConstructor
@Transactional
public class DealerService {
    
    private final DealerRepository dealerRepository;
    
    // CREATE
    public DealerResponse createDealer(DealerRequest request) {
        DealerEntity dealer = new DealerEntity();
        dealer.setDealerName(request.getDealerName());
        return mapToResponse(dealerRepository.save(dealer));
    }
    
    // READ
    @Transactional(readOnly = true)
    public DealerResponse getDealer(Long id) {
        DealerEntity dealer = dealerRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Dealer not found"));
        return mapToResponse(dealer);
    }
    
    // UPDATE
    public DealerResponse updateDealer(Long id, DealerRequest request) {
        DealerEntity dealer = dealerRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Dealer not found"));
        dealer.setDealerName(request.getDealerName());
        return mapToResponse(dealerRepository.save(dealer));
    }
    
    // DELETE (Soft Delete)
    public void deleteDealer(Long id) {
        DealerEntity dealer = dealerRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Dealer not found"));
        dealer.setIsDeleted(true);
        dealerRepository.save(dealer);
    }
}
```

**Concepts:**
- `@Service`: Business logic layer
- `@Transactional`: Database transaction management
- `@Transactional(readOnly = true)`: Optimizes read operations
- Soft Delete: Mark as deleted instead of removing from database

---

## 4. Controller Layer (REST API)

```java
@RestController
@RequestMapping("/api/dealers")
@RequiredArgsConstructor
public class DealerController {
    
    private final DealerService dealerService;
    
    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<ApiResponse<PaginationResponse<DealerResponse>>> getAllDealers(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        
        Page<DealerResponse> dealers = dealerService.getAllDealers(
            PageRequest.of(page, size)
        );
        return ResponseEntity.ok(ApiResponse.success(dealers));
    }
    
    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<DealerResponse>> createDealer(
            @Valid @RequestBody DealerRequest request) {
        
        DealerResponse response = dealerService.createDealer(request);
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(ApiResponse.success(response));
    }
}
```

**Concepts:**
- `@RestController`: REST API controller
- `@RequestMapping`: Base URL path
- `@GetMapping`, `@PostMapping`: HTTP methods
- `@PreAuthorize`: Role-based access control
- `@Valid`: Triggers validation
- `@RequestParam`: Query parameters for pagination

---

## 5. Validation

### Request DTO
```java
@Data
public class DealerRequest {
    @NotBlank(message = "Dealer name is required")
    @Size(min = 2, max = 100)
    private String dealerName;
    
    @NotBlank(message = "Email is required")
    @Email(message = "Email must be valid")
    private String email;
    
    @Pattern(regexp = "^[0-9]{10}$", message = "Phone must be 10 digits")
    private String phone;
}
```

**Concepts:**
- `@NotBlank`: Cannot be null or empty
- `@Email`: Email format validation
- `@Pattern`: Regex validation
- `@Size`: Length constraints

---

## 6. Exception Handling

### Custom Exception
```java
public class ResourceNotFoundException extends RuntimeException {
    public ResourceNotFoundException(String message) {
        super(message);
    }
}
```

### Global Exception Handler
```java
@RestControllerAdvice
public class GlobalExceptionHandler {
    
    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleNotFound(ResourceNotFoundException ex) {
        ErrorResponse error = ErrorResponse.builder()
            .timestamp(LocalDateTime.now())
            .status(404)
            .message(ex.getMessage())
            .build();
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error);
    }
    
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidation(
            MethodArgumentNotValidException ex) {
        
        Map<String, String> errors = new HashMap<>();
        ex.getBindingResult().getAllErrors().forEach(error -> {
            String field = ((FieldError) error).getField();
            String message = error.getDefaultMessage();
            errors.put(field, message);
        });
        
        ErrorResponse errorResponse = ErrorResponse.builder()
            .timestamp(LocalDateTime.now())
            .status(400)
            .message("Validation failed")
            .details(errors)
            .build();
        
        return ResponseEntity.badRequest().body(errorResponse);
    }
}
```

**Concepts:**
- `@RestControllerAdvice`: Global exception handler
- `@ExceptionHandler`: Handles specific exception types
- Returns standardized error responses

---

## 7. Security & Authentication

### Security Configuration
```java
@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {
    
    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) {
        http
            .csrf(csrf -> csrf.disable())
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/auth/**").permitAll()
                .requestMatchers("/api/admin/**").hasRole("ADMIN")
                .anyRequest().authenticated()
            )
            .sessionManagement(session -> 
                session.sessionCreationPolicy(SessionCreationPolicy.STATELESS)
            )
            .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);
        
        return http.build();
    }
    
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
```

**Concepts:**
- CSRF disabled for REST API
- Stateless sessions (JWT-based)
- Role-based endpoint protection
- BCrypt password hashing

### JWT Token Provider
```java
@Component
public class JwtTokenProvider {
    
    private final int jwtExpirationMs = 1800000; // 30 minutes
    
    public String generateToken(Authentication authentication) {
        UserDetails user = (UserDetails) authentication.getPrincipal();
        Date now = new Date();
        Date expiryDate = new Date(now.getTime() + jwtExpirationMs);
        
        return Jwts.builder()
            .setSubject(user.getUsername())
            .setIssuedAt(now)
            .setExpiration(expiryDate)
            .signWith(getSigningKey())
            .compact();
    }
    
    public boolean validateToken(String token) {
        try {
            Jwts.parserBuilder()
                .setSigningKey(getSigningKey())
                .build()
                .parseClaimsJws(token);
            return true;
        } catch (Exception e) {
            return false;
        }
    }
}
```

**Concepts:**
- JWT: JSON Web Token for authentication
- Token contains username and expiration
- Signed with secret key
- 30-minute expiration

### JWT Filter
```java
@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {
    
    @Override
    protected void doFilterInternal(HttpServletRequest request, 
                                    HttpServletResponse response, 
                                    FilterChain filterChain) {
        
        String jwt = getJwtFromRequest(request);
        
        if (jwt != null && tokenProvider.validateToken(jwt)) {
            String username = tokenProvider.getUsernameFromToken(jwt);
            UserDetails userDetails = userDetailsService.loadUserByUsername(username);
            
            UsernamePasswordAuthenticationToken authentication = 
                new UsernamePasswordAuthenticationToken(
                    userDetails, null, userDetails.getAuthorities()
                );
            
            SecurityContextHolder.getContext().setAuthentication(authentication);
        }
        
        filterChain.doFilter(request, response);
    }
    
    private String getJwtFromRequest(HttpServletRequest request) {
        String bearerToken = request.getHeader("Authorization");
        if (bearerToken != null && bearerToken.startsWith("Bearer ")) {
            return bearerToken.substring(7);
        }
        return null;
    }
}
```

**Concepts:**
- Extracts JWT from Authorization header
- Validates token
- Sets authentication in SecurityContext
- Runs on every request

### Account Lock
```java
@Service
public class LoginAttemptService {
    
    private final int MAX_ATTEMPTS = 5;
    private final int LOCK_DURATION_MINUTES = 5;
    
    public void loginFailed(String email) {
        UserEntity user = userRepository.findByEmail(email).orElse(null);
        if (user != null) {
            int attempts = user.getFailedLoginAttempts() + 1;
            user.setFailedLoginAttempts(attempts);
            
            if (attempts >= MAX_ATTEMPTS) {
                LocalDateTime lockUntil = LocalDateTime.now()
                    .plusMinutes(LOCK_DURATION_MINUTES);
                user.setAccountLockedUntil(lockUntil);
            }
            userRepository.save(user);
        }
    }
    
    public boolean isAccountLocked(String email) {
        UserEntity user = userRepository.findByEmail(email).orElse(null);
        if (user == null || user.getAccountLockedUntil() == null) {
            return false;
        }
        
        if (LocalDateTime.now().isAfter(user.getAccountLockedUntil())) {
            // Lock expired
            user.setFailedLoginAttempts(0);
            user.setAccountLockedUntil(null);
            userRepository.save(user);
            return false;
        }
        
        return true; // Still locked
    }
}
```

**Concepts:**
- Tracks failed login attempts
- Locks account after 5 failures
- Auto-unlocks after 5 minutes
- Resets counter on successful login

---

## 8. QueryDSL (Type-safe Queries)

### Configuration
```java
@Configuration
public class QueryDslConfig {
    
    @Bean
    public JPAQueryFactory jpaQueryFactory(EntityManager entityManager) {
        return new JPAQueryFactory(entityManager);
    }
}
```

### Custom Repository
```java
@Repository
public class OrderRepositoryImpl {
    
    private final JPAQueryFactory queryFactory;
    private static final QOrderEntity order = QOrderEntity.orderEntity;
    
    public Page<OrderEntity> searchOrders(String searchTerm, 
                                          String status, 
                                          Pageable pageable) {
        BooleanBuilder builder = new BooleanBuilder();
        
        if (searchTerm != null) {
            builder.and(order.orderNumber.containsIgnoreCase(searchTerm)
                .or(order.customerName.containsIgnoreCase(searchTerm)));
        }
        
        if (status != null) {
            builder.and(order.status.eq(status));
        }
        
        List<OrderEntity> results = queryFactory
            .selectFrom(order)
            .where(builder)
            .offset(pageable.getOffset())
            .limit(pageable.getPageSize())
            .fetch();
        
        long total = queryFactory
            .selectFrom(order)
            .where(builder)
            .fetchCount();
        
        return new PageImpl<>(results, pageable, total);
    }
}
```

**Concepts:**
- Type-safe queries (compile-time checking)
- `BooleanBuilder`: Dynamic query building
- Q classes: Generated from entities
- Supports pagination and sorting

---

## 9. Connection Pooling (HikariCP)

### Configuration
```properties
# HikariCP Connection Pool
spring.datasource.hikari.maximum-pool-size=10
spring.datasource.hikari.minimum-idle=5
spring.datasource.hikari.connection-timeout=30000
spring.datasource.hikari.idle-timeout=600000
spring.datasource.hikari.max-lifetime=1800000
```

**Concepts:**
- Connection pooling: Reuses database connections
- `maximum-pool-size`: Max concurrent connections
- `minimum-idle`: Always-ready connections
- Improves performance by avoiding connection creation overhead

---

## 10. Redis Caching

### Configuration
```java
@Configuration
@EnableCaching
public class CacheConfig {
    
    @Bean
    public CacheManager cacheManager(RedisConnectionFactory factory) {
        RedisCacheConfiguration config = RedisCacheConfiguration
            .defaultCacheConfig()
            .entryTtl(Duration.ofMinutes(5));
        
        return RedisCacheManager.builder(factory)
            .cacheDefaults(config)
            .withCacheConfiguration("dealers", 
                config.entryTtl(Duration.ofMinutes(10)))
            .withCacheConfiguration("vehicles", 
                config.entryTtl(Duration.ofMinutes(15)))
            .build();
    }
}
```

**Concepts:**
- Redis: In-memory cache for fast data access
- TTL (Time To Live): Cache expiration time
- Different TTL for different data types
- Reduces database queries

---

## 11. Scheduled Tasks

```java
@Component
public class AnalyticsScheduler {
    
    @Scheduled(cron = "0 0 2 * * *")  // Daily at 2 AM
    @Transactional
    public void aggregateDealerPerformance() {
        List<DealerEntity> dealers = dealerRepository.findAll();
        
        for (DealerEntity dealer : dealers) {
            // Calculate sales, revenue, conversion rate
            Long salesCount = orderRepository.countByDealerId(dealer.getId());
            BigDecimal revenue = orderRepository.sumRevenueByDealerId(dealer.getId());
            
            // Save aggregated data
            DealerPerformanceEntity performance = new DealerPerformanceEntity();
            performance.setDealer(dealer);
            performance.setSalesCount(salesCount);
            performance.setRevenue(revenue);
            performanceRepository.save(performance);
        }
    }
}
```

**Concepts:**
- `@Scheduled`: Runs method automatically
- Cron expression: Defines schedule (daily at 2 AM)
- Background job for analytics aggregation

---

## 12. Logging (SLF4J + Logback)

### Usage in Code
```java
@Service
@Slf4j
public class OrderService {
    
    public OrderResponse createOrder(OrderRequest request) {
        log.debug("Creating order: {}", request);
        
        try {
            OrderEntity order = orderRepository.save(entity);
            log.info("Order created with ID: {}", order.getId());
            return mapToResponse(order);
        } catch (Exception e) {
            log.error("Failed to create order", e);
            throw e;
        }
    }
}
```

### AOP Logging
```java
@Aspect
@Component
@Slf4j
public class LoggingAspect {
    
    @Around("execution(* com.kia.dms.modules.*.service.*.*(..))")
    public Object logExecutionTime(ProceedingJoinPoint joinPoint) throws Throwable {
        long start = System.currentTimeMillis();
        
        Object result = joinPoint.proceed();
        
        long executionTime = System.currentTimeMillis() - start;
        log.info("{}.{} executed in {} ms", 
            joinPoint.getTarget().getClass().getSimpleName(),
            joinPoint.getSignature().getName(),
            executionTime);
        
        return result;
    }
}
```

**Concepts:**
- `@Slf4j`: Lombok annotation for logger
- Log levels: DEBUG, INFO, WARN, ERROR
- AOP: Aspect-Oriented Programming for cross-cutting concerns
- Automatic method execution time logging

---

## 13. Audit Logging

### Audit Aspect
```java
@Aspect
@Component
public class AuditAspect {
    
    @AfterReturning(
        pointcut = "execution(* com.kia.dms.modules.*.service.*Service.create*(..))",
        returning = "result"
    )
    public void auditCreate(JoinPoint joinPoint, Object result) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String username = auth.getName();
        
        AuditLogEntity auditLog = AuditLogEntity.builder()
            .entityName(extractEntityName(joinPoint))
            .entityId(extractEntityId(result))
            .action("CREATE")
            .performedBy(username)
            .performedAt(LocalDateTime.now())
            .description("Created " + extractEntityName(joinPoint))
            .build();
        
        auditLogRepository.save(auditLog);
    }
}
```

**Concepts:**
- AOP: Intercepts service methods
- `@AfterReturning`: Executes after successful method
- Captures user, action, timestamp
- Automatic audit trail for all CRUD operations

---

## 14. Pagination

### Server-side
```java
@GetMapping
public ResponseEntity<PaginationResponse<OrderResponse>> getOrders(
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "10") int size,
        @RequestParam(defaultValue = "id") String sortBy,
        @RequestParam(defaultValue = "DESC") String sortDir) {
    
    Sort sort = sortDir.equalsIgnoreCase("ASC") 
        ? Sort.by(sortBy).ascending() 
        : Sort.by(sortBy).descending();
    
    Pageable pageable = PageRequest.of(page, size, sort);
    Page<OrderEntity> orderPage = orderRepository.findAll(pageable);
    
    PaginationResponse<OrderResponse> response = PaginationResponse.builder()
        .content(orderPage.getContent())
        .page(orderPage.getNumber())
        .size(orderPage.getSize())
        .totalElements(orderPage.getTotalElements())
        .totalPages(orderPage.getTotalPages())
        .build();
    
    return ResponseEntity.ok(ApiResponse.success(response));
}
```

**Concepts:**
- `Pageable`: Spring Data pagination interface
- `PageRequest`: Creates pagination request
- `Sort`: Defines sorting criteria
- Returns page metadata (total pages, total elements)

---

## 15. DTO Mapping

```java
@Service
public class OrderService {
    
    private OrderResponse mapToResponse(OrderEntity entity) {
        OrderResponse response = new OrderResponse();
        response.setId(entity.getId());
        response.setOrderNumber(entity.getOrderNumber());
        response.setCustomerName(entity.getCustomerName());
        response.setTotalAmount(entity.getTotalAmount());
        
        // Map nested entities
        if (entity.getVehicle() != null) {
            response.setVehicleModel(entity.getVehicle().getKiaCar().getModelName());
        }
        if (entity.getDealer() != null) {
            response.setDealerName(entity.getDealer().getDealerName());
        }
        
        return response;
    }
}
```

**Concepts:**
- DTO: Data Transfer Object
- Separates entity from API response
- Flattens nested relationships
- Hides sensitive data

---

## Summary of Backend Features

| Feature | Implementation | Location |
|---------|---------------|----------|
| REST API | Spring MVC | Controllers |
| Database | JPA + Hibernate | Entities, Repositories |
| Security | Spring Security + JWT | security/ |
| Validation | Bean Validation | DTOs |
| Exception Handling | @RestControllerAdvice | exception/ |
| Queries | QueryDSL | Custom Repositories |
| Caching | Redis | CacheConfig |
| Logging | SLF4J + Logback | All layers |
| Audit | AOP Aspect | audit/aspect/ |
| Scheduling | @Scheduled | scheduler/ |
| Connection Pool | HikariCP | application.properties |
| Pagination | Spring Data | Pageable |
| Soft Delete | isDeleted flag | Entities |

This backend architecture provides a robust, scalable, and maintainable foundation for the DealerPro application.
