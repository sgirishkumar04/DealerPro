package com.kia.dms.modules.auth.service;

import com.kia.dms.config.properties.SecurityProperties;
import com.kia.dms.exception.AccountLockedException;
import com.kia.dms.modules.user.entity.UserEntity;
import com.kia.dms.modules.user.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
public class LoginAttemptService {

    private static final Logger logger = LoggerFactory.getLogger(LoginAttemptService.class);

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private SecurityProperties securityProperties;

    /**
     * Check if account is locked and throw exception if it is
     */
    public void checkAccountLock(String email) {
        try {
            userRepository.findByEmail(email).ifPresent(user -> {
                if (isAccountLocked(user)) {
                    logger.warn("Login attempt for locked account: {}", email);
                    throw new AccountLockedException(user.getAccountLockedUntil());
                }
            });
        } catch (AccountLockedException e) {
            throw e; // Re-throw AccountLockedException
        } catch (Exception e) {
            logger.error("Error checking account lock for {}: {}", email, e.getMessage());
            // Don't block login if there's a database error
        }
    }

    /**
     * Record failed login attempt and lock account if threshold reached
     */
    @Transactional
    public void loginFailed(String email) {
        try {
            userRepository.findByEmail(email).ifPresent(user -> {
                int attempts = (user.getFailedLoginAttempts() != null ? user.getFailedLoginAttempts() : 0) + 1;
                user.setFailedLoginAttempts(attempts);
                user.setLastFailedLogin(LocalDateTime.now());

                int maxAttempts = securityProperties.getMaxLoginAttempts();
                if (attempts >= maxAttempts) {
                    int lockDuration = securityProperties.getLockDurationMinutes();
                    LocalDateTime lockUntil = LocalDateTime.now().plusMinutes(lockDuration);
                    user.setAccountLockedUntil(lockUntil);
                    logger.warn("Account locked for user: {} until {}", email, lockUntil);
                } else {
                    logger.info("Failed login attempt {} of {} for user: {}", attempts, maxAttempts, email);
                }

                userRepository.save(user);
            });
        } catch (Exception e) {
            logger.error("Error recording failed login attempt for {}: {}", email, e.getMessage());
            // Don't block login flow if there's a database error
        }
    }

    /**
     * Reset failed login attempts on successful login
     */
    @Transactional
    public void loginSucceeded(String email) {
        try {
            userRepository.findByEmail(email).ifPresent(user -> {
                if (user.getFailedLoginAttempts() != null && user.getFailedLoginAttempts() > 0) {
                    user.setFailedLoginAttempts(0);
                    user.setAccountLockedUntil(null);
                    user.setLastFailedLogin(null);
                    userRepository.save(user);
                    logger.info("Login attempts reset for user: {}", email);
                }
            });
        } catch (Exception e) {
            logger.error("Error resetting login attempts for {}: {}", email, e.getMessage());
            // Don't block login flow if there's a database error
        }
    }

    /**
     * Check if account is currently locked
     */
    private boolean isAccountLocked(UserEntity user) {
        try {
            if (user.getAccountLockedUntil() == null) {
                return false;
            }

            // Check if lock has expired
            if (LocalDateTime.now().isAfter(user.getAccountLockedUntil())) {
                // Lock expired, reset attempts
                user.setFailedLoginAttempts(0);
                user.setAccountLockedUntil(null);
                user.setLastFailedLogin(null);
                userRepository.save(user);
                logger.info("Account lock expired for user: {}", user.getEmail());
                return false;
            }

            return true;
        } catch (Exception e) {
            logger.error("Error checking if account is locked for {}: {}", user.getEmail(), e.getMessage());
            return false; // Don't block login if there's an error
        }
    }

    /**
     * Get remaining failed attempts before lock
     */
    public int getRemainingAttempts(String email) {
        try {
            int maxAttempts = securityProperties.getMaxLoginAttempts();
            return userRepository.findByEmail(email)
                    .map(user -> {
                        int attempts = user.getFailedLoginAttempts() != null ? user.getFailedLoginAttempts() : 0;
                        return Math.max(0, maxAttempts - attempts);
                    })
                    .orElse(maxAttempts);
        } catch (Exception e) {
            logger.error("Error getting remaining attempts for {}: {}", email, e.getMessage());
            return securityProperties.getMaxLoginAttempts(); // Return max attempts if there's an error
        }
    }

    /**
     * Manually unlock account (admin function)
     */
    @Transactional
    public void unlockAccount(String email) {
        userRepository.findByEmail(email).ifPresent(user -> {
            user.setFailedLoginAttempts(0);
            user.setAccountLockedUntil(null);
            user.setLastFailedLogin(null);
            userRepository.save(user);
            logger.info("Account manually unlocked for user: {}", email);
        });
    }
}
