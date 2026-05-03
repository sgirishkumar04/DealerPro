package com.kia.dms.modules.user.entity;

import com.kia.dms.audit.BaseEntity;
import com.kia.dms.modules.dealer.entity.DealerEntity;
import jakarta.persistence.*;

@Entity
@Table(name = "users")
public class UserEntity extends BaseEntity {

    @Column(length = 100, nullable = false)
    private String name;

    @Column(name = "first_name", length = 50)
    private String firstName;

    @Column(name = "last_name", length = 50)
    private String lastName;

    @Column(length = 100, unique = true, nullable = false)
    private String email;

    @Column(length = 255, nullable = false)
    private String password;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "role_id", nullable = false)
    private RoleEntity role;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "dealer_id")
    private DealerEntity dealer;

    @OneToOne(mappedBy = "user", fetch = FetchType.LAZY)
    private ManagerEntity managerProfile;

    @OneToOne(mappedBy = "user", fetch = FetchType.LAZY)
    private AdminEntity adminProfile;

    @Column(name = "is_active")
    private Boolean isActive = true;

    // Account lock fields - nullable and optional
    @Column(name = "failed_login_attempts", nullable = true)
    private Integer failedLoginAttempts;

    @Column(name = "account_locked_until", nullable = true)
    private java.time.LocalDateTime accountLockedUntil;

    @Column(name = "last_failed_login", nullable = true)
    private java.time.LocalDateTime lastFailedLogin;

    @Column(name = "is_email_verified")
    private Boolean isEmailVerified = true;

    @Column(name = "otp_code", length = 6)
    private String otpCode;

    @Column(name = "otp_expiry")
    private java.time.LocalDateTime otpExpiry;

    // getters and setters
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getFirstName() { return firstName; }
    public void setFirstName(String firstName) { this.firstName = firstName; }
    public String getLastName() { return lastName; }
    public void setLastName(String lastName) { this.lastName = lastName; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }
    public RoleEntity getRole() { return role; }
    public void setRole(RoleEntity role) { this.role = role; }
    public DealerEntity getDealer() { return dealer; }
    public void setDealer(DealerEntity dealer) { this.dealer = dealer; }
    public ManagerEntity getManagerProfile() { return managerProfile; }
    public void setManagerProfile(ManagerEntity managerProfile) { this.managerProfile = managerProfile; }
    public AdminEntity getAdminProfile() { return adminProfile; }
    public void setAdminProfile(AdminEntity adminProfile) { this.adminProfile = adminProfile; }
    public Boolean getIsActive() { return isActive; }
    public void setIsActive(Boolean active) { isActive = active; }
    public Integer getFailedLoginAttempts() { return failedLoginAttempts; }
    public void setFailedLoginAttempts(Integer failedLoginAttempts) { this.failedLoginAttempts = failedLoginAttempts; }
    public java.time.LocalDateTime getAccountLockedUntil() { return accountLockedUntil; }
    public void setAccountLockedUntil(java.time.LocalDateTime accountLockedUntil) { this.accountLockedUntil = accountLockedUntil; }
    public java.time.LocalDateTime getLastFailedLogin() { return lastFailedLogin; }
    public void setLastFailedLogin(java.time.LocalDateTime lastFailedLogin) { this.lastFailedLogin = lastFailedLogin; }
    public Boolean getIsEmailVerified() { return isEmailVerified; }
    public void setIsEmailVerified(Boolean emailVerified) { isEmailVerified = emailVerified; }
    public String getOtpCode() { return otpCode; }
    public void setOtpCode(String otpCode) { this.otpCode = otpCode; }
    public java.time.LocalDateTime getOtpExpiry() { return otpExpiry; }
    public void setOtpExpiry(java.time.LocalDateTime otpExpiry) { this.otpExpiry = otpExpiry; }

    @Transient
    public String getFullName() {
        if (firstName == null && lastName == null) return name;
        return (firstName != null ? firstName : "") + " " + (lastName != null ? lastName : "");
    }
}
