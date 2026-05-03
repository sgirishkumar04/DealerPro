package com.kia.dms.modules.auth.dto.response;

import java.util.List;

public class AuthResponse {
    private String token;
    private Long id;
    private List<String> roles;
    private String name;
    private String firstName;
    private String lastName;
    private String email;

    public AuthResponse(String token, Long id, List<String> roles, String name, String firstName, String lastName, String email) {
        this.token = token;
        this.id = id;
        this.roles = roles;
        this.name = name;
        this.firstName = firstName;
        this.lastName = lastName;
        this.email = email;
    }

    public String getToken() { return token; }
    public void setToken(String token) { this.token = token; }
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public List<String> getRoles() { return roles; }
    public void setRoles(List<String> roles) { this.roles = roles; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getFirstName() { return firstName; }
    public void setFirstName(String firstName) { this.firstName = firstName; }
    public String getLastName() { return lastName; }
    public void setLastName(String lastName) { this.lastName = lastName; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
}
