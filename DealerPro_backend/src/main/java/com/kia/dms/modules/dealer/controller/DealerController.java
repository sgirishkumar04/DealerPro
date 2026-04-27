package com.kia.dms.modules.dealer.controller;

import com.kia.dms.common.response.ApiResponse;
import com.kia.dms.common.response.PaginationResponse;
import com.kia.dms.modules.dealer.entity.DealerEntity;
import com.kia.dms.modules.dealer.repository.DealerRepository;
import com.kia.dms.modules.user.entity.ManagerEntity;
import com.kia.dms.modules.user.repository.ManagerRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import com.kia.dms.common.dto.request.GlobalSearchRequest;
import com.kia.dms.common.specification.GenericSpecificationBuilder;
import java.util.ArrayList;
import java.util.Arrays;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/dealers")
@Tag(name = "Dealers", description = "Dealer Management APIs")
@SecurityRequirement(name = "Bearer Authentication")
public class DealerController {

    @Autowired
    private DealerRepository dealerRepository;
    
    @Autowired
    private ManagerRepository managerRepository;

    @GetMapping
    @Operation(
        summary = "Get all dealers",
        description = "Retrieve paginated list of all dealers"
    )
    @ApiResponses(value = {
        @io.swagger.v3.oas.annotations.responses.ApiResponse(
            responseCode = "200",
            description = "Successfully retrieved dealers"
        )
    })
    public ResponseEntity<ApiResponse<PaginationResponse<Map<String, Object>>>> getAllDealers(
            @Parameter(description = "Pagination parameters") Pageable pageable) {
        Page<DealerEntity> page = dealerRepository.findAll(pageable);
        
        // Convert to simple DTOs to avoid lazy loading issues
        List<Map<String, Object>> content = page.getContent().stream()
            .map(d -> {
                Map<String, Object> dto = new HashMap<>();
                dto.put("id", d.getId());
                dto.put("name", d.getName());
                dto.put("email", d.getEmail());
                dto.put("location", d.getLocation());
                dto.put("contactNumber", d.getContactNumber());
                dto.put("status", d.getStatus() != null ? d.getStatus() : "ACTIVE");
                dto.put("managerId", d.getManager() != null ? d.getManager().getId() : null);
                return dto;
            })
            .collect(Collectors.toList());
        
        PaginationResponse<Map<String, Object>> res = new PaginationResponse<>(
                content, page.getNumber(), page.getSize(),
                page.getTotalElements(), page.getTotalPages());
        return ResponseEntity.ok(new ApiResponse<>(true, res, "Dealers fetched successfully"));
    }

    @PostMapping
    @Operation(
        summary = "Create a new dealer",
        description = "Create a new dealer entry"
    )
    @ApiResponses(value = {
        @io.swagger.v3.oas.annotations.responses.ApiResponse(
            responseCode = "201",
            description = "Dealer created successfully"
        ),
        @io.swagger.v3.oas.annotations.responses.ApiResponse(
            responseCode = "400",
            description = "Invalid input data"
        )
    })
    public ResponseEntity<ApiResponse<Map<String, Object>>> createDealer(
            @io.swagger.v3.oas.annotations.parameters.RequestBody(
                description = "Dealer details",
                required = true
            )
            @RequestBody Map<String, Object> request) {
        DealerEntity dealer = new DealerEntity();
        dealer.setName((String) request.get("name"));
        dealer.setLocation((String) request.get("location"));
        dealer.setEmail((String) request.get("email"));
        dealer.setContactNumber((String) request.get("contactNumber"));
        dealer.setStatus("ACTIVE");
        
        // Set manager if provided - handle null, empty string, or valid ID
        Object managerIdObj = request.get("managerId");
        if (managerIdObj != null && !managerIdObj.toString().isEmpty()) {
            try {
                Long managerId = Long.valueOf(managerIdObj.toString());
                ManagerEntity manager = managerRepository.findById(managerId)
                    .orElseThrow(() -> new RuntimeException("Manager not found"));
                dealer.setManager(manager);
            } catch (NumberFormatException e) {
                dealer.setManager(null);
            }
        }
        
        DealerEntity saved = dealerRepository.save(dealer);
        
        Map<String, Object> dto = new HashMap<>();
        dto.put("id", saved.getId());
        dto.put("name", saved.getName());
        dto.put("email", saved.getEmail());
        dto.put("location", saved.getLocation());
        dto.put("contactNumber", saved.getContactNumber());
        dto.put("status", saved.getStatus());
        dto.put("managerId", saved.getManager() != null ? saved.getManager().getId() : null);
        
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(new ApiResponse<>(true, dto, "Dealer created successfully"));
    }

    @PutMapping("/{id}")
    @Operation(
        summary = "Update dealer",
        description = "Update an existing dealer's information"
    )
    @ApiResponses(value = {
        @io.swagger.v3.oas.annotations.responses.ApiResponse(
            responseCode = "200",
            description = "Dealer updated successfully"
        ),
        @io.swagger.v3.oas.annotations.responses.ApiResponse(
            responseCode = "404",
            description = "Dealer not found"
        )
    })
    public ResponseEntity<ApiResponse<Map<String, Object>>> updateDealer(
            @Parameter(description = "Dealer ID") @PathVariable Long id,
            @io.swagger.v3.oas.annotations.parameters.RequestBody(
                description = "Updated dealer details",
                required = true
            )
            @RequestBody Map<String, Object> request) {
        DealerEntity dealer = dealerRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Dealer not found"));
        
        dealer.setName((String) request.get("name"));
        dealer.setLocation((String) request.get("location"));
        dealer.setEmail((String) request.get("email"));
        dealer.setContactNumber((String) request.get("contactNumber"));
        
        // Update manager - handle null, empty string, or valid ID
        Object managerIdObj = request.get("managerId");
        if (managerIdObj != null && !managerIdObj.toString().isEmpty()) {
            try {
                Long managerId = Long.valueOf(managerIdObj.toString());
                ManagerEntity manager = managerRepository.findById(managerId)
                    .orElseThrow(() -> new RuntimeException("Manager not found"));
                dealer.setManager(manager);
            } catch (NumberFormatException e) {
                dealer.setManager(null);
            }
        } else {
            // Explicitly set to null when managerId is null or empty
            dealer.setManager(null);
        }
        
        DealerEntity updated = dealerRepository.save(dealer);
        
        Map<String, Object> dto = new HashMap<>();
        dto.put("id", updated.getId());
        dto.put("name", updated.getName());
        dto.put("email", updated.getEmail());
        dto.put("location", updated.getLocation());
        dto.put("contactNumber", updated.getContactNumber());
        dto.put("status", updated.getStatus());
        dto.put("managerId", updated.getManager() != null ? updated.getManager().getId() : null);
        
        return ResponseEntity.ok(new ApiResponse<>(true, dto, "Dealer updated successfully"));
    }

    @DeleteMapping("/{id}")
    @Operation(
        summary = "Delete dealer",
        description = "Delete a dealer by ID"
    )
    @ApiResponses(value = {
        @io.swagger.v3.oas.annotations.responses.ApiResponse(
            responseCode = "204",
            description = "Dealer deleted successfully"
        ),
        @io.swagger.v3.oas.annotations.responses.ApiResponse(
            responseCode = "404",
            description = "Dealer not found"
        )
    })
    public ResponseEntity<Void> deleteDealer(
            @Parameter(description = "Dealer ID") @PathVariable Long id) {
        if (!dealerRepository.existsById(id)) {
            throw new RuntimeException("Dealer not found");
        }
        dealerRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/search")
    @Operation(summary = "Search dealers", description = "Search and filter dealers dynamically")
    public ResponseEntity<ApiResponse<PaginationResponse<Map<String, Object>>>> searchDealers(@RequestBody GlobalSearchRequest request) {
        // 1. Build Sorting
        List<Sort.Order> orders = new ArrayList<>();
        if (request.getSorts() != null && !request.getSorts().isEmpty()) {
            for (GlobalSearchRequest.SortRequest sort : request.getSorts()) {
                orders.add(new Sort.Order(
                    Sort.Direction.fromString(sort.getDirection() != null ? sort.getDirection() : "DESC"),
                    sort.getField()
                ));
            }
        } else {
            orders.add(new Sort.Order(Sort.Direction.DESC, "id"));
        }
        
        Pageable pageable = PageRequest.of(request.getPage(), request.getSize(), Sort.by(orders));
        
        List<String> searchColumns = Arrays.asList("name", "email", "location", "contactNumber");
        
        Specification<DealerEntity> spec = GenericSpecificationBuilder.build(request, searchColumns);
        
        Page<DealerEntity> page = dealerRepository.findAll(spec, pageable);
        
        List<Map<String, Object>> content = page.getContent().stream()
            .map(d -> {
                Map<String, Object> dto = new HashMap<>();
                dto.put("id", d.getId());
                dto.put("name", d.getName());
                dto.put("email", d.getEmail());
                dto.put("location", d.getLocation());
                dto.put("contactNumber", d.getContactNumber());
                dto.put("status", d.getStatus() != null ? d.getStatus() : "ACTIVE");
                dto.put("managerId", d.getManager() != null ? d.getManager().getId() : null);
                return dto;
            })
            .collect(Collectors.toList());
            
        PaginationResponse<Map<String, Object>> res = new PaginationResponse<>(
                content, page.getNumber(), page.getSize(),
                page.getTotalElements(), page.getTotalPages());
        return ResponseEntity.ok(new ApiResponse<>(true, res, "Dealers searched successfully"));
    }
}
