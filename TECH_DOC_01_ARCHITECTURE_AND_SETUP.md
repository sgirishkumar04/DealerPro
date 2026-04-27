# Technical Documentation Part 1: Architecture & Setup

## 1. Spring Boot + React Setup

### Overview
DealerPro is built using a modern full-stack architecture with Spring Boot backend and React frontend, providing a robust and scalable dealer management system.

### Backend Architecture

**Location**: `DealerPro_backend/`

**Technology Stack**:
- Spring Boot 3.x
- Java 17+
- Spring Data JPA
- Spring Security
- QueryDSL 5.1.0
- SQLite Database
- Maven Build Tool

**Main Application Class**:
```java
// Location: DealerPro_backend/src/main/java/com/kia/dms/DealerProApplication.java

package com.kia.dms;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableCaching          // Enables Redis caching
@EnableScheduling       // Enables scheduled tasks
public class DealerProApplication {
    public static void main(String[] args) {
        SpringApplication.run(DealerProApplication.class, args);
    }
}
```

**Key Features**:
- Auto-configuration for rapid development
- Component scanning for automatic bean detection
- Embedded Tomcat server (runs on port 8083)
- Redis caching enabled for performance
- Scheduled task support for background jobs

**Project Structure**:
```
DealerPro_backend/
├── src/main/java/com/kia/dms/
│   ├── config/              # Configuration classes
│   ├── security/            # Security & JWT
│   ├── modules/             # Business modules
│   │   ├── admin/          # Admin management
│   │   ├── auth/           # Authentication
│   │   ├── dealer/         # Dealer management
│   │   ├── inventory/      # Vehicle inventory
│   │   ├── sales/          # Sales orders
│   │   ├── service/        # Service orders
│   │   ├── leads/          # Leads & test drives
│   │   ├── parts/          # Parts management
│   │   ├── finance/        # Financial transactions
│   │   ├── analytics/      # Analytics & reports
│   │   └── audit/          # Audit logging
│   ├── common/             # Shared utilities
│   ├── exception/          # Exception handling
│   └── logging/            # Logging aspects
├── src/main/resources/
│   ├── application.properties  # Configuration
│   └── logback-spring.xml     # Logging config
└── pom.xml                 # Maven dependencies
```

### Frontend Architecture

**Location**: `DealerPro_frontend/`

**Technology Stack**:
- React 18
- TypeScript
- Vite (Build tool)
- Material-UI (MUI)
- React Query (Data fetching)
- React Router (Navigation)
- Zustand (State management)
- Axios (HTTP client)

**Main Entry Point**:
```typescript
// Location: DealerPro_frontend/src/main.tsx

import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import App from './App';
import './index.css';

// Configure React Query for data fetching
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,  // Don't refetch on window focus
      retry: 1,                      // Retry failed requests once
      staleTime: 5 * 60 * 1000,     // Data fresh for 5 minutes
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <App />
        <Toaster position="top-right" />  {/* Toast notifications */}
      </QueryClientProvider>
    </BrowserRouter>
  </React.StrictMode>
);
```

**Project Structure**:
```
DealerPro_frontend/
├── src/
│   ├── components/         # Reusable components
│   │   ├── layout/        # Layout components (Sidebar, Header)
│   │   └── common/        # Common UI components
│   ├── pages/             # Page components
│   │   ├── auth/          # Login, Register
│   │   ├── admin/         # Admin panel
│   │   ├── inventory/     # Vehicle inventory
│   │   ├── sales/         # Sales management
│   │   ├── service/       # Service orders
│   │   ├── leads/         # Leads & test drives
│   │   ├── parts/         # Parts management
│   │   ├── finance/       # Finance module
│   │   ├── analytics/     # Analytics dashboard
│   │   └── audit/         # Audit logs
│   ├── services/          # API service layer
│   ├── store/             # State management (Zustand)
│   ├── types/             # TypeScript type definitions
│   ├── utils/             # Utility functions
│   └── App.tsx            # Main app component
├── public/                # Static assets
└── package.json           # NPM dependencies
```

**App Component with Routing**:
```typescript
// Location: DealerPro_frontend/src/App.tsx

import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import Layout from './components/layout/Layout';
import LoginPage from './pages/auth/LoginPage';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/inventory/Inventory';
// ... other imports

function App() {
  const { user } = useAuthStore();

  // Protected route wrapper
  const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
    if (!user) {
      return <Navigate to="/login" replace />;
    }
    return <Layout>{children}</Layout>;
  };

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<LoginPage />} />
      
      {/* Protected routes */}
      <Route path="/dashboard" element={
        <ProtectedRoute><Dashboard /></ProtectedRoute>
      } />
      <Route path="/inventory" element={
        <ProtectedRoute><Inventory /></ProtectedRoute>
      } />
      {/* ... more routes */}
      
      {/* Default redirect */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default App;
```

---

## 2. Database Integration (SQLite & MySQL Support)

### Overview
DealerPro is designed with flexible database integration, supporting both SQLite for development/desktop deployment and MySQL for production environments. The application uses Spring Data JPA, making it database-agnostic and easy to switch between different database systems.

### Current Implementation: SQLite

**Location**: `DealerPro_backend/src/main/resources/application.properties`

```properties
# Database Configuration - SQLite (Current)
spring.datasource.url=jdbc:sqlite:D:/My Projects/DealerPro/db/DealerPro.db
spring.datasource.driver-class-name=org.sqlite.JDBC

# JPA/Hibernate Properties
spring.jpa.database-platform=org.hibernate.community.dialect.SQLiteDialect
spring.jpa.hibernate.ddl-auto=update
spring.jpa.show-sql=true
spring.jpa.properties.hibernate.format_sql=true
spring.jpa.properties.hibernate.use_sql_comments=true
```

**SQLite Benefits**:
- Zero configuration required
- Serverless (no separate database process)
- Single file database (easy backup/restore)
- Perfect for development and testing
- Lightweight and fast for small to medium datasets

### MySQL Integration (Production Ready)

**Configuration for MySQL**:

The application is fully prepared for MySQL integration. To switch to MySQL, simply update the configuration:

```properties
# Database Configuration - MySQL (Production)
spring.datasource.url=jdbc:mysql://localhost:3306/dealerpro_db?useSSL=false&serverTimezone=UTC
spring.datasource.username=root
spring.datasource.password=your_password
spring.datasource.driver-class-name=com.mysql.cj.jdbc.Driver

# JPA/Hibernate Properties for MySQL
spring.jpa.database-platform=org.hibernate.dialect.MySQL8Dialect
spring.jpa.hibernate.ddl-auto=update
spring.jpa.show-sql=true
spring.jpa.properties.hibernate.format_sql=true
spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.MySQL8Dialect
```

**MySQL Maven Dependency** (already in `pom.xml`):
```xml
<dependency>
    <groupId>com.mysql</groupId>
    <artifactId>mysql-connector-j</artifactId>
    <scope>runtime</scope>
</dependency>
```

**MySQL Benefits for Production**:
- **Scalability**: Handles large datasets and high concurrent users
- **ACID Compliance**: Full transaction support with proper isolation levels
- **Performance**: Optimized for read-heavy and write-heavy workloads
- **Replication**: Master-slave replication for high availability
- **Backup**: Advanced backup and recovery options
- **Security**: User authentication, role-based access, SSL connections
- **Indexing**: Advanced indexing strategies for query optimization
- **Clustering**: MySQL Cluster for distributed database architecture

### Database Migration Strategy

**Step 1: Export SQLite Data**
```sql
-- Export data from SQLite
.mode insert
.output dealerpro_export.sql
.dump
```

**Step 2: Create MySQL Database**
```sql
CREATE DATABASE dealerpro_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

**Step 3: Update Configuration**
- Change `application.properties` to MySQL configuration
- Update connection pool settings for production load

**Step 4: Run Application**
- Hibernate will auto-create tables based on entities
- Import data from SQLite export

### Database Abstraction Layer

**Location**: `DealerPro_backend/src/main/java/com/kia/dms/config/DatabaseConfig.java`

```java
@Configuration
@EnableJpaRepositories(basePackages = "com.kia.dms.modules")
@EnableTransactionManagement
public class DatabaseConfig {
    // JPA repositories work with both SQLite and MySQL
    // No code changes needed when switching databases
}
```

**Key Design Decisions**:
- **JPA/Hibernate**: Database-agnostic ORM
- **Standard SQL**: Queries work across databases
- **No Native Queries**: Avoid database-specific SQL
- **Dialect Configuration**: Hibernate handles database differences

**Explanation**:
- `spring.datasource.url`: Database connection URL (file path for SQLite, server URL for MySQL)
- `spring.jpa.hibernate.ddl-auto=update`: Auto-creates/updates tables based on entities
- `spring.jpa.show-sql=true`: Logs all SQL queries for debugging
- `spring.jpa.properties.hibernate.format_sql=true`: Pretty-prints SQL in logs
- Database platform/dialect: Tells Hibernate which SQL variant to use

### Database Configuration Class

**Location**: `DealerPro_backend/src/main/java/com/kia/dms/config/DatabaseConfig.java`

```java
package com.kia.dms.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.transaction.annotation.EnableTransactionManagement;

@Configuration
@EnableJpaRepositories(basePackages = "com.kia.dms.modules")
@EnableTransactionManagement
public class DatabaseConfig {
    // JPA repositories are automatically scanned from modules package
    // Transaction management is enabled for @Transactional annotations
}
```

### Database Schema

**Location**: `db/DealerPro.sql`

**Key Tables**:
1. `users` - User accounts with authentication
2. `dealers` - Dealer information
3. `vehicles` - Vehicle inventory
4. `kia_cars` - KIA car models catalog
5. `orders` - Sales orders
6. `service_orders` - Service appointments
7. `leads` - Customer leads
8. `test_drives` - Test drive bookings
9. `parts` - Parts inventory
10. `purchase_orders` - Parts purchase orders
11. `transactions` - Financial transactions
12. `audit_logs` - System audit trail
13. `login_attempts` - Failed login tracking

### Entity Example

**Location**: `DealerPro_backend/src/main/java/com/kia/dms/modules/dealer/entity/DealerEntity.java`

```java
package com.kia.dms.modules.dealer.entity;

import com.kia.dms.audit.BaseEntity;
import com.kia.dms.modules.user.entity.UserEntity;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "dealers")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode(callSuper = true)
public class DealerEntity extends BaseEntity {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(nullable = false, length = 100)
    private String dealerName;
    
    @Column(nullable = false, length = 200)
    private String address;
    
    @Column(nullable = false, length = 15)
    private String phone;
    
    @Column(nullable = false, length = 100)
    private String email;
    
    // Relationship: One dealer has one manager
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "manager_id", nullable = false)
    private UserEntity manager;
    
    // Audit fields inherited from BaseEntity:
    // - createdAt (LocalDateTime)
    // - updatedAt (LocalDateTime)
}
```

**Key Features**:
- `@Entity`: Marks class as JPA entity
- `@Table`: Maps to database table
- `@Id` + `@GeneratedValue`: Auto-increment primary key
- `@Column`: Column constraints (nullable, length)
- `@ManyToOne`: Foreign key relationship
- `@Data`: Lombok generates getters/setters
- Extends `BaseEntity` for audit timestamps

---

## 3. REST API Design

### Overview
DealerPro follows RESTful API design principles with consistent naming conventions, proper HTTP methods, and standardized response formats.

### API Naming Conventions

**Base URL**: `http://localhost:8083/api`

**Endpoint Structure**:
```
/api/{resource}              # Collection operations
/api/{resource}/{id}         # Single resource operations
/api/{resource}/{id}/{sub}   # Sub-resource operations
```

**Examples**:
```
GET    /api/dealers              # Get all dealers
GET    /api/dealers/{id}         # Get dealer by ID
POST   /api/dealers              # Create new dealer
PUT    /api/dealers/{id}         # Update dealer
DELETE /api/dealers/{id}         # Delete dealer
GET    /api/dealers/{id}/users   # Get users for dealer
```

### Controller Example

**Location**: `DealerPro_backend/src/main/java/com/kia/dms/modules/dealer/controller/DealerController.java`

```java
package com.kia.dms.modules.dealer.controller;

import com.kia.dms.common.response.ApiResponse;
import com.kia.dms.common.response.PaginationResponse;
import com.kia.dms.modules.dealer.entity.DealerEntity;
import com.kia.dms.modules.dealer.repository.DealerRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/dealers")
@RequiredArgsConstructor
@Tag(name = "Dealer Management", description = "APIs for managing dealers")
public class DealerController {

    private final DealerRepository dealerRepository;

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    @Operation(summary = "Get all dealers", description = "Retrieve paginated list of dealers")
    public ResponseEntity<ApiResponse<PaginationResponse<DealerEntity>>> getAllDealers(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size
    ) {
        Page<DealerEntity> dealerPage = dealerRepository.findAll(
            PageRequest.of(page, size)
        );
        
        PaginationResponse<DealerEntity> response = PaginationResponse.<DealerEntity>builder()
            .content(dealerPage.getContent())
            .page(dealerPage.getNumber())
            .size(dealerPage.getSize())
            .totalElements(dealerPage.getTotalElements())
            .totalPages(dealerPage.getTotalPages())
            .build();
        
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'DEALER')")
    @Operation(summary = "Get dealer by ID")
    public ResponseEntity<ApiResponse<DealerEntity>> getDealerById(@PathVariable Long id) {
        DealerEntity dealer = dealerRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Dealer not found with id: " + id));
        
        return ResponseEntity.ok(ApiResponse.success(dealer));
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Create a new dealer")
    public ResponseEntity<ApiResponse<DealerEntity>> createDealer(
            @Valid @RequestBody DealerEntity dealer
    ) {
        DealerEntity savedDealer = dealerRepository.save(dealer);
        return ResponseEntity
            .status(HttpStatus.CREATED)
            .body(ApiResponse.success(savedDealer));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Update dealer")
    public ResponseEntity<ApiResponse<DealerEntity>> updateDealer(
            @PathVariable Long id,
            @Valid @RequestBody DealerEntity dealer
    ) {
        DealerEntity existing = dealerRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Dealer not found"));
        
        existing.setDealerName(dealer.getDealerName());
        existing.setAddress(dealer.getAddress());
        existing.setPhone(dealer.getPhone());
        existing.setEmail(dealer.getEmail());
        
        DealerEntity updated = dealerRepository.save(existing);
        return ResponseEntity.ok(ApiResponse.success(updated));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Delete dealer")
    public ResponseEntity<ApiResponse<Void>> deleteDealer(@PathVariable Long id) {
        dealerRepository.deleteById(id);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
```

**Key Features**:
- `@RestController`: Combines @Controller + @ResponseBody
- `@RequestMapping`: Base path for all endpoints
- `@PreAuthorize`: Role-based access control
- `@Operation`: Swagger documentation
- HTTP methods: GET, POST, PUT, DELETE
- Pagination support with `@RequestParam`
- Validation with `@Valid`
- Standardized response with `ApiResponse`

### Standardized Response Format

**Location**: `DealerPro_backend/src/main/java/com/kia/dms/common/response/ApiResponse.java`

```java
package com.kia.dms.common.response;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ApiResponse<T> {
    private boolean success;
    private String message;
    private T data;
    
    public static <T> ApiResponse<T> success(T data) {
        return new ApiResponse<>(true, "Success", data);
    }
    
    public static <T> ApiResponse<T> success(String message, T data) {
        return new ApiResponse<>(true, message, data);
    }
    
    public static <T> ApiResponse<T> error(String message) {
        return new ApiResponse<>(false, message, null);
    }
}
```

**Response Examples**:
```json
// Success Response
{
  "success": true,
  "message": "Success",
  "data": {
    "id": 1,
    "dealerName": "ABC Motors",
    "address": "123 Main St",
    "phone": "555-1234",
    "email": "abc@motors.com"
  }
}

// Error Response
{
  "success": false,
  "message": "Dealer not found with id: 999",
  "data": null
}
```

---

## 4. OpenAPI / Swagger Documentation

### Overview
DealerPro uses SpringDoc OpenAPI for automatic API documentation generation, providing an interactive UI for testing endpoints.

### Configuration

**Location**: `DealerPro_backend/src/main/java/com/kia/dms/config/OpenApiConfig.java`

```java
package com.kia.dms.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.security.SecurityScheme;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.Components;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI customOpenAPI() {
        return new OpenAPI()
            .info(new Info()
                .title("DealerPro API")
                .version("1.0")
                .description("Dealer Management System REST API Documentation")
                .contact(new Contact()
                    .name("DealerPro Team")
                    .email("support@dealerpro.com")
                )
            )
            .components(new Components()
                .addSecuritySchemes("bearer-jwt", new SecurityScheme()
                    .type(SecurityScheme.Type.HTTP)
                    .scheme("bearer")
                    .bearerFormat("JWT")
                    .description("JWT token authentication")
                )
            )
            .addSecurityItem(new SecurityRequirement().addList("bearer-jwt"));
    }
}
```

**Properties Configuration**:
```properties
# Location: application.properties

# OpenAPI/Swagger Configuration
springdoc.api-docs.path=/api/v1/api-docs
springdoc.swagger-ui.path=/api/v1/swagger-ui.html
springdoc.swagger-ui.operationsSorter=method
springdoc.swagger-ui.tagsSorter=alpha
springdoc.swagger-ui.tryItOutEnabled=true
springdoc.swagger-ui.filter=true
springdoc.show-actuator=false
```

**Access Swagger UI**:
- URL: `http://localhost:8083/api/v1/swagger-ui.html`
- API Docs JSON: `http://localhost:8083/api/v1/api-docs`

**Features**:
- Interactive API testing
- JWT authentication support
- Request/response examples
- Schema definitions
- Try-it-out functionality
- Organized by tags (modules)

