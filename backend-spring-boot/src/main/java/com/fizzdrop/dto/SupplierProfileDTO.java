package com.fizzdrop.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonProperty;

public class SupplierProfileDTO {

    @JsonProperty("primary_district_id")
    @JsonAlias({"primary_district_id", "primaryDistrictId", "district_id", "districtId"})
    private Long primaryDistrictId;

    @JsonProperty("business_name")
    @JsonAlias({"business_name", "businessName"})
    private String businessName;

    @JsonProperty("trade_license_number")
    @JsonAlias({"trade_license_number", "tradeLicenseNumber"})
    private String tradeLicenseNumber;

    @JsonProperty("depot_address")
    @JsonAlias({"depot_address", "depotAddress"})
    private String depotAddress;

    @JsonProperty("phone_number")
    @JsonAlias({"phone_number", "phoneNumber"})
    private String phoneNumber;

    public Long getPrimaryDistrictId() { return primaryDistrictId; }
    public void setPrimaryDistrictId(Long primaryDistrictId) { this.primaryDistrictId = primaryDistrictId; }

    public String getBusinessName() { return businessName; }
    public void setBusinessName(String businessName) { this.businessName = businessName; }

    public String getTradeLicenseNumber() { return tradeLicenseNumber; }
    public void setTradeLicenseNumber(String tradeLicenseNumber) { this.tradeLicenseNumber = tradeLicenseNumber; }

    public String getDepotAddress() { return depotAddress; }
    public void setDepotAddress(String depotAddress) { this.depotAddress = depotAddress; }

    public String getPhoneNumber() { return phoneNumber; }
    public void setPhoneNumber(String phoneNumber) { this.phoneNumber = phoneNumber; }
}
