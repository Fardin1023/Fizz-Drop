package com.fizzdrop.entity;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "trade_offers")
public class TradeOffer {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "title", nullable = false, length = 200)
    @JsonProperty("title")
    private String title;

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

    @Column(name = "buy_product_id", nullable = false)
    @JsonProperty("buy_product_id")
    @JsonAlias({"buy_product_id", "buyProductId"})
    private Long buyProductId;

    @Column(name = "buy_product_name", length = 200)
    @JsonProperty("buy_product_name")
    @JsonAlias({"buy_product_name", "buyProductName"})
    private String buyProductName;

    @Column(name = "buy_quantity_cases", nullable = false)
    @JsonProperty("buy_quantity_cases")
    @JsonAlias({"buy_quantity_cases", "buyQuantityCases"})
    private Integer buyQuantityCases = 10;

    @Column(name = "free_product_id", nullable = false)
    @JsonProperty("free_product_id")
    @JsonAlias({"free_product_id", "freeProductId"})
    private Long freeProductId;

    @Column(name = "free_product_name", length = 200)
    @JsonProperty("free_product_name")
    @JsonAlias({"free_product_name", "freeProductName"})
    private String freeProductName;

    @Column(name = "free_quantity_cases", nullable = false)
    @JsonProperty("free_quantity_cases")
    @JsonAlias({"free_quantity_cases", "freeQuantityCases"})
    private Integer freeQuantityCases = 1;

    @Column(name = "free_item_type", length = 30)
    @JsonProperty("free_item_type")
    @JsonAlias({"free_item_type", "freeItemType"})
    private String freeItemType = "BEVERAGE"; // "BEVERAGE" or "MERCHANDISE"

    @Lob
    @Column(name = "description", columnDefinition = "TEXT")
    @JsonProperty("description")
    private String description;

    @Column(name = "status", nullable = false, length = 30)
    @JsonProperty("status")
    private String status = "ACTIVE"; // ACTIVE, INACTIVE, EXPIRED

    @Column(name = "valid_from")
    @JsonProperty("valid_from")
    @JsonAlias({"valid_from", "validFrom"})
    private LocalDateTime validFrom;

    @Column(name = "valid_until")
    @JsonProperty("valid_until")
    @JsonAlias({"valid_until", "validUntil"})
    private LocalDateTime validUntil;

    @Column(name = "created_at", nullable = false)
    @JsonProperty("created_at")
    @JsonAlias({"created_at", "createdAt"})
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at", nullable = false)
    @JsonProperty("updated_at")
    @JsonAlias({"updated_at", "updatedAt"})
    private LocalDateTime updatedAt = LocalDateTime.now();

    public TradeOffer() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
        this.status = "ACTIVE";
    }

    @PrePersist
    protected void onCreate() {
        if (this.createdAt == null) this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
        if (this.status == null) this.status = "ACTIVE";
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public Long getDistrictId() { return districtId; }
    public void setDistrictId(Long districtId) { this.districtId = districtId; }

    public String getDistrictName() { return districtName; }
    public void setDistrictName(String districtName) { this.districtName = districtName; }

    public String getDivisionName() { return divisionName; }
    public void setDivisionName(String divisionName) { this.divisionName = divisionName; }

    public Long getBuyProductId() { return buyProductId; }
    public void setBuyProductId(Long buyProductId) { this.buyProductId = buyProductId; }

    public String getBuyProductName() { return buyProductName; }
    public void setBuyProductName(String buyProductName) { this.buyProductName = buyProductName; }

    public Integer getBuyQuantityCases() { return buyQuantityCases; }
    public void setBuyQuantityCases(Integer buyQuantityCases) { this.buyQuantityCases = buyQuantityCases; }

    public Long getFreeProductId() { return freeProductId; }
    public void setFreeProductId(Long freeProductId) { this.freeProductId = freeProductId; }

    public String getFreeProductName() { return freeProductName; }
    public void setFreeProductName(String freeProductName) { this.freeProductName = freeProductName; }

    public Integer getFreeQuantityCases() { return freeQuantityCases; }
    public void setFreeQuantityCases(Integer freeQuantityCases) { this.freeQuantityCases = freeQuantityCases; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public LocalDateTime getValidFrom() { return validFrom; }
    public void setValidFrom(LocalDateTime validFrom) { this.validFrom = validFrom; }

    public LocalDateTime getValidUntil() { return validUntil; }
    public void setValidUntil(LocalDateTime validUntil) { this.validUntil = validUntil; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }

    public String getFreeItemType() { return freeItemType != null ? freeItemType : "BEVERAGE"; }
    public void setFreeItemType(String freeItemType) { this.freeItemType = freeItemType; }
}
