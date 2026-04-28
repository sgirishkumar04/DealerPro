package com.kia.dms.modules.vehicle.controller;

import com.kia.dms.common.response.ApiResponse;
import com.kia.dms.modules.vehicle.entity.KiaCarEntity;
import com.kia.dms.modules.vehicle.repository.KiaCarRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/kia-cars")
public class KiaCarController {

    @Autowired
    private KiaCarRepository kiaCarRepository;

    /**
     * Returns all KIA cars for dropdowns.
     * Each entry contains: id, displayName, modelName, variant, color, category, price
     */
    @GetMapping
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getAllKiaCars() {
        List<KiaCarEntity> cars = kiaCarRepository.findAll();
        List<Map<String, Object>> result = cars.stream()
                .map(c -> Map.<String, Object>of(
                        "id", c.getId(),
                        "displayName", c.getModelName() + " " + c.getVariant() + " (" + c.getColor() + ")",
                        "modelName", c.getModelName(),
                        "variant", c.getVariant(),
                        "color", c.getColor(),
                        "category", c.getCategory(),
                        "price", c.getPrice(),
                        "fuelType", c.getFuelType() != null ? c.getFuelType() : "",
                        "seatingCapacity", c.getSeatingCapacity() != null ? c.getSeatingCapacity() : 5
                ))
                .collect(Collectors.toList());
        return ResponseEntity.ok(new ApiResponse<>(true, result, "KIA cars list"));
    }
}
