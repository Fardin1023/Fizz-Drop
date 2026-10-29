package com.fizzdrop.entity;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "Products")
public class Product {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "product_id")
    @JsonProperty("product_id")
    @JsonAlias({"product_id", "productId"})
    private Long productId;

    @Column(name = "brand", nullable = false, length = 50)
    @JsonProperty("brand")
    private String brand;

    @Column(name = "flavor_variant", nullable = false, length = 50)
    @JsonProperty("flavor_variant")
    @JsonAlias({"flavor_variant", "flavorVariant"})
    private String flavorVariant;

    @Column(name = "packaging", nullable = false, length = 30)
    @JsonProperty("packaging")
    private String packaging;

    @Column(name = "size_volume", nullable = false, length = 20)
    @JsonProperty("size_volume")
    @JsonAlias({"size_volume", "sizeVolume"})
    private String sizeVolume;

    @Column(name = "sku", nullable = false, length = 60)
    @JsonProperty("sku")
    private String sku;

    @Column(name = "base_price", nullable = false, precision = 10, scale = 2)
    @JsonProperty("base_price")
    @JsonAlias({"base_price", "basePrice"})
    private BigDecimal basePrice;

    @Column(name = "category", nullable = false, length = 50)
    @JsonProperty("category")
    private String category;

    @Column(name = "expiry_date")
    @JsonProperty("expiry_date")
    @JsonAlias({"expiry_date", "expiryDate", "expiration_date", "expirationDate"})
    private LocalDate expiryDate;

    @Lob
    @Column(name = "image_url", columnDefinition = "LONGTEXT")
    @JsonProperty("image_url")
    @JsonAlias({"image_url", "imageUrl"})
    private String imageUrl;

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

    @Transient
    @JsonProperty("total_stock")
    @JsonAlias({"total_stock", "totalStock"})
    private Integer totalStock;

    @Transient
    @JsonProperty("branch_stock")
    @JsonAlias({"branch_stock", "branchStock"})
    private Integer branchStock;

    @Transient
    @JsonProperty("available_outlets")
    @JsonAlias({"available_outlets", "availableOutlets"})
    private java.util.List<java.util.Map<String, Object>> availableOutlets;

    @Transient
    @JsonProperty("initialStockByBranch")
    @JsonAlias({"initialStockByBranch", "initial_stock_by_branch", "branchStocks"})
    private java.util.Map<String, Integer> initialStockByBranch;

    @Transient
    @JsonProperty("central_stock")
    @JsonAlias({"central_stock", "centralStock", "available_central_stock"})
    private Integer centralStock;

    public Product() {
        this.createdDate = LocalDateTime.now();
        this.updatedDate = LocalDateTime.now();
    }

    public Product(String brand, String flavorVariant, String packaging, String sizeVolume, String sku, BigDecimal basePrice, String category, String imageUrl) {
        this();
        this.brand = brand;
        this.flavorVariant = flavorVariant;
        this.packaging = packaging;
        this.sizeVolume = sizeVolume;
        this.sku = sku;
        this.basePrice = basePrice;
        this.category = category;
        this.imageUrl = imageUrl;
    }

    @PrePersist
    protected void onCreate() {
        if (createdDate == null) createdDate = LocalDateTime.now();
        if (updatedDate == null) updatedDate = LocalDateTime.now();
        if (expiryDate == null) expiryDate = LocalDate.now().plusMonths(12);
    }

    @PreUpdate
    protected void onUpdate() {
        updatedDate = LocalDateTime.now();
    }

    // Getters and Setters
    public Long getProductId() { return productId; }
    public void setProductId(Long productId) { this.productId = productId; }

    public String getBrand() { return brand; }
    public void setBrand(String brand) { this.brand = brand; }

    public String getFlavorVariant() { return flavorVariant; }
    public void setFlavorVariant(String flavorVariant) { this.flavorVariant = flavorVariant; }

    public String getPackaging() { return packaging; }
    public void setPackaging(String packaging) { this.packaging = packaging; }

    public String getSizeVolume() { return sizeVolume; }
    public void setSizeVolume(String sizeVolume) { this.sizeVolume = sizeVolume; }

    public String getSku() { return sku; }
    public void setSku(String sku) { this.sku = sku; }

    public BigDecimal getBasePrice() { return basePrice; }
    public void setBasePrice(BigDecimal basePrice) { this.basePrice = basePrice; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public String getImageUrl() { return imageUrl; }
    public void setImageUrl(String imageUrl) { this.imageUrl = imageUrl; }

    public Long getCreatedBy() { return createdBy; }
    public void setCreatedBy(Long createdBy) { this.createdBy = createdBy; }

    public LocalDateTime getCreatedDate() { return createdDate; }
    public void setCreatedDate(LocalDateTime createdDate) { this.createdDate = createdDate; }

    public Long getUpdatedBy() { return updatedBy; }
    public void setUpdatedBy(Long updatedBy) { this.updatedBy = updatedBy; }

    public LocalDateTime getUpdatedDate() { return updatedDate; }
    public void setUpdatedDate(LocalDateTime updatedDate) { this.updatedDate = updatedDate; }

    public Integer getTotalStock() { return totalStock; }
    public void setTotalStock(Integer totalStock) { this.totalStock = totalStock; }

    public Integer getBranchStock() { return branchStock; }
    public void setBranchStock(Integer branchStock) { this.branchStock = branchStock; }

    public LocalDate getExpiryDate() { return expiryDate; }
    public void setExpiryDate(LocalDate expiryDate) { this.expiryDate = expiryDate; }

    public java.util.List<java.util.Map<String, Object>> getAvailableOutlets() { return availableOutlets; }
    public void setAvailableOutlets(java.util.List<java.util.Map<String, Object>> availableOutlets) { this.availableOutlets = availableOutlets; }

    public java.util.Map<String, Integer> getInitialStockByBranch() { return initialStockByBranch; }
    public void setInitialStockByBranch(java.util.Map<String, Integer> initialStockByBranch) { this.initialStockByBranch = initialStockByBranch; }

    public Integer getCentralStock() { return centralStock; }
    public void setCentralStock(Integer centralStock) { this.centralStock = centralStock; }
}
