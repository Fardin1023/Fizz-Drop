package com.fizzdrop.entity;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "stock_requisitions")
public class StockRequisition {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "requisition_code", nullable = false, unique = true, length = 50)
    @JsonProperty("requisition_code")
    @JsonAlias({"requisition_code", "requisitionCode"})
    private String requisitionCode;

    @Column(name = "supplier_id", nullable = false)
    @JsonProperty("supplier_id")
    @JsonAlias({"supplier_id", "supplierId"})
    private Long supplierId;

    @Column(name = "district_id", nullable = false)
    @JsonProperty("district_id")
    @JsonAlias({"district_id", "districtId"})
    private Long districtId;

    @Column(name = "status", nullable = false, length = 30)
    @JsonProperty("status")
    private String status = "PENDING"; // PENDING, APPROVED, PARTIALLY_APPROVED, REJECTED, DISPATCHED, COMPLETED

    @Column(name = "urgency", nullable = false, length = 20)
    @JsonProperty("urgency")
    private String urgency = "NORMAL"; // LOW, NORMAL, CRITICAL

    @Lob
    @Column(name = "supplier_remarks", columnDefinition = "TEXT")
    @JsonProperty("supplier_remarks")
    @JsonAlias({"supplier_remarks", "supplierRemarks"})
    private String supplierRemarks;

    @Lob
    @Column(name = "admin_remarks", columnDefinition = "TEXT")
    @JsonProperty("admin_remarks")
    @JsonAlias({"admin_remarks", "adminRemarks"})
    private String adminRemarks;

    @Column(name = "payment_method", length = 50)
    @JsonProperty("payment_method")
    @JsonAlias({"payment_method", "paymentMethod"})
    private String paymentMethod = "CORPORATE_BANK_TRANSFER";

    @Column(name = "payment_status", length = 30)
    @JsonProperty("payment_status")
    @JsonAlias({"payment_status", "paymentStatus"})
    private String paymentStatus = "AUTHORIZED";

    @Column(name = "payment_reference", length = 100)
    @JsonProperty("payment_reference")
    @JsonAlias({"payment_reference", "paymentReference"})
    private String paymentReference;

    @Column(name = "invoice_number", length = 60)
    @JsonProperty("invoice_number")
    @JsonAlias({"invoice_number", "invoiceNumber"})
    private String invoiceNumber;

    @Column(name = "total_amount")
    @JsonProperty("total_amount")
    @JsonAlias({"total_amount", "totalAmount"})
    private java.math.BigDecimal totalAmount;

    @Column(name = "created_at", nullable = false)
    @JsonProperty("created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    @JsonProperty("updated_at")
    private LocalDateTime updatedAt;

    @Transient
    @JsonProperty("supplier_name")
    private String supplierName;

    @Transient
    @JsonProperty("district_name")
    private String districtName;

    @Transient
    @JsonProperty("division_name")
    private String divisionName;

    @Transient
    @JsonProperty("items")
    private List<StockRequisitionItem> items = new ArrayList<>();

    @Transient
    @JsonProperty("total_requested_cases")
    private Integer totalRequestedCases;

    @Transient
    @JsonProperty("total_approved_cases")
    private Integer totalApprovedCases;

    public StockRequisition() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    public StockRequisition(String requisitionCode, Long supplierId, Long districtId, String urgency, String supplierRemarks) {
        this();
        this.requisitionCode = requisitionCode;
        this.supplierId = supplierId;
        this.districtId = districtId;
        this.status = "PENDING";
        this.urgency = urgency != null ? urgency : "NORMAL";
        this.supplierRemarks = supplierRemarks;
    }

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) createdAt = LocalDateTime.now();
        if (updatedAt == null) updatedAt = LocalDateTime.now();
        if (status == null) status = "PENDING";
        if (urgency == null) urgency = "NORMAL";
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getRequisitionCode() { return requisitionCode; }
    public void setRequisitionCode(String requisitionCode) { this.requisitionCode = requisitionCode; }

    public Long getSupplierId() { return supplierId; }
    public void setSupplierId(Long supplierId) { this.supplierId = supplierId; }

    public Long getDistrictId() { return districtId; }
    public void setDistrictId(Long districtId) { this.districtId = districtId; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getUrgency() { return urgency; }
    public void setUrgency(String urgency) { this.urgency = urgency; }

    public String getSupplierRemarks() { return supplierRemarks; }
    public void setSupplierRemarks(String supplierRemarks) { this.supplierRemarks = supplierRemarks; }

    public String getAdminRemarks() { return adminRemarks; }
    public void setAdminRemarks(String adminRemarks) { this.adminRemarks = adminRemarks; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }

    public String getSupplierName() { return supplierName; }
    public void setSupplierName(String supplierName) { this.supplierName = supplierName; }

    public String getDistrictName() { return districtName; }
    public void setDistrictName(String districtName) { this.districtName = districtName; }

    public String getDivisionName() { return divisionName; }
    public void setDivisionName(String divisionName) { this.divisionName = divisionName; }

    public List<StockRequisitionItem> getItems() { return items; }
    public void setItems(List<StockRequisitionItem> items) { this.items = items; }

    public Integer getTotalRequestedCases() { return totalRequestedCases; }
    public void setTotalRequestedCases(Integer totalRequestedCases) { this.totalRequestedCases = totalRequestedCases; }

    public Integer getTotalApprovedCases() { return totalApprovedCases; }
    public void setTotalApprovedCases(Integer totalApprovedCases) { this.totalApprovedCases = totalApprovedCases; }

    public String getPaymentMethod() { return paymentMethod; }
    public void setPaymentMethod(String paymentMethod) { this.paymentMethod = paymentMethod; }

    public String getPaymentStatus() { return paymentStatus; }
    public void setPaymentStatus(String paymentStatus) { this.paymentStatus = paymentStatus; }

    public String getPaymentReference() { return paymentReference; }
    public void setPaymentReference(String paymentReference) { this.paymentReference = paymentReference; }

    public String getInvoiceNumber() { return invoiceNumber; }
    public void setInvoiceNumber(String invoiceNumber) { this.invoiceNumber = invoiceNumber; }

    public java.math.BigDecimal getTotalAmount() { return totalAmount; }
    public void setTotalAmount(java.math.BigDecimal totalAmount) { this.totalAmount = totalAmount; }
}
