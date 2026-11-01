package com.fizzdrop.entity;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import java.math.BigDecimal;

@Entity
@Table(name = "stock_return_items")
public class StockReturnItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "return_request_id", nullable = false)
    @JsonProperty("return_request_id")
    @JsonAlias({"return_request_id", "returnRequestId"})
    private Long returnRequestId;

    @Column(name = "product_id", nullable = false)
    @JsonProperty("product_id")
    @JsonAlias({"product_id", "productId"})
    private Long productId;

    @Column(name = "received_quantity", nullable = false)
    @JsonProperty("received_quantity")
    @JsonAlias({"received_quantity", "receivedQuantity"})
    private Integer receivedQuantity = 0;

    @Column(name = "kept_quantity", nullable = false)
    @JsonProperty("kept_quantity")
    @JsonAlias({"kept_quantity", "keptQuantity"})
    private Integer keptQuantity = 0;

    @Column(name = "returned_quantity", nullable = false)
    @JsonProperty("returned_quantity")
    @JsonAlias({"returned_quantity", "returnedQuantity"})
    private Integer returnedQuantity = 0;

    @Column(name = "unit_price", nullable = false)
    @JsonProperty("unit_price")
    @JsonAlias({"unit_price", "unitPrice"})
    private BigDecimal unitPrice = BigDecimal.valueOf(48.0);

    @Column(name = "line_total", nullable = false)
    @JsonProperty("line_total")
    @JsonAlias({"line_total", "lineTotal"})
    private BigDecimal lineTotal = BigDecimal.ZERO;

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
    @JsonProperty("packaging")
    private String packaging;

    @Transient
    @JsonProperty("size_volume")
    private String sizeVolume;

    public StockReturnItem() {}

    public StockReturnItem(Long returnRequestId, Long productId, Integer receivedQuantity, Integer keptQuantity, Integer returnedQuantity, BigDecimal unitPrice, BigDecimal lineTotal) {
        this.returnRequestId = returnRequestId;
        this.productId = productId;
        this.receivedQuantity = receivedQuantity;
        this.keptQuantity = keptQuantity;
        this.returnedQuantity = returnedQuantity;
        this.unitPrice = unitPrice;
        this.lineTotal = lineTotal;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getReturnRequestId() { return returnRequestId; }
    public void setReturnRequestId(Long returnRequestId) { this.returnRequestId = returnRequestId; }

    public Long getProductId() { return productId; }
    public void setProductId(Long productId) { this.productId = productId; }

    public Integer getReceivedQuantity() { return receivedQuantity; }
    public void setReceivedQuantity(Integer receivedQuantity) { this.receivedQuantity = receivedQuantity; }

    public Integer getKeptQuantity() { return keptQuantity; }
    public void setKeptQuantity(Integer keptQuantity) { this.keptQuantity = keptQuantity; }

    public Integer getReturnedQuantity() { return returnedQuantity; }
    public void setReturnedQuantity(Integer returnedQuantity) { this.returnedQuantity = returnedQuantity; }

    public BigDecimal getUnitPrice() { return unitPrice; }
    public void setUnitPrice(BigDecimal unitPrice) { this.unitPrice = unitPrice; }

    public BigDecimal getLineTotal() { return lineTotal; }
    public void setLineTotal(BigDecimal lineTotal) { this.lineTotal = lineTotal; }

    public String getBrand() { return brand; }
    public void setBrand(String brand) { this.brand = brand; }

    public String getFlavorVariant() { return flavorVariant; }
    public void setFlavorVariant(String flavorVariant) { this.flavorVariant = flavorVariant; }

    public String getSku() { return sku; }
    public void setSku(String sku) { this.sku = sku; }

    public String getPackaging() { return packaging; }
    public void setPackaging(String packaging) { this.packaging = packaging; }

    public String getSizeVolume() { return sizeVolume; }
    public void setSizeVolume(String sizeVolume) { this.sizeVolume = sizeVolume; }
}
