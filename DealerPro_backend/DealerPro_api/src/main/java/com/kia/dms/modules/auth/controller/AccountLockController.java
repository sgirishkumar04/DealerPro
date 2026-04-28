package com.kia.dms.modules.auth.controller;

import com.kia.dms.common.response.ApiResponse;
import com.kia.dms.modules.auth.service.LoginAttemptService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/account-lock")
@Tag(name = "Account Lock Management", description = "APIs for managing account locks")
@SecurityRequirement(name = "Bearer Authentication")
public class AccountLockController {

    @Autowired
    private LoginAttemptService loginAttemptService;

    @PostMapping("/unlock")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(
        summary = "Unlock user account",
        description = "Manually unlock a locked user account (Admin only)"
    )
    public ResponseEntity<ApiResponse<String>> unlockAccount(
            @Parameter(description = "User email address") @RequestParam String email) {
        loginAttemptService.unlockAccount(email);
        return ResponseEntity.ok(new ApiResponse<>(true, email, "Account unlocked successfully"));
    }

    @GetMapping("/remaining-attempts")
    @Operation(
        summary = "Get remaining login attempts",
        description = "Check how many login attempts remain before account lock"
    )
    public ResponseEntity<ApiResponse<Integer>> getRemainingAttempts(
            @Parameter(description = "User email address") @RequestParam String email) {
        int remaining = loginAttemptService.getRemainingAttempts(email);
        return ResponseEntity.ok(new ApiResponse<>(true, remaining, "Remaining attempts retrieved successfully"));
    }
}
