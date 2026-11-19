package com.fizzdrop.entity;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "district_product_pricing", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"district_id", "product_id"})
})
public class DistrictProductPricing {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "district_id", nullable = false)
    @JsonProperty("district_id")
    @JsonAlias({"district_id", "districtId"})
    private Long districtId;

    @Column(name = "product_id", nullable = false)
    @JsonProperty("product_id")
    @JsonAlias({"product_id", "productId"})
    private Long productId;

    // Fixed price at which the Superadmin sells stocks to the Supplier
    @Column(name = "supplier_price", nullable = false, precision = 10, scale = 2)
    @JsonProperty("supplier_price")
    @JsonAlias({"supplier_price", "supplierPrice"})
    private BigDecimal supplierPrice;

    // Fixed price at which the Supplier sells stocks to the Outlet
    @Column(name = "outlet_price", nullable = false, precision = 10, scale = 2)
    @JsonProperty("outlet_price")
    @JsonAlias({"outlet_price", "outletPrice"})
    private BigDecimal outletPrice;

    // Fixed price at which the Outlet sells to the Customer (Consumer MRP)
    @Column(name = "retail_price", nullable = false, precision = 10, scale = 2)
    @JsonProperty("retail_price")
    @JsonAlias({"retail_price", "retailPrice"})
    private BigDecimal retailPrice;

    @Column(name = "created_at")
    @JsonProperty("created_at")
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at")
    @JsonProperty("updated_at")
    private LocalDateTime updatedAt = LocalDateTime.now();

    // Transient fields for UI and API serialization convenience
    @Transient
    @JsonProperty("district_name")
    private String districtName;

    @Transient
    @JsonProperty("division_name")
    private String divisionName;

    @Transient
    @JsonProperty("product_name")
    private String productName;

    @Transient
    @JsonProperty("brand")
    private String brand;

    @Transient
    @JsonProperty("flavor_variant")
    private String flavorVariant;

    @Transient
    @JsonProperty("sku")
    private String sku;

    @Transient
    @JsonProperty("category")
    private String category;

    @Transient
    @JsonProperty("packaging")
    private String packaging;

    @Transient
    @JsonProperty("size_volume")
    private String sizeVolume;

    @Transient
    @JsonProperty("image_url")
    private String imageUrl;

    @Transient
    @JsonProperty("central_stock")
    private Integer centralStock;

    public DistrictProductPricing() {}

    public DistrictProductPricing(Long districtId, Long productId, BigDecimal supplierPrice, BigDecimal outletPrice, BigDecimal retailPrice) {
        this.districtId = districtId;
        this.productId = productId;
        this.supplierPrice = supplierPrice;
        this.outletPrice = outletPrice;
        this.retailPrice = retailPrice;
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getDistrictId() { return districtId; }
    public void setDistrictId(Long districtId) { this.districtId = districtId; }

    public Long getProductId() { return productId; }
    public void setProductId(Long productId) { this.productId = productId; }

    public BigDecimal getSupplierPrice() { return supplierPrice; }
    public void setSupplierPrice(BigDecimal supplierPrice) { this.supplierPrice = supplierPrice; }

    public BigDecimal getOutletPrice() { return outletPrice; }
    public void setOutletPrice(BigDecimal outletPrice) { this.outletPrice = outletPrice; }

    public BigDecimal getRetailPrice() { return retailPrice; }
    public void setRetailPrice(BigDecimal retailPrice) { this.retailPrice = retailPrice; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }

    public String getDistrictName() { return districtName; }
    public void setDistrictName(String districtName) { this.districtName = districtName; }

    public String getDivisionName() { return divisionName; }
    public void setDivisionName(String divisionName) { this.divisionName = divisionName; }

    public String getProductName() { return productName; }
    public void setProductName(String productName) { this.productName = productName; }

    public String getBrand() { return brand; }
    public void setBrand(String brand) { this.brand = brand; }

    public String getFlavorVariant() { return flavorVariant; }
    public void setFlavorVariant(String flavorVariant) { this.flavorVariant = flavorVariant; }

    public String getSku() { return sku; }
    public void setSku(String sku) { this.sku = sku; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public String getPackaging() { return packaging; }
    public void setPackaging(String packaging) { this.packaging = packaging; }

    public String getSizeVolume() { return sizeVolume; }
    public void setSizeVolume(String sizeVolume) { this.sizeVolume = sizeVolume; }

    public String getImageUrl() { return imageUrl; }
    public void setImageUrl(String imageUrl) { this.imageUrl = imageUrl; }

    public Integer getCentralStock() { return centralStock; }
    public void setCentralStock(Integer centralStock) { this.centralStock = centralStock; }
}
