package com.kia.dms.modules.auth.controller;

import com.kia.dms.common.response.ApiResponse;
import com.kia.dms.modules.auth.dto.request.*;
import com.kia.dms.modules.auth.dto.response.AuthResponse;
import com.kia.dms.modules.auth.service.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/auth")
@Tag(name = "Authentication", description = "Authentication and Authorization APIs")
public class AuthController {

    @Autowired
    private AuthService authService;

    @Autowired
    private com.kia.dms.security.JwtTokenProvider tokenProvider;

    @Autowired
    private com.kia.dms.security.TokenBlacklistService blacklistService;

    @PostMapping("/login")
    @Operation(summary = "User login", description = "Authenticate user and return JWT token")
    public ResponseEntity<ApiResponse<AuthResponse>> login(
            @io.swagger.v3.oas.annotations.parameters.RequestBody(description = "Login credentials", required = true)
            @Validated @RequestBody LoginRequest request) {
        AuthResponse response = authService.login(request);
        return ResponseEntity.ok(new ApiResponse<>(true, response, "Login successful"));
    }

    @PostMapping("/signup")
    @Operation(summary = "User registration", description = "Register a new user account")
    public ResponseEntity<ApiResponse<AuthResponse>> signup(
            @io.swagger.v3.oas.annotations.parameters.RequestBody(description = "Registration details", required = true)
            @Validated @RequestBody RegisterRequest request) {
        AuthResponse response = authService.register(request);
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(new ApiResponse<>(true, response, "User registered successfully"));
    }

    @PostMapping("/logout")
    @Operation(summary = "User logout", description = "Invalidate user's JWT token")
    public ResponseEntity<ApiResponse<String>> logout(jakarta.servlet.http.HttpServletRequest request) {
        String bearerToken = request.getHeader("Authorization");
        if (org.springframework.util.StringUtils.hasText(bearerToken) && bearerToken.startsWith("Bearer ")) {
            String jwt = bearerToken.substring(7);
            if (tokenProvider.validateToken(jwt)) {
                String jti = tokenProvider.getJtiFromToken(jwt);
                java.util.Date expiration = tokenProvider.getExpirationDateFromToken(jwt);
                long remainingMs = expiration.getTime() - System.currentTimeMillis();
                
                if (remainingMs > 0) {
                    blacklistService.blacklistToken(jti, remainingMs);
                    return ResponseEntity.ok(new ApiResponse<>(true, "Logged out", "Logout successful"));
                }
            }
        }
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(new ApiResponse<>(false, null, "Invalid or missing token for logout"));
    }

    @PostMapping("/verify-email")
    @Operation(summary = "Verify email", description = "Verify user's email using OTP")
    public ResponseEntity<ApiResponse<String>> verifyEmail(@Validated @RequestBody VerifyEmailRequest request) {
        authService.verifyEmail(request);
        return ResponseEntity.ok(new ApiResponse<>(true, "Email verified successfully", "Verification successful"));
    }

    @PostMapping("/resend-otp")
    @Operation(summary = "Resend OTP", description = "Resend a new OTP to user's email")
    public ResponseEntity<ApiResponse<String>> resendOtp(@Validated @RequestBody ResendOtpRequest request) {
        System.out.println("DEBUG: Received Resend OTP request for: " + request.getEmail());
        try {
            authService.resendOtp(request.getEmail());
            return ResponseEntity.ok(new ApiResponse<>(true, "New OTP sent to your email", "OTP Resent successfully"));
        } catch (Exception e) {
            System.err.println("ERROR in resendOtp: " + e.getMessage());
            throw e;
        }
    }

    @PostMapping("/forgot-password")
    @Operation(summary = "Forgot password", description = "Send OTP to user's email for password reset")
    public ResponseEntity<ApiResponse<String>> forgotPassword(@Validated @RequestBody ForgotPasswordRequest request) {
        authService.forgotPassword(request);
        return ResponseEntity.ok(new ApiResponse<>(true, "OTP sent to your email", "Request successful"));
    }

    @PostMapping("/reset-password")
    @Operation(summary = "Reset password", description = "Reset user's password using OTP")
    public ResponseEntity<ApiResponse<String>> resetPassword(@Validated @RequestBody ResetPasswordRequest request) {
        authService.resetPassword(request);
        return ResponseEntity.ok(new ApiResponse<>(true, "Password reset successfully", "Reset successful"));
    }
}
