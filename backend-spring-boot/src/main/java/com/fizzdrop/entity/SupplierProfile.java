package com.fizzdrop.entity;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "supplier_profiles")
public class SupplierProfile {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false, unique = true)
    @JsonProperty("user_id")
    @JsonAlias({"user_id", "userId"})
    private Long userId;

    @Column(name = "business_name", nullable = false, length = 150)
    @JsonProperty("business_name")
    @JsonAlias({"business_name", "businessName"})
    private String businessName;

    @Column(name = "trade_license_number", length = 100)
    @JsonProperty("trade_license_number")
    @JsonAlias({"trade_license_number", "tradeLicenseNumber"})
    private String tradeLicenseNumber;

    @Column(name = "primary_district_id", nullable = false)
    @JsonProperty("primary_district_id")
    @JsonAlias({"primary_district_id", "primaryDistrictId", "district_id", "districtId"})
    private Long primaryDistrictId;

    @Lob
    @Column(name = "depot_address", columnDefinition = "TEXT")
    @JsonProperty("depot_address")
    @JsonAlias({"depot_address", "depotAddress"})
    private String depotAddress;

    @Column(name = "phone_number", length = 20)
    @JsonProperty("phone_number")
    @JsonAlias({"phone_number", "phoneNumber"})
    private String phoneNumber;

    @Column(name = "is_verified", nullable = false)
    @JsonProperty("is_verified")
    @JsonAlias({"is_verified", "isVerified"})
    private Boolean isVerified = false;

    @Column(name = "created_at", nullable = false)
    @JsonProperty("created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    @JsonProperty("updated_at")
    private LocalDateTime updatedAt;

    // Transient helper fields for API JSON serialization
    @Transient
    @JsonProperty("district_name")
    private String districtName;

    @Transient
    @JsonProperty("division_name")
    private String divisionName;

    public SupplierProfile() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    public SupplierProfile(Long userId, String businessName, Long primaryDistrictId, String depotAddress, String phoneNumber) {
        this();
        this.userId = userId;
        this.businessName = businessName;
        this.primaryDistrictId = primaryDistrictId;
        this.depotAddress = depotAddress;
        this.phoneNumber = phoneNumber;
    }

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) createdAt = LocalDateTime.now();
        if (updatedAt == null) updatedAt = LocalDateTime.now();
        if (isVerified == null) isVerified = false;
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }

    public String getBusinessName() { return businessName; }
    public void setBusinessName(String businessName) { this.businessName = businessName; }

    public String getTradeLicenseNumber() { return tradeLicenseNumber; }
    public void setTradeLicenseNumber(String tradeLicenseNumber) { this.tradeLicenseNumber = tradeLicenseNumber; }

    public Long getPrimaryDistrictId() { return primaryDistrictId; }
    public void setPrimaryDistrictId(Long primaryDistrictId) { this.primaryDistrictId = primaryDistrictId; }

    public String getDepotAddress() { return depotAddress; }
    public void setDepotAddress(String depotAddress) { this.depotAddress = depotAddress; }

    public String getPhoneNumber() { return phoneNumber; }
    public void setPhoneNumber(String phoneNumber) { this.phoneNumber = phoneNumber; }

    public Boolean getIsVerified() { return isVerified; }
    public void setIsVerified(Boolean isVerified) { this.isVerified = isVerified; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }

    public String getDistrictName() { return districtName; }
    public void setDistrictName(String districtName) { this.districtName = districtName; }

    public String getDivisionName() { return divisionName; }
    public void setDivisionName(String divisionName) { this.divisionName = divisionName; }
}
