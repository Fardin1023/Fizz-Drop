package com.fizzdrop.entity;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "free_stock_transactions")
public class FreeStockTransaction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "free_stock_id")
    @JsonProperty("free_stock_id")
    @JsonAlias({"free_stock_id", "freeStockId"})
    private Long freeStockId;

    @Column(name = "offer_id")
    @JsonProperty("offer_id")
    @JsonAlias({"offer_id", "offerId"})
    private Long offerId;

    @Column(name = "offer_title", length = 200)
    @JsonProperty("offer_title")
    @JsonAlias({"offer_title", "offerTitle"})
    private String offerTitle;

    @Column(name = "requisition_code", length = 100)
    @JsonProperty("requisition_code")
    @JsonAlias({"requisition_code", "requisitionCode"})
    private String requisitionCode;

    @Column(name = "district_id")
    @JsonProperty("district_id")
    @JsonAlias({"district_id", "districtId"})
    private Long districtId;

    @Column(name = "district_name", length = 100)
    @JsonProperty("district_name")
    @JsonAlias({"district_name", "districtName"})
    private String districtName;

    @Column(name = "outlet_id", nullable = false)
    @JsonProperty("outlet_id")
    @JsonAlias({"outlet_id", "outletId"})
    private Long outletId;

    @Column(name = "outlet_name", length = 150)
    @JsonProperty("outlet_name")
    @JsonAlias({"outlet_name", "outletName"})
    private String outletName;

    @Column(name = "supplier_id")
    @JsonProperty("supplier_id")
    @JsonAlias({"supplier_id", "supplierId"})
    private Long supplierId;

    @Column(name = "supplier_name", length = 150)
    @JsonProperty("supplier_name")
    @JsonAlias({"supplier_name", "supplierName"})
    private String supplierName;

    @Column(name = "product_id", nullable = false)
    @JsonProperty("product_id")
    @JsonAlias({"product_id", "productId"})
    private Long productId;

    @Column(name = "product_name", length = 200)
    @JsonProperty("product_name")
    @JsonAlias({"product_name", "productName"})
    private String productName;

    @Column(name = "cases_supplied", nullable = false)
    @JsonProperty("cases_supplied")
    @JsonAlias({"cases_supplied", "casesSupplied"})
    private Integer casesSupplied = 1;

    @Column(name = "unit_value", precision = 12, scale = 2, nullable = false)
    @JsonProperty("unit_value")
    @JsonAlias({"unit_value", "unitValue"})
    private BigDecimal unitValue = BigDecimal.ZERO;

    @Column(name = "total_value", precision = 15, scale = 2, nullable = false)
    @JsonProperty("total_value")
    @JsonAlias({"total_value", "totalValue"})
    private BigDecimal totalValue = BigDecimal.ZERO;

    @Column(name = "status", length = 30)
    @JsonProperty("status")
    private String status = "DISPATCHED"; // PENDING, DISPATCHED, DELIVERED

    @Column(name = "transaction_date", nullable = false)
    @JsonProperty("transaction_date")
    @JsonAlias({"transaction_date", "transactionDate"})
    private LocalDateTime transactionDate = LocalDateTime.now();

    public FreeStockTransaction() {
        this.transactionDate = LocalDateTime.now();
        this.status = "DISPATCHED";
    }

    @PrePersist
    protected void onCreate() {
        if (this.transactionDate == null) this.transactionDate = LocalDateTime.now();
        if (this.status == null) this.status = "DISPATCHED";
        if (this.unitValue != null && this.casesSupplied != null) {
            this.totalValue = this.unitValue.multiply(BigDecimal.valueOf(this.casesSupplied));
        }
    }

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getFreeStockId() { return freeStockId; }
    public void setFreeStockId(Long freeStockId) { this.freeStockId = freeStockId; }

    public Long getOfferId() { return offerId; }
    public void setOfferId(Long offerId) { this.offerId = offerId; }

    public String getOfferTitle() { return offerTitle; }
    public void setOfferTitle(String offerTitle) { this.offerTitle = offerTitle; }

    public String getRequisitionCode() { return requisitionCode; }
    public void setRequisitionCode(String requisitionCode) { this.requisitionCode = requisitionCode; }

    public Long getDistrictId() { return districtId; }
    public void setDistrictId(Long districtId) { this.districtId = districtId; }

    public String getDistrictName() { return districtName; }
    public void setDistrictName(String districtName) { this.districtName = districtName; }

    public Long getOutletId() { return outletId; }
    public void setOutletId(Long outletId) { this.outletId = outletId; }

    public String getOutletName() { return outletName; }
    public void setOutletName(String outletName) { this.outletName = outletName; }

    public Long getSupplierId() { return supplierId; }
    public void setSupplierId(Long supplierId) { this.supplierId = supplierId; }

    public String getSupplierName() { return supplierName; }
    public void setSupplierName(String supplierName) { this.supplierName = supplierName; }

    public Long getProductId() { return productId; }
    public void setProductId(Long productId) { this.productId = productId; }

    public String getProductName() { return productName; }
    public void setProductName(String productName) { this.productName = productName; }

    public Integer getCasesSupplied() { return casesSupplied; }
    public void setCasesSupplied(Integer casesSupplied) {
        this.casesSupplied = casesSupplied;
        if (this.unitValue != null) {
            this.totalValue = this.unitValue.multiply(BigDecimal.valueOf(casesSupplied));
        }
    }

    public BigDecimal getUnitValue() { return unitValue; }
    public void setUnitValue(BigDecimal unitValue) {
        this.unitValue = unitValue;
        if (this.casesSupplied != null) {
            this.totalValue = unitValue.multiply(BigDecimal.valueOf(this.casesSupplied));
        }
    }

    public BigDecimal getTotalValue() { return totalValue; }
    public void setTotalValue(BigDecimal totalValue) { this.totalValue = totalValue; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public LocalDateTime getTransactionDate() { return transactionDate; }
    public void setTransactionDate(LocalDateTime transactionDate) { this.transactionDate = transactionDate; }
}
