package com.kia.dms.modules.parts.controller;

import com.kia.dms.common.response.ApiResponse;
import com.kia.dms.common.response.PaginationResponse;
import com.kia.dms.modules.parts.dto.request.PartRequest;
import com.kia.dms.modules.parts.dto.response.PartResponse;
import com.kia.dms.modules.parts.service.PartService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import com.kia.dms.common.dto.request.GlobalSearchRequest;

@RestController
@RequestMapping("/api/v1/parts")
public class PartController {

    @Autowired
    private PartService partService;

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'DEALER')")
    public ResponseEntity<ApiResponse<PaginationResponse<PartResponse>>> getAllParts(
            @RequestParam(required = false) String name,
            @RequestParam(required = false) String supplier,
            Pageable pageable) {
        PaginationResponse<PartResponse> data = partService.getAllParts(name, supplier, pageable);
        return ResponseEntity.ok(new ApiResponse<>(HttpStatus.OK.value(), "Parts retrieved successfully", data));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'DEALER')")
    public ResponseEntity<ApiResponse<PartResponse>> getPartById(@PathVariable Long id) {
        PartResponse data = partService.getPartById(id);
        return ResponseEntity.ok(new ApiResponse<>(HttpStatus.OK.value(), "Part retrieved successfully", data));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'DEALER')")
    public ResponseEntity<ApiResponse<PartResponse>> createPart(@Valid @RequestBody PartRequest request) {
        PartResponse data = partService.createPart(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(new ApiResponse<>(HttpStatus.CREATED.value(), "Part created successfully", data));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'DEALER')")
    public ResponseEntity<ApiResponse<PartResponse>> updatePart(
            @PathVariable Long id,
            @Valid @RequestBody PartRequest request) {
        PartResponse data = partService.updatePart(id, request);
        return ResponseEntity.ok(new ApiResponse<>(HttpStatus.OK.value(), "Part updated successfully", data));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> deletePart(@PathVariable Long id) {
        partService.deletePart(id);
        return ResponseEntity.ok(new ApiResponse<>(HttpStatus.OK.value(), "Part deleted successfully", null));
    }

    @PostMapping("/search")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'DEALER')")
    public ResponseEntity<ApiResponse<PaginationResponse<PartResponse>>> searchParts(@RequestBody GlobalSearchRequest request) {
        return ResponseEntity.ok(new ApiResponse<>(HttpStatus.OK.value(), "Parts searched successfully", partService.searchParts(request)));
    }
}
