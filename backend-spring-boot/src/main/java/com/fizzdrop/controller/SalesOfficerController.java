package com.fizzdrop.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fizzdrop.dto.ApiResponse;
import com.fizzdrop.entity.*;
import com.fizzdrop.repository.*;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;

@RestController
@CrossOrigin(origins = "*")
public class SalesOfficerController {

    private final SalesOfficerRepository salesOfficerRepository;
    private final SupplierProfileRepository supplierProfileRepository;
    private final OutletRepository outletRepository;
    private final DistrictRepository districtRepository;
    private final UserRepository userRepository;
    private final ProductRepository productRepository;
    private final ShopInventoryRepository shopInventoryRepository;
    private final DistrictInventoryRepository districtInventoryRepository;
    private final JdbcTemplate jdbcTemplate;
    private final AppNotificationRepository notificationRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public SalesOfficerController(SalesOfficerRepository salesOfficerRepository,
                                  SupplierProfileRepository supplierProfileRepository,
                                  OutletRepository outletRepository,
                                  DistrictRepository districtRepository,
                                  UserRepository userRepository,
                                  ProductRepository productRepository,
                                  ShopInventoryRepository shopInventoryRepository,
                                  DistrictInventoryRepository districtInventoryRepository,
                                  JdbcTemplate jdbcTemplate,
                                  AppNotificationRepository notificationRepository) {
        this.notificationRepository = notificationRepository;
        this.salesOfficerRepository = salesOfficerRepository;
        this.supplierProfileRepository = supplierProfileRepository;
        this.outletRepository = outletRepository;
        this.districtRepository = districtRepository;
        this.userRepository = userRepository;
        this.productRepository = productRepository;
        this.shopInventoryRepository = shopInventoryRepository;
        this.districtInventoryRepository = districtInventoryRepository;
        this.jdbcTemplate = jdbcTemplate;
    }

    /**
     * Get all sales officers, optionally filtered by supplierId or status
     */
    @GetMapping("/api/v1/sales-officers")
    public ResponseEntity<List<SalesOfficer>> getAllSalesOfficers(
            @RequestParam(required = false) Long supplierId,
            @RequestParam(required = false) String status) {

        List<SalesOfficer> list;
        if (supplierId != null && status != null) {
            list = salesOfficerRepository.findBySupplierIdAndStatus(supplierId, status);
        } else if (supplierId != null) {
            list = salesOfficerRepository.findBySupplierId(supplierId);
        } else if (status != null) {
            list = salesOfficerRepository.findByStatus(status);
        } else {
            list = salesOfficerRepository.findAll();
        }

        enrichSalesOfficers(list);
        return ResponseEntity.ok(list);
    }

    /**
     * Get single sales officer by ID
     */
    @GetMapping("/api/v1/sales-officers/{id}")
    public ResponseEntity<?> getSalesOfficerById(@PathVariable Long id) {
        Optional<SalesOfficer> opt = salesOfficerRepository.findById(id);
        if (opt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiResponse.fail("Sales Officer not found with ID: " + id));
        }
        SalesOfficer so = opt.get();
        enrichSalesOfficers(Collections.singletonList(so));
        return ResponseEntity.ok(so);
    }

    /**
     * Supplier portal endpoint: Get sales officers assigned to calling supplier
     */
    @GetMapping("/api/v1/supplier/sales-officers")
    public ResponseEntity<?> getSupplierSalesOfficers(
            @RequestParam(required = false) Long userId,
            @RequestParam(required = false) Long supplierId) {

        SupplierProfile profile = resolveSupplierProfile(userId, supplierId);
        if (profile == null) {
            return ResponseEntity.ok(Collections.emptyList());
        }

        List<SalesOfficer> list = salesOfficerRepository.findBySupplierId(profile.getId());
        enrichSalesOfficers(list);

        Map<String, Object> response = new HashMap<>();
        response.put("supplier_id", profile.getId());
        response.put("business_name", profile.getBusinessName());
        response.put("sales_officers", list);
        response.put("total_officers", list.size());
        response.put("allocated_areas", profile.getAllocatedAreas());

        return ResponseEntity.ok(response);
    }

    /**
     * Superadmin provisions a new Sales Officer account & credentials
     */
    @PostMapping("/api/v1/sales-officers")
    public ResponseEntity<?> createSalesOfficer(@RequestBody Map<String, Object> payload) {
        try {
            String name = (String) payload.get("name");
            String phone = (String) payload.get("phone");
            String email = (String) payload.get("email");
            String password = (String) payload.get("password");
            if (password == null || password.trim().isEmpty()) {
                password = "Officer123!";
            }
            String city = (String) payload.get("city");
            String assignedArea = (String) payload.get("assigned_area");
            if (assignedArea == null) assignedArea = (String) payload.get("assignedArea");
            if (assignedArea == null) assignedArea = (String) payload.get("area");
            String status = (String) payload.getOrDefault("status", "ACTIVE");

            Object supIdObj = payload.get("supplier_id");
            if (supIdObj == null) supIdObj = payload.get("supplierId");
            if (supIdObj == null) {
                return ResponseEntity.badRequest().body(ApiResponse.fail("Supplier ID is required"));
            }
            Long supplierId = Long.parseLong(supIdObj.toString());

            if (name == null || name.trim().isEmpty()) {
                return ResponseEntity.badRequest().body(ApiResponse.fail("Sales Officer name is required"));
            }
            if (phone == null || phone.trim().isEmpty()) {
                return ResponseEntity.badRequest().body(ApiResponse.fail("Sales Officer phone number is required"));
            }
            if (assignedArea == null || assignedArea.trim().isEmpty()) {
                return ResponseEntity.badRequest().body(ApiResponse.fail("Assigned Area is required"));
            }

            SupplierProfile supplier = supplierProfileRepository.findById(supplierId).orElse(null);
            if (supplier == null) {
                return ResponseEntity.badRequest().body(ApiResponse.fail("Supplier not found with ID: " + supplierId));
            }

            // Verify assignedArea is within the supplier's allocated areas
            if (city == null || city.trim().isEmpty()) {
                city = supplier.getDivisionName() != null ? supplier.getDivisionName() : "Dhaka";
            }

            validateAreaAllotment(supplier, city, assignedArea);

            // Generate unique officer code
            String codePrefix = "SO-" + (city.length() >= 3 ? city.substring(0, 3).toUpperCase() : "DHK") + "-";
            int randomNum = 100 + new Random().nextInt(900);
            String officerCode = (String) payload.get("officer_code");
            if (officerCode == null || officerCode.trim().isEmpty()) {
                officerCode = codePrefix + randomNum;
                while (salesOfficerRepository.findByOfficerCode(officerCode).isPresent()) {
                    randomNum = 100 + new Random().nextInt(900);
                    officerCode = codePrefix + randomNum;
                }
            }

            Long districtId = supplier.getPrimaryDistrictId();
            if (payload.get("district_id") != null) {
                districtId = Long.parseLong(payload.get("district_id").toString());
            }

            // Provision User Account for Sales Officer Login
            String finalEmail = (email != null && !email.trim().isEmpty())
                    ? email.trim().toLowerCase()
                    : (officerCode.toLowerCase() + "@fizzdrop.com");

            Long linkedUserId = null;
            Optional<User> existingUser = userRepository.findByEmail(finalEmail);
            if (existingUser.isPresent()) {
                User u = existingUser.get();
                u.setPasswordHash(password);
                u.setRoleId(6L); // Role 6 = SalesOfficer
                userRepository.save(u);
                linkedUserId = u.getUserId();
            } else {
                User newUser = new User(6L, null, finalEmail, password);
                User savedUser = userRepository.save(newUser);
                linkedUserId = savedUser.getUserId();
            }

            SalesOfficer so = new SalesOfficer(
                    officerCode,
                    name.trim(),
                    finalEmail,
                    phone.trim(),
                    supplierId,
                    districtId,
                    city.trim(),
                    assignedArea.trim()
            );
            so.setUserId(linkedUserId);
            so.setPasswordHash(password);
            so.setStatus(status != null ? status : "ACTIVE");

            if (payload.get("monthly_target") != null || payload.get("monthlyTarget") != null) {
                Object tgt = payload.get("monthly_target") != null ? payload.get("monthly_target") : payload.get("monthlyTarget");
                try {
                    so.setMonthlyTarget(new BigDecimal(tgt.toString()));
                } catch (Exception ignored) {}
            }

            if (payload.get("notes") != null) {
                so.setNotes(payload.get("notes").toString());
            }

            SalesOfficer saved = salesOfficerRepository.save(so);
            enrichSalesOfficers(Collections.singletonList(saved));
            return ResponseEntity.status(HttpStatus.CREATED).body(saved);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponse.fail(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.fail("Failed to create Sales Officer: " + e.getMessage()));
        }
    }

    /**
     * Superadmin updates / reassigns an existing Sales Officer
     */
    @PutMapping("/api/v1/sales-officers/{id}")
    public ResponseEntity<?> updateSalesOfficer(@PathVariable Long id, @RequestBody Map<String, Object> payload) {
        try {
            SalesOfficer so = salesOfficerRepository.findById(id).orElse(null);
            if (so == null) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(ApiResponse.fail("Sales Officer not found with ID: " + id));
            }

            if (payload.containsKey("name")) so.setName(payload.get("name").toString().trim());
            if (payload.containsKey("phone")) so.setPhone(payload.get("phone").toString().trim());
            if (payload.containsKey("email")) {
                String newEmail = payload.get("email").toString().trim().toLowerCase();
                so.setEmail(newEmail);
                if (so.getUserId() != null) {
                    userRepository.findById(so.getUserId()).ifPresent(u -> {
                        u.setEmail(newEmail);
                        userRepository.save(u);
                    });
                }
            }
            if (payload.containsKey("password") && payload.get("password") != null && !payload.get("password").toString().isEmpty()) {
                String newPass = payload.get("password").toString();
                so.setPasswordHash(newPass);
                if (so.getUserId() != null) {
                    userRepository.findById(so.getUserId()).ifPresent(u -> {
                        u.setPasswordHash(newPass);
                        userRepository.save(u);
                    });
                }
            }
            if (payload.containsKey("status")) so.setStatus(payload.get("status").toString().trim());
            if (payload.containsKey("notes")) so.setNotes(payload.get("notes") != null ? payload.get("notes").toString() : null);
            if (payload.containsKey("monthly_target") || payload.containsKey("monthlyTarget")) {
                Object tgt = payload.get("monthly_target") != null ? payload.get("monthly_target") : payload.get("monthlyTarget");
                if (tgt != null) {
                    try {
                        so.setMonthlyTarget(new BigDecimal(tgt.toString()));
                    } catch (Exception ignored) {}
                }
            }

            // If reassigning supplier or area
            if (payload.containsKey("supplier_id") || payload.containsKey("supplierId") || payload.containsKey("assigned_area")) {
                Long supId = so.getSupplierId();
                Object supObj = payload.get("supplier_id") != null ? payload.get("supplier_id") : payload.get("supplierId");
                if (supObj != null) supId = Long.parseLong(supObj.toString());

                SupplierProfile supplier = supplierProfileRepository.findById(supId).orElse(null);
                if (supplier == null) {
                    return ResponseEntity.badRequest().body(ApiResponse.fail("Supplier not found with ID: " + supId));
                }

                String city = payload.containsKey("city") ? payload.get("city").toString().trim() : so.getCity();
                String area = payload.containsKey("assigned_area") ? payload.get("assigned_area").toString().trim() : so.getAssignedArea();

                validateAreaAllotment(supplier, city, area);

                so.setSupplierId(supId);
                so.setCity(city);
                so.setAssignedArea(area);
                so.setDistrictId(supplier.getPrimaryDistrictId());
            }

            SalesOfficer updated = salesOfficerRepository.save(so);
            enrichSalesOfficers(Collections.singletonList(updated));
            return ResponseEntity.ok(updated);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponse.fail(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.fail("Failed to update Sales Officer: " + e.getMessage()));
        }
    }

    /**
     * Delete or deactivate a Sales Officer
     */
    @DeleteMapping("/api/v1/sales-officers/{id}")
    public ResponseEntity<?> deleteSalesOfficer(@PathVariable Long id) {
        Optional<SalesOfficer> opt = salesOfficerRepository.findById(id);
        if (opt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiResponse.fail("Sales Officer not found with ID: " + id));
        }
        SalesOfficer so = opt.get();
        if (so.getUserId() != null) {
            userRepository.deleteById(so.getUserId());
        }
        salesOfficerRepository.delete(so);
        return ResponseEntity.ok(ApiResponse.ok("Sales Officer deleted successfully."));
    }

    /**
     * Sales Officer Dedicated Portal Dashboard Data
     */
    @GetMapping("/api/v1/sales-officer/dashboard")
    public ResponseEntity<?> getSalesOfficerDashboard(
            @RequestParam(required = false) Long officerId,
            @RequestParam(required = false) Long userId,
            @RequestParam(required = false) String email) {

        SalesOfficer officer = null;
        if (officerId != null) {
            officer = salesOfficerRepository.findById(officerId).orElse(null);
        } else if (userId != null) {
            officer = salesOfficerRepository.findByUserId(userId).orElse(null);
        } else if (email != null && !email.isEmpty()) {
            officer = salesOfficerRepository.findByEmailIgnoreCase(email).orElse(null);
        }

        // Fallback to first active officer if testing
        if (officer == null) {
            List<SalesOfficer> all = salesOfficerRepository.findAll();
            if (!all.isEmpty()) officer = all.get(0);
        }

        if (officer == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiResponse.fail("No Sales Officer profile found"));
        }

        enrichSalesOfficers(Collections.singletonList(officer));

        // Linked Supplier Profile
        SupplierProfile supplier = supplierProfileRepository.findById(officer.getSupplierId()).orElse(null);

        // Retail Outlets in this Sales Officer's Area
        List<Outlet> allOutlets = outletRepository.findAll();
        List<Map<String, Object>> territoryOutlets = new ArrayList<>();
        String targetArea = officer.getAssignedArea().toLowerCase();

        for (Outlet o : allOutlets) {
            String oArea = o.getArea() != null ? o.getArea().toLowerCase() : "";
            if (oArea.contains(targetArea) || targetArea.contains(oArea)) {
                Map<String, Object> om = new HashMap<>();
                om.put("outlet_id", o.getOutletId());
                om.put("outlet_name", o.getOutletName());
                om.put("franchise_name", o.getFranchiseName());
                om.put("branch_name", o.getBranchName());
                om.put("location_address", o.getLocationAddress());
                om.put("city", o.getCity());
                om.put("area", o.getArea());
                om.put("contact_phone", o.getContactPhone());
                om.put("status", o.getStatus());

                // Fetch outlet stock counts
                List<ShopInventory> invList = shopInventoryRepository.findByBranchId(o.getOutletId());
                int totalShelfStock = invList.stream().mapToInt(ShopInventory::getStockQuantity).sum();
                om.put("total_shelf_stock", totalShelfStock);
                territoryOutlets.add(om);
            }
        }

        // Available Products with Prices & Wholesale Buffer from District Inventory
        List<Product> products = productRepository.findAll();
        List<Map<String, Object>> productCatalog = new ArrayList<>();
        Long districtId = officer.getDistrictId() != null ? officer.getDistrictId() : 1L;

        for (Product p : products) {
            Map<String, Object> pm = new HashMap<>();
            pm.put("product_id", p.getProductId());
            pm.put("brand", p.getBrand());
            pm.put("flavor_variant", p.getFlavorVariant());
            pm.put("category", p.getCategory());
            pm.put("sku", p.getSku());
            pm.put("base_price", p.getBasePrice());
            pm.put("supplier_price", p.getSupplierPrice());
            pm.put("outlet_price", p.getOutletPrice());
            pm.put("retail_price", p.getRetailPrice());
            pm.put("image_url", p.getImageUrl());

            // District buffer stock
            var distInv = districtInventoryRepository.findByDistrictIdAndProductId(districtId, p.getProductId());
            pm.put("depot_buffer_stock", distInv.map(DistrictInventory::getCurrentStock).orElse(50));
            productCatalog.add(pm);
        }

        // Open Branch Requisitions in this officer's territory
        List<Map<String, Object>> requisitions = new ArrayList<>();
        try {
            requisitions = jdbcTemplate.queryForList(
                    "SELECT r.* FROM outlet_requisitions r " +
                    "JOIN outlets o ON r.outlet_id = o.outlet_id " +
                    "WHERE (r.sales_officer_id = ? OR LOWER(o.area) LIKE ? OR LOWER(?) LIKE LOWER(o.area)) " +
                    "ORDER BY r.created_date DESC LIMIT 50",
                    officer.getId(), "%" + targetArea + "%", targetArea
            );
        } catch (Exception ignored) {}

        // Current Month Target & Financial Spent Calculation
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime startOfMonth = now.withDayOfMonth(1).withHour(0).withMinute(0).withSecond(0);
        java.time.YearMonth yearMonth = java.time.YearMonth.from(now);
        int daysInMonth = yearMonth.lengthOfMonth();
        int currentDay = now.getDayOfMonth();
        int daysLeft = Math.max(0, daysInMonth - currentDay);
        String monthName = now.getMonth().getDisplayName(java.time.format.TextStyle.FULL, Locale.ENGLISH) + " " + now.getYear();
        String endOfMonthStr = yearMonth.atEndOfMonth().toString();

        BigDecimal monthlyTarget = officer.getMonthlyTarget() != null ? officer.getMonthlyTarget() : new BigDecimal("2000000.00");

        // Amount spent buying products from supplier in current month
        BigDecimal amountSpent = BigDecimal.ZERO;
        try {
            Double spentSum = jdbcTemplate.queryForObject(
                "SELECT COALESCE(SUM(total_amount), 0) FROM outlet_requisitions " +
                "WHERE (sales_officer_id = ? OR outlet_remarks LIKE ?) AND created_date >= ?",
                Double.class,
                officer.getId(),
                "%[" + officer.getName() + "%",
                startOfMonth
            );
            if (spentSum != null) {
                amountSpent = BigDecimal.valueOf(spentSum).setScale(2, java.math.RoundingMode.HALF_UP);
            }
        } catch (Exception ignored) {}

        BigDecimal remainingTarget = monthlyTarget.subtract(amountSpent);
        if (remainingTarget.compareTo(BigDecimal.ZERO) < 0) {
            remainingTarget = BigDecimal.ZERO;
        }

        double progressPct = 0.0;
        if (monthlyTarget.compareTo(BigDecimal.ZERO) > 0) {
            progressPct = Math.min(100.0, (amountSpent.doubleValue() / monthlyTarget.doubleValue()) * 100.0);
        }
        boolean isTargetMet = amountSpent.compareTo(monthlyTarget) >= 0;

        // Query profit gained and distributions to outlets
        BigDecimal totalProfitGained = BigDecimal.ZERO;
        BigDecimal totalDistributionRevenue = BigDecimal.ZERO;
        BigDecimal totalDistributionCost = BigDecimal.ZERO;
        int totalUnitsSold = 0;

        try {
            Map<String, Object> summary = jdbcTemplate.queryForMap(
                "SELECT COALESCE(SUM(profit_earned), 0) as total_profit, " +
                "COALESCE(SUM(total_revenue), 0) as total_revenue, " +
                "COALESCE(SUM(total_cost), 0) as total_cost, " +
                "COALESCE(SUM(quantity), 0) as total_units " +
                "FROM sales_officer_distributions WHERE sales_officer_id = ?",
                officer.getId()
            );
            if (summary != null) {
                if (summary.get("total_profit") != null) totalProfitGained = new BigDecimal(summary.get("total_profit").toString()).setScale(2, java.math.RoundingMode.HALF_UP);
                if (summary.get("total_revenue") != null) totalDistributionRevenue = new BigDecimal(summary.get("total_revenue").toString()).setScale(2, java.math.RoundingMode.HALF_UP);
                if (summary.get("total_cost") != null) totalDistributionCost = new BigDecimal(summary.get("total_cost").toString()).setScale(2, java.math.RoundingMode.HALF_UP);
                if (summary.get("total_units") != null) totalUnitsSold = ((Number) summary.get("total_units")).intValue();
            }
        } catch (Exception ignored) {}

        // Recent distributions list with store & product details
        List<Map<String, Object>> distributions = new ArrayList<>();
        try {
            distributions = jdbcTemplate.queryForList(
                "SELECT d.*, o.outlet_name, o.branch_name, o.franchise_name, p.brand, p.flavor_variant, p.sku " +
                "FROM sales_officer_distributions d " +
                "JOIN outlets o ON d.outlet_id = o.outlet_id " +
                "JOIN products p ON d.product_id = p.product_id " +
                "WHERE d.sales_officer_id = ? " +
                "ORDER BY d.distribution_date DESC LIMIT 50",
                officer.getId()
            );
        } catch (Exception ignored) {}

        Map<String, Object> targetSummary = new HashMap<>();
        targetSummary.put("monthly_target", monthlyTarget);
        targetSummary.put("amount_spent", amountSpent);
        targetSummary.put("remaining_target", remainingTarget);
        targetSummary.put("progress_percentage", Math.round(progressPct * 100.0) / 100.0);
        targetSummary.put("is_target_met", isTargetMet);
        targetSummary.put("month_name", monthName);
        targetSummary.put("days_left", daysLeft);
        targetSummary.put("end_of_month", endOfMonthStr);
        targetSummary.put("total_profit_gained", totalProfitGained);
        targetSummary.put("total_distribution_revenue", totalDistributionRevenue);
        targetSummary.put("total_distribution_cost", totalDistributionCost);
        targetSummary.put("total_units_sold_to_outlets", totalUnitsSold);

        Map<String, Object> response = new HashMap<>();
        response.put("sales_officer", officer);
        response.put("supplier", supplier);
        response.put("outlets", territoryOutlets);
        response.put("outlet_count", territoryOutlets.size());
        response.put("products", productCatalog);
        response.put("requisitions", requisitions);
        response.put("financial_target", targetSummary);
        response.put("distributions", distributions);
        response.put("stats", Map.of(
                "total_outlets", territoryOutlets.size(),
                "pending_demands", requisitions.stream().filter(r -> "PENDING".equals(r.get("status"))).count(),
                "total_products", products.size(),
                "monthly_target", monthlyTarget,
                "amount_spent", amountSpent,
                "remaining_target", remainingTarget,
                "total_profit_gained", totalProfitGained
        ));

        return ResponseEntity.ok(response);
    }

    /**
     * Sales Officer distributes stock from their territory buffer directly to an outlet
     */
    @PostMapping("/api/v1/sales-officer/distribute")
    public ResponseEntity<?> distributeStockToOutlet(@RequestBody Map<String, Object> payload) {
        try {
            Long outletId = Long.parseLong(payload.get("outlet_id").toString());
            Long productId = Long.parseLong(payload.get("product_id").toString());
            int quantity = Integer.parseInt(payload.get("quantity").toString());
            String notes = (String) payload.getOrDefault("notes", "Direct territory distribution by Sales Officer");

            Optional<Outlet> outletOpt = outletRepository.findById(outletId);
            if (outletOpt.isEmpty()) return ResponseEntity.badRequest().body(ApiResponse.fail("Outlet not found"));

            Optional<Product> prodOpt = productRepository.findById(productId);
            if (prodOpt.isEmpty()) return ResponseEntity.badRequest().body(ApiResponse.fail("Product not found"));

            Product prod = prodOpt.get();

            // Increase outlet shelf inventory
            var invOpt = shopInventoryRepository.findByBranchIdAndProductId(outletId, productId);
            ShopInventory inv;
            if (invOpt.isPresent()) {
                inv = invOpt.get();
                inv.setStockQuantity(inv.getStockQuantity() + quantity);
                inv.setUpdatedDate(LocalDateTime.now());
            } else {
                inv = new ShopInventory(outletId, productId, quantity);
            }
            shopInventoryRepository.save(inv);

            // Determine Sales Officer ID
            Long officerId = null;
            if (payload.get("sales_officer_id") != null) {
                officerId = Long.parseLong(payload.get("sales_officer_id").toString());
            }
            if (officerId == null) {
                String oArea = outletOpt.get().getArea() != null ? outletOpt.get().getArea().toLowerCase() : "";
                List<SalesOfficer> matchOfficers = salesOfficerRepository.findAll().stream()
                        .filter(so -> so.getAssignedArea() != null &&
                                (so.getAssignedArea().toLowerCase().contains(oArea) ||
                                 oArea.contains(so.getAssignedArea().toLowerCase())))
                        .toList();
                officerId = !matchOfficers.isEmpty() ? matchOfficers.get(0).getId() : 1L;
            }

            // Financial profit calculations
            BigDecimal costPrice = prod.getSupplierPrice() != null ? prod.getSupplierPrice() : (prod.getBasePrice() != null ? prod.getBasePrice() : BigDecimal.valueOf(35));
            BigDecimal salePrice = prod.getOutletPrice() != null ? prod.getOutletPrice() : costPrice.multiply(BigDecimal.valueOf(1.15));
            BigDecimal totalCost = costPrice.multiply(BigDecimal.valueOf(quantity));
            BigDecimal totalRevenue = salePrice.multiply(BigDecimal.valueOf(quantity));
            BigDecimal profitEarned = totalRevenue.subtract(totalCost);

            // Record distribution and profit earned
            try {
                jdbcTemplate.update(
                    "INSERT INTO sales_officer_distributions (sales_officer_id, outlet_id, product_id, quantity, cost_price, sale_price, total_cost, total_revenue, profit_earned, notes, distribution_date) " +
                    "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())",
                    officerId, outletId, productId, quantity, costPrice, salePrice, totalCost, totalRevenue, profitEarned, notes
                );
            } catch (Exception ex) {
                System.err.println("Failed to insert sales_officer_distributions: " + ex.getMessage());
            }

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Successfully distributed " + quantity + " units of " + prod.getBrand() + " " + prod.getFlavorVariant() + " to " + outletOpt.get().getOutletName() + "! (Profit earned: ৳" + String.format("%.2f", profitEarned) + ")",
                    "outlet_id", outletId,
                    "product_id", productId,
                    "new_stock", inv.getStockQuantity(),
                    "quantity", quantity,
                    "profit_earned", profitEarned,
                    "total_revenue", totalRevenue,
                    "cost_price", costPrice,
                    "sale_price", salePrice
            ));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.fail("Distribution failed: " + e.getMessage()));
        }
    }

    private void enrichSalesOfficers(List<SalesOfficer> list) {
        if (list.isEmpty()) return;

        Map<Long, String> supplierNames = new HashMap<>();
        List<SupplierProfile> suppliers = supplierProfileRepository.findAll();
        for (SupplierProfile sp : suppliers) {
            supplierNames.put(sp.getId(), sp.getBusinessName());
        }

        List<Outlet> allOutlets = outletRepository.findAll();

        for (SalesOfficer so : list) {
            so.setSupplierName(supplierNames.getOrDefault(so.getSupplierId(), "Regional Logistics Hub"));

            // Count outlets in this sales officer's assigned area
            String soArea = so.getAssignedArea() != null ? so.getAssignedArea().toLowerCase() : "";
            int count = 0;
            for (Outlet o : allOutlets) {
                String oArea = o.getArea() != null ? o.getArea().toLowerCase() : "";
                if (!soArea.isEmpty() && (oArea.contains(soArea) || soArea.contains(oArea))) {
                    count++;
                }
            }
            so.setOutletCount(count);
        }
    }

    private SupplierProfile resolveSupplierProfile(Long userId, Long supplierId) {
        if (supplierId != null) {
            return supplierProfileRepository.findById(supplierId).orElse(null);
        }
        if (userId != null) {
            Optional<SupplierProfile> opt = supplierProfileRepository.findByUserId(userId);
            if (opt.isPresent()) return opt.get();
            // Fallback for demo supplier id 4
            if (userId == 4L) {
                List<SupplierProfile> all = supplierProfileRepository.findAll();
                if (!all.isEmpty()) return all.get(0);
            }
        }
        List<SupplierProfile> all = supplierProfileRepository.findAll();
        return all.isEmpty() ? null : all.get(0);
    }

    private void validateAreaAllotment(SupplierProfile supplier, String city, String assignedArea) {
        String json = supplier.getAllocatedAreas();
        if (json == null || json.trim().isEmpty()) {
            return;
        }

        try {
            JsonNode root = objectMapper.readTree(json);
            Iterator<Map.Entry<String, JsonNode>> fields = root.fields();
            boolean cityFound = false;
            boolean areaFound = false;

            while (fields.hasNext()) {
                Map.Entry<String, JsonNode> entry = fields.next();
                if (entry.getKey().equalsIgnoreCase(city)) {
                    cityFound = true;
                    JsonNode arr = entry.getValue();
                    if (arr.isArray()) {
                        for (JsonNode item : arr) {
                            if (item.asText().equalsIgnoreCase(assignedArea)) {
                                areaFound = true;
                                break;
                            }
                        }
                    }
                    break;
                }
            }

            if (!cityFound) {
                throw new IllegalArgumentException("City '" + city + "' is not in Supplier " + supplier.getBusinessName() + "'s allocated cities");
            }
            if (!areaFound) {
                throw new IllegalArgumentException("Area '" + assignedArea + "' is not within Supplier " + supplier.getBusinessName() + "'s approved areas for " + city);
            }
        } catch (IllegalArgumentException e) {
            throw e;
        } catch (Exception e) {
            // Json parsing error fallback
        }
    }
    /**
     * Sales Officer requests products from their linked Supplier
     */
    @PostMapping("/api/v1/sales-officer/request-stock")
    public ResponseEntity<?> requestStockFromSupplier(@RequestBody Map<String, Object> payload) {
        try {
            Long officerId = Long.parseLong(payload.get("sales_officer_id").toString());
            Long productId = Long.parseLong(payload.get("product_id").toString());
            int quantity = Integer.parseInt(payload.get("quantity").toString());
            String urgency = payload.getOrDefault("urgency", "NORMAL").toString();
            String notes = payload.getOrDefault("notes", "Territory demand request by Sales Officer").toString();

            SalesOfficer officer = salesOfficerRepository.findById(officerId)
                    .orElseThrow(() -> new IllegalArgumentException("Sales Officer not found"));

            Product product = productRepository.findById(productId)
                    .orElseThrow(() -> new IllegalArgumentException("Product not found"));

            SupplierProfile supplier = supplierProfileRepository.findById(officer.getSupplierId())
                    .orElseThrow(() -> new IllegalArgumentException("Linked Supplier not found"));

            String reqCode = "SO-REQ-" + (100000 + new Random().nextInt(900000));
            BigDecimal unitPrice = product.getOutletPrice() != null ? product.getOutletPrice() : (product.getBasePrice() != null ? product.getBasePrice() : BigDecimal.ZERO);
            BigDecimal totalAmount = unitPrice.multiply(BigDecimal.valueOf(quantity));

            // Find an outlet in officer's area or representative outlet ID
            String area = officer.getAssignedArea() != null ? officer.getAssignedArea() : "Territory";
            List<Outlet> areaOutlets = outletRepository.findAll().stream()
                    .filter(o -> o.getArea() != null && (o.getArea().equalsIgnoreCase(area) || o.getArea().toLowerCase().contains(area.toLowerCase())))
                    .toList();
            Long outletId = !areaOutlets.isEmpty() ? areaOutlets.get(0).getOutletId() : 2L;

            // Save requisition in outlet_requisitions so supplier sees it under Area Demands
            jdbcTemplate.update(
                "INSERT INTO outlet_requisitions (requisition_code, outlet_id, product_id, product_name, quantity, unit_price, total_amount, urgency, status, outlet_remarks, sales_officer_id, created_date, updated_date) " +
                "VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', ?, ?, NOW(), NOW())",
                reqCode, outletId, productId, product.getBrand() + " " + product.getFlavorVariant(),
                quantity, unitPrice, totalAmount, urgency,
                "Sales Officer Demand [" + officer.getName() + " - " + area + "]: " + notes,
                officer.getId()
            );

            // Create notification for Supplier
            try {
                AppNotification notif = new AppNotification();
                notif.setRecipientRole("SUPPLIER");
                notif.setRecipientUserId(supplier.getUserId());
                notif.setTitle("New Product Request from Sales Officer " + officer.getName());
                notif.setMessage("Sales Officer " + officer.getName() + " (" + area + " zone) requested " + quantity + " cases of " + product.getBrand() + " " + product.getFlavorVariant() + " (" + urgency + " priority).");
                notif.setType("SALES_OFFICER_REQUISITION");
                notif.setReferenceCode(reqCode);
                notificationRepository.save(notif);
            } catch (Exception ignored) {}

            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Requisition " + reqCode + " successfully submitted to Supplier " + supplier.getBusinessName() + "!",
                "requisition_code", reqCode,
                "sales_officer", officer.getName(),
                "product_name", product.getBrand() + " " + product.getFlavorVariant(),
                "quantity", quantity,
                "supplier_user_id", supplier.getUserId()
            ));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.fail("Stock request failed: " + e.getMessage()));
        }
    }

}