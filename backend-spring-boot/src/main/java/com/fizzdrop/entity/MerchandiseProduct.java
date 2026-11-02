package com.fizzdrop.entity;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "merchandise_products")
public class MerchandiseProduct {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "merchandise_id")
    @JsonProperty("merchandise_id")
    @JsonAlias({"merchandise_id", "merchandiseId", "id"})
    private Long merchandiseId;

    @Column(name = "brand", nullable = false, length = 50)
    @JsonProperty("brand")
    private String brand;

    @Column(name = "item_type", nullable = false, length = 50)
    @JsonProperty("item_type")
    @JsonAlias({"item_type", "itemType", "category"})
    private String itemType;

    @Column(name = "name", nullable = false, length = 100)
    @JsonProperty("name")
    @JsonAlias({"name", "product_name", "title"})
    private String name;

    @Column(name = "sku", nullable = false, length = 60, unique = true)
    @JsonProperty("sku")
    private String sku;

    @Column(name = "size_spec", nullable = false, length = 50)
    @JsonProperty("size_spec")
    @JsonAlias({"size_spec", "sizeSpec", "size", "specification"})
    private String sizeSpec;

    @Column(name = "packaging", nullable = false, length = 50)
    @JsonProperty("packaging")
    private String packaging;

    @Column(name = "price", nullable = false, precision = 12, scale = 2)
    @JsonProperty("price")
    @JsonAlias({"price", "base_price", "basePrice"})
    private BigDecimal price;

    @Column(name = "stock_quantity", nullable = false)
    @JsonProperty("stock_quantity")
    @JsonAlias({"stock_quantity", "stockQuantity", "stock", "total_stock"})
    private Integer stockQuantity = 0;

    @Column(name = "description", columnDefinition = "TEXT")
    @JsonProperty("description")
    private String description;

    @Lob
    @Column(name = "image_url", columnDefinition = "LONGTEXT")
    @JsonProperty("image_url")
    @JsonAlias({"image_url", "imageUrl", "image"})
    private String imageUrl;

    @Column(name = "warranty_period", length = 50)
    @JsonProperty("warranty_period")
    @JsonAlias({"warranty_period", "warrantyPeriod", "warranty"})
    private String warrantyPeriod = "5-Year Quality Guarantee";

    @Column(name = "status", length = 30)
    @JsonProperty("status")
    private String status = "Active";

    @Column(name = "created_by")
    @JsonProperty("created_by")
    @JsonAlias({"created_by", "createdBy"})
    private Long createdBy;

    @Column(name = "created_date", nullable = false)
    @JsonProperty("created_date")
    @JsonAlias({"created_date", "createdDate"})
    private LocalDateTime createdDate;

    @Column(name = "updated_date", nullable = false)
    @JsonProperty("updated_date")
    @JsonAlias({"updated_date", "updatedDate"})
    private LocalDateTime updatedDate;

    public MerchandiseProduct() {
        this.createdDate = LocalDateTime.now();
        this.updatedDate = LocalDateTime.now();
    }

    public MerchandiseProduct(String brand, String itemType, String name, String sku, String sizeSpec,
                              String packaging, BigDecimal price, Integer stockQuantity, String description,
                              String imageUrl, String warrantyPeriod) {
        this();
        this.brand = brand;
        this.itemType = itemType;
        this.name = name;
        this.sku = sku;
        this.sizeSpec = sizeSpec;
        this.packaging = packaging;
        this.price = price;
        this.stockQuantity = stockQuantity != null ? stockQuantity : 0;
        this.description = description;
        this.imageUrl = imageUrl;
        this.warrantyPeriod = warrantyPeriod != null ? warrantyPeriod : "5-Year Quality Guarantee";
    }

    @PrePersist
    protected void onCreate() {
        if (createdDate == null) createdDate = LocalDateTime.now();
        if (updatedDate == null) updatedDate = LocalDateTime.now();
        if (status == null) status = "Active";
        if (warrantyPeriod == null) warrantyPeriod = "5-Year Quality Guarantee";
    }

    @PreUpdate
    protected void onUpdate() {
        updatedDate = LocalDateTime.now();
    }

    // Getters and Setters
    public Long getMerchandiseId() {
        return merchandiseId;
    }

    public void setMerchandiseId(Long merchandiseId) {
        this.merchandiseId = merchandiseId;
    }

    public String getBrand() {
        return brand;
    }

    public void setBrand(String brand) {
        this.brand = brand;
    }

    public String getItemType() {
        return itemType;
    }

    public void setItemType(String itemType) {
        this.itemType = itemType;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getSku() {
        return sku;
    }

    public void setSku(String sku) {
        this.sku = sku;
    }

    public String getSizeSpec() {
        return sizeSpec;
    }

    public void setSizeSpec(String sizeSpec) {
        this.sizeSpec = sizeSpec;
    }

    public String getPackaging() {
        return packaging;
    }

    public void setPackaging(String packaging) {
        this.packaging = packaging;
    }

    public BigDecimal getPrice() {
        return price;
    }

    public void setPrice(BigDecimal price) {
        this.price = price;
    }

    public Integer getStockQuantity() {
        return stockQuantity;
    }

    public void setStockQuantity(Integer stockQuantity) {
        this.stockQuantity = stockQuantity;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getImageUrl() {
        return imageUrl;
    }

    public void setImageUrl(String imageUrl) {
        this.imageUrl = imageUrl;
    }

    public String getWarrantyPeriod() {
        return warrantyPeriod;
    }

    public void setWarrantyPeriod(String warrantyPeriod) {
        this.warrantyPeriod = warrantyPeriod;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public Long getCreatedBy() {
        return createdBy;
    }

    public void setCreatedBy(Long createdBy) {
        this.createdBy = createdBy;
    }

    public LocalDateTime getCreatedDate() {
        return createdDate;
    }

    public void setCreatedDate(LocalDateTime createdDate) {
        this.createdDate = createdDate;
    }

    public LocalDateTime getUpdatedDate() {
        return updatedDate;
    }

    public void setUpdatedDate(LocalDateTime updatedDate) {
        this.updatedDate = updatedDate;
    }
}
