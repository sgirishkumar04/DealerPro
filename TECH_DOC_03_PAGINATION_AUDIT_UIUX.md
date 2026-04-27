# Technical Documentation Part 3: Pagination, Audit Fields & UI/UX

## 1. Pagination & Sorting (Server-side & Client-side)

### Server-side Pagination

**Overview**: Spring Data JPA provides built-in pagination support through the `Pageable` interface, allowing efficient data retrieval with page number, size, and sorting.

**Location**: `DealerPro_backend/src/main/java/com/kia/dms/modules/sales/controller/OrderController.java`

```java
package com.kia.dms.modules.sales.controller;

import com.kia.dms.common.response.ApiResponse;
import com.kia.dms.common.response.PaginationResponse;
import com.kia.dms.modules.sales.dto.response.OrderResponse;
import com.kia.dms.modules.sales.service.OrderService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/orders")
@RequiredArgsConstructor
public class OrderController {

    private final OrderService orderService;

    @GetMapping
    public ResponseEntity<ApiResponse<PaginationResponse<OrderResponse>>> getAllOrders(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "id") String sortBy,
            @RequestParam(defaultValue = "DESC") String sortDir
    ) {
        // Create Sort object
        Sort sort = sortDir.equalsIgnoreCase("ASC") 
            ? Sort.by(sortBy).ascending() 
            : Sort.by(sortBy).descending();
        
        // Create Pageable object
        Pageable pageable = PageRequest.of(page, size, sort);
        
        // Fetch paginated data
        Page<OrderResponse> orderPage = orderService.getAllOrders(pageable);
        
        // Build pagination response
        PaginationResponse<OrderResponse> response = PaginationResponse.<OrderResponse>builder()
            .content(orderPage.getContent())           // List of items
            .page(orderPage.getNumber())               // Current page (0-indexed)
            .size(orderPage.getSize())                 // Page size
            .totalElements(orderPage.getTotalElements()) // Total items
            .totalPages(orderPage.getTotalPages())     // Total pages
            .first(orderPage.isFirst())                // Is first page?
            .last(orderPage.isLast())                  // Is last page?
            .build();
        
        return ResponseEntity.ok(ApiResponse.success(response));
    }
}
```

**Pagination Response DTO**:

**Location**: `DealerPro_backend/src/main/java/com/kia/dms/common/response/PaginationResponse.java`

```java
package com.kia.dms.common.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PaginationResponse<T> {
    private List<T> content;        // List of items for current page
    private int page;               // Current page number (0-indexed)
    private int size;               // Number of items per page
    private long totalElements;     // Total number of items across all pages
    private int totalPages;         // Total number of pages
    private boolean first;          // Is this the first page?
    private boolean last;           // Is this the last page?
}
```

**Service Layer with Pagination**:

**Location**: `DealerPro_backend/src/main/java/com/kia/dms/modules/sales/service/OrderService.java`

```java
package com.kia.dms.modules.sales.service;

import com.kia.dms.modules.sales.dto.response.OrderResponse;
import com.kia.dms.modules.sales.entity.OrderEntity;
import com.kia.dms.modules.sales.mapper.OrderMapper;
import com.kia.dms.modules.sales.repository.OrderRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class OrderService {

    private final OrderRepository orderRepository;
    private final OrderMapper orderMapper;

    public Page<OrderResponse> getAllOrders(Pageable pageable) {
        // Repository automatically handles pagination
        Page<OrderEntity> orderPage = orderRepository.findAll(pageable);
        
        // Map entities to DTOs while preserving pagination metadata
        return orderPage.map(orderMapper::toResponse);
    }
    
    // Custom pagination with filtering
    public Page<OrderResponse> getOrdersByStatus(String status, Pageable pageable) {
        Page<OrderEntity> orderPage = orderRepository.findByStatus(status, pageable);
        return orderPage.map(orderMapper::toResponse);
    }
}
```

**Repository with Pagination**:

```java
package com.kia.dms.modules.sales.repository;

import com.kia.dms.modules.sales.entity.OrderEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface OrderRepository extends JpaRepository<OrderEntity, Long> {
    
    // Spring Data JPA automatically implements pagination
    // Just add Pageable parameter to any query method
    
    Page<OrderEntity> findByStatus(String status, Pageable pageable);
    
    Page<OrderEntity> findByDealerId(Long dealerId, Pageable pageable);
}
```

### Client-side Pagination

**Location**: `DealerPro_frontend/src/pages/sales/Sales.tsx`

```typescript
import { useState, useMemo } from 'react';
import { useQuery } from '@tantml:parameter>
<parameter name="query';
import { DataGrid, GridColDef, GridPaginationModel } from '@mui/x-data-grid';
import { Box, Typography } from '@mui/material';
import api from '../../services/api';

export default function Sales() {
  // Pagination state
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
    page: 0,
    pageSize: 25,
  });
  
  // Sorting state
  const [sortModel, setSortModel] = useState([
    { field: 'createdAt', sort: 'desc' as const }
  ]);

  // Fetch data with pagination and sorting
  const { data, isLoading } = useQuery({
    queryKey: ['orders', paginationModel.page, paginationModel.pageSize, sortModel],
    queryFn: async () => {
      const sortField = sortModel[0]?.field || 'id';
      const sortDir = sortModel[0]?.sort?.toUpperCase() || 'DESC';
      
      const { data } = await api.get('/api/orders', {
        params: {
          page: paginationModel.page,
          size: paginationModel.pageSize,
          sortBy: sortField,
          sortDir: sortDir
        }
      });
      return data.data;
    },
  });

  // DataGrid columns
  const columns: GridColDef[] = [
    { field: 'id', headerName: 'Order ID', width: 100 },
    { field: 'orderNumber', headerName: 'Order #', width: 150 },
    { field: 'customerName', headerName: 'Customer', width: 200 },
    { field: 'totalAmount', headerName: 'Amount', width: 120, type: 'number' },
    { field: 'status', headerName: 'Status', width: 120 },
    { field: 'createdAt', headerName: 'Date', width: 180 },
  ];

  return (
    <Box sx={{ height: 'calc(100vh - 200px)', width: '100%' }}>
      <Typography variant="h5" sx={{ mb: 2 }}>Sales Orders</Typography>
      
      <DataGrid
        rows={data?.content || []}
        columns={columns}
        loading={isLoading}
        
        // Pagination configuration
        paginationMode="server"  // Server-side pagination
        paginationModel={paginationModel}
        onPaginationModelChange={setPaginationModel}
        pageSizeOptions={[10, 25, 50, 100]}
        rowCount={data?.totalElements || 0}
        
        // Sorting configuration
        sortingMode="server"  // Server-side sorting
        sortModel={sortModel}
        onSortModelChange={setSortModel}
        
        // Other configurations
        disableRowSelectionOnClick
        sx={{
          '& .MuiDataGrid-row:hover': { bgcolor: '#f1f5f9' },
        }}
      />
    </Box>
  );
}
```

**Client-side Pagination (Alternative)**:

```typescript
// For smaller datasets, use client-side pagination
export default function AuditLogs() {
  const [activeFilters, setActiveFilters] = useState<ActiveFilter[]>([]);
  const [activeSorts, setActiveSorts] = useState<ActiveSort[]>([]);

  // Fetch all data once
  const { data, isLoading } = useQuery({
    queryKey: ['auditLogs'],
    queryFn: async () => {
      const { data } = await api.get('/api/audit-logs?page=0&size=10000');
      return data.data;
    },
  });

  // Apply filters and sorting on client-side
  const processedRows = useMemo(() => {
    const raw: any[] = data?.content || [];
    
    // Apply filters
    const filtered = activeFilters.length > 0
      ? raw.filter(row => activeFilters.every(f => applyFilter(row, f)))
      : raw;
    
    // Apply sorting
    return applySort(filtered, activeSorts);
  }, [data, activeFilters, activeSorts]);

  return (
    <DataGrid
      rows={processedRows}
      columns={columns}
      loading={isLoading}
      paginationMode="client"  // Client-side pagination
      pageSizeOptions={[10, 25, 50, 100]}
      initialState={{
        pagination: { paginationModel: { pageSize: 25 } }
      }}
    />
  );
}
```

**Key Features**:
- Server-side: Efficient for large datasets, reduces memory usage
- Client-side: Better for small datasets, instant filtering/sorting
- `paginationMode="server"`: Fetches data per page
- `paginationMode="client"`: Loads all data once
- `sortingMode="server"`: Sorting done by database
- `sortingMode="client"`: Sorting done in browser

---

## 2. Audit Fields (Created By, Created Time, Updated By, Updated Time)

### Base Entity with Audit Fields

**Location**: `DealerPro_backend/src/main/java/com/kia/dms/audit/BaseEntity.java`

```java
package com.kia.dms.audit;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@MappedSuperclass
@Data
public abstract class BaseEntity {
    
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
    
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
    
    // Automatically set timestamps before persist
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }
    
    // Automatically update timestamp before update
    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
```

**Key Features**:
- `@MappedSuperclass`: Not an entity itself, but provides fields to subclasses
- `@Column(updatable = false)`: `createdAt` cannot be modified after creation
- `@PrePersist`: JPA callback executed before INSERT
- `@PreUpdate`: JPA callback executed before UPDATE
- Automatic timestamp management

### Entity Using Base Entity

**Location**: `DealerPro_backend/src/main/java/com/kia/dms/modules/service/entity/ServiceOrderEntity.java`

```java
package com.kia.dms.modules.service.entity;

import com.kia.dms.audit.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "service_orders")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode(callSuper = true)  // Include parent fields in equals/hashCode
public class ServiceOrderEntity extends BaseEntity {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(nullable = false)
    private String serviceType;
    
    @Column(nullable = false)
    private String status;
    
    private Double estimatedCost;
    
    // Inherits from BaseEntity:
    // - createdAt (LocalDateTime)
    // - updatedAt (LocalDateTime)
    // - onCreate() method
    // - onUpdate() method
}
```

### Audit Logging System

**Location**: `DealerPro_backend/src/main/java/com/kia/dms/modules/audit/entity/AuditLogEntity.java`

```java
package com.kia.dms.modules.audit.entity;

import com.kia.dms.audit.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "audit_logs")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode(callSuper = true)
public class AuditLogEntity extends BaseEntity {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(nullable = false)
    private String entityName;      // e.g., "Dealer", "Vehicle"
    
    @Column(nullable = false)
    private Long entityId;          // ID of the modified entity
    
    @Column(nullable = false)
    private String action;          // CREATE, UPDATE, DELETE
    
    @Column(nullable = false)
    private String performedBy;     // Username who performed action
    
    @Column(nullable = false)
    private String performedByRole; // Role of the user
    
    @Column(nullable = false)
    private LocalDateTime performedAt;  // When action was performed
    
    @Column(length = 2000)
    private String description;     // Detailed description of changes
    
    private String ipAddress;       // IP address of the user
}
```

### Audit Aspect (AOP)

**Location**: `DealerPro_backend/src/main/java/com/kia/dms/modules/audit/aspect/AuditAspect.java`

```java
package com.kia.dms.modules.audit.aspect;

import com.kia.dms.modules.audit.entity.AuditLogEntity;
import com.kia.dms.modules.audit.repository.AuditLogRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.aspectj.lang.JoinPoint;
import org.aspectj.lang.annotation.*;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

@Aspect
@Component
@RequiredArgsConstructor
@Slf4j
public class AuditAspect {

    private final AuditLogRepository auditLogRepository;

    // Audit CREATE operations
    @AfterReturning(
        pointcut = "execution(* com.kia.dms.modules.*.service.*Service.create*(..))",
        returning = "result"
    )
    public void auditCreate(JoinPoint joinPoint, Object result) {
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            String username = auth != null ? auth.getName() : "SYSTEM";
            String role = auth != null && !auth.getAuthorities().isEmpty() 
                ? auth.getAuthorities().iterator().next().getAuthority() 
                : "UNKNOWN";
            
            AuditLogEntity auditLog = AuditLogEntity.builder()
                .entityName(extractEntityName(joinPoint))
                .entityId(extractEntityId(result))
                .action("CREATE")
                .performedBy(username)
                .performedByRole(role)
                .performedAt(LocalDateTime.now())
                .description(buildDescription("Created", joinPoint, result))
                .build();
            
            auditLogRepository.save(auditLog);
            log.info("Audit log created for CREATE operation by {}", username);
        } catch (Exception e) {
            log.error("Failed to create audit log", e);
        }
    }

    // Audit UPDATE operations
    @AfterReturning(
        pointcut = "execution(* com.kia.dms.modules.*.service.*Service.update*(..))",
        returning = "result"
    )
    public void auditUpdate(JoinPoint joinPoint, Object result) {
        // Similar to auditCreate but with action="UPDATE"
    }

    // Audit DELETE operations
    @AfterReturning(
        pointcut = "execution(* com.kia.dms.modules.*.service.*Service.delete*(..))"
    )
    public void auditDelete(JoinPoint joinPoint) {
        // Similar to auditCreate but with action="DELETE"
    }

    private String extractEntityName(JoinPoint joinPoint) {
        String className = joinPoint.getSignature().getDeclaringTypeName();
        return className.substring(className.lastIndexOf('.') + 1)
            .replace("Service", "");
    }

    private Long extractEntityId(Object result) {
        // Extract ID from result object using reflection
        try {
            return (Long) result.getClass().getMethod("getId").invoke(result);
        } catch (Exception e) {
            return null;
        }
    }

    private String buildDescription(String action, JoinPoint joinPoint, Object result) {
        return String.format("%s %s with ID: %s", 
            action, 
            extractEntityName(joinPoint), 
            extractEntityId(result)
        );
    }
}
```

**Key Features**:
- `@Aspect`: Marks class as AOP aspect
- `@AfterReturning`: Executes after successful method execution
- Pointcut expressions target service layer methods
- Captures user information from Spring Security context
- Automatic audit trail for all CRUD operations
- Exception handling to prevent audit failures from breaking business logic

---

## 3. Dynamic Dropdowns / Linked Dropdown

### Overview
Cascading dropdowns where the options in one dropdown depend on the selection in another dropdown.

**Example**: Test Drive Form - Model → Variant → Color

**Location**: `DealerPro_frontend/src/pages/leads/TestDrive.tsx`

```typescript
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Autocomplete, TextField } from '@mui/material';
import api from '../../services/api';

export default function TestDriveForm() {
  // State for cascading selections
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<any>(null);

  // Fetch all KIA car models
  const { data: kiaCars = [] } = useQuery<any[]>({
    queryKey: ['kia-cars'],
    queryFn: async () => {
      const { data } = await api.get('/api/kia-cars');
      return data.data;
    },
    staleTime: Infinity,  // Cache indefinitely
  });

  // Step 1: Get unique model names
  const uniqueModels = Array.from(
    new Set(kiaCars.map((c: any) => c.modelName))
  ).sort();

  // Step 2: Get variants for selected model
  const variantsForModel = selectedModel
    ? Array.from(
        new Set(
          kiaCars
            .filter((c: any) => c.modelName === selectedModel)
            .map((c: any) => c.variant)
        )
      ).sort()
    : [];

  // Step 3: Get colors for selected model and variant
  const colorsForVariant = (selectedModel && selectedVariant)
    ? kiaCars
        .filter((c: any) => 
          c.modelName === selectedModel && 
          c.variant === selectedVariant
        )
        .sort((a: any, b: any) => a.color.localeCompare(b.color))
    : [];

  // Reset dependent dropdowns when parent changes
  useEffect(() => {
    setSelectedVariant(null);
    setSelectedVehicle(null);
  }, [selectedModel]);

  useEffect(() => {
    setSelectedVehicle(null);
  }, [selectedVariant]);

  return (
    <form>
      {/* Level 1: Model Selection */}
      <Autocomplete
        options={uniqueModels}
        value={selectedModel}
        onChange={(_, newValue) => setSelectedModel(newValue)}
        renderInput={(params) => (
          <TextField {...params} label="Select Model" required />
        )}
      />

      {/* Level 2: Variant Selection (depends on Model) */}
      <Autocomplete
        options={variantsForModel}
        value={selectedVariant}
        onChange={(_, newValue) => setSelectedVariant(newValue)}
        disabled={!selectedModel}  // Disabled until model is selected
        renderInput={(params) => (
          <TextField 
            {...params} 
            label="Select Variant" 
            required 
            helperText={!selectedModel ? "Please select a model first" : ""}
          />
        )}
      />

      {/* Level 3: Color Selection (depends on Model + Variant) */}
      <Autocomplete
        options={colorsForVariant}
        getOptionLabel={(option) => `${option.color} - ₹${option.price.toLocaleString()}`}
        value={selectedVehicle}
        onChange={(_, newValue) => setSelectedVehicle(newValue)}
        disabled={!selectedVariant}  // Disabled until variant is selected
        renderInput={(params) => (
          <TextField 
            {...params} 
            label="Select Color" 
            required 
            helperText={!selectedVariant ? "Please select a variant first" : ""}
          />
        )}
        renderOption={(props, option) => (
          <li {...props} key={option.id}>
            <div>
              <div>{option.color}</div>
              <div style={{ fontSize: '0.85rem', color: '#666' }}>
                ₹{option.price.toLocaleString()} • {option.fuelType}
              </div>
            </div>
          </li>
        )}
      />
    </form>
  );
}
```

**Key Features**:
- Three-level cascading: Model → Variant → Color
- Options filtered based on parent selection
- Automatic reset of child dropdowns when parent changes
- Disabled state for dependent dropdowns
- Helper text to guide users
- Rich option display with additional information

---

## 4. UI/UX Patterns

### Consistency

**Design System**: Kia branding colors and consistent styling

**Location**: `DealerPro_frontend/src/components/layout/Sidebar.tsx`

```typescript
// Consistent color scheme across the application
const KIA_MIDNIGHT_BLACK = '#0a0f1e';
const KIA_ACCENT = '#C8102E';
const KIA_HOVER_BG = '#1a2236';
const KIA_ACTIVE_BG = '#C8102E';
const KIA_TEXT = '#e2e8f0';
const KIA_TEXT_MUTED = '#64748b';
const KIA_BORDER = '#1e2d45';
```

### Responsive Design

**Location**: `DealerPro_frontend/src/pages/sales/Sales.tsx`

```typescript
<Box sx={{ 
  height: 'calc(100vh - 220px)',  // Dynamic height
  minHeight: 400,                  // Minimum height
  width: '100%'                    // Full width
}}>
  <DataGrid
    rows={data?.content || []}
    columns={columns}
    sx={{
      // Responsive column widths
      '& .MuiDataGrid-columnHeader': {
        minWidth: { xs: 100, sm: 150, md: 200 }
      },
      // Mobile-friendly row height
      '& .MuiDataGrid-row': {
        minHeight: { xs: '60px', md: '52px' }
      }
    }}
  />
</Box>
```

### Keyboard Shortcuts

**Location**: `DealerPro_frontend/src/components/layout/Sidebar.tsx`

```typescript
// Global keyboard shortcuts
useEffect(() => {
  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.ctrlKey && event.key === 'm') {
      event.preventDefault();
      navigate('/test-drives');  // Ctrl+M: Test Drives
    } else if (event.ctrlKey && event.key === 'o') {
      event.preventDefault();
      navigate('/audit-logs');   // Ctrl+O: Audit Logs
    }
  };

  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [navigate]);
```

**Location**: `DealerPro_frontend/src/pages/audit/AuditLogs.tsx`

```typescript
// Module-specific shortcuts
useEffect(() => {
  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.ctrlKey && event.key === 'u') {
      event.preventDefault();
      setToolbarOpen(prev => !prev);  // Ctrl+U: Toggle filters
    }
  };

  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, []);
```

### Feedback (Toast Notifications)

**Location**: `DealerPro_frontend/src/pages/inventory/Inventory.tsx`

```typescript
import toast from 'react-hot-toast';

// Success feedback
const createMutation = useMutation({
  mutationFn: async (data: any) => {
    const response = await api.post('/api/vehicles', data);
    return response.data.data;
  },
  onSuccess: () => {
    toast.success('Vehicle created successfully!', {
      duration: 3000,
      position: 'top-right',
      icon: '✅',
    });
  },
  onError: (error: any) => {
    toast.error(
      error.response?.data?.message || 'Failed to create vehicle',
      {
        duration: 4000,
        position: 'top-right',
        icon: '❌',
      }
    );
  },
});

// Loading feedback
const handleSubmit = async () => {
  const loadingToast = toast.loading('Creating vehicle...');
  
  try {
    await createMutation.mutateAsync(formData);
    toast.dismiss(loadingToast);
  } catch (error) {
    toast.dismiss(loadingToast);
  }
};
```

**Key Features**:
- Success/error/loading states
- Auto-dismiss after duration
- Positioned consistently (top-right)
- Icons for visual feedback
- Stacked notifications for multiple actions

