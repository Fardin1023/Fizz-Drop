package com.fizzdrop.controller;

import com.fizzdrop.entity.*;
import com.fizzdrop.repository.*;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private final ProductRepository productRepository;
    private final OutletRepository outletRepository;
    private final ShopInventoryRepository inventoryRepository;
    private final SupplierProfileRepository supplierProfileRepository;
    private final SupplierTransactionRepository transactionRepository;
    private final CentralInventoryRepository centralInventoryRepository;
    private final DistrictInventoryRepository districtInventoryRepository;
    private final DistrictRepository districtRepository;
    private final SalesOfficerRepository salesOfficerRepository;
    private final PreSalesOfficerRepository preSalesOfficerRepository;
    private final JdbcTemplate jdbcTemplate;

    public AdminController(ProductRepository productRepository,
                           OutletRepository outletRepository,
                           ShopInventoryRepository inventoryRepository,
                           SupplierProfileRepository supplierProfileRepository,
                           SupplierTransactionRepository transactionRepository,
                           CentralInventoryRepository centralInventoryRepository,
                           DistrictInventoryRepository districtInventoryRepository,
                           DistrictRepository districtRepository,
                           SalesOfficerRepository salesOfficerRepository,
                           PreSalesOfficerRepository preSalesOfficerRepository,
                           JdbcTemplate jdbcTemplate) {
        this.productRepository = productRepository;
        this.outletRepository = outletRepository;
        this.inventoryRepository = inventoryRepository;
        this.supplierProfileRepository = supplierProfileRepository;
        this.transactionRepository = transactionRepository;
        this.centralInventoryRepository = centralInventoryRepository;
        this.districtInventoryRepository = districtInventoryRepository;
        this.districtRepository = districtRepository;
        this.salesOfficerRepository = salesOfficerRepository;
        this.preSalesOfficerRepository = preSalesOfficerRepository;
        this.jdbcTemplate = jdbcTemplate;
    }

    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> getAdminStats() {
        Map<String, Object> stats = new HashMap<>();
        long totalProducts = productRepository.count();
        long totalBranches = outletRepository.count();

        // Calculate low stock items (< 20)
        long lowStockCount = productRepository.findAll().stream()
                .filter(p -> {
                    Integer stock = inventoryRepository.getTotalStockByProductId(p.getProductId());
                    return stock == null || stock < 20;
                })
                .count();

        stats.put("totalProducts", totalProducts);
        stats.put("totalBranches", totalBranches);
        stats.put("lowStockCount", lowStockCount);
        stats.put("pendingRestocks", 0);

        Map<String, Object> dbStatus = new HashMap<>();
        dbStatus.put("connected", true);
        dbStatus.put("engine", "Relational Database Engine");
        stats.put("dbStatus", dbStatus);

        return ResponseEntity.ok(stats);
    }

    /**
     * Comprehensive Commercial, Stock, Pricing & Profit Logs for Superadmin
     * Supports filtering by Supplier, Sales Officer, PSR, Outlet, Product, and Date Range.
     */
    @GetMapping("/commercial-logs")
    public ResponseEntity<Map<String, Object>> getCommercialLogs(
            @RequestParam(required = false) Long supplierId,
            @RequestParam(required = false) Long salesOfficerId,
            @RequestParam(required = false) Long psrId,
            @RequestParam(required = false) Long outletId,
            @RequestParam(required = false) Long productId,
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate
    ) {
        List<Product> allProducts = productRepository.findAll();
        List<Outlet> allOutlets = outletRepository.findAll();
        List<SupplierProfile> allSuppliers = supplierProfileRepository.findAll();
        List<SalesOfficer> allSalesOfficers = salesOfficerRepository.findAll();
        List<PreSalesOfficer> allPsrs = preSalesOfficerRepository.findAll();

        // Map outlets to suppliers based on covered_district_ids
        Map<Long, Long> outletToSupplierMap = new HashMap<>();
        Map<Long, String> outletToSupplierNameMap = new HashMap<>();

        for (Outlet o : allOutlets) {
            Long oDistId = o.getDistrictId() != null ? o.getDistrictId() : 1L;
            SupplierProfile matchedSupplier = null;

            for (SupplierProfile sp : allSuppliers) {
                if (sp.getCoveredDistrictIds() != null) {
                    List<String> distIds = Arrays.asList(sp.getCoveredDistrictIds().split(","));
                    if (distIds.contains(String.valueOf(oDistId))) {
                        matchedSupplier = sp;
                        break;
                    }
                }
                if (matchedSupplier == null && sp.getPrimaryDistrictId() != null && sp.getPrimaryDistrictId().equals(oDistId)) {
                    matchedSupplier = sp;
                    break;
                }
            }

            // Fallback by division/city if not mapped by district ID
            if (matchedSupplier == null && o.getCity() != null) {
                for (SupplierProfile sp : allSuppliers) {
                    if (sp.getDivisionName() != null && sp.getDivisionName().equalsIgnoreCase(o.getCity())) {
                        matchedSupplier = sp;
                        break;
                    }
                }
            }

            if (matchedSupplier != null) {
                outletToSupplierMap.put(o.getOutletId(), matchedSupplier.getId());
                outletToSupplierNameMap.put(o.getOutletId(), matchedSupplier.getBusinessName());
            } else if (!allSuppliers.isEmpty()) {
                // Default fallback to first active supplier
                outletToSupplierMap.put(o.getOutletId(), allSuppliers.get(0).getId());
                outletToSupplierNameMap.put(o.getOutletId(), allSuppliers.get(0).getBusinessName());
            }
        }

        // 1b. Build Enriched PSR list with product sales breakdown
        List<Map<String, Object>> enrichedPsrs = new ArrayList<>();
        int grandPsrCasesSold = 0;
        double grandPsrRevenue = 0.0;

        for (PreSalesOfficer psr : allPsrs) {
            Map<String, Object> psrMap = new HashMap<>();
            psrMap.put("id", psr.getId());
            psrMap.put("psr_code", psr.getPsrCode());
            psrMap.put("name", psr.getName());
            psrMap.put("phone", psr.getPhone());
            psrMap.put("email", psr.getEmail());
            psrMap.put("sales_officer_id", psr.getSalesOfficerId());
            psrMap.put("sub_route", psr.getSubRoute());
            psrMap.put("assigned_area", psr.getAssignedArea());
            psrMap.put("status", psr.getStatus());
            psrMap.put("target_cases", psr.getTargetCases() != null ? psr.getTargetCases() : 0);
            psrMap.put("target_sku_ounces", psr.getTargetSkuOunces());
            psrMap.put("target_product_id", psr.getTargetProductId());
            psrMap.put("target_notes", psr.getTargetNotes());

            SalesOfficer so = allSalesOfficers.stream()
                    .filter(s -> s.getId().equals(psr.getSalesOfficerId()))
                    .findFirst()
                    .orElse(null);
            psrMap.put("sales_officer_name", so != null ? so.getName() : "Unassigned");
            psrMap.put("sales_officer_code", so != null ? so.getOfficerCode() : "N/A");
            Long supId = so != null ? so.getSupplierId() : 1L;
            psrMap.put("supplier_id", supId);
            SupplierProfile sp = allSuppliers.stream().filter(s -> s.getId().equals(supId)).findFirst().orElse(null);
            psrMap.put("supplier_name", sp != null ? sp.getBusinessName() : "Regional Supplier Hub");

            // Assigned Outlets
            List<Map<String, Object>> assignedShops = allOutlets.stream()
                    .filter(o -> Objects.equals(o.getAssignedPsrId(), psr.getId()))
                    .map(o -> {
                        Map<String, Object> sm = new HashMap<>();
                        sm.put("outlet_id", o.getOutletId());
                        sm.put("outlet_name", o.getOutletName());
                        sm.put("branch_name", o.getBranchName());
                        sm.put("franchise_name", o.getFranchiseName());
                        sm.put("city", o.getCity());
                        sm.put("sub_route", o.getSubRoute());
                        return sm;
                    }).collect(Collectors.toList());
            psrMap.put("assigned_outlets", assignedShops);
            psrMap.put("assigned_outlets_count", assignedShops.size());

            // Query product sales by this PSR from psr_orders
            StringBuilder psrSalesSql = new StringBuilder(
                "SELECT po.product_id, po.product_name, " +
                "  COALESCE(SUM(po.quantity), 0) AS total_cases_sold, " +
                "  COALESCE(SUM(po.total_amount), 0.0) AS total_amount, " +
                "  COUNT(*) AS orders_count " +
                "FROM psr_orders po " +
                "WHERE po.psr_id = ? AND po.status != 'CANCELLED'"
            );
            List<Object> pspParams = new ArrayList<>();
            pspParams.add(psr.getId());
            if (productId != null) {
                psrSalesSql.append(" AND po.product_id = ?");
                pspParams.add(productId);
            }
            if (outletId != null) {
                psrSalesSql.append(" AND po.outlet_id = ?");
                pspParams.add(outletId);
            }
            if (startDate != null && !startDate.trim().isEmpty()) {
                psrSalesSql.append(" AND DATE(po.created_at) >= ?");
                pspParams.add(startDate.trim());
            }
            if (endDate != null && !endDate.trim().isEmpty()) {
                psrSalesSql.append(" AND DATE(po.created_at) <= ?");
                pspParams.add(endDate.trim());
            }
            psrSalesSql.append(" GROUP BY po.product_id, po.product_name ORDER BY total_cases_sold DESC");

            List<Map<String, Object>> productSales = new ArrayList<>();
            int totalCases = 0;
            double totalRev = 0.0;
            int totalOrders = 0;
            try {
                productSales = jdbcTemplate.queryForList(psrSalesSql.toString(), pspParams.toArray());
                for (Map<String, Object> psRow : productSales) {
                    totalCases += ((Number) psRow.getOrDefault("total_cases_sold", 0)).intValue();
                    totalRev += ((Number) psRow.getOrDefault("total_amount", 0.0)).doubleValue();
                    totalOrders += ((Number) psRow.getOrDefault("orders_count", 0)).intValue();
                }
            } catch (Exception ignored) {}

            psrMap.put("product_sales", productSales);
            psrMap.put("total_cases_sold", totalCases);
            psrMap.put("total_revenue", totalRev);
            psrMap.put("total_orders_count", totalOrders);

            // Calculate achieved target cases
            int achieved = 0;
            if (psr.getTargetProductId() != null && psr.getTargetProductId() > 0) {
                for (Map<String, Object> ps : productSales) {
                    if (Objects.equals(ps.get("product_id"), psr.getTargetProductId())) {
                        achieved = ((Number) ps.getOrDefault("total_cases_sold", 0)).intValue();
                        break;
                    }
                }
            } else {
                achieved = totalCases;
            }
            psrMap.put("achieved_cases", achieved);
            int targetCases = psr.getTargetCases() != null ? psr.getTargetCases() : 0;
            double progressPct = targetCases > 0 ? Math.min(100.0, Math.round((achieved * 100.0 / targetCases) * 10.0) / 10.0) : 0.0;
            psrMap.put("target_progress_pct", progressPct);

            enrichedPsrs.add(psrMap);
            grandPsrCasesSold += totalCases;
            grandPsrRevenue += totalRev;
        }

        // 1c. Build Enriched Sales Officers list
        List<Map<String, Object>> enrichedSalesOfficers = new ArrayList<>();
        for (SalesOfficer so : allSalesOfficers) {
            Map<String, Object> soMap = new HashMap<>();
            soMap.put("id", so.getId());
            soMap.put("officer_code", so.getOfficerCode());
            soMap.put("name", so.getName());
            soMap.put("phone", so.getPhone());
            soMap.put("email", so.getEmail());
            soMap.put("supplier_id", so.getSupplierId());
            SupplierProfile sp = allSuppliers.stream().filter(s -> s.getId().equals(so.getSupplierId())).findFirst().orElse(null);
            soMap.put("supplier_name", sp != null ? sp.getBusinessName() : "Regional Supplier Hub");
            soMap.put("district_id", so.getDistrictId());
            soMap.put("city", so.getCity());
            soMap.put("assigned_area", so.getAssignedArea());
            soMap.put("status", so.getStatus());
            soMap.put("monthly_target", so.getMonthlyTarget());

            // PSRs under this Sales Officer
            List<Map<String, Object>> soPsrs = enrichedPsrs.stream()
                    .filter(p -> Objects.equals(p.get("sales_officer_id"), so.getId()))
                    .collect(Collectors.toList());
            soMap.put("psrs", soPsrs);
            soMap.put("psr_count", soPsrs.size());

            int soCasesSold = soPsrs.stream().mapToInt(p -> ((Number) p.getOrDefault("total_cases_sold", 0)).intValue()).sum();
            double soRev = soPsrs.stream().mapToDouble(p -> ((Number) p.getOrDefault("total_revenue", 0.0)).doubleValue()).sum();
            int soOrders = soPsrs.stream().mapToInt(p -> ((Number) p.getOrDefault("total_orders_count", 0)).intValue()).sum();
            soMap.put("total_cases_sold", soCasesSold);
            soMap.put("total_revenue", soRev);
            soMap.put("total_orders_count", soOrders);

            // Outlets under this SO's area or assigned to this SO's PSRs
            Set<Long> soPsrIdSet = soPsrs.stream().map(p -> ((Number) p.get("id")).longValue()).collect(Collectors.toSet());
            List<Outlet> soOutlets = allOutlets.stream().filter(o -> {
                if (o.getAssignedPsrId() != null && soPsrIdSet.contains(o.getAssignedPsrId())) return true;
                if (so.getAssignedArea() != null && o.getArea() != null && o.getArea().equalsIgnoreCase(so.getAssignedArea())) return true;
                return false;
            }).collect(Collectors.toList());
            soMap.put("outlets_count", soOutlets.size());

            enrichedSalesOfficers.add(soMap);
        }

        // 1. Build Suppliers list with their designated Outlets, SOs and PSRs
        List<Map<String, Object>> supplierList = new ArrayList<>();
        for (SupplierProfile sp : allSuppliers) {
            Map<String, Object> sMap = new HashMap<>();
            sMap.put("supplier_id", sp.getId());
            sMap.put("supplier_name", sp.getBusinessName());
            sMap.put("business_name", sp.getBusinessName());
            sMap.put("division_name", sp.getDivisionName());
            sMap.put("phone_number", sp.getPhoneNumber());
            sMap.put("wallet_balance", sp.getWalletBalance() != null ? sp.getWalletBalance() : java.math.BigDecimal.ZERO);
            sMap.put("depot_address", sp.getDepotAddress());
            sMap.put("trade_license_number", sp.getTradeLicenseNumber());
            sMap.put("bank_name", sp.getBankName());
            sMap.put("bank_account_number", sp.getBankAccountNumber());
            sMap.put("bank_account_name", sp.getBankAccountName());
            sMap.put("mobile_banking_number", sp.getMobileBankingNumber());

            List<Map<String, Object>> underOutlets = new ArrayList<>();
            for (Outlet o : allOutlets) {
                if (Objects.equals(outletToSupplierMap.get(o.getOutletId()), sp.getId())) {
                    Map<String, Object> oSummary = new HashMap<>();
                    oSummary.put("outlet_id", o.getOutletId());
                    oSummary.put("outlet_name", o.getOutletName());
                    oSummary.put("location_address", o.getLocationAddress());
                    oSummary.put("city", o.getCity());
                    oSummary.put("supplier_id", sp.getId());
                    oSummary.put("supplier_name", sp.getBusinessName());
                    underOutlets.add(oSummary);
                }
            }
            sMap.put("outlets", underOutlets);
            sMap.put("outlets_count", underOutlets.size());
            sMap.put("outlet_count", underOutlets.size());

            // Calculate Supplier P&L (Profit and Loss)
            double spProcurementSpent = 0.0;
            try {
                Double spSpent = jdbcTemplate.queryForObject(
                    "SELECT COALESCE(SUM(total_amount - COALESCE(refund_amount, 0)), 0) FROM stock_requisitions WHERE supplier_id = ? AND status != 'REJECTED'",
                    Double.class,
                    sp.getId()
                );
                if (spSpent != null) spProcurementSpent = spSpent;
            } catch (Exception ignored) {}

            double spDepotInventoryValue = 0.0;
            int spDepotInventoryUnits = 0;
            try {
                List<Map<String, Object>> invRows = jdbcTemplate.queryForList(
                    "SELECT COALESCE(SUM(di.current_stock), 0) as total_units, " +
                    "COALESCE(SUM(di.current_stock * COALESCE(p.supplier_price, p.base_price, 0)), 0) as total_value " +
                    "FROM district_inventory di " +
                    "JOIN products p ON di.product_id = p.product_id " +
                    "WHERE di.district_id = ?",
                    sp.getPrimaryDistrictId()
                );
                if (!invRows.isEmpty()) {
                    spDepotInventoryUnits = ((Number) invRows.get(0).getOrDefault("total_units", 0)).intValue();
                    spDepotInventoryValue = ((Number) invRows.get(0).getOrDefault("total_value", 0.0)).doubleValue();
                }
            } catch (Exception ignored) {}

            double spWholesaleRevenue = 0.0;
            double spWholesaleCogs = 0.0;
            double spWholesaleGrossProfit = 0.0;

            if (!underOutlets.isEmpty()) {
                List<Long> outIds = underOutlets.stream().map(m -> ((Number) m.get("outlet_id")).longValue()).toList();
                String inSql = outIds.stream().map(String::valueOf).collect(java.util.stream.Collectors.joining(","));
                try {
                    List<Map<String, Object>> pnlRows = jdbcTemplate.queryForList(
                        "SELECT " +
                        "COALESCE(SUM(COALESCE(r.total_amount, r.quantity * COALESCE(r.unit_price, p.outlet_price, 0))), 0) AS rev, " +
                        "COALESCE(SUM(r.quantity * COALESCE(p.supplier_price, p.base_price, 0)), 0) AS cogs, " +
                        "COALESCE(SUM(COALESCE(r.total_amount, r.quantity * COALESCE(r.unit_price, p.outlet_price, 0)) - (r.quantity * COALESCE(p.supplier_price, p.base_price, 0))), 0) AS profit " +
                        "FROM outlet_requisitions r " +
                        "JOIN products p ON r.product_id = p.product_id " +
                        "WHERE r.status IN ('DISPATCHED', 'DELIVERED', 'COMPLETED') AND r.outlet_id IN (" + inSql + ")"
                    );
                    if (!pnlRows.isEmpty()) {
                        spWholesaleRevenue = ((Number) pnlRows.get(0).getOrDefault("rev", 0.0)).doubleValue();
                        spWholesaleCogs = ((Number) pnlRows.get(0).getOrDefault("cogs", 0.0)).doubleValue();
                        spWholesaleGrossProfit = ((Number) pnlRows.get(0).getOrDefault("profit", 0.0)).doubleValue();
                    }
                } catch (Exception ignored) {}
            }

            try {
                Double txRev = jdbcTemplate.queryForObject(
                    "SELECT COALESCE(SUM(amount), 0) FROM supplier_transactions WHERE supplier_id = ? AND type = 'OUTLET_SALE' AND status = 'COMPLETED'",
                    Double.class,
                    sp.getId()
                );
                if (txRev != null && txRev > 0 && spWholesaleRevenue == 0) {
                    spWholesaleRevenue = txRev;
                }
            } catch (Exception ignored) {}

            double spMarginPct = spWholesaleRevenue > 0 ? (spWholesaleGrossProfit / spWholesaleRevenue) * 100.0 : 0.0;

            Map<String, Object> pnlMap = new HashMap<>();
            pnlMap.put("procurement_spent", spProcurementSpent);
            pnlMap.put("wholesale_revenue", spWholesaleRevenue);
            pnlMap.put("wholesale_cogs", spWholesaleCogs);
            pnlMap.put("wholesale_gross_profit", spWholesaleGrossProfit);
            pnlMap.put("profit_margin_pct", Math.round(spMarginPct * 100.0) / 100.0);
            pnlMap.put("depot_inventory_value", spDepotInventoryValue);
            pnlMap.put("depot_inventory_units", spDepotInventoryUnits);
            pnlMap.put("net_cash_flow", spWholesaleRevenue - spProcurementSpent);

            sMap.put("financial_pnl", pnlMap);
            sMap.put("procurement_spent", spProcurementSpent);
            sMap.put("wholesale_revenue", spWholesaleRevenue);
            sMap.put("wholesale_gross_profit", spWholesaleGrossProfit);
            sMap.put("profit_margin_pct", Math.round(spMarginPct * 100.0) / 100.0);
            sMap.put("depot_inventory_value", spDepotInventoryValue);
            sMap.put("depot_inventory_units", spDepotInventoryUnits);
            sMap.put("total_available_stock", spDepotInventoryUnits);

            // Fetch available stock breakdown per product in supplier's regional depot
            List<Map<String, Object>> supplierStocks = new ArrayList<>();
            try {
                supplierStocks = jdbcTemplate.queryForList(
                    "SELECT di.product_id, p.brand, p.flavor_variant, p.size_volume, p.packaging, p.sku, " +
                    "di.current_stock, di.reserved_stock, " +
                    "COALESCE(p.supplier_price, p.base_price, 0) as unit_price, " +
                    "(di.current_stock * COALESCE(p.supplier_price, p.base_price, 0)) as total_value " +
                    "FROM district_inventory di " +
                    "JOIN products p ON di.product_id = p.product_id " +
                    "WHERE di.district_id = ? " +
                    "ORDER BY di.current_stock DESC, p.brand ASC",
                    sp.getPrimaryDistrictId()
                );
            } catch (Exception ignored) {}
            sMap.put("available_stocks", supplierStocks);

            // Attach Sales Officers & PSRs to Supplier
            List<Map<String, Object>> supOfficers = enrichedSalesOfficers.stream()
                    .filter(o -> Objects.equals(o.get("supplier_id"), sp.getId()))
                    .collect(Collectors.toList());
            sMap.put("sales_officers", supOfficers);
            sMap.put("sales_officers_count", supOfficers.size());

            List<Map<String, Object>> supPsrs = enrichedPsrs.stream()
                    .filter(p -> Objects.equals(p.get("supplier_id"), sp.getId()))
                    .collect(Collectors.toList());
            sMap.put("psrs", supPsrs);
            sMap.put("psrs_count", supPsrs.size());

            int supPsrCases = supPsrs.stream().mapToInt(p -> ((Number) p.getOrDefault("total_cases_sold", 0)).intValue()).sum();
            double supPsrRev = supPsrs.stream().mapToDouble(p -> ((Number) p.getOrDefault("total_revenue", 0.0)).doubleValue()).sum();
            sMap.put("total_psr_cases_sold", supPsrCases);
            sMap.put("total_psr_revenue", supPsrRev);

            supplierList.add(sMap);
        }

        // Build enriched outlets list with mapped supplier info
        List<Map<String, Object>> enrichedOutlets = new ArrayList<>();
        for (Outlet o : allOutlets) {
            Map<String, Object> oMap = new HashMap<>();
            oMap.put("outlet_id", o.getOutletId());
            oMap.put("outlet_name", o.getOutletName());
            oMap.put("franchise_name", o.getFranchiseName());
            oMap.put("branch_name", o.getBranchName());
            oMap.put("location_address", o.getLocationAddress());
            oMap.put("city", o.getCity());
            oMap.put("area", o.getArea());
            oMap.put("district_id", o.getDistrictId());
            oMap.put("sub_route", o.getSubRoute());
            oMap.put("assigned_psr_id", o.getAssignedPsrId());
            oMap.put("contact_phone", o.getContactPhone());
            oMap.put("status", o.getStatus());
            oMap.put("supplier_id", outletToSupplierMap.get(o.getOutletId()));
            oMap.put("supplier_name", outletToSupplierNameMap.get(o.getOutletId()));
            enrichedOutlets.add(oMap);
        }

        // Filter targeted outlets
        List<Outlet> targetOutlets = allOutlets.stream().filter(o -> {
            if (outletId != null && !o.getOutletId().equals(outletId)) return false;
            if (supplierId != null && !Objects.equals(outletToSupplierMap.get(o.getOutletId()), supplierId)) return false;
            if (psrId != null && !Objects.equals(o.getAssignedPsrId(), psrId)) return false;
            if (salesOfficerId != null) {
                Set<Long> soPsrIds = allPsrs.stream()
                        .filter(p -> Objects.equals(p.getSalesOfficerId(), salesOfficerId))
                        .map(PreSalesOfficer::getId)
                        .collect(Collectors.toSet());
                boolean assignedToSoPsr = o.getAssignedPsrId() != null && soPsrIds.contains(o.getAssignedPsrId());
                SalesOfficer so = allSalesOfficers.stream().filter(s -> s.getId().equals(salesOfficerId)).findFirst().orElse(null);
                boolean areaMatches = so != null && so.getAssignedArea() != null && o.getArea() != null && o.getArea().equalsIgnoreCase(so.getAssignedArea());
                if (!assignedToSoPsr && !areaMatches) return false;
            }
            return true;
        }).collect(Collectors.toList());

        // Filter targeted products
        List<Product> targetProducts = allProducts.stream().filter(p -> {
            if (productId != null && !p.getProductId().equals(productId)) return false;
            return true;
        }).collect(Collectors.toList());

        // 2. Build Outlet Product Stock, Price & Profit Ledger
        List<Map<String, Object>> outletProductLedger = new ArrayList<>();
        double grandOutletRevenue = 0.0;
        double grandOutletProfit = 0.0;
        int grandUnitsSold = 0;
        int grandShelfStock = 0;

        Map<String, Integer> shopStockMap = inventoryRepository.findAll().stream()
                .collect(Collectors.toMap(si -> si.getBranchId() + "_" + si.getProductId(), ShopInventory::getStockQuantity, (a, b) -> a));

        StringBuilder sqlSalesAll = new StringBuilder("SELECT outlet_id, product_id, COALESCE(SUM(quantity), 0) AS units_sold, COALESCE(SUM(total_amount), 0.0) AS total_revenue FROM outlet_sales WHERE 1=1");
        List<Object> allParams = new ArrayList<>();
        if (startDate != null && !startDate.trim().isEmpty()) {
            sqlSalesAll.append(" AND DATE(sale_date) >= ?");
            allParams.add(startDate.trim());
        }
        if (endDate != null && !endDate.trim().isEmpty()) {
            sqlSalesAll.append(" AND DATE(sale_date) <= ?");
            allParams.add(endDate.trim());
        }
        sqlSalesAll.append(" GROUP BY outlet_id, product_id");
        Map<String, Map<String, Object>> salesByOutletAndProduct = new HashMap<>();
        try {
            List<Map<String, Object>> rows = jdbcTemplate.queryForList(sqlSalesAll.toString(), allParams.toArray());
            for (Map<String, Object> row : rows) {
                String key = row.get("outlet_id") + "_" + row.get("product_id");
                salesByOutletAndProduct.put(key, row);
            }
        } catch (Exception ignored) {}

        for (Outlet o : targetOutlets) {
            Long sId = outletToSupplierMap.get(o.getOutletId());
            String sName = outletToSupplierNameMap.getOrDefault(o.getOutletId(), "Regional Supplier Depot");

            for (Product p : targetProducts) {
                int stock = shopStockMap.getOrDefault(o.getOutletId() + "_" + p.getProductId(), 0);
                grandShelfStock += stock;

                // 3-Tier Prices
                BigDecimal buyRate = p.getSupplierPrice() != null ? p.getSupplierPrice() : (p.getBasePrice() != null ? p.getBasePrice() : BigDecimal.valueOf(25.0));
                BigDecimal outletRate = p.getOutletPrice() != null ? p.getOutletPrice() : buyRate.multiply(BigDecimal.valueOf(1.15)).setScale(2, RoundingMode.HALF_UP);
                BigDecimal retailPrice = p.getRetailPrice() != null ? p.getRetailPrice() : outletRate.multiply(BigDecimal.valueOf(1.15)).setScale(2, RoundingMode.HALF_UP);

                BigDecimal supplierUnitProfit = outletRate.subtract(buyRate);
                BigDecimal outletUnitMargin = retailPrice.subtract(outletRate);
                double marginPercent = retailPrice.compareTo(BigDecimal.ZERO) > 0
                        ? outletUnitMargin.divide(retailPrice, 4, RoundingMode.HALF_UP).multiply(BigDecimal.valueOf(100)).doubleValue()
                        : 0.0;

                // Sales stats for this outlet + product
                Map<String, Object> resMap = salesByOutletAndProduct.get(o.getOutletId() + "_" + p.getProductId());
                int unitsSold = (resMap != null && resMap.get("units_sold") != null) ? ((Number) resMap.get("units_sold")).intValue() : 0;
                double revenue = (resMap != null && resMap.get("total_revenue") != null) ? ((Number) resMap.get("total_revenue")).doubleValue() : 0.0;

                double outletProfit = outletUnitMargin.multiply(BigDecimal.valueOf(unitsSold)).doubleValue();
                grandUnitsSold += unitsSold;
                grandOutletRevenue += revenue;
                grandOutletProfit += outletProfit;

                Map<String, Object> row = new HashMap<>();
                row.put("outlet_id", o.getOutletId());
                row.put("outlet_name", o.getOutletName());
                row.put("location_address", o.getLocationAddress());
                row.put("city", o.getCity());
                row.put("supplier_id", sId);
                row.put("supplier_name", sName);

                row.put("product_id", p.getProductId());
                row.put("brand", p.getBrand());
                row.put("flavor_variant", p.getFlavorVariant());
                row.put("sku", p.getSku());
                row.put("packaging", p.getPackaging());
                row.put("size_volume", p.getSizeVolume());
                row.put("category", p.getCategory());
                row.put("image_url", p.getImageUrl());

                // Commercial Pricing Hierarchy
                row.put("supplier_buy_rate", buyRate);
                row.put("outlet_wholesale_rate", outletRate);
                row.put("retail_customer_mrp", retailPrice);
                row.put("supplier_unit_profit", supplierUnitProfit);
                row.put("outlet_unit_margin", outletUnitMargin);
                row.put("outlet_margin_percent", marginPercent);

                // Stocks & Financial Performance
                row.put("current_shelf_stock", stock);
                row.put("stock_status", stock == 0 ? "OUT_OF_STOCK" : (stock <= 15 ? "LOW_STOCK" : "IN_STOCK"));
                row.put("units_sold", unitsSold);
                row.put("revenue_generated", revenue);
                row.put("outlet_profit_earned", outletProfit);

                outletProductLedger.add(row);
            }
        }

        // 3. Outlet Customer Sales Logs
        StringBuilder salesQuery = new StringBuilder("SELECT s.id, s.sale_code, s.outlet_id, s.product_id, s.product_name, s.quantity, s.unit_price, s.total_amount, s.payment_method, s.customer_notes, s.sale_date, o.outlet_name, o.location_address, p.outlet_price FROM outlet_sales s LEFT JOIN outlets o ON s.outlet_id = o.outlet_id LEFT JOIN products p ON s.product_id = p.product_id WHERE 1=1");
        List<Object> sParams = new ArrayList<>();

        if (outletId != null) {
            salesQuery.append(" AND s.outlet_id = ?");
            sParams.add(outletId);
        } else if (supplierId != null && !targetOutlets.isEmpty()) {
            String inOutlets = targetOutlets.stream().map(o -> String.valueOf(o.getOutletId())).collect(Collectors.joining(","));
            salesQuery.append(" AND s.outlet_id IN (").append(inOutlets).append(")");
        }
        if (productId != null) {
            salesQuery.append(" AND s.product_id = ?");
            sParams.add(productId);
        }
        if (startDate != null && !startDate.trim().isEmpty()) {
            salesQuery.append(" AND DATE(s.sale_date) >= ?");
            sParams.add(startDate.trim());
        }
        if (endDate != null && !endDate.trim().isEmpty()) {
            salesQuery.append(" AND DATE(s.sale_date) <= ?");
            sParams.add(endDate.trim());
        }
        salesQuery.append(" ORDER BY s.sale_date DESC LIMIT 200");

        List<Map<String, Object>> outletSalesLogs = new ArrayList<>();
        try {
            List<Map<String, Object>> rawSales = jdbcTemplate.queryForList(salesQuery.toString(), sParams.toArray());
            for (Map<String, Object> rs : rawSales) {
                Map<String, Object> saleMap = new HashMap<>(rs);
                int qty = ((Number) rs.getOrDefault("quantity", 1)).intValue();
                double total = ((Number) rs.getOrDefault("total_amount", 0.0)).doubleValue();
                double outPrice = rs.get("outlet_price") != null ? ((Number) rs.get("outlet_price")).doubleValue() : (total / Math.max(1, qty) * 0.85);

                double cost = outPrice * qty;
                double margin = Math.max(0.0, total - cost);
                saleMap.put("sale_id", rs.get("id"));
                saleMap.put("order_code", rs.get("sale_code"));
                saleMap.put("customer_note", rs.get("customer_notes"));
                saleMap.put("outlet_cost_total", cost);
                saleMap.put("outlet_margin_earned", margin);
                saleMap.put("estimated_outlet_profit", margin);
                outletSalesLogs.add(saleMap);
            }
        } catch (Exception ignored) {}

        // 4. Supplier Commercial Transactions & Profit Logs
        StringBuilder txnQuery = new StringBuilder("SELECT t.id, t.transaction_code, t.supplier_id, t.outlet_id, t.type, t.entry_type, t.amount, t.payment_method, t.reference_code, t.description, t.created_at, sp.business_name AS supplier_name, sp.division_name, o.outlet_name FROM supplier_transactions t LEFT JOIN supplier_profiles sp ON t.supplier_id = sp.id LEFT JOIN outlets o ON t.outlet_id = o.outlet_id WHERE 1=1");
        List<Object> tParams = new ArrayList<>();

        if (supplierId != null) {
            txnQuery.append(" AND t.supplier_id = ?");
            tParams.add(supplierId);
        }
        if (outletId != null) {
            txnQuery.append(" AND t.outlet_id = ?");
            tParams.add(outletId);
        }
        if (startDate != null && !startDate.trim().isEmpty()) {
            txnQuery.append(" AND DATE(t.created_at) >= ?");
            tParams.add(startDate.trim());
        }
        if (endDate != null && !endDate.trim().isEmpty()) {
            txnQuery.append(" AND DATE(t.created_at) <= ?");
            tParams.add(endDate.trim());
        }
        txnQuery.append(" ORDER BY t.created_at DESC LIMIT 200");

        List<Map<String, Object>> supplierTxnLogs = new ArrayList<>();
        double grandSupplierRevenue = 0.0;
        double grandSupplierProfit = 0.0;

        try {
            List<Map<String, Object>> rawTxns = jdbcTemplate.queryForList(txnQuery.toString(), tParams.toArray());
            for (Map<String, Object> rt : rawTxns) {
                Map<String, Object> tMap = new HashMap<>(rt);
                String type = String.valueOf(rt.get("type"));
                double amount = ((Number) rt.getOrDefault("amount", 0.0)).doubleValue();

                if ("OUTLET_SALE".equalsIgnoreCase(type)) {
                    grandSupplierRevenue += amount;
                    // Supplier profit is (outlet_price - supplier_price)
                    double profit = amount * (1.0 - (1.0 / 1.15)); // Approx 15% wholesale markup
                    String desc = String.valueOf(rt.get("description"));
                    if (desc.contains("Profit: +৳")) {
                        try {
                            String sub = desc.substring(desc.indexOf("Profit: +৳") + 10);
                            int end = sub.indexOf(")");
                            if (end > 0) profit = Double.parseDouble(sub.substring(0, end).trim());
                        } catch (Exception ignored) {}
                    }
                    grandSupplierProfit += profit;
                    tMap.put("supplier_profit_earned", profit);
                }
                tMap.put("transaction_id", rt.get("id"));
                tMap.put("transaction_type", rt.get("type"));
                tMap.put("transaction_date", rt.get("created_at"));
                tMap.put("profit_amount", tMap.getOrDefault("supplier_profit_earned", 0.0));
                tMap.put("balance_after", rt.getOrDefault("balance_after", 0.0));
                supplierTxnLogs.add(tMap);
            }
        } catch (Exception ignored) {}

        // 5. Outlet Requisitions & Dispatches
        StringBuilder reqQuery = new StringBuilder("SELECT r.id, r.requisition_code, r.outlet_id, r.product_id, r.product_name, r.quantity, r.unit_price, r.total_amount, r.urgency, r.status, r.outlet_remarks, r.admin_supplier_notes, r.created_date, o.outlet_name, o.location_address FROM outlet_requisitions r LEFT JOIN outlets o ON r.outlet_id = o.outlet_id WHERE 1=1");
        List<Object> rParams = new ArrayList<>();

        if (outletId != null) {
            reqQuery.append(" AND r.outlet_id = ?");
            rParams.add(outletId);
        } else if (supplierId != null && !targetOutlets.isEmpty()) {
            String inOutlets = targetOutlets.stream().map(o -> String.valueOf(o.getOutletId())).collect(Collectors.joining(","));
            reqQuery.append(" AND r.outlet_id IN (").append(inOutlets).append(")");
        }
        if (productId != null) {
            reqQuery.append(" AND r.product_id = ?");
            rParams.add(productId);
        }
        if (startDate != null && !startDate.trim().isEmpty()) {
            reqQuery.append(" AND DATE(r.created_date) >= ?");
            rParams.add(startDate.trim());
        }
        if (endDate != null && !endDate.trim().isEmpty()) {
            reqQuery.append(" AND DATE(r.created_date) <= ?");
            rParams.add(endDate.trim());
        }
        reqQuery.append(" ORDER BY r.created_date DESC LIMIT 200");

        List<Map<String, Object>> outletRequisitionLogs = new ArrayList<>();
        try {
            outletRequisitionLogs = jdbcTemplate.queryForList(reqQuery.toString(), rParams.toArray());
        } catch (Exception ignored) {}

        // 6. Central & Depot Stocks
        int totalCentralStock = 0;
        try {
            Integer cs = jdbcTemplate.queryForObject("SELECT COALESCE(SUM(available_stock), 0) FROM central_inventory", Integer.class);
            if (cs != null) totalCentralStock = cs;
        } catch (Exception ignored) {}

        int totalSupplierDepotStock = 0;
        try {
            Integer ds = jdbcTemplate.queryForObject("SELECT COALESCE(SUM(available_cases), 0) FROM district_inventory", Integer.class);
            if (ds != null) totalSupplierDepotStock = ds;
        } catch (Exception ignored) {}

        // 6b. Query Detailed PSR Field Orders Log
        StringBuilder poSql = new StringBuilder(
            "SELECT po.id, po.order_code, po.psr_id, po.psr_name, po.sales_officer_id, " +
            "  so.name AS sales_officer_name, so.officer_code AS sales_officer_code, " +
            "  so.supplier_id, sp.business_name AS supplier_name, " +
            "  po.outlet_id, po.outlet_name, po.sub_route, po.product_id, po.product_name, " +
            "  po.quantity, po.unit_price, po.total_amount, po.urgency, po.status, " +
            "  po.outlet_remarks, po.psr_notes, po.created_at, po.updated_at " +
            "FROM psr_orders po " +
            "LEFT JOIN sales_officers so ON po.sales_officer_id = so.id " +
            "LEFT JOIN supplier_profiles sp ON so.supplier_id = sp.id " +
            "WHERE 1=1"
        );
        List<Object> poParams = new ArrayList<>();
        if (supplierId != null) {
            poSql.append(" AND so.supplier_id = ?");
            poParams.add(supplierId);
        }
        if (salesOfficerId != null) {
            poSql.append(" AND po.sales_officer_id = ?");
            poParams.add(salesOfficerId);
        }
        if (psrId != null) {
            poSql.append(" AND po.psr_id = ?");
            poParams.add(psrId);
        }
        if (outletId != null) {
            poSql.append(" AND po.outlet_id = ?");
            poParams.add(outletId);
        }
        if (productId != null) {
            poSql.append(" AND po.product_id = ?");
            poParams.add(productId);
        }
        if (startDate != null && !startDate.trim().isEmpty()) {
            poSql.append(" AND DATE(po.created_at) >= ?");
            poParams.add(startDate.trim());
        }
        if (endDate != null && !endDate.trim().isEmpty()) {
            poSql.append(" AND DATE(po.created_at) <= ?");
            poParams.add(endDate.trim());
        }
        poSql.append(" ORDER BY po.id DESC LIMIT 300");

        List<Map<String, Object>> psrOrdersList = new ArrayList<>();
        int filteredPsrCases = 0;
        double filteredPsrRev = 0.0;
        try {
            psrOrdersList = jdbcTemplate.queryForList(poSql.toString(), poParams.toArray());
            for (Map<String, Object> pol : psrOrdersList) {
                filteredPsrCases += ((Number) pol.getOrDefault("quantity", 0)).intValue();
                filteredPsrRev += ((Number) pol.getOrDefault("total_amount", 0.0)).doubleValue();
            }
        } catch (Exception ignored) {}

        // 7. Overall Summary Telemetry
        Map<String, Object> summary = new HashMap<>();
        summary.put("total_retail_revenue", grandOutletRevenue);
        summary.put("total_outlet_gross_profit", grandOutletProfit);
        summary.put("total_wholesale_revenue", grandSupplierRevenue);
        summary.put("total_supplier_gross_profit", grandSupplierProfit);
        summary.put("total_units_sold", grandUnitsSold);
        summary.put("total_shelf_stock_units", grandShelfStock);
        summary.put("total_supplier_depot_stock", totalSupplierDepotStock);
        summary.put("total_central_depot_stock", totalCentralStock);
        summary.put("active_outlets_count", targetOutlets.size());
        summary.put("active_suppliers_count", supplierList.size());
        summary.put("total_psr_cases_sold", filteredPsrCases > 0 ? filteredPsrCases : grandPsrCasesSold);
        summary.put("total_psr_revenue", filteredPsrRev > 0 ? filteredPsrRev : grandPsrRevenue);
        summary.put("total_sales_officers_count", allSalesOfficers.size());
        summary.put("total_psrs_count", allPsrs.size());
        summary.put("total_psr_orders_count", psrOrdersList.size());

        // Query Products Purchased by Suppliers from Superadmin (Stock Requisitions)
        List<Map<String, Object>> supplierPurchasedProducts = new ArrayList<>();
        try {
            String purchaseSql = 
                "SELECT " +
                "  sr.supplier_id, " +
                "  p.product_id, " +
                "  CONCAT(p.brand, ' ', p.flavor_variant) AS product_name, " +
                "  p.sku, " +
                "  p.brand, " +
                "  p.flavor_variant, " +
                "  p.size_volume, " +
                "  p.packaging, " +
                "  COALESCE(p.supplier_price, p.base_price, 0) AS unit_supplier_price, " +
                "  COALESCE(p.retail_price, 0) AS retail_price, " +
                "  SUM(COALESCE(sri.approved_quantity, sri.requested_quantity, 0)) AS total_cases_purchased, " +
                "  SUM(COALESCE(sri.approved_quantity, sri.requested_quantity, 0) * COALESCE(p.supplier_price, p.base_price, 0)) AS total_purchase_spent, " +
                "  COUNT(DISTINCT sr.id) AS orders_count, " +
                "  MAX(sr.created_at) AS last_purchase_date, " +
                "  COALESCE(di.current_stock, 0) AS current_depot_stock " +
                "FROM stock_requisitions sr " +
                "JOIN stock_requisition_items sri ON sr.id = sri.requisition_id " +
                "JOIN products p ON sri.product_id = p.product_id " +
                "LEFT JOIN district_inventory di ON di.product_id = p.product_id AND di.district_id = sr.district_id " +
                "GROUP BY sr.supplier_id, p.product_id, p.sku, p.brand, p.flavor_variant, p.size_volume, p.packaging, p.supplier_price, p.base_price, p.retail_price, di.current_stock " +
                "ORDER BY total_cases_purchased DESC";
            supplierPurchasedProducts = jdbcTemplate.queryForList(purchaseSql);
        } catch (Exception ex) {
            System.err.println("[Commercial Logs] Failed to query supplier purchased products: " + ex.getMessage());
        }

        // Query Available Stocks Across All Individual Suppliers
        List<Map<String, Object>> allSupplierStocks = new ArrayList<>();
        try {
            String allStocksSql =
                "SELECT sp.id as supplier_id, sp.business_name as supplier_name, sp.primary_district_id, " +
                "  di.product_id, p.brand, p.flavor_variant, p.size_volume, p.packaging, p.sku, " +
                "  di.current_stock, di.reserved_stock, " +
                "  COALESCE(p.supplier_price, p.base_price, 0) as unit_price, " +
                "  (di.current_stock * COALESCE(p.supplier_price, p.base_price, 0)) as total_value " +
                "FROM supplier_profiles sp " +
                "JOIN district_inventory di ON sp.primary_district_id = di.district_id " +
                "JOIN products p ON di.product_id = p.product_id " +
                "ORDER BY sp.id ASC, di.current_stock DESC, p.brand ASC";
            allSupplierStocks = jdbcTemplate.queryForList(allStocksSql);
        } catch (Exception ex) {
            System.err.println("[Commercial Logs] Failed to query all supplier stocks: " + ex.getMessage());
        }

        Map<String, Object> response = new HashMap<>();
        response.put("summary", summary);
        response.put("suppliers", supplierList);
        response.put("sales_officers", enrichedSalesOfficers);
        response.put("psrs", enrichedPsrs);
        response.put("psr_orders", psrOrdersList);
        response.put("outlets", enrichedOutlets);
        response.put("products", allProducts);
        response.put("outlet_product_ledger", outletProductLedger);
        response.put("outlet_sales_logs", outletSalesLogs);
        response.put("supplier_transactions", supplierTxnLogs);
        response.put("outlet_requisitions", outletRequisitionLogs);
        response.put("supplier_purchased_products", supplierPurchasedProducts);
        response.put("all_supplier_inventory", allSupplierStocks);

        return ResponseEntity.ok(response);
    }
}
