package com.fizzdrop.entity;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "pre_sales_officers")
public class PreSalesOfficer {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "psr_code", nullable = false, unique = true, length = 60)
    @JsonProperty("psr_code")
    @JsonAlias({"psr_code", "psrCode", "code"})
    private String psrCode;

    @Column(name = "name", nullable = false, length = 150)
    private String name;

    @Column(name = "phone", nullable = false, length = 30)
    private String phone;

    @Column(name = "email", length = 100, unique = true)
    private String email;

    @Column(name = "password_hash")
    @JsonProperty("password_hash")
    private String passwordHash = "Psr123!";

    @Column(name = "sales_officer_id", nullable = false)
    @JsonProperty("sales_officer_id")
    @JsonAlias({"sales_officer_id", "salesOfficerId"})
    private Long salesOfficerId;

    @Column(name = "sub_route", nullable = false, length = 255)
    @JsonProperty("sub_route")
    @JsonAlias({"sub_route", "subRoute", "route"})
    private String subRoute;

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

    @Column(name = "target_cases")
    @JsonProperty("target_cases")
    @JsonAlias({"target_cases", "targetCases"})
    private Integer targetCases = 0;

    @Column(name = "target_sku_ounces", length = 150)
    @JsonProperty("target_sku_ounces")
    @JsonAlias({"target_sku_ounces", "targetSkuOunces"})
    private String targetSkuOunces;

    @Column(name = "target_product_id")
    @JsonProperty("target_product_id")
    @JsonAlias({"target_product_id", "targetProductId"})
    private Long targetProductId;

    @Column(name = "target_notes", length = 255)
    @JsonProperty("target_notes")
    @JsonAlias({"target_notes", "targetNotes"})
    private String targetNotes;

    @Column(name = "created_at", nullable = false)
    @JsonProperty("created_at")
    @JsonAlias({"created_at", "createdAt"})
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at", nullable = false)
    @JsonProperty("updated_at")
    @JsonAlias({"updated_at", "updatedAt"})
    private LocalDateTime updatedAt = LocalDateTime.now();

    @Transient
    @JsonProperty("sales_officer_name")
    private String salesOfficerName;

    @Transient
    @JsonProperty("sales_officer_code")
    private String salesOfficerCode;

    @Transient
    @JsonProperty("outlet_count")
    private Integer outletCount = 0;

    @Transient
    @JsonProperty("active_orders_count")
    private Integer activeOrdersCount = 0;

    @Transient
    @JsonProperty("pending_refunds_count")
    private Integer pendingRefundsCount = 0;

    @Transient
    @JsonProperty("achieved_cases")
    private Integer achievedCases = 0;

    public PreSalesOfficer() {
    }

    public PreSalesOfficer(String psrCode, String name, String phone, String email, Long salesOfficerId, String subRoute, String assignedArea) {
        this.psrCode = psrCode;
        this.name = name;
        this.phone = phone;
        this.email = email;
        this.salesOfficerId = salesOfficerId;
        this.subRoute = subRoute;
        this.assignedArea = assignedArea;
        this.status = "ACTIVE";
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getPsrCode() { return psrCode; }
    public void setPsrCode(String psrCode) { this.psrCode = psrCode; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getPasswordHash() { return passwordHash; }
    public void setPasswordHash(String passwordHash) { this.passwordHash = passwordHash; }

    public Long getSalesOfficerId() { return salesOfficerId; }
    public void setSalesOfficerId(Long salesOfficerId) { this.salesOfficerId = salesOfficerId; }

    public String getSubRoute() { return subRoute; }
    public void setSubRoute(String subRoute) { this.subRoute = subRoute; }

    public String getAssignedArea() { return assignedArea; }
    public void setAssignedArea(String assignedArea) { this.assignedArea = assignedArea; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }

    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }

    public String getSalesOfficerName() { return salesOfficerName; }
    public void setSalesOfficerName(String salesOfficerName) { this.salesOfficerName = salesOfficerName; }

    public String getSalesOfficerCode() { return salesOfficerCode; }
    public void setSalesOfficerCode(String salesOfficerCode) { this.salesOfficerCode = salesOfficerCode; }

    public Integer getOutletCount() { return outletCount; }
    public void setOutletCount(Integer outletCount) { this.outletCount = outletCount; }

    public Integer getActiveOrdersCount() { return activeOrdersCount; }
    public void setActiveOrdersCount(Integer activeOrdersCount) { this.activeOrdersCount = activeOrdersCount; }

    public Integer getPendingRefundsCount() { return pendingRefundsCount; }
    public void setPendingRefundsCount(Integer pendingRefundsCount) { this.pendingRefundsCount = pendingRefundsCount; }

    public Integer getTargetCases() { return targetCases != null ? targetCases : 0; }
    public void setTargetCases(Integer targetCases) { this.targetCases = targetCases; }

    public String getTargetSkuOunces() { return targetSkuOunces; }
    public void setTargetSkuOunces(String targetSkuOunces) { this.targetSkuOunces = targetSkuOunces; }

    public Long getTargetProductId() { return targetProductId; }
    public void setTargetProductId(Long targetProductId) { this.targetProductId = targetProductId; }

    public String getTargetNotes() { return targetNotes; }
    public void setTargetNotes(String targetNotes) { this.targetNotes = targetNotes; }

    public Integer getAchievedCases() { return achievedCases != null ? achievedCases : 0; }
    public void setAchievedCases(Integer achievedCases) { this.achievedCases = achievedCases; }
}
