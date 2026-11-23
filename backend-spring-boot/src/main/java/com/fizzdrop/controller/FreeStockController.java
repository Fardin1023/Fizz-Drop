package com.fizzdrop.controller;

import com.fizzdrop.entity.*;
import com.fizzdrop.repository.*;
import jakarta.annotation.PostConstruct;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/free-stocks")
@CrossOrigin(origins = "*")
public class FreeStockController {

    private final FreeStockRepository freeStockRepository;
    private final FreeStockTransactionRepository transactionRepository;
    private final TradeOfferRepository tradeOfferRepository;
    private final DistrictRepository districtRepository;
    private final ProductRepository productRepository;
    private final DistrictProductPricingRepository pricingRepository;
    private final OutletRepository outletRepository;
    private final JdbcTemplate jdbcTemplate;

    public FreeStockController(FreeStockRepository freeStockRepository,
                               FreeStockTransactionRepository transactionRepository,
                               TradeOfferRepository tradeOfferRepository,
                               DistrictRepository districtRepository,
                               ProductRepository productRepository,
                               DistrictProductPricingRepository pricingRepository,
                               OutletRepository outletRepository,
                               JdbcTemplate jdbcTemplate) {
        this.freeStockRepository = freeStockRepository;
        this.transactionRepository = transactionRepository;
        this.tradeOfferRepository = tradeOfferRepository;
        this.districtRepository = districtRepository;
        this.productRepository = productRepository;
        this.pricingRepository = pricingRepository;
        this.outletRepository = outletRepository;
        this.jdbcTemplate = jdbcTemplate;
    }

    @PostConstruct
    public void initFreeStockTablesAndSync() {
        try {
            jdbcTemplate.execute(
                "CREATE TABLE IF NOT EXISTS free_stocks (" +
                "id BIGINT AUTO_INCREMENT PRIMARY KEY, " +
                "offer_id BIGINT NULL, " +
                "offer_title VARCHAR(200) NULL, " +
                "district_id BIGINT NOT NULL, " +
                "district_name VARCHAR(100) NULL, " +
                "division_name VARCHAR(100) NULL, " +
                "product_id BIGINT NOT NULL, " +
                "product_name VARCHAR(200) NULL, " +
                "sku VARCHAR(100) NULL, " +
                "category VARCHAR(100) NULL, " +
                "offered_cases INT NOT NULL DEFAULT 100, " +
                "supplied_cases INT NOT NULL DEFAULT 0, " +
                "remaining_cases INT NOT NULL DEFAULT 100, " +
                "unit_value DECIMAL(12,2) NOT NULL DEFAULT 15.00, " +
                "total_offered_value DECIMAL(15,2) NOT NULL DEFAULT 0.00, " +
                "total_supplied_value DECIMAL(15,2) NOT NULL DEFAULT 0.00, " +
                "remaining_value DECIMAL(15,2) NOT NULL DEFAULT 0.00, " +
                "status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE', " +
                "notes TEXT NULL, " +
                "created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, " +
                "updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, " +
                "INDEX idx_free_stocks_district (district_id), " +
                "INDEX idx_free_stocks_product (product_id)" +
                ")"
            );

            jdbcTemplate.execute(
                "CREATE TABLE IF NOT EXISTS free_stock_transactions (" +
                "id BIGINT AUTO_INCREMENT PRIMARY KEY, " +
                "free_stock_id BIGINT NULL, " +
                "offer_id BIGINT NULL, " +
                "offer_title VARCHAR(200) NULL, " +
                "requisition_code VARCHAR(100) NULL, " +
                "district_id BIGINT NULL, " +
                "district_name VARCHAR(100) NULL, " +
                "outlet_id BIGINT NOT NULL, " +
                "outlet_name VARCHAR(150) NULL, " +
                "supplier_id BIGINT NULL, " +
                "supplier_name VARCHAR(150) NULL, " +
                "product_id BIGINT NOT NULL, " +
                "product_name VARCHAR(200) NULL, " +
                "cases_supplied INT NOT NULL DEFAULT 1, " +
                "unit_value DECIMAL(12,2) NOT NULL DEFAULT 0.00, " +
                "total_value DECIMAL(15,2) NOT NULL DEFAULT 0.00, " +
                "status VARCHAR(30) NULL DEFAULT 'DISPATCHED', " +
                "transaction_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, " +
                "INDEX idx_fst_requisition (requisition_code), " +
                "INDEX idx_fst_outlet (outlet_id)" +
                ")"
            );
        } catch (Exception e) {
            System.err.println("[FreeStockController] DB table init note: " + e.getMessage());
        }

        // Sync existing trade offers into free_stocks table
        try {
            List<TradeOffer> offers = tradeOfferRepository.findAll();
            for (TradeOffer offer : offers) {
                Optional<FreeStock> existing = freeStockRepository.findByOfferId(offer.getId());
                if (existing.isEmpty()) {
                    Product freeProd = productRepository.findById(offer.getFreeProductId()).orElse(null);
                    BigDecimal unitVal = BigDecimal.valueOf(15.00);
                    if (freeProd != null) {
                        Optional<DistrictProductPricing> dpp = pricingRepository.findByDistrictIdAndProductId(offer.getDistrictId(), freeProd.getProductId());
                        unitVal = dpp.map(DistrictProductPricing::getOutletPrice)
                                .orElse(freeProd.getOutletPrice() != null ? freeProd.getOutletPrice() : BigDecimal.valueOf(15.00));
                    }

                    FreeStock fs = new FreeStock();
                    fs.setOfferId(offer.getId());
                    fs.setOfferTitle(offer.getTitle());
                    fs.setDistrictId(offer.getDistrictId());
                    fs.setDistrictName(offer.getDistrictName());
                    fs.setDivisionName(offer.getDivisionName());
                    fs.setProductId(offer.getFreeProductId());
                    fs.setProductName(offer.getFreeProductName());
                    fs.setCategory(freeProd != null ? freeProd.getCategory() : "Beverage");
                    fs.setSku(freeProd != null ? freeProd.getSku() : "FREE-STOCK-SKU");
                    fs.setOfferedCases(100); // 100 cases standard promotional allocation
                    fs.setSuppliedCases(0);
                    fs.setUnitValue(unitVal);
                    fs.setStatus(offer.getStatus());
                    fs.setNotes("Allocated for trade scheme: " + offer.getTitle());
                    freeStockRepository.save(fs);
                }
            }

            // Also sync past outlet free stock orders (like REQ-FREE-) into transactions
            List<Map<String, Object>> pastFreeReqs = jdbcTemplate.queryForList(
                    "SELECT id, requisition_code, outlet_id, product_id, product_name, quantity, unit_price, total_amount, status, outlet_remarks, admin_supplier_notes, supplier_id, created_date " +
                    "FROM outlet_requisitions WHERE requisition_code LIKE 'REQ-FREE-%' OR outlet_remarks LIKE '%FREE BONUS STOCK%'"
            );

            for (Map<String, Object> r : pastFreeReqs) {
                String reqCode = r.get("requisition_code") != null ? r.get("requisition_code").toString() : "";
                List<FreeStockTransaction> existTx = transactionRepository.findByRequisitionCode(reqCode);
                if (existTx.isEmpty() && !reqCode.isEmpty()) {
                    Long outletId = r.get("outlet_id") != null ? ((Number) r.get("outlet_id")).longValue() : 1L;
                    Long prodId = r.get("product_id") != null ? ((Number) r.get("product_id")).longValue() : 1L;
                    int qty = r.get("quantity") != null ? ((Number) r.get("quantity")).intValue() : 1;
                    Long supId = r.get("supplier_id") != null ? ((Number) r.get("supplier_id")).longValue() : 1L;

                    Outlet outlet = outletRepository.findById(outletId).orElse(null);
                    Product prod = productRepository.findById(prodId).orElse(null);

                    BigDecimal unitVal = BigDecimal.valueOf(15.00);
                    if (outlet != null && prod != null) {
                        Long distId = outlet.getDistrictId() != null ? outlet.getDistrictId() : 1L;
                        Optional<DistrictProductPricing> dpp = pricingRepository.findByDistrictIdAndProductId(distId, prod.getProductId());
                        unitVal = dpp.map(DistrictProductPricing::getOutletPrice)
                                .orElse(prod.getOutletPrice() != null ? prod.getOutletPrice() : BigDecimal.valueOf(15.00));
                    }

                    // Find corresponding FreeStock record
                    FreeStock fs = null;
                    if (outlet != null && outlet.getDistrictId() != null) {
                        fs = freeStockRepository.findByDistrictIdAndProductId(outlet.getDistrictId(), prodId).orElse(null);
                    }
                    if (fs == null) {
                        List<FreeStock> byProd = freeStockRepository.findByProductId(prodId);
                        if (!byProd.isEmpty()) fs = byProd.get(0);
                    }

                    FreeStockTransaction tx = new FreeStockTransaction();
                    if (fs != null) {
                        tx.setFreeStockId(fs.getId());
                        tx.setOfferId(fs.getOfferId());
                        tx.setOfferTitle(fs.getOfferTitle());
                    }
                    tx.setRequisitionCode(reqCode);
                    tx.setDistrictId(outlet != null ? outlet.getDistrictId() : 1L);
                    tx.setDistrictName(outlet != null && outlet.getDistrictName() != null ? outlet.getDistrictName() : "Dhaka");
                    tx.setOutletId(outletId);
                    tx.setOutletName(outlet != null ? outlet.getOutletName() : "Retail Outlet");
                    tx.setSupplierId(supId);
                    tx.setSupplierName("Regional Beverage Depot");
                    tx.setProductId(prodId);
                    tx.setProductName(prod != null ? (prod.getBrand() + " " + prod.getFlavorVariant()) : (r.get("product_name") != null ? r.get("product_name").toString() : "Aquafina"));
                    tx.setCasesSupplied(qty);
                    tx.setUnitValue(unitVal);
                    tx.setTotalValue(unitVal.multiply(BigDecimal.valueOf(qty)));
                    tx.setStatus("DISPATCHED");
                    transactionRepository.save(tx);

                    // Update parent FreeStock supplied count
                    if (fs != null) {
                        fs.setSuppliedCases(fs.getSuppliedCases() + qty);
                        freeStockRepository.save(fs);
                    }
                }
            }
        } catch (Exception e) {
            System.err.println("[FreeStockController] DB sync error: " + e.getMessage());
        }
    }

    /**
     * Get all free stocks allocations
     */
    @GetMapping
    public ResponseEntity<?> getAllFreeStocks(@RequestParam(value = "district_id", required = false) Long districtId,
                                              @RequestParam(value = "product_id", required = false) Long productId,
                                              @RequestParam(value = "status", required = false) String status) {
        List<FreeStock> list = freeStockRepository.findAllByOrderByCreatedAtDesc();

        if (districtId != null) {
            list = list.stream().filter(f -> Objects.equals(f.getDistrictId(), districtId)).collect(Collectors.toList());
        }
        if (productId != null) {
            list = list.stream().filter(f -> Objects.equals(f.getProductId(), productId)).collect(Collectors.toList());
        }
        if (status != null && !status.equalsIgnoreCase("ALL")) {
            list = list.stream().filter(f -> f.getStatus().equalsIgnoreCase(status)).collect(Collectors.toList());
        }

        return ResponseEntity.ok(list);
    }

    /**
     * Get high-level metrics & breakdowns for Superadmin
     */
    @GetMapping("/metrics")
    public ResponseEntity<?> getFreeStocksMetrics() {
        List<FreeStock> all = freeStockRepository.findAll();
        List<FreeStockTransaction> transactions = transactionRepository.findAllByOrderByTransactionDateDesc();

        int totalOffered = all.stream().mapToInt(f -> f.getOfferedCases() != null ? f.getOfferedCases() : 0).sum();
        int totalSupplied = all.stream().mapToInt(f -> f.getSuppliedCases() != null ? f.getSuppliedCases() : 0).sum();
        int totalRemaining = all.stream().mapToInt(f -> f.getRemainingCases() != null ? f.getRemainingCases() : 0).sum();

        BigDecimal totalOfferedValue = all.stream()
                .map(f -> f.getTotalOfferedValue() != null ? f.getTotalOfferedValue() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal totalSuppliedValue = all.stream()
                .map(f -> f.getTotalSuppliedValue() != null ? f.getTotalSuppliedValue() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal totalRemainingValue = all.stream()
                .map(f -> f.getRemainingValue() != null ? f.getRemainingValue() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // District Breakdown
        Map<String, Map<String, Object>> districtMap = new LinkedHashMap<>();
        for (FreeStock fs : all) {
            String dist = fs.getDistrictName() != null ? fs.getDistrictName() : "General";
            districtMap.putIfAbsent(dist, new HashMap<>(Map.of(
                    "district_name", dist,
                    "offered_cases", 0,
                    "supplied_cases", 0,
                    "offered_value", BigDecimal.ZERO,
                    "supplied_value", BigDecimal.ZERO
            )));
            Map<String, Object> dData = districtMap.get(dist);
            dData.put("offered_cases", (int) dData.get("offered_cases") + (fs.getOfferedCases() != null ? fs.getOfferedCases() : 0));
            dData.put("supplied_cases", (int) dData.get("supplied_cases") + (fs.getSuppliedCases() != null ? fs.getSuppliedCases() : 0));
            dData.put("offered_value", ((BigDecimal) dData.get("offered_value")).add(fs.getTotalOfferedValue() != null ? fs.getTotalOfferedValue() : BigDecimal.ZERO));
            dData.put("supplied_value", ((BigDecimal) dData.get("supplied_value")).add(fs.getTotalSuppliedValue() != null ? fs.getTotalSuppliedValue() : BigDecimal.ZERO));
        }

        // Product Breakdown
        Map<String, Map<String, Object>> productMap = new LinkedHashMap<>();
        for (FreeStock fs : all) {
            String prod = fs.getProductName() != null ? fs.getProductName() : "Bonus Product";
            productMap.putIfAbsent(prod, new HashMap<>(Map.of(
                    "product_name", prod,
                    "offered_cases", 0,
                    "supplied_cases", 0,
                    "offered_value", BigDecimal.ZERO,
                    "supplied_value", BigDecimal.ZERO
            )));
            Map<String, Object> pData = productMap.get(prod);
            pData.put("offered_cases", (int) pData.get("offered_cases") + (fs.getOfferedCases() != null ? fs.getOfferedCases() : 0));
            pData.put("supplied_cases", (int) pData.get("supplied_cases") + (fs.getSuppliedCases() != null ? fs.getSuppliedCases() : 0));
            pData.put("offered_value", ((BigDecimal) pData.get("offered_value")).add(fs.getTotalOfferedValue() != null ? fs.getTotalOfferedValue() : BigDecimal.ZERO));
            pData.put("supplied_value", ((BigDecimal) pData.get("supplied_value")).add(fs.getTotalSuppliedValue() != null ? fs.getTotalSuppliedValue() : BigDecimal.ZERO));
        }

        return ResponseEntity.ok(Map.of(
                "total_allocations", all.size(),
                "total_transactions", transactions.size(),
                "total_offered_cases", totalOffered,
                "total_supplied_cases", totalSupplied,
                "total_remaining_cases", totalRemaining,
                "total_offered_value", totalOfferedValue,
                "total_supplied_value", totalSuppliedValue,
                "total_remaining_value", totalRemainingValue,
                "district_breakdown", new ArrayList<>(districtMap.values()),
                "product_breakdown", new ArrayList<>(productMap.values())
        ));
    }

    /**
     * Get transaction log of all free stocks supplied to outlets
     */
    @GetMapping("/transactions")
    public ResponseEntity<?> getFreeStockTransactions(
            @RequestParam(value = "district_id", required = false) Long districtId,
            @RequestParam(value = "outlet_id", required = false) Long outletId) {
        List<FreeStockTransaction> list = transactionRepository.findAllByOrderByTransactionDateDesc();
        if (districtId != null) {
            list = list.stream().filter(t -> Objects.equals(t.getDistrictId(), districtId)).collect(Collectors.toList());
        }
        if (outletId != null) {
            list = list.stream().filter(t -> Objects.equals(t.getOutletId(), outletId)).collect(Collectors.toList());
        }
        return ResponseEntity.ok(list);
    }

    /**
     * Superadmin manually allocates or tops up Free Stocks for a district and product
     */
    @PostMapping
    @Transactional
    public ResponseEntity<?> createFreeStockAllocation(@RequestBody Map<String, Object> req) {
        try {
            Long districtId = Long.parseLong(req.get("district_id").toString());
            Long productId = Long.parseLong(req.get("product_id").toString());
            int offeredCases = req.containsKey("offered_cases") ? Integer.parseInt(req.get("offered_cases").toString()) : 50;

            District district = districtRepository.findById(districtId)
                    .orElseThrow(() -> new IllegalArgumentException("District not found: " + districtId));
            Product product = productRepository.findById(productId)
                    .orElseThrow(() -> new IllegalArgumentException("Product not found: " + productId));

            BigDecimal unitValue = req.containsKey("unit_value") && req.get("unit_value") != null
                    ? new BigDecimal(req.get("unit_value").toString())
                    : (product.getOutletPrice() != null ? product.getOutletPrice() : BigDecimal.valueOf(15.00));

            String notes = req.getOrDefault("notes", "Direct administrative free stock allocation").toString();
            String title = req.getOrDefault("offer_title", "District Free Stock Grant (" + district.getName() + ")").toString();

            // Check if existing record for this district + product exists
            Optional<FreeStock> existingOpt = freeStockRepository.findByDistrictIdAndProductId(districtId, productId);
            FreeStock fs;
            if (existingOpt.isPresent()) {
                fs = existingOpt.get();
                fs.setOfferedCases(fs.getOfferedCases() + offeredCases);
                if (notes != null && !notes.trim().isEmpty()) {
                    fs.setNotes((fs.getNotes() != null ? fs.getNotes() + " | " : "") + notes);
                }
            } else {
                fs = new FreeStock();
                fs.setDistrictId(district.getId());
                fs.setDistrictName(district.getName());
                fs.setDivisionName(district.getDivision());
                fs.setProductId(product.getProductId());
                fs.setProductName(product.getBrand() + " " + product.getFlavorVariant() + " (" + (product.getSizeVolume() != null ? product.getSizeVolume() : "Standard") + ")");
                fs.setSku(product.getSku());
                fs.setCategory(product.getCategory());
                fs.setOfferTitle(title);
                fs.setOfferedCases(offeredCases);
                fs.setSuppliedCases(0);
                fs.setUnitValue(unitValue);
                fs.setStatus("ACTIVE");
                fs.setNotes(notes);
            }

            FreeStock saved = freeStockRepository.save(fs);
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Free stock allocated successfully for " + district.getName(),
                    "allocation", saved
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", e.getMessage()
            ));
        }
    }

    /**
     * Update free stock allocation
     */
    @PutMapping("/{id}")
    @Transactional
    public ResponseEntity<?> updateFreeStockAllocation(@PathVariable Long id, @RequestBody Map<String, Object> req) {
        return freeStockRepository.findById(id).map(fs -> {
            if (req.containsKey("offered_cases")) {
                fs.setOfferedCases(Integer.parseInt(req.get("offered_cases").toString()));
            }
            if (req.containsKey("unit_value")) {
                fs.setUnitValue(new BigDecimal(req.get("unit_value").toString()));
            }
            if (req.containsKey("status")) {
                fs.setStatus(req.get("status").toString().toUpperCase());
            }
            if (req.containsKey("notes")) {
                fs.setNotes(req.get("notes").toString());
            }
            FreeStock updated = freeStockRepository.save(fs);
            return ResponseEntity.ok(Map.of("success", true, "allocation", updated));
        }).orElse(ResponseEntity.notFound().build());
    }

    /**
     * Delete allocation
     */
    @DeleteMapping("/{id}")
    @Transactional
    public ResponseEntity<?> deleteFreeStockAllocation(@PathVariable Long id) {
        if (!freeStockRepository.existsById(id)) return ResponseEntity.notFound().build();
        freeStockRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("success", true, "message", "Allocation deleted successfully"));
    }
}
