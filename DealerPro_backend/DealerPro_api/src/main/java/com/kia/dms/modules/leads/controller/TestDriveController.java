package com.kia.dms.modules.leads.controller;

import com.kia.dms.common.response.ApiResponse;
import com.kia.dms.common.response.PaginationResponse;
import com.kia.dms.modules.leads.dto.request.TestDriveRequest;
import com.kia.dms.modules.leads.dto.response.TestDriveResponse;
import com.kia.dms.modules.leads.service.LeadService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import com.kia.dms.common.dto.request.GlobalSearchRequest;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/test-drives")
@Tag(name = "Test Drives", description = "Test Drive Management APIs")
@SecurityRequirement(name = "Bearer Authentication")
public class TestDriveController {

    @Autowired private LeadService leadService;

    @GetMapping
    @Operation(summary = "Get all test drives", description = "Retrieve paginated list of test drives")
    public ResponseEntity<ApiResponse<PaginationResponse<TestDriveResponse>>> getTestDrives(
            @Parameter(description = "Pagination parameters") Pageable pageable) {
        return ResponseEntity.ok(new ApiResponse<>(true, leadService.getTestDrives(pageable), "Test drives retrieved successfully"));
    }

    @PostMapping
    @Operation(summary = "Schedule test drive", description = "Schedule a new test drive")
    public ResponseEntity<ApiResponse<TestDriveResponse>> scheduleTestDrive(
            @io.swagger.v3.oas.annotations.parameters.RequestBody(description = "Test drive details", required = true)
            @RequestBody TestDriveRequest request) {
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(new ApiResponse<>(true, leadService.scheduleTestDrive(request), "Test drive scheduled successfully"));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update test drive", description = "Update an existing test drive")
    public ResponseEntity<ApiResponse<TestDriveResponse>> updateTestDrive(
            @Parameter(description = "Test drive ID") @PathVariable Long id,
            @io.swagger.v3.oas.annotations.parameters.RequestBody(description = "Updated test drive details", required = true)
            @RequestBody TestDriveRequest request) {
        return ResponseEntity.ok(new ApiResponse<>(true, leadService.updateTestDrive(id, request), "Test drive updated successfully"));
    }

    @PostMapping("/search")
    @Operation(summary = "Advanced search test drives", description = "Search test drives with filters and sorts")
    public ResponseEntity<ApiResponse<PaginationResponse<TestDriveResponse>>> searchTestDrives(
            @RequestBody GlobalSearchRequest request) {
        return ResponseEntity.ok(new ApiResponse<>(true, leadService.searchTestDrives(request), "Advanced search results retrieved successfully"));
    }
}
