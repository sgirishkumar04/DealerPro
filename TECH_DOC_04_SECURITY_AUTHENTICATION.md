# Technical Documentation Part 4: Security & Authentication

## 1. Authentication & Authorization

### Overview
DealerPro implements JWT-based authentication with role-based access control using Spring Security.

### Security Configuration

**Location**: `DealerPro_backend/src/main/java/com/kia/dms/security/SecurityConfig.java`

```java
package com.kia.dms.security;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity(prePostEnabled = true)  // Enable @PreAuthorize
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthFilter;
    private final CustomUserDetailsService userDetailsService;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            // Disable CSRF for REST API
            .csrf(csrf -> csrf.disable())
            
            // Configure CORS
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            
            // Configure authorization rules
            .authorizeHttpRequests(auth -> auth
                // Public endpoints
                .requestMatchers("/api/auth/**").permitAll()
                .requestMatchers("/api/v1/swagger-ui/**", "/api/v1/api-docs/**").permitAll()
                
                // Admin-only endpoints
                .requestMatchers(HttpMethod.DELETE, "/api/**").hasRole("ADMIN")
                .requestMatchers("/api/admin/**").hasRole("ADMIN")
                
                // Manager and Admin endpoints
                .requestMatchers("/api/dealers/**").hasAnyRole("ADMIN", "MANAGER")
                .requestMatchers("/api/analytics/**").hasAnyRole("ADMIN", "MANAGER")
                
                // All other endpoints require authentication
                .anyRequest().authenticated()
            )
            
            // Stateless session management (JWT)
            .sessionManagement(session -> 
                session.sessionCreationPolicy(SessionCreationPolicy.STATELESS)
            )
            
            // Add JWT filter before UsernamePasswordAuthenticationFilter
            .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();  // BCrypt for password hashing
    }

    @Bean
    public AuthenticationManager authenticationManager(
            AuthenticationConfiguration config
    ) throws Exception {
        return config.getAuthenticationManager();
    }

    @Bean
    public DaoAuthenticationProvider authenticationProvider() {
        DaoAuthenticationProvider authProvider = new DaoAuthenticationProvider();
        authProvider.setUserDetailsService(userDetailsService);
        authProvider.setPasswordEncoder(passwordEncoder());
        return authProvider;
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(Arrays.asList("http://localhost:5173"));
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(Arrays.asList("*"));
        configuration.setAllowCredentials(true);
        
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}
```

**Key Features**:
- `@EnableMethodSecurity`: Enables method-level security annotations
- CSRF disabled for REST API
- CORS configured for frontend origin
- Stateless session (no server-side sessions)
- JWT filter for token validation
- Role-based endpoint protection
- BCrypt password encoding

### JWT Token Provider

**Location**: `DealerPro_backend/src/main/java/com/kia/dms/security/JwtTokenProvider.java`

```java
package com.kia.dms.security;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

@Component
@Slf4j
public class JwtTokenProvider {

    @Value("${app.jwt-secret}")
    private String jwtSecret;

    private final int jwtExpirationMs = 1800000; // 30 minutes

    // Generate JWT token from authentication
    public String generateToken(Authentication authentication) {
        UserDetails userPrincipal = (UserDetails) authentication.getPrincipal();
        Date now = new Date();
        Date expiryDate = new Date(now.getTime() + jwtExpirationMs);

        return Jwts.builder()
                .setSubject(userPrincipal.getUsername())  // Username as subject
                .setIssuedAt(now)                         // Issue time
                .setExpiration(expiryDate)                // Expiration time
                .signWith(getSigningKey())                // Sign with secret key
                .compact();
    }

    // Get username from JWT token
    public String getUsernameFromToken(String token) {
        Claims claims = Jwts.parserBuilder()
                .setSigningKey(getSigningKey())
                .build()
                .parseClaimsJws(token)
                .getBody();

        return claims.getSubject();
    }

    // Validate JWT token
    public boolean validateToken(String authToken) {
        try {
            Jwts.parserBuilder()
                .setSigningKey(getSigningKey())
                .build()
                .parseClaimsJws(authToken);
            return true;
        } catch (SecurityException ex) {
            log.error("Invalid JWT signature");
        } catch (MalformedJwtException ex) {
            log.error("Invalid JWT token");
        } catch (ExpiredJwtException ex) {
            log.error("Expired JWT token");
        } catch (UnsupportedJwtException ex) {
            log.error("Unsupported JWT token");
        } catch (IllegalArgumentException ex) {
            log.error("JWT claims string is empty");
        }
        return false;
    }

    private SecretKey getSigningKey() {
        byte[] keyBytes = jwtSecret.getBytes(StandardCharsets.UTF_8);
        return Keys.hmacShaKeyFor(keyBytes);
    }
}
```

**Key Features**:
- Token generation with username as subject
- 30-minute expiration time
- HMAC-SHA256 signing algorithm
- Token validation with error handling
- Extracts username from token

### JWT Authentication Filter

**Location**: `DealerPro_backend/src/main/java/com/kia/dms/security/JwtAuthenticationFilter.java`

```java
package com.kia.dms.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
@RequiredArgsConstructor
@Slf4j
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtTokenProvider tokenProvider;
    private final CustomUserDetailsService userDetailsService;

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {
        try {
            // Extract JWT token from request
            String jwt = getJwtFromRequest(request);

            // Validate token and set authentication
            if (StringUtils.hasText(jwt) && tokenProvider.validateToken(jwt)) {
                String username = tokenProvider.getUsernameFromToken(jwt);

                UserDetails userDetails = userDetailsService.loadUserByUsername(username);
                
                UsernamePasswordAuthenticationToken authentication = 
                    new UsernamePasswordAuthenticationToken(
                        userDetails,
                        null,
                        userDetails.getAuthorities()
                    );
                
                authentication.setDetails(
                    new WebAuthenticationDetailsSource().buildDetails(request)
                );

                // Set authentication in security context
                SecurityContextHolder.getContext().setAuthentication(authentication);
                
                log.debug("Set authentication for user: {}", username);
            }
        } catch (Exception ex) {
            log.error("Could not set user authentication in security context", ex);
        }

        filterChain.doFilter(request, response);
    }

    // Extract JWT token from Authorization header
    private String getJwtFromRequest(HttpServletRequest request) {
        String bearerToken = request.getHeader("Authorization");
        
        if (StringUtils.hasText(bearerToken) && bearerToken.startsWith("Bearer ")) {
            return bearerToken.substring(7);  // Remove "Bearer " prefix
        }
        
        return null;
    }
}
```

**Key Features**:
- Extends `OncePerRequestFilter` (executes once per request)
- Extracts JWT from Authorization header
- Validates token
- Loads user details
- Sets authentication in SecurityContext
- Continues filter chain

### Custom UserDetailsService

**Location**: `DealerPro_backend/src/main/java/com/kia/dms/security/CustomUserDetailsService.java`

```java
package com.kia.dms.security;

import com.kia.dms.modules.user.entity.UserEntity;
import com.kia.dms.modules.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.util.Collections;

@Service
@RequiredArgsConstructor
public class CustomUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        UserEntity user = userRepository.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException(
                    "User not found with username: " + username
                ));

        return User.builder()
                .username(user.getUsername())
                .password(user.getPassword())
                .authorities(Collections.singletonList(
                    new SimpleGrantedAuthority("ROLE_" + user.getRole())
                ))
                .accountExpired(false)
                .accountLocked(false)
                .credentialsExpired(false)
                .disabled(false)
                .build();
    }
}
```

**Key Features**:
- Implements Spring Security's `UserDetailsService`
- Loads user from database
- Converts role to Spring Security authority format (`ROLE_` prefix)
- Returns Spring Security `UserDetails` object

---

## 2. Password Hashing

### BCrypt Password Encoder

**Configuration**: Already shown in `SecurityConfig.java`

```java
@Bean
public PasswordEncoder passwordEncoder() {
    return new BCryptPasswordEncoder();  // Strength: 10 (default)
}
```

### Password Hashing in Action

**Location**: `DealerPro_backend/src/main/java/com/kia/dms/modules/auth/service/AuthService.java`

```java
package com.kia.dms.modules.auth.service;

import com.kia.dms.modules.auth.dto.LoginRequest;
import com.kia.dms.modules.auth.dto.RegisterRequest;
import com.kia.dms.modules.auth.dto.AuthResponse;
import com.kia.dms.modules.user.entity.UserEntity;
import com.kia.dms.modules.user.repository.UserRepository;
import com.kia.dms.security.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtTokenProvider tokenProvider;

    // Register new user
    public AuthResponse register(RegisterRequest request) {
        log.info("Registering new user: {}", request.getUsername());

        // Check if username already exists
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new RuntimeException("Username already exists");
        }

        // Hash password before saving
        String hashedPassword = passwordEncoder.encode(request.getPassword());

        // Create new user
        UserEntity user = UserEntity.builder()
                .username(request.getUsername())
                .password(hashedPassword)  // Store hashed password
                .email(request.getEmail())
                .firstName(request.getFirstName())
                .lastName(request.getLastName())
                .role(request.getRole())
                .build();

        userRepository.save(user);
        log.info("User registered successfully: {}", user.getUsername());

        // Generate JWT token
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        request.getUsername(),
                        request.getPassword()
                )
        );

        String token = tokenProvider.generateToken(authentication);

        return AuthResponse.builder()
                .token(token)
                .username(user.getUsername())
                .role(user.getRole())
                .build();
    }

    // Login user
    public AuthResponse login(LoginRequest request) {
        log.info("Login attempt for user: {}", request.getUsername());

        // Authenticate user (password verification happens here)
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        request.getUsername(),
                        request.getPassword()
                )
        );

        // Generate JWT token
        String token = tokenProvider.generateToken(authentication);

        // Get user details
        UserEntity user = userRepository.findByUsername(request.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));

        log.info("User logged in successfully: {}", user.getUsername());

        return AuthResponse.builder()
                .token(token)
                .username(user.getUsername())
                .role(user.getRole())
                .email(user.getEmail())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .build();
    }
}
```

**Key Features**:
- `passwordEncoder.encode()`: Hashes password with BCrypt
- Salt automatically generated and included in hash
- One-way hashing (cannot be reversed)
- Password verification handled by Spring Security
- Hashed password stored in database

**BCrypt Hash Example**:
```
Plain password: "password123"
BCrypt hash: "$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy"
```

---

## 3. User Management & Role Management

### User Entity

**Location**: `DealerPro_backend/src/main/java/com/kia/dms/modules/user/entity/UserEntity.java`

```java
package com.kia.dms.modules.user.entity;

import com.kia.dms.audit.BaseEntity;
import com.kia.dms.common.enums.Role;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "users")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode(callSuper = true)
public class UserEntity extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 50)
    private String username;

    @Column(nullable = false)
    private String password;  // BCrypt hashed

    @Column(nullable = false, unique = true, length = 100)
    private String email;

    @Column(length = 50)
    private String firstName;

    @Column(length = 50)
    private String lastName;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Role role;  // ADMIN, MANAGER, DEALER

    @Column(name = "dealer_id")
    private Long dealerId;  // For DEALER role

    @Column(name = "is_active")
    private Boolean isActive = true;

    // Account lock fields
    @Column(name = "failed_login_attempts")
    private Integer failedLoginAttempts = 0;

    @Column(name = "account_locked_until")
    private LocalDateTime accountLockedUntil;

    @Column(name = "last_failed_login")
    private LocalDateTime lastFailedLogin;
}
```

### Role Enum

**Location**: `DealerPro_backend/src/main/java/com/kia/dms/common/enums/Role.java`

```java
package com.kia.dms.common.enums;

public enum Role {
    ADMIN,      // Full system access
    MANAGER,    // Manage dealers and view analytics
    DEALER      // Manage own inventory and sales
}
```

### User Management Controller

**Location**: `DealerPro_backend/src/main/java/com/kia/dms/modules/admin/controller/AdminUserController.java`

```java
package com.kia.dms.modules.admin.controller;

import com.kia.dms.common.response.ApiResponse;
import com.kia.dms.modules.user.entity.UserEntity;
import com.kia.dms.modules.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/users")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")  // Only ADMIN can access
public class AdminUserController {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    // Get all users
    @GetMapping
    public ResponseEntity<ApiResponse<List<UserEntity>>> getAllUsers() {
        List<UserEntity> users = userRepository.findAll();
        return ResponseEntity.ok(ApiResponse.success(users));
    }

    // Create user
    @PostMapping
    public ResponseEntity<ApiResponse<UserEntity>> createUser(
            @RequestBody UserEntity user
    ) {
        // Hash password
        user.setPassword(passwordEncoder.encode(user.getPassword()));
        UserEntity saved = userRepository.save(user);
        return ResponseEntity.ok(ApiResponse.success(saved));
    }

    // Update user role
    @PatchMapping("/{id}/role")
    public ResponseEntity<ApiResponse<UserEntity>> updateUserRole(
            @PathVariable Long id,
            @RequestParam String role,
            @RequestParam(required = false) Long dealerId
    ) {
        UserEntity user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found"));

        user.setRole(Role.valueOf(role));
        user.setDealerId(dealerId);

        UserEntity updated = userRepository.save(user);
        return ResponseEntity.ok(ApiResponse.success(updated));
    }

    // Toggle user active status
    @PatchMapping("/{id}/status")
    public ResponseEntity<ApiResponse<UserEntity>> toggleUserStatus(
            @PathVariable Long id
    ) {
        UserEntity user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found"));

        user.setIsActive(!user.getIsActive());

        UserEntity updated = userRepository.save(user);
        return ResponseEntity.ok(ApiResponse.success(updated));
    }

    // Delete user
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteUser(@PathVariable Long id) {
        userRepository.deleteById(id);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
```

**Key Features**:
- `@PreAuthorize("hasRole('ADMIN')")`: Class-level authorization
- CRUD operations for user management
- Role assignment
- Active/inactive status toggle
- Password hashing on user creation

---

## 4. Account Lock after 5 Unsuccessful Attempts

### Login Attempt Service

**Location**: `DealerPro_backend/src/main/java/com/kia/dms/modules/auth/service/LoginAttemptService.java`

```java
package com.kia.dms.modules.auth.service;

import com.kia.dms.config.properties.SecurityProperties;
import com.kia.dms.exception.AccountLockedException;
import com.kia.dms.modules.user.entity.UserEntity;
import com.kia.dms.modules.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class LoginAttemptService {

    private final UserRepository userRepository;
    private final SecurityProperties securityProperties;

    // Record failed login attempt
    public void loginFailed(String email) {
        UserEntity user = userRepository.findByEmail(email).orElse(null);
        
        if (user != null) {
            int attempts = user.getFailedLoginAttempts() + 1;
            user.setFailedLoginAttempts(attempts);
            user.setLastFailedLogin(LocalDateTime.now());

            // Lock account if max attempts reached
            int maxAttempts = securityProperties.getMaxLoginAttempts();
            if (attempts >= maxAttempts) {
                int lockDuration = securityProperties.getLockDurationMinutes();
                LocalDateTime lockUntil = LocalDateTime.now().plusMinutes(lockDuration);
                
                user.setAccountLockedUntil(lockUntil);
                logger.warn("Account locked for user: {} until {}", email, lockUntil);
            }

            userRepository.save(user);
        }
    }

    // Record successful login
    public void loginSucceeded(String email) {
        UserEntity user = userRepository.findByEmail(email).orElse(null);
        
        if (user != null) {
            // Reset failed attempts
            user.setFailedLoginAttempts(0);
            user.setAccountLockedUntil(null);
            user.setLastFailedLogin(null);
            
            userRepository.save(user);
            log.info("Login successful for user: {}", email);
        }
    }

    // Check if account is locked
    public boolean isAccountLocked(String email) {
        UserEntity user = userRepository.findByEmail(email).orElse(null);
        
        if (user == null || user.getAccountLockedUntil() == null) {
            return false;
        }

        // Check if lock has expired
        if (LocalDateTime.now().isAfter(user.getAccountLockedUntil())) {
            // Lock expired, reset attempts
            user.setFailedLoginAttempts(0);
            user.setAccountLockedUntil(null);
            user.setLastFailedLogin(null);
            userRepository.save(user);
            log.info("Account lock expired for user: {}", user.getEmail());
            
            return false;
        }

        // Account is still locked
        throw new AccountLockedException(user.getAccountLockedUntil());
    }
}
```

### Security Properties

**Location**: `DealerPro_backend/src/main/java/com/kia/dms/config/properties/SecurityProperties.java`

```java
package com.kia.dms.config.properties;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration
@ConfigurationProperties(prefix = "app.security")
public class SecurityProperties {

    private int maxLoginAttempts = 5;          // Max failed attempts
    private int lockDurationMinutes = 5;       // Lock duration in minutes
    private String jwtSecret;

    // Getters and Setters
    public int getMaxLoginAttempts() {
        return maxLoginAttempts;
    }

    public void setMaxLoginAttempts(int maxLoginAttempts) {
        this.maxLoginAttempts = maxLoginAttempts;
    }

    public int getLockDurationMinutes() {
        return lockDurationMinutes;
    }

    public void setLockDurationMinutes(int lockDurationMinutes) {
        this.lockDurationMinutes = lockDurationMinutes;
    }

    public String getJwtSecret() {
        return jwtSecret;
    }

    public void setJwtSecret(String jwtSecret) {
        this.jwtSecret = jwtSecret;
    }
}
```

**Configuration**:
```properties
# Location: application.properties

# Account Lock Configuration
app.security.max-login-attempts=5
app.security.lock-duration-minutes=5
```

**Key Features**:
- Tracks failed login attempts per user
- Locks account after 5 failed attempts
- Auto-unlocks after 5 minutes
- Resets counter on successful login
- Throws `AccountLockedException` when locked
- Configurable via properties file

