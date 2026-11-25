package com.fizzdrop.entity;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "sales_manager_reports")
public class SalesManagerReport {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "report_type", nullable = false, length = 50)
    @JsonProperty("report_type")
    private String reportType = "ASM_TO_RSM";

    @Column(name = "asm_id", nullable = false)
    @JsonProperty("asm_id")
    private Long asmId;

    @Column(name = "rsm_id", nullable = false)
    @JsonProperty("rsm_id")
    private Long rsmId;

    @Column(name = "district_id", nullable = false)
    @JsonProperty("district_id")
    private Long districtId;

    @Column(name = "district_name", nullable = false, length = 100)
    @JsonProperty("district_name")
    private String districtName;

    @Column(name = "division", nullable = false, length = 100)
    private String division;

    @Column(name = "reporting_period", nullable = false, length = 50)
    @JsonProperty("reporting_period")
    private String reportingPeriod;

    @Column(name = "total_sales_cases", nullable = false)
    @JsonProperty("total_sales_cases")
    private Integer totalSalesCases = 0;

    @Column(name = "total_revenue", precision = 15, scale = 2, nullable = false)
    @JsonProperty("total_revenue")
    private BigDecimal totalRevenue = BigDecimal.ZERO;

    @Column(name = "overall_profit", precision = 15, scale = 2, nullable = false)
    @JsonProperty("overall_profit")
    private BigDecimal overallProfit = BigDecimal.ZERO;

    @Column(name = "overall_loss", precision = 15, scale = 2, nullable = false)
    @JsonProperty("overall_loss")
    private BigDecimal overallLoss = BigDecimal.ZERO;

    @Column(name = "so_count")
    @JsonProperty("so_count")
    private Integer soCount = 0;

    @Column(name = "active_orders_count")
    @JsonProperty("active_orders_count")
    private Integer activeOrdersCount = 0;

    @Lob
    @Column(name = "product_demands_json")
    @JsonProperty("product_demands_json")
    private String productDemandsJson;

    @Lob
    @Column(name = "so_activities_json")
    @JsonProperty("so_activities_json")
    private String soActivitiesJson;

    @Lob
    @Column(name = "notes")
    private String notes;

    @Column(name = "status", nullable = false, length = 50)
    private String status = "SUBMITTED";

    @Column(name = "submitted_at")
    @JsonProperty("submitted_at")
    private LocalDateTime submittedAt = LocalDateTime.now();

    public SalesManagerReport() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getReportType() { return reportType; }
    public void setReportType(String reportType) { this.reportType = reportType; }

    public Long getAsmId() { return asmId; }
    public void setAsmId(Long asmId) { this.asmId = asmId; }

    public Long getRsmId() { return rsmId; }
    public void setRsmId(Long rsmId) { this.rsmId = rsmId; }

    public Long getDistrictId() { return districtId; }
    public void setDistrictId(Long districtId) { this.districtId = districtId; }

    public String getDistrictName() { return districtName; }
    public void setDistrictName(String districtName) { this.districtName = districtName; }

    public String getDivision() { return division; }
    public void setDivision(String division) { this.division = division; }

    public String getReportingPeriod() { return reportingPeriod; }
    public void setReportingPeriod(String reportingPeriod) { this.reportingPeriod = reportingPeriod; }

    public Integer getTotalSalesCases() { return totalSalesCases; }
    public void setTotalSalesCases(Integer totalSalesCases) { this.totalSalesCases = totalSalesCases; }

    public BigDecimal getTotalRevenue() { return totalRevenue; }
    public void setTotalRevenue(BigDecimal totalRevenue) { this.totalRevenue = totalRevenue; }

    public BigDecimal getOverallProfit() { return overallProfit; }
    public void setOverallProfit(BigDecimal overallProfit) { this.overallProfit = overallProfit; }

    public BigDecimal getOverallLoss() { return overallLoss; }
    public void setOverallLoss(BigDecimal overallLoss) { this.overallLoss = overallLoss; }

    public Integer getSoCount() { return soCount; }
    public void setSoCount(Integer soCount) { this.soCount = soCount; }

    public Integer getActiveOrdersCount() { return activeOrdersCount; }
    public void setActiveOrdersCount(Integer activeOrdersCount) { this.activeOrdersCount = activeOrdersCount; }

    public String getProductDemandsJson() { return productDemandsJson; }
    public void setProductDemandsJson(String productDemandsJson) { this.productDemandsJson = productDemandsJson; }

    public String getSoActivitiesJson() { return soActivitiesJson; }
    public void setSoActivitiesJson(String soActivitiesJson) { this.soActivitiesJson = soActivitiesJson; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public LocalDateTime getSubmittedAt() { return submittedAt; }
    public void setSubmittedAt(LocalDateTime submittedAt) { this.submittedAt = submittedAt; }
}
