package com.fizzdrop.entity;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "Outlets")
public class Outlet {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "outlet_id")
    @JsonProperty("outlet_id")
    @JsonAlias({"outlet_id", "outletId"})
    private Long outletId;

    @Column(name = "outlet_name", nullable = false, length = 100)
    @JsonProperty("outlet_name")
    @JsonAlias({"outlet_name", "outletName"})
    private String outletName;

    @Column(name = "location_address", nullable = false, length = 255)
    @JsonProperty("location_address")
    @JsonAlias({"location_address", "locationAddress", "address"})
    private String locationAddress;

    @Column(name = "contact_phone", length = 50)
    @JsonProperty("contact_phone")
    @JsonAlias({"contact_phone", "contactPhone", "phone"})
    private String contactPhone;

    @Column(name = "status", nullable = false, length = 20)
    @JsonProperty("status")
    @JsonAlias({"status"})
    private String status = "Active";

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

    public Outlet() {
        this.createdDate = LocalDateTime.now();
        this.updatedDate = LocalDateTime.now();
    }

    public Outlet(String outletName, String locationAddress, String contactPhone, String status) {
        this();
        this.outletName = outletName;
        this.locationAddress = locationAddress;
        this.contactPhone = contactPhone;
        this.status = status != null ? status : "Active";
    }

    @PrePersist
    protected void onCreate() {
        if (createdDate == null) createdDate = LocalDateTime.now();
        if (updatedDate == null) updatedDate = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedDate = LocalDateTime.now();
    }

    // Getters and Setters
    public Long getOutletId() { return outletId; }
    public void setOutletId(Long outletId) { this.outletId = outletId; }

    public String getOutletName() { return outletName; }
    public void setOutletName(String outletName) { this.outletName = outletName; }

    public String getLocationAddress() { return locationAddress; }
    public void setLocationAddress(String locationAddress) { this.locationAddress = locationAddress; }

    public String getContactPhone() { return contactPhone; }
    public void setContactPhone(String contactPhone) { this.contactPhone = contactPhone; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public Long getCreatedBy() { return createdBy; }
    public void setCreatedBy(Long createdBy) { this.createdBy = createdBy; }

    public LocalDateTime getCreatedDate() { return createdDate; }
    public void setCreatedDate(LocalDateTime createdDate) { this.createdDate = createdDate; }

    public Long getUpdatedBy() { return updatedBy; }
    public void setUpdatedBy(Long updatedBy) { this.updatedBy = updatedBy; }

    public LocalDateTime getUpdatedDate() { return updatedDate; }
    public void setUpdatedDate(LocalDateTime updatedDate) { this.updatedDate = updatedDate; }
}
