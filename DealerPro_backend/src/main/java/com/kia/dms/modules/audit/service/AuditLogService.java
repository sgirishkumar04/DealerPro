package com.kia.dms.modules.audit.service;

import com.kia.dms.common.response.PaginationResponse;
import com.kia.dms.modules.audit.dto.AuditLogResponse;
import com.kia.dms.modules.audit.entity.AuditLogEntity;
import com.kia.dms.modules.audit.repository.AuditLogRepository;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import com.kia.dms.common.dto.request.GlobalSearchRequest;
import com.kia.dms.common.specification.GenericSpecificationBuilder;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import java.util.ArrayList;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class AuditLogService {

    @Autowired
    private AuditLogRepository auditLogRepository;

    /**
     * Log an audit entry
     */
    @Transactional
    public void logAudit(String entityName, Long entityId, String action, String description) {
        try {
            AuditLogEntity auditLog = new AuditLogEntity();
            auditLog.setEntityName(entityName);
            auditLog.setEntityId(entityId);
            auditLog.setAction(action);
            auditLog.setDescription(description);
            auditLog.setPerformedAt(LocalDateTime.now());

            // Get current user
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            if (authentication != null && authentication.getPrincipal() instanceof UserDetails) {
                UserDetails userDetails = (UserDetails) authentication.getPrincipal();
                auditLog.setPerformedBy(userDetails.getUsername());
                
                // Get role
                String role = userDetails.getAuthorities().stream()
                        .findFirst()
                        .map(auth -> auth.getAuthority().replace("ROLE_", ""))
                        .orElse("UNKNOWN");
                auditLog.setPerformedByRole(role);
            } else {
                auditLog.setPerformedBy("SYSTEM");
                auditLog.setPerformedByRole("SYSTEM");
            }

            // Get IP address
            ServletRequestAttributes attributes = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
            if (attributes != null) {
                HttpServletRequest request = attributes.getRequest();
                String ipAddress = request.getHeader("X-Forwarded-For");
                if (ipAddress == null || ipAddress.isEmpty()) {
                    ipAddress = request.getRemoteAddr();
                }
                auditLog.setIpAddress(ipAddress);
            }

            auditLogRepository.save(auditLog);
        } catch (Exception e) {
            // Log error but don't fail the main operation
            System.err.println("Failed to log audit: " + e.getMessage());
        }
    }

    /**
     * Log field-level changes
     */
    @Transactional
    public void logFieldChange(String entityName, Long entityId, String action, String fieldName, String oldValue, String newValue) {
        try {
            AuditLogEntity auditLog = new AuditLogEntity();
            auditLog.setEntityName(entityName);
            auditLog.setEntityId(entityId);
            auditLog.setAction(action);
            auditLog.setFieldName(fieldName);
            auditLog.setOldValue(oldValue);
            auditLog.setNewValue(newValue);
            auditLog.setPerformedAt(LocalDateTime.now());
            auditLog.setDescription(String.format("Changed %s from '%s' to '%s'", fieldName, oldValue, newValue));

            // Get current user
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            if (authentication != null && authentication.getPrincipal() instanceof UserDetails) {
                UserDetails userDetails = (UserDetails) authentication.getPrincipal();
                auditLog.setPerformedBy(userDetails.getUsername());
                
                String role = userDetails.getAuthorities().stream()
                        .findFirst()
                        .map(auth -> auth.getAuthority().replace("ROLE_", ""))
                        .orElse("UNKNOWN");
                auditLog.setPerformedByRole(role);
            }

            // Get IP address
            ServletRequestAttributes attributes = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
            if (attributes != null) {
                HttpServletRequest request = attributes.getRequest();
                String ipAddress = request.getHeader("X-Forwarded-For");
                if (ipAddress == null || ipAddress.isEmpty()) {
                    ipAddress = request.getRemoteAddr();
                }
                auditLog.setIpAddress(ipAddress);
            }

            auditLogRepository.save(auditLog);
        } catch (Exception e) {
            System.err.println("Failed to log field change: " + e.getMessage());
        }
    }

    /**
     * Get all audit logs with pagination
     */
    public PaginationResponse<AuditLogResponse> getAllAuditLogs(Pageable pageable) {
        Page<AuditLogEntity> page = auditLogRepository.findAllAuditLogs(pageable);
        List<AuditLogResponse> content = page.getContent().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());

        return new PaginationResponse<>(
                content,
                page.getNumber(),
                page.getSize(),
                page.getTotalElements(),
                page.getTotalPages()
        );
    }

    /**
     * Get audit logs by entity
     */
    public List<AuditLogResponse> getAuditLogsByEntity(String entityName, Long entityId) {
        return auditLogRepository.findByEntityNameAndEntityId(entityName, entityId).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    /**
     * Get audit logs by user
     */
    public PaginationResponse<AuditLogResponse> getAuditLogsByUser(String username, Pageable pageable) {
        Page<AuditLogEntity> page = auditLogRepository.findByPerformedBy(username, pageable);
        List<AuditLogResponse> content = page.getContent().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());

        return new PaginationResponse<>(
                content,
                page.getNumber(),
                page.getSize(),
                page.getTotalElements(),
                page.getTotalPages()
        );
    }

    /**
     * Get audit logs by action
     */
    public PaginationResponse<AuditLogResponse> getAuditLogsByAction(String action, Pageable pageable) {
        Page<AuditLogEntity> page = auditLogRepository.findByAction(action, pageable);
        List<AuditLogResponse> content = page.getContent().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());

        return new PaginationResponse<>(
                content,
                page.getNumber(),
                page.getSize(),
                page.getTotalElements(),
                page.getTotalPages()
        );
    }

    /**
     * Search audit logs
     */
    public PaginationResponse<AuditLogResponse> searchAuditLogs(String search, Pageable pageable) {
        Page<AuditLogEntity> page = auditLogRepository.searchAuditLogs(search, pageable);
        List<AuditLogResponse> content = page.getContent().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());

        return new PaginationResponse<>(
                content,
                page.getNumber(),
                page.getSize(),
                page.getTotalElements(),
                page.getTotalPages()
        );
    }

    /**
     * Advanced search audit logs
     */
    public PaginationResponse<AuditLogResponse> advancedSearch(GlobalSearchRequest request) {
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

        // 2. Build Specification
        Specification<AuditLogEntity> spec = GenericSpecificationBuilder.build(request, Arrays.asList("entityName", "performedBy", "action", "description"));

        // 3. Execute Search
        Page<AuditLogEntity> page = auditLogRepository.findAll(spec, pageable);

        List<AuditLogResponse> content = page.getContent().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());

        return new PaginationResponse<>(
                content,
                page.getNumber(),
                page.getSize(),
                page.getTotalElements(),
                page.getTotalPages()
        );
    }

    /**
     * Map entity to response
     */
    private AuditLogResponse mapToResponse(AuditLogEntity entity) {
        AuditLogResponse response = new AuditLogResponse();
        response.setId(entity.getId());
        response.setEntityName(entity.getEntityName());
        response.setEntityId(entity.getEntityId());
        response.setAction(entity.getAction());
        response.setPerformedBy(entity.getPerformedBy());
        response.setPerformedByRole(entity.getPerformedByRole());
        
        // Format performedAt to match Service module format: "yyyy-MM-dd HH:mm:ss"
        try {
            if (entity.getPerformedAt() != null) {
                response.setPerformedAt(entity.getPerformedAt().format(
                    java.time.format.DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")
                ));
            } else {
                response.setPerformedAt("N/A");
            }
        } catch (Exception e) {
            response.setPerformedAt("N/A");
        }
        
        response.setFieldName(entity.getFieldName());
        response.setOldValue(entity.getOldValue());
        response.setNewValue(entity.getNewValue());
        response.setIpAddress(entity.getIpAddress());
        response.setDescription(entity.getDescription());
        
        // Format createdAt as well
        try {
            if (entity.getCreatedAt() != null) {
                response.setCreatedAt(entity.getCreatedAt().format(
                    java.time.format.DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")
                ));
            } else {
                response.setCreatedAt("N/A");
            }
        } catch (Exception e) {
            response.setCreatedAt("N/A");
        }
        
        return response;
    }
}
