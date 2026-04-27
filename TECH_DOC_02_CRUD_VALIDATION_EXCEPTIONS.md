# Technical Documentation Part 2: CRUD, Validation & Exception Handling

## 1. CRUD Operations (Create, Read, Update, Delete)

### Overview
DealerPro implements comprehensive CRUD operations across all modules using Spring Data JPA repositories and RESTful controllers.

### Repository Layer

**Location**: `DealerPro_backend/src/main/java/com/kia/dms/modules/inventory/repository/VehicleRepository.java`

```java
package com.kia.dms.modules.inventory.repository;

import com.kia.dms.modules.inventory.entity.VehicleEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface VehicleRepository extends JpaRepository<VehicleEntity, Long> {
    
    // Spring Data JPA provides these methods automatically:
    // - save(entity)           : Create or Update
    // - findById(id)           : Read by ID
    // - findAll()              : Read all
    // - deleteById(id)         : Delete by ID
    // - existsById(id)         : Check existence
    
    // Custom query methods
    List<VehicleEntity> findByStatus(String status);
    
    List<VehicleEntity> findByDealerId(Long dealerId);
    
    @Query("SELECT v FROM VehicleEntity v WHERE v.dealer.id = :dealerId AND v.status = :status")
    List<VehicleEntity> findByDealerIdAndStatus(
        @Param("dealerId") Long dealerId,
        @Param("status") String status
    );
    
    @Query("SELECT v FROM VehicleEntity v JOIN FETCH v.kiaCar WHERE v.id = :id")
    Optional<VehicleEntity> findByIdWithKiaCar(@Param("id") Long id);
}
```

**Key Features**:
- Extends `JpaRepository<Entity, ID>` for automatic CRUD
- Custom query methods using naming conventions
- `@Query` for complex JPQL queries
- `JOIN FETCH` for eager loading relationships
- Type-safe with generics

### Service Layer

**Location**: `DealerPro_backend/src/main/java/com/kia/dms/modules/inventory/service/VehicleService.java`

```java
package com.kia.dms.modules.inventory.service;

import com.kia.dms.exception.ResourceNotFoundException;
import com.kia.dms.modules.inventory.dto.VehicleRequest;
import com.kia.dms.modules.inventory.dto.VehicleResponse;
import com.kia.dms.modules.inventory.entity.VehicleEntity;
import com.kia.dms.modules.inventory.mapper.VehicleMapper;
import com.kia.dms.modules.inventory.repository.VehicleRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class VehicleService {

    private final VehicleRepository vehicleRepository;
    private final VehicleMapper vehicleMapper;

    // CREATE
    public VehicleResponse createVehicle(VehicleRequest request) {
        log.info("Creating new vehicle: {}", request);
        
        VehicleEntity vehicle = vehicleMapper.toEntity(request);
        VehicleEntity saved = vehicleRepository.save(vehicle);
        
        log.info("Vehicle created with ID: {}", saved.getId());
        return vehicleMapper.toResponse(saved);
    }

    // READ - Single
    @Transactional(readOnly = true)
    public VehicleResponse getVehicleById(Long id) {
        log.info("Fetching vehicle with ID: {}", id);
        
        VehicleEntity vehicle = vehicleRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException(
                "Vehicle not found with id: " + id
            ));
        
        return vehicleMapper.toResponse(vehicle);
    }

    // READ - All with Pagination
    @Transactional(readOnly = true)
    public Page<VehicleResponse> getAllVehicles(Pageable pageable) {
        log.info("Fetching vehicles - Page: {}, Size: {}", 
            pageable.getPageNumber(), pageable.getPageSize());
        
        Page<VehicleEntity> vehicles = vehicleRepository.findAll(pageable);
        return vehicles.map(vehicleMapper::toResponse);
    }

    // UPDATE
    public VehicleResponse updateVehicle(Long id, VehicleRequest request) {
        log.info("Updating vehicle ID: {} with data: {}", id, request);
        
        VehicleEntity existing = vehicleRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException(
                "Vehicle not found with id: " + id
            ));
        
        // Update fields
        existing.setStatus(request.getStatus());
        existing.setPrice(request.getPrice());
        existing.setMileage(request.getMileage());
        existing.setColor(request.getColor());
        
        VehicleEntity updated = vehicleRepository.save(existing);
        log.info("Vehicle updated successfully: {}", id);
        
        return vehicleMapper.toResponse(updated);
    }

    // DELETE
    public void deleteVehicle(Long id) {
        log.info("Deleting vehicle with ID: {}", id);
        
        if (!vehicleRepository.existsById(id)) {
            throw new ResourceNotFoundException("Vehicle not found with id: " + id);
        }
        
        vehicleRepository.deleteById(id);
        log.info("Vehicle deleted successfully: {}", id);
    }
}
```

**Key Features**:
- `@Service`: Marks as service layer component
- `@Transactional`: Manages database transactions
- `@Transactional(readOnly = true)`: Optimizes read operations
- Logging with SLF4J
- DTO pattern (Request/Response) for data transfer
- Exception handling with custom exceptions

### Controller Layer (Already shown in Part 1)

### Frontend CRUD Implementation

**Location**: `DealerPro_frontend/src/pages/inventory/Inventory.tsx`

```typescript
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { Button, Dialog, TextField } from '@mui/material';
import { Plus, Edit, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';

export default function Inventory() {
  const queryClient = useQueryClient();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    status: '',
    price: 0,
    mileage: 0,
    color: ''
  });

  // READ - Fetch all vehicles
  const { data, isLoading } = useQuery({
    queryKey: ['vehicles'],
    queryFn: async () => {
      const { data } = await api.get('/api/vehicles?page=0&size=1000');
      return data.data;
    },
  });

  // CREATE - Add new vehicle
  const createMutation = useMutation({
    mutationFn: async (vehicleData: any) => {
      const { data } = await api.post('/api/vehicles', vehicleData);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      toast.success('Vehicle created successfully!');
      handleCloseForm();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create vehicle');
    },
  });

  // UPDATE - Edit existing vehicle
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const response = await api.put(`/api/vehicles/${id}`, data);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      toast.success('Vehicle updated successfully!');
      handleCloseForm();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update vehicle');
    },
  });

  // DELETE - Remove vehicle
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/api/vehicles/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      toast.success('Vehicle deleted successfully!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to delete vehicle');
    },
  });

  const handleSubmit = () => {
    if (editId) {
      updateMutation.mutate({ id: editId, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (vehicle: any) => {
    setEditId(vehicle.id);
    setFormData({
      status: vehicle.status,
      price: vehicle.price,
      mileage: vehicle.mileage,
      color: vehicle.color
    });
    setIsFormOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm('Are you sure you want to delete this vehicle?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditId(null);
    setFormData({ status: '', price: 0, mileage: 0, color: '' });
  };

  return (
    <div>
      <Button onClick={() => setIsFormOpen(true)} startIcon={<Plus />}>
        Add Vehicle
      </Button>
      
      <DataGrid
        rows={data?.content || []}
        columns={columns}
        loading={isLoading}
        // ... other props
      />
      
      {/* Form Dialog for Create/Edit */}
      <Dialog open={isFormOpen} onClose={handleCloseForm}>
        {/* Form fields */}
      </Dialog>
    </div>
  );
}
```

**Key Features**:
- React Query for data fetching and caching
- `useQuery`: Automatic data fetching with caching
- `useMutation`: Handle create/update/delete operations
- `queryClient.invalidateQueries`: Refresh data after mutations
- Toast notifications for user feedback
- Optimistic UI updates

---

## 2. Validation (Server-side & Client-side)

### Server-side Validation

**Location**: `DealerPro_backend/src/main/java/com/kia/dms/modules/leads/dto/request/LeadRequest.java`

```java
package com.kia.dms.modules.leads.dto.request;

import jakarta.validation.constraints.*;
import lombok.Data;

@Data
public class LeadRequest {
    
    @NotBlank(message = "First name is required")
    @Size(min = 2, max = 50, message = "First name must be between 2 and 50 characters")
    private String firstName;
    
    @NotBlank(message = "Last name is required")
    @Size(min = 2, max = 50, message = "Last name must be between 2 and 50 characters")
    private String lastName;
    
    @NotBlank(message = "Email is required")
    @Email(message = "Email must be valid")
    private String email;
    
    @NotBlank(message = "Phone is required")
    @Pattern(
        regexp = "^[0-9]{10}$",
        message = "Phone must be 10 digits"
    )
    private String phone;
    
    @NotNull(message = "Dealer ID is required")
    @Positive(message = "Dealer ID must be positive")
    private Long dealerId;
    
    @NotBlank(message = "Status is required")
    @Pattern(
        regexp = "NEW|CONTACTED|QUALIFIED|CONVERTED|LOST",
        message = "Status must be one of: NEW, CONTACTED, QUALIFIED, CONVERTED, LOST"
    )
    private String status;
    
    @Size(max = 500, message = "Notes cannot exceed 500 characters")
    private String notes;
}
```

**Validation Annotations**:
- `@NotNull`: Field cannot be null
- `@NotBlank`: String cannot be null, empty, or whitespace
- `@NotEmpty`: Collection/array cannot be empty
- `@Size`: String/collection size constraints
- `@Min` / `@Max`: Numeric range validation
- `@Positive` / `@PositiveOrZero`: Positive number validation
- `@Email`: Email format validation
- `@Pattern`: Regex pattern matching
- `@Past` / `@Future`: Date validation

**Controller Validation**:
```java
@PostMapping
public ResponseEntity<ApiResponse<LeadResponse>> createLead(
        @Valid @RequestBody LeadRequest request  // @Valid triggers validation
) {
    LeadResponse response = leadService.createLead(request);
    return ResponseEntity.status(HttpStatus.CREATED)
        .body(ApiResponse.success(response));
}
```

**Validation Error Response**:
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": {
    "firstName": "First name is required",
    "email": "Email must be valid",
    "phone": "Phone must be 10 digits"
  },
  "timestamp": "2026-04-05T10:30:00"
}
```

### Global Validation Handler

**Location**: `DealerPro_backend/src/main/java/com/kia/dms/exception/GlobalExceptionHandler.java`

```java
@ExceptionHandler(MethodArgumentNotValidException.class)
public ResponseEntity<ErrorResponse> handleValidationExceptions(
        MethodArgumentNotValidException ex
) {
    Map<String, String> errors = new HashMap<>();
    
    ex.getBindingResult().getAllErrors().forEach((error) -> {
        String fieldName = ((FieldError) error).getField();
        String errorMessage = error.getDefaultMessage();
        errors.put(fieldName, errorMessage);
    });
    
    ErrorResponse errorResponse = ErrorResponse.builder()
        .timestamp(LocalDateTime.now())
        .status(HttpStatus.BAD_REQUEST.value())
        .error("Validation Failed")
        .message("Invalid input data")
        .details(errors)
        .build();
    
    return ResponseEntity.badRequest().body(errorResponse);
}
```

### Client-side Validation

**Location**: `DealerPro_frontend/src/pages/leads/Leads.tsx`

```typescript
import { useState } from 'react';
import { TextField, Button } from '@mui/material';
import toast from 'react-hot-toast';

export default function LeadForm() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    status: 'NEW'
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Client-side validation function
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    // First name validation
    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    } else if (formData.firstName.length < 2) {
      newErrors.firstName = 'First name must be at least 2 characters';
    }
    
    // Last name validation
    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!emailRegex.test(formData.email)) {
      newErrors.email = 'Email must be valid';
    }
    
    // Phone validation
    const phoneRegex = /^[0-9]{10}$/;
    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone is required';
    } else if (!phoneRegex.test(formData.phone)) {
      newErrors.phone = 'Phone must be 10 digits';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate before submission
    if (!validateForm()) {
      toast.error('Please fix validation errors');
      return;
    }
    
    try {
      await api.post('/api/leads', formData);
      toast.success('Lead created successfully!');
    } catch (error: any) {
      // Handle server-side validation errors
      if (error.response?.data?.errors) {
        setErrors(error.response.data.errors);
      }
      toast.error('Failed to create lead');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <TextField
        label="First Name"
        value={formData.firstName}
        onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
        error={!!errors.firstName}
        helperText={errors.firstName}
        required
      />
      
      <TextField
        label="Email"
        type="email"
        value={formData.email}
        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
        error={!!errors.email}
        helperText={errors.email}
        required
      />
      
      <TextField
        label="Phone"
        value={formData.phone}
        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
        error={!!errors.phone}
        helperText={errors.phone}
        inputProps={{ maxLength: 10 }}
        required
      />
      
      <Button type="submit" variant="contained">
        Submit
      </Button>
    </form>
  );
}
```

**Key Features**:
- Real-time validation on input change
- Error messages displayed below fields
- Regex validation for email and phone
- Length validation
- Required field validation
- Server-side error integration

---

## 3. Exception Handling

### Custom Exception Classes

**Location**: `DealerPro_backend/src/main/java/com/kia/dms/exception/ResourceNotFoundException.java`

```java
package com.kia.dms.exception;

public class ResourceNotFoundException extends RuntimeException {
    public ResourceNotFoundException(String message) {
        super(message);
    }
    
    public ResourceNotFoundException(String resource, String field, Object value) {
        super(String.format("%s not found with %s: '%s'", resource, field, value));
    }
}
```

**Location**: `DealerPro_backend/src/main/java/com/kia/dms/exception/AccountLockedException.java`

```java
package com.kia.dms.exception;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;

public class AccountLockedException extends RuntimeException {
    
    private final LocalDateTime lockedUntil;
    private final long remainingMinutes;
    
    public AccountLockedException(LocalDateTime lockedUntil) {
        super(buildMessage(lockedUntil));
        this.lockedUntil = lockedUntil;
        this.remainingMinutes = ChronoUnit.MINUTES.between(LocalDateTime.now(), lockedUntil);
    }
    
    private static String buildMessage(LocalDateTime lockedUntil) {
        long minutes = ChronoUnit.MINUTES.between(LocalDateTime.now(), lockedUntil);
        return String.format(
            "Account is locked due to multiple failed login attempts. " +
            "Please try again after %d minute(s).",
            minutes
        );
    }
    
    public LocalDateTime getLockedUntil() {
        return lockedUntil;
    }
    
    public long getRemainingMinutes() {
        return remainingMinutes;
    }
}
```

**Location**: `DealerPro_backend/src/main/java/com/kia/dms/exception/InsufficientStockException.java`

```java
package com.kia.dms.exception;

public class InsufficientStockException extends RuntimeException {
    public InsufficientStockException(String message) {
        super(message);
    }
    
    public InsufficientStockException(String partName, int requested, int available) {
        super(String.format(
            "Insufficient stock for %s. Requested: %d, Available: %d",
            partName, requested, available
        ));
    }
}
```

### Error Response DTO

**Location**: `DealerPro_backend/src/main/java/com/kia/dms/exception/ErrorResponse.java`

```java
package com.kia.dms.exception;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ErrorResponse {
    private LocalDateTime timestamp;
    private int status;
    private String error;
    private String message;
    private String path;
    private Map<String, String> details;
}
```

---

## 4. Global Exception Handler

**Location**: `DealerPro_backend/src/main/java/com/kia/dms/exception/GlobalExceptionHandler.java`

```java
package com.kia.dms.exception;

import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.WebRequest;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@RestControllerAdvice
@Slf4j
public class GlobalExceptionHandler {

    // Handle Resource Not Found
    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleResourceNotFoundException(
            ResourceNotFoundException ex,
            WebRequest request
    ) {
        log.error("Resource not found: {}", ex.getMessage());
        
        ErrorResponse errorResponse = ErrorResponse.builder()
            .timestamp(LocalDateTime.now())
            .status(HttpStatus.NOT_FOUND.value())
            .error("Not Found")
            .message(ex.getMessage())
            .path(request.getDescription(false).replace("uri=", ""))
            .build();
        
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(errorResponse);
    }

    // Handle Account Locked
    @ExceptionHandler(AccountLockedException.class)
    public ResponseEntity<ErrorResponse> handleAccountLockedException(
            AccountLockedException ex,
            WebRequest request
    ) {
        log.warn("Account locked: {}", ex.getMessage());
        
        Map<String, String> details = new HashMap<>();
        details.put("lockedUntil", ex.getLockedUntil().toString());
        details.put("remainingMinutes", String.valueOf(ex.getRemainingMinutes()));
        
        ErrorResponse errorResponse = ErrorResponse.builder()
            .timestamp(LocalDateTime.now())
            .status(HttpStatus.LOCKED.value())
            .error("Account Locked")
            .message(ex.getMessage())
            .path(request.getDescription(false).replace("uri=", ""))
            .details(details)
            .build();
        
        return ResponseEntity.status(HttpStatus.LOCKED).body(errorResponse);
    }

    // Handle Validation Errors
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidationExceptions(
            MethodArgumentNotValidException ex,
            WebRequest request
    ) {
        log.error("Validation failed: {}", ex.getMessage());
        
        Map<String, String> errors = new HashMap<>();
        ex.getBindingResult().getAllErrors().forEach((error) -> {
            String fieldName = ((FieldError) error).getField();
            String errorMessage = error.getDefaultMessage();
            errors.put(fieldName, errorMessage);
        });
        
        ErrorResponse errorResponse = ErrorResponse.builder()
            .timestamp(LocalDateTime.now())
            .status(HttpStatus.BAD_REQUEST.value())
            .error("Validation Failed")
            .message("Invalid input data")
            .path(request.getDescription(false).replace("uri=", ""))
            .details(errors)
            .build();
        
        return ResponseEntity.badRequest().body(errorResponse);
    }

    // Handle Insufficient Stock
    @ExceptionHandler(InsufficientStockException.class)
    public ResponseEntity<ErrorResponse> handleInsufficientStockException(
            InsufficientStockException ex,
            WebRequest request
    ) {
        log.error("Insufficient stock: {}", ex.getMessage());
        
        ErrorResponse errorResponse = ErrorResponse.builder()
            .timestamp(LocalDateTime.now())
            .status(HttpStatus.CONFLICT.value())
            .error("Insufficient Stock")
            .message(ex.getMessage())
            .path(request.getDescription(false).replace("uri=", ""))
            .build();
        
        return ResponseEntity.status(HttpStatus.CONFLICT).body(errorResponse);
    }

    // Handle Access Denied
    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ErrorResponse> handleAccessDeniedException(
            AccessDeniedException ex,
            WebRequest request
    ) {
        log.error("Access denied: {}", ex.getMessage());
        
        ErrorResponse errorResponse = ErrorResponse.builder()
            .timestamp(LocalDateTime.now())
            .status(HttpStatus.FORBIDDEN.value())
            .error("Access Denied")
            .message("You don't have permission to access this resource")
            .path(request.getDescription(false).replace("uri=", ""))
            .build();
        
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(errorResponse);
    }

    // Handle Generic Exceptions
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleGlobalException(
            Exception ex,
            WebRequest request
    ) {
        log.error("Unexpected error occurred", ex);
        
        ErrorResponse errorResponse = ErrorResponse.builder()
            .timestamp(LocalDateTime.now())
            .status(HttpStatus.INTERNAL_SERVER_ERROR.value())
            .error("Internal Server Error")
            .message("An unexpected error occurred. Please try again later.")
            .path(request.getDescription(false).replace("uri=", ""))
            .build();
        
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
            .body(errorResponse);
    }
}
```

**Key Features**:
- `@RestControllerAdvice`: Global exception handling for all controllers
- `@ExceptionHandler`: Handles specific exception types
- Logging with SLF4J for error tracking
- Standardized error response format
- HTTP status codes mapped to exception types
- Detailed error information for debugging
- User-friendly error messages

**Exception to HTTP Status Mapping**:
- `ResourceNotFoundException` → 404 NOT_FOUND
- `AccountLockedException` → 423 LOCKED
- `MethodArgumentNotValidException` → 400 BAD_REQUEST
- `InsufficientStockException` → 409 CONFLICT
- `AccessDeniedException` → 403 FORBIDDEN
- `Exception` (generic) → 500 INTERNAL_SERVER_ERROR

