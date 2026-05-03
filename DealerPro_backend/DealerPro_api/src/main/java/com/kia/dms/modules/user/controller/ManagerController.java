package com.kia.dms.modules.user.controller;

import com.kia.dms.common.response.ApiResponse;
import com.kia.dms.common.response.PaginationResponse;
import com.kia.dms.modules.user.entity.ManagerEntity;
import com.kia.dms.modules.user.repository.ManagerRepository;
import com.kia.dms.modules.dealer.entity.DealerEntity;
import com.kia.dms.modules.dealer.repository.DealerRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
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
@RequestMapping("/api/v1/managers")
public class ManagerController {

    @Autowired
    private ManagerRepository managerRepository;

    @Autowired
    private DealerRepository dealerRepository;

    @GetMapping
    public ApiResponse<PaginationResponse<Map<String, Object>>> getAllManagers(Pageable pageable) {
        Page<ManagerEntity> page = managerRepository.findAll(pageable);
        
        // Convert to simple DTOs to avoid lazy loading issues
        List<Map<String, Object>> content = page.getContent().stream()
            .map(m -> {
                Map<String, Object> dto = new HashMap<>();
                dto.put("id", m.getId());
                dto.put("name", m.getName());
                dto.put("email", m.getEmail());
                dto.put("phone", m.getPhone());
                dto.put("managerUniqueId", m.getManagerUniqueId());
                return dto;
            })
            .collect(Collectors.toList());
        
        PaginationResponse<Map<String, Object>> res = new PaginationResponse<>(
                content, page.getNumber(), page.getSize(),
                page.getTotalElements(), page.getTotalPages());
        return new ApiResponse<>(true, res, "Managers fetched successfully");
    }

    @PostMapping("/search")
    public ApiResponse<PaginationResponse<Map<String, Object>>> searchManagers(@RequestBody GlobalSearchRequest request) {
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
        
        List<String> searchColumns = Arrays.asList("name", "email", "phone", "managerUniqueId");
        
        Specification<ManagerEntity> spec = GenericSpecificationBuilder.build(request, searchColumns);
        
        Page<ManagerEntity> page = managerRepository.findAll(spec, pageable);
        
        List<Map<String, Object>> content = page.getContent().stream()
            .map(m -> {
                Map<String, Object> dto = new HashMap<>();
                dto.put("id", m.getId());
                dto.put("name", m.getName());
                dto.put("email", m.getEmail());
                dto.put("phone", m.getPhone());
                dto.put("managerUniqueId", m.getManagerUniqueId());
                return dto;
            })
            .collect(Collectors.toList());
            
        PaginationResponse<Map<String, Object>> res = new PaginationResponse<>(
                content, page.getNumber(), page.getSize(),
                page.getTotalElements(), page.getTotalPages());
        return new ApiResponse<>(true, res, "Managers searched successfully");
    }

    @PostMapping
    public ApiResponse<Map<String, Object>> createManager(@RequestBody Map<String, Object> request) {
        ManagerEntity manager = new ManagerEntity();
        manager.setName((String) request.get("name"));
        manager.setEmail((String) request.get("email"));
        manager.setPhone((String) request.get("phone"));
        
        // Generate unique ID (M + timestamp)
        manager.setManagerUniqueId("M" + System.currentTimeMillis());
        
        ManagerEntity saved = managerRepository.save(manager);
        
        // Assign dealers to this manager if provided
        if (request.get("dealerIds") != null) {
            @SuppressWarnings("unchecked")
            List<Integer> dealerIds = (List<Integer>) request.get("dealerIds");
            for (Integer dealerId : dealerIds) {
                DealerEntity dealer = dealerRepository.findById(dealerId.longValue())
                    .orElseThrow(() -> new RuntimeException("Dealer not found: " + dealerId));
                dealer.setManager(saved);
                dealerRepository.save(dealer);
            }
        }
        
        Map<String, Object> dto = new HashMap<>();
        dto.put("id", saved.getId());
        dto.put("name", saved.getName());
        dto.put("email", saved.getEmail());
        dto.put("phone", saved.getPhone());
        dto.put("managerUniqueId", saved.getManagerUniqueId());
        
        return new ApiResponse<>(true, dto, "Manager created successfully");
    }

    @PutMapping("/{id}")
    public ApiResponse<Map<String, Object>> updateManager(@PathVariable Long id, @RequestBody Map<String, Object> request) {
        ManagerEntity manager = managerRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Manager not found"));
        
        manager.setName((String) request.get("name"));
        manager.setEmail((String) request.get("email"));
        manager.setPhone((String) request.get("phone"));
        
        ManagerEntity updated = managerRepository.save(manager);
        
        // Update dealer assignments if provided
        if (request.get("dealerIds") != null) {
            @SuppressWarnings("unchecked")
            List<Integer> dealerIds = (List<Integer>) request.get("dealerIds");
            
            // First, unassign all dealers currently managed by this manager
            List<DealerEntity> currentDealers = dealerRepository.findAll().stream()
                .filter(d -> d.getManager() != null && d.getManager().getId().equals(id))
                .collect(Collectors.toList());
            
            for (DealerEntity dealer : currentDealers) {
                dealer.setManager(null);
                dealerRepository.save(dealer);
            }
            
            // Then assign the new dealers
            for (Integer dealerId : dealerIds) {
                DealerEntity dealer = dealerRepository.findById(dealerId.longValue())
                    .orElseThrow(() -> new RuntimeException("Dealer not found: " + dealerId));
                dealer.setManager(updated);
                dealerRepository.save(dealer);
            }
        }
        
        Map<String, Object> dto = new HashMap<>();
        dto.put("id", updated.getId());
        dto.put("name", updated.getName());
        dto.put("email", updated.getEmail());
        dto.put("phone", updated.getPhone());
        dto.put("managerUniqueId", updated.getManagerUniqueId());
        
        return new ApiResponse<>(true, dto, "Manager updated successfully");
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> deleteManager(@PathVariable Long id, @RequestParam(required = false) Long reassignToManagerId) {
        if (!managerRepository.existsById(id)) {
            throw new RuntimeException("Manager not found");
        }
        
        // If reassignToManagerId is provided, reassign all dealers to the new manager
        if (reassignToManagerId != null) {
            ManagerEntity newManager = managerRepository.findById(reassignToManagerId)
                .orElseThrow(() -> new RuntimeException("Reassignment manager not found"));
            
            // Find all dealers managed by the manager being deleted
            List<DealerEntity> dealers = dealerRepository.findAll().stream()
                .filter(d -> d.getManager() != null && d.getManager().getId().equals(id))
                .collect(Collectors.toList());
            
            // Reassign dealers to new manager
            for (DealerEntity dealer : dealers) {
                dealer.setManager(newManager);
                dealerRepository.save(dealer);
            }
        }
        
        managerRepository.deleteById(id);
        return new ApiResponse<>(true, null, "Manager deleted successfully");
    }
    
    @GetMapping("/{id}/dealers")
    public ApiResponse<List<Map<String, Object>>> getDealersByManager(@PathVariable Long id) {
        List<Map<String, Object>> dealers = dealerRepository.findAll().stream()
            .filter(d -> d.getManager() != null && d.getManager().getId().equals(id))
            .map(d -> {
                Map<String, Object> dto = new HashMap<>();
                dto.put("id", d.getId());
                dto.put("name", d.getName());
                return dto;
            })
            .collect(Collectors.toList());
        
        return new ApiResponse<>(true, dealers, "Dealers fetched successfully");
    }
    
    @GetMapping("/unassigned-dealers")
    public ApiResponse<List<Map<String, Object>>> getUnassignedDealers() {
        List<Map<String, Object>> dealers = dealerRepository.findDealersWithoutManager().stream()
            .map(d -> {
                Map<String, Object> dto = new HashMap<>();
                dto.put("id", d.getId());
                dto.put("name", d.getName());
                dto.put("location", d.getLocation());
                return dto;
            })
            .collect(Collectors.toList());
        
        return new ApiResponse<>(true, dealers, "Unassigned dealers fetched successfully");
    }
}
