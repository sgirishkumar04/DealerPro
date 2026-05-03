package com.kia.dms.security;

import org.springframework.stereotype.Service;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

@Service
public class TokenBlacklistService {

    // Using ConcurrentHashMap as an In-Memory fallback since Redis is not available
    private final Map<String, Boolean> blacklist = new ConcurrentHashMap<>();
    private final ScheduledExecutorService scheduler = Executors.newSingleThreadScheduledExecutor();

    /**
     * Add a token JTI to the blacklist with a TTL.
     */
    public void blacklistToken(String jti, long expirationMs) {
        if (jti != null && expirationMs > 0) {
            blacklist.put(jti, true);
            
            // Automatically remove from memory after it would have expired naturally
            scheduler.schedule(() -> blacklist.remove(jti), expirationMs, TimeUnit.MILLISECONDS);
            
            System.out.println("Token blacklisted in memory: " + jti + " (Expires in: " + expirationMs + "ms)");
        }
    }

    /**
     * Get all currently blacklisted JTIs (for demo/debug purposes).
     */
    public java.util.Set<String> getBlacklistedTokens() {
        return blacklist.keySet();
    }

    /**
     * Check if a token JTI is in the blacklist.
     */
    public boolean isBlacklisted(String jti) {
        if (jti == null) return false;
        return blacklist.containsKey(jti);
    }
}
