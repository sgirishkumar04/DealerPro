package com.kia.dms.modules.vehicle.service.impl;

import com.kia.dms.common.response.PaginationResponse;
import com.kia.dms.exception.ResourceNotFoundException;
import com.kia.dms.modules.vehicle.dto.request.VehicleRequest;
import com.kia.dms.modules.vehicle.dto.response.VehicleResponse;
import com.kia.dms.modules.vehicle.entity.VehicleEntity;
import com.kia.dms.modules.vehicle.repository.VehicleRepository;
import com.kia.dms.modules.vehicle.service.VehicleService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.CachePut;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class VehicleServiceImpl implements VehicleService {

    @Autowired
    private VehicleRepository vehicleRepository;

    @Autowired
    private com.kia.dms.modules.vehicle.repository.KiaCarRepository kiaCarRepository;

    @Override
    @Transactional(readOnly = true)
    @Cacheable(value = "vehicles", key = "#pageable.pageNumber + '-' + #pageable.pageSize")
    public PaginationResponse<VehicleResponse> getAllVehicles(Pageable pageable) {
        System.out.println("CACHE_DEBUG: Fetching vehicles from DB for page: " + pageable.getPageNumber());
        Page<VehicleEntity> page = vehicleRepository.findByIsDeletedFalse(pageable);
        List<VehicleResponse> content = page.getContent().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
        return new PaginationResponse<>(content, page.getNumber(), page.getSize(), page.getTotalElements(), page.getTotalPages());
    }

    @Override
    @Transactional
    @CacheEvict(value = "vehicles", allEntries = true)
    public VehicleResponse createVehicle(VehicleRequest request) {
        VehicleEntity vehicle = new VehicleEntity();
        if (request.getKiaCarId() != null) {
            vehicle.setKiaCar(kiaCarRepository.findById(request.getKiaCarId()).orElse(null));
        }
        vehicle.setPrice(request.getPrice());
        vehicle.setCategory(request.getCategory());
        return mapToResponse(vehicleRepository.save(vehicle));
    }

    @Override
    @Transactional
    @CacheEvict(value = "vehicles", allEntries = true)
    public VehicleResponse updateVehicle(Long id, VehicleRequest request) {
        VehicleEntity vehicle = vehicleRepository.findById(id)
                .filter(v -> !v.getIsDeleted())
                .orElseThrow(() -> new ResourceNotFoundException("Vehicle not found"));
        if (request.getKiaCarId() != null) {
            vehicle.setKiaCar(kiaCarRepository.findById(request.getKiaCarId()).orElse(null));
        }
        vehicle.setPrice(request.getPrice());
        vehicle.setCategory(request.getCategory());
        return mapToResponse(vehicleRepository.save(vehicle));
    }

    @Override
    @Transactional
    @CacheEvict(value = "vehicles", allEntries = true)
    public void deleteVehicle(Long id) {
        VehicleEntity vehicle = vehicleRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Vehicle not found"));
        vehicle.setIsDeleted(true);
        vehicleRepository.save(vehicle);
    }

    private VehicleResponse mapToResponse(VehicleEntity entity) {
        VehicleResponse res = new VehicleResponse();
        res.setId(entity.getId());
        try {
            if (entity.getKiaCar() != null) {
                res.setKiaCarId(entity.getKiaCar().getId());
                res.setName(entity.getKiaCar().getDisplayName());
                res.setModel(entity.getKiaCar().getModelName());
                res.setVariant(entity.getKiaCar().getVariant());
                res.setColor(entity.getKiaCar().getColor());
            }
        } catch (Exception e) {
            res.setName("N/A");
        }
        res.setPrice(entity.getPrice());
        res.setCategory(entity.getCategory());
        try {
            java.time.LocalDateTime lastUpd = entity.getUpdatedAt() != null ? entity.getUpdatedAt() : entity.getCreatedAt();
            if (lastUpd == null) lastUpd = java.time.LocalDateTime.now();
            res.setLastUpdated(lastUpd.format(java.time.format.DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")));
        } catch (Exception e) {
            res.setLastUpdated("N/A");
        }
        return res;
    }
}
