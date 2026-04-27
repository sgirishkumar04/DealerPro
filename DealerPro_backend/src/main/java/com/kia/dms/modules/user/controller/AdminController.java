package com.kia.dms.modules.user.controller;

import com.kia.dms.common.response.ApiResponse;
import com.kia.dms.common.response.PaginationResponse;
import com.kia.dms.modules.user.entity.AdminEntity;
import com.kia.dms.modules.user.repository.AdminRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.web.bind.annotation.*;
import com.kia.dms.common.dto.request.SearchRequest;
import com.kia.dms.common.specification.SearchSpecification;
import java.util.Arrays;
import java.util.List;

@RestController
@RequestMapping("/api/admins")
public class AdminController {

    @Autowired
    private AdminRepository adminRepository;

    @GetMapping
    public ApiResponse<PaginationResponse<AdminEntity>> getAllAdmins(Pageable pageable) {
        Page<AdminEntity> page = adminRepository.findAll(pageable);
        PaginationResponse<AdminEntity> res = new PaginationResponse<>(
                page.getContent(), page.getNumber(), page.getSize(),
                page.getTotalElements(), page.getTotalPages());
        return new ApiResponse<>(true, res, "Admins fetched successfully");
    }

    @PostMapping("/search")
    public ApiResponse<PaginationResponse<AdminEntity>> searchAdmins(@RequestBody SearchRequest request) {
        Sort sort = Sort.by(Sort.Direction.fromString(request.getSortDirection()), request.getSortBy());
        Pageable pageable = PageRequest.of(request.getPage(), request.getSize(), sort);
        
        List<String> searchColumns = Arrays.asList("name", "email", "phone", "adminUniqueId");
        
        Specification<AdminEntity> spec = SearchSpecification.build(
            request.getKeyword(), 
            searchColumns, 
            request.getFilters()
        );
        
        Page<AdminEntity> page = adminRepository.findAll(spec, pageable);
        PaginationResponse<AdminEntity> res = new PaginationResponse<>(
                page.getContent(), page.getNumber(), page.getSize(),
                page.getTotalElements(), page.getTotalPages());
        return new ApiResponse<>(true, res, "Admins searched successfully");
    }
}
