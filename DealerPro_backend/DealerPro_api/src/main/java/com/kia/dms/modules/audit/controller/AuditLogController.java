package com.kia.dms.modules.audit.controller;

import com.kia.dms.common.response.ApiResponse;
import com.kia.dms.common.response.PaginationResponse;
import com.kia.dms.modules.audit.dto.AuditLogResponse;
import com.kia.dms.modules.audit.service.AuditLogService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import com.kia.dms.common.dto.request.GlobalSearchRequest;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/audit-logs")
@Tag(name = "Audit Logs", description = "Audit Log Management APIs")
@SecurityRequirement(name = "Bearer Authentication")
public class AuditLogController {

    @Autowired
    private AuditLogService auditLogService;

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'DEALER')")
    @Operation(summary = "Get all audit logs", description = "Retrieve paginated list of audit logs")
    public ResponseEntity<ApiResponse<PaginationResponse<AuditLogResponse>>> getAllAuditLogs(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "100") int size,
            @RequestParam(defaultValue = "performedAt") String sortBy,
            @RequestParam(defaultValue = "DESC") String sortDir) {
        
        Sort sort = sortDir.equalsIgnoreCase("ASC") ? Sort.by(sortBy).ascending() : Sort.by(sortBy).descending();
        Pageable pageable = PageRequest.of(page, size, sort);
        
        PaginationResponse<AuditLogResponse> data = auditLogService.getAllAuditLogs(pageable);
        return ResponseEntity.ok(new ApiResponse<>(true, data, "Audit logs retrieved successfully"));
    }

    @GetMapping("/entity/{entityName}/{entityId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'DEALER')")
    @Operation(summary = "Get audit logs by entity", description = "Retrieve audit logs for a specific entity")
    public ResponseEntity<ApiResponse<List<AuditLogResponse>>> getAuditLogsByEntity(
            @PathVariable String entityName,
            @PathVariable Long entityId) {
        
        List<AuditLogResponse> data = auditLogService.getAuditLogsByEntity(entityName, entityId);
        return ResponseEntity.ok(new ApiResponse<>(true, data, "Entity audit logs retrieved successfully"));
    }

    @GetMapping("/user/{username}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    @Operation(summary = "Get audit logs by user", description = "Retrieve audit logs for a specific user")
    public ResponseEntity<ApiResponse<PaginationResponse<AuditLogResponse>>> getAuditLogsByUser(
            @PathVariable String username,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "100") int size) {
        
        Pageable pageable = PageRequest.of(page, size, Sort.by("performedAt").descending());
        PaginationResponse<AuditLogResponse> data = auditLogService.getAuditLogsByUser(username, pageable);
        return ResponseEntity.ok(new ApiResponse<>(true, data, "User audit logs retrieved successfully"));
    }

    @GetMapping("/action/{action}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    @Operation(summary = "Get audit logs by action", description = "Retrieve audit logs for a specific action (CREATE, UPDATE, DELETE)")
    public ResponseEntity<ApiResponse<PaginationResponse<AuditLogResponse>>> getAuditLogsByAction(
            @PathVariable String action,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "100") int size) {
        
        Pageable pageable = PageRequest.of(page, size, Sort.by("performedAt").descending());
        PaginationResponse<AuditLogResponse> data = auditLogService.getAuditLogsByAction(action, pageable);
        return ResponseEntity.ok(new ApiResponse<>(true, data, "Action audit logs retrieved successfully"));
    }

    @GetMapping("/search")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'DEALER')")
    @Operation(summary = "Search audit logs (Simple)", description = "Search audit logs by entity name, user, or action")
    public ResponseEntity<ApiResponse<PaginationResponse<AuditLogResponse>>> searchAuditLogs(
            @RequestParam String query,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "100") int size) {
        
        Pageable pageable = PageRequest.of(page, size, Sort.by("performedAt").descending());
        PaginationResponse<AuditLogResponse> data = auditLogService.searchAuditLogs(query, pageable);
        return ResponseEntity.ok(new ApiResponse<>(true, data, "Search results retrieved successfully"));
    }

    @PostMapping("/search")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'DEALER')")
    @Operation(summary = "Advanced search audit logs", description = "Advanced search with filters and sorts")
    public ResponseEntity<ApiResponse<PaginationResponse<AuditLogResponse>>> advancedSearch(
            @RequestBody GlobalSearchRequest request) {
        
        PaginationResponse<AuditLogResponse> data = auditLogService.advancedSearch(request);
        return ResponseEntity.ok(new ApiResponse<>(true, data, "Advanced search results retrieved successfully"));
    }
}
