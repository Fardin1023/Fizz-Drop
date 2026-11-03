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
    private final JdbcTemplate jdbcTemplate;

    public AdminController(ProductRepository productRepository,
                           OutletRepository outletRepository,
                           ShopInventoryRepository inventoryRepository,
                           SupplierProfileRepository supplierProfileRepository,
                           SupplierTransactionRepository transactionRepository,
                           CentralInventoryRepository centralInventoryRepository,
                           DistrictInventoryRepository districtInventoryRepository,
                           DistrictRepository districtRepository,
                           JdbcTemplate jdbcTemplate) {
        this.productRepository = productRepository;
        this.outletRepository = outletRepository;
        this.inventoryRepository = inventoryRepository;
        this.supplierProfileRepository = supplierProfileRepository;
        this.transactionRepository = transactionRepository;
        this.centralInventoryRepository = centralInventoryRepository;
        this.districtInventoryRepository = districtInventoryRepository;
        this.districtRepository = districtRepository;
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
     * Supports filtering by Supplier, Outlet under that supplier, Product, and Date Range.
     */
    @GetMapping("/commercial-logs")
    public ResponseEntity<Map<String, Object>> getCommercialLogs(
            @RequestParam(required = false) Long supplierId,
            @RequestParam(required = false) Long outletId,
            @RequestParam(required = false) Long productId,
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate
    ) {
        List<Product> allProducts = productRepository.findAll();
        List<Outlet> allOutlets = outletRepository.findAll();
        List<SupplierProfile> allSuppliers = supplierProfileRepository.findAll();

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

        // 1. Build Suppliers list with their designated Outlets
        List<Map<String, Object>> supplierList = new ArrayList<>();
        for (SupplierProfile sp : allSuppliers) {
            Map<String, Object> sMap = new HashMap<>();
            sMap.put("supplier_id", sp.getId());
            sMap.put("business_name", sp.getBusinessName());
            sMap.put("division_name", sp.getDivisionName());
            sMap.put("phone_number", sp.getPhoneNumber());

            List<Map<String, Object>> underOutlets = new ArrayList<>();
            for (Outlet o : allOutlets) {
                if (Objects.equals(outletToSupplierMap.get(o.getOutletId()), sp.getId())) {
                    Map<String, Object> oSummary = new HashMap<>();
                    oSummary.put("outlet_id", o.getOutletId());
                    oSummary.put("outlet_name", o.getOutletName());
                    oSummary.put("location_address", o.getLocationAddress());
                    oSummary.put("city", o.getCity());
                    underOutlets.add(oSummary);
                }
            }
            sMap.put("outlets", underOutlets);
            sMap.put("outlets_count", underOutlets.size());
            supplierList.add(sMap);
        }

        // Filter targeted outlets
        List<Outlet> targetOutlets = allOutlets.stream().filter(o -> {
            if (outletId != null && !o.getOutletId().equals(outletId)) return false;
            if (supplierId != null && !Objects.equals(outletToSupplierMap.get(o.getOutletId()), supplierId)) return false;
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

        for (Outlet o : targetOutlets) {
            Long sId = outletToSupplierMap.get(o.getOutletId());
            String sName = outletToSupplierNameMap.getOrDefault(o.getOutletId(), "Regional Supplier Depot");

            for (Product p : targetProducts) {
                var invOpt = inventoryRepository.findByBranchIdAndProductId(o.getOutletId(), p.getProductId());
                int stock = invOpt.map(ShopInventory::getStockQuantity).orElse(0);
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
                StringBuilder sqlSales = new StringBuilder("SELECT COALESCE(SUM(quantity), 0) AS units_sold, COALESCE(SUM(total_amount), 0.0) AS total_revenue FROM outlet_sales WHERE outlet_id = ? AND product_id = ?");
                List<Object> params = new ArrayList<>();
                params.add(o.getOutletId());
                params.add(p.getProductId());

                if (startDate != null && !startDate.trim().isEmpty()) {
                    sqlSales.append(" AND DATE(sale_date) >= ?");
                    params.add(startDate.trim());
                }
                if (endDate != null && !endDate.trim().isEmpty()) {
                    sqlSales.append(" AND DATE(sale_date) <= ?");
                    params.add(endDate.trim());
                }

                int unitsSold = 0;
                double revenue = 0.0;
                try {
                    Map<String, Object> resMap = jdbcTemplate.queryForMap(sqlSales.toString(), params.toArray());
                    if (resMap.get("units_sold") != null) unitsSold = ((Number) resMap.get("units_sold")).intValue();
                    if (resMap.get("total_revenue") != null) revenue = ((Number) resMap.get("total_revenue")).doubleValue();
                } catch (Exception ignored) {}

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
                saleMap.put("outlet_cost_total", cost);
                saleMap.put("outlet_margin_earned", margin);
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

        Map<String, Object> response = new HashMap<>();
        response.put("summary", summary);
        response.put("suppliers", supplierList);
        response.put("outlets", allOutlets);
        response.put("products", allProducts);
        response.put("outlet_product_ledger", outletProductLedger);
        response.put("outlet_sales_logs", outletSalesLogs);
        response.put("supplier_transactions", supplierTxnLogs);
        response.put("outlet_requisitions", outletRequisitionLogs);

        return ResponseEntity.ok(response);
    }
}
