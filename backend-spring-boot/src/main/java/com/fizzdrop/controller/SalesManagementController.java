package com.fizzdrop.controller;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fizzdrop.entity.*;
import com.fizzdrop.repository.*;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

@RestController
@RequestMapping("/api/v1/sales-management")
@CrossOrigin(origins = "*")
public class SalesManagementController {

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final JdbcTemplate jdbcTemplate;
    private final RegionalSalesManagerRepository rsmRepository;
    private final AreaSalesManagerRepository asmRepository;
    private final SalesManagerReportRepository reportRepository;
    private final DistrictRepository districtRepository;

    public SalesManagementController(
            JdbcTemplate jdbcTemplate,
            RegionalSalesManagerRepository rsmRepository,
            AreaSalesManagerRepository asmRepository,
            SalesManagerReportRepository reportRepository,
            DistrictRepository districtRepository) {
        this.jdbcTemplate = jdbcTemplate;
        this.rsmRepository = rsmRepository;
        this.asmRepository = asmRepository;
        this.reportRepository = reportRepository;
        this.districtRepository = districtRepository;
    }

    // 1. Get 6 Divisions Summary
    @GetMapping("/divisions")
    public ResponseEntity<Map<String, Object>> getDivisions() {
        List<Map<String, Object>> divisionStats = jdbcTemplate.queryForList(
                "SELECT d.division, COUNT(d.id) AS district_count, " +
                "rsm.id AS rsm_id, rsm.name AS rsm_name, rsm.code AS rsm_code, rsm.phone AS rsm_phone, rsm.email AS rsm_email " +
                "FROM districts d " +
                "LEFT JOIN regional_sales_managers rsm ON LOWER(d.division) = LOWER(rsm.division) " +
                "GROUP BY d.division, rsm.id, rsm.name, rsm.code, rsm.phone, rsm.email " +
                "ORDER BY district_count DESC"
        );

        Map<String, Object> res = new HashMap<>();
        res.put("success", true);
        res.put("count", divisionStats.size());
        res.put("divisions", divisionStats);
        return ResponseEntity.ok(res);
    }

    // 2. Get All 6 Regional Sales Managers (RSM) with Aggregated Division Performance
    @GetMapping("/rsm/all")
    public ResponseEntity<Map<String, Object>> getAllRsms() {
        List<RegionalSalesManager> rsms = rsmRepository.findAll();
        List<Map<String, Object>> rsmList = new ArrayList<>();

        for (RegionalSalesManager rsm : rsms) {
            Map<String, Object> m = new HashMap<>();
            m.put("id", rsm.getId());
            m.put("code", rsm.getCode());
            m.put("name", rsm.getName());
            m.put("email", rsm.getEmail());
            m.put("phone", rsm.getPhone());
            m.put("division", rsm.getDivision());
            m.put("target_sales", rsm.getTargetSales());

            // Count districts / ASMs in this division
            Integer districtCount = jdbcTemplate.queryForObject(
                    "SELECT COUNT(*) FROM districts WHERE LOWER(division) = LOWER(?)",
                    Integer.class, rsm.getDivision()
            );
            m.put("district_count", districtCount != null ? districtCount : 0);

            Integer asmCount = jdbcTemplate.queryForObject(
                    "SELECT COUNT(*) FROM area_sales_managers WHERE rsm_id = ?",
                    Integer.class, rsm.getId()
            );
            m.put("asm_count", asmCount != null ? asmCount : 0);

            // Compute division sales, profit & loss from sales_officer_distributions & outlet_requisitions
            Map<String, Object> metrics = calculateDivisionMetrics(rsm.getDivision());
            m.putAll(metrics);

            BigDecimal target = rsm.getTargetSales() != null ? rsm.getTargetSales() : new BigDecimal("15000000.00");
            BigDecimal revenue = (BigDecimal) metrics.get("total_revenue");
            int achievement = target.compareTo(BigDecimal.ZERO) > 0 && revenue != null
                    ? revenue.multiply(new BigDecimal(100)).divide(target, 0, RoundingMode.HALF_UP).intValue()
                    : 0;
            m.put("achievement_percentage", Math.min(100, Math.max(0, achievement)));

            // Latest report received
            List<SalesManagerReport> reports = reportRepository.findByRsmIdOrderBySubmittedAtDesc(rsm.getId());
            m.put("reports_count", reports.size());
            m.put("latest_report_date", reports.isEmpty() ? null : reports.get(0).getSubmittedAt());

            rsmList.add(m);
        }

        Map<String, Object> res = new HashMap<>();
        res.put("success", true);
        res.put("rsms", rsmList);
        return ResponseEntity.ok(res);
    }

    // 3. RSM Dashboard: Tracks all ASMs under him, division metrics, product demands & received reports
    @GetMapping("/rsm/{rsmId}/dashboard")
    public ResponseEntity<Map<String, Object>> getRsmDashboard(@PathVariable Long rsmId) {
        Optional<RegionalSalesManager> rsmOpt = rsmRepository.findById(rsmId);
        if (rsmOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        RegionalSalesManager rsm = rsmOpt.get();

        // 1. ASMs under this RSM
        List<AreaSalesManager> asms = asmRepository.findByRsmId(rsm.getId());
        List<Map<String, Object>> asmCards = new ArrayList<>();

        for (AreaSalesManager asm : asms) {
            Map<String, Object> card = new HashMap<>();
            card.put("id", asm.getId());
            card.put("code", asm.getCode());
            card.put("name", asm.getName());
            card.put("email", asm.getEmail());
            card.put("phone", asm.getPhone());
            card.put("district_id", asm.getDistrictId());
            card.put("district_name", asm.getDistrictName());
            card.put("division", asm.getDivision());
            card.put("target_sales", asm.getTargetSales());

            // District metrics
            Map<String, Object> dMetrics = calculateDistrictMetrics(asm.getDistrictId());
            card.putAll(dMetrics);

            BigDecimal dTarget = asm.getTargetSales() != null ? asm.getTargetSales() : new BigDecimal("2500000.00");
            BigDecimal dRev = (BigDecimal) dMetrics.get("total_revenue");
            int dAchievement = dTarget.compareTo(BigDecimal.ZERO) > 0 && dRev != null
                    ? dRev.multiply(new BigDecimal(100)).divide(dTarget, 0, RoundingMode.HALF_UP).intValue()
                    : 0;
            card.put("achievement_percentage", Math.min(100, Math.max(0, dAchievement)));

            // Latest report for this ASM
            List<SalesManagerReport> asmReports = reportRepository.findByAsmIdOrderBySubmittedAtDesc(asm.getId());
            card.put("reports_count", asmReports.size());
            card.put("has_submitted_report", !asmReports.isEmpty());
            card.put("latest_report", asmReports.isEmpty() ? null : asmReports.get(0));

            asmCards.add(card);
        }

        // 2. Division Aggregated Metrics
        Map<String, Object> divisionMetrics = calculateDivisionMetrics(rsm.getDivision());

        // 3. Product Demands in this Division
        List<Map<String, Object>> productDemands = getProductDemandsForDivision(rsm.getDivision());

        // 4. Reports Feed
        List<SalesManagerReport> reports = reportRepository.findByRsmIdOrderBySubmittedAtDesc(rsm.getId());

        Map<String, Object> res = new HashMap<>();
        res.put("success", true);
        res.put("rsm", rsm);
        res.put("summary", divisionMetrics);
        res.put("asms", asmCards);
        res.put("product_demands", productDemands);
        res.put("reports", reports);
        return ResponseEntity.ok(res);
    }

    // 4. Get All 64 Area Sales Managers (ASM)
    @GetMapping("/asm/all")
    public ResponseEntity<Map<String, Object>> getAllAsms() {
        List<Map<String, Object>> list = jdbcTemplate.queryForList(
                "SELECT asm.id, asm.code, asm.name, asm.email, asm.phone, asm.district_id, asm.district_name, asm.division, " +
                "asm.rsm_id, asm.target_sales, rsm.name AS rsm_name, rsm.code AS rsm_code " +
                "FROM area_sales_managers asm " +
                "JOIN regional_sales_managers rsm ON asm.rsm_id = rsm.id " +
                "ORDER BY asm.division, asm.district_name"
        );
        Map<String, Object> res = new HashMap<>();
        res.put("success", true);
        res.put("count", list.size());
        res.put("asms", list);
        return ResponseEntity.ok(res);
    }

    // 5. ASM Dashboard: Inspects district, cities, SOs of those cities, what SO does, profit/loss, and combined report
    @GetMapping("/asm/{asmId}/dashboard")
    public ResponseEntity<Map<String, Object>> getAsmDashboard(@PathVariable Long asmId) {
        Optional<AreaSalesManager> asmOpt = asmRepository.findById(asmId);
        if (asmOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        AreaSalesManager asm = asmOpt.get();
        RegionalSalesManager rsm = rsmRepository.findById(asm.getRsmId()).orElse(null);

        // District metrics
        Map<String, Object> summary = calculateDistrictMetrics(asm.getDistrictId());

        // Cities & territories in this district
        List<Map<String, Object>> cities = jdbcTemplate.queryForList(
                "SELECT DISTINCT city, COUNT(DISTINCT outlet_id) AS outlets_count " +
                "FROM outlets WHERE district_id = ? AND city IS NOT NULL AND TRIM(city) != '' " +
                "GROUP BY city",
                asm.getDistrictId()
        );
        if (cities.isEmpty()) {
            cities = jdbcTemplate.queryForList(
                    "SELECT DISTINCT city, COUNT(DISTINCT id) AS outlets_count " +
                    "FROM sales_officers WHERE district_id = ? AND city IS NOT NULL AND TRIM(city) != '' " +
                    "GROUP BY city",
                    asm.getDistrictId()
            );
        }
        if (cities.isEmpty()) {
            Map<String, Object> fallbackCity = new HashMap<>();
            fallbackCity.put("city", asm.getDistrictName() + " Sadar");
            fallbackCity.put("outlets_count", 0);
            cities = List.of(fallbackCity);
        }

        // Sales Officers of this district and their specific cities
        List<Map<String, Object>> soRows = jdbcTemplate.queryForList(
                "SELECT so.id, so.officer_code, so.name, so.email, so.phone, so.city, so.assigned_area, so.status, so.monthly_target, " +
                "COUNT(DISTINCT o.outlet_id) AS outlet_count, " +
                "COUNT(DISTINCT psr.id) AS psr_count " +
                "FROM sales_officers so " +
                "LEFT JOIN outlets o ON (o.district_id = so.district_id AND (o.area = so.assigned_area OR o.city = so.city)) " +
                "LEFT JOIN pre_sales_officers psr ON psr.sales_officer_id = so.id " +
                "WHERE so.district_id = ? OR so.asm_id = ? " +
                "GROUP BY so.id, so.officer_code, so.name, so.email, so.phone, so.city, so.assigned_area, so.status, so.monthly_target",
                asm.getDistrictId(), asm.getId()
        );

        List<Map<String, Object>> salesOfficers = new ArrayList<>();
        for (Map<String, Object> so : soRows) {
            Long soId = ((Number) so.get("id")).longValue();
            Map<String, Object> soMap = new HashMap<>(so);

            // Calculate SO Sales, Revenue, Profit & Loss
            Map<String, Object> soPerformance = calculateSoPerformance(soId);
            soMap.putAll(soPerformance);

            salesOfficers.add(soMap);
        }

        // SO Live Activity Stream: Whatever the SO does (stock requests, deliveries, outlet orders)
        List<Map<String, Object>> soActivities = getSoActivitiesForDistrict(asm.getDistrictId());

        // Product Demands in this District
        List<Map<String, Object>> productDemands = getProductDemandsForDistrict(asm.getDistrictId());

        // Previous reports submitted by this ASM to RSM
        List<SalesManagerReport> reports = reportRepository.findByAsmIdOrderBySubmittedAtDesc(asm.getId());

        Map<String, Object> res = new HashMap<>();
        res.put("success", true);
        res.put("asm", asm);
        res.put("rsm", rsm);
        res.put("summary", summary);
        res.put("cities", cities);
        res.put("sales_officers", salesOfficers);
        res.put("so_activities", soActivities);
        res.put("product_demands", productDemands);
        res.put("reports", reports);
        return ResponseEntity.ok(res);
    }

    // 6. Submit Combined Report from ASM to RSM
    @PostMapping("/asm/{asmId}/submit-report")
    public ResponseEntity<Map<String, Object>> submitAsmReport(
            @PathVariable Long asmId,
            @RequestBody(required = false) Map<String, Object> payload) {

        Optional<AreaSalesManager> asmOpt = asmRepository.findById(asmId);
        if (asmOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        AreaSalesManager asm = asmOpt.get();

        String notes = payload != null && payload.containsKey("notes") && payload.get("notes") != null
                ? payload.get("notes").toString().trim() : "Routine consolidated district performance report.";
        String period = payload != null && payload.containsKey("period") && payload.get("period") != null
                ? payload.get("period").toString().trim() : LocalDateTime.now().format(DateTimeFormatter.ofPattern("MMMM yyyy"));

        // Compile live metrics
        Map<String, Object> dMetrics = calculateDistrictMetrics(asm.getDistrictId());
        List<Map<String, Object>> productDemands = getProductDemandsForDistrict(asm.getDistrictId());
        List<Map<String, Object>> soActivities = getSoActivitiesForDistrict(asm.getDistrictId());

        SalesManagerReport report = new SalesManagerReport();
        report.setReportType("ASM_TO_RSM");
        report.setAsmId(asm.getId());
        report.setRsmId(asm.getRsmId());
        report.setDistrictId(asm.getDistrictId());
        report.setDistrictName(asm.getDistrictName());
        report.setDivision(asm.getDivision());
        report.setReportingPeriod(period);
        report.setTotalSalesCases((Integer) dMetrics.getOrDefault("total_sales_cases", 0));
        report.setTotalRevenue((BigDecimal) dMetrics.getOrDefault("total_revenue", BigDecimal.ZERO));
        report.setOverallProfit((BigDecimal) dMetrics.getOrDefault("overall_profit", BigDecimal.ZERO));
        report.setOverallLoss((BigDecimal) dMetrics.getOrDefault("overall_loss", BigDecimal.ZERO));
        report.setSoCount((Integer) dMetrics.getOrDefault("total_sos", 0));
        report.setActiveOrdersCount((Integer) dMetrics.getOrDefault("active_orders_count", 0));
        report.setNotes(notes);
        report.setStatus("SUBMITTED");
        report.setSubmittedAt(LocalDateTime.now());

        try {
            report.setProductDemandsJson(objectMapper.writeValueAsString(productDemands));
            report.setSoActivitiesJson(objectMapper.writeValueAsString(soActivities));
        } catch (Exception ignored) {}

        SalesManagerReport saved = reportRepository.save(report);

        // Send In-App notification to RSM
        try {
            jdbcTemplate.update(
                    "INSERT INTO app_notifications (recipient_type, recipient_id, title, message, notification_type, action_link, created_at, is_read) " +
                    "VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                    "RSM", asm.getRsmId(),
                    "New District Report from " + asm.getDistrictName(),
                    "ASM " + asm.getName() + " submitted consolidated report: " + saved.getTotalSalesCases() + " cases sold, ৳" + saved.getTotalRevenue() + " revenue, ৳" + saved.getOverallProfit() + " profit.",
                    "ASM_REPORT",
                    "/rsm?tab=reports&reportId=" + saved.getId(),
                    LocalDateTime.now(),
                    false
            );
        } catch (Exception ignored) {}

        Map<String, Object> res = new HashMap<>();
        res.put("success", true);
        res.put("message", "Combined district report successfully transmitted to RSM (" + asm.getDivision() + ").");
        res.put("report", saved);
        return ResponseEntity.ok(res);
    }

    // =========================================================================
    // HELPER METHODS: Financial Calculations, Product Demands & SO Activities
    // =========================================================================

    private Map<String, Object> calculateDistrictMetrics(Long districtId) {
        Map<String, Object> m = new HashMap<>();

        // 1. Sales from SO distributions in this district
        Integer distCases = jdbcTemplate.queryForObject(
                "SELECT COALESCE(SUM(sod.quantity), 0) " +
                "FROM sales_officer_distributions sod " +
                "JOIN sales_officers so ON sod.sales_officer_id = so.id " +
                "WHERE so.district_id = ?",
                Integer.class, districtId
        );

        // 2. Sales from PSR orders in this district
        Integer psrCases = jdbcTemplate.queryForObject(
                "SELECT COALESCE(SUM(po.quantity), 0) " +
                "FROM psr_orders po " +
                "JOIN sales_officers so ON po.sales_officer_id = so.id " +
                "WHERE so.district_id = ? AND po.status != 'CANCELLED'",
                Integer.class, districtId
        );

        // 3. Outlet requisitions in this district
        Integer reqCases = jdbcTemplate.queryForObject(
                "SELECT COALESCE(SUM(oreq.quantity), 0) FROM outlet_requisitions oreq " +
                "LEFT JOIN sales_officers so ON oreq.sales_officer_id = so.id " +
                "LEFT JOIN outlets o ON oreq.outlet_id = o.outlet_id " +
                "WHERE (so.district_id = ? OR o.district_id = ?) AND oreq.status IN ('DISPATCHED', 'FULFILLED', 'DELIVERED')",
                Integer.class, districtId, districtId
        );

        int totalCases = Math.max(distCases != null ? distCases : 0, Math.max(psrCases != null ? psrCases : 0, reqCases != null ? reqCases : 0));

        // Total Revenue (Wholesale price to outlets)
        BigDecimal distRev = jdbcTemplate.queryForObject(
                "SELECT COALESCE(SUM(sod.total_revenue), 0.00) " +
                "FROM sales_officer_distributions sod " +
                "JOIN sales_officers so ON sod.sales_officer_id = so.id " +
                "WHERE so.district_id = ?",
                BigDecimal.class, districtId
        );

        BigDecimal psrRev = jdbcTemplate.queryForObject(
                "SELECT COALESCE(SUM(po.total_amount), 0.00) " +
                "FROM psr_orders po " +
                "JOIN sales_officers so ON po.sales_officer_id = so.id " +
                "WHERE so.district_id = ? AND po.status != 'CANCELLED'",
                BigDecimal.class, districtId
        );

        BigDecimal totalRevenue = (distRev != null && distRev.compareTo(BigDecimal.ZERO) > 0) ? distRev
                : (psrRev != null ? psrRev : BigDecimal.ZERO);

        // Profit: Wholesale margin earned (e.g. from distributions or 12% wholesale margin)
        BigDecimal distProfit = jdbcTemplate.queryForObject(
                "SELECT COALESCE(SUM(sod.profit_earned), 0.00) " +
                "FROM sales_officer_distributions sod " +
                "JOIN sales_officers so ON sod.sales_officer_id = so.id " +
                "WHERE so.district_id = ?",
                BigDecimal.class, districtId
        );

        BigDecimal overallProfit = (distProfit != null && distProfit.compareTo(BigDecimal.ZERO) > 0)
                ? distProfit : totalRevenue.multiply(new BigDecimal("0.12")).setScale(2, RoundingMode.HALF_UP);

        // Loss: Returns, damages, refunds in this district
        BigDecimal refundLoss = jdbcTemplate.queryForObject(
                "SELECT COALESCE(SUM(prr.refund_amount), 0.00) " +
                "FROM psr_refund_requests prr " +
                "JOIN sales_officers so ON prr.sales_officer_id = so.id " +
                "WHERE so.district_id = ? AND prr.status IN ('APPROVED', 'SETTLED')",
                BigDecimal.class, districtId
        );
        BigDecimal returnLoss = jdbcTemplate.queryForObject(
                "SELECT COALESCE(SUM(refund_amount), 0.00) " +
                "FROM stock_return_requests " +
                "WHERE district_id = ? AND status IN ('APPROVED', 'SETTLED', 'COMPLETED')",
                BigDecimal.class, districtId
        );
        BigDecimal overallLoss = (refundLoss != null ? refundLoss : BigDecimal.ZERO)
                .add(returnLoss != null ? returnLoss : BigDecimal.ZERO);

        // Counts
        Integer soCount = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM sales_officers WHERE district_id = ?",
                Integer.class, districtId
        );
        Integer outletsCount = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM outlets WHERE district_id = ?",
                Integer.class, districtId
        );
        Integer activeOrders = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM psr_orders po " +
                "JOIN sales_officers so ON po.sales_officer_id = so.id " +
                "WHERE so.district_id = ? AND po.status IN ('PENDING', 'APPROVED', 'DISPATCHED')",
                Integer.class, districtId
        );

        // Total product demand cases requested (including pending & dispatched)
        Integer totalDemands = jdbcTemplate.queryForObject(
                "SELECT COALESCE(SUM(oreq.quantity), 0) FROM outlet_requisitions oreq " +
                "LEFT JOIN sales_officers so ON oreq.sales_officer_id = so.id " +
                "LEFT JOIN outlets o ON oreq.outlet_id = o.outlet_id " +
                "WHERE (so.district_id = ? OR o.district_id = ?)",
                Integer.class, districtId, districtId
        );
        if (totalDemands == null || totalDemands == 0) {
            totalDemands = totalCases;
        }

        m.put("total_sales_cases", totalCases);
        m.put("total_revenue", totalRevenue);
        m.put("overall_profit", overallProfit);
        m.put("overall_loss", overallLoss);
        m.put("total_sos", soCount != null ? soCount : 0);
        m.put("total_outlets", outletsCount != null ? outletsCount : 0);
        m.put("active_orders_count", activeOrders != null ? activeOrders : 0);
        m.put("total_product_demands_cases", totalDemands);
        return m;
    }

    private Map<String, Object> calculateDivisionMetrics(String division) {
        Map<String, Object> m = new HashMap<>();

        // Aggregate across all districts in this division
        Integer totalCases = jdbcTemplate.queryForObject(
                "SELECT COALESCE(SUM(sod.quantity), 0) " +
                "FROM sales_officer_distributions sod " +
                "JOIN sales_officers so ON sod.sales_officer_id = so.id " +
                "JOIN districts d ON so.district_id = d.id " +
                "WHERE LOWER(d.division) = LOWER(?)",
                Integer.class, division
        );

        Integer psrCases = jdbcTemplate.queryForObject(
                "SELECT COALESCE(SUM(po.quantity), 0) " +
                "FROM psr_orders po " +
                "JOIN sales_officers so ON po.sales_officer_id = so.id " +
                "JOIN districts d ON so.district_id = d.id " +
                "WHERE LOWER(d.division) = LOWER(?) AND po.status != 'CANCELLED'",
                Integer.class, division
        );

        Integer reqCases = jdbcTemplate.queryForObject(
                "SELECT COALESCE(SUM(oreq.quantity), 0) " +
                "FROM outlet_requisitions oreq " +
                "LEFT JOIN sales_officers so ON oreq.sales_officer_id = so.id " +
                "LEFT JOIN outlets o ON oreq.outlet_id = o.outlet_id " +
                "JOIN districts d ON (so.district_id = d.id OR o.district_id = d.id) " +
                "WHERE LOWER(d.division) = LOWER(?) AND oreq.status IN ('DISPATCHED', 'FULFILLED', 'DELIVERED')",
                Integer.class, division
        );

        int cases = Math.max(totalCases != null ? totalCases : 0, Math.max(psrCases != null ? psrCases : 0, reqCases != null ? reqCases : 0));

        BigDecimal totalRev = jdbcTemplate.queryForObject(
                "SELECT COALESCE(SUM(po.total_amount), 0.00) " +
                "FROM psr_orders po " +
                "JOIN sales_officers so ON po.sales_officer_id = so.id " +
                "JOIN districts d ON so.district_id = d.id " +
                "WHERE LOWER(d.division) = LOWER(?) AND po.status != 'CANCELLED'",
                BigDecimal.class, division
        );

        BigDecimal sodRev = jdbcTemplate.queryForObject(
                "SELECT COALESCE(SUM(sod.total_revenue), 0.00) " +
                "FROM sales_officer_distributions sod " +
                "JOIN sales_officers so ON sod.sales_officer_id = so.id " +
                "JOIN districts d ON so.district_id = d.id " +
                "WHERE LOWER(d.division) = LOWER(?)",
                BigDecimal.class, division
        );

        BigDecimal revenue = (sodRev != null && sodRev.compareTo(BigDecimal.ZERO) > 0) ? sodRev
                : (totalRev != null ? totalRev : BigDecimal.ZERO);

        BigDecimal sodProfit = jdbcTemplate.queryForObject(
                "SELECT COALESCE(SUM(sod.profit_earned), 0.00) " +
                "FROM sales_officer_distributions sod " +
                "JOIN sales_officers so ON sod.sales_officer_id = so.id " +
                "JOIN districts d ON so.district_id = d.id " +
                "WHERE LOWER(d.division) = LOWER(?)",
                BigDecimal.class, division
        );

        BigDecimal profit = (sodProfit != null && sodProfit.compareTo(BigDecimal.ZERO) > 0)
                ? sodProfit : revenue.multiply(new BigDecimal("0.12")).setScale(2, RoundingMode.HALF_UP);

        BigDecimal refundLoss = jdbcTemplate.queryForObject(
                "SELECT COALESCE(SUM(prr.refund_amount), 0.00) " +
                "FROM psr_refund_requests prr " +
                "JOIN sales_officers so ON prr.sales_officer_id = so.id " +
                "JOIN districts d ON so.district_id = d.id " +
                "WHERE LOWER(d.division) = LOWER(?) AND prr.status IN ('APPROVED', 'SETTLED')",
                BigDecimal.class, division
        );
        BigDecimal loss = refundLoss != null ? refundLoss : BigDecimal.ZERO;

        Integer soCount = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM sales_officers so " +
                "JOIN districts d ON so.district_id = d.id " +
                "WHERE LOWER(d.division) = LOWER(?)",
                Integer.class, division
        );

        Integer outletCount = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM outlets o " +
                "JOIN districts d ON o.district_id = d.id " +
                "WHERE LOWER(d.division) = LOWER(?)",
                Integer.class, division
        );

        Integer totalDemands = jdbcTemplate.queryForObject(
                "SELECT COALESCE(SUM(oreq.quantity), 0) " +
                "FROM outlet_requisitions oreq " +
                "LEFT JOIN sales_officers so ON oreq.sales_officer_id = so.id " +
                "LEFT JOIN outlets o ON oreq.outlet_id = o.outlet_id " +
                "JOIN districts d ON (so.district_id = d.id OR o.district_id = d.id) " +
                "WHERE LOWER(d.division) = LOWER(?)",
                Integer.class, division
        );
        if (totalDemands == null || totalDemands == 0) totalDemands = cases;

        m.put("total_sales_cases", cases);
        m.put("total_revenue", revenue);
        m.put("overall_profit", profit);
        m.put("overall_loss", loss);
        m.put("total_sos", soCount != null ? soCount : 0);
        m.put("total_outlets", outletCount != null ? outletCount : 0);
        m.put("total_product_demands_cases", totalDemands);
        return m;
    }

    private Map<String, Object> calculateSoPerformance(Long soId) {
        Map<String, Object> m = new HashMap<>();

        Integer purchasedCases = jdbcTemplate.queryForObject(
                "SELECT COALESCE(SUM(quantity), 0) FROM outlet_requisitions WHERE sales_officer_id = ? AND (requisition_code LIKE 'SO-REQ-%' OR outlet_id IS NULL)",
                Integer.class, soId
        );
        Integer outletChanneledCases = jdbcTemplate.queryForObject(
                "SELECT COALESCE(SUM(quantity), 0) FROM outlet_requisitions WHERE sales_officer_id = ? AND requisition_code NOT LIKE 'SO-REQ-%' AND outlet_id IS NOT NULL",
                Integer.class, soId
        );

        Integer psrCases = jdbcTemplate.queryForObject(
                "SELECT COALESCE(SUM(quantity), 0) FROM psr_orders WHERE sales_officer_id = ? AND status != 'CANCELLED'",
                Integer.class, soId
        );
        BigDecimal psrRevenue = jdbcTemplate.queryForObject(
                "SELECT COALESCE(SUM(total_amount), 0.00) FROM psr_orders WHERE sales_officer_id = ? AND status != 'CANCELLED'",
                BigDecimal.class, soId
        );

        BigDecimal sodRevenue = jdbcTemplate.queryForObject(
                "SELECT COALESCE(SUM(total_revenue), 0.00) FROM sales_officer_distributions WHERE sales_officer_id = ?",
                BigDecimal.class, soId
        );
        BigDecimal sodProfit = jdbcTemplate.queryForObject(
                "SELECT COALESCE(SUM(profit_earned), 0.00) FROM sales_officer_distributions WHERE sales_officer_id = ?",
                BigDecimal.class, soId
        );

        BigDecimal revenue = (sodRevenue != null && sodRevenue.compareTo(BigDecimal.ZERO) > 0) ? sodRevenue
                : (psrRevenue != null ? psrRevenue : BigDecimal.ZERO);
        BigDecimal profit = (sodProfit != null && sodProfit.compareTo(BigDecimal.ZERO) > 0)
                ? sodProfit : revenue.multiply(new BigDecimal("0.12")).setScale(2, RoundingMode.HALF_UP);

        BigDecimal refunds = jdbcTemplate.queryForObject(
                "SELECT COALESCE(SUM(refund_amount), 0.00) FROM psr_refund_requests WHERE sales_officer_id = ? AND status IN ('APPROVED', 'SETTLED')",
                BigDecimal.class, soId
        );

        m.put("total_purchased_cases", purchasedCases != null ? purchasedCases : 0);
        m.put("outlet_channeled_cases", outletChanneledCases != null ? outletChanneledCases : 0);
        m.put("sales_cases", psrCases != null ? psrCases : 0);
        m.put("sales_revenue", revenue);
        m.put("profit_earned", profit);
        m.put("loss_amount", refunds != null ? refunds : BigDecimal.ZERO);
        return m;
    }

    private List<Map<String, Object>> getSoActivitiesForDistrict(Long districtId) {
        List<Map<String, Object>> activities = new ArrayList<>();

        // 1. Stock Requests & Dispatches from SO
        List<Map<String, Object>> reqs = jdbcTemplate.queryForList(
                "SELECT 'SO_REQUISITION' AS activity_type, r.id, r.requisition_code AS code, r.quantity, r.status, " +
                "r.created_date AS activity_time, (CASE WHEN r.requisition_code LIKE 'SO-REQ-%' OR r.outlet_id IS NULL THEN true ELSE false END) AS is_so_purchase, " +
                "CONCAT(p.brand, ' ', p.flavor_variant) AS product_name, p.brand, p.category, so.name AS so_name, so.assigned_area, so.city " +
                "FROM outlet_requisitions r " +
                "JOIN sales_officers so ON r.sales_officer_id = so.id " +
                "LEFT JOIN products p ON r.product_id = p.product_id " +
                "WHERE so.district_id = ? " +
                "ORDER BY r.created_date DESC LIMIT 15",
                districtId
        );
        activities.addAll(reqs);

        // 2. Field Orders booked by PSR under SO
        List<Map<String, Object>> psrOrders = jdbcTemplate.queryForList(
                "SELECT 'OUTLET_FIELD_ORDER' AS activity_type, po.id, po.order_code AS code, po.quantity, po.status, " +
                "po.created_at AS activity_time, false AS is_so_purchase, " +
                "CONCAT(p.brand, ' ', p.flavor_variant) AS product_name, p.brand, p.category, so.name AS so_name, so.assigned_area, so.city " +
                "FROM psr_orders po " +
                "JOIN sales_officers so ON po.sales_officer_id = so.id " +
                "LEFT JOIN products p ON po.product_id = p.product_id " +
                "WHERE so.district_id = ? " +
                "ORDER BY po.created_at DESC LIMIT 15",
                districtId
        );
        activities.addAll(psrOrders);

        // Sort by activity_time desc
        activities.sort((a, b) -> {
            Object t1 = a.get("activity_time");
            Object t2 = b.get("activity_time");
            if (t1 == null || t2 == null) return 0;
            return t2.toString().compareTo(t1.toString());
        });

        if (activities.size() > 20) {
            return activities.subList(0, 20);
        }
        return activities;
    }

    private List<Map<String, Object>> getProductDemandsForDistrict(Long districtId) {
        return jdbcTemplate.queryForList(
                "SELECT p.product_id, CONCAT(p.brand, ' ', p.flavor_variant) AS product_name, p.brand, p.category, p.sku, " +
                "COALESCE(SUM(req.quantity), 0) AS total_cases_demanded, " +
                "COALESCE(SUM(req.quantity * p.outlet_price), 0.00) AS total_demand_value " +
                "FROM products p " +
                "LEFT JOIN ( " +
                "  SELECT oreq.product_id, oreq.quantity FROM outlet_requisitions oreq " +
                "  LEFT JOIN sales_officers so ON oreq.sales_officer_id = so.id " +
                "  LEFT JOIN outlets o ON oreq.outlet_id = o.outlet_id " +
                "  WHERE so.district_id = ? OR o.district_id = ? " +
                ") req ON p.product_id = req.product_id " +
                "GROUP BY p.product_id, p.brand, p.flavor_variant, p.category, p.sku, p.outlet_price " +
                "ORDER BY total_cases_demanded DESC, p.brand ASC",
                districtId, districtId
        );
    }

    private List<Map<String, Object>> getProductDemandsForDivision(String division) {
        return jdbcTemplate.queryForList(
                "SELECT p.product_id, CONCAT(p.brand, ' ', p.flavor_variant) AS product_name, p.brand, p.category, p.sku, " +
                "COALESCE(SUM(req.quantity), 0) AS total_cases_demanded, " +
                "COALESCE(SUM(req.quantity * p.outlet_price), 0.00) AS total_demand_value " +
                "FROM products p " +
                "LEFT JOIN ( " +
                "  SELECT oreq.product_id, oreq.quantity FROM outlet_requisitions oreq " +
                "  LEFT JOIN sales_officers so ON oreq.sales_officer_id = so.id " +
                "  LEFT JOIN outlets o ON oreq.outlet_id = o.outlet_id " +
                "  JOIN districts d ON (so.district_id = d.id OR o.district_id = d.id) " +
                "  WHERE LOWER(d.division) = LOWER(?) " +
                ") req ON p.product_id = req.product_id " +
                "GROUP BY p.product_id, p.brand, p.flavor_variant, p.category, p.sku, p.outlet_price " +
                "ORDER BY total_cases_demanded DESC, p.brand ASC",
                division
        );
    }
}
