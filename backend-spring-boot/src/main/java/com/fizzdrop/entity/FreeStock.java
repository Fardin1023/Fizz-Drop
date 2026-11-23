package com.fizzdrop.entity;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "free_stocks")
public class FreeStock {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "offer_id")
    @JsonProperty("offer_id")
    @JsonAlias({"offer_id", "offerId"})
    private Long offerId;

    @Column(name = "offer_title", length = 200)
    @JsonProperty("offer_title")
    @JsonAlias({"offer_title", "offerTitle"})
    private String offerTitle;

    @Column(name = "district_id", nullable = false)
    @JsonProperty("district_id")
    @JsonAlias({"district_id", "districtId"})
    private Long districtId;

    @Column(name = "district_name", length = 100)
    @JsonProperty("district_name")
    @JsonAlias({"district_name", "districtName"})
    private String districtName;

    @Column(name = "division_name", length = 100)
    @JsonProperty("division_name")
    @JsonAlias({"division_name", "divisionName"})
    private String divisionName;

    @Column(name = "product_id", nullable = false)
    @JsonProperty("product_id")
    @JsonAlias({"product_id", "productId"})
    private Long productId;

    @Column(name = "product_name", length = 200)
    @JsonProperty("product_name")
    @JsonAlias({"product_name", "productName"})
    private String productName;

    @Column(name = "sku", length = 100)
    @JsonProperty("sku")
    private String sku;

    @Column(name = "category", length = 100)
    @JsonProperty("category")
    private String category;

    @Column(name = "offered_cases", nullable = false)
    @JsonProperty("offered_cases")
    @JsonAlias({"offered_cases", "offeredCases"})
    private Integer offeredCases = 100;

    @Column(name = "supplied_cases", nullable = false)
    @JsonProperty("supplied_cases")
    @JsonAlias({"supplied_cases", "suppliedCases"})
    private Integer suppliedCases = 0;

    @Column(name = "remaining_cases", nullable = false)
    @JsonProperty("remaining_cases")
    @JsonAlias({"remaining_cases", "remainingCases"})
    private Integer remainingCases = 100;

    @Column(name = "unit_value", precision = 12, scale = 2, nullable = false)
    @JsonProperty("unit_value")
    @JsonAlias({"unit_value", "unitValue"})
    private BigDecimal unitValue = BigDecimal.valueOf(15.00);

    @Column(name = "total_offered_value", precision = 15, scale = 2, nullable = false)
    @JsonProperty("total_offered_value")
    @JsonAlias({"total_offered_value", "totalOfferedValue"})
    private BigDecimal totalOfferedValue = BigDecimal.ZERO;

    @Column(name = "total_supplied_value", precision = 15, scale = 2, nullable = false)
    @JsonProperty("total_supplied_value")
    @JsonAlias({"total_supplied_value", "totalSuppliedValue"})
    private BigDecimal totalSuppliedValue = BigDecimal.ZERO;

    @Column(name = "remaining_value", precision = 15, scale = 2, nullable = false)
    @JsonProperty("remaining_value")
    @JsonAlias({"remaining_value", "remainingValue"})
    private BigDecimal remainingValue = BigDecimal.ZERO;

    @Column(name = "status", nullable = false, length = 30)
    @JsonProperty("status")
    private String status = "ACTIVE"; // ACTIVE, DEPLETED, EXPIRED

    @Lob
    @Column(name = "notes", columnDefinition = "TEXT")
    @JsonProperty("notes")
    private String notes;

    @Column(name = "created_at", nullable = false)
    @JsonProperty("created_at")
    @JsonAlias({"created_at", "createdAt"})
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at", nullable = false)
    @JsonProperty("updated_at")
    @JsonAlias({"updated_at", "updatedAt"})
    private LocalDateTime updatedAt = LocalDateTime.now();

    public FreeStock() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
        this.status = "ACTIVE";
    }

    @PrePersist
    protected void onCreate() {
        if (this.createdAt == null) this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
        if (this.status == null) this.status = "ACTIVE";
        calculateValues();
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
        calculateValues();
    }

    public void calculateValues() {
        if (this.offeredCases == null) this.offeredCases = 0;
        if (this.suppliedCases == null) this.suppliedCases = 0;
        this.remainingCases = Math.max(0, this.offeredCases - this.suppliedCases);

        if (this.unitValue == null) this.unitValue = BigDecimal.ZERO;
        this.totalOfferedValue = this.unitValue.multiply(BigDecimal.valueOf(this.offeredCases));
        this.totalSuppliedValue = this.unitValue.multiply(BigDecimal.valueOf(this.suppliedCases));
        this.remainingValue = this.unitValue.multiply(BigDecimal.valueOf(this.remainingCases));

        if (this.remainingCases == 0 && this.offeredCases > 0) {
            this.status = "DEPLETED";
        }
    }

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getOfferId() { return offerId; }
    public void setOfferId(Long offerId) { this.offerId = offerId; }

    public String getOfferTitle() { return offerTitle; }
    public void setOfferTitle(String offerTitle) { this.offerTitle = offerTitle; }

    public Long getDistrictId() { return districtId; }
    public void setDistrictId(Long districtId) { this.districtId = districtId; }

    public String getDistrictName() { return districtName; }
    public void setDistrictName(String districtName) { this.districtName = districtName; }

    public String getDivisionName() { return divisionName; }
    public void setDivisionName(String divisionName) { this.divisionName = divisionName; }

    public Long getProductId() { return productId; }
    public void setProductId(Long productId) { this.productId = productId; }

    public String getProductName() { return productName; }
    public void setProductName(String productName) { this.productName = productName; }

    public String getSku() { return sku; }
    public void setSku(String sku) { this.sku = sku; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public Integer getOfferedCases() { return offeredCases; }
    public void setOfferedCases(Integer offeredCases) {
        this.offeredCases = offeredCases;
        calculateValues();
    }

    public Integer getSuppliedCases() { return suppliedCases; }
    public void setSuppliedCases(Integer suppliedCases) {
        this.suppliedCases = suppliedCases;
        calculateValues();
    }

    public Integer getRemainingCases() { return remainingCases; }
    public void setRemainingCases(Integer remainingCases) { this.remainingCases = remainingCases; }

    public BigDecimal getUnitValue() { return unitValue; }
    public void setUnitValue(BigDecimal unitValue) {
        this.unitValue = unitValue;
        calculateValues();
    }

    public BigDecimal getTotalOfferedValue() { return totalOfferedValue; }
    public void setTotalOfferedValue(BigDecimal totalOfferedValue) { this.totalOfferedValue = totalOfferedValue; }

    public BigDecimal getTotalSuppliedValue() { return totalSuppliedValue; }
    public void setTotalSuppliedValue(BigDecimal totalSuppliedValue) { this.totalSuppliedValue = totalSuppliedValue; }

    public BigDecimal getRemainingValue() { return remainingValue; }
    public void setRemainingValue(BigDecimal remainingValue) { this.remainingValue = remainingValue; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
