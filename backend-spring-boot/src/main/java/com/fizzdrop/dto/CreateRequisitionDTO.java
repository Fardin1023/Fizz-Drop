package com.fizzdrop.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

public class CreateRequisitionDTO {

    @JsonProperty("urgency")
    private String urgency = "NORMAL";

    @JsonProperty("supplier_remarks")
    @JsonAlias({"supplier_remarks", "supplierRemarks", "remarks"})
    private String supplierRemarks;

    @JsonProperty("items")
    private List<ItemRequest> items;

    public static class ItemRequest {
        @JsonProperty("product_id")
        @JsonAlias({"product_id", "productId"})
        private Long productId;

        @JsonProperty("requested_quantity")
        @JsonAlias({"requested_quantity", "requestedQuantity", "quantity"})
        private Integer requestedQuantity;

        public Long getProductId() { return productId; }
        public void setProductId(Long productId) { this.productId = productId; }

        public Integer getRequestedQuantity() { return requestedQuantity; }
        public void setRequestedQuantity(Integer requestedQuantity) { this.requestedQuantity = requestedQuantity; }
    }

    public String getUrgency() { return urgency; }
    public void setUrgency(String urgency) { this.urgency = urgency; }

    public String getSupplierRemarks() { return supplierRemarks; }
    public void setSupplierRemarks(String supplierRemarks) { this.supplierRemarks = supplierRemarks; }

    public List<ItemRequest> getItems() { return items; }
    public void setItems(List<ItemRequest> items) { this.items = items; }
}
