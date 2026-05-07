package com.kia.dms.security;

import com.kia.dms.modules.user.entity.UserEntity;
import com.kia.dms.modules.user.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.util.Collections;

@Service
public class CustomUserDetailsService implements UserDetailsService {

    @Autowired
    private UserRepository userRepository;

    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        UserEntity user = userRepository.findByEmailWithRole(email)
                .orElseThrow(() -> new UsernameNotFoundException("User not found with email: " + email));

        java.util.List<GrantedAuthority> authorities = user.getRoles().stream()
                .map(role -> {
                    String name = role.getName();
                    return new SimpleGrantedAuthority(name.startsWith("ROLE_") ? name : "ROLE_" + name);
                })
                .collect(java.util.stream.Collectors.toList());
        
        boolean enabled = user.getIsActive() != null ? user.getIsActive() : true;
        boolean accountNonExpired = user.getAccountExpiresAt() == null || 
                                   java.time.LocalDateTime.now().isBefore(user.getAccountExpiresAt());
        
        return new User(
                user.getEmail(), 
                user.getPassword(), 
                enabled, 
                accountNonExpired, 
                true, 
                true, 
                authorities
        );
    }
}
