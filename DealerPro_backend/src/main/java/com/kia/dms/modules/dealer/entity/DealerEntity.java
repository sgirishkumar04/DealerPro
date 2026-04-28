package com.kia.dms.modules.dealer.entity;

import com.kia.dms.audit.BaseEntity;
import jakarta.persistence.*;

@Entity
@Table(name = "dealers")
public class DealerEntity extends BaseEntity {

    @Column(length = 150, nullable = false)
    private String name;

    @Convert(converter = com.kia.dms.common.specification.EncryptionConverter.class)
    @Column(length = 255)
    private String location;

    @Convert(converter = com.kia.dms.common.specification.EncryptionConverter.class)
    @Column(name = "contact_number", length = 20)
    private String contactNumber;

    @Convert(converter = com.kia.dms.common.specification.EncryptionConverter.class)
    @Column(length = 100)
    private String email;

    @Column(length = 50)
    private String status;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "manager_id")
    private com.kia.dms.modules.user.entity.ManagerEntity manager;

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getLocation() { return location; }
    public void setLocation(String location) { this.location = location; }
    public String getContactNumber() { return contactNumber; }
    public void setContactNumber(String contactNumber) { this.contactNumber = contactNumber; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public com.kia.dms.modules.user.entity.ManagerEntity getManager() { return manager; }
    public void setManager(com.kia.dms.modules.user.entity.ManagerEntity manager) { this.manager = manager; }
}
