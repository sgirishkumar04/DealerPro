package com.kia.dms.modules.vehicle.controller;

import com.kia.dms.common.response.ApiResponse;
import com.kia.dms.common.response.PaginationResponse;
import com.kia.dms.modules.vehicle.dto.request.VehicleRequest;
import com.kia.dms.modules.vehicle.dto.response.VehicleResponse;
import com.kia.dms.modules.vehicle.service.VehicleService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/vehicles")
public class VehicleController {

    @Autowired
    private VehicleService vehicleService;

    @GetMapping
    public ResponseEntity<ApiResponse<PaginationResponse<VehicleResponse>>> getAllVehicles(Pageable pageable) {
        return ResponseEntity.ok(new ApiResponse<>(true, vehicleService.getAllVehicles(pageable), "Success"));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<VehicleResponse>> createVehicle(@Validated @RequestBody VehicleRequest request) {
        return ResponseEntity.ok(new ApiResponse<>(true, vehicleService.createVehicle(request), "Created"));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<VehicleResponse>> updateVehicle(@PathVariable Long id, @Validated @RequestBody VehicleRequest request) {
        return ResponseEntity.ok(new ApiResponse<>(true, vehicleService.updateVehicle(id, request), "Updated"));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> deleteVehicle(@PathVariable Long id) {
        vehicleService.deleteVehicle(id);
        return ResponseEntity.ok(new ApiResponse<>(true, null, "Deleted"));
    }
}
