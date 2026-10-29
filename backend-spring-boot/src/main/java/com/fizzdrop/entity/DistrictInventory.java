package com.fizzdrop.entity;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;

@Entity
@Table(name = "district_inventory", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"district_id", "product_id"})
})
public class DistrictInventory {

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

    @Column(name = "current_stock", nullable = false)
    @JsonProperty("current_stock")
    @JsonAlias({"current_stock", "currentStock"})
    private Integer currentStock = 0;

    @Column(name = "reserved_stock", nullable = false)
    @JsonProperty("reserved_stock")
    @JsonAlias({"reserved_stock", "reservedStock"})
    private Integer reservedStock = 0;

    public DistrictInventory() {}

    public DistrictInventory(Long districtId, Long productId, Integer currentStock, Integer reservedStock) {
        this.districtId = districtId;
        this.productId = productId;
        this.currentStock = currentStock != null ? currentStock : 0;
        this.reservedStock = reservedStock != null ? reservedStock : 0;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getDistrictId() { return districtId; }
    public void setDistrictId(Long districtId) { this.districtId = districtId; }

    public Long getProductId() { return productId; }
    public void setProductId(Long productId) { this.productId = productId; }

    public Integer getCurrentStock() { return currentStock; }
    public void setCurrentStock(Integer currentStock) { this.currentStock = currentStock; }

    public Integer getReservedStock() { return reservedStock; }
    public void setReservedStock(Integer reservedStock) { this.reservedStock = reservedStock; }

    @Transient
    @JsonProperty("available_stock")
    public Integer getAvailableStock() {
        return Math.max(0, (currentStock != null ? currentStock : 0) - (reservedStock != null ? reservedStock : 0));
    }
}
