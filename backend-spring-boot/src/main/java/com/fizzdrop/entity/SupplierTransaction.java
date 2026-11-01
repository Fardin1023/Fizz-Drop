package com.fizzdrop.entity;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "supplier_transactions")
public class SupplierTransaction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "transaction_code", nullable = false, unique = true, length = 60)
    @JsonProperty("transaction_code")
    @JsonAlias({"transaction_code", "transactionCode"})
    private String transactionCode;

    @Column(name = "supplier_id", nullable = false)
    @JsonProperty("supplier_id")
    @JsonAlias({"supplier_id", "supplierId"})
    private Long supplierId;

    @Column(name = "requisition_id")
    @JsonProperty("requisition_id")
    @JsonAlias({"requisition_id", "requisitionId"})
    private Long requisitionId;

    @Column(name = "return_request_id")
    @JsonProperty("return_request_id")
    @JsonAlias({"return_request_id", "returnRequestId"})
    private Long returnRequestId;

    @Column(name = "reference_code", length = 60)
    @JsonProperty("reference_code")
    @JsonAlias({"reference_code", "referenceCode"})
    private String referenceCode;

    @Column(name = "type", nullable = false, length = 40)
    @JsonProperty("type")
    private String type; // "STOCK_PURCHASE", "SHORTFALL_REFUND", "STOCK_RETURN_REFUND", "PRODUCT_EXCHANGE", "DUE_SETTLEMENT"

    @Column(name = "entry_type", nullable = false, length = 10)
    @JsonProperty("entry_type")
    @JsonAlias({"entry_type", "entryType"})
    private String entryType; // "DEBIT" (money spent), "CREDIT" (money refunded)

    @Column(name = "amount", nullable = false)
    @JsonProperty("amount")
    private BigDecimal amount;

    @Column(name = "payment_method", length = 60)
    @JsonProperty("payment_method")
    @JsonAlias({"payment_method", "paymentMethod"})
    private String paymentMethod;

    @Lob
    @Column(name = "description", columnDefinition = "TEXT")
    @JsonProperty("description")
    private String description;

    @Column(name = "status", nullable = false, length = 30)
    @JsonProperty("status")
    private String status = "COMPLETED"; // "COMPLETED", "PENDING", "REJECTED"

    @Column(name = "created_at", nullable = false)
    @JsonProperty("created_at")
    private LocalDateTime createdAt = LocalDateTime.now();

    public SupplierTransaction() {}

    public SupplierTransaction(String transactionCode, Long supplierId, Long requisitionId, Long returnRequestId, String referenceCode, String type, String entryType, BigDecimal amount, String paymentMethod, String description, String status) {
        this.transactionCode = transactionCode;
        this.supplierId = supplierId;
        this.requisitionId = requisitionId;
        this.returnRequestId = returnRequestId;
        this.referenceCode = referenceCode;
        this.type = type;
        this.entryType = entryType;
        this.amount = amount;
        this.paymentMethod = paymentMethod;
        this.description = description;
        this.status = status;
        this.createdAt = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getTransactionCode() { return transactionCode; }
    public void setTransactionCode(String transactionCode) { this.transactionCode = transactionCode; }

    public Long getSupplierId() { return supplierId; }
    public void setSupplierId(Long supplierId) { this.supplierId = supplierId; }

    public Long getRequisitionId() { return requisitionId; }
    public void setRequisitionId(Long requisitionId) { this.requisitionId = requisitionId; }

    public Long getReturnRequestId() { return returnRequestId; }
    public void setReturnRequestId(Long returnRequestId) { this.returnRequestId = returnRequestId; }

    public String getReferenceCode() { return referenceCode; }
    public void setReferenceCode(String referenceCode) { this.referenceCode = referenceCode; }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public String getEntryType() { return entryType; }
    public void setEntryType(String entryType) { this.entryType = entryType; }

    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }

    public String getPaymentMethod() { return paymentMethod; }
    public void setPaymentMethod(String paymentMethod) { this.paymentMethod = paymentMethod; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
