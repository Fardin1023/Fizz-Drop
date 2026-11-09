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

            jdbcTemplate.update(
                    "UPDATE psr_orders SET status = ?, updated_at = NOW() WHERE id = ?",
                    status, id
            );

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
     * Sales Officer Dispatches Products for a PSR Order.
     * Crucial: Deducts products directly from the Supplier's depot stock (since stocks are with the supplier),
     * replenishes the outlet shelf, and notifies both PSR and Outlet.
     */
    @PostMapping("/orders/{id}/so-dispatch")
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
                supNotif.setMessage("Sales Officer " + soName + " dispatched " + quantity + " cases of " + productName +
                        " to outlet " + outletName + ". Deducted from your depot stock (Depot Remaining: " + remainingSupplierStock + " cases).");
                supNotif.setType("STOCK_DISPATCHED");
                supNotif.setReferenceCode(orderCode);
                supNotif.setReferenceId(productId);
                notificationRepository.save(supNotif);
            } catch (Exception ignored) {}

            Map<String, Object> resp = new HashMap<>();
            resp.put("success", true);
            resp.put("message", "Products dispatched from supplier stock successfully! Outlet shelf replenished.");
            resp.put("order_id", id);
            resp.put("order_code", orderCode);
            resp.put("outlet_shelf_stock", inv.getStockQuantity());
            resp.put("supplier_depot_stock", remainingSupplierStock);

            return ResponseEntity.ok(resp);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ApiResponse.fail("Failed to dispatch stock: " + e.getMessage()));
        }
    }

    /**
     * PSR Dispatches / Delivers stock directly to Outlet.
     * Replenishes the outlet's shelf inventory and sends a realtime notification to the outlet.
     */
    @PostMapping("/orders/{id}/dispatch")
    public ResponseEntity<?> dispatchOrderToOutlet(@PathVariable Long id, @RequestBody(required = false) Map<String, Object> req) {
        try {
            List<Map<String, Object>> ordList = jdbcTemplate.queryForList("SELECT * FROM psr_orders WHERE id = ?", id);
            if (ordList.isEmpty()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ApiResponse.fail("Order not found."));
            }
            Map<String, Object> ord = ordList.get(0);
            Long outletId = Long.parseLong(ord.get("outlet_id").toString());
            Long productId = Long.parseLong(ord.get("product_id").toString());
            int quantity = Integer.parseInt(ord.get("quantity").toString());
            String orderCode = (String) ord.get("order_code");
            String psrName = ord.get("psr_name") != null ? ord.get("psr_name").toString() : "Pre-Sales Officer";
            String productName = ord.get("product_name") != null ? ord.get("product_name").toString() : "Beverage Product";

            // 1. Update order status to DISPATCHED
            jdbcTemplate.update(
                    "UPDATE psr_orders SET status = 'DISPATCHED', updated_at = NOW() WHERE id = ?",
                    id
            );

            // 2. Also update corresponding outlet_requisitions row if any
            try {
                jdbcTemplate.update(
                        "UPDATE outlet_requisitions SET status = 'FULFILLED', admin_supplier_notes = ?, updated_date = NOW() " +
                        "WHERE requisition_code = ? OR (outlet_id = ? AND product_id = ? AND status IN ('PENDING', 'PENDING_PSR', 'SUBMITTED_TO_PSR'))",
                        "Stock delivered by PSR " + psrName, orderCode, outletId, productId
                );
            } catch (Exception ignored) {}

            // 3. Replenish outlet shop_inventory
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

            // 4. Log visit / delivery in psr_visit_logs
            try {
                Long psrId = Long.parseLong(ord.get("psr_id").toString());
                Long soId = ord.get("sales_officer_id") != null ? Long.parseLong(ord.get("sales_officer_id").toString()) : null;
                jdbcTemplate.update(
                        "INSERT INTO psr_visit_logs (psr_id, sales_officer_id, outlet_id, outlet_name, visit_type, notes, created_at) " +
                        "VALUES (?, ?, ?, ?, 'STOCK_DELIVERY', ?, NOW())",
                        psrId, soId, outletId, ord.get("outlet_name"),
                        "Delivered " + quantity + " units of " + productName + " for order " + orderCode
                );
            } catch (Exception ignored) {}

            // 5. Send Notification to Outlet
            Outlet outlet = outletRepository.findById(outletId).orElse(null);
            Long outletUserId = (outlet != null && outlet.getOutletId() != null) ? outlet.getOutletId() : outletId;

            AppNotification notif = new AppNotification();
            notif.setRecipientRole("OUTLET");
            notif.setRecipientUserId(outletUserId);
            notif.setTitle("Stock Delivered by PSR " + psrName);
            notif.setMessage("Pre-Sales Officer " + psrName + " has dispatched and delivered " + quantity + " units of " +
                    productName + " to your outlet shelf. Your inventory has been replenished!");
            notif.setType("PSR_STOCK_DISPATCHED");
            notif.setReferenceCode(orderCode);
            notif.setReferenceId(outletId);
            notificationRepository.save(notif);

            Map<String, Object> resp = new HashMap<>();
            resp.put("success", true);
            resp.put("message", "Stock dispatched to outlet successfully! Inventory replenished.");
            resp.put("order_id", id);
            resp.put("order_code", orderCode);
            resp.put("new_stock", inv.getStockQuantity());

            return ResponseEntity.ok(resp);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ApiResponse.fail("Failed to dispatch stock: " + e.getMessage()));
        }
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

        return list;
    }
}
