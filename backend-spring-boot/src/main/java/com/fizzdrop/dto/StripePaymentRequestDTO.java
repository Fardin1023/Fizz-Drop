package com.fizzdrop.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.math.BigDecimal;
import java.util.Map;

public class StripePaymentRequestDTO {

    private BigDecimal amount;
    private String currency;

    @JsonProperty("payment_type")
    private String paymentType; // WALLET_TOPUP, CONSUMER_ORDER, STOCK_REQUISITION, OUTLET_REQUISITION

    @JsonProperty("reference_id")
    private String referenceId;

    private String description;

    @JsonProperty("user_id")
    private Long userId;

    @JsonProperty("supplier_id")
    private Long supplierId;

    @JsonProperty("outlet_id")
    private Long outletId;

    @JsonProperty("product_id")
    private Long productId;

    private Integer quantity;

    private Map<String, String> metadata;

    @JsonProperty("payload_data")
    private Map<String, Object> payloadData;

    public StripePaymentRequestDTO() {}

    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }

    public String getCurrency() { return currency; }
    public void setCurrency(String currency) { this.currency = currency; }

    public String getPaymentType() { return paymentType; }
    public void setPaymentType(String paymentType) { this.paymentType = paymentType; }

    public String getReferenceId() { return referenceId; }
    public void setReferenceId(String referenceId) { this.referenceId = referenceId; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }

    public Long getSupplierId() { return supplierId; }
    public void setSupplierId(Long supplierId) { this.supplierId = supplierId; }

    public Long getOutletId() { return outletId; }
    public void setOutletId(Long outletId) { this.outletId = outletId; }

    public Long getProductId() { return productId; }
    public void setProductId(Long productId) { this.productId = productId; }

    public Integer getQuantity() { return quantity; }
    public void setQuantity(Integer quantity) { this.quantity = quantity; }

    public Map<String, String> getMetadata() { return metadata; }
    public void setMetadata(Map<String, String> metadata) { this.metadata = metadata; }

    public Map<String, Object> getPayloadData() { return payloadData; }
    public void setPayloadData(Map<String, Object> payloadData) { this.payloadData = payloadData; }
}
