package com.fizzdrop.entity;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "Users")
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "user_id")
    @JsonProperty("user_id")
    @JsonAlias({"user_id", "userId"})
    private Long userId;

    @Column(name = "role_id", nullable = false)
    @JsonProperty("role_id")
    @JsonAlias({"role_id", "roleId"})
    private Long roleId;

    @Column(name = "branch_id")
    @JsonProperty("branch_id")
    @JsonAlias({"branch_id", "branchId"})
    private Long branchId;

    @Column(name = "email", nullable = false, unique = true, length = 100)
    @JsonProperty("email")
    private String email;

    @Column(name = "password_hash", nullable = false, length = 255)
    @JsonProperty(value = "password_hash", access = JsonProperty.Access.WRITE_ONLY)
    @JsonAlias({"password_hash", "passwordHash", "password"})
    private String passwordHash;

    @Column(name = "created_by")
    @JsonProperty("created_by")
    @JsonAlias({"created_by", "createdBy"})
    private Long createdBy;

    @Column(name = "created_date", nullable = false)
    @JsonProperty("created_date")
    @JsonAlias({"created_date", "createdDate"})
    private LocalDateTime createdDate;

    @Column(name = "updated_by")
    @JsonProperty("updated_by")
    @JsonAlias({"updated_by", "updatedBy"})
    private Long updatedBy;

    @Column(name = "updated_date", nullable = false)
    @JsonProperty("updated_date")
    @JsonAlias({"updated_date", "updatedDate"})
    private LocalDateTime updatedDate;

    public User() {
        this.createdDate = LocalDateTime.now();
        this.updatedDate = LocalDateTime.now();
    }

    public User(Long roleId, Long branchId, String email, String passwordHash) {
        this();
        this.roleId = roleId;
        this.branchId = branchId;
        this.email = email;
        this.passwordHash = passwordHash;
    }

    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }

    public Long getRoleId() { return roleId; }
    public void setRoleId(Long roleId) { this.roleId = roleId; }

    public Long getBranchId() { return branchId; }
    public void setBranchId(Long branchId) { this.branchId = branchId; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getPasswordHash() { return passwordHash; }
    public void setPasswordHash(String passwordHash) { this.passwordHash = passwordHash; }

    public Long getCreatedBy() { return createdBy; }
    public void setCreatedBy(Long createdBy) { this.createdBy = createdBy; }

    public LocalDateTime getCreatedDate() { return createdDate; }
    public void setCreatedDate(LocalDateTime createdDate) { this.createdDate = createdDate; }

    public Long getUpdatedBy() { return updatedBy; }
    public void setUpdatedBy(Long updatedBy) { this.updatedBy = updatedBy; }

    public LocalDateTime getUpdatedDate() { return updatedDate; }
    public void setUpdatedDate(LocalDateTime updatedDate) { this.updatedDate = updatedDate; }
}
