package com.fizzdrop.entity;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "sales_officers")
public class SalesOfficer {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "officer_code", nullable = false, unique = true, length = 60)
    @JsonProperty("officer_code")
    @JsonAlias({"officer_code", "officerCode"})
    private String officerCode;

    @Column(name = "name", nullable = false, length = 150)
    private String name;

    @Column(name = "email", length = 100)
    private String email;

    @Column(name = "phone", nullable = false, length = 30)
    private String phone;

    @Column(name = "supplier_id", nullable = false)
    @JsonProperty("supplier_id")
    @JsonAlias({"supplier_id", "supplierId"})
    private Long supplierId;

    @Column(name = "district_id")
    @JsonProperty("district_id")
    @JsonAlias({"district_id", "districtId"})
    private Long districtId;

    @Column(name = "city", nullable = false, length = 100)
    private String city;

    @Column(name = "assigned_area", nullable = false, length = 150)
    @JsonProperty("assigned_area")
    @JsonAlias({"assigned_area", "assignedArea", "area"})
    private String assignedArea;

    @Column(name = "status", nullable = false, length = 30)
    private String status = "ACTIVE";

    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;

    @Column(name = "user_id")
    @JsonProperty("user_id")
    @JsonAlias({"user_id", "userId"})
    private Long userId;

    @Column(name = "password_hash")
    @JsonProperty("password_hash")
    private String passwordHash = "Officer123!";

    @Column(name = "created_at", nullable = false)
    @JsonProperty("created_at")
    @JsonAlias({"created_at", "createdAt"})
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at", nullable = false)
    @JsonProperty("updated_at")
    @JsonAlias({"updated_at", "updatedAt"})
    private LocalDateTime updatedAt = LocalDateTime.now();

    // Transient metadata for UI display
    @Transient
    @JsonProperty("supplier_name")
    private String supplierName;

    @Transient
    @JsonProperty("outlet_count")
    private Integer outletCount = 0;

    public SalesOfficer() {
    }

    public SalesOfficer(String officerCode, String name, String email, String phone, Long supplierId, Long districtId, String city, String assignedArea) {
        this.officerCode = officerCode;
        this.name = name;
        this.email = email;
        this.phone = phone;
        this.supplierId = supplierId;
        this.districtId = districtId;
        this.city = city;
        this.assignedArea = assignedArea;
        this.status = "ACTIVE";
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    @PrePersist
    public void onPrePersist() {
        if (this.createdAt == null) this.createdAt = LocalDateTime.now();
        if (this.updatedAt == null) this.updatedAt = LocalDateTime.now();
        if (this.status == null) this.status = "ACTIVE";
        if (this.passwordHash == null) this.passwordHash = "Officer123!";
    }

    @PreUpdate
    public void onPreUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getOfficerCode() { return officerCode; }
    public void setOfficerCode(String officerCode) { this.officerCode = officerCode; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public Long getSupplierId() { return supplierId; }
    public void setSupplierId(Long supplierId) { this.supplierId = supplierId; }

    public Long getDistrictId() { return districtId; }
    public void setDistrictId(Long districtId) { this.districtId = districtId; }

    public String getCity() { return city; }
    public void setCity(String city) { this.city = city; }

    public String getAssignedArea() { return assignedArea; }
    public void setAssignedArea(String assignedArea) { this.assignedArea = assignedArea; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }

    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }

    public String getPasswordHash() { return passwordHash; }
    public void setPasswordHash(String passwordHash) { this.passwordHash = passwordHash; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }

    public String getSupplierName() { return supplierName; }
    public void setSupplierName(String supplierName) { this.supplierName = supplierName; }

    public Integer getOutletCount() { return outletCount; }
    public void setOutletCount(Integer outletCount) { this.outletCount = outletCount; }
}
