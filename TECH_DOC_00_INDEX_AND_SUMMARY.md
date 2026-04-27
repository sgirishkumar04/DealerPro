# DealerPro Technical Documentation - Index & Summary

## Documentation Structure

This technical documentation is organized into 5 comprehensive parts, each covering 3-4 related functionalities with detailed code examples and explanations.

### 📚 Documentation Files

1. **TECH_DOC_01_ARCHITECTURE_AND_SETUP.md**
   - Spring Boot + React Setup
   - Database Integration (SQLite)
   - REST API Design
   - OpenAPI / Swagger Documentation

2. **TECH_DOC_02_CRUD_VALIDATION_EXCEPTIONS.md**
   - CRUD Operations (Create, Read, Update, Delete)
   - Validation (Server-side & Client-side)
   - Exception Handling
   - Global Exception Handler

3. **TECH_DOC_03_PAGINATION_AUDIT_UIUX.md**
   - Pagination & Sorting (Server-side & Client-side)
   - Audit Fields (Created At, Updated At)
   - Dynamic Dropdowns / Linked Dropdown
   - UI/UX Patterns (Consistency, Responsive, Shortcuts, Feedback)

4. **TECH_DOC_04_SECURITY_AUTHENTICATION.md**
   - Authentication & Authorization
   - Password Hashing (BCrypt)
   - User Management & Role Management
   - Account Lock after 5 Unsuccessful Attempts

5. **TECH_DOC_05_QUERYDSL_POOLING_LOGGING.md**
   - Spring Service - QueryDSL
   - DB Connection Pooling (HikariCP)
   - Configuration Management (Key-Value Configuration)
   - Logging (SLF4J / Logback)

---

## Quick Reference Guide

### Technology Stack

**Backend:**
- Spring Boot 3.x
- Java 17+
- Spring Data JPA
- Spring Security
- QueryDSL 5.1.0
- SQLite Database
- JWT Authentication
- BCrypt Password Hashing
- HikariCP Connection Pool
- SLF4J + Logback Logging

**Frontend:**
- React 18
- TypeScript
- Vite
- Material-UI (MUI)
- React Query
- React Router
- Zustand (State Management)
- Axios (HTTP Client)

---

## Implementation Status Summary

### ✅ Fully Implemented (18/25 - 72%)

1. **Spring Boot + React Setup** - Full-stack architecture with modular design
2. **REST API Design** - RESTful endpoints with consistent naming
3. **CRUD Operations** - Complete CRUD for all modules
4. **Validation** - Server-side (Bean Validation) and client-side validation
5. **Exception Handling** - Custom exceptions with global handler
6. **Global Exception Handler** - Centralized error handling with `@RestControllerAdvice`
7. **Pagination & Sorting** - Server-side and client-side implementations
8. **Dynamic Dropdowns** - Cascading dropdowns (Model → Variant → Color)
9. **Audit Fields** - Automatic timestamps (createdAt, updatedAt)
10. **UI/UX Patterns** - Consistent design, responsive, keyboard shortcuts, feedback
11. **Authentication & Authorization** - JWT-based with role-based access control
12. **Password Hashing** - BCrypt with salt
13. **User Management** - Full CRUD with role assignment
14. **Role Management** - ADMIN, MANAGER, DEALER roles
15. **Account Lock** - After 5 failed attempts, 5-minute lock duration
16. **JWT Authentication** - Token-based stateless authentication
17. **Method-level Security** - `@PreAuthorize` annotations
18. **QueryDSL** - Type-safe queries with dynamic filtering
19. **DB Connection Pooling** - HikariCP with optimized configuration
20. **Configuration Management** - `@ConfigurationProperties` pattern
21. **Logging** - SLF4J + Logback with AOP-based method logging
22. **OpenAPI/Swagger** - Interactive API documentation

### ⚠️ Partially Implemented (3/25 - 12%)

1. **Database Indexing** - Only automatic indexes (primary keys, foreign keys)
2. **Audit Fields** - Timestamps only (no createdBy/updatedBy user tracking)
3. **REST API Versioning** - No `/v1/` or `/v2/` versioning

### ❌ Not Implemented (4/25 - 16%)

1. **MySQL Integration** - Using SQLite instead
2. **Transaction Isolation** - No explicit configuration (relies on SQLite defaults)
3. **Multiple Roles per User** - Single role only
4. **Account Expiration** - No expiration date field
5. **Menu Management** - Hardcoded role checks, no dynamic menu system
6. **Drag-and-drop UI** - Not implemented

---

## Key File Locations

### Backend Structure
```
DealerPro_backend/
├── src/main/java/com/kia/dms/
│   ├── DealerProApplication.java          # Main application class
│   ├── config/
│   │   ├── SecurityConfig.java            # Security configuration
│   │   ├── DatabaseConfig.java            # Database configuration
│   │   ├── QueryDslConfig.java            # QueryDSL configuration
│   │   ├── OpenApiConfig.java             # Swagger configuration
│   │   └── properties/                    # Configuration properties
│   ├── security/
│   │   ├── JwtTokenProvider.java          # JWT token generation/validation
│   │   ├── JwtAuthenticationFilter.java   # JWT filter
│   │   └── CustomUserDetailsService.java  # User details service
│   ├── modules/
│   │   ├── auth/                          # Authentication module
│   │   ├── admin/                         # Admin management
│   │   ├── dealer/                        # Dealer management
│   │   ├── inventory/                     # Vehicle inventory
│   │   ├── sales/                         # Sales orders
│   │   ├── service/                       # Service orders
│   │   ├── leads/                         # Leads & test drives
│   │   ├── parts/                         # Parts management
│   │   ├── finance/                       # Financial transactions
│   │   ├── analytics/                     # Analytics & reports
│   │   └── audit/                         # Audit logging
│   ├── common/
│   │   └── response/                      # API response DTOs
│   ├── exception/
│   │   ├── GlobalExceptionHandler.java    # Global exception handler
│   │   ├── ResourceNotFoundException.java # Custom exceptions
│   │   └── AccountLockedException.java
│   ├── audit/
│   │   └── BaseEntity.java                # Base entity with audit fields
│   └── logging/
│       └── LoggingAspect.java             # AOP logging
├── src/main/resources/
│   ├── application.properties             # Application configuration
│   └── logback-spring.xml                 # Logging configuration
└── pom.xml                                # Maven dependencies
```

### Frontend Structure
```
DealerPro_frontend/
├── src/
│   ├── main.tsx                           # Application entry point
│   ├── App.tsx                            # Main app component with routing
│   ├── components/
│   │   └── layout/
│   │       ├── Sidebar.tsx                # Navigation sidebar
│   │       └── Layout.tsx                 # Main layout wrapper
│   ├── pages/
│   │   ├── auth/
│   │   │   └── LoginPage.tsx              # Login page
│   │   ├── admin/                         # Admin panel
│   │   ├── inventory/                     # Vehicle inventory
│   │   ├── sales/                         # Sales management
│   │   ├── service/                       # Service orders
│   │   ├── leads/                         # Leads & test drives
│   │   ├── parts/                         # Parts management
│   │   ├── finance/                       # Finance module
│   │   ├── analytics/                     # Analytics dashboard
│   │   └── audit/                         # Audit logs
│   ├── services/
│   │   └── api.ts                         # Axios API client
│   ├── store/
│   │   └── authStore.ts                   # Zustand auth store
│   ├── types/                             # TypeScript type definitions
│   └── utils/                             # Utility functions
└── package.json                           # NPM dependencies
```

---

## API Endpoints Overview

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration

### Admin
- `GET /api/admin/users` - Get all users
- `POST /api/admin/users` - Create user
- `PATCH /api/admin/users/{id}/role` - Update user role
- `DELETE /api/admin/users/{id}` - Delete user

### Dealers
- `GET /api/dealers` - Get all dealers (paginated)
- `GET /api/dealers/{id}` - Get dealer by ID
- `POST /api/dealers` - Create dealer
- `PUT /api/dealers/{id}` - Update dealer
- `DELETE /api/dealers/{id}` - Delete dealer

### Inventory
- `GET /api/vehicles` - Get all vehicles (paginated)
- `GET /api/vehicles/{id}` - Get vehicle by ID
- `POST /api/vehicles` - Create vehicle
- `PUT /api/vehicles/{id}` - Update vehicle
- `DELETE /api/vehicles/{id}` - Delete vehicle

### Sales
- `GET /api/orders` - Get all orders (paginated, sorted)
- `GET /api/orders/{id}` - Get order by ID
- `POST /api/orders` - Create order
- `PUT /api/orders/{id}` - Update order
- `DELETE /api/orders/{id}` - Delete order

### Service
- `GET /api/service-orders` - Get all service orders
- `POST /api/service-orders` - Create service order
- `PUT /api/service-orders/{id}` - Update service order

### Leads
- `GET /api/leads` - Get all leads
- `POST /api/leads` - Create lead
- `PUT /api/leads/{id}` - Update lead

### Test Drives
- `GET /api/test-drives` - Get all test drives
- `POST /api/test-drives` - Schedule test drive
- `PUT /api/test-drives/{id}` - Update test drive

### Parts
- `GET /api/parts` - Get all parts
- `POST /api/parts` - Create part
- `PUT /api/parts/{id}` - Update part

### Audit Logs
- `GET /api/audit-logs` - Get all audit logs (paginated)

---

## Database Schema

### Core Tables

1. **users** - User accounts
   - id, username, password, email, firstName, lastName, role
   - failedLoginAttempts, accountLockedUntil, lastFailedLogin
   - createdAt, updatedAt

2. **dealers** - Dealer information
   - id, dealerName, address, phone, email, manager_id
   - createdAt, updatedAt

3. **vehicles** - Vehicle inventory
   - id, kia_car_id, dealer_id, status, price, mileage, color
   - createdAt, updatedAt

4. **kia_cars** - KIA car models catalog
   - id, modelName, variant, fuelType, transmission, price

5. **orders** - Sales orders
   - id, orderNumber, vehicle_id, dealer_id, customerName, totalAmount, status
   - createdAt, updatedAt

6. **service_orders** - Service appointments
   - id, vehicle_id, dealer_id, serviceType, status, estimatedCost
   - scheduledDate, createdAt, updatedAt

7. **leads** - Customer leads
   - id, firstName, lastName, email, phone, dealer_id, status
   - createdAt, updatedAt

8. **test_drives** - Test drive bookings
   - id, lead_id, vehicle_id, dealer_id, scheduledAt, status
   - createdAt, updatedAt

9. **parts** - Parts inventory
   - id, partName, partNumber, quantity, price, supplier
   - createdAt, updatedAt

10. **audit_logs** - System audit trail
    - id, entityName, entityId, action, performedBy, performedByRole
    - performedAt, description, createdAt, updatedAt

11. **login_attempts** - Failed login tracking
    - id, email, attemptTime, ipAddress, successful

---

## Security Features

### Authentication Flow
1. User submits credentials to `/api/auth/login`
2. Backend validates credentials (BCrypt password verification)
3. If valid, generates JWT token (30-minute expiration)
4. Token returned to client
5. Client stores token (localStorage/sessionStorage)
6. Client includes token in Authorization header: `Bearer <token>`
7. Backend validates token on each request
8. Sets authentication in SecurityContext

### Authorization Levels
- **ADMIN**: Full system access
- **MANAGER**: Manage dealers, view analytics
- **DEALER**: Manage own inventory and sales

### Account Lock Mechanism
1. Track failed login attempts per user
2. After 5 failed attempts, lock account for 5 minutes
3. Store lock expiration time in database
4. Check lock status on each login attempt
5. Auto-unlock after timeout expires
6. Reset counter on successful login

---

## Performance Optimizations

1. **Connection Pooling**: HikariCP with 10 max connections
2. **Caching**: Redis caching for frequently accessed data
3. **Pagination**: Server-side pagination to limit data transfer
4. **Lazy Loading**: JPA lazy loading for relationships
5. **Query Optimization**: QueryDSL for efficient queries
6. **Indexing**: Automatic indexes on primary and foreign keys
7. **Stateless Sessions**: JWT tokens (no server-side sessions)

---

## Monitoring & Debugging

### Logging Levels
- **Production**: INFO level
- **Development**: DEBUG level
- **SQL Debugging**: DEBUG for Hibernate SQL

### Log Files
- Location: `DealerPro_backend/logs/`
- Current: `dms-application.log`
- Archived: `dms-application.YYYY-MM-DD.log`
- Retention: 30 days
- Max Size: 1GB total

### Swagger UI
- URL: `http://localhost:8083/api/v1/swagger-ui.html`
- Test endpoints interactively
- View request/response schemas
- JWT authentication support

---

## Development Workflow

### Backend Development
1. Create entity class with `@Entity`
2. Create repository interface extending `JpaRepository`
3. Create service class with business logic
4. Create controller with REST endpoints
5. Add validation annotations to DTOs
6. Test with Swagger UI

### Frontend Development
1. Create page component
2. Define TypeScript types
3. Create API service functions
4. Use React Query for data fetching
5. Implement form with validation
6. Add toast notifications for feedback

---

## Testing Recommendations

### Backend Testing
- Unit tests for service layer
- Integration tests for repositories
- API tests for controllers
- Security tests for authentication

### Frontend Testing
- Component tests with React Testing Library
- Integration tests for user flows
- E2E tests with Cypress/Playwright

---

## Deployment Considerations

### Backend
- Build: `mvn clean package`
- Run: `java -jar target/dealerpro-backend.jar`
- Port: 8083
- Database: SQLite file at configured path

### Frontend
- Build: `npm run build`
- Output: `dist/` folder
- Serve with Nginx or Apache
- Environment variables for API URL

---

## Future Enhancements

1. **MySQL Migration**: Switch from SQLite to MySQL for production
2. **API Versioning**: Implement `/v1/`, `/v2/` versioning
3. **Multiple Roles**: Support multiple roles per user
4. **Account Expiration**: Add expiration date functionality
5. **Dynamic Menu Management**: Database-driven menu system
6. **Optimistic Locking**: Add `@Version` fields to entities
7. **Drag-and-drop UI**: Implement for better UX
8. **Custom Indexes**: Add indexes for frequently queried columns
9. **User Audit Tracking**: Add createdBy/updatedBy fields
10. **Real-time Notifications**: WebSocket for live updates

---

## Presentation Tips

### For Technical Interview/Presentation

1. **Start with Architecture**: Explain the full-stack setup
2. **Show Code Examples**: Use the documentation to demonstrate key features
3. **Explain Design Decisions**: Why JWT? Why QueryDSL? Why HikariCP?
4. **Demonstrate Security**: Show authentication flow and account lock
5. **Highlight Best Practices**: Validation, exception handling, logging
6. **Show Live Demo**: Use Swagger UI to test endpoints
7. **Discuss Scalability**: Connection pooling, caching, pagination
8. **Mention Future Improvements**: Show awareness of limitations

### Key Points to Emphasize

- **Type Safety**: QueryDSL, TypeScript
- **Security**: JWT, BCrypt, role-based access control
- **Performance**: Connection pooling, caching, pagination
- **Maintainability**: Modular architecture, clean code, logging
- **User Experience**: Validation, error handling, feedback
- **Best Practices**: REST API design, exception handling, audit logging

---

## Contact & Support

For questions or clarifications about this documentation, refer to the specific documentation files for detailed code examples and explanations.

**Documentation Version**: 1.0  
**Last Updated**: April 5, 2026  
**Project**: DealerPro - Dealer Management System

