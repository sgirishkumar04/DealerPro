package com.kia.dms.modules.user.entity;

import com.kia.dms.audit.BaseEntity;
import jakarta.persistence.*;

@Entity
@Table(name = "roles")
public class RoleEntity extends BaseEntity {

    @Column(length = 50, unique = true, nullable = false)
    private String name;

    @Column(length = 255)
    private String description;

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
}
