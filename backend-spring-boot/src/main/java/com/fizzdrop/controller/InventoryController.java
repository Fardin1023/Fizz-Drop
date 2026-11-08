package com.fizzdrop.controller;

import com.fizzdrop.dto.ApiResponse;
import com.fizzdrop.dto.SupplyRequest;
import com.fizzdrop.entity.DistrictInventory;
import com.fizzdrop.entity.Outlet;
import com.fizzdrop.entity.Product;
import com.fizzdrop.entity.ShopInventory;
import com.fizzdrop.entity.SupplierProfile;
import com.fizzdrop.repository.DistrictInventoryRepository;
import com.fizzdrop.repository.OutletRepository;
import com.fizzdrop.repository.ProductRepository;
import com.fizzdrop.repository.ShopInventoryRepository;
import com.fizzdrop.repository.SupplierProfileRepository;
import com.fizzdrop.entity.SupplierTransaction;
import com.fizzdrop.repository.SupplierTransactionRepository;
import com.fizzdrop.entity.SalesOfficer;
import com.fizzdrop.repository.SalesOfficerRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import org.springframework.jdbc.core.JdbcTemplate;
import com.fizzdrop.repository.AppNotificationRepository;
import com.fizzdrop.entity.AppNotification;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;

@RestController
@RequestMapping("/api/inventory")
public class InventoryController {

    private final ShopInventoryRepository inventoryRepository;
    private final ProductRepository productRepository;
    private final OutletRepository outletRepository;
    private final DistrictInventoryRepository districtInventoryRepository;
    private final SupplierProfileRepository supplierProfileRepository;
    private final JdbcTemplate jdbcTemplate;
    private final AppNotificationRepository notificationRepository;
    private final SupplierTransactionRepository supplierTransactionRepository;
    private final SalesOfficerRepository salesOfficerRepository;

    public InventoryController(ShopInventoryRepository inventoryRepository,
                               ProductRepository productRepository,
                               OutletRepository outletRepository,
                               DistrictInventoryRepository districtInventoryRepository,
                               SupplierProfileRepository supplierProfileRepository,
                               JdbcTemplate jdbcTemplate,
                               AppNotificationRepository notificationRepository,
                               SupplierTransactionRepository supplierTransactionRepository,
                               SalesOfficerRepository salesOfficerRepository) {
        this.inventoryRepository = inventoryRepository;
        this.productRepository = productRepository;
        this.outletRepository = outletRepository;
        this.districtInventoryRepository = districtInventoryRepository;
        this.supplierProfileRepository = supplierProfileRepository;
        this.jdbcTemplate = jdbcTemplate;
        this.notificationRepository = notificationRepository;
        this.supplierTransactionRepository = supplierTransactionRepository;
        this.salesOfficerRepository = salesOfficerRepository;
    }

    /**
     * Supplier supplies a particular amount of products to a particular outlet in the database
     */
    @PostMapping("/supply")
    public ResponseEntity<?> supplyStockToOutlet(@RequestBody SupplyRequest req) {
        try {
            if (req.getProductId() == null) {
                return ResponseEntity.badRequest().body(ApiResponse.fail("Product ID is required"));
            }

            // Support Sales Officer direct supply: resolve outlet if salesOfficerId is supplied
            SalesOfficer targetOfficer = null;
            if (req.getSalesOfficerId() != null) {
                targetOfficer = salesOfficerRepository.findById(req.getSalesOfficerId()).orElse(null);
            }

            if (req.getOutletId() == null && targetOfficer != null) {
                String soArea = targetOfficer.getAssignedArea().toLowerCase().trim();
                Optional<Outlet> matched = outletRepository.findAll().stream()
                        .filter(o -> {
                            String oArea = o.getArea() != null ? o.getArea().toLowerCase().trim() : "";
                            String oAddr = o.getLocationAddress() != null ? o.getLocationAddress().toLowerCase().trim() : "";
                            return !soArea.isEmpty() && (oArea.contains(soArea) || soArea.contains(oArea) || oAddr.contains(soArea));
                        })
                        .findFirst();
                if (matched.isPresent()) {
                    req.setOutletId(matched.get().getOutletId());
                } else {
                    List<Outlet> allO = outletRepository.findAll();
                    req.setOutletId(allO.isEmpty() ? 1L : allO.get(0).getOutletId());
                }
            }

            if (req.getOutletId() == null && req.getSalesOfficerId() == null) {
                return ResponseEntity.badRequest().body(ApiResponse.fail("Sales Officer or Destination selection is required"));
            }
            if (req.getQuantity() == null || req.getQuantity() <= 0) {
                return ResponseEntity.badRequest().body(ApiResponse.fail("Supply quantity must be greater than 0"));
            }

        // Verify product exists in database
        Optional<Product> prodOpt = productRepository.findById(req.getProductId());
        if (prodOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiResponse.fail("Product with ID " + req.getProductId() + " not found in database"));
        }
        Product product = prodOpt.get();

        // Verify outlet exists in database
        Optional<Outlet> outletOpt = outletRepository.findById(req.getOutletId());
        if (outletOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiResponse.fail("Outlet with ID " + req.getOutletId() + " not found in database"));
        }
        Outlet outlet = outletOpt.get();

        // Enforce supplier depot stock validation: reject if 0 stock or insufficient stock
        Long resolvedUserId = (req.getUserId() != null && req.getUserId() > 0) ? req.getUserId() : 4L;
        SupplierProfile sp = supplierProfileRepository.findByUserId(resolvedUserId).orElse(null);
        if (sp == null) {
            List<SupplierProfile> all = supplierProfileRepository.findAll();
            if (!all.isEmpty()) sp = all.get(0);
        }
        if (sp != null) {
            List<Long> districtIds = new ArrayList<>();
            if (sp.getCoveredDistrictIds() != null && !sp.getCoveredDistrictIds().trim().isEmpty()) {
                for (String sid : sp.getCoveredDistrictIds().split(",")) {
                    try {
                        districtIds.add(Long.parseLong(sid.trim()));
                    } catch (NumberFormatException ignored) {}
                }
            }
            if (districtIds.isEmpty() && sp.getPrimaryDistrictId() != null) {
                districtIds.add(sp.getPrimaryDistrictId());
            }

            int availableDepotStock = 0;
            for (Long distId : districtIds) {
                var distInv = districtInventoryRepository.findByDistrictIdAndProductId(distId, product.getProductId());
                availableDepotStock += distInv.map(DistrictInventory::getCurrentStock).orElse(0);
            }

            // 1. Low stock logic: If depot stock is 0 or low (< 5), reject dispatch
            if (availableDepotStock <= 0) {
                return ResponseEntity.badRequest().body(ApiResponse.fail("Cannot dispatch: Supplier depot stock is 0 cases (out of stock). Please request stock from Superadmin first."));
            }
            if (availableDepotStock < 5) {
                return ResponseEntity.badRequest().body(ApiResponse.fail("Cannot dispatch: Supplier depot stock is critically low (" + availableDepotStock + " cases remaining). Minimum reserve is 5 cases. Please restock from Superadmin central catalog first."));
            }
            // 2. Beyond stock limit logic: Cannot give products beyond stock limit
            if (req.getQuantity() > availableDepotStock) {
                return ResponseEntity.badRequest().body(ApiResponse.fail("Cannot dispatch beyond stock limit: You attempted to supply " + req.getQuantity() + " cases, but your depot only holds " + availableDepotStock + " cases. Adjust the quantity to at most " + availableDepotStock + " cases."));
            }
        }

        // Find or create inventory row
        Optional<ShopInventory> invOpt = inventoryRepository.findByBranchIdAndProductId(outlet.getOutletId(), product.getProductId());
        ShopInventory inventory;
        int previousStock = 0;
        int newStock;

        if (invOpt.isPresent()) {
            inventory = invOpt.get();
            previousStock = inventory.getStockQuantity();
            if ("SET".equalsIgnoreCase(req.getMode())) {
                newStock = req.getQuantity();
            } else {
                newStock = previousStock + req.getQuantity();
            }
            inventory.setStockQuantity(newStock);
            inventory.setUpdatedDate(LocalDateTime.now());
        } else {
            newStock = req.getQuantity();
            inventory = new ShopInventory(outlet.getOutletId(), product.getProductId(), newStock);
        }

        inventoryRepository.save(inventory);

        // Deduct supplied stock from supplier's district/depot inventory if tracked
        if (sp != null) {
            Long targetDistId = (req.getDistrictId() != null && req.getDistrictId() > 0) ? req.getDistrictId() : sp.getPrimaryDistrictId();
            if (targetDistId != null) {
                districtInventoryRepository.findByDistrictIdAndProductId(targetDistId, product.getProductId()).ifPresent(di -> {
                    int remaining = Math.max(0, di.getCurrentStock() - req.getQuantity());
                    di.setCurrentStock(remaining);
                    districtInventoryRepository.save(di);
                });
            }
        }

        boolean isUnrequestedDirectSupply = (req.getRequisitionId() == null || req.getRequisitionId() <= 0);
        String dispatchRefCode = "DSP-" + System.currentTimeMillis();

        if (!isUnrequestedDirectSupply) {
            try {
                List<Map<String, Object>> rRows = jdbcTemplate.queryForList("SELECT requisition_code FROM outlet_requisitions WHERE id = ?", req.getRequisitionId());
                if (!rRows.isEmpty() && rRows.get(0).get("requisition_code") != null) {
                    dispatchRefCode = rRows.get(0).get("requisition_code").toString();
                } else {
                    dispatchRefCode = "REQ-OUT-" + req.getRequisitionId();
                }
                jdbcTemplate.update(
                    "UPDATE outlet_requisitions SET status = 'DISPATCHED', updated_date = NOW() WHERE id = ?",
                    req.getRequisitionId()
                );
            } catch (Exception ignored) {}
        } else {
            // Auto-log direct unrequested shipment in deliveries ledger so the outlet has a permanent audit trail
            String directCode = "DSP-DIR-" + (100000 + new Random().nextInt(900000));
            dispatchRefCode = directCode;
            try {
                String note = (req.getNotes() != null && !req.getNotes().trim().isEmpty())
                        ? req.getNotes().trim()
                        : "Supplier proactive stock push (Unrequested by outlet)";

                BigDecimal unitPrice = product.getOutletPrice() != null ? product.getOutletPrice() : product.getBasePrice();
                BigDecimal totalAmount = unitPrice != null ? unitPrice.multiply(BigDecimal.valueOf(req.getQuantity())) : BigDecimal.ZERO;

                jdbcTemplate.update(
                    "INSERT INTO outlet_requisitions (requisition_code, outlet_id, product_id, product_name, quantity, unit_price, total_amount, urgency, status, outlet_remarks, admin_supplier_notes, created_date, updated_date) " +
                    "VALUES (?, ?, ?, ?, ?, ?, ?, 'DIRECT_SUPPLY', 'DISPATCHED', 'Direct Supplier Push (Unrequested)', ?, NOW(), NOW())",
                    directCode,
                    outlet.getOutletId(),
                    product.getProductId(),
                    product.getBrand() + " " + product.getFlavorVariant(),
                    req.getQuantity(),
                    unitPrice,
                    totalAmount,
                    note
                );
            } catch (Exception ignored) {}
        }

        // Record Wholesale Transaction for Supplier (Tier 2: Supplier sells to Sales Officer at outlet_price)
        final String finalRefCode = dispatchRefCode;
        final SalesOfficer finalOfficer = targetOfficer;
        if (sp != null) {
            try {
                BigDecimal buyPrice = product.getSupplierPrice() != null ? product.getSupplierPrice() : (product.getBasePrice() != null ? product.getBasePrice() : BigDecimal.ZERO);
                BigDecimal sellPrice = product.getOutletPrice() != null ? product.getOutletPrice() : (product.getBasePrice() != null ? product.getBasePrice() : BigDecimal.ZERO);
                BigDecimal wholesaleTotal = sellPrice.multiply(BigDecimal.valueOf(req.getQuantity()));
                BigDecimal unitProfit = sellPrice.subtract(buyPrice);
                BigDecimal totalProfit = unitProfit.multiply(BigDecimal.valueOf(req.getQuantity()));

                String recipientDesc;
                if (finalOfficer != null) {
                    recipientDesc = "Sales Officer " + finalOfficer.getName() + " (" + finalOfficer.getOfficerCode() + ", Area: " + finalOfficer.getAssignedArea() + ")";
                } else if (outlet.getArea() != null && !outlet.getArea().trim().isEmpty()) {
                    List<SalesOfficer> officers = salesOfficerRepository.findBySupplierId(sp.getId());
                    SalesOfficer found = officers.stream()
                            .filter(so -> so.getAssignedArea().equalsIgnoreCase(outlet.getArea().trim()))
                            .findFirst()
                            .orElse(null);
                    if (found != null) {
                        recipientDesc = "Sales Officer " + found.getName() + " (" + found.getOfficerCode() + ", Area: " + found.getAssignedArea() + ")";
                    } else {
                        recipientDesc = "Area Sales Officer (" + outlet.getArea() + ")";
                    }
                } else {
                    recipientDesc = "Area Sales Officer (" + outlet.getOutletName() + ")";
                }

                SupplierTransaction saleTx = new SupplierTransaction(
                    "TXN-OUT-" + System.currentTimeMillis() + "-" + (100 + new Random().nextInt(900)),
                    sp.getId(),
                    null,
                    null,
                    finalRefCode,
                    "OUTLET_SALE",
                    "CREDIT",
                    wholesaleTotal,
                    "OUTLET_WHOLESALE",
                    String.format("Wholesale delivery of %d units of %s %s to %s @ ৳%.2f/unit. (Buy rate: ৳%.2f, Profit: +৳%.2f)",
                        req.getQuantity(), product.getBrand(), product.getFlavorVariant(), recipientDesc,
                        sellPrice.doubleValue(), buyPrice.doubleValue(), totalProfit.doubleValue()),
                    "COMPLETED"
                );
                supplierTransactionRepository.saveAndFlush(saleTx);

                // Credit supplier wallet balance for earned wholesale delivery revenue
                BigDecimal cur = sp.getWalletBalance() != null ? sp.getWalletBalance() : BigDecimal.ZERO;
                sp.setWalletBalance(cur.add(wholesaleTotal));
                supplierProfileRepository.saveAndFlush(sp);
                try {
                    jdbcTemplate.update("UPDATE supplier_profiles SET wallet_balance = ?, updated_at = NOW() WHERE id = ?", sp.getWalletBalance(), sp.getId());
                } catch (Exception ignored) {}
            } catch (Exception ex) {
                // Ignore transaction audit logging error to preserve core supply flow
            }
        }

        // Recalculate total product stock
        Integer totalStock = inventoryRepository.getTotalStockByProductId(product.getProductId());
        if (totalStock == null) totalStock = newStock;

        Map<String, Object> result = new HashMap<>();
        result.put("success", true);
        result.put("message", "Successfully supplied " + req.getQuantity() + " units of " 
                + product.getBrand() + " " + product.getFlavorVariant() 
                + " to " + outlet.getOutletName());
        result.put("product_id", product.getProductId());
        result.put("product_name", product.getBrand() + " " + product.getFlavorVariant());
        result.put("outlet_id", outlet.getOutletId());
        result.put("outlet_name", outlet.getOutletName());
        result.put("location_address", outlet.getLocationAddress());
        result.put("supplied_amount", req.getQuantity());
        result.put("previous_outlet_stock", previousStock);
        result.put("current_outlet_stock", newStock);
        result.put("total_product_stock", totalStock);
        result.put("timestamp", LocalDateTime.now().toString());

        return ResponseEntity.ok(result);
        } catch (Exception ex) {
            System.err.println("[InventoryController Error] supplyStockToOutlet failed: " + ex.getMessage());
            ex.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.fail("Failed to dispatch inventory: " + ex.getMessage()));
        }
    }

    /**
     * Stock distribution view across all products and database outlets for Superadmin and Supplier
     */
    @GetMapping("/distribution")
    public ResponseEntity<List<Map<String, Object>>> getStockDistribution() {
        List<Product> products = productRepository.findAll();
        List<Outlet> outlets = outletRepository.findAll();
        List<Map<String, Object>> response = new ArrayList<>();

        for (Product p : products) {
            Map<String, Object> prodMap = new HashMap<>();
            prodMap.put("product_id", p.getProductId());
            prodMap.put("brand", p.getBrand());
            prodMap.put("flavor_variant", p.getFlavorVariant());
            prodMap.put("sku", p.getSku());
            prodMap.put("base_price", p.getBasePrice());
            prodMap.put("supplier_price", p.getSupplierPrice() != null ? p.getSupplierPrice() : p.getBasePrice());
            prodMap.put("outlet_price", p.getOutletPrice() != null ? p.getOutletPrice() : p.getBasePrice());
            prodMap.put("retail_price", p.getRetailPrice() != null ? p.getRetailPrice() : p.getBasePrice());
            prodMap.put("image_url", p.getImageUrl());
            prodMap.put("expiry_date", p.getExpiryDate() != null ? p.getExpiryDate().toString() : null);

            List<Map<String, Object>> outletAllocations = new ArrayList<>();
            int totalStock = 0;

            for (Outlet o : outlets) {
                var invOpt = inventoryRepository.findByBranchIdAndProductId(o.getOutletId(), p.getProductId());
                int stock = invOpt.map(ShopInventory::getStockQuantity).orElse(0);
                totalStock += stock;

                Map<String, Object> outMap = new HashMap<>();
                outMap.put("outlet_id", o.getOutletId());
                outMap.put("outlet_name", o.getOutletName());
                outMap.put("location_address", o.getLocationAddress());
                outMap.put("contact_phone", o.getContactPhone());
                outMap.put("stock_quantity", stock);
                outMap.put("status", o.getStatus());
                outMap.put("last_updated", invOpt.map(i -> i.getUpdatedDate().toString()).orElse("N/A"));
                outletAllocations.add(outMap);
            }

            prodMap.put("total_stock", totalStock);
            prodMap.put("outlet_allocations", outletAllocations);
            response.add(prodMap);
        }

        return ResponseEntity.ok(response);
    }

    /**
     * Get real-time inventory and stats for a specific outlet branch
     */
    @GetMapping("/outlet/{outletId}")
    public ResponseEntity<?> getOutletInventory(@PathVariable Long outletId) {
        Optional<Outlet> outletOpt = outletRepository.findById(outletId);
        if (outletOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ApiResponse.fail("Outlet not found"));
        }
        Outlet outlet = outletOpt.get();

        List<Product> products = productRepository.findAll();
        List<Map<String, Object>> productList = new ArrayList<>();
        int totalUnits = 0;
        int lowStockCount = 0;
        int outOfStockCount = 0;

        for (Product p : products) {
            var invOpt = inventoryRepository.findByBranchIdAndProductId(outletId, p.getProductId());
            int stock = invOpt.map(ShopInventory::getStockQuantity).orElse(0);
            totalUnits += stock;
            if (stock == 0) outOfStockCount++;
            else if (stock <= 15) lowStockCount++;

            Map<String, Object> pMap = new HashMap<>();
            pMap.put("product_id", p.getProductId());
            pMap.put("brand", p.getBrand());
            pMap.put("flavor_variant", p.getFlavorVariant());
            pMap.put("packaging", p.getPackaging());
            pMap.put("size_volume", p.getSizeVolume());
            pMap.put("sku", p.getSku());
            pMap.put("base_price", p.getBasePrice());
            pMap.put("supplier_price", p.getSupplierPrice() != null ? p.getSupplierPrice() : p.getBasePrice());
            pMap.put("outlet_price", p.getOutletPrice() != null ? p.getOutletPrice() : (p.getBasePrice() != null ? p.getBasePrice().multiply(BigDecimal.valueOf(1.15)).setScale(2, java.math.RoundingMode.HALF_UP) : BigDecimal.valueOf(30)));
            pMap.put("retail_price", p.getRetailPrice() != null ? p.getRetailPrice() : (p.getBasePrice() != null ? p.getBasePrice().multiply(BigDecimal.valueOf(1.32)).setScale(2, java.math.RoundingMode.HALF_UP) : BigDecimal.valueOf(35)));
            pMap.put("category", p.getCategory());
            pMap.put("image_url", p.getImageUrl());
            pMap.put("stock_quantity", stock);
            pMap.put("in_stock", stock > 0);
            pMap.put("status", stock == 0 ? "OUT_OF_STOCK" : (stock <= 15 ? "LOW_STOCK" : "IN_STOCK"));
            pMap.put("last_updated", invOpt.map(i -> i.getUpdatedDate().toString()).orElse(null));
            productList.add(pMap);
        }

        // Today's sales summary for this outlet
        double todaySalesRevenue = 0.0;
        int todaySalesCount = 0;
        try {
            Map<String, Object> salesSummary = jdbcTemplate.queryForMap(
                "SELECT COALESCE(SUM(total_amount), 0) AS total_revenue, COUNT(*) AS count " +
                "FROM outlet_sales WHERE outlet_id = ? AND DATE(sale_date) = CURDATE()",
                outletId
            );
            if (salesSummary.get("total_revenue") != null) {
                todaySalesRevenue = ((Number) salesSummary.get("total_revenue")).doubleValue();
            }
            if (salesSummary.get("count") != null) {
                todaySalesCount = ((Number) salesSummary.get("count")).intValue();
            }
        } catch (Exception ignored) {}

        Map<String, Object> kpi = new HashMap<>();
        kpi.put("total_products", products.size());
        kpi.put("total_stock_units", totalUnits);
        kpi.put("low_stock_count", lowStockCount);
        kpi.put("out_of_stock_count", outOfStockCount);
        kpi.put("today_sales_revenue", todaySalesRevenue);
        kpi.put("today_sales_count", todaySalesCount);

        Map<String, Object> res = new HashMap<>();
        res.put("outlet", outlet);
        res.put("products", productList);
        res.put("kpi", kpi);

        return ResponseEntity.ok(res);
    }

    /**
     * Outlet records customer sale of beverages (Point of Sale checkout)
     */
    @PostMapping("/outlet/{outletId}/sell")
    public ResponseEntity<?> recordOutletSale(@PathVariable Long outletId, @RequestBody Map<String, Object> req) {
        if (!req.containsKey("product_id") || req.get("product_id") == null) {
            return ResponseEntity.badRequest().body(ApiResponse.fail("Product ID is required."));
        }
        Long productId = Long.parseLong(req.get("product_id").toString());
        int qty = 1;
        if (req.containsKey("quantity") && req.get("quantity") != null) {
            qty = Integer.parseInt(req.get("quantity").toString());
        }
        if (qty <= 0) {
            return ResponseEntity.badRequest().body(ApiResponse.fail("Quantity must be greater than 0."));
        }

        Optional<Outlet> outletOpt = outletRepository.findById(outletId);
        if (outletOpt.isEmpty()) return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ApiResponse.fail("Outlet not found."));
        Outlet outlet = outletOpt.get();

        Optional<Product> prodOpt = productRepository.findById(productId);
        if (prodOpt.isEmpty()) return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ApiResponse.fail("Product not found."));
        Product product = prodOpt.get();

        var invOpt = inventoryRepository.findByBranchIdAndProductId(outletId, productId);
        int currentStock = invOpt.map(ShopInventory::getStockQuantity).orElse(0);

        if (currentStock < qty) {
            return ResponseEntity.badRequest().body(ApiResponse.fail("Insufficient shelf stock! Available: " + currentStock + " units, Requested to sell: " + qty));
        }

        int newStock = currentStock - qty;
        ShopInventory inv;
        if (invOpt.isPresent()) {
            inv = invOpt.get();
            inv.setStockQuantity(newStock);
            inv.setUpdatedDate(LocalDateTime.now());
        } else {
            inv = new ShopInventory(outletId, productId, newStock);
        }
        inventoryRepository.save(inv);

        // Calculate pricing - Tier 3: Outlet sells to customer at retail_price (MRP)
        BigDecimal unitPrice = product.getRetailPrice() != null ? product.getRetailPrice() : (product.getBasePrice() != null ? product.getBasePrice() : BigDecimal.valueOf(25.0));
        BigDecimal totalAmount = unitPrice.multiply(BigDecimal.valueOf(qty));
        String paymentMethod = req.getOrDefault("payment_method", "Cash").toString();
        String customerNotes = req.getOrDefault("customer_notes", "").toString();
        String saleCode = "SL-" + System.currentTimeMillis();
        String prodName = product.getBrand() + " " + product.getFlavorVariant();

        try {
            jdbcTemplate.update(
                "INSERT INTO outlet_sales (sale_code, outlet_id, product_id, product_name, quantity, unit_price, total_amount, payment_method, customer_notes, sale_date) " +
                "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())",
                saleCode, outletId, productId, prodName, qty, unitPrice, totalAmount, paymentMethod, customerNotes
            );
        } catch (Exception e) {
            System.err.println("[InventoryController] Failed to insert into outlet_sales: " + e.getMessage());
        }

        // Notify Outlet in real time of new customer sale
        try {
            com.fizzdrop.entity.AppNotification saleNotif = new com.fizzdrop.entity.AppNotification();
            saleNotif.setRecipientRole("OUTLET");
            saleNotif.setTitle("New Customer Order: " + prodName);
            saleNotif.setMessage("Customer ordered " + qty + " units of " + prodName + " for ৳" + totalAmount + " (" + paymentMethod + "). Shelf stock & revenue updated!");
            saleNotif.setType("APPROVED");
            saleNotif.setReferenceCode(saleCode);
            saleNotif.setReferenceId(outletId);
            notificationRepository.save(saleNotif);
        } catch (Exception ignored) {}

        Map<String, Object> res = new HashMap<>();
        res.put("success", true);
        res.put("message", "Sale recorded successfully!");
        res.put("sale_code", saleCode);
        res.put("product_name", prodName);
        res.put("quantity_sold", qty);
        res.put("unit_price", unitPrice);
        res.put("total_amount", totalAmount);
        res.put("payment_method", paymentMethod);
        res.put("previous_stock", currentStock);
        res.put("remaining_stock", newStock);
        res.put("outlet_name", outlet.getOutletName());
        res.put("timestamp", LocalDateTime.now().toString());

        return ResponseEntity.ok(res);
    }

    /**
     * Get recent sales transactions for this outlet
     */
    @GetMapping("/outlet/{outletId}/sales")
    public ResponseEntity<?> getOutletSalesHistory(@PathVariable Long outletId) {
        try {
            List<Map<String, Object>> sales = jdbcTemplate.queryForList(
                "SELECT id, sale_code, outlet_id, product_id, product_name, quantity, unit_price, total_amount, payment_method, customer_notes, sale_date " +
                "FROM outlet_sales WHERE outlet_id = ? ORDER BY sale_date DESC LIMIT 50",
                outletId
            );
            return ResponseEntity.ok(sales);
        } catch (Exception e) {
            return ResponseEntity.ok(Collections.emptyList());
        }
    }

    /**
     * Outlet manager adjusts or counts stock
     */
    @PostMapping("/outlet/{outletId}/adjust")
    public ResponseEntity<?> adjustOutletStock(@PathVariable Long outletId, @RequestBody Map<String, Object> req) {
        if (!req.containsKey("product_id") || req.get("product_id") == null) {
            return ResponseEntity.badRequest().body(ApiResponse.fail("Product ID is required."));
        }
        Long productId = Long.parseLong(req.get("product_id").toString());
        int newStock = 0;
        if (req.containsKey("quantity") && req.get("quantity") != null) {
            newStock = Math.max(0, Integer.parseInt(req.get("quantity").toString()));
        }

        var invOpt = inventoryRepository.findByBranchIdAndProductId(outletId, productId);
        ShopInventory inv;
        if (invOpt.isPresent()) {
            inv = invOpt.get();
            inv.setStockQuantity(newStock);
            inv.setUpdatedDate(LocalDateTime.now());
        } else {
            inv = new ShopInventory(outletId, productId, newStock);
        }
        inventoryRepository.save(inv);

        return ResponseEntity.ok(Map.of("success", true, "message", "Stock count updated to " + newStock, "new_stock", newStock));
    }

    /**
     * Outlet requests stock requisition from regional supplier
     */
    @PostMapping("/outlet/{outletId}/requisitions")
    public ResponseEntity<?> createOutletRequisition(@PathVariable Long outletId, @RequestBody Map<String, Object> req) {
        if (!req.containsKey("product_id") || req.get("product_id") == null) {
            return ResponseEntity.badRequest().body(ApiResponse.fail("Product ID is required."));
        }
        Long productId = Long.parseLong(req.get("product_id").toString());
        int qty = 50;
        if (req.containsKey("quantity") && req.get("quantity") != null) {
            qty = Integer.parseInt(req.get("quantity").toString());
        }
        String urgency = req.getOrDefault("urgency", "NORMAL").toString();
        String remarks = req.getOrDefault("remarks", "").toString();

        Optional<Outlet> outletOpt = outletRepository.findById(outletId);
        if (outletOpt.isEmpty()) return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ApiResponse.fail("Outlet not found."));
        Outlet outlet = outletOpt.get();

        Optional<Product> prodOpt = productRepository.findById(productId);
        if (prodOpt.isEmpty()) return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ApiResponse.fail("Product not found."));
        Product product = prodOpt.get();

        String reqCode = "OUT-REQ-" + (System.currentTimeMillis() % 1000000);
        String prodName = product.getBrand() + " " + product.getFlavorVariant();

        BigDecimal unitPrice = product.getOutletPrice() != null ? product.getOutletPrice() : product.getBasePrice();
        BigDecimal totalAmount = unitPrice != null ? unitPrice.multiply(BigDecimal.valueOf(qty)) : BigDecimal.ZERO;

        try {
            jdbcTemplate.update(
                "INSERT INTO outlet_requisitions (requisition_code, outlet_id, product_id, product_name, quantity, unit_price, total_amount, urgency, status, outlet_remarks, created_date, updated_date) " +
                "VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', ?, NOW(), NOW())",
                reqCode, outletId, productId, prodName, qty, unitPrice, totalAmount, urgency, remarks
            );
        } catch (Exception ignored) {}

        Map<String, Object> res = new HashMap<>();
        res.put("success", true);
        res.put("message", "Requisition " + reqCode + " submitted to Regional Supplier!");
        res.put("requisition_code", reqCode);
        res.put("outlet_name", outlet.getOutletName());
        res.put("product_name", prodName);
        res.put("quantity", qty);
        res.put("urgency", urgency);

        return ResponseEntity.ok(res);
    }

    /**
     * Get outlet requisitions history
     */
    @GetMapping("/outlet/{outletId}/requisitions")
    public ResponseEntity<?> getOutletRequisitions(@PathVariable Long outletId) {
        try {
            List<Map<String, Object>> reqs = jdbcTemplate.queryForList(
                "SELECT id, requisition_code, outlet_id, product_id, product_name, quantity, urgency, status, outlet_remarks, admin_supplier_notes, created_date, updated_date " +
                "FROM outlet_requisitions WHERE outlet_id = ? ORDER BY created_date DESC LIMIT 50",
                outletId
            );
            return ResponseEntity.ok(reqs);
        } catch (Exception e) {
            return ResponseEntity.ok(Collections.emptyList());
        }
    }

    /**
     * Get all incoming outlet requisitions for regional supplier with live available depot stock
     */
    @GetMapping("/supplier/outlet-requisitions")
    public ResponseEntity<?> getSupplierOutletRequisitions(@RequestParam(required = false) Long userId) {
        Long resolvedUserId = (userId != null && userId > 0) ? userId : 4L;
        SupplierProfile sp = supplierProfileRepository.findByUserId(resolvedUserId).orElse(null);
        if (sp == null) {
            List<SupplierProfile> all = supplierProfileRepository.findAll();
            if (!all.isEmpty()) sp = all.get(0);
        }

        List<Long> districtIds = new ArrayList<>();
        if (sp != null) {
            if (sp.getCoveredDistrictIds() != null && !sp.getCoveredDistrictIds().trim().isEmpty()) {
                for (String sid : sp.getCoveredDistrictIds().split(",")) {
                    try { districtIds.add(Long.parseLong(sid.trim())); } catch (Exception ignored) {}
                }
            }
            if (districtIds.isEmpty() && sp.getPrimaryDistrictId() != null) {
                districtIds.add(sp.getPrimaryDistrictId());
            }
        }
        if (districtIds.isEmpty()) districtIds.add(1L);

        List<Map<String, Object>> list;
        try {
            list = jdbcTemplate.queryForList(
                "SELECT r.id, r.requisition_code, r.outlet_id, r.product_id, r.product_name, " +
                "r.quantity, r.unit_price, r.total_amount, r.urgency, r.status, r.outlet_remarks, r.created_date, r.updated_date, " +
                "o.outlet_name, o.franchise_name, o.branch_name, o.city, o.area, o.location_address, o.contact_phone, o.district_id " +
                "FROM outlet_requisitions r " +
                "JOIN outlets o ON r.outlet_id = o.outlet_id " +
                "ORDER BY r.created_date DESC LIMIT 100"
            );
        } catch (Exception e) {
            return ResponseEntity.ok(Collections.emptyList());
        }

        List<SalesOfficer> officers = (sp != null) ? salesOfficerRepository.findBySupplierId(sp.getId()) : Collections.emptyList();

        List<Map<String, Object>> response = new ArrayList<>();
        for (Map<String, Object> row : list) {
            Map<String, Object> map = new HashMap<>(row);
            Long prodId = ((Number) row.get("product_id")).longValue();

            // Calculate supplier's available depot stock for this product
            int availableStock = 0;
            for (Long distId : districtIds) {
                var di = districtInventoryRepository.findByDistrictIdAndProductId(distId, prodId);
                availableStock += di.map(DistrictInventory::getCurrentStock).orElse(0);
            }
            map.put("supplier_available_stock", availableStock);
            map.put("can_dispatch", availableStock > 0);

            // Associate with Superadmin-assigned Sales Officer for this area
            String oArea = row.get("area") != null ? row.get("area").toString().toLowerCase().trim() : "";
            SalesOfficer matchedSO = officers.stream()
                    .filter(so -> !oArea.isEmpty() && (oArea.contains(so.getAssignedArea().toLowerCase().trim()) || so.getAssignedArea().toLowerCase().trim().contains(oArea)))
                    .findFirst()
                    .orElse(officers.isEmpty() ? null : officers.get(0));

            if (matchedSO != null) {
                map.put("sales_officer_id", matchedSO.getId());
                map.put("sales_officer_name", matchedSO.getName());
                map.put("sales_officer_code", matchedSO.getOfficerCode());
                map.put("sales_officer_area", matchedSO.getAssignedArea());
                map.put("sales_officer_phone", matchedSO.getPhone());
            } else {
                map.put("sales_officer_name", "Area Sales Officer (" + (row.get("area") != null ? row.get("area") : "Assigned Zone") + ")");
            }

            response.add(map);
        }

        return ResponseEntity.ok(response);
    }

    /**
     * Supplier fulfills / dispatches stock for an outlet requisition
     */
    @PostMapping("/supplier/outlet-requisitions/{id}/dispatch")
    public ResponseEntity<?> fulfillOutletRequisition(
            @PathVariable Long id,
            @RequestBody(required = false) Map<String, Object> body) {

        List<Map<String, Object>> reqRows = jdbcTemplate.queryForList("SELECT * FROM outlet_requisitions WHERE id = ?", id);
        if (reqRows.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ApiResponse.fail("Outlet requisition not found."));
        }
        Map<String, Object> reqRow = reqRows.get(0);
        Long outletId = ((Number) reqRow.get("outlet_id")).longValue();
        Long productId = ((Number) reqRow.get("product_id")).longValue();
        int requestedQty = ((Number) reqRow.get("quantity")).intValue();

        int dispatchQty = requestedQty;
        if (body != null && body.containsKey("quantity") && body.get("quantity") != null) {
            try { dispatchQty = Integer.parseInt(body.get("quantity").toString()); } catch (Exception ignored) {}
        }
        Long userId = (body != null && body.containsKey("user_id") && body.get("user_id") != null) ? Long.parseLong(body.get("user_id").toString()) : 4L;

        // If supplier adjusted product price, update Product entity so Superadmin sees it
        if (body != null && body.containsKey("unit_price") && body.get("unit_price") != null) {
            try {
                BigDecimal updatedPrice = new BigDecimal(body.get("unit_price").toString());
                if (updatedPrice.compareTo(BigDecimal.ZERO) > 0) {
                    Product prod = productRepository.findById(productId).orElse(null);
                    if (prod != null) {
                        prod.setOutletPrice(updatedPrice);
                        productRepository.save(prod);
                        // Also update requisition unit price and total amount
                        jdbcTemplate.update("UPDATE outlet_requisitions SET unit_price = ?, total_amount = ? WHERE id = ?",
                                updatedPrice, updatedPrice.multiply(BigDecimal.valueOf(dispatchQty)), id);
                    }
                }
            } catch (Exception ignored) {}
        }

        SupplyRequest supplyReq = new SupplyRequest(outletId, productId, dispatchQty, "ADD");
        supplyReq.setUserId(userId);
        supplyReq.setRequisitionId(id);

        if (body != null && (body.containsKey("sales_officer_id") || body.containsKey("salesOfficerId"))) {
            Object soObj = body.get("sales_officer_id") != null ? body.get("sales_officer_id") : body.get("salesOfficerId");
            try { supplyReq.setSalesOfficerId(Long.parseLong(soObj.toString())); } catch (Exception ignored) {}
        }

        supplyReq.setNotes(body != null && body.containsKey("notes") && body.get("notes") != null ? body.get("notes").toString() : "Fulfilling requisition " + reqRow.get("requisition_code"));

        return supplyStockToOutlet(supplyReq);
    }
}
