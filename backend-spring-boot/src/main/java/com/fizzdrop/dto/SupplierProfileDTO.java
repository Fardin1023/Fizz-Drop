package com.fizzdrop.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

public class SupplierProfileDTO {

    @JsonProperty("primary_district_id")
    @JsonAlias({"primary_district_id", "primaryDistrictId", "district_id", "districtId"})
    private Long primaryDistrictId;

    @JsonProperty("division_name")
    @JsonAlias({"division_name", "divisionName", "division"})
    private String divisionName;

    @JsonProperty("covered_district_ids")
    @JsonAlias({"covered_district_ids", "coveredDistrictIds"})
    private List<Long> coveredDistrictIds;

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

    @JsonProperty("default_payment_method")
    @JsonAlias({"default_payment_method", "defaultPaymentMethod"})
    private String defaultPaymentMethod;

    @JsonProperty("bank_name")
    @JsonAlias({"bank_name", "bankName"})
    private String bankName;

    @JsonProperty("bank_account_number")
    @JsonAlias({"bank_account_number", "bankAccountNumber"})
    private String bankAccountNumber;

    @JsonProperty("bank_account_name")
    @JsonAlias({"bank_account_name", "bankAccountName"})
    private String bankAccountName;

    @JsonProperty("mobile_banking_number")
    @JsonAlias({"mobile_banking_number", "mobileBankingNumber"})
    private String mobileBankingNumber;

    public Long getPrimaryDistrictId() { return primaryDistrictId; }
    public void setPrimaryDistrictId(Long primaryDistrictId) { this.primaryDistrictId = primaryDistrictId; }

    public String getDivisionName() { return divisionName; }
    public void setDivisionName(String divisionName) { this.divisionName = divisionName; }

    public List<Long> getCoveredDistrictIds() { return coveredDistrictIds; }
    public void setCoveredDistrictIds(List<Long> coveredDistrictIds) { this.coveredDistrictIds = coveredDistrictIds; }

    public String getBusinessName() { return businessName; }
    public void setBusinessName(String businessName) { this.businessName = businessName; }

    public String getTradeLicenseNumber() { return tradeLicenseNumber; }
    public void setTradeLicenseNumber(String tradeLicenseNumber) { this.tradeLicenseNumber = tradeLicenseNumber; }

    public String getDepotAddress() { return depotAddress; }
    public void setDepotAddress(String depotAddress) { this.depotAddress = depotAddress; }

    public String getPhoneNumber() { return phoneNumber; }
    public void setPhoneNumber(String phoneNumber) { this.phoneNumber = phoneNumber; }

    public String getDefaultPaymentMethod() { return defaultPaymentMethod; }
    public void setDefaultPaymentMethod(String defaultPaymentMethod) { this.defaultPaymentMethod = defaultPaymentMethod; }

    public String getBankName() { return bankName; }
    public void setBankName(String bankName) { this.bankName = bankName; }

    public String getBankAccountNumber() { return bankAccountNumber; }
    public void setBankAccountNumber(String bankAccountNumber) { this.bankAccountNumber = bankAccountNumber; }

    public String getBankAccountName() { return bankAccountName; }
    public void setBankAccountName(String bankAccountName) { this.bankAccountName = bankAccountName; }

    public String getMobileBankingNumber() { return mobileBankingNumber; }
    public void setMobileBankingNumber(String mobileBankingNumber) { this.mobileBankingNumber = mobileBankingNumber; }
}
