package com.kia.dms.modules.vehicle.service;

import com.kia.dms.common.response.PaginationResponse;
import com.kia.dms.modules.vehicle.dto.request.VehicleRequest;
import com.kia.dms.modules.vehicle.dto.response.VehicleResponse;
import org.springframework.data.domain.Pageable;

public interface VehicleService {
    PaginationResponse<VehicleResponse> getAllVehicles(Pageable pageable);
    VehicleResponse createVehicle(VehicleRequest request);
    VehicleResponse updateVehicle(Long id, VehicleRequest request);
    void deleteVehicle(Long id);
}
