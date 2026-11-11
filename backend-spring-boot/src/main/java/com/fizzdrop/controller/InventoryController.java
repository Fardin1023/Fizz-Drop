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
import com.fizzdrop.entity.PreSalesOfficer;
import com.fizzdrop.repository.PreSalesOfficerRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import org.springframework.jdbc.core.JdbcTemplate;
import com.fizzdrop.repository.AppNotificationRepository;
import com.fizzdrop.entity.AppNotification;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

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
    private final PreSalesOfficerRepository psrRepository;

    public InventoryController(ShopInventoryRepository inventoryRepository,
                               ProductRepository productRepository,
                               OutletRepository outletRepository,
                               DistrictInventoryRepository districtInventoryRepository,
                               SupplierProfileRepository supplierProfileRepository,
                               JdbcTemplate jdbcTemplate,
                               AppNotificationRepository notificationRepository,
                               SupplierTransactionRepository supplierTransactionRepository,
                               SalesOfficerRepository salesOfficerRepository,
                               PreSalesOfficerRepository psrRepository) {
        this.inventoryRepository = inventoryRepository;
        this.productRepository = productRepository;
        this.outletRepository = outletRepository;
        this.districtInventoryRepository = districtInventoryRepository;
        this.supplierProfileRepository = supplierProfileRepository;
        this.jdbcTemplate = jdbcTemplate;
        this.notificationRepository = notificationRepository;
        this.supplierTransactionRepository = supplierTransactionRepository;
        this.salesOfficerRepository = salesOfficerRepository;
        this.psrRepository = psrRepository;
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

        // Verify outlet exists in database or fallback to territory outlet
        Optional<Outlet> outletOpt = req.getOutletId() != null ? outletRepository.findById(req.getOutletId()) : Optional.empty();
        Outlet outlet = null;
        if (outletOpt.isPresent()) {
            outlet = outletOpt.get();
        } else if (targetOfficer != null) {
            String soArea = targetOfficer.getAssignedArea().toLowerCase().trim();
            outlet = outletRepository.findAll().stream()
                    .filter(o -> {
                        String oArea = o.getArea() != null ? o.getArea().toLowerCase().trim() : "";
                        return !soArea.isEmpty() && (oArea.contains(soArea) || soArea.contains(oArea));
                    })
                    .findFirst()
                    .orElse(outletRepository.findAll().stream().findFirst().orElse(null));
        } else {
            outlet = outletRepository.findAll().stream().findFirst().orElse(null);
        }
        if (outlet == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiResponse.fail("Outlet destination not found in database"));
        }
        req.setOutletId(outlet.getOutletId());

        boolean isUnrequestedDirectSupply = (req.getRequisitionId() == null || req.getRequisitionId() <= 0);

        // Enforce supplier depot stock validation ONLY for direct proactive push (outlet requisitions are dispatched from SO purchased buffer stock)
        Long resolvedUserId = (req.getUserId() != null && req.getUserId() > 0) ? req.getUserId() : 4L;
        SupplierProfile sp = supplierProfileRepository.findByUserId(resolvedUserId).orElse(null);
        if (sp == null) {
            List<SupplierProfile> all = supplierProfileRepository.findAll();
            if (!all.isEmpty()) sp = all.get(0);
        }
        if (isUnrequestedDirectSupply && sp != null) {
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

            // 1. Depot stock validation: reject if out of stock
            if (availableDepotStock <= 0) {
                return ResponseEntity.badRequest().body(ApiResponse.fail("Cannot dispatch: Supplier depot stock is 0 cases (out of stock). Please request stock from Superadmin first."));
            }
            // 2. Beyond stock limit logic: Cannot give products beyond available depot stock
            if (req.getQuantity() > availableDepotStock) {
                return ResponseEntity.badRequest().body(ApiResponse.fail("Cannot dispatch beyond stock limit: You attempted to supply " + req.getQuantity() + " cases, but your depot only holds " + availableDepotStock + " cases. Adjust the quantity to at most " + availableDepotStock + " cases."));
            }
        }

        // Ensure governing Sales Officer is identified
        if (targetOfficer == null && outlet != null) {
            String oArea = outlet.getArea() != null ? outlet.getArea().toLowerCase().trim() : "";
            List<SalesOfficer> officers = salesOfficerRepository.findAll();
            targetOfficer = officers.stream()
                    .filter(so -> !oArea.isEmpty() && (oArea.contains(so.getAssignedArea().toLowerCase().trim()) || so.getAssignedArea().toLowerCase().trim().contains(oArea)))
                    .findFirst()
                    .orElse(officers.isEmpty() ? null : officers.get(0));
        }

        // ENFORCE RULE: The supplier should only dispatch the products to the outlet that has been purchased by the SO!
        if (targetOfficer != null) {
            int soPurchasedStock = getSalesOfficerPurchasedStock(targetOfficer.getId(), product.getProductId());
            if (soPurchasedStock <= 0) {
                return ResponseEntity.badRequest().body(ApiResponse.fail(
                    "Cannot dispatch: Product '" + product.getBrand() + " " + product.getFlavorVariant() + 
                    "' has not been purchased by territory Sales Officer (" + targetOfficer.getName() + 
                    "). The Sales Officer must purchase stock from the Regional Supplier first."
                ));
            }
            if (req.getQuantity() > soPurchasedStock) {
                return ResponseEntity.badRequest().body(ApiResponse.fail(
                    "Cannot dispatch beyond SO purchased stock: Territory Sales Officer " + targetOfficer.getName() + 
                    " holds only " + soPurchasedStock + " cases of '" + product.getBrand() + " " + product.getFlavorVariant() + 
                    "' in buffer stock, but " + req.getQuantity() + " cases were requested."
                ));
            }
            // Deduct dispatched stock from SO purchased buffer
            try {
                jdbcTemplate.update(
                    "UPDATE sales_officer_inventory SET current_stock = GREATEST(0, current_stock - ?), total_distributed = total_distributed + ?, updated_at = NOW() " +
                    "WHERE sales_officer_id = ? AND product_id = ?",
                    req.getQuantity(), req.getQuantity(), targetOfficer.getId(), product.getProductId()
                );
            } catch (Exception ignored) {}
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

        // Deduct supplied stock from supplier's district/depot inventory ONLY for direct unrequested push (outlet requisitions are deducted from SO buffer)
        if (isUnrequestedDirectSupply && sp != null) {
            Long targetDistId = (req.getDistrictId() != null && req.getDistrictId() > 0) ? req.getDistrictId() : sp.getPrimaryDistrictId();
            if (targetDistId != null) {
                districtInventoryRepository.findByDistrictIdAndProductId(targetDistId, product.getProductId()).ifPresent(di -> {
                    int remaining = Math.max(0, di.getCurrentStock() - req.getQuantity());
                    di.setCurrentStock(remaining);
                    districtInventoryRepository.save(di);
                });
            }
        }

        String dispatchRefCode = "DSP-" + System.currentTimeMillis();

        if (!isUnrequestedDirectSupply) {
            try {
                List<Map<String, Object>> rRows = jdbcTemplate.queryForList("SELECT requisition_code, sales_officer_id, unit_price FROM outlet_requisitions WHERE id = ?", req.getRequisitionId());
                BigDecimal finalUnitPrice = product.getOutletPrice() != null ? product.getOutletPrice() : (product.getBasePrice() != null ? product.getBasePrice() : BigDecimal.ZERO);
                if (!rRows.isEmpty()) {
                    if (rRows.get(0).get("requisition_code") != null) {
                        dispatchRefCode = rRows.get(0).get("requisition_code").toString();
                    } else {
                        dispatchRefCode = "REQ-OUT-" + req.getRequisitionId();
                    }
                    if (targetOfficer == null && rRows.get(0).get("sales_officer_id") != null) {
                        try {
                            Long soId = ((Number) rRows.get(0).get("sales_officer_id")).longValue();
                            targetOfficer = salesOfficerRepository.findById(soId).orElse(null);
                        } catch (Exception ignored) {}
                    }
                    if (rRows.get(0).get("unit_price") != null) {
                        try {
                            finalUnitPrice = new BigDecimal(rRows.get(0).get("unit_price").toString());
                        } catch (Exception ignored) {}
                    }
                }
                BigDecimal finalTotal = finalUnitPrice.multiply(BigDecimal.valueOf(req.getQuantity()));
                jdbcTemplate.update(
                    "UPDATE outlet_requisitions SET status = 'DISPATCHED', quantity = ?, unit_price = ?, total_amount = ?, updated_date = NOW() WHERE id = ?",
                    req.getQuantity(), finalUnitPrice, finalTotal, req.getRequisitionId()
                );

                // Update corresponding PSR order status to DISPATCHED
                try {
                    jdbcTemplate.update(
                        "UPDATE psr_orders SET status = 'DISPATCHED', updated_at = NOW() WHERE order_code = ? OR (outlet_id = ? AND product_id = ? AND status IN ('SUBMITTED_TO_SO', 'REQUESTED_FROM_SUPPLIER', 'APPROVED_BY_SO'))",
                        dispatchRefCode, outlet.getOutletId(), product.getProductId()
                    );
                } catch (Exception ex) {
                    System.err.println("[InventoryController] Failed to update psr_orders status: " + ex.getMessage());
                }
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

        // Record Sales Officer Profit & Distribution Ledger when Supplier dispatches to outlet from SO purchased stock
        BigDecimal soCostPrice = product.getSupplierPrice() != null ? product.getSupplierPrice() : BigDecimal.valueOf(35);
        BigDecimal soSalePrice = product.getOutletPrice() != null ? product.getOutletPrice() : soCostPrice.multiply(BigDecimal.valueOf(1.15));
        BigDecimal finalUnitPriceCalc = product.getOutletPrice() != null ? product.getOutletPrice() : (product.getBasePrice() != null ? product.getBasePrice() : BigDecimal.ZERO);
        if (finalUnitPriceCalc.compareTo(BigDecimal.ZERO) > 0) {
            soSalePrice = finalUnitPriceCalc;
        }
        BigDecimal soTotalCost = soCostPrice.multiply(BigDecimal.valueOf(req.getQuantity()));
        BigDecimal soTotalRevenue = soSalePrice.multiply(BigDecimal.valueOf(req.getQuantity()));
        BigDecimal soProfitEarned = soTotalRevenue.subtract(soTotalCost);

        if (targetOfficer != null) {
            try {
                List<Map<String, Object>> existingDist = jdbcTemplate.queryForList(
                    "SELECT id FROM sales_officer_distributions WHERE notes LIKE ?",
                    "%" + dispatchRefCode + "%"
                );
                if (existingDist.isEmpty()) {
                    jdbcTemplate.update(
                        "INSERT INTO sales_officer_distributions (sales_officer_id, outlet_id, product_id, quantity, cost_price, sale_price, total_cost, total_revenue, profit_earned, notes, distribution_date) " +
                        "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())",
                        targetOfficer.getId(), outlet.getOutletId(), product.getProductId(), req.getQuantity(),
                        soCostPrice, soSalePrice, soTotalCost, soTotalRevenue, soProfitEarned,
                        "Dispatched by Supplier from SO purchased stock to " + outlet.getOutletName() + " (" + dispatchRefCode + ")"
                    );
                }
            } catch (Exception ex) {
                System.err.println("[InventoryController] Failed to record sales_officer_distributions: " + ex.getMessage());
            }

            // Real-time notification for Sales Officer confirming stock dispatched to outlet by Supplier
            try {
                AppNotification soDispatchedNotif = new AppNotification();
                soDispatchedNotif.setRecipientRole("SALES_OFFICER");
                soDispatchedNotif.setRecipientUserId(targetOfficer.getUserId() != null ? targetOfficer.getUserId() : (100L + targetOfficer.getId()));
                soDispatchedNotif.setTitle("Stock Dispatched by Supplier to " + outlet.getOutletName());
                soDispatchedNotif.setMessage("Supplier has dispatched " + req.getQuantity() + " cases of " 
                        + product.getBrand() + " " + product.getFlavorVariant() 
                        + " to " + outlet.getOutletName() 
                        + " from your purchased stock. Profit (+৳" + String.format(Locale.US, "%.2f", soProfitEarned.doubleValue()) 
                        + ") credited to your wholesale ledger.");
                soDispatchedNotif.setType("SUPPLIER_DISPATCHED_TO_OUTLET");
                soDispatchedNotif.setReferenceCode(dispatchRefCode);
                soDispatchedNotif.setReferenceId(targetOfficer.getId());
                notificationRepository.save(soDispatchedNotif);
            } catch (Exception ex) {
                System.err.println("[InventoryController] Failed to create Sales Officer dispatched notification: " + ex.getMessage());
            }

            // Create notification for Sales Officer confirming stock purchase and monthly budget deduction
            try {
                BigDecimal totalSpent = finalUnitPriceCalc.multiply(BigDecimal.valueOf(req.getQuantity()));
                AppNotification soNotif = new AppNotification();
                soNotif.setRecipientRole("SALES_OFFICER");
                soNotif.setRecipientUserId(targetOfficer.getUserId() != null ? targetOfficer.getUserId() : (100L + targetOfficer.getId()));
                soNotif.setTitle("Stock Purchase Confirmed by Supplier");
                soNotif.setMessage("Supplier approved and dispatched " + req.getQuantity() + " cases of " 
                        + product.getBrand() + " " + product.getFlavorVariant() + " @ ৳" + String.format(Locale.US, "%.2f", finalUnitPriceCalc.doubleValue()) 
                        + "/case. ৳" + String.format(Locale.US, "%.2f", totalSpent.doubleValue()) + " has been successfully purchased and deducted from your monthly budget target.");
                soNotif.setType("SALES_OFFICER_PURCHASE_CONFIRMED");
                soNotif.setReferenceCode(dispatchRefCode);
                soNotif.setReferenceId(targetOfficer.getId());
                notificationRepository.save(soNotif);
            } catch (Exception ex) {
                System.err.println("[InventoryController] Failed to create Sales Officer notification: " + ex.getMessage());
            }
        }

        // Notify PSR that Supplier has dispatched the order to outlet
        try {
            final String psrRefCode = dispatchRefCode;
            final String psrOutletName = outlet != null ? outlet.getOutletName() : "Outlet";
            final String psrBrandFlavor = product.getBrand() + " " + product.getFlavorVariant();
            final int psrDispatchQty = req.getQuantity();
            List<Map<String, Object>> psrList = jdbcTemplate.queryForList(
                "SELECT psr_id FROM psr_orders WHERE order_code = ? LIMIT 1", psrRefCode
            );
            if (!psrList.isEmpty() && psrList.get(0).get("psr_id") != null) {
                Long psrId = Long.parseLong(psrList.get(0).get("psr_id").toString());
                psrRepository.findById(psrId).ifPresent(p -> {
                    AppNotification psrNotif = new AppNotification();
                    psrNotif.setRecipientRole("PSR");
                    psrNotif.setRecipientUserId(p.getUserId() != null ? p.getUserId() : (200L + p.getId()));
                    psrNotif.setTitle("Order " + psrRefCode + " Dispatched by Supplier");
                    psrNotif.setMessage("Supplier has dispatched " + psrDispatchQty + " cases of " 
                            + psrBrandFlavor 
                            + " to " + psrOutletName + ".");
                    psrNotif.setType("SUPPLIER_DISPATCHED_TO_OUTLET");
                    psrNotif.setReferenceCode(psrRefCode);
                    psrNotif.setReferenceId(p.getId());
                    notificationRepository.save(psrNotif);
                });
            }
        } catch (Exception ignored) {}

        // Record Wholesale Transaction for Supplier (Tier 2: Supplier sells to Sales Officer at outlet_price)
        final String finalRefCode = dispatchRefCode;
        final SalesOfficer finalOfficer = targetOfficer;
        final Outlet finalOutlet = outlet;
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
                } else if (finalOutlet.getArea() != null && !finalOutlet.getArea().trim().isEmpty()) {
                    List<SalesOfficer> officers = salesOfficerRepository.findBySupplierId(sp.getId());
                    SalesOfficer found = officers.stream()
                            .filter(so -> so.getAssignedArea().equalsIgnoreCase(finalOutlet.getArea().trim()))
                            .findFirst()
                            .orElse(null);
                    if (found != null) {
                        recipientDesc = "Sales Officer " + found.getName() + " (" + found.getOfficerCode() + ", Area: " + found.getAssignedArea() + ")";
                    } else {
                        recipientDesc = "Area Sales Officer (" + finalOutlet.getArea() + ")";
                    }
                } else {
                    recipientDesc = "Area Sales Officer (" + finalOutlet.getOutletName() + ")";
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

        if (targetOfficer != null) {
            result.put("sales_officer_id", targetOfficer.getId());
            result.put("sales_officer_user_id", targetOfficer.getUserId());
            result.put("sales_officer_name", targetOfficer.getName());
            BigDecimal finalUnitPrice = product.getOutletPrice() != null ? product.getOutletPrice() : (product.getBasePrice() != null ? product.getBasePrice() : BigDecimal.ZERO);
            result.put("final_unit_price", finalUnitPrice);
            result.put("final_total_amount", finalUnitPrice.multiply(BigDecimal.valueOf(req.getQuantity())));
            result.put("profit_earned", soProfitEarned);
            result.put("reference_code", dispatchRefCode);
        }

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
        List<ShopInventory> allShopInvs = inventoryRepository.findAll();
        Map<String, ShopInventory> invMap = new HashMap<>();
        for (ShopInventory si : allShopInvs) {
            invMap.put(si.getBranchId() + "_" + si.getProductId(), si);
        }
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
                ShopInventory si = invMap.get(o.getOutletId() + "_" + p.getProductId());
                int stock = si != null ? si.getStockQuantity() : 0;
                totalStock += stock;

                Map<String, Object> outMap = new HashMap<>();
                outMap.put("outlet_id", o.getOutletId());
                outMap.put("outlet_name", o.getOutletName());
                outMap.put("location_address", o.getLocationAddress());
                outMap.put("contact_phone", o.getContactPhone());
                outMap.put("stock_quantity", stock);
                outMap.put("status", o.getStatus());
                outMap.put("last_updated", (si != null && si.getUpdatedDate() != null) ? si.getUpdatedDate().toString() : "N/A");
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
        List<ShopInventory> outletInvs = inventoryRepository.findByBranchId(outletId);
        Map<Long, ShopInventory> invMap = new HashMap<>();
        for (ShopInventory si : outletInvs) {
            invMap.put(si.getProductId(), si);
        }

        List<Map<String, Object>> productList = new ArrayList<>();
        int totalUnits = 0;
        int lowStockCount = 0;
        int outOfStockCount = 0;

        for (Product p : products) {
            ShopInventory si = invMap.get(p.getProductId());
            int stock = si != null ? si.getStockQuantity() : 0;
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
            pMap.put("last_updated", (si != null && si.getUpdatedDate() != null) ? si.getUpdatedDate().toString() : null);
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

        // Resolve and enrich assigned Pre-Sales Officer for this outlet
        PreSalesOfficer assignedPsr = null;
        if (outlet.getAssignedPsrId() != null) {
            assignedPsr = psrRepository.findById(outlet.getAssignedPsrId()).orElse(null);
        }
        if (assignedPsr == null && outlet.getSubRoute() != null && !outlet.getSubRoute().trim().isEmpty()) {
            assignedPsr = psrRepository.findAll().stream()
                    .filter(p -> p.getSubRoute() != null && p.getSubRoute().equalsIgnoreCase(outlet.getSubRoute()))
                    .findFirst().orElse(null);
        }
        if (assignedPsr == null && outlet.getArea() != null) {
            assignedPsr = psrRepository.findAll().stream()
                    .filter(p -> p.getAssignedArea() != null && p.getAssignedArea().equalsIgnoreCase(outlet.getArea()))
                    .findFirst().orElse(null);
        }
        if (assignedPsr == null) {
            List<PreSalesOfficer> allPsrs = psrRepository.findAll();
            if (!allPsrs.isEmpty()) {
                assignedPsr = allPsrs.get(0);
                outlet.setAssignedPsrId(assignedPsr.getId());
                outlet.setSubRoute(assignedPsr.getSubRoute());
                try {
                    outletRepository.save(outlet);
                } catch (Exception ignored) {}
            }
        }

        if (assignedPsr != null) {
            outlet.setAssignedPsrName(assignedPsr.getName());
            outlet.setAssignedPsrCode(assignedPsr.getPsrCode());
            outlet.setAssignedPsrPhone(assignedPsr.getPhone());
        }

        Map<String, Object> res = new HashMap<>();
        res.put("outlet", outlet);
        if (assignedPsr != null) {
            Map<String, Object> psrMap = new HashMap<>();
            psrMap.put("id", assignedPsr.getId());
            psrMap.put("name", assignedPsr.getName());
            psrMap.put("code", assignedPsr.getPsrCode());
            psrMap.put("phone", assignedPsr.getPhone());
            psrMap.put("email", assignedPsr.getEmail());
            psrMap.put("sub_route", assignedPsr.getSubRoute());
            psrMap.put("sales_officer_id", assignedPsr.getSalesOfficerId());
            res.put("pre_sales_officer", psrMap);
        }
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
     * Outlet requests stock requisition via designated Route Pre-Sales Officer (PSR)
     * Direct connection to Sales Officer is removed - Outlet deals exclusively with PSR.
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

        // Resolve assigned Pre-Sales Officer
        PreSalesOfficer assignedPsr = null;
        if (outlet.getAssignedPsrId() != null) {
            assignedPsr = psrRepository.findById(outlet.getAssignedPsrId()).orElse(null);
        }
        if (assignedPsr == null && outlet.getSubRoute() != null && !outlet.getSubRoute().trim().isEmpty()) {
            assignedPsr = psrRepository.findAll().stream()
                    .filter(p -> p.getSubRoute() != null && p.getSubRoute().equalsIgnoreCase(outlet.getSubRoute()))
                    .findFirst().orElse(null);
        }
        if (assignedPsr == null && outlet.getArea() != null) {
            assignedPsr = psrRepository.findAll().stream()
                    .filter(p -> p.getAssignedArea() != null && p.getAssignedArea().equalsIgnoreCase(outlet.getArea()))
                    .findFirst().orElse(null);
        }
        if (assignedPsr == null) {
            List<PreSalesOfficer> allPsrs = psrRepository.findAll();
            if (!allPsrs.isEmpty()) {
                assignedPsr = allPsrs.get(0);
                outlet.setAssignedPsrId(assignedPsr.getId());
                outlet.setSubRoute(assignedPsr.getSubRoute());
                try {
                    outletRepository.save(outlet);
                } catch (Exception ignored) {}
            }
        }

        String psrName = assignedPsr != null ? assignedPsr.getName() : "Route Pre-Sales Officer";
        Long psrId = assignedPsr != null ? assignedPsr.getId() : 1L;
        Long soId = assignedPsr != null ? assignedPsr.getSalesOfficerId() : 1L;
        String subRoute = assignedPsr != null && assignedPsr.getSubRoute() != null ? assignedPsr.getSubRoute() : (outlet.getSubRoute() != null ? outlet.getSubRoute() : "Route-Default");

        // 1. Insert into psr_orders table (exclusive order channel)
        try {
            jdbcTemplate.update(
                "INSERT INTO psr_orders (order_code, psr_id, psr_name, sales_officer_id, outlet_id, outlet_name, sub_route, product_id, product_name, quantity, unit_price, total_amount, urgency, status, outlet_remarks, psr_notes, created_at, updated_at) " +
                "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'SUBMITTED_TO_PSR', ?, ?, NOW(), NOW())",
                reqCode, psrId, psrName, soId, outletId, outlet.getOutletName(), subRoute, productId, prodName, qty, unitPrice, totalAmount, urgency, remarks, "Direct restock order from outlet branch"
            );
        } catch (Exception e) {
            System.err.println("[InventoryController] Failed to insert psr_orders: " + e.getMessage());
        }

        // 2. Also keep in outlet_requisitions for ledger compatibility
        try {
            jdbcTemplate.update(
                "INSERT INTO outlet_requisitions (requisition_code, outlet_id, product_id, product_name, quantity, unit_price, total_amount, urgency, status, outlet_remarks, admin_supplier_notes, sales_officer_id, created_date, updated_date) " +
                "VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PENDING_PSR', ?, ?, ?, NOW(), NOW())",
                reqCode, outletId, productId, prodName, qty, unitPrice, totalAmount, urgency, remarks, "Assigned to PSR: " + psrName + " (" + (assignedPsr != null ? assignedPsr.getPsrCode() : "PSR") + ")", soId
            );
        } catch (Exception ignored) {}

        // 3. Send Notification to Pre-Sales Officer (PSR)
        if (assignedPsr != null) {
            try {
                Long psrUserId = assignedPsr.getUserId() != null ? assignedPsr.getUserId() : (200L + assignedPsr.getId());
                AppNotification psrNotif = new AppNotification();
                psrNotif.setRecipientRole("PSR");
                psrNotif.setRecipientUserId(psrUserId);
                psrNotif.setTitle("New Restock Order from " + outlet.getOutletName());
                psrNotif.setMessage("Outlet " + outlet.getOutletName() + " on route " + subRoute + " placed an order for " + qty + " cases of " + prodName + " (৳" + totalAmount + ").");
                psrNotif.setType("OUTLET_ORDER_TO_PSR");
                psrNotif.setReferenceCode(reqCode);
                psrNotif.setReferenceId(outletId);
                notificationRepository.save(psrNotif);
            } catch (Exception ignored) {}
        }

        Map<String, Object> res = new HashMap<>();
        res.put("success", true);
        res.put("message", "Order " + reqCode + " placed with Route Pre-Sales Officer " + psrName + "!");
        res.put("requisition_code", reqCode);
        res.put("outlet_name", outlet.getOutletName());
        res.put("product_name", prodName);
        res.put("quantity", qty);
        res.put("urgency", urgency);
        res.put("psr_name", psrName);
        res.put("psr_code", assignedPsr != null ? assignedPsr.getPsrCode() : null);
        res.put("sub_route", subRoute);

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
     * Helper to get live purchased buffer stock of a product held by a Sales Officer
     */
    public int getSalesOfficerPurchasedStock(Long salesOfficerId, Long productId) {
        if (salesOfficerId == null || productId == null) return 0;
        try {
            List<Integer> list = jdbcTemplate.query(
                "SELECT current_stock FROM sales_officer_inventory WHERE sales_officer_id = ? AND product_id = ?",
                (rs, rowNum) -> rs.getInt("current_stock"),
                salesOfficerId, productId
            );
            if (!list.isEmpty()) {
                return Math.max(0, list.get(0));
            }
            // Fallback / sync from outlet_requisitions (purchased via SO-REQ) minus distributions to outlets
            Integer purchased = jdbcTemplate.queryForObject(
                "SELECT COALESCE(SUM(quantity), 0) FROM outlet_requisitions " +
                "WHERE sales_officer_id = ? AND product_id = ? AND requisition_code LIKE 'SO-REQ-%' AND status IN ('DISPATCHED', 'COMPLETED')",
                Integer.class, salesOfficerId, productId
            );
            Integer distributed = jdbcTemplate.queryForObject(
                "SELECT COALESCE(SUM(quantity), 0) FROM outlet_requisitions " +
                "WHERE sales_officer_id = ? AND product_id = ? AND requisition_code NOT LIKE 'SO-REQ-%' AND status IN ('DISPATCHED', 'COMPLETED')",
                Integer.class, salesOfficerId, productId
            );
            int p = (purchased != null) ? purchased : 0;
            int d = (distributed != null) ? distributed : 0;
            int remaining = Math.max(0, p - d);

            if (p > 0) {
                jdbcTemplate.update(
                    "INSERT INTO sales_officer_inventory (sales_officer_id, product_id, current_stock, total_purchased, total_distributed, updated_at) " +
                    "VALUES (?, ?, ?, ?, ?, NOW()) " +
                    "ON DUPLICATE KEY UPDATE current_stock = ?, total_purchased = ?, total_distributed = ?, updated_at = NOW()",
                    salesOfficerId, productId, remaining, p, d, remaining, p, d
                );
            }
            return remaining;
        } catch (Exception e) {
            return 0;
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
                "COALESCE(p.category, 'Beverages') AS category, " +
                "r.quantity, r.unit_price, r.total_amount, r.urgency, r.status, r.sales_officer_id, r.outlet_remarks, r.created_date, r.updated_date, " +
                "o.outlet_name, o.franchise_name, o.branch_name, o.city, o.area, o.location_address, o.contact_phone, o.district_id " +
                "FROM outlet_requisitions r " +
                "JOIN outlets o ON r.outlet_id = o.outlet_id " +
                "LEFT JOIN products p ON r.product_id = p.product_id " +
                "ORDER BY r.created_date DESC LIMIT 100"
            );
        } catch (Exception e) {
            return ResponseEntity.ok(Collections.emptyList());
        }

        List<DistrictInventory> allDistInvs = districtInventoryRepository.findAll();
        Map<String, Integer> distStockMap = new HashMap<>();
        for (DistrictInventory di : allDistInvs) {
            distStockMap.put(di.getDistrictId() + "_" + di.getProductId(), di.getCurrentStock());
        }

        List<SalesOfficer> officers = (sp != null) ? salesOfficerRepository.findBySupplierId(sp.getId()) : Collections.emptyList();

        List<Map<String, Object>> response = new ArrayList<>();
        for (Map<String, Object> row : list) {
            Map<String, Object> map = new HashMap<>(row);
            Long prodId = ((Number) row.get("product_id")).longValue();
            String reqCode = row.get("requisition_code") != null ? row.get("requisition_code").toString() : "";
            boolean isSoPurchase = reqCode.startsWith("SO-REQ-");
            map.put("is_so_purchase", isSoPurchase);

            // Calculate supplier's available depot stock for this product
            int availableStock = 0;
            for (Long distId : districtIds) {
                availableStock += distStockMap.getOrDefault(distId + "_" + prodId, 0);
            }
            map.put("supplier_available_stock", availableStock);

            // Associate with Superadmin-assigned Sales Officer for this area or requisition
            Long existingSoId = row.get("sales_officer_id") != null ? ((Number) row.get("sales_officer_id")).longValue() : null;
            SalesOfficer matchedSO = null;
            if (existingSoId != null) {
                matchedSO = salesOfficerRepository.findById(existingSoId).orElse(null);
            }
            if (matchedSO == null) {
                String oArea = row.get("area") != null ? row.get("area").toString().toLowerCase().trim() : "";
                matchedSO = officers.stream()
                        .filter(so -> !oArea.isEmpty() && (oArea.contains(so.getAssignedArea().toLowerCase().trim()) || so.getAssignedArea().toLowerCase().trim().contains(oArea)))
                        .findFirst()
                        .orElse(officers.isEmpty() ? null : officers.get(0));
            }

            int soPurchasedStock = 0;
            boolean soHasPurchased = false;

            if (matchedSO != null) {
                map.put("sales_officer_id", matchedSO.getId());
                map.put("sales_officer_name", matchedSO.getName());
                map.put("sales_officer_code", matchedSO.getOfficerCode());
                map.put("sales_officer_area", matchedSO.getAssignedArea());
                map.put("sales_officer_phone", matchedSO.getPhone());

                soPurchasedStock = getSalesOfficerPurchasedStock(matchedSO.getId(), prodId);
                soHasPurchased = soPurchasedStock > 0;
            } else {
                map.put("sales_officer_name", "Area Sales Officer (" + (row.get("area") != null ? row.get("area") : "Assigned Zone") + ")");
            }

            map.put("so_purchased_stock", soPurchasedStock);
            map.put("so_has_purchased", soHasPurchased);

            int reqQty = ((Number) row.get("quantity")).intValue();

            // The supplier should only dispatch the products to the outlet that has been purchased by the SO!
            if (isSoPurchase) {
                map.put("can_dispatch", availableStock > 0);
            } else {
                map.put("can_dispatch", soPurchasedStock >= reqQty);
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
        String reqCode = reqRow.get("requisition_code") != null ? reqRow.get("requisition_code").toString() : "";
        boolean isSoPurchase = reqCode.startsWith("SO-REQ-");

        int dispatchQty = requestedQty;
        if (isSoPurchase && body != null && body.containsKey("quantity") && body.get("quantity") != null) {
            try { dispatchQty = Integer.parseInt(body.get("quantity").toString()); } catch (Exception ignored) {}
        } else {
            // Outlet requisition: strictly fulfill exact requested quantity — not more or less
            dispatchQty = requestedQty;
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

        // Resolve Sales Officer
        SalesOfficer targetOfficer = null;
        if (body != null && (body.containsKey("sales_officer_id") || body.containsKey("salesOfficerId"))) {
            Object soObj = body.get("sales_officer_id") != null ? body.get("sales_officer_id") : body.get("salesOfficerId");
            try { targetOfficer = salesOfficerRepository.findById(Long.parseLong(soObj.toString())).orElse(null); } catch (Exception ignored) {}
        }
        if (targetOfficer == null && reqRow.get("sales_officer_id") != null) {
            try { targetOfficer = salesOfficerRepository.findById(((Number) reqRow.get("sales_officer_id")).longValue()).orElse(null); } catch (Exception ignored) {}
        }
        if (targetOfficer == null) {
            Outlet o = outletRepository.findById(outletId).orElse(null);
            String oArea = o != null && o.getArea() != null ? o.getArea().toLowerCase().trim() : "";
            List<SalesOfficer> officers = salesOfficerRepository.findAll();
            targetOfficer = officers.stream()
                    .filter(so -> !oArea.isEmpty() && (oArea.contains(so.getAssignedArea().toLowerCase().trim()) || so.getAssignedArea().toLowerCase().trim().contains(oArea)))
                    .findFirst()
                    .orElse(officers.isEmpty() ? null : officers.get(0));
        }

        Product product = productRepository.findById(productId).orElse(null);
        if (product == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ApiResponse.fail("Product not found."));
        }

        SupplierProfile sp = supplierProfileRepository.findByUserId(userId).orElse(null);
        if (sp == null) {
            List<SupplierProfile> all = supplierProfileRepository.findAll();
            if (!all.isEmpty()) sp = all.get(0);
        }

        // Check Supplier Depot Stock ONLY for SO buffer purchase (SO buying directly from supplier depot)
        if (isSoPurchase && sp != null) {
            int availableDepotStock = 0;
            List<Long> districtIds = new ArrayList<>();
            if (sp.getCoveredDistrictIds() != null && !sp.getCoveredDistrictIds().trim().isEmpty()) {
                for (String sid : sp.getCoveredDistrictIds().split(",")) {
                    try { districtIds.add(Long.parseLong(sid.trim())); } catch (Exception ignored) {}
                }
            }
            if (districtIds.isEmpty() && sp.getPrimaryDistrictId() != null) districtIds.add(sp.getPrimaryDistrictId());
            for (Long distId : districtIds) {
                var distInv = districtInventoryRepository.findByDistrictIdAndProductId(distId, productId);
                availableDepotStock += distInv.map(DistrictInventory::getCurrentStock).orElse(0);
            }
            if (availableDepotStock <= 0) {
                return ResponseEntity.badRequest().body(ApiResponse.fail("Cannot dispatch: Supplier depot stock is 0 cases (out of stock). Please request stock from Superadmin first."));
            }
            if (dispatchQty > availableDepotStock) {
                return ResponseEntity.badRequest().body(ApiResponse.fail("Cannot dispatch beyond stock limit: You attempted to supply " + dispatchQty + " cases, but your depot only holds " + availableDepotStock + " cases. Adjust the quantity to at most " + availableDepotStock + " cases."));
            }
        }

        final int finalDispatchQty = dispatchQty;

        // 1. If SO Stock Purchase (SO directly buying stock from Supplier into SO territory buffer)
        if (isSoPurchase) {
            // Deduct from Supplier depot stock
            if (sp != null && sp.getPrimaryDistrictId() != null) {
                districtInventoryRepository.findByDistrictIdAndProductId(sp.getPrimaryDistrictId(), productId).ifPresent(di -> {
                    di.setCurrentStock(Math.max(0, di.getCurrentStock() - finalDispatchQty));
                    districtInventoryRepository.save(di);
                });
            }

            // Credit to Sales Officer Purchased Inventory Buffer
            if (targetOfficer != null) {
                jdbcTemplate.update(
                    "INSERT INTO sales_officer_inventory (sales_officer_id, product_id, current_stock, total_purchased, total_distributed, last_purchased_at, updated_at) " +
                    "VALUES (?, ?, ?, ?, 0, NOW(), NOW()) " +
                    "ON DUPLICATE KEY UPDATE current_stock = current_stock + ?, total_purchased = total_purchased + ?, last_purchased_at = NOW(), updated_at = NOW()",
                    targetOfficer.getId(), productId, dispatchQty, dispatchQty, dispatchQty, dispatchQty
                );
            }

            BigDecimal unitPrice = reqRow.get("unit_price") != null ? new BigDecimal(reqRow.get("unit_price").toString()) : (product.getOutletPrice() != null ? product.getOutletPrice() : BigDecimal.ZERO);
            BigDecimal totalAmt = unitPrice.multiply(BigDecimal.valueOf(dispatchQty));
            jdbcTemplate.update(
                "UPDATE outlet_requisitions SET status = 'DISPATCHED', quantity = ?, unit_price = ?, total_amount = ?, updated_date = NOW() WHERE id = ?",
                dispatchQty, unitPrice, totalAmt, id
            );

            // Record transaction ledger for Supplier
            if (sp != null) {
                try {
                    SupplierTransaction soTx = new SupplierTransaction(
                        "TXN-SO-" + System.currentTimeMillis() + "-" + (100 + new Random().nextInt(900)),
                        sp.getId(),
                        null,
                        null,
                        reqCode,
                        "SO_BUFFER_SALE",
                        "CREDIT",
                        totalAmt,
                        "SALES_OFFICER_PURCHASE",
                        String.format("Stock purchase dispatch of %d cases of %s %s to Sales Officer %s @ ৳%.2f/case. Total: ৳%.2f",
                            dispatchQty, product.getBrand(), product.getFlavorVariant(),
                            (targetOfficer != null ? targetOfficer.getName() : "SO"),
                            unitPrice.doubleValue(), totalAmt.doubleValue()),
                        "COMPLETED"
                    );
                    supplierTransactionRepository.saveAndFlush(soTx);
                    BigDecimal cur = sp.getWalletBalance() != null ? sp.getWalletBalance() : BigDecimal.ZERO;
                    sp.setWalletBalance(cur.add(totalAmt));
                    supplierProfileRepository.saveAndFlush(sp);
                } catch (Exception ex) {
                    System.err.println("[InventoryController] Failed to record SO purchase txn: " + ex.getMessage());
                }
            }

            // Notify Sales Officer of approved stock purchase
            if (targetOfficer != null) {
                try {
                    AppNotification soNotif = new AppNotification();
                    soNotif.setRecipientRole("SALES_OFFICER");
                    soNotif.setRecipientUserId(targetOfficer.getUserId() != null ? targetOfficer.getUserId() : (100L + targetOfficer.getId()));
                    soNotif.setTitle("Stock Purchase Confirmed by Supplier");
                    soNotif.setMessage("Supplier approved and dispatched " + dispatchQty + " cases of " 
                            + product.getBrand() + " " + product.getFlavorVariant() + " @ ৳" + String.format(Locale.US, "%.2f", unitPrice.doubleValue()) 
                            + "/case. ৳" + String.format(Locale.US, "%.2f", totalAmt.doubleValue()) + " has been successfully purchased and credited to your territory buffer stock.");
                    soNotif.setType("SALES_OFFICER_PURCHASE_CONFIRMED");
                    soNotif.setReferenceCode(reqCode);
                    soNotif.setReferenceId(targetOfficer.getId());
                    notificationRepository.save(soNotif);
                } catch (Exception ignored) {}
            }

            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Successfully dispatched " + dispatchQty + " cases of " + product.getBrand() + " " + product.getFlavorVariant() + " to Sales Officer " + (targetOfficer != null ? targetOfficer.getName() : "") + "'s territory buffer stock!",
                "is_so_purchase", true,
                "sales_officer_id", targetOfficer != null ? targetOfficer.getId() : null,
                "product_id", productId,
                "quantity", dispatchQty
            ));
        }

        // 2. Retail Outlet Requisition: MUST ONLY DISPATCH PRODUCTS PURCHASED BY THE SALES OFFICER!
        if (targetOfficer == null) {
            return ResponseEntity.badRequest().body(ApiResponse.fail("Cannot dispatch to outlet: No Sales Officer assigned to this outlet/territory."));
        }

        int soPurchasedStock = getSalesOfficerPurchasedStock(targetOfficer.getId(), productId);
        if (soPurchasedStock <= 0) {
            return ResponseEntity.badRequest().body(ApiResponse.fail(
                "Cannot dispatch: Product '" + product.getBrand() + " " + product.getFlavorVariant() + 
                "' has not been purchased by the territory Sales Officer (" + targetOfficer.getName() + 
                "). The Sales Officer must purchase stock from the Regional Supplier first."
            ));
        }
        if (dispatchQty > soPurchasedStock) {
            return ResponseEntity.badRequest().body(ApiResponse.fail(
                "Cannot dispatch beyond SO purchased stock: Sales Officer " + targetOfficer.getName() + 
                " holds only " + soPurchasedStock + " cases of '" + product.getBrand() + " " + product.getFlavorVariant() + 
                "' in buffer stock, but the outlet requested " + dispatchQty + " cases. Adjust the quantity to at most " + 
                soPurchasedStock + " cases, or have the SO purchase additional stock first."
            ));
        }

        SupplyRequest supplyReq = new SupplyRequest(outletId, productId, dispatchQty, "ADD");
        supplyReq.setUserId(userId);
        supplyReq.setRequisitionId(id);
        supplyReq.setSalesOfficerId(targetOfficer.getId());
        supplyReq.setNotes(body != null && body.containsKey("notes") && body.get("notes") != null ? body.get("notes").toString() : "Fulfilling requisition " + reqCode);

        return supplyStockToOutlet(supplyReq);
    }

    /**
     * Endpoint for Supplier to track:
     * 1. Total wholesale stock sold by Supplier (to Sales Officers & Outlets)
     * 2. Specific quantity from that sold stock that has been dispatched to Outlets
     * 3. Remaining field buffer / in-custody pending final outlet dispatch
     * 4. Product-wise and Sales Officer breakdowns
     */
    @GetMapping("/supplier/sold-vs-dispatched")
    public ResponseEntity<?> getSupplierSoldVsDispatched(
            @RequestParam(required = false) Long userId,
            @RequestParam(required = false) Long supplierId) {
        try {
            // 1. Resolve Supplier & District
            SupplierProfile supplier = null;
            if (userId != null) {
                supplier = supplierProfileRepository.findByUserId(userId).orElse(null);
            }
            if (supplier == null && supplierId != null) {
                supplier = supplierProfileRepository.findById(supplierId).orElse(null);
            }
            if (supplier == null) {
                supplier = supplierProfileRepository.findAll().stream().findFirst().orElse(null);
            }
            Long districtId = (supplier != null && supplier.getPrimaryDistrictId() != null) ? supplier.getPrimaryDistrictId() : 1L;

            // 2. Fetch all products
            List<Product> products = productRepository.findAll();

            // 3. Fetch all Sales Officers
            List<SalesOfficer> officers = salesOfficerRepository.findAll();

            // 4. Query sold requisitions (fulfilled by supplier to SO / outlets)
            List<Map<String, Object>> soldRequisitions = jdbcTemplate.queryForList(
                "SELECT r.id, r.requisition_code, r.product_id, r.product_name, r.quantity, r.unit_price, r.total_amount, " +
                "r.sales_officer_id, r.outlet_id, r.status, r.created_date, r.updated_date, " +
                "o.outlet_name, o.branch_name, o.area, o.sub_route " +
                "FROM outlet_requisitions r " +
                "LEFT JOIN outlets o ON r.outlet_id = o.outlet_id " +
                "WHERE r.status IN ('DISPATCHED', 'FULFILLED', 'DELIVERED', 'COMPLETED') " +
                "ORDER BY r.updated_date DESC, r.created_date DESC"
            );

            // 5. Query all outlet distributions (dispatched from SO to Outlets)
            List<Map<String, Object>> distributions = jdbcTemplate.queryForList(
                "SELECT d.id, d.sales_officer_id, d.outlet_id, d.product_id, d.quantity, " +
                "d.cost_price, d.sale_price, d.total_cost, d.total_revenue, d.profit_earned, " +
                "d.notes, d.distribution_date, " +
                "o.outlet_name, o.branch_name, o.area, o.sub_route, " +
                "p.brand, p.flavor_variant, p.sku " +
                "FROM sales_officer_distributions d " +
                "LEFT JOIN outlets o ON d.outlet_id = o.outlet_id " +
                "LEFT JOIN products p ON d.product_id = p.product_id " +
                "ORDER BY d.distribution_date DESC"
            );

            // 6. Query dispatched PSR orders
            List<Map<String, Object>> psrDispatchedOrders = jdbcTemplate.queryForList(
                "SELECT id, order_code, psr_id, psr_name, sales_officer_id, outlet_id, outlet_name, sub_route, " +
                "product_id, product_name, quantity, unit_price, total_amount, urgency, status, updated_at " +
                "FROM psr_orders WHERE status = 'DISPATCHED' " +
                "ORDER BY updated_at DESC"
            );

            // 7. Calculate Aggregates
            int totalSoldUnits = 0;
            BigDecimal totalSoldValue = BigDecimal.ZERO;
            for (Map<String, Object> req : soldRequisitions) {
                int q = req.get("quantity") != null ? ((Number) req.get("quantity")).intValue() : 0;
                totalSoldUnits += q;
                if (req.get("total_amount") != null) {
                    totalSoldValue = totalSoldValue.add(new BigDecimal(req.get("total_amount").toString()));
                }
            }

            int totalDispatchedUnits = 0;
            BigDecimal totalDispatchedValue = BigDecimal.ZERO;
            for (Map<String, Object> d : distributions) {
                int q = d.get("quantity") != null ? ((Number) d.get("quantity")).intValue() : 0;
                totalDispatchedUnits += q;
                if (d.get("total_revenue") != null) {
                    totalDispatchedValue = totalDispatchedValue.add(new BigDecimal(d.get("total_revenue").toString()));
                }
            }

            int pendingOutletDispatchUnits = Math.max(0, totalSoldUnits - totalDispatchedUnits);
            double fulfillmentRate = totalSoldUnits > 0 
                ? Math.min(100.0, ((double) totalDispatchedUnits / totalSoldUnits) * 100.0) 
                : 0.0;

            // 8. Superadmin Purchased Stock Calculation for Supplier
            Map<Long, Integer> districtStockMap = districtInventoryRepository.findByDistrictId(districtId).stream()
                    .collect(Collectors.toMap(DistrictInventory::getProductId, DistrictInventory::getCurrentStock, (a, b) -> a));

            Map<Long, Integer> superadminPurchasedMap = new HashMap<>();
            Map<Long, BigDecimal> superadminPurchasedValueMap = new HashMap<>();
            if (supplier != null) {
                try {
                    List<Map<String, Object>> superadminOrders = jdbcTemplate.queryForList(
                        "SELECT sri.product_id, " +
                        "COALESCE(SUM(CASE WHEN sri.approved_quantity > 0 THEN sri.approved_quantity ELSE sri.requested_quantity END), 0) AS total_cases, " +
                        "COALESCE(SUM((CASE WHEN sri.approved_quantity > 0 THEN sri.approved_quantity ELSE sri.requested_quantity END) * COALESCE(p.supplier_price, p.base_price, 35)), 0) AS total_val " +
                        "FROM stock_requisition_items sri " +
                        "JOIN stock_requisitions sr ON sri.requisition_id = sr.id " +
                        "LEFT JOIN products p ON sri.product_id = p.product_id " +
                        "WHERE sr.supplier_id = ? AND sr.status IN ('APPROVED', 'COMPLETED', 'DISPATCHED') " +
                        "GROUP BY sri.product_id",
                        supplier.getId()
                    );
                    for (Map<String, Object> row : superadminOrders) {
                        Long pid = ((Number) row.get("product_id")).longValue();
                        int cases = ((Number) row.get("total_cases")).intValue();
                        BigDecimal val = new BigDecimal(row.get("total_val").toString());
                        superadminPurchasedMap.put(pid, cases);
                        superadminPurchasedValueMap.put(pid, val);
                    }
                } catch (Exception ex) {
                    System.err.println("[InventoryController] Failed to query superadmin purchased stock: " + ex.getMessage());
                }
            }

            // Build Superadmin Purchased Inventory breakdown
            List<Map<String, Object>> superadminPurchasedInventory = new ArrayList<>();
            int totalPurchasedFromSuperadminCases = 0;
            BigDecimal totalPurchasedFromSuperadminValue = BigDecimal.ZERO;
            int currentTotalDepotStock = 0;
            Map<String, Integer> categoryPurchasedCases = new LinkedHashMap<>();
            Map<String, Integer> categoryDepotStock = new LinkedHashMap<>();

            for (Product p : products) {
                int purchased = superadminPurchasedMap.getOrDefault(p.getProductId(), 0);
                int depotStock = districtStockMap.getOrDefault(p.getProductId(), 0);
                String cat = p.getCategory() != null && !p.getCategory().trim().isEmpty() ? p.getCategory().trim() : "Beverages";

                Map<String, Object> item = new HashMap<>();
                item.put("product_id", p.getProductId());
                item.put("brand", p.getBrand());
                item.put("flavor_variant", p.getFlavorVariant());
                item.put("product_name", p.getBrand() + " " + (p.getFlavorVariant() != null ? p.getFlavorVariant() : ""));
                item.put("category", cat);
                item.put("sku", p.getSku());
                item.put("packaging", p.getPackaging());
                item.put("size_volume", p.getSizeVolume());
                item.put("image_url", p.getImageUrl());
                BigDecimal unitPrice = p.getSupplierPrice() != null ? p.getSupplierPrice() : (p.getBasePrice() != null ? p.getBasePrice() : BigDecimal.valueOf(35));
                item.put("unit_price", unitPrice);
                item.put("purchased_stock", purchased);
                item.put("current_depot_stock", depotStock);
                BigDecimal itemTotal = unitPrice.multiply(BigDecimal.valueOf(purchased));
                item.put("total_purchase_value", itemTotal);

                superadminPurchasedInventory.add(item);

                totalPurchasedFromSuperadminCases += purchased;
                totalPurchasedFromSuperadminValue = totalPurchasedFromSuperadminValue.add(itemTotal);
                currentTotalDepotStock += depotStock;

                categoryPurchasedCases.put(cat, categoryPurchasedCases.getOrDefault(cat, 0) + purchased);
                categoryDepotStock.put(cat, categoryDepotStock.getOrDefault(cat, 0) + depotStock);
            }

            // 9. Product-wise Sold vs Dispatched
            Map<Long, Map<String, Object>> prodStats = new LinkedHashMap<>();
            for (Product p : products) {
                Map<String, Object> pm = new HashMap<>();
                pm.put("product_id", p.getProductId());
                pm.put("brand", p.getBrand());
                pm.put("flavor_variant", p.getFlavorVariant());
                pm.put("category", p.getCategory() != null && !p.getCategory().trim().isEmpty() ? p.getCategory().trim() : "Beverages");
                pm.put("product_name", p.getBrand() + " " + (p.getFlavorVariant() != null ? p.getFlavorVariant() : ""));
                pm.put("sku", p.getSku());
                pm.put("image_url", p.getImageUrl());
                pm.put("sold_quantity", 0);
                pm.put("sold_value", BigDecimal.ZERO);
                pm.put("dispatched_quantity", 0);
                pm.put("dispatched_value", BigDecimal.ZERO);
                pm.put("remaining_quantity", 0);
                pm.put("fulfillment_pct", 0.0);

                int depotStock = districtStockMap.getOrDefault(p.getProductId(), 0);
                int superadminPurchased = superadminPurchasedMap.getOrDefault(p.getProductId(), 0);
                pm.put("depot_stock", depotStock);
                pm.put("superadmin_purchased_stock", superadminPurchased);

                prodStats.put(p.getProductId(), pm);
            }

            for (Map<String, Object> req : soldRequisitions) {
                if (req.get("product_id") != null) {
                    Long pid = ((Number) req.get("product_id")).longValue();
                    Map<String, Object> pm = prodStats.get(pid);
                    if (pm != null) {
                        int q = req.get("quantity") != null ? ((Number) req.get("quantity")).intValue() : 0;
                        int prevQ = (int) pm.get("sold_quantity");
                        pm.put("sold_quantity", prevQ + q);
                        if (req.get("total_amount") != null) {
                            BigDecimal prevVal = (BigDecimal) pm.get("sold_value");
                            pm.put("sold_value", prevVal.add(new BigDecimal(req.get("total_amount").toString())));
                        }
                    }
                }
            }

            for (Map<String, Object> d : distributions) {
                if (d.get("product_id") != null) {
                    Long pid = ((Number) d.get("product_id")).longValue();
                    Map<String, Object> pm = prodStats.get(pid);
                    if (pm != null) {
                        int q = d.get("quantity") != null ? ((Number) d.get("quantity")).intValue() : 0;
                        int prevQ = (int) pm.get("dispatched_quantity");
                        pm.put("dispatched_quantity", prevQ + q);
                        if (d.get("total_revenue") != null) {
                            BigDecimal prevVal = (BigDecimal) pm.get("dispatched_value");
                            pm.put("dispatched_value", prevVal.add(new BigDecimal(d.get("total_revenue").toString())));
                        }
                    }
                }
            }

            List<Map<String, Object>> productBreakdown = new ArrayList<>();
            for (Map<String, Object> pm : prodStats.values()) {
                int sold = (int) pm.get("sold_quantity");
                int dispatched = (int) pm.get("dispatched_quantity");
                int rem = Math.max(0, sold - dispatched);
                double pct = sold > 0 ? Math.min(100.0, ((double) dispatched / sold) * 100.0) : 0.0;
                pm.put("remaining_quantity", rem);
                pm.put("fulfillment_pct", Math.round(pct * 10.0) / 10.0);
                if (sold > 0 || dispatched > 0 || ((int) pm.get("depot_stock")) > 0) {
                    productBreakdown.add(pm);
                }
            }

            // 9. Sales Officer Sold vs Dispatched Breakdown
            Map<Long, Map<String, Object>> soStats = new LinkedHashMap<>();
            for (SalesOfficer so : officers) {
                Map<String, Object> som = new HashMap<>();
                som.put("sales_officer_id", so.getId());
                som.put("name", so.getName());
                som.put("code", so.getOfficerCode());
                som.put("assigned_area", so.getAssignedArea());
                som.put("phone", so.getPhone());
                som.put("sold_quantity", 0);
                som.put("sold_value", BigDecimal.ZERO);
                som.put("dispatched_quantity", 0);
                som.put("dispatched_value", BigDecimal.ZERO);
                som.put("remaining_quantity", 0);
                som.put("fulfillment_pct", 0.0);
                soStats.put(so.getId(), som);
            }

            for (Map<String, Object> req : soldRequisitions) {
                if (req.get("sales_officer_id") != null) {
                    Long soId = ((Number) req.get("sales_officer_id")).longValue();
                    Map<String, Object> som = soStats.get(soId);
                    if (som != null) {
                        int q = req.get("quantity") != null ? ((Number) req.get("quantity")).intValue() : 0;
                        som.put("sold_quantity", ((int) som.get("sold_quantity")) + q);
                        if (req.get("total_amount") != null) {
                            som.put("sold_value", ((BigDecimal) som.get("sold_value")).add(new BigDecimal(req.get("total_amount").toString())));
                        }
                    }
                }
            }

            for (Map<String, Object> d : distributions) {
                if (d.get("sales_officer_id") != null) {
                    Long soId = ((Number) d.get("sales_officer_id")).longValue();
                    Map<String, Object> som = soStats.get(soId);
                    if (som != null) {
                        int q = d.get("quantity") != null ? ((Number) d.get("quantity")).intValue() : 0;
                        som.put("dispatched_quantity", ((int) som.get("dispatched_quantity")) + q);
                        if (d.get("total_revenue") != null) {
                            som.put("dispatched_value", ((BigDecimal) som.get("dispatched_value")).add(new BigDecimal(d.get("total_revenue").toString())));
                        }
                    }
                }
            }

            List<Map<String, Object>> officerBreakdown = new ArrayList<>();
            for (Map<String, Object> som : soStats.values()) {
                int sold = (int) som.get("sold_quantity");
                int dispatched = (int) som.get("dispatched_quantity");
                int rem = Math.max(0, sold - dispatched);
                double pct = sold > 0 ? Math.min(100.0, ((double) dispatched / sold) * 100.0) : 0.0;
                som.put("remaining_quantity", rem);
                som.put("fulfillment_pct", Math.round(pct * 10.0) / 10.0);
                officerBreakdown.add(som);
            }

            // Summary Map
            Map<String, Object> summary = new HashMap<>();
            summary.put("total_sold_units", totalSoldUnits);
            summary.put("total_sold_value", totalSoldValue);
            summary.put("total_dispatched_units", totalDispatchedUnits);
            summary.put("total_dispatched_value", totalDispatchedValue);
            summary.put("pending_outlet_dispatch_units", pendingOutletDispatchUnits);
            summary.put("fulfillment_rate_pct", Math.round(fulfillmentRate * 10.0) / 10.0);
            summary.put("total_purchased_from_superadmin_cases", totalPurchasedFromSuperadminCases);
            summary.put("total_purchased_from_superadmin_value", totalPurchasedFromSuperadminValue);
            summary.put("current_total_depot_stock", currentTotalDepotStock);
            summary.put("categories_count", categoryPurchasedCases.size());

            Map<String, Object> response = new HashMap<>();
            response.put("summary", summary);
            response.put("product_breakdown", productBreakdown);
            response.put("superadmin_purchased_inventory", superadminPurchasedInventory);
            response.put("category_breakdown", categoryPurchasedCases.entrySet().stream().map(e -> Map.of(
                "category", e.getKey(),
                "total_purchased_cases", e.getValue(),
                "current_depot_stock", categoryDepotStock.getOrDefault(e.getKey(), 0)
            )).toList());
            response.put("officer_breakdown", officerBreakdown);
            response.put("recent_dispatches", distributions);
            response.put("dispatched_psr_orders", psrDispatchedOrders);

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.badRequest().body(ApiResponse.fail("Failed to retrieve sold vs dispatched stats: " + e.getMessage()));
        }
    }
}
