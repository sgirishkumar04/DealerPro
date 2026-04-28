package com.kia.dms.service;

import com.kia.dms.exception.ResourceNotFoundException;
import com.kia.dms.modules.auth.dto.request.*;
import com.kia.dms.modules.auth.dto.response.AuthResponse;
import com.kia.dms.modules.auth.service.EmailService;
import com.kia.dms.modules.auth.service.LoginAttemptService;
import com.kia.dms.modules.auth.service.impl.AuthServiceImpl;
import com.kia.dms.modules.dealer.entity.DealerEntity;
import com.kia.dms.modules.dealer.repository.DealerRepository;
import com.kia.dms.modules.user.entity.RoleEntity;
import com.kia.dms.modules.user.entity.UserEntity;
import com.kia.dms.modules.user.repository.AdminRepository;
import com.kia.dms.modules.user.repository.ManagerRepository;
import com.kia.dms.modules.user.repository.RoleRepository;
import com.kia.dms.modules.user.repository.UserRepository;
import com.kia.dms.security.JwtTokenProvider;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Unit tests for AuthServiceImpl.
 * Covers: login, registration, OTP verification, forgot password, reset password.
 * All repositories and external dependencies are mocked — no real DB is hit.
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("Auth Service Tests")
class AuthServiceTest {

    @Mock private AuthenticationManager authenticationManager;
    @Mock private UserRepository userRepository;
    @Mock private RoleRepository roleRepository;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private JwtTokenProvider tokenProvider;
    @Mock private LoginAttemptService loginAttemptService;
    @Mock private EmailService emailService;
    @Mock private ManagerRepository managerRepository;
    @Mock private AdminRepository adminRepository;
    @Mock private DealerRepository dealerRepository;

    @InjectMocks
    private AuthServiceImpl authService;

    private UserEntity mockUser;
    private RoleEntity mockRole;

    @BeforeEach
    void setUp() {
        mockRole = new RoleEntity();
        mockRole.setName("ROLE_DEALER");

        mockUser = new UserEntity();
        mockUser.setId(1L);
        mockUser.setEmail("dealer@kia.com");
        mockUser.setPassword("encodedPassword");
        mockUser.setName("Test Dealer");
        mockUser.setFirstName("Test");
        mockUser.setLastName("Dealer");
        mockUser.setRole(mockRole);
        mockUser.setIsEmailVerified(true);

        DealerEntity dealer = new DealerEntity();
        dealer.setId(1L);
        mockUser.setDealer(dealer);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // LOGIN TESTS
    // ─────────────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("Login succeeds when credentials are valid")
    void login_shouldReturnAuthResponse_whenCredentialsAreValid() {
        LoginRequest request = new LoginRequest();
        request.setEmail("dealer@kia.com");
        request.setPassword("correctPassword");

        Authentication mockAuth = mock(Authentication.class);
        when(userRepository.findByEmail("dealer@kia.com")).thenReturn(Optional.of(mockUser));
        when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class)))
            .thenReturn(mockAuth);
        when(tokenProvider.generateToken(mockAuth)).thenReturn("mock.jwt.token");
        when(userRepository.findByEmailWithRole("dealer@kia.com")).thenReturn(Optional.of(mockUser));

        AuthResponse response = authService.login(request);

        assertNotNull(response);
        assertEquals("mock.jwt.token", response.getToken());
        assertEquals("dealer@kia.com", response.getEmail());
        assertEquals("ROLE_DEALER", response.getRole());
        verify(loginAttemptService).checkAccountLock("dealer@kia.com");
        verify(loginAttemptService).loginSucceeded("dealer@kia.com");
    }

    @Test
    @DisplayName("Login fails and records attempt when password is wrong")
    void login_shouldThrowBadCredentials_andRecordFailedAttempt_whenPasswordIsWrong() {
        LoginRequest request = new LoginRequest();
        request.setEmail("dealer@kia.com");
        request.setPassword("wrongPassword");

        when(userRepository.findByEmail("dealer@kia.com")).thenReturn(Optional.of(mockUser));
        when(authenticationManager.authenticate(any()))
            .thenThrow(new BadCredentialsException("Bad credentials"));
        when(loginAttemptService.getRemainingAttempts("dealer@kia.com")).thenReturn(2);

        assertThrows(BadCredentialsException.class, () -> authService.login(request));
        // Must record failed login — this is how account locking is triggered
        verify(loginAttemptService).loginFailed("dealer@kia.com");
    }

    @Test
    @DisplayName("Login with non-existent email does NOT reveal user existence (security)")
    void login_shouldThrowBadCredentials_withoutRevealingUserExistence_whenEmailNotFound() {
        LoginRequest request = new LoginRequest();
        request.setEmail("ghost@kia.com");
        request.setPassword("anyPassword");

        // User does not exist in DB
        when(userRepository.findByEmail("ghost@kia.com")).thenReturn(Optional.empty());
        when(authenticationManager.authenticate(any()))
            .thenThrow(new BadCredentialsException("Bad credentials"));

        BadCredentialsException ex = assertThrows(BadCredentialsException.class,
            () -> authService.login(request));

        // Message must be generic — must NOT say "user not found"
        assertEquals("Invalid username or password", ex.getMessage());
        // CRITICAL: must NOT record a login attempt for a non-existent user
        verify(loginAttemptService, never()).loginFailed(anyString());
    }

    @Test
    @DisplayName("Login is blocked when account is locked (lockout check happens before auth)")
    void login_shouldCheckLock_beforeAttemptingAuthentication_whenUserExists() {
        LoginRequest request = new LoginRequest();
        request.setEmail("dealer@kia.com");
        request.setPassword("anyPassword");

        when(userRepository.findByEmail("dealer@kia.com")).thenReturn(Optional.of(mockUser));

        // checkAccountLock raises exception if account is locked
        doThrow(new com.kia.dms.exception.AccountLockedException(java.time.LocalDateTime.now().plusMinutes(5)))
            .when(loginAttemptService).checkAccountLock("dealer@kia.com");

        assertThrows(com.kia.dms.exception.AccountLockedException.class,
            () -> authService.login(request));

        // IMPORTANT: authenticationManager must NOT be called if account is locked
        verify(authenticationManager, never()).authenticate(any());
    }

    // ─────────────────────────────────────────────────────────────────────────
    // REGISTRATION TESTS
    // ─────────────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("Registration fails when email is already in use")
    void register_shouldThrowException_whenEmailAlreadyExists() {
        RegisterRequest request = new RegisterRequest();
        request.setEmail("existing@kia.com");
        request.setPassword("password123");
        request.setName("Existing User");
        request.setRoleName("ROLE_DEALER");

        when(userRepository.existsByEmail("existing@kia.com")).thenReturn(true);

        RuntimeException ex = assertThrows(RuntimeException.class,
            () -> authService.register(request));
        assertEquals("Email is already in use!", ex.getMessage());
        verify(userRepository, never()).save(any());
    }

    @Test
    @DisplayName("Registration fails when role name does not exist in DB")
    void register_shouldThrowResourceNotFound_whenRoleDoesNotExist() {
        RegisterRequest request = new RegisterRequest();
        request.setEmail("new@kia.com");
        request.setPassword("password123");
        request.setName("New User");
        request.setRoleName("ROLE_NONEXISTENT");

        when(userRepository.existsByEmail("new@kia.com")).thenReturn(false);
        when(roleRepository.findByName("ROLE_NONEXISTENT")).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> authService.register(request));
    }

    @Test
    @DisplayName("Registration splits full name into firstName and lastName correctly")
    void register_shouldSplitFullName_intoFirstAndLastName_onSave() {
        RegisterRequest request = new RegisterRequest();
        request.setEmail("newdealer@kia.com");
        request.setPassword("securePass");
        request.setName("Girish Kumar"); // full name with space
        request.setRoleName("ROLE_DEALER");

        RoleEntity dealerRole = new RoleEntity();
        dealerRole.setName("ROLE_DEALER");

        UserEntity savedUser = new UserEntity();
        savedUser.setId(10L);
        savedUser.setEmail("newdealer@kia.com");
        savedUser.setName("Girish Kumar");
        savedUser.setFirstName("Girish");
        savedUser.setLastName("Kumar");
        savedUser.setRole(dealerRole);

        DealerEntity newDealer = new DealerEntity();
        newDealer.setId(5L);

        when(userRepository.existsByEmail("newdealer@kia.com")).thenReturn(false);
        when(roleRepository.findByName("ROLE_DEALER")).thenReturn(Optional.of(dealerRole));
        when(passwordEncoder.encode("securePass")).thenReturn("hashedPass");
        when(userRepository.save(any(UserEntity.class))).thenReturn(savedUser);
        when(dealerRepository.save(any(DealerEntity.class))).thenReturn(newDealer);
        Authentication mockAuth = mock(Authentication.class);
        when(authenticationManager.authenticate(any())).thenReturn(mockAuth);
        when(tokenProvider.generateToken(mockAuth)).thenReturn("jwt");

        authService.register(request);

        // Verify save was called with the user containing firstName/lastName
        verify(userRepository, atLeast(1)).save(argThat(u ->
            "Girish".equals(u.getFirstName()) && "Kumar".equals(u.getLastName())
        ));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // OTP VERIFICATION TESTS
    // ─────────────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("Email verification fails when OTP code is wrong")
    void verifyEmail_shouldThrowBadCredentials_whenOtpIsWrong() {
        mockUser.setIsEmailVerified(false);
        mockUser.setOtpCode("123456");
        mockUser.setOtpExpiry(LocalDateTime.now().plusMinutes(5));

        VerifyEmailRequest request = new VerifyEmailRequest();
        request.setEmail("dealer@kia.com");
        request.setOtp("999999"); // Wrong OTP

        when(userRepository.findByEmail("dealer@kia.com")).thenReturn(Optional.of(mockUser));

        BadCredentialsException ex = assertThrows(BadCredentialsException.class,
            () -> authService.verifyEmail(request));
        assertEquals("Invalid OTP code.", ex.getMessage());
        verify(userRepository, never()).save(any());
    }

    @Test
    @DisplayName("Email verification fails when OTP has expired")
    void verifyEmail_shouldThrowBadCredentials_whenOtpIsExpired() {
        mockUser.setIsEmailVerified(false);
        mockUser.setOtpCode("123456");
        mockUser.setOtpExpiry(LocalDateTime.now().minusMinutes(1)); // Expired

        VerifyEmailRequest request = new VerifyEmailRequest();
        request.setEmail("dealer@kia.com");
        request.setOtp("123456"); // Correct code but expired

        when(userRepository.findByEmail("dealer@kia.com")).thenReturn(Optional.of(mockUser));

        BadCredentialsException ex = assertThrows(BadCredentialsException.class,
            () -> authService.verifyEmail(request));
        assertEquals("OTP has expired.", ex.getMessage());
    }

    @Test
    @DisplayName("Email verification fails when email is already verified")
    void verifyEmail_shouldThrowBadCredentials_whenEmailAlreadyVerified() {
        mockUser.setIsEmailVerified(true); // Already verified

        VerifyEmailRequest request = new VerifyEmailRequest();
        request.setEmail("dealer@kia.com");
        request.setOtp("123456");

        when(userRepository.findByEmail("dealer@kia.com")).thenReturn(Optional.of(mockUser));

        assertThrows(BadCredentialsException.class, () -> authService.verifyEmail(request));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PASSWORD RESET TESTS
    // ─────────────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("Reset password fails when OTP is wrong")
    void resetPassword_shouldThrowBadCredentials_whenOtpIsWrong() {
        mockUser.setOtpCode("654321");
        mockUser.setOtpExpiry(LocalDateTime.now().plusMinutes(5));

        ResetPasswordRequest request = new ResetPasswordRequest();
        request.setEmail("dealer@kia.com");
        request.setOtp("000000"); // Wrong OTP
        request.setNewPassword("newSecurePass");

        when(userRepository.findByEmail("dealer@kia.com")).thenReturn(Optional.of(mockUser));

        assertThrows(BadCredentialsException.class, () -> authService.resetPassword(request));
        verify(passwordEncoder, never()).encode(any());
        verify(userRepository, never()).save(any());
    }

    @Test
    @DisplayName("Reset password succeeds and clears OTP after use (OTP is single-use)")
    void resetPassword_shouldEncodeNewPassword_andClearOtp_onSuccess() {
        mockUser.setOtpCode("654321");
        mockUser.setOtpExpiry(LocalDateTime.now().plusMinutes(5));

        ResetPasswordRequest request = new ResetPasswordRequest();
        request.setEmail("dealer@kia.com");
        request.setOtp("654321");
        request.setNewPassword("brandNewPassword");

        when(userRepository.findByEmail("dealer@kia.com")).thenReturn(Optional.of(mockUser));
        when(passwordEncoder.encode("brandNewPassword")).thenReturn("hashedBrandNew");

        authService.resetPassword(request);

        // OTP must be cleared after use — prevents replay attacks
        assertNull(mockUser.getOtpCode());
        assertNull(mockUser.getOtpExpiry());
        assertEquals("hashedBrandNew", mockUser.getPassword());
        verify(userRepository).save(mockUser);
    }

    @Test
    @DisplayName("Forgot password fails when email is not registered")
    void forgotPassword_shouldThrowResourceNotFound_whenEmailDoesNotExist() {
        ForgotPasswordRequest request = new ForgotPasswordRequest();
        request.setEmail("unknown@kia.com");

        when(userRepository.findByEmail("unknown@kia.com")).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> authService.forgotPassword(request));
        verify(emailService, never()).sendForgotPasswordOtp(anyString(), anyString());
    }
}
