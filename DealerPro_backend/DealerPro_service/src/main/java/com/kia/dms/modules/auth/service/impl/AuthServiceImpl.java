package com.kia.dms.modules.auth.service.impl;

import com.kia.dms.exception.AccountLockedException;
import com.kia.dms.modules.auth.service.LoginAttemptService;
import org.springframework.security.authentication.BadCredentialsException;
import com.kia.dms.exception.ResourceNotFoundException;
import com.kia.dms.modules.auth.dto.request.LoginRequest;
import com.kia.dms.modules.auth.dto.request.RegisterRequest;
import com.kia.dms.modules.auth.dto.response.AuthResponse;
import com.kia.dms.modules.auth.service.AuthService;
import com.kia.dms.modules.dealer.entity.DealerEntity;
import com.kia.dms.modules.user.entity.RoleEntity;
import com.kia.dms.modules.user.entity.UserEntity;
import com.kia.dms.modules.user.repository.RoleRepository;
import com.kia.dms.modules.user.repository.UserRepository;
import com.kia.dms.security.JwtTokenProvider;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import com.kia.dms.modules.auth.dto.request.VerifyEmailRequest;
import com.kia.dms.modules.auth.dto.request.ForgotPasswordRequest;
import com.kia.dms.modules.auth.dto.request.ResetPasswordRequest;
import com.kia.dms.modules.auth.dto.request.ResendOtpRequest;
import com.kia.dms.modules.auth.service.EmailService;
import java.time.LocalDateTime;
import java.util.Random;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthServiceImpl implements AuthService {

    @Autowired
    private AuthenticationManager authenticationManager;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RoleRepository roleRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtTokenProvider tokenProvider;

    @Autowired
    private LoginAttemptService loginAttemptService;

    @Autowired
    private EmailService emailService;

    private String generateOtp() {
        Random random = new Random();
        return String.format("%06d", random.nextInt(1000000));
    }

    @Override
    public AuthResponse login(LoginRequest request) {
        String email = request.getEmail() != null ? request.getEmail().trim() : "";
        
        // Check if user exists first
        UserEntity user = userRepository.findByEmail(email).orElse(null);
        
        // Check if account is locked before attempting authentication (only if user exists)
        if (user != null) {
            loginAttemptService.checkAccountLock(email);
        }

        try {
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(email, request.getPassword())
            );

            SecurityContextHolder.getContext().setAuthentication(authentication);
            String jwt = tokenProvider.generateToken(authentication);

            UserEntity authenticatedUser = getUserWithRoleFromCache(request.getEmail());
            
            // Force fetch roles using native query if JPA fails us
            java.util.List<String> roles;
            try {
                roles = roleRepository.findAllRoleNamesByUserId(authenticatedUser.getId());
                System.out.println("DEBUG: Native SQL roles for " + authenticatedUser.getEmail() + ": " + roles);
            } catch (Exception e) {
                System.err.println("DEBUG: roleRepository fetch failed, trying entity roles: " + e.getMessage());
                roles = authenticatedUser.getRoles().stream()
                        .map(com.kia.dms.modules.user.entity.RoleEntity::getName)
                        .collect(java.util.stream.Collectors.toList());
            }

            if (roles.isEmpty()) {
                System.out.println("DEBUG CRITICAL: Roles still empty for user ID: " + authenticatedUser.getId());
            }

            System.out.println("DEBUG: Final AuthResponse Roles: " + roles);

            return new AuthResponse(jwt, authenticatedUser.getId(), roles, 
                    authenticatedUser.getName(), authenticatedUser.getFirstName(), authenticatedUser.getLastName(), 
                    authenticatedUser.getEmail(), authenticatedUser.getAccountExpiresAt());
        } catch (org.springframework.security.authentication.LockedException e) {
            throw new BadCredentialsException("Your account is currently locked. Please try again later.");
        } catch (BadCredentialsException e) {
            // Only record failed login attempt if user exists
            if (user != null) {
                try {
                    loginAttemptService.loginFailed(request.getEmail());
                    
                    // Get remaining attempts
                    int remainingAttempts = loginAttemptService.getRemainingAttempts(request.getEmail());
                    
                    if (remainingAttempts > 0) {
                        throw new BadCredentialsException(
                            String.format("Invalid username or password. %d attempt(s) remaining before account lock.", remainingAttempts)
                        );
                    } else {
                        throw new BadCredentialsException("Invalid username or password. Account has been locked for 5 minutes.");
                    }
                } catch (AccountLockedException ale) {
                    // Re-throw account locked exception
                    throw ale;
                } catch (BadCredentialsException bce) {
                    // Re-throw bad credentials with attempt info
                    throw bce;
                } catch (Exception ex) {
                    // If account lock feature fails, just throw generic error
                    System.err.println("Failed to record login attempt: " + ex.getMessage());
                    throw new BadCredentialsException("Invalid username or password");
                }
            } else {
                // User doesn't exist - don't reveal this information
                throw new BadCredentialsException("Invalid username or password");
            }
        }
    }

    @Autowired
    private com.kia.dms.modules.user.repository.ManagerRepository managerRepository;

    @Autowired
    private com.kia.dms.modules.user.repository.AdminRepository adminRepository;

    @Autowired
    private com.kia.dms.modules.dealer.repository.DealerRepository dealerRepository;

    @Override
    @Transactional
    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new RuntimeException("Email is already in use!");
        }

        RoleEntity role = roleRepository.findByName(request.getRoleName())
                .orElseThrow(() -> new ResourceNotFoundException("Role not found"));

        UserEntity user = new UserEntity();
        user.setName(request.getName());
        if (request.getName() != null && request.getName().contains(" ")) {
            String[] names = request.getName().split(" ", 2);
            user.setFirstName(names[0]);
            user.setLastName(names[1]);
        } else {
            user.setFirstName(request.getName());
            user.setLastName("");
        }
        user.setEmail(request.getEmail());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.getRoles().add(role);
        user.setIsEmailVerified(true);

        // First save user to get the ID
        user = userRepository.save(user);

        if ("ROLE_DEALER".equals(role.getName())) {
            DealerEntity dealer;
            if (request.getDealerId() != null) {
                dealer = dealerRepository.findById(request.getDealerId())
                        .orElseThrow(() -> new ResourceNotFoundException("Dealer not found"));
            } else {
                // If no dealerId, create a default dealer for this user
                dealer = new DealerEntity();
                dealer.setName(user.getName() + " Outlet");
                dealer.setEmail(user.getEmail());
                dealer.setContactNumber(request.getPhone());
                dealer.setStatus("ACTIVE");
                
                // Assign manager if provided
                if (request.getManagerId() != null) {
                    com.kia.dms.modules.user.entity.ManagerEntity manager = managerRepository.findById(request.getManagerId())
                            .orElseThrow(() -> new ResourceNotFoundException("Manager not found"));
                    dealer.setManager(manager);
                }
                
                dealer = dealerRepository.save(dealer);
            }
            user.setDealer(dealer);
            userRepository.save(user);
        } else if ("ROLE_MANAGER".equals(role.getName())) {
            com.kia.dms.modules.user.entity.ManagerEntity manager = new com.kia.dms.modules.user.entity.ManagerEntity();
            manager.setUser(user);
            manager.setName(user.getName());
            manager.setEmail(user.getEmail());
            manager.setPhone(request.getPhone());
            manager.setManagerUniqueId("MGR-" + String.format("%04d", user.getId()));
            manager = managerRepository.save(manager);
            
            // Assign dealers to this manager if provided
            if (request.getDealerIds() != null && !request.getDealerIds().isEmpty()) {
                for (Long dealerId : request.getDealerIds()) {
                    DealerEntity dealer = dealerRepository.findById(dealerId)
                            .orElseThrow(() -> new ResourceNotFoundException("Dealer with ID " + dealerId + " not found"));
                    dealer.setManager(manager);
                    dealerRepository.save(dealer);
                }
            }
        } else if ("ROLE_ADMIN".equals(role.getName())) {
            com.kia.dms.modules.user.entity.AdminEntity admin = new com.kia.dms.modules.user.entity.AdminEntity();
            admin.setUser(user);
            admin.setName(user.getName());
            admin.setEmail(user.getEmail());
            admin.setPhone(request.getPhone());
            admin.setAdminUniqueId("ADM-" + String.format("%04d", user.getId()));
            adminRepository.save(admin);
        }

        // No MFA needed

        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword())
        );
        SecurityContextHolder.getContext().setAuthentication(authentication);
        String jwt = tokenProvider.generateToken(authentication);

        java.util.List<String> roles = user.getRoles().stream()
                .map(com.kia.dms.modules.user.entity.RoleEntity::getName)
                .collect(java.util.stream.Collectors.toList());

        return new AuthResponse(jwt, user.getId(), roles, user.getName(), user.getFirstName(), user.getLastName(), user.getEmail());
    }

    @Override
    public void verifyEmail(VerifyEmailRequest request) {
        UserEntity user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        if (user.getIsEmailVerified() != null && user.getIsEmailVerified()) {
            throw new BadCredentialsException("Email is already verified.");
        }

        if (user.getOtpCode() == null || !user.getOtpCode().equals(request.getOtp())) {
            throw new BadCredentialsException("Invalid OTP code.");
        }

        if (user.getOtpExpiry() == null || user.getOtpExpiry().isBefore(LocalDateTime.now())) {
            throw new BadCredentialsException("OTP has expired.");
        }

        user.setIsEmailVerified(true); // Automatically verify on signup
        user.setOtpCode(null);
        user.setOtpExpiry(null);
        userRepository.save(user);
    }

    @Override
    @Transactional
    public void resendOtp(String email) {
        UserEntity user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        if (user.getIsEmailVerified() != null && user.getIsEmailVerified()) {
            throw new BadCredentialsException("Email is already verified.");
        }

        String otp = generateOtp();
        user.setOtpCode(otp);
        user.setOtpExpiry(LocalDateTime.now().plusMinutes(5));
        userRepository.save(user);

        // FALLBACK: Print OTP to console so user can see it if email fails
        System.out.println("============================================");
        System.out.println("NEW OTP FOR " + email + ": " + otp);
        System.out.println("============================================");

        try {
            emailService.sendOtpEmail(user.getEmail(), otp);
        } catch (Exception e) {
            System.err.println("Failed to resend verification email: " + e.getMessage());
        }
    }

    @Override
    public void forgotPassword(ForgotPasswordRequest request) {
        UserEntity user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new ResourceNotFoundException("User not found with this email."));

        String otp = generateOtp();
        user.setOtpCode(otp);
        user.setOtpExpiry(LocalDateTime.now().plusMinutes(5));
        userRepository.save(user);

        try {
            emailService.sendForgotPasswordOtp(user.getEmail(), otp);
        } catch (Exception e) {
            throw new RuntimeException("Failed to send reset email. Please try again later.");
        }
    }

    @Override
    public void resetPassword(ResetPasswordRequest request) {
        UserEntity user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new ResourceNotFoundException("User not found."));

        if (user.getOtpCode() == null || !user.getOtpCode().equals(request.getOtp())) {
            throw new BadCredentialsException("Invalid OTP code.");
        }

        if (user.getOtpExpiry() == null || user.getOtpExpiry().isBefore(LocalDateTime.now())) {
            throw new BadCredentialsException("OTP has expired.");
        }

        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        user.setOtpCode(null);
        user.setOtpExpiry(null);
        userRepository.save(user);
    }

    public UserEntity getUserWithRoleFromCache(String email) {
        return userRepository.findByEmailWithRole(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }

    @Override
    public AuthResponse getProfile(String email) {
        UserEntity user = getUserWithRoleFromCache(email);
        
        java.util.List<String> roles;
        try {
            roles = roleRepository.findAllRoleNamesByUserId(user.getId());
        } catch (Exception e) {
            roles = user.getRoles().stream()
                    .map(com.kia.dms.modules.user.entity.RoleEntity::getName)
                    .collect(java.util.stream.Collectors.toList());
        }

        return new AuthResponse(null, user.getId(), roles, 
                user.getName(), user.getFirstName(), user.getLastName(), 
                user.getEmail(), user.getAccountExpiresAt());
    }
}