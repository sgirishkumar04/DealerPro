package com.kia.dms.modules.auth.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public class RegisterRequest {

    @NotBlank(message = "Name cannot be blank")
    private String name;

    @NotBlank(message = "Email cannot be blank")
    @Email(message = "Invalid email format")
    private String email;

    private String phone;

    @NotBlank(message = "Password cannot be blank")
    @Pattern(regexp = "^(?=.*[0-9])(?=.*[a-z])(?=.*[A-Z])(?=.*[@#$%^&+=_!]).{8,}$",
             message = "Password must be at least 8 characters long, contain 1 uppercase, 1 lowercase, 1 digit, and 1 special character")
    private String password;

    @NotBlank(message = "Role is required (ADMIN, MANAGER, DEALER)")
    private String roleName;

    private Long dealerId;
    
    private Long managerId;
    
    private java.util.List<Long> dealerIds;

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }
    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }
    public String getRoleName() { return roleName; }
    public void setRoleName(String roleName) { this.roleName = roleName; }
    public Long getDealerId() { return dealerId; }
    public void setDealerId(Long dealerId) { this.dealerId = dealerId; }
    public Long getManagerId() { return managerId; }
    public void setManagerId(Long managerId) { this.managerId = managerId; }
    public java.util.List<Long> getDealerIds() { return dealerIds; }
    public void setDealerIds(java.util.List<Long> dealerIds) { this.dealerIds = dealerIds; }
}
