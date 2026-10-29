package com.fizzdrop.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonProperty;

public class SupplyRequest {

    @JsonProperty("outlet_id")
    @JsonAlias({"outlet_id", "outletId", "branch_id", "branchId"})
    private Long outletId;

    @JsonProperty("product_id")
    @JsonAlias({"product_id", "productId"})
    private Long productId;

    @JsonProperty("quantity")
    @JsonAlias({"quantity", "amount", "qty"})
    private Integer quantity;

    @JsonProperty("mode")
    @JsonAlias({"mode", "action"})
    private String mode = "ADD"; // "ADD" or "SET"

    @JsonProperty("notes")
    private String notes;

    @JsonProperty("user_id")
    @JsonAlias({"user_id", "userId"})
    private Long userId;

    @JsonProperty("district_id")
    @JsonAlias({"district_id", "districtId"})
    private Long districtId;

    public SupplyRequest() {}

    public SupplyRequest(Long outletId, Long productId, Integer quantity, String mode) {
        this.outletId = outletId;
        this.productId = productId;
        this.quantity = quantity;
        this.mode = mode != null ? mode : "ADD";
    }

    public Long getOutletId() { return outletId; }
    public void setOutletId(Long outletId) { this.outletId = outletId; }

    public Long getProductId() { return productId; }
    public void setProductId(Long productId) { this.productId = productId; }

    public Integer getQuantity() { return quantity; }
    public void setQuantity(Integer quantity) { this.quantity = quantity; }

    public String getMode() { return mode; }
    public void setMode(String mode) { this.mode = mode; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }

    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }

    public Long getDistrictId() { return districtId; }
    public void setDistrictId(Long districtId) { this.districtId = districtId; }
}
