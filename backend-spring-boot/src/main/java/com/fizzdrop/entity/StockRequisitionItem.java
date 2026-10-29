package com.fizzdrop.entity;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import java.math.BigDecimal;

@Entity
@Table(name = "stock_requisition_items")
public class StockRequisitionItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "requisition_id", nullable = false)
    @JsonProperty("requisition_id")
    @JsonAlias({"requisition_id", "requisitionId"})
    private Long requisitionId;

    @Column(name = "product_id", nullable = false)
    @JsonProperty("product_id")
    @JsonAlias({"product_id", "productId"})
    private Long productId;

    @Column(name = "requested_quantity", nullable = false)
    @JsonProperty("requested_quantity")
    @JsonAlias({"requested_quantity", "requestedQuantity"})
    private Integer requestedQuantity;

    @Column(name = "approved_quantity", nullable = false)
    @JsonProperty("approved_quantity")
    @JsonAlias({"approved_quantity", "approvedQuantity"})
    private Integer approvedQuantity = 0;

    // Transient fields enriched for UI & reconciliation side-by-side
    @Transient
    @JsonProperty("brand")
    private String brand;

    @Transient
    @JsonProperty("flavor_variant")
    private String flavorVariant;

    @Transient
    @JsonProperty("packaging")
    private String packaging;

    @Transient
    @JsonProperty("size_volume")
    private String sizeVolume;

    @Transient
    @JsonProperty("sku")
    private String sku;

    @Transient
    @JsonProperty("base_price")
    private BigDecimal basePrice;

    @Transient
    @JsonProperty("image_url")
    private String imageUrl;

    @Transient
    @JsonProperty("regional_stock")
    private Integer regionalStock = 0;

    @Transient
    @JsonProperty("central_stock")
    private Integer centralStock = 0;

    public StockRequisitionItem() {}

    public StockRequisitionItem(Long requisitionId, Long productId, Integer requestedQuantity) {
        this.requisitionId = requisitionId;
        this.productId = productId;
        this.requestedQuantity = requestedQuantity;
        this.approvedQuantity = 0;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getRequisitionId() { return requisitionId; }
    public void setRequisitionId(Long requisitionId) { this.requisitionId = requisitionId; }

    public Long getProductId() { return productId; }
    public void setProductId(Long productId) { this.productId = productId; }

    public Integer getRequestedQuantity() { return requestedQuantity; }
    public void setRequestedQuantity(Integer requestedQuantity) { this.requestedQuantity = requestedQuantity; }

    public Integer getApprovedQuantity() { return approvedQuantity; }
    public void setApprovedQuantity(Integer approvedQuantity) { this.approvedQuantity = approvedQuantity; }

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

    public String getImageUrl() { return imageUrl; }
    public void setImageUrl(String imageUrl) { this.imageUrl = imageUrl; }

    public Integer getRegionalStock() { return regionalStock; }
    public void setRegionalStock(Integer regionalStock) { this.regionalStock = regionalStock; }

    public Integer getCentralStock() { return centralStock; }
    public void setCentralStock(Integer centralStock) { this.centralStock = centralStock; }
}
