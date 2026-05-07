package com.kia.dms.exception;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;

public class AccountLockedException extends RuntimeException {
    
    private final LocalDateTime lockedUntil;
    private final long remainingMinutes;
    
    public AccountLockedException(LocalDateTime lockedUntil) {
        super(buildMessage(lockedUntil));
        this.lockedUntil = lockedUntil;
        this.remainingMinutes = ChronoUnit.MINUTES.between(LocalDateTime.now(), lockedUntil);
    }

    public AccountLockedException(LocalDateTime lockedUntil, String message) {
        super(message);
        this.lockedUntil = lockedUntil;
        this.remainingMinutes = 0;
    }
    
    private static String buildMessage(LocalDateTime lockedUntil) {
        long minutes = ChronoUnit.MINUTES.between(LocalDateTime.now(), lockedUntil);
        long seconds = ChronoUnit.SECONDS.between(LocalDateTime.now(), lockedUntil) % 60;
        
        if (minutes > 0) {
            return String.format("Account is locked due to multiple failed login attempts. Please try again in %d minute(s) and %d second(s).", 
                minutes, seconds);
        } else {
            return String.format("Account is locked due to multiple failed login attempts. Please try again in %d second(s).", 
                seconds);
        }
    }
    
    public LocalDateTime getLockedUntil() {
        return lockedUntil;
    }
    
    public long getRemainingMinutes() {
        return remainingMinutes;
    }
}
