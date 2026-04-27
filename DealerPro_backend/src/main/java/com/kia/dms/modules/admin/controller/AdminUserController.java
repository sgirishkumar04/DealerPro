package com.kia.dms.modules.admin.controller;

import com.kia.dms.common.response.ApiResponse;
import com.kia.dms.common.response.PaginationResponse;
import com.kia.dms.modules.user.entity.UserEntity;
import com.kia.dms.modules.user.entity.RoleEntity;
import com.kia.dms.modules.dealer.entity.DealerEntity;
import com.kia.dms.modules.user.repository.UserRepository;
import com.kia.dms.modules.user.repository.RoleRepository;
import com.kia.dms.modules.dealer.repository.DealerRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.crypto.password.PasswordEncoder;
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
@RequestMapping("/api/admin/users")
public class AdminUserController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RoleRepository roleRepository;

    @Autowired
    private DealerRepository dealerRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @GetMapping
    public ApiResponse<PaginationResponse<Map<String, Object>>> getAllUsers(Pageable pageable) {
        Page<UserEntity> page = userRepository.findAll(pageable);
        
        List<Map<String, Object>> content = page.getContent().stream()
            .map(u -> {
                Map<String, Object> dto = new HashMap<>();
                dto.put("id", u.getId());
                dto.put("name", u.getName());
                dto.put("email", u.getEmail());
                dto.put("role", u.getRole() != null ? u.getRole().getName() : null);
                dto.put("dealerId", u.getDealer() != null ? u.getDealer().getId() : null);
                dto.put("isActive", u.getIsActive() != null ? u.getIsActive() : true);
                return dto;
            })
            .collect(Collectors.toList());
        
        PaginationResponse<Map<String, Object>> res = new PaginationResponse<>(
                content, page.getNumber(), page.getSize(),
                page.getTotalElements(), page.getTotalPages());
        return new ApiResponse<>(true, res, "Users fetched successfully");
    }

    @PostMapping
    public ApiResponse<Map<String, Object>> createUser(@RequestBody Map<String, Object> request) {
        UserEntity user = new UserEntity();
        user.setName((String) request.get("name"));
        user.setEmail((String) request.get("email"));
        user.setPassword(passwordEncoder.encode("password123")); // Default password
        user.setIsActive(true);
        
        // Set role
        String roleNameInput = (String) request.get("role");
        final String roleName = roleNameInput.startsWith("ROLE_") ? roleNameInput : "ROLE_" + roleNameInput;
        RoleEntity role = roleRepository.findByName(roleName)
            .orElseThrow(() -> new RuntimeException("Role not found: " + roleName));
        user.setRole(role);
        
        // Set dealer if role is DEALER
        if (roleName.equals("ROLE_DEALER") && request.get("dealerId") != null) {
            Long dealerId = ((Number) request.get("dealerId")).longValue();
            DealerEntity dealer = dealerRepository.findById(dealerId)
                .orElseThrow(() -> new RuntimeException("Dealer not found"));
            user.setDealer(dealer);
        }
        
        UserEntity saved = userRepository.save(user);
        
        Map<String, Object> dto = new HashMap<>();
        dto.put("id", saved.getId());
        dto.put("name", saved.getName());
        dto.put("email", saved.getEmail());
        dto.put("role", saved.getRole().getName());
        dto.put("dealerId", saved.getDealer() != null ? saved.getDealer().getId() : null);
        dto.put("isActive", saved.getIsActive());
        
        return new ApiResponse<>(true, dto, "User created successfully");
    }

    @PutMapping("/{id}")
    public ApiResponse<Map<String, Object>> updateUser(@PathVariable Long id, @RequestBody Map<String, Object> request) {
        UserEntity user = userRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("User not found"));
        
        // Update role
        if (request.containsKey("role")) {
            String roleNameInput = (String) request.get("role");
            final String roleName = roleNameInput.startsWith("ROLE_") ? roleNameInput : "ROLE_" + roleNameInput;
            RoleEntity role = roleRepository.findByName(roleName)
                .orElseThrow(() -> new RuntimeException("Role not found: " + roleName));
            user.setRole(role);
        }
        
        // Update dealer if role is DEALER
        if (request.containsKey("dealerId") && request.get("dealerId") != null) {
            Long dealerId = ((Number) request.get("dealerId")).longValue();
            DealerEntity dealer = dealerRepository.findById(dealerId)
                .orElseThrow(() -> new RuntimeException("Dealer not found"));
            user.setDealer(dealer);
        }
        
        UserEntity updated = userRepository.save(user);
        
        Map<String, Object> dto = new HashMap<>();
        dto.put("id", updated.getId());
        dto.put("name", updated.getName());
        dto.put("email", updated.getEmail());
        dto.put("role", updated.getRole().getName());
        dto.put("dealerId", updated.getDealer() != null ? updated.getDealer().getId() : null);
        dto.put("isActive", updated.getIsActive());
        
        return new ApiResponse<>(true, dto, "User updated successfully");
    }

    @PutMapping("/{id}/toggle-active")
    public ApiResponse<Map<String, Object>> toggleUserActive(@PathVariable Long id, @RequestBody Map<String, Boolean> request) {
        UserEntity user = userRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("User not found"));
        
        user.setIsActive(request.get("isActive"));
        UserEntity updated = userRepository.save(user);
        
        Map<String, Object> dto = new HashMap<>();
        dto.put("id", updated.getId());
        dto.put("name", updated.getName());
        dto.put("email", updated.getEmail());
        dto.put("role", updated.getRole().getName());
        dto.put("dealerId", updated.getDealer() != null ? updated.getDealer().getId() : null);
        dto.put("isActive", updated.getIsActive());
        
        return new ApiResponse<>(true, dto, "User status updated successfully");
    }

    @PostMapping("/search")
    public ApiResponse<PaginationResponse<Map<String, Object>>> searchUsers(@RequestBody GlobalSearchRequest request) {
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
        
        List<String> searchColumns = Arrays.asList("name", "email", "firstName", "lastName");
        
        Specification<UserEntity> spec = GenericSpecificationBuilder.build(request, searchColumns);
        
        Page<UserEntity> page = userRepository.findAll(spec, pageable);
        
        List<Map<String, Object>> content = page.getContent().stream()
            .map(u -> {
                Map<String, Object> dto = new HashMap<>();
                dto.put("id", u.getId());
                dto.put("name", u.getName());
                dto.put("email", u.getEmail());
                dto.put("role", u.getRole() != null ? u.getRole().getName() : null);
                dto.put("dealerId", u.getDealer() != null ? u.getDealer().getId() : null);
                dto.put("isActive", u.getIsActive() != null ? u.getIsActive() : true);
                return dto;
            })
            .collect(Collectors.toList());
            
        PaginationResponse<Map<String, Object>> res = new PaginationResponse<>(
                content, page.getNumber(), page.getSize(),
                page.getTotalElements(), page.getTotalPages());
        return new ApiResponse<>(true, res, "Users searched successfully");
    }
}
