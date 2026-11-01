package com.fizzdrop.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonProperty;

public class ReturnReviewDTO {

    @JsonProperty("decision")
    private String decision; // "APPROVE" or "REJECT"

    @JsonProperty("admin_remarks")
    @JsonAlias({"admin_remarks", "adminRemarks"})
    private String adminRemarks;

    public String getDecision() { return decision; }
    public void setDecision(String decision) { this.decision = decision; }

    public String getAdminRemarks() { return adminRemarks; }
    public void setAdminRemarks(String adminRemarks) { this.adminRemarks = adminRemarks; }
}
