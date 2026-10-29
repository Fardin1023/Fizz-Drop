package com.fizzdrop.entity;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "central_inventory")
public class CentralInventory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "product_id", nullable = false, unique = true)
    @JsonProperty("product_id")
    @JsonAlias({"product_id", "productId"})
    private Long productId;

    @Column(name = "category", nullable = false, length = 100)
    @JsonProperty("category")
    private String category;

    @Column(name = "available_stock", nullable = false)
    @JsonProperty("available_stock")
    @JsonAlias({"available_stock", "availableStock"})
    private Integer availableStock;

    @Column(name = "reserved_stock", nullable = false)
    @JsonProperty("reserved_stock")
    @JsonAlias({"reserved_stock", "reservedStock"})
    private Integer reservedStock = 0;

    @Column(name = "updated_at", nullable = false)
    @JsonProperty("updated_at")
    private LocalDateTime updatedAt;

    // Transient fields for UI inspection
    @Transient
    @JsonProperty("brand")
    private String brand;

    @Transient
    @JsonProperty("flavor_variant")
    private String flavorVariant;

    @Transient
    @JsonProperty("sku")
    private String sku;

    public CentralInventory() {
        this.updatedAt = LocalDateTime.now();
        this.reservedStock = 0;
    }

    public CentralInventory(Long productId, String category, Integer availableStock, Integer reservedStock) {
        this.productId = productId;
        this.category = category;
        this.availableStock = availableStock;
        this.reservedStock = reservedStock != null ? reservedStock : 0;
        this.updatedAt = LocalDateTime.now();
    }

    @PrePersist
    @PreUpdate
    public void prePersist() {
        if (this.updatedAt == null) {
            this.updatedAt = LocalDateTime.now();
        }
        if (this.reservedStock == null) {
            this.reservedStock = 0;
        }
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getProductId() { return productId; }
    public void setProductId(Long productId) { this.productId = productId; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public Integer getAvailableStock() { return availableStock; }
    public void setAvailableStock(Integer availableStock) { this.availableStock = availableStock; }

    public Integer getReservedStock() { return reservedStock; }
    public void setReservedStock(Integer reservedStock) { this.reservedStock = reservedStock; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }

    public String getBrand() { return brand; }
    public void setBrand(String brand) { this.brand = brand; }

    public String getFlavorVariant() { return flavorVariant; }
    public void setFlavorVariant(String flavorVariant) { this.flavorVariant = flavorVariant; }

    public String getSku() { return sku; }
    public void setSku(String sku) { this.sku = sku; }
}
