package com.kia.dms.modules.auth.service;

import com.kia.dms.modules.auth.dto.request.LoginRequest;
import com.kia.dms.modules.auth.dto.request.RegisterRequest;
import com.kia.dms.modules.auth.dto.response.AuthResponse;

import com.kia.dms.modules.auth.dto.request.VerifyEmailRequest;
import com.kia.dms.modules.auth.dto.request.ForgotPasswordRequest;
import com.kia.dms.modules.auth.dto.request.ResetPasswordRequest;

public interface AuthService {
    AuthResponse login(LoginRequest request);
    AuthResponse register(RegisterRequest request);
    void verifyEmail(VerifyEmailRequest request);
    void resendOtp(String email);
    void forgotPassword(ForgotPasswordRequest request);
    void resetPassword(ResetPasswordRequest request);
    AuthResponse getProfile(String email);
}
