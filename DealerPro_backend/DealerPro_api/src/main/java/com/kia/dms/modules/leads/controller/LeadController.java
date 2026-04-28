package com.kia.dms.modules.leads.controller;

import com.kia.dms.common.response.ApiResponse;
import com.kia.dms.common.response.PaginationResponse;
import com.kia.dms.modules.leads.dto.response.LeadResponse;
import com.kia.dms.modules.leads.entity.LeadEntity;
import com.kia.dms.modules.leads.service.LeadService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import com.kia.dms.common.dto.request.GlobalSearchRequest;

@RestController
@RequestMapping("/api/leads")
@Tag(name = "Leads", description = "Lead Management APIs")
@SecurityRequirement(name = "Bearer Authentication")
public class LeadController {

    @Autowired private LeadService leadService;

    @GetMapping
    @Operation(
        summary = "Get all leads",
        description = "Retrieve paginated list of leads with filtering support"
    )
    @ApiResponses(value = {
        @io.swagger.v3.oas.annotations.responses.ApiResponse(
            responseCode = "200",
            description = "Successfully retrieved leads",
            content = @Content(schema = @Schema(implementation = ApiResponse.class))
        )
    })
    public ResponseEntity<ApiResponse<PaginationResponse<LeadResponse>>> getLeads(
            @Parameter(description = "Pagination parameters") Pageable pageable) {
        return ResponseEntity.ok(new ApiResponse<>(true, leadService.getLeads(pageable), "Leads retrieved successfully"));
    }

    @PostMapping("/search")
    @Operation(summary = "Advanced search for leads", description = "Dynamic search with keyword, multi-column filters and sorting")
    public ResponseEntity<ApiResponse<PaginationResponse<LeadResponse>>> searchLeads(@RequestBody GlobalSearchRequest request) {
        return ResponseEntity.ok(new ApiResponse<>(true, leadService.searchLeads(request), "Search results retrieved successfully"));
    }

    @PostMapping(consumes = { org.springframework.http.MediaType.MULTIPART_FORM_DATA_VALUE })
    @Operation(summary = "Create a new lead with an optional file attachment")
    public ResponseEntity<ApiResponse<LeadResponse>> createLead(
            @RequestPart("lead") LeadEntity lead,
            @RequestPart(value = "files", required = false) java.util.List<org.springframework.web.multipart.MultipartFile> files) {
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(new ApiResponse<>(true, leadService.createLeadWithFile(lead, files), "Lead created successfully"));
    }

    @PutMapping("/{id}/status")
    @Operation(
        summary = "Update lead status",
        description = "Update the status of an existing lead"
    )
    @ApiResponses(value = {
        @io.swagger.v3.oas.annotations.responses.ApiResponse(
            responseCode = "200",
            description = "Lead status updated successfully"
        ),
        @io.swagger.v3.oas.annotations.responses.ApiResponse(
            responseCode = "404",
            description = "Lead not found"
        )
    })
    public ResponseEntity<ApiResponse<LeadResponse>> updateLeadStatus(
            @Parameter(description = "Lead ID") @PathVariable Long id,
            @Parameter(description = "New status") @RequestParam String status,
            @Parameter(description = "Record version for concurrency control") @RequestParam(required = false) Long version) {
        return ResponseEntity.ok(new ApiResponse<>(true, leadService.updateLeadStatus(id, status, version), "Lead status updated successfully"));
    }

    @PutMapping(value = "/{id}", consumes = { org.springframework.http.MediaType.MULTIPART_FORM_DATA_VALUE })
    @Operation(summary = "Update a lead", description = "Update lead details and optionally attach files")
    public ResponseEntity<ApiResponse<LeadResponse>> updateLead(
            @PathVariable Long id,
            @RequestPart("lead") LeadEntity lead,
            @RequestPart(value = "files", required = false) java.util.List<org.springframework.web.multipart.MultipartFile> files) {
        return ResponseEntity.ok(new ApiResponse<>(true, leadService.updateLeadWithFile(id, lead, files), "Lead updated successfully"));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete a lead", description = "Soft delete a lead")
    public ResponseEntity<ApiResponse<String>> deleteLead(@PathVariable Long id) {
        leadService.deleteLead(id);
        return ResponseEntity.ok(new ApiResponse<>(true, "Lead deleted successfully", "Lead deleted successfully"));
    }

    @GetMapping("/analytics-transposed")
    @Operation(summary = "Get Transposed Lead Analytics", description = "Get lead counts transposed for charts")
    public ResponseEntity<ApiResponse<java.util.Map<String, Object>>> getTransposedAnalytics() {
        // Fetch all leads to aggregate (in a real app, use a DB query for counts)
        java.util.List<LeadEntity> allLeads = leadService.getLeads(Pageable.unpaged()).getContent().stream()
            .map(res -> {
                LeadEntity l = new LeadEntity();
                l.setStatus(res.getStatus());
                return l;
            }).toList();
            
        long newCount = allLeads.stream().filter(l -> "NEW".equalsIgnoreCase(l.getStatus())).count();
        long contactedCount = allLeads.stream().filter(l -> "CONTACTED".equalsIgnoreCase(l.getStatus())).count();
        long qualifiedCount = allLeads.stream().filter(l -> "QUALIFIED".equalsIgnoreCase(l.getStatus())).count();
        
        java.util.Map<String, Object> row = new java.util.HashMap<>();
        row.put("snapshot", "Current Pipeline");
        row.put("new", newCount);
        row.put("contacted", contactedCount);
        row.put("qualified", qualifiedCount);

        java.util.Map<String, Object> transposed = com.kia.dms.common.utils.TransposeUtil.transpose(
            java.util.List.of(row),
            java.util.List.of("new", "contacted", "qualified"),
            "snapshot"
        );
        return ResponseEntity.ok(new ApiResponse<>(true, transposed, "Transposed leads successfully"));
    }
}
