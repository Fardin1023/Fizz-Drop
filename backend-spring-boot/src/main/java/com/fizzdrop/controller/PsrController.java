package com.fizzdrop.controller;

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
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/psr")
@CrossOrigin(origins = "*")
public class PsrController {

    private final PreSalesOfficerRepository psrRepository;
    private final SalesOfficerRepository salesOfficerRepository;
    private final OutletRepository outletRepository;
    private final ProductRepository productRepository;
    private final AppNotificationRepository notificationRepository;
    private final ShopInventoryRepository inventoryRepository;
    private final DistrictInventoryRepository districtInventoryRepository;
    private final SupplierProfileRepository supplierProfileRepository;
    private final JdbcTemplate jdbcTemplate;

    public PsrController(PreSalesOfficerRepository psrRepository,
                         SalesOfficerRepository salesOfficerRepository,
                         OutletRepository outletRepository,
                         ProductRepository productRepository,
                         AppNotificationRepository notificationRepository,
                         ShopInventoryRepository inventoryRepository,
                         DistrictInventoryRepository districtInventoryRepository,
                         SupplierProfileRepository supplierProfileRepository,
                         JdbcTemplate jdbcTemplate) {
        this.psrRepository = psrRepository;
        this.salesOfficerRepository = salesOfficerRepository;
        this.outletRepository = outletRepository;
        this.productRepository = productRepository;
        this.notificationRepository = notificationRepository;
        this.inventoryRepository = inventoryRepository;
        this.districtInventoryRepository = districtInventoryRepository;
        this.supplierProfileRepository = supplierProfileRepository;
        this.jdbcTemplate = jdbcTemplate;
    }

    /**
     * Get all Pre-Sales Officers with their assigned Sales Officer, outlet count, and order stats.
     */
    @GetMapping("/all")
    public ResponseEntity<List<PreSalesOfficer>> getAllPsrs() {
        List<PreSalesOfficer> psrs = psrRepository.findAll();
        enrichPsrs(psrs);
        return ResponseEntity.ok(psrs);
    }

    /**
     * Get PSRs assigned under a specific Sales Officer.
     */
    @GetMapping("/by-so/{salesOfficerId}")
    public ResponseEntity<List<PreSalesOfficer>> getPsrsBySalesOfficer(@PathVariable Long salesOfficerId) {
        List<PreSalesOfficer> psrs = psrRepository.findBySalesOfficerId(salesOfficerId);
        enrichPsrs(psrs);
        return ResponseEntity.ok(psrs);
    }

    /**
     * Provision or create a new Pre-Sales Officer (PSR) by Superadmin.
     * Automatically assigns to designated Sales Officer and sets up sub-route.
     */
    @PostMapping
    public ResponseEntity<?> createPsr(@RequestBody Map<String, Object> req) {
        try {
            String name = (String) req.get("name");
            String phone = (String) req.get("phone");
            String email = (String) req.get("email");
            Long salesOfficerId = Long.parseLong(req.get("sales_officer_id").toString());
            String subRoute = (String) req.get("sub_route");
            String assignedArea = (String) req.get("assigned_area");
            String notes = (String) req.get("notes");
            String password = req.containsKey("password") && req.get("password") != null && !req.get("password").toString().isEmpty()
                    ? req.get("password").toString()
                    : "Psr123!";

            SalesOfficer so = salesOfficerRepository.findById(salesOfficerId)
                    .orElseThrow(() -> new RuntimeException("Assigned Sales Officer with ID " + salesOfficerId + " not found."));

            if (assignedArea == null || assignedArea.trim().isEmpty()) {
                assignedArea = so.getAssignedArea();
            }

            String psrCode = req.containsKey("psr_code") && req.get("psr_code") != null && !req.get("psr_code").toString().trim().isEmpty()
                    ? req.get("psr_code").toString().trim().toUpperCase()
                    : "PSR-" + so.getOfficerCode().replaceAll("[^A-Z0-9]", "") + "-" + (10 + (int)(Math.random() * 90));

            PreSalesOfficer psr = new PreSalesOfficer(psrCode, name, phone, email, salesOfficerId, subRoute, assignedArea);
            psr.setPasswordHash(password);
            psr.setNotes(notes);
            psr.setStatus("ACTIVE");
            psr.setCreatedAt(LocalDateTime.now());
            psr.setUpdatedAt(LocalDateTime.now());

            psrRepository.save(psr);
            enrichPsrs(List.of(psr));

            return ResponseEntity.status(HttpStatus.CREATED).body(psr);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ApiResponse.fail("Failed to create PSR: " + e.getMessage()));
        }
    }

    /**
     * Update PSR profile or Reassign to another Sales Officer (Superadmin action).
     */
    @PutMapping("/{id}")
    public ResponseEntity<?> updatePsr(@PathVariable Long id, @RequestBody Map<String, Object> req) {
        try {
            PreSalesOfficer psr = psrRepository.findById(id)
                    .orElseThrow(() -> new RuntimeException("Pre-Sales Officer with ID " + id + " not found."));

            if (req.containsKey("name") && req.get("name") != null) psr.setName(req.get("name").toString());
            if (req.containsKey("phone") && req.get("phone") != null) psr.setPhone(req.get("phone").toString());
            if (req.containsKey("email") && req.get("email") != null) psr.setEmail(req.get("email").toString());
            if (req.containsKey("password") && req.get("password") != null && !req.get("password").toString().isEmpty()) {
                psr.setPasswordHash(req.get("password").toString());
            }
            if (req.containsKey("sales_officer_id") && req.get("sales_officer_id") != null) {
                Long newSoId = Long.parseLong(req.get("sales_officer_id").toString());
                psr.setSalesOfficerId(newSoId);
                salesOfficerRepository.findById(newSoId).ifPresent(so -> {
                    if (!req.containsKey("assigned_area") || req.get("assigned_area") == null) {
                        psr.setAssignedArea(so.getAssignedArea());
                    }
                });
            }
            if (req.containsKey("sub_route") && req.get("sub_route") != null) psr.setSubRoute(req.get("sub_route").toString());
            if (req.containsKey("assigned_area") && req.get("assigned_area") != null) psr.setAssignedArea(req.get("assigned_area").toString());
            if (req.containsKey("status") && req.get("status") != null) psr.setStatus(req.get("status").toString());
            if (req.containsKey("notes") && req.get("notes") != null) psr.setNotes(req.get("notes").toString());

            psr.setUpdatedAt(LocalDateTime.now());
            psrRepository.save(psr);

            enrichPsrs(List.of(psr));
            return ResponseEntity.ok(psr);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ApiResponse.fail("Failed to update PSR: " + e.getMessage()));
        }
    }

    /**
     * Dedicated Endpoint for Superadmin to Assign / Reassign a PSR to a Sales Officer.
     */
    @PutMapping("/{id}/assign-sales-officer")
    public ResponseEntity<?> assignSalesOfficer(@PathVariable Long id, @RequestBody Map<String, Object> req) {
        try {
            PreSalesOfficer psr = psrRepository.findById(id)
                    .orElseThrow(() -> new RuntimeException("Pre-Sales Officer with ID " + id + " not found."));

            Long newSoId = Long.parseLong(req.get("sales_officer_id").toString());
            SalesOfficer so = salesOfficerRepository.findById(newSoId)
                    .orElseThrow(() -> new RuntimeException("Sales Officer with ID " + newSoId + " not found."));

            psr.setSalesOfficerId(newSoId);
            psr.setAssignedArea(so.getAssignedArea());
            psr.setUpdatedAt(LocalDateTime.now());
            psrRepository.save(psr);

            enrichPsrs(List.of(psr));
            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "PSR " + psr.getName() + " successfully assigned to Sales Officer " + so.getName() + " (" + so.getAssignedArea() + ")!",
                "psr", psr
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ApiResponse.fail("Failed to assign Sales Officer: " + e.getMessage()));
        }
    }

    /**
     * Deactivate / Delete PSR.
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deletePsr(@PathVariable Long id) {
        try {
            PreSalesOfficer psr = psrRepository.findById(id)
                    .orElseThrow(() -> new RuntimeException("Pre-Sales Officer with ID " + id + " not found."));
            psr.setStatus("INACTIVE");
            psr.setUpdatedAt(LocalDateTime.now());
            psrRepository.save(psr);
            return ResponseEntity.ok(Map.of("success", true, "message", "PSR " + psr.getName() + " has been deactivated."));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ApiResponse.fail("Failed to delete PSR: " + e.getMessage()));
        }
    }

    /**
     * Comprehensive Dashboard endpoint for a Pre-Sales Officer.
     */
    @GetMapping("/dashboard")
    public ResponseEntity<?> getDashboard(
            @RequestParam(required = false) Long psrId,
            @RequestParam(required = false) String psrCode,
            @RequestParam(required = false) String email) {

        Optional<PreSalesOfficer> psrOpt = Optional.empty();
        if (psrId != null) {
            psrOpt = psrRepository.findById(psrId);
        } else if (email != null && !email.trim().isEmpty()) {
            psrOpt = psrRepository.findByEmailIgnoreCase(email.trim());
        } else if (psrCode != null && !psrCode.trim().isEmpty()) {
            psrOpt = psrRepository.findByPsrCode(psrCode.trim());
        }

        if (psrOpt.isEmpty()) {
            List<PreSalesOfficer> all = psrRepository.findAll();
            if (!all.isEmpty()) psrOpt = Optional.of(all.get(0));
        }

        if (psrOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ApiResponse.fail("No Pre-Sales Officer found."));
        }

        PreSalesOfficer psr = psrOpt.get();
        enrichPsrs(List.of(psr));

        // Get Sales Officer
        SalesOfficer so = salesOfficerRepository.findById(psr.getSalesOfficerId()).orElse(null);

        // Fetch outlets on this sub-route or assigned to this PSR
        List<Map<String, Object>> routeOutlets = getOutletsForPsr(psr);

        // Fetch all products
        List<Product> products = productRepository.findAll();

        // Fetch PSR Orders
        List<Map<String, Object>> orders = jdbcTemplate.queryForList(
                "SELECT id, order_code, psr_id, psr_name, sales_officer_id, outlet_id, outlet_name, sub_route, " +
                "product_id, product_name, quantity, unit_price, total_amount, urgency, status, outlet_remarks, psr_notes, created_at, updated_at " +
                "FROM psr_orders WHERE psr_id = ? ORDER BY id DESC LIMIT 50",
                psr.getId()
        );

        // Fetch PSR Refund Requests
        List<Map<String, Object>> refunds = jdbcTemplate.queryForList(
                "SELECT id, refund_code, psr_id, psr_name, sales_officer_id, outlet_id, outlet_name, sub_route, " +
                "product_id, product_name, quantity, unit_price, refund_amount, reason, status, outlet_remarks, psr_notes, so_remarks, created_at, updated_at " +
                "FROM psr_refund_requests WHERE psr_id = ? ORDER BY id DESC LIMIT 50",
                psr.getId()
        );

        // Fetch visit logs
        List<Map<String, Object>> visits = jdbcTemplate.queryForList(
                "SELECT id, psr_id, sales_officer_id, outlet_id, outlet_name, visit_type, notes, created_at " +
                "FROM psr_visit_logs WHERE psr_id = ? ORDER BY id DESC LIMIT 30",
                psr.getId()
        );

        // Calculate Route Stats
        int totalOutlets = routeOutlets.size();
        int activeOrdersCount = 0;
        BigDecimal todayOrdersValue = BigDecimal.ZERO;
        int pendingRefundsCount = 0;
        int settledRefundsCount = 0;

        for (Map<String, Object> ord : orders) {
            String st = (String) ord.get("status");
            if ("SUBMITTED_TO_SO".equals(st) || "APPROVED_BY_SO".equals(st) || "DRAFT".equals(st)) {
                activeOrdersCount++;
            }
            if (ord.get("total_amount") != null) {
                try {
                    todayOrdersValue = todayOrdersValue.add(new BigDecimal(ord.get("total_amount").toString()));
                } catch (Exception ignored) {}
            }
        }

        for (Map<String, Object> ref : refunds) {
            String st = (String) ref.get("status");
            if ("SUBMITTED_TO_SO".equals(st) || "PENDING".equals(st)) {
                pendingRefundsCount++;
            } else if ("SETTLED".equals(st) || "APPROVED_BY_SO".equals(st)) {
                settledRefundsCount++;
            }
        }

        Map<String, Object> stats = new HashMap<>();
        stats.put("total_outlets", totalOutlets);
        stats.put("total_orders", orders.size());
        stats.put("active_orders_count", activeOrdersCount);
        stats.put("today_orders_value", todayOrdersValue);
        stats.put("pending_refunds_count", pendingRefundsCount);
        stats.put("settled_refunds_count", settledRefundsCount);

        Map<String, Object> res = new HashMap<>();
        res.put("psr", psr);
        res.put("sales_officer", so);
        res.put("sub_route", psr.getSubRoute());
        res.put("assigned_area", psr.getAssignedArea());
        res.put("outlets", routeOutlets);
        res.put("products", products);
        res.put("orders", orders);
        res.put("refunds", refunds);
        res.put("visits", visits);
        res.put("stats", stats);

        return ResponseEntity.ok(res);
    }

    /**
     * PSR Takes an Outlet Product Order and queues / submits it to the Sales Officer.
     */
    @PostMapping("/orders")
    public ResponseEntity<?> createOutletOrder(@RequestBody Map<String, Object> req) {
        try {
            Long psrId = Long.parseLong(req.get("psr_id").toString());
            PreSalesOfficer psr = psrRepository.findById(psrId)
                    .orElseThrow(() -> new RuntimeException("Pre-Sales Officer with ID " + psrId + " not found."));

            Long outletId = Long.parseLong(req.get("outlet_id").toString());
            Outlet outlet = outletRepository.findById(outletId)
                    .orElseThrow(() -> new RuntimeException("Outlet with ID " + outletId + " not found."));

            Long productId = Long.parseLong(req.get("product_id").toString());
            Product product = productRepository.findById(productId)
                    .orElseThrow(() -> new RuntimeException("Product with ID " + productId + " not found."));

            int quantity = Integer.parseInt(req.get("quantity").toString());
            if (quantity <= 0) {
                return ResponseEntity.badRequest().body(ApiResponse.fail("Order quantity must be at least 1."));
            }

            BigDecimal unitPrice = product.getOutletPrice() != null ? product.getOutletPrice() : product.getBasePrice();
            if (req.containsKey("unit_price") && req.get("unit_price") != null) {
                try {
                    unitPrice = new BigDecimal(req.get("unit_price").toString());
                } catch (Exception ignored) {}
            }

            BigDecimal totalAmount = unitPrice.multiply(BigDecimal.valueOf(quantity));
            String urgency = req.getOrDefault("urgency", "NORMAL").toString();
            String outletRemarks = (String) req.get("outlet_remarks");
            String psrNotes = (String) req.get("psr_notes");
            String status = req.getOrDefault("status", "SUBMITTED_TO_SO").toString();

            String orderCode = "PSR-ORD-" + (1000 + (int)(Math.random() * 9000));
            String outletName = (outlet.getFranchiseName() != null ? outlet.getFranchiseName() : "") + " " +
                                (outlet.getBranchName() != null ? outlet.getBranchName() : "");
            String productName = product.getBrand() + " " + (product.getFlavorVariant() != null ? product.getFlavorVariant() : "");

            jdbcTemplate.update(
                    "INSERT INTO psr_orders (order_code, psr_id, psr_name, sales_officer_id, outlet_id, outlet_name, sub_route, " +
                    "product_id, product_name, quantity, unit_price, total_amount, urgency, status, outlet_remarks, psr_notes, created_at, updated_at) " +
                    "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())",
                    orderCode, psr.getId(), psr.getName(), psr.getSalesOfficerId(), outlet.getOutletId(),
                    outletName.trim(), psr.getSubRoute(), product.getProductId(), productName.trim(),
                    quantity, unitPrice, totalAmount, urgency, status, outletRemarks, psrNotes
            );

            // Log visit
            try {
                jdbcTemplate.update(
                        "INSERT INTO psr_visit_logs (psr_id, sales_officer_id, outlet_id, outlet_name, visit_type, notes, created_at) " +
                        "VALUES (?, ?, ?, ?, 'ORDER_COLLECTION', ?, NOW())",
                        psr.getId(), psr.getSalesOfficerId(), outlet.getOutletId(), outletName.trim(),
                        "Collected order " + orderCode + " (" + quantity + " units " + productName.trim() + ")"
                );
            } catch (Exception ignored) {}

            // Send notification to Sales Officer
            try {
                SalesOfficer so = salesOfficerRepository.findById(psr.getSalesOfficerId()).orElse(null);
                Long soUserId = (so != null && so.getUserId() != null) ? so.getUserId() : 100L + psr.getSalesOfficerId();

                AppNotification notif = new AppNotification();
                notif.setRecipientRole("SALES_OFFICER");
                notif.setRecipientUserId(soUserId);
                notif.setTitle("New Route Order from PSR " + psr.getName());
                notif.setMessage("PSR " + psr.getName() + " booked " + quantity + " cases of " + productName.trim() +
                                " (৳" + totalAmount + ") for " + outletName.trim() + " on route " + psr.getSubRoute() + ".");
                notif.setType("NEW_PSR_ORDER");
                notif.setReferenceCode(orderCode);
                notificationRepository.save(notif);
            } catch (Exception ignored) {}

            Map<String, Object> resp = new HashMap<>();
            resp.put("success", true);
            resp.put("order_code", orderCode);
            resp.put("message", "Order " + orderCode + " collected and submitted to Sales Officer!");
            resp.put("total_amount", totalAmount);

            return ResponseEntity.ok(resp);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ApiResponse.fail("Failed to place PSR order: " + e.getMessage()));
        }
    }

    /**
     * Submit batch orders to Sales Officer.
     */
    @PostMapping("/orders/submit-batch")
    public ResponseEntity<?> submitBatchOrders(@RequestBody Map<String, Object> req) {
        try {
            Long psrId = Long.parseLong(req.get("psr_id").toString());
            PreSalesOfficer psr = psrRepository.findById(psrId)
                    .orElseThrow(() -> new RuntimeException("Pre-Sales Officer not found."));

            int updated = jdbcTemplate.update(
                    "UPDATE psr_orders SET status = 'SUBMITTED_TO_SO', updated_at = NOW() WHERE psr_id = ? AND status IN ('DRAFT', 'SUBMITTED_TO_PSR')",
                    psrId
            );

            // Notify Sales Officer
            try {
                SalesOfficer so = salesOfficerRepository.findById(psr.getSalesOfficerId()).orElse(null);
                Long soUserId = (so != null && so.getUserId() != null) ? so.getUserId() : 100L + psr.getSalesOfficerId();

                AppNotification notif = new AppNotification();
                notif.setRecipientRole("SALES_OFFICER");
                notif.setRecipientUserId(soUserId);
                notif.setReferenceId(psr.getSalesOfficerId());
                notif.setTitle("Batch Restock Orders from PSR " + psr.getName());
                notif.setMessage("PSR " + psr.getName() + " submitted " + updated + " store orders from route " + psr.getSubRoute() + " for your review and approval.");
                notif.setType("NEW_PSR_ORDER");
                notificationRepository.save(notif);
            } catch (Exception ignored) {}

            return ResponseEntity.ok(Map.of("success", true, "submitted_count", updated));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ApiResponse.fail("Failed to submit batch: " + e.getMessage()));
        }
    }

    /**
     * PSR forwards or requests an individual order to the Sales Officer.
     * The Sales Officer receives an instant notification from the PSR.
     */
    @PostMapping("/orders/{id}/submit-to-so")
    public ResponseEntity<?> submitOrderToSalesOfficer(@PathVariable Long id, @RequestBody(required = false) Map<String, Object> req) {
        try {
            List<Map<String, Object>> ordList = jdbcTemplate.queryForList("SELECT * FROM psr_orders WHERE id = ?", id);
            if (ordList.isEmpty()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ApiResponse.fail("Order not found."));
            }
            Map<String, Object> ord = ordList.get(0);
            Long psrId = Long.parseLong(ord.get("psr_id").toString());
            PreSalesOfficer psr = psrRepository.findById(psrId).orElse(null);
            String psrName = psr != null ? psr.getName() : (ord.get("psr_name") != null ? ord.get("psr_name").toString() : "Pre-Sales Officer");
            String orderCode = (String) ord.get("order_code");
            String outletName = (String) ord.get("outlet_name");
            String productName = (String) ord.get("product_name");
            int quantity = Integer.parseInt(ord.get("quantity").toString());
            Object totalAmount = ord.get("total_amount");

            jdbcTemplate.update(
                    "UPDATE psr_orders SET status = 'SUBMITTED_TO_SO', updated_at = NOW() WHERE id = ?",
                    id
            );

            // Notify Sales Officer
            Long soId = ord.get("sales_officer_id") != null ? Long.parseLong(ord.get("sales_officer_id").toString()) : (psr != null ? psr.getSalesOfficerId() : null);
            if (soId != null) {
                SalesOfficer so = salesOfficerRepository.findById(soId).orElse(null);
                Long soUserId = (so != null && so.getUserId() != null) ? so.getUserId() : 100L + soId;

                AppNotification notif = new AppNotification();
                notif.setRecipientRole("SALES_OFFICER");
                notif.setRecipientUserId(soUserId);
                notif.setReferenceId(soId);
                notif.setTitle("Restock Order Requested by PSR " + psrName);
                notif.setMessage("PSR " + psrName + " requested stock approval for " + quantity + " cases of " +
                        productName + " (৳" + totalAmount + ") for " + outletName + ".");
                notif.setType("NEW_PSR_ORDER");
                notif.setReferenceCode(orderCode);
                notificationRepository.save(notif);
            }

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Order " + orderCode + " submitted to Sales Officer for approval!",
                    "status", "SUBMITTED_TO_SO"
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ApiResponse.fail("Failed to submit order to Sales Officer: " + e.getMessage()));
        }
    }

    /**
     * Update PSR Order Status (e.g. Sales Officer approves/accepts or modifies order).
     * The PSR receives a notification when the Sales Officer accepts the request.
     */
    @PutMapping("/orders/{id}/status")
    public ResponseEntity<?> updateOrderStatus(@PathVariable Long id, @RequestBody Map<String, Object> req) {
        try {
            String status = (String) req.get("status");
            String notes = (String) req.get("psr_notes");

            List<Map<String, Object>> ordList = jdbcTemplate.queryForList("SELECT * FROM psr_orders WHERE id = ?", id);
            if (ordList.isEmpty()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ApiResponse.fail("Order not found."));
            }
            Map<String, Object> ord = ordList.get(0);

            // 1. Update order status
            jdbcTemplate.update(
                    "UPDATE psr_orders SET status = ?, updated_at = NOW() WHERE id = ?",
                    status, id
            );

            // 2. If Sales Officer accepts/approves order, or requests from supplier
            if ("REQUESTED_FROM_SUPPLIER".equalsIgnoreCase(status) || "APPROVED_BY_SO".equalsIgnoreCase(status) || "ACCEPTED".equalsIgnoreCase(status)) {
                try {
                    Long outletId = Long.parseLong(ord.get("outlet_id").toString());
                    Long productId = Long.parseLong(ord.get("product_id").toString());
                    int quantity = Integer.parseInt(ord.get("quantity").toString());
                    Long soId = ord.get("sales_officer_id") != null ? Long.parseLong(ord.get("sales_officer_id").toString()) : 1L;
                    String orderCode = (String) ord.get("order_code");
                    String psrName = ord.get("psr_name") != null ? ord.get("psr_name").toString() : "PSR";
                    String outletName = (String) ord.get("outlet_name");
                    String productName = (String) ord.get("product_name");
                    String urgency = ord.get("urgency") != null ? ord.get("urgency").toString() : "HIGH";

                    Product prod = productRepository.findById(productId).orElse(null);
                    BigDecimal unitPrice = ord.get("unit_price") != null ? new BigDecimal(ord.get("unit_price").toString()) : (prod != null && prod.getOutletPrice() != null ? prod.getOutletPrice() : BigDecimal.valueOf(42.50));
                    BigDecimal totalAmount = ord.get("total_amount") != null ? new BigDecimal(ord.get("total_amount").toString()) : unitPrice.multiply(BigDecimal.valueOf(quantity));

                    SalesOfficer so = salesOfficerRepository.findById(soId).orElse(null);
                    String soName = so != null ? so.getName() : "Sales Officer";

                    // Ensure outlet_requisitions entry exists for Supplier fulfillment
                    List<Map<String, Object>> existingReqs = jdbcTemplate.queryForList(
                            "SELECT id FROM outlet_requisitions WHERE requisition_code = ?", orderCode
                    );
                    String remarks = "Requested by SO " + soName + ": " + quantity + " cases of " + productName + " needed in " + outletName + " (via PSR " + psrName + ")";
                    String reqNotes = "SO Stock Request for Outlet fulfillment from SO purchased stock";

                    if (existingReqs.isEmpty()) {
                        jdbcTemplate.update(
                                "INSERT INTO outlet_requisitions (requisition_code, outlet_id, product_id, product_name, quantity, unit_price, total_amount, urgency, status, sales_officer_id, outlet_remarks, admin_supplier_notes, created_date, updated_date) " +
                                "VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', ?, ?, ?, NOW(), NOW())",
                                orderCode, outletId, productId, productName, quantity, unitPrice, totalAmount, urgency, soId, remarks, reqNotes
                        );
                    } else {
                        Long reqId = ((Number) existingReqs.get(0).get("id")).longValue();
                        jdbcTemplate.update(
                                "UPDATE outlet_requisitions SET quantity = ?, unit_price = ?, total_amount = ?, urgency = ?, status = 'PENDING', sales_officer_id = ?, outlet_remarks = ?, admin_supplier_notes = ?, updated_date = NOW() WHERE id = ?",
                                quantity, unitPrice, totalAmount, urgency, soId, remarks, reqNotes, reqId
                        );
                    }

                    // Notify Supplier that SO has requested stock for this outlet
                    Long supplierUserId = 4L;
                    if (so != null && so.getSupplierId() != null) {
                        SupplierProfile sp = supplierProfileRepository.findById(so.getSupplierId()).orElse(null);
                        if (sp != null && sp.getUserId() != null) {
                            supplierUserId = sp.getUserId();
                        }
                    } else {
                        SupplierProfile sp = supplierProfileRepository.findAll().stream().findFirst().orElse(null);
                        if (sp != null && sp.getUserId() != null) {
                            supplierUserId = sp.getUserId();
                        }
                    }

                    AppNotification suppNotif = new AppNotification();
                    suppNotif.setRecipientRole("SUPPLIER");
                    suppNotif.setRecipientUserId(supplierUserId);
                    suppNotif.setReferenceId(soId);
                    suppNotif.setTitle("Stock Needed: " + quantity + " cases in " + outletName);
                    suppNotif.setMessage("Sales Officer " + soName + " notified that " + quantity + " cases of " + productName +
                            " is needed in " + outletName + ". Please dispatch stocks to outlet from SO purchased stock.");
                    suppNotif.setType("SO_STOCK_REQUEST_FOR_OUTLET");
                    suppNotif.setReferenceCode(orderCode);
                    notificationRepository.save(suppNotif);
                } catch (Exception ex) {
                    System.err.println("[updateOrderStatus] Failed to notify supplier: " + ex.getMessage());
                }
            }

            // Notify PSR when Sales Officer accepts/approves
            try {
                Long psrId = Long.parseLong(ord.get("psr_id").toString());
                psrRepository.findById(psrId).ifPresent(p -> {
                    SalesOfficer so = null;
                    if (ord.get("sales_officer_id") != null) {
                        so = salesOfficerRepository.findById(Long.parseLong(ord.get("sales_officer_id").toString())).orElse(null);
                    }
                    String soName = so != null ? so.getName() : "Sales Officer";

                    String title;
                    String message;
                    String notifType;

                    if ("APPROVED_BY_SO".equalsIgnoreCase(status) || "ACCEPTED".equalsIgnoreCase(status)) {
                        title = "Order " + ord.get("order_code") + " Accepted by Sales Officer";
                        message = "Sales Officer " + soName + " accepted and approved your stock order for " +
                                ord.get("outlet_name") + " (" + ord.get("quantity") + " cases of " + ord.get("product_name") + ").";
                        notifType = "SO_ORDER_APPROVED";
                    } else if ("REJECTED".equalsIgnoreCase(status)) {
                        title = "Order " + ord.get("order_code") + " Declined by Sales Officer";
                        message = "Sales Officer " + soName + " declined your order for " + ord.get("outlet_name") + ".";
                        notifType = "SO_ORDER_REJECTED";
                    } else {
                        title = "Order " + ord.get("order_code") + " Updated: " + status;
                        message = "Sales Officer " + soName + " updated order for " + ord.get("outlet_name") + " to " + status + ".";
                        notifType = "PSR_ORDER_STATUS_UPDATE";
                    }

                    AppNotification notif = new AppNotification();
                    notif.setRecipientRole("PSR");
                    notif.setRecipientUserId(p.getUserId() != null ? p.getUserId() : 200L + p.getId());
                    notif.setReferenceId(p.getId());
                    notif.setTitle(title);
                    notif.setMessage(message);
                    notif.setType(notifType);
                    notif.setReferenceCode((String) ord.get("order_code"));
                    notificationRepository.save(notif);
                });
            } catch (Exception ignored) {}

            return ResponseEntity.ok(Map.of("success", true, "status", status));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ApiResponse.fail("Failed to update status: " + e.getMessage()));
        }
    }

    /**
     * Sales Officer tells the Regional Supplier that stock is needed in a particular outlet.
     * 1. Updates psr_orders status to 'REQUESTED_FROM_SUPPLIER'
     * 2. Upserts entry in outlet_requisitions so it is visible in Supplier Requisitions Hub
     * 3. Dispatches AppNotification to Supplier: "Stock Needed: [quantity] cases of [product] in [outlet]"
     * 4. Dispatches AppNotification to PSR
     */
    @PostMapping("/orders/{id}/so-request-supplier")
    public ResponseEntity<?> soRequestSupplierForOrder(@PathVariable Long id, @RequestBody(required = false) Map<String, Object> req) {
        try {
            List<Map<String, Object>> ordList = jdbcTemplate.queryForList("SELECT * FROM psr_orders WHERE id = ?", id);
            if (ordList.isEmpty()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ApiResponse.fail("Order not found."));
            }
            Map<String, Object> ord = ordList.get(0);
            Long outletId = Long.parseLong(ord.get("outlet_id").toString());
            Long productId = Long.parseLong(ord.get("product_id").toString());
            int quantity = Integer.parseInt(ord.get("quantity").toString());
            Long psrId = Long.parseLong(ord.get("psr_id").toString());
            Long soId = ord.get("sales_officer_id") != null ? Long.parseLong(ord.get("sales_officer_id").toString()) : 1L;
            if (req != null && req.get("sales_officer_id") != null) {
                try { soId = Long.parseLong(req.get("sales_officer_id").toString()); } catch (Exception ignored) {}
            }
            String orderCode = (String) ord.get("order_code");
            String psrName = ord.get("psr_name") != null ? ord.get("psr_name").toString() : "PSR";
            String outletName = (String) ord.get("outlet_name");
            String productName = (String) ord.get("product_name");
            String urgency = ord.get("urgency") != null ? ord.get("urgency").toString() : "HIGH";

            Product prod = productRepository.findById(productId).orElse(null);
            BigDecimal unitPrice = ord.get("unit_price") != null ? new BigDecimal(ord.get("unit_price").toString()) : (prod != null && prod.getOutletPrice() != null ? prod.getOutletPrice() : BigDecimal.valueOf(42.50));
            BigDecimal totalAmount = ord.get("total_amount") != null ? new BigDecimal(ord.get("total_amount").toString()) : unitPrice.multiply(BigDecimal.valueOf(quantity));

            // 1. Update order status to REQUESTED_FROM_SUPPLIER
            jdbcTemplate.update(
                    "UPDATE psr_orders SET status = 'REQUESTED_FROM_SUPPLIER', sales_officer_id = ?, updated_at = NOW() WHERE id = ?",
                    soId, id
            );

            SalesOfficer so = salesOfficerRepository.findById(soId).orElse(null);
            String soName = so != null ? so.getName() : "Sales Officer";

            // 2. Insert or update entry in outlet_requisitions
            List<Map<String, Object>> existingReqs = jdbcTemplate.queryForList(
                    "SELECT id FROM outlet_requisitions WHERE requisition_code = ?", orderCode
            );
            String remarks = "Requested by SO " + soName + ": " + quantity + " cases of " + productName + " needed in " + outletName + " (via PSR " + psrName + ")";
            String reqNotes = "SO Stock Request for Outlet fulfillment from SO purchased stock";

            if (existingReqs.isEmpty()) {
                jdbcTemplate.update(
                        "INSERT INTO outlet_requisitions (requisition_code, outlet_id, product_id, product_name, quantity, unit_price, total_amount, urgency, status, sales_officer_id, outlet_remarks, admin_supplier_notes, created_date, updated_date) " +
                        "VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', ?, ?, ?, NOW(), NOW())",
                        orderCode, outletId, productId, productName, quantity, unitPrice, totalAmount, urgency, soId, remarks, reqNotes
                );
            } else {
                Long reqId = ((Number) existingReqs.get(0).get("id")).longValue();
                jdbcTemplate.update(
                        "UPDATE outlet_requisitions SET quantity = ?, unit_price = ?, total_amount = ?, urgency = ?, status = 'PENDING', sales_officer_id = ?, outlet_remarks = ?, admin_supplier_notes = ?, updated_date = NOW() WHERE id = ?",
                        quantity, unitPrice, totalAmount, urgency, soId, remarks, reqNotes, reqId
                );
            }

            // 3. Resolve Supplier for this Sales Officer
            Long supplierUserId = 4L;
            if (so != null && so.getSupplierId() != null) {
                SupplierProfile sp = supplierProfileRepository.findById(so.getSupplierId()).orElse(null);
                if (sp != null && sp.getUserId() != null) {
                    supplierUserId = sp.getUserId();
                }
            } else {
                SupplierProfile sp = supplierProfileRepository.findAll().stream().findFirst().orElse(null);
                if (sp != null && sp.getUserId() != null) {
                    supplierUserId = sp.getUserId();
                }
            }

            // 4. Create AppNotification for Supplier
            AppNotification suppNotif = new AppNotification();
            suppNotif.setRecipientRole("SUPPLIER");
            suppNotif.setRecipientUserId(supplierUserId);
            suppNotif.setReferenceId(soId);
            suppNotif.setTitle("Stock Needed: " + quantity + " cases in " + outletName);
            suppNotif.setMessage("Sales Officer " + soName + " notified that " + quantity + " cases of " + productName +
                    " is needed in " + outletName + ". Please dispatch stocks to outlet from SO purchased stock.");
            suppNotif.setType("SO_STOCK_REQUEST_FOR_OUTLET");
            suppNotif.setReferenceCode(orderCode);
            notificationRepository.save(suppNotif);

            // 5. Notify PSR as well
            psrRepository.findById(psrId).ifPresent(p -> {
                AppNotification psrNotif = new AppNotification();
                psrNotif.setRecipientRole("PSR");
                psrNotif.setRecipientUserId(p.getUserId() != null ? p.getUserId() : (200L + p.getId()));
                psrNotif.setReferenceId(p.getId());
                psrNotif.setTitle("Order " + orderCode + " - Sent to Supplier");
                psrNotif.setMessage("Sales Officer " + soName + " approved your order and requested Supplier to dispatch " + quantity + " cases of " + productName + " to " + outletName + ".");
                psrNotif.setType("SO_REQUESTED_SUPPLIER");
                psrNotif.setReferenceCode(orderCode);
                notificationRepository.save(psrNotif);
            });

            Map<String, Object> resp = new HashMap<>();
            resp.put("success", true);
            resp.put("status", "REQUESTED_FROM_SUPPLIER");
            resp.put("order_code", orderCode);
            resp.put("outlet_name", outletName);
            resp.put("product_name", productName);
            resp.put("quantity", quantity);
            resp.put("supplier_user_id", supplierUserId);
            resp.put("message", "Notified Supplier that " + quantity + " cases of " + productName + " is needed in " + outletName);
            return ResponseEntity.ok(resp);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ApiResponse.fail("Failed to notify supplier: " + e.getMessage()));
        }
    }

    /**
     * Regional Supplier Dispatches Products for a PSR Order (from SO purchased stock).
     * Crucial: Deducts products directly from the Supplier's depot stock,
     * replenishes the outlet shelf, credits SO wholesale profit, and notifies SO, PSR and Outlet.
     */
    @PostMapping({"/orders/{id}/supplier-dispatch", "/orders/{id}/so-dispatch"})
    public ResponseEntity<?> soDispatchOrder(@PathVariable Long id, @RequestBody(required = false) Map<String, Object> req) {
        try {
            List<Map<String, Object>> ordList = jdbcTemplate.queryForList("SELECT * FROM psr_orders WHERE id = ?", id);
            if (ordList.isEmpty()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ApiResponse.fail("Order not found."));
            }
            Map<String, Object> ord = ordList.get(0);
            Long outletId = Long.parseLong(ord.get("outlet_id").toString());
            Long productId = Long.parseLong(ord.get("product_id").toString());
            int quantity = Integer.parseInt(ord.get("quantity").toString());
            Long psrId = Long.parseLong(ord.get("psr_id").toString());
            Long soId = ord.get("sales_officer_id") != null ? Long.parseLong(ord.get("sales_officer_id").toString()) : 1L;
            String orderCode = (String) ord.get("order_code");
            String psrName = ord.get("psr_name") != null ? ord.get("psr_name").toString() : "PSR";
            String outletName = (String) ord.get("outlet_name");
            String productName = (String) ord.get("product_name");

            // 1. Update order status to DISPATCHED
            jdbcTemplate.update(
                    "UPDATE psr_orders SET status = 'DISPATCHED', updated_at = NOW() WHERE id = ?",
                    id
            );

            // 2. Also update corresponding outlet_requisitions row if any
            try {
                jdbcTemplate.update(
                        "UPDATE outlet_requisitions SET status = 'FULFILLED', admin_supplier_notes = 'Dispatched from Supplier Depot by Sales Officer', updated_date = NOW() " +
                        "WHERE requisition_code = ? OR (outlet_id = ? AND product_id = ? AND status IN ('PENDING', 'PENDING_PSR', 'SUBMITTED_TO_PSR'))",
                        orderCode, outletId, productId
                );
            } catch (Exception ignored) {}

            // 3. Deduct from Supplier depot stock (district_inventory) since stocks are with the supplier
            Outlet outlet = outletRepository.findById(outletId).orElse(null);
            Long districtId = (outlet != null && outlet.getDistrictId() != null) ? outlet.getDistrictId() : 1L;
            int remainingSupplierStock = 0;

            var distInvOpt = districtInventoryRepository.findByDistrictIdAndProductId(districtId, productId);
            if (distInvOpt.isPresent()) {
                DistrictInventory di = distInvOpt.get();
                remainingSupplierStock = Math.max(0, di.getCurrentStock() - quantity);
                di.setCurrentStock(remainingSupplierStock);
                districtInventoryRepository.save(di);
            }

            // 4. Replenish outlet shop_inventory
            Optional<ShopInventory> invOpt = inventoryRepository.findByBranchIdAndProductId(outletId, productId);
            ShopInventory inv;
            if (invOpt.isPresent()) {
                inv = invOpt.get();
                inv.setStockQuantity(inv.getStockQuantity() + quantity);
                inv.setUpdatedDate(LocalDateTime.now());
            } else {
                inv = new ShopInventory(outletId, productId, quantity);
                inv.setUpdatedDate(LocalDateTime.now());
            }
            inventoryRepository.save(inv);

            // 5. Record Sales Officer Distribution & Financial Profit Ledger
            Product prod = productRepository.findById(productId).orElse(null);
            BigDecimal costPrice = (prod != null && prod.getSupplierPrice() != null) ? prod.getSupplierPrice() : BigDecimal.valueOf(35);
            BigDecimal salePrice = (prod != null && prod.getOutletPrice() != null) ? prod.getOutletPrice() : costPrice.multiply(BigDecimal.valueOf(1.15));
            BigDecimal totalCost = costPrice.multiply(BigDecimal.valueOf(quantity));
            BigDecimal totalRevenue = salePrice.multiply(BigDecimal.valueOf(quantity));
            BigDecimal profitEarned = totalRevenue.subtract(totalCost);

            try {
                jdbcTemplate.update(
                        "INSERT INTO sales_officer_distributions (sales_officer_id, outlet_id, product_id, quantity, cost_price, sale_price, total_cost, total_revenue, profit_earned, notes, distribution_date) " +
                        "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())",
                        soId, outletId, productId, quantity, costPrice, salePrice, totalCost, totalRevenue, profitEarned,
                        "Dispatched from Supplier Depot for PSR order " + orderCode
                );
            } catch (Exception ignored) {}

            SalesOfficer so = salesOfficerRepository.findById(soId).orElse(null);
            String soName = so != null ? so.getName() : "Sales Officer";

            // 6. Notify PSR that SO accepted and dispatched the products from supplier stock
            PreSalesOfficer psr = psrRepository.findById(psrId).orElse(null);
            if (psr != null) {
                AppNotification psrNotif = new AppNotification();
                psrNotif.setRecipientRole("PSR");
                psrNotif.setRecipientUserId(psr.getUserId() != null ? psr.getUserId() : 200L + psr.getId());
                psrNotif.setReferenceId(psr.getId());
                psrNotif.setTitle("Products Dispatched by Sales Officer " + soName);
                psrNotif.setMessage("Sales Officer " + soName + " dispatched " + quantity + " cases of " + productName +
                        " for " + outletName + ". Deducted from supplier depot stock (Depot Remaining: " + remainingSupplierStock + " cases).");
                psrNotif.setType("SO_ORDER_DISPATCHED");
                psrNotif.setReferenceCode(orderCode);
                notificationRepository.save(psrNotif);
            }

            // 7. Notify Outlet
            Long outletUserId = (outlet != null && outlet.getOutletId() != null) ? outlet.getOutletId() : outletId;
            AppNotification outNotif = new AppNotification();
            outNotif.setRecipientRole("OUTLET");
            outNotif.setRecipientUserId(outletUserId);
            outNotif.setReferenceId(outletId);
            outNotif.setTitle("Stock Dispatched & Delivered");
            outNotif.setMessage("Stock shipment of " + quantity + " units of " + productName +
                    " has been dispatched from supplier depot by Sales Officer " + soName + " and delivered to your outlet shelf. Inventory replenished!");
            outNotif.setType("PSR_STOCK_DISPATCHED");
            outNotif.setReferenceCode(orderCode);
            notificationRepository.save(outNotif);

            // 8. Notify Supplier that stock has been dispatched from their depot
            try {
                SupplierProfile supplier = supplierProfileRepository.findAll().stream().findFirst().orElse(null);
                Long supplierUserId = (supplier != null && supplier.getUserId() != null) ? supplier.getUserId() : 1L;

                AppNotification supNotif = new AppNotification();
                supNotif.setRecipientRole("SUPPLIER");
                supNotif.setRecipientUserId(supplierUserId);
                supNotif.setTitle("Stock Dispatched: " + quantity + " cases of " + productName);
                supNotif.setMessage("Dispatched " + quantity + " cases of " + productName +
                        " to outlet " + outletName + " from SO purchased stock (Depot Remaining: " + remainingSupplierStock + " cases).");
                supNotif.setType("STOCK_DISPATCHED");
                supNotif.setReferenceCode(orderCode);
                supNotif.setReferenceId(productId);
                notificationRepository.save(supNotif);
            } catch (Exception ignored) {}

            // 9. Notify Sales Officer that the stock has been dispatched to outlet by Supplier
            if (so != null) {
                try {
                    AppNotification soDispatchedNotif = new AppNotification();
                    soDispatchedNotif.setRecipientRole("SALES_OFFICER");
                    soDispatchedNotif.setRecipientUserId(so.getUserId() != null ? so.getUserId() : (100L + so.getId()));
                    soDispatchedNotif.setReferenceId(so.getId());
                    soDispatchedNotif.setTitle("Stock Dispatched by Supplier to " + outletName);
                    soDispatchedNotif.setMessage("Supplier has dispatched " + quantity + " cases of " + productName +
                            " to " + outletName + " from your purchased stock. Profit (+৳" + String.format(Locale.US, "%.2f", profitEarned.doubleValue()) +
                            ") credited to your wholesale ledger.");
                    soDispatchedNotif.setType("SUPPLIER_DISPATCHED_TO_OUTLET");
                    soDispatchedNotif.setReferenceCode(orderCode);
                    notificationRepository.save(soDispatchedNotif);
                } catch (Exception ignored) {}
            }

            Map<String, Object> resp = new HashMap<>();
            resp.put("success", true);
            resp.put("message", "Products dispatched from supplier stock successfully! Outlet shelf replenished.");
            resp.put("order_id", id);
            resp.put("order_code", orderCode);
            resp.put("outlet_shelf_stock", inv.getStockQuantity());
            resp.put("supplier_depot_stock", remainingSupplierStock);
            resp.put("profit_earned", profitEarned);

            return ResponseEntity.ok(resp);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ApiResponse.fail("Failed to dispatch stock: " + e.getMessage()));
        }
    }

    /**
     * PSR Direct Dispatch to Outlet is disabled.
     * All stocks to outlets are dispatched exclusively by Regional Suppliers (from SO purchased stock).
     */
    @PostMapping("/orders/{id}/dispatch")
    public ResponseEntity<?> dispatchOrderToOutlet(@PathVariable Long id, @RequestBody(required = false) Map<String, Object> req) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(ApiResponse.fail(
                "Direct supply by PSR is disabled. All stocks are supplied and dispatched to outlets exclusively by Regional Suppliers."
        ));
    }

    /**
     * PSR Logs an Outlet Product Refund / Return Request.
     */
    @PostMapping("/refunds")
    public ResponseEntity<?> createRefundRequest(@RequestBody Map<String, Object> req) {
        try {
            Long psrId = Long.parseLong(req.get("psr_id").toString());
            PreSalesOfficer psr = psrRepository.findById(psrId)
                    .orElseThrow(() -> new RuntimeException("Pre-Sales Officer with ID " + psrId + " not found."));

            Long outletId = Long.parseLong(req.get("outlet_id").toString());
            Outlet outlet = outletRepository.findById(outletId)
                    .orElseThrow(() -> new RuntimeException("Outlet with ID " + outletId + " not found."));

            Long productId = Long.parseLong(req.get("product_id").toString());
            Product product = productRepository.findById(productId)
                    .orElseThrow(() -> new RuntimeException("Product with ID " + productId + " not found."));

            int quantity = Integer.parseInt(req.get("quantity").toString());
            if (quantity <= 0) {
                return ResponseEntity.badRequest().body(ApiResponse.fail("Refund quantity must be at least 1."));
            }

            BigDecimal unitPrice = product.getOutletPrice() != null ? product.getOutletPrice() : product.getBasePrice();
            if (req.containsKey("unit_price") && req.get("unit_price") != null) {
                try {
                    unitPrice = new BigDecimal(req.get("unit_price").toString());
                } catch (Exception ignored) {}
            }

            BigDecimal refundAmount = unitPrice.multiply(BigDecimal.valueOf(quantity));
            String reason = (String) req.getOrDefault("reason", "DAMAGED_LEAKAGE");
            String outletRemarks = (String) req.get("outlet_remarks");
            String psrNotes = (String) req.get("psr_notes");

            String refundCode = "PSR-REF-" + (1000 + (int)(Math.random() * 9000));
            String outletName = (outlet.getFranchiseName() != null ? outlet.getFranchiseName() : "") + " " +
                                (outlet.getBranchName() != null ? outlet.getBranchName() : "");
            String productName = product.getBrand() + " " + (product.getFlavorVariant() != null ? product.getFlavorVariant() : "");

            jdbcTemplate.update(
                    "INSERT INTO psr_refund_requests (refund_code, psr_id, psr_name, sales_officer_id, outlet_id, outlet_name, sub_route, " +
                    "product_id, product_name, quantity, unit_price, refund_amount, reason, status, outlet_remarks, psr_notes, created_at, updated_at) " +
                    "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'SUBMITTED_TO_SO', ?, ?, NOW(), NOW())",
                    refundCode, psr.getId(), psr.getName(), psr.getSalesOfficerId(), outlet.getOutletId(),
                    outletName.trim(), psr.getSubRoute(), product.getProductId(), productName.trim(),
                    quantity, unitPrice, refundAmount, reason, outletRemarks, psrNotes
            );

            // Log visit
            try {
                jdbcTemplate.update(
                        "INSERT INTO psr_visit_logs (psr_id, sales_officer_id, outlet_id, outlet_name, visit_type, notes, created_at) " +
                        "VALUES (?, ?, ?, ?, 'REFUND_INSPECTION', ?, NOW())",
                        psr.getId(), psr.getSalesOfficerId(), outlet.getOutletId(), outletName.trim(),
                        "Logged refund " + refundCode + " (" + quantity + " units " + productName.trim() + " - " + reason + ")"
                );
            } catch (Exception ignored) {}

            // Send notification to Sales Officer
            try {
                SalesOfficer so = salesOfficerRepository.findById(psr.getSalesOfficerId()).orElse(null);
                Long soUserId = (so != null && so.getUserId() != null) ? so.getUserId() : 100L + psr.getSalesOfficerId();

                AppNotification notif = new AppNotification();
                notif.setRecipientRole("SALES_OFFICER");
                notif.setRecipientUserId(soUserId);
                notif.setTitle("New Field Refund Claim from PSR " + psr.getName());
                notif.setMessage("PSR " + psr.getName() + " recorded a return claim for " + quantity + " units of " +
                                productName.trim() + " (Reason: " + reason + ") from " + outletName.trim() + ".");
                notif.setType("NEW_PSR_REFUND");
                notif.setReferenceCode(refundCode);
                notificationRepository.save(notif);
            } catch (Exception ignored) {}

            Map<String, Object> resp = new HashMap<>();
            resp.put("success", true);
            resp.put("refund_code", refundCode);
            resp.put("message", "Refund request " + refundCode + " submitted to Sales Officer for approval.");
            resp.put("refund_amount", refundAmount);

            return ResponseEntity.ok(resp);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ApiResponse.fail("Failed to submit refund request: " + e.getMessage()));
        }
    }

    /**
     * Sales Officer Updates Refund Status (e.g. APPROVED_BY_SO, REJECTED, SETTLED).
     */
    @PutMapping("/refunds/{id}/status")
    public ResponseEntity<?> updateRefundStatus(@PathVariable Long id, @RequestBody Map<String, Object> req) {
        try {
            String status = (String) req.get("status");
            String soRemarks = (String) req.get("so_remarks");

            List<Map<String, Object>> refList = jdbcTemplate.queryForList("SELECT * FROM psr_refund_requests WHERE id = ?", id);
            if (refList.isEmpty()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ApiResponse.fail("Refund request not found."));
            }
            Map<String, Object> ref = refList.get(0);

            jdbcTemplate.update(
                    "UPDATE psr_refund_requests SET status = ?, so_remarks = ?, updated_at = NOW() WHERE id = ?",
                    status, soRemarks, id
            );

            // Notify PSR when Sales Officer accepts/approves refund
            try {
                Long psrId = Long.parseLong(ref.get("psr_id").toString());
                psrRepository.findById(psrId).ifPresent(p -> {
                    String title = "APPROVED_BY_SO".equalsIgnoreCase(status)
                            ? "Refund Claim " + ref.get("refund_code") + " Accepted by Sales Officer"
                            : "Refund " + ref.get("refund_code") + ": " + status;
                    String message = "APPROVED_BY_SO".equalsIgnoreCase(status)
                            ? "Sales Officer accepted and approved your return claim for " + ref.get("outlet_name") + " (" + ref.get("product_name") + ")." + (soRemarks != null && !soRemarks.trim().isEmpty() ? " Note: " + soRemarks : "")
                            : "Sales Officer updated refund for " + ref.get("outlet_name") + " to " + status + ".";
                    String notifType = "APPROVED_BY_SO".equalsIgnoreCase(status) ? "SO_REFUND_APPROVED" : "PSR_REFUND_STATUS_UPDATE";

                    AppNotification notif = new AppNotification();
                    notif.setRecipientRole("PSR");
                    notif.setRecipientUserId(p.getUserId() != null ? p.getUserId() : 200L + p.getId());
                    notif.setReferenceId(p.getId());
                    notif.setTitle(title);
                    notif.setMessage(message);
                    notif.setType(notifType);
                    notif.setReferenceCode((String) ref.get("refund_code"));
                    notificationRepository.save(notif);
                });
            } catch (Exception ignored) {}

            return ResponseEntity.ok(Map.of("success", true, "status", status));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ApiResponse.fail("Failed to update refund status: " + e.getMessage()));
        }
    }

    /**
     * Log a Field Visit (e.g. Routine check, stock audit).
     */
    @PostMapping("/visit-log")
    public ResponseEntity<?> logVisit(@RequestBody Map<String, Object> req) {
        try {
            Long psrId = Long.parseLong(req.get("psr_id").toString());
            PreSalesOfficer psr = psrRepository.findById(psrId).orElseThrow(() -> new RuntimeException("PSR not found"));

            Long outletId = Long.parseLong(req.get("outlet_id").toString());
            Outlet outlet = outletRepository.findById(outletId).orElseThrow(() -> new RuntimeException("Outlet not found"));

            String visitType = req.getOrDefault("visit_type", "ROUTINE_CHECK").toString();
            String notes = (String) req.get("notes");

            String outletName = (outlet.getFranchiseName() != null ? outlet.getFranchiseName() : "") + " " +
                                (outlet.getBranchName() != null ? outlet.getBranchName() : "");

            jdbcTemplate.update(
                    "INSERT INTO psr_visit_logs (psr_id, sales_officer_id, outlet_id, outlet_name, visit_type, notes, created_at) " +
                    "VALUES (?, ?, ?, ?, ?, ?, NOW())",
                    psr.getId(), psr.getSalesOfficerId(), outlet.getOutletId(), outletName.trim(), visitType, notes
            );

            return ResponseEntity.ok(Map.of("success", true, "message", "Field visit logged successfully."));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ApiResponse.fail("Failed to log visit: " + e.getMessage()));
        }
    }

    /**
     * Sales Officer Summary: Aggregate all PSRs, route orders, and refund requests under a specific Sales Officer.
     */
    @GetMapping("/so-summary/{salesOfficerId}")
    public ResponseEntity<?> getSalesOfficerSummary(@PathVariable Long salesOfficerId) {
        List<PreSalesOfficer> psrs = psrRepository.findBySalesOfficerId(salesOfficerId);
        enrichPsrs(psrs);

        List<Map<String, Object>> orders = jdbcTemplate.queryForList(
                "SELECT * FROM psr_orders WHERE sales_officer_id = ? ORDER BY id DESC LIMIT 100",
                salesOfficerId
        );

        List<Map<String, Object>> refunds = jdbcTemplate.queryForList(
                "SELECT * FROM psr_refund_requests WHERE sales_officer_id = ? ORDER BY id DESC LIMIT 100",
                salesOfficerId
        );

        int pendingOrdersCount = 0;
        BigDecimal pendingOrdersValue = BigDecimal.ZERO;
        int pendingRefundsCount = 0;
        BigDecimal pendingRefundsValue = BigDecimal.ZERO;

        for (Map<String, Object> o : orders) {
            String st = (String) o.get("status");
            if ("SUBMITTED_TO_SO".equals(st) || "PENDING".equals(st)) {
                pendingOrdersCount++;
                if (o.get("total_amount") != null) {
                    try {
                        pendingOrdersValue = pendingOrdersValue.add(new BigDecimal(o.get("total_amount").toString()));
                    } catch (Exception ignored) {}
                }
            }
        }

        for (Map<String, Object> r : refunds) {
            String st = (String) r.get("status");
            if ("SUBMITTED_TO_SO".equals(st) || "PENDING".equals(st)) {
                pendingRefundsCount++;
                if (r.get("refund_amount") != null) {
                    try {
                        pendingRefundsValue = pendingRefundsValue.add(new BigDecimal(r.get("refund_amount").toString()));
                    } catch (Exception ignored) {}
                }
            }
        }

        Map<String, Object> res = new HashMap<>();
        res.put("psrs", psrs);
        res.put("orders", orders);
        res.put("refunds", refunds);
        res.put("pending_orders_count", pendingOrdersCount);
        res.put("pending_orders_value", pendingOrdersValue);
        res.put("pending_refunds_count", pendingRefundsCount);
        res.put("pending_refunds_value", pendingRefundsValue);

        return ResponseEntity.ok(res);
    }

    private void enrichPsrs(List<PreSalesOfficer> psrs) {
        if (psrs == null || psrs.isEmpty()) return;

        Map<Long, SalesOfficer> soMap = new HashMap<>();
        salesOfficerRepository.findAll().forEach(so -> soMap.put(so.getId(), so));

        for (PreSalesOfficer psr : psrs) {
            if (psr.getSalesOfficerId() != null && soMap.containsKey(psr.getSalesOfficerId())) {
                SalesOfficer so = soMap.get(psr.getSalesOfficerId());
                psr.setSalesOfficerName(so.getName());
                psr.setSalesOfficerCode(so.getOfficerCode());
            }

            try {
                Integer outletCount = jdbcTemplate.queryForObject(
                        "SELECT COUNT(*) FROM outlets WHERE assigned_psr_id = ? OR sub_route = ?",
                        Integer.class,
                        psr.getId(), psr.getSubRoute()
                );
                psr.setOutletCount(outletCount != null ? outletCount : 0);
            } catch (Exception ignored) {
                psr.setOutletCount(0);
            }

            try {
                Integer activeOrd = jdbcTemplate.queryForObject(
                        "SELECT COUNT(*) FROM psr_orders WHERE psr_id = ? AND status IN ('SUBMITTED_TO_SO', 'DRAFT')",
                        Integer.class,
                        psr.getId()
                );
                psr.setActiveOrdersCount(activeOrd != null ? activeOrd : 0);
            } catch (Exception ignored) {
                psr.setActiveOrdersCount(0);
            }

            try {
                Integer pendingRef = jdbcTemplate.queryForObject(
                        "SELECT COUNT(*) FROM psr_refund_requests WHERE psr_id = ? AND status = 'SUBMITTED_TO_SO'",
                        Integer.class,
                        psr.getId()
                );
                psr.setPendingRefundsCount(pendingRef != null ? pendingRef : 0);
            } catch (Exception ignored) {
                psr.setPendingRefundsCount(0);
            }

            // Calculate achieved target cases
            try {
                Integer achieved = 0;
                if (psr.getTargetProductId() != null && psr.getTargetProductId() > 0) {
                    achieved = jdbcTemplate.queryForObject(
                            "SELECT COALESCE(SUM(quantity), 0) FROM psr_orders WHERE psr_id = ? AND product_id = ? AND status != 'CANCELLED'",
                            Integer.class,
                            psr.getId(), psr.getTargetProductId()
                    );
                } else {
                    achieved = jdbcTemplate.queryForObject(
                            "SELECT COALESCE(SUM(quantity), 0) FROM psr_orders WHERE psr_id = ? AND status != 'CANCELLED'",
                            Integer.class,
                            psr.getId()
                    );
                }
                psr.setAchievedCases(achieved != null ? achieved : 0);
            } catch (Exception ignored) {
                psr.setAchievedCases(0);
            }
        }
    }

    private List<Map<String, Object>> getOutletsForPsr(PreSalesOfficer psr) {
        List<Map<String, Object>> list = jdbcTemplate.queryForList(
                "SELECT outlet_id, franchise_name, branch_name, outlet_name, location_address AS address, contact_phone AS phone_number, district_id, sub_route, assigned_psr_id " +
                "FROM outlets WHERE assigned_psr_id = ? OR sub_route = ?",
                psr.getId(), psr.getSubRoute()
        );

        if (list.isEmpty()) {
            // Fallback: outlets in same area or territory
            SalesOfficer so = salesOfficerRepository.findById(psr.getSalesOfficerId()).orElse(null);
            if (so != null && so.getAssignedArea() != null) {
                list = jdbcTemplate.queryForList(
                        "SELECT outlet_id, franchise_name, branch_name, outlet_name, location_address AS address, contact_phone AS phone_number, district_id, sub_route, assigned_psr_id " +
                        "FROM outlets WHERE location_address LIKE ? OR franchise_name LIKE ?",
                        "%" + so.getAssignedArea() + "%", "%" + so.getAssignedArea() + "%"
                );
            }
        }

        if (list.isEmpty()) {
            list = jdbcTemplate.queryForList(
                    "SELECT outlet_id, franchise_name, branch_name, outlet_name, location_address AS address, contact_phone AS phone_number, district_id, sub_route, assigned_psr_id FROM outlets LIMIT 10"
            );
        }

        // Enrich outlets with real-time shop inventory for visits
        List<Product> allProds = productRepository.findAll();
        List<Long> outIds = new ArrayList<>();
        for (Map<String, Object> o : list) {
            if (o.get("outlet_id") != null) {
                try {
                    outIds.add(Long.parseLong(o.get("outlet_id").toString()));
                } catch (Exception ignored) {}
            }
        }

        Map<Long, List<Map<String, Object>>> invByOutlet = new HashMap<>();
        if (!outIds.isEmpty()) {
            String inSql = String.join(",", Collections.nCopies(outIds.size(), "?"));
            List<Map<String, Object>> allInvs = jdbcTemplate.queryForList(
                    "SELECT si.branch_id, si.product_id, si.stock_quantity, p.brand, p.flavor_variant, p.size_volume, p.packaging, p.sku, p.outlet_price, p.base_price " +
                    "FROM shop_inventory si JOIN products p ON si.product_id = p.product_id " +
                    "WHERE si.branch_id IN (" + inSql + ")",
                    outIds.toArray()
            );
            for (Map<String, Object> row : allInvs) {
                Long bId = Long.parseLong(row.get("branch_id").toString());
                invByOutlet.computeIfAbsent(bId, k -> new ArrayList<>()).add(row);
            }
        }

        for (Map<String, Object> o : list) {
            Long outId = o.get("outlet_id") != null ? Long.parseLong(o.get("outlet_id").toString()) : null;
            if (outId != null) {
                List<Map<String, Object>> inv = new ArrayList<>(invByOutlet.getOrDefault(outId, Collections.emptyList()));
                Set<Long> foundProductIds = new HashSet<>();
                for (Map<String, Object> row : inv) {
                    if (row.get("product_id") != null) {
                        foundProductIds.add(Long.parseLong(row.get("product_id").toString()));
                    }
                }
                for (Product prod : allProds) {
                    if (!foundProductIds.contains(prod.getProductId())) {
                        Map<String, Object> defRow = new HashMap<>();
                        defRow.put("product_id", prod.getProductId());
                        defRow.put("stock_quantity", 0);
                        defRow.put("brand", prod.getBrand());
                        defRow.put("flavor_variant", prod.getFlavorVariant());
                        defRow.put("size_volume", prod.getSizeVolume());
                        defRow.put("packaging", prod.getPackaging());
                        defRow.put("sku", prod.getSku());
                        defRow.put("outlet_price", prod.getOutletPrice());
                        defRow.put("base_price", prod.getBasePrice());
                        inv.add(defRow);
                    }
                }
                o.put("inventory", inv);
                int totalStock = 0;
                for (Map<String, Object> row : inv) {
                    if (row.get("stock_quantity") != null) {
                        try {
                            totalStock += Integer.parseInt(row.get("stock_quantity").toString());
                        } catch (Exception ignored) {}
                    }
                }
                o.put("total_shelf_stock", totalStock);
            }
        }

        return list;
    }

    /**
     * Get sub-routes and shops available in the Sales Officer's territory.
     * When selecting a sub-route, filters shops under that sub-route and shows all area shops.
     */
    @GetMapping("/subroute-shops")
    public ResponseEntity<?> getSubrouteShops(
            @RequestParam(required = false) Long salesOfficerId,
            @RequestParam(required = false) String subRoute) {

        SalesOfficer so = null;
        if (salesOfficerId != null) {
            so = salesOfficerRepository.findById(salesOfficerId).orElse(null);
        }

        String area = so != null && so.getAssignedArea() != null ? so.getAssignedArea() : "";

        // 1. Gather all sub-routes in this territory
        Set<String> subRoutes = new LinkedHashSet<>();
        if (!area.isEmpty()) {
            subRoutes.add(area + "-Circle North Route");
            subRoutes.add(area + "-Avenue South Route");
            subRoutes.add(area + "-Commercial Center Route");
            subRoutes.add(area + "-Retail Market Route");
        }
        try {
            List<String> outletRoutes = jdbcTemplate.queryForList(
                    "SELECT DISTINCT sub_route FROM outlets WHERE sub_route IS NOT NULL AND sub_route != ''",
                    String.class
            );
            subRoutes.addAll(outletRoutes);
        } catch (Exception ignored) {}

        try {
            List<String> psrRoutes = jdbcTemplate.queryForList(
                    "SELECT DISTINCT sub_route FROM pre_sales_officers WHERE sub_route IS NOT NULL AND sub_route != ''",
                    String.class
            );
            subRoutes.addAll(psrRoutes);
        } catch (Exception ignored) {}

        // 2. Fetch all shops in this territory/area
        List<Map<String, Object>> allShops;
        if (!area.isEmpty()) {
            allShops = jdbcTemplate.queryForList(
                    "SELECT o.outlet_id, o.franchise_name, o.branch_name, o.outlet_name, o.location_address AS address, " +
                    "o.contact_phone AS phone_number, o.district_id, o.sub_route, o.assigned_psr_id, " +
                    "p.name AS assigned_psr_name, p.psr_code AS assigned_psr_code " +
                    "FROM outlets o LEFT JOIN pre_sales_officers p ON o.assigned_psr_id = p.id " +
                    "WHERE o.location_address LIKE ? OR o.area LIKE ? OR o.sub_route IS NOT NULL ORDER BY o.outlet_id ASC",
                    "%" + area + "%", "%" + area + "%"
            );
            if (allShops.isEmpty()) {
                allShops = jdbcTemplate.queryForList(
                        "SELECT o.outlet_id, o.franchise_name, o.branch_name, o.outlet_name, o.location_address AS address, " +
                        "o.contact_phone AS phone_number, o.district_id, o.sub_route, o.assigned_psr_id, " +
                        "p.name AS assigned_psr_name, p.psr_code AS assigned_psr_code " +
                        "FROM outlets o LEFT JOIN pre_sales_officers p ON o.assigned_psr_id = p.id ORDER BY o.outlet_id ASC"
                );
            }
        } else {
            allShops = jdbcTemplate.queryForList(
                    "SELECT o.outlet_id, o.franchise_name, o.branch_name, o.outlet_name, o.location_address AS address, " +
                    "o.contact_phone AS phone_number, o.district_id, o.sub_route, o.assigned_psr_id, " +
                    "p.name AS assigned_psr_name, p.psr_code AS assigned_psr_code " +
                    "FROM outlets o LEFT JOIN pre_sales_officers p ON o.assigned_psr_id = p.id ORDER BY o.outlet_id ASC"
            );
        }

        // 3. Filter shops under the requested subRoute if provided
        List<Map<String, Object>> subrouteShops = new ArrayList<>();
        if (subRoute != null && !subRoute.trim().isEmpty()) {
            for (Map<String, Object> shop : allShops) {
                String sr = (String) shop.get("sub_route");
                if (subRoute.equalsIgnoreCase(sr)) {
                    subrouteShops.add(shop);
                }
            }
        }

        Map<String, Object> resp = new HashMap<>();
        resp.put("assigned_area", area);
        resp.put("sub_routes", new ArrayList<>(subRoutes));
        resp.put("all_shops", allShops);
        resp.put("subroute_shops", subrouteShops);
        return ResponseEntity.ok(resp);
    }

    /**
     * Sales Officer action: Allot shops under a sub-route to a PSR and set target (fixed cases + product SKU in ounces).
     */
    @PostMapping("/{id}/allot-outlets-target")
    public ResponseEntity<?> allotOutletsAndTarget(
            @PathVariable Long id,
            @RequestBody Map<String, Object> req) {
        try {
            PreSalesOfficer psr = psrRepository.findById(id)
                    .orElseThrow(() -> new RuntimeException("Pre-Sales Officer with ID " + id + " not found."));

            String subRoute = req.get("sub_route") != null ? req.get("sub_route").toString().trim() : psr.getSubRoute();
            if (subRoute != null && !subRoute.isEmpty()) {
                psr.setSubRoute(subRoute);
            }

            if (req.containsKey("target_cases")) {
                try {
                    int cases = Integer.parseInt(req.get("target_cases").toString());
                    psr.setTargetCases(cases);
                } catch (Exception ignored) {}
            }
            if (req.containsKey("target_sku_ounces") && req.get("target_sku_ounces") != null) {
                psr.setTargetSkuOunces(req.get("target_sku_ounces").toString().trim());
            }
            if (req.containsKey("target_product_id") && req.get("target_product_id") != null && !req.get("target_product_id").toString().isEmpty()) {
                try {
                    psr.setTargetProductId(Long.parseLong(req.get("target_product_id").toString()));
                } catch (Exception ignored) {}
            }
            if (req.containsKey("target_notes") && req.get("target_notes") != null) {
                psr.setTargetNotes(req.get("target_notes").toString().trim());
            }

            psr.setUpdatedAt(LocalDateTime.now());
            psrRepository.save(psr);

            // Process outlet allotments
            List<Long> outletIds = new ArrayList<>();
            if (req.containsKey("outlet_ids") && req.get("outlet_ids") instanceof List<?>) {
                List<?> rawList = (List<?>) req.get("outlet_ids");
                for (Object item : rawList) {
                    if (item != null) {
                        try {
                            outletIds.add(Long.parseLong(item.toString()));
                        } catch (Exception ignored) {}
                    }
                }
            }

            // Update outlets
            if (outletIds.isEmpty()) {
                jdbcTemplate.update(
                        "UPDATE outlets SET assigned_psr_id = NULL WHERE assigned_psr_id = ?",
                        psr.getId()
                );
            } else {
                String inSql = outletIds.stream().map(String::valueOf).collect(Collectors.joining(","));
                jdbcTemplate.update(
                        "UPDATE outlets SET assigned_psr_id = NULL WHERE assigned_psr_id = ? AND outlet_id NOT IN (" + inSql + ")",
                        psr.getId()
                );
                for (Long outId : outletIds) {
                    jdbcTemplate.update(
                            "UPDATE outlets SET assigned_psr_id = ?, sub_route = ?, updated_date = NOW() WHERE outlet_id = ?",
                            psr.getId(), subRoute, outId
                    );
                }
            }

            // Send notification to PSR
            try {
                SalesOfficer so = salesOfficerRepository.findById(psr.getSalesOfficerId()).orElse(null);
                AppNotification notif = new AppNotification();
                notif.setRecipientRole("PRE_SALES_OFFICER");
                notif.setRecipientUserId(psr.getUserId() != null ? psr.getUserId() : psr.getId());
                notif.setReferenceId(psr.getId());
                notif.setTitle("Route Allotment & Target Assigned");
                notif.setMessage("Sales Officer has allotted " + outletIds.size() + " shop(s) along sub-route '" +
                        subRoute + "'. Target: " + psr.getTargetCases() + " cases of " +
                        (psr.getTargetSkuOunces() != null ? psr.getTargetSkuOunces() : "Assigned SKU") + ".");
                notif.setType("PSR_TARGET_ALLOTTED");
                notif.setReferenceCode("TGT-" + psr.getPsrCode());
                notificationRepository.save(notif);
            } catch (Exception ignored) {}

            enrichPsrs(List.of(psr));
            List<Map<String, Object>> updatedOutlets = getOutletsForPsr(psr);

            Map<String, Object> resp = new HashMap<>();
            resp.put("success", true);
            resp.put("message", "Successfully allotted " + outletIds.size() + " shops and set target of " + psr.getTargetCases() + " cases to " + psr.getName() + ".");
            resp.put("psr", psr);
            resp.put("outlets", updatedOutlets);

            return ResponseEntity.ok(resp);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ApiResponse.fail("Failed to allot outlets and target: " + e.getMessage()));
        }
    }
}
