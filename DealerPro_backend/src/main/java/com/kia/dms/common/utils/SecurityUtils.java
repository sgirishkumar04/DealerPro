package com.kia.dms.common.utils;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

public class SecurityUtils {

    public static String getCurrentUserRole() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getAuthorities() != null && !auth.getAuthorities().isEmpty()) {
            return auth.getAuthorities().iterator().next().getAuthority();
        }
        return "UNKNOWN";
    }

    public static boolean isAdmin() {
        String role = getCurrentUserRole();
        return "ADMIN".equals(role) || "ROLE_ADMIN".equals(role);
    }

    public static boolean isManager() {
        String role = getCurrentUserRole();
        return "MANAGER".equals(role) || "ROLE_MANAGER".equals(role);
    }
}
