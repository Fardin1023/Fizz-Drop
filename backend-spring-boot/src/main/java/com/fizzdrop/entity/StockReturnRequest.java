package com.fizzdrop.entity;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "stock_return_requests")
public class StockReturnRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "return_code", nullable = false, unique = true, length = 50)
    @JsonProperty("return_code")
    @JsonAlias({"return_code", "returnCode"})
    private String returnCode;

    @Column(name = "requisition_id", nullable = false)
    @JsonProperty("requisition_id")
    @JsonAlias({"requisition_id", "requisitionId"})
    private Long requisitionId;

    @Column(name = "requisition_code", length = 50)
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

    @Column(name = "return_type", nullable = false, length = 30)
    @JsonProperty("return_type")
    @JsonAlias({"return_type", "returnType"})
    private String returnType; // "REFUND_CASH" or "EXCHANGE_PRODUCT"

    @Column(name = "status", nullable = false, length = 30)
    @JsonProperty("status")
    private String status = "PENDING_REVIEW"; // "PENDING_REVIEW", "APPROVED", "REJECTED"

    @Column(name = "reason_category", nullable = false, length = 100)
    @JsonProperty("reason_category")
    @JsonAlias({"reason_category", "reasonCategory"})
    private String reasonCategory; // "DAMAGED_IN_TRANSIT", "DEFECTIVE_SEAL", "WRONG_VARIANT", "NEAR_EXPIRY", "EXCESS_STOCK", "OTHER"

    @Lob
    @Column(name = "reason_details", columnDefinition = "TEXT", nullable = false)
    @JsonProperty("reason_details")
    @JsonAlias({"reason_details", "reasonDetails"})
    private String reasonDetails;

    @Lob
    @Column(name = "admin_remarks", columnDefinition = "TEXT")
    @JsonProperty("admin_remarks")
    @JsonAlias({"admin_remarks", "adminRemarks"})
    private String adminRemarks;

    @Column(name = "returned_quantity", nullable = false)
    @JsonProperty("returned_quantity")
    @JsonAlias({"returned_quantity", "returnedQuantity"})
    private Integer returnedQuantity = 0;

    @Column(name = "kept_quantity", nullable = false)
    @JsonProperty("kept_quantity")
    @JsonAlias({"kept_quantity", "keptQuantity"})
    private Integer keptQuantity = 0;

    @Column(name = "refund_amount")
    @JsonProperty("refund_amount")
    @JsonAlias({"refund_amount", "refundAmount"})
    private BigDecimal refundAmount = BigDecimal.ZERO;

    @Column(name = "replacement_product_id")
    @JsonProperty("replacement_product_id")
    @JsonAlias({"replacement_product_id", "replacementProductId"})
    private Long replacementProductId;

    @Column(name = "replacement_quantity")
    @JsonProperty("replacement_quantity")
    @JsonAlias({"replacement_quantity", "replacementQuantity"})
    private Integer replacementQuantity;

    @Column(name = "replacement_product_name")
    @JsonProperty("replacement_product_name")
    @JsonAlias({"replacement_product_name", "replacementProductName"})
    private String replacementProductName;

    @Column(name = "created_at", nullable = false)
    @JsonProperty("created_at")
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at", nullable = false)
    @JsonProperty("updated_at")
    private LocalDateTime updatedAt = LocalDateTime.now();

    @Transient
    @JsonProperty("supplier_name")
    private String supplierName;

    @Transient
    @JsonProperty("district_name")
    private String districtName;

    @Transient
    @JsonProperty("items")
    private List<StockReturnItem> items = new ArrayList<>();

    public StockReturnRequest() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getReturnCode() { return returnCode; }
    public void setReturnCode(String returnCode) { this.returnCode = returnCode; }

    public Long getRequisitionId() { return requisitionId; }
    public void setRequisitionId(Long requisitionId) { this.requisitionId = requisitionId; }

    public String getRequisitionCode() { return requisitionCode; }
    public void setRequisitionCode(String requisitionCode) { this.requisitionCode = requisitionCode; }

    public Long getSupplierId() { return supplierId; }
    public void setSupplierId(Long supplierId) { this.supplierId = supplierId; }

    public Long getDistrictId() { return districtId; }
    public void setDistrictId(Long districtId) { this.districtId = districtId; }

    public String getReturnType() { return returnType; }
    public void setReturnType(String returnType) { this.returnType = returnType; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getReasonCategory() { return reasonCategory; }
    public void setReasonCategory(String reasonCategory) { this.reasonCategory = reasonCategory; }

    public String getReasonDetails() { return reasonDetails; }
    public void setReasonDetails(String reasonDetails) { this.reasonDetails = reasonDetails; }

    public String getAdminRemarks() { return adminRemarks; }
    public void setAdminRemarks(String adminRemarks) { this.adminRemarks = adminRemarks; }

    public Integer getReturnedQuantity() { return returnedQuantity; }
    public void setReturnedQuantity(Integer returnedQuantity) { this.returnedQuantity = returnedQuantity; }

    public Integer getKeptQuantity() { return keptQuantity; }
    public void setKeptQuantity(Integer keptQuantity) { this.keptQuantity = keptQuantity; }

    public BigDecimal getRefundAmount() { return refundAmount; }
    public void setRefundAmount(BigDecimal refundAmount) { this.refundAmount = refundAmount; }

    public Long getReplacementProductId() { return replacementProductId; }
    public void setReplacementProductId(Long replacementProductId) { this.replacementProductId = replacementProductId; }

    public Integer getReplacementQuantity() { return replacementQuantity; }
    public void setReplacementQuantity(Integer replacementQuantity) { this.replacementQuantity = replacementQuantity; }

    public String getReplacementProductName() { return replacementProductName; }
    public void setReplacementProductName(String replacementProductName) { this.replacementProductName = replacementProductName; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }

    public String getSupplierName() { return supplierName; }
    public void setSupplierName(String supplierName) { this.supplierName = supplierName; }

    public String getDistrictName() { return districtName; }
    public void setDistrictName(String districtName) { this.districtName = districtName; }

    public List<StockReturnItem> getItems() { return items; }
    public void setItems(List<StockReturnItem> items) { this.items = items; }
}
