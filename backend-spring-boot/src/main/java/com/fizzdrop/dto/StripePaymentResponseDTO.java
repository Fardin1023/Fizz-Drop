package com.fizzdrop.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.math.BigDecimal;
import java.util.Map;

public class StripePaymentResponseDTO {

    private boolean success;
    private String message;

    @JsonProperty("client_secret")
    private String clientSecret;

    @JsonProperty("payment_intent_id")
    private String paymentIntentId;

    @JsonProperty("publishable_key")
    private String publishableKey;

    private BigDecimal amount;
    private String currency;
    private String status;

    private Map<String, Object> details;

    public StripePaymentResponseDTO() {}

    public static StripePaymentResponseDTO success(String clientSecret, String paymentIntentId, String publishableKey, BigDecimal amount, String currency, String status) {
        StripePaymentResponseDTO res = new StripePaymentResponseDTO();
        res.setSuccess(true);
        res.setClientSecret(clientSecret);
        res.setPaymentIntentId(paymentIntentId);
        res.setPublishableKey(publishableKey);
        res.setAmount(amount);
        res.setCurrency(currency);
        res.setStatus(status);
        res.setMessage("Stripe payment intent created successfully.");
        return res;
    }

    public static StripePaymentResponseDTO failure(String message) {
        StripePaymentResponseDTO res = new StripePaymentResponseDTO();
        res.setSuccess(false);
        res.setMessage(message);
        return res;
    }

    public boolean isSuccess() { return success; }
    public void setSuccess(boolean success) { this.success = success; }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }

    public String getClientSecret() { return clientSecret; }
    public void setClientSecret(String clientSecret) { this.clientSecret = clientSecret; }

    public String getPaymentIntentId() { return paymentIntentId; }
    public void setPaymentIntentId(String paymentIntentId) { this.paymentIntentId = paymentIntentId; }

    public String getPublishableKey() { return publishableKey; }
    public void setPublishableKey(String publishableKey) { this.publishableKey = publishableKey; }

    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }

    public String getCurrency() { return currency; }
    public void setCurrency(String currency) { this.currency = currency; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public Map<String, Object> getDetails() { return details; }
    public void setDetails(Map<String, Object> details) { this.details = details; }
}
