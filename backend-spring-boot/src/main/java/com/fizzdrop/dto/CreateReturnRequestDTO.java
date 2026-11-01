package com.fizzdrop.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

public class CreateReturnRequestDTO {

    @JsonProperty("requisition_id")
    @JsonAlias({"requisition_id", "requisitionId"})
    private Long requisitionId;

    @JsonProperty("return_type")
    @JsonAlias({"return_type", "returnType"})
    private String returnType; // "REFUND_CASH" or "EXCHANGE_PRODUCT"

    @JsonProperty("reason_category")
    @JsonAlias({"reason_category", "reasonCategory"})
    private String reasonCategory; // e.g. "DAMAGED_IN_TRANSIT", "DEFECTIVE_SEAL", "WRONG_VARIANT", "NEAR_EXPIRY", "EXCESS_STOCK", "OTHER"

    @JsonProperty("reason_details")
    @JsonAlias({"reason_details", "reasonDetails"})
    private String reasonDetails;

    @JsonProperty("replacement_product_id")
    @JsonAlias({"replacement_product_id", "replacementProductId"})
    private Long replacementProductId;

    @JsonProperty("replacement_quantity")
    @JsonAlias({"replacement_quantity", "replacementQuantity"})
    private Integer replacementQuantity;

    @JsonProperty("items")
    private List<ItemReturnDetail> items;

    public static class ItemReturnDetail {
        @JsonProperty("product_id")
        @JsonAlias({"product_id", "productId"})
        private Long productId;

        @JsonProperty("kept_quantity")
        @JsonAlias({"kept_quantity", "keptQuantity"})
        private Integer keptQuantity;

        @JsonProperty("returned_quantity")
        @JsonAlias({"returned_quantity", "returnedQuantity"})
        private Integer returnedQuantity;

        public Long getProductId() { return productId; }
        public void setProductId(Long productId) { this.productId = productId; }

        public Integer getKeptQuantity() { return keptQuantity; }
        public void setKeptQuantity(Integer keptQuantity) { this.keptQuantity = keptQuantity; }

        public Integer getReturnedQuantity() { return returnedQuantity; }
        public void setReturnedQuantity(Integer returnedQuantity) { this.returnedQuantity = returnedQuantity; }
    }

    public Long getRequisitionId() { return requisitionId; }
    public void setRequisitionId(Long requisitionId) { this.requisitionId = requisitionId; }

    public String getReturnType() { return returnType; }
    public void setReturnType(String returnType) { this.returnType = returnType; }

    public String getReasonCategory() { return reasonCategory; }
    public void setReasonCategory(String reasonCategory) { this.reasonCategory = reasonCategory; }

    public String getReasonDetails() { return reasonDetails; }
    public void setReasonDetails(String reasonDetails) { this.reasonDetails = reasonDetails; }

    public Long getReplacementProductId() { return replacementProductId; }
    public void setReplacementProductId(Long replacementProductId) { this.replacementProductId = replacementProductId; }

    public Integer getReplacementQuantity() { return replacementQuantity; }
    public void setReplacementQuantity(Integer replacementQuantity) { this.replacementQuantity = replacementQuantity; }

    public List<ItemReturnDetail> getItems() { return items; }
    public void setItems(List<ItemReturnDetail> items) { this.items = items; }
}
