package com.fizzdrop.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

public class AdminReviewDTO {

    @JsonProperty("action")
    private String action; // "APPROVE_FULL", "APPROVE_PARTIAL", "REJECT"

    @JsonProperty("admin_remarks")
    @JsonAlias({"admin_remarks", "adminRemarks", "remarks"})
    private String adminRemarks;

    @JsonProperty("items")
    private List<ItemApproval> items;

    public static class ItemApproval {
        @JsonProperty("item_id")
        @JsonAlias({"item_id", "itemId", "id"})
        private Long itemId;

        @JsonProperty("approved_quantity")
        @JsonAlias({"approved_quantity", "approvedQuantity", "quantity"})
        private Integer approvedQuantity;

        public Long getItemId() { return itemId; }
        public void setItemId(Long itemId) { this.itemId = itemId; }

        public Integer getApprovedQuantity() { return approvedQuantity; }
        public void setApprovedQuantity(Integer approvedQuantity) { this.approvedQuantity = approvedQuantity; }
    }

    public String getAction() { return action; }
    public void setAction(String action) { this.action = action; }

    public String getAdminRemarks() { return adminRemarks; }
    public void setAdminRemarks(String adminRemarks) { this.adminRemarks = adminRemarks; }

    public List<ItemApproval> getItems() { return items; }
    public void setItems(List<ItemApproval> items) { this.items = items; }
}
