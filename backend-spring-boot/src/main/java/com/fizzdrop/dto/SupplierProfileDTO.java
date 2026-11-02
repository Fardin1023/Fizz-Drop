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

    @JsonProperty("allocated_areas")
    @JsonAlias({"allocated_areas", "allocatedAreas"})
    private String allocatedAreas;

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

    @JsonProperty("email")
    @JsonAlias({"email", "user_email", "userEmail"})
    private String email;

    @JsonProperty("password")
    @JsonAlias({"password", "password_hash", "passwordHash"})
    private String password;

    @JsonProperty("is_verified")
    @JsonAlias({"is_verified", "isVerified"})
    private Boolean isVerified;

    @JsonProperty("user_id")
    @JsonAlias({"user_id", "userId"})
    private Long userId;

    @JsonProperty("vat_registration_no")
    @JsonAlias({"vat_registration_no", "vatRegistrationNo"})
    private String vatRegistrationNo;

    @JsonProperty("application_document")
    @JsonAlias({"application_document", "applicationDocument"})
    private String applicationDocument;

    @JsonProperty("application_doc_name")
    @JsonAlias({"application_doc_name", "applicationDocName"})
    private String applicationDocName;

    @JsonProperty("application_doc_type")
    @JsonAlias({"application_doc_type", "applicationDocType"})
    private String applicationDocType;

    @JsonProperty("trade_license_document")
    @JsonAlias({"trade_license_document", "tradeLicenseDocument"})
    private String tradeLicenseDocument;

    @JsonProperty("trade_license_doc_name")
    @JsonAlias({"trade_license_doc_name", "tradeLicenseDocName"})
    private String tradeLicenseDocName;

    @JsonProperty("trade_license_doc_type")
    @JsonAlias({"trade_license_doc_type", "tradeLicenseDocType"})
    private String tradeLicenseDocType;

    @JsonProperty("tin_document")
    @JsonAlias({"tin_document", "tinDocument"})
    private String tinDocument;

    @JsonProperty("tin_doc_name")
    @JsonAlias({"tin_doc_name", "tinDocName"})
    private String tinDocName;

    @JsonProperty("tin_doc_type")
    @JsonAlias({"tin_doc_type", "tinDocType"})
    private String tinDocType;

    @JsonProperty("bin_document")
    @JsonAlias({"bin_document", "binDocument"})
    private String binDocument;

    @JsonProperty("bin_doc_name")
    @JsonAlias({"bin_doc_name", "binDocName"})
    private String binDocName;

    @JsonProperty("bin_doc_type")
    @JsonAlias({"bin_doc_type", "binDocType"})
    private String binDocType;

    @JsonProperty("tds_vds_document")
    @JsonAlias({"tds_vds_document", "tdsVdsDocument"})
    private String tdsVdsDocument;

    @JsonProperty("tds_vds_doc_name")
    @JsonAlias({"tds_vds_doc_name", "tdsVdsDocName"})
    private String tdsVdsDocName;

    @JsonProperty("tds_vds_doc_type")
    @JsonAlias({"tds_vds_doc_type", "tdsVdsDocType"})
    private String tdsVdsDocType;

    @JsonProperty("tds_vds_number")
    @JsonAlias({"tds_vds_number", "tdsVdsNumber"})
    private String tdsVdsNumber;

    public Long getPrimaryDistrictId() { return primaryDistrictId; }
    public void setPrimaryDistrictId(Long primaryDistrictId) { this.primaryDistrictId = primaryDistrictId; }

    public String getDivisionName() { return divisionName; }
    public void setDivisionName(String divisionName) { this.divisionName = divisionName; }

    public List<Long> getCoveredDistrictIds() { return coveredDistrictIds; }
    public void setCoveredDistrictIds(List<Long> coveredDistrictIds) { this.coveredDistrictIds = coveredDistrictIds; }

    public String getAllocatedAreas() { return allocatedAreas; }
    public void setAllocatedAreas(String allocatedAreas) { this.allocatedAreas = allocatedAreas; }

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

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }

    public Boolean getIsVerified() { return isVerified; }
    public void setIsVerified(Boolean isVerified) { this.isVerified = isVerified; }

    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }

    public String getVatRegistrationNo() { return vatRegistrationNo; }
    public void setVatRegistrationNo(String vatRegistrationNo) { this.vatRegistrationNo = vatRegistrationNo; }

    public String getApplicationDocument() { return applicationDocument; }
    public void setApplicationDocument(String applicationDocument) { this.applicationDocument = applicationDocument; }

    public String getApplicationDocName() { return applicationDocName; }
    public void setApplicationDocName(String applicationDocName) { this.applicationDocName = applicationDocName; }

    public String getApplicationDocType() { return applicationDocType; }
    public void setApplicationDocType(String applicationDocType) { this.applicationDocType = applicationDocType; }

    public String getTradeLicenseDocument() { return tradeLicenseDocument; }
    public void setTradeLicenseDocument(String tradeLicenseDocument) { this.tradeLicenseDocument = tradeLicenseDocument; }

    public String getTradeLicenseDocName() { return tradeLicenseDocName; }
    public void setTradeLicenseDocName(String tradeLicenseDocName) { this.tradeLicenseDocName = tradeLicenseDocName; }

    public String getTradeLicenseDocType() { return tradeLicenseDocType; }
    public void setTradeLicenseDocType(String tradeLicenseDocType) { this.tradeLicenseDocType = tradeLicenseDocType; }

    public String getTinDocument() { return tinDocument; }
    public void setTinDocument(String tinDocument) { this.tinDocument = tinDocument; }

    public String getTinDocName() { return tinDocName; }
    public void setTinDocName(String tinDocName) { this.tinDocName = tinDocName; }

    public String getTinDocType() { return tinDocType; }
    public void setTinDocType(String tinDocType) { this.tinDocType = tinDocType; }

    public String getBinDocument() { return binDocument; }
    public void setBinDocument(String binDocument) { this.binDocument = binDocument; }

    public String getBinDocName() { return binDocName; }
    public void setBinDocName(String binDocName) { this.binDocName = binDocName; }

    public String getBinDocType() { return binDocType; }
    public void setBinDocType(String binDocType) { this.binDocType = binDocType; }

    public String getTdsVdsDocument() { return tdsVdsDocument; }
    public void setTdsVdsDocument(String tdsVdsDocument) { this.tdsVdsDocument = tdsVdsDocument; }

    public String getTdsVdsDocName() { return tdsVdsDocName; }
    public void setTdsVdsDocName(String tdsVdsDocName) { this.tdsVdsDocName = tdsVdsDocName; }

    public String getTdsVdsDocType() { return tdsVdsDocType; }
    public void setTdsVdsDocType(String tdsVdsDocType) { this.tdsVdsDocType = tdsVdsDocType; }

    public String getTdsVdsNumber() { return tdsVdsNumber; }
    public void setTdsVdsNumber(String tdsVdsNumber) { this.tdsVdsNumber = tdsVdsNumber; }
}
