package com.kia.dms.security;

import com.kia.dms.common.response.ApiResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Set;

/**
 * Controller specifically created for the Project Demo to visualize the JWT Blacklist.
 */
@RestController
@RequestMapping("/api/v1/security")
public class SecurityDemoController {

    @Autowired
    private TokenBlacklistService blacklistService;

    @GetMapping("/blacklist")
    public ApiResponse<Set<String>> getBlacklist() {
        Set<String> tokens = blacklistService.getBlacklistedTokens();
        String message = tokens.isEmpty() 
            ? "Blacklist is currently empty. Log out to see a token captured here." 
            : "Displaying currently revoked Token IDs (JTIs).";
            
        return new ApiResponse<>(true, tokens, message);
    }
}
