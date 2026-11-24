package com.fizzdrop.controller;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fizzdrop.dto.ApiResponse;
import com.fizzdrop.entity.AppNotification;
import com.fizzdrop.entity.Outlet;
import com.fizzdrop.entity.Product;
import com.fizzdrop.entity.SupplierProfile;
import com.fizzdrop.repository.AppNotificationRepository;
import com.fizzdrop.repository.OutletRepository;
import com.fizzdrop.repository.ProductRepository;
import com.fizzdrop.repository.SupplierProfileRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;

@RestController
@RequestMapping("/api/v1/delivery")
public class DeliveryController {

    private final JdbcTemplate jdbcTemplate;
    private final SupplierProfileRepository supplierProfileRepository;
    private final OutletRepository outletRepository;
    private final ProductRepository productRepository;
    private final AppNotificationRepository notificationRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public DeliveryController(JdbcTemplate jdbcTemplate,
                              SupplierProfileRepository supplierProfileRepository,
                              OutletRepository outletRepository,
                              ProductRepository productRepository,
                              AppNotificationRepository notificationRepository) {
        this.jdbcTemplate = jdbcTemplate;
        this.supplierProfileRepository = supplierProfileRepository;
        this.outletRepository = outletRepository;
        this.productRepository = productRepository;
        this.notificationRepository = notificationRepository;
    }

    private Long resolveSupplierId(Long userId, Long supplierId) {
        if (supplierId != null && supplierId > 0) return supplierId;
        if (userId != null && userId > 0) {
            Optional<SupplierProfile> sp = supplierProfileRepository.findByUserId(userId);
            if (sp.isPresent()) return sp.get().getId();
        }
        List<SupplierProfile> all = supplierProfileRepository.findAll();
        return all.isEmpty() ? 1L : all.get(0).getId();
    }

    private void notifySalesOfficersForDispatch(Long supplierId, String subRoute, String title, String message, String notifType, String dispatchCode, Long tripId) {
        if (supplierId == null) return;
        try {
            List<Map<String, Object>> soList = jdbcTemplate.queryForList(
                "SELECT id, user_id, name, assigned_area FROM sales_officers WHERE supplier_id = ?",
                supplierId
            );
            for (Map<String, Object> so : soList) {
                Long soId = ((Number) so.get("id")).longValue();
                Long soUserId = so.get("user_id") != null ? ((Number) so.get("user_id")).longValue() : (100L + soId);
                AppNotification soNotif = new AppNotification();
                soNotif.setRecipientRole("SALES_OFFICER");
                soNotif.setRecipientUserId(soUserId);
                soNotif.setTitle(title);
                soNotif.setMessage(message);
                soNotif.setType(notifType);
                soNotif.setReferenceCode(dispatchCode);
                soNotif.setReferenceId(tripId);
                notificationRepository.save(soNotif);
            }
        } catch (Exception ex) {
            System.err.println("[DeliveryController] Failed to notify Sales Officers: " + ex.getMessage());
        }
    }

    // Helper method to resolve Supplier IDs for a given RSM hierarchy: RSM -> ASMs -> SOs -> Suppliers
    private Set<Long> getSupplierIdsForRsm(Long rsmId, Long asmId) {
        Set<Long> supplierIds = new HashSet<>();
        if (rsmId == null || rsmId <= 0) return supplierIds;
        try {
            List<Map<String, Object>> rsmRows = jdbcTemplate.queryForList(
                "SELECT id, code, name, division FROM regional_sales_managers WHERE id = ?",
                rsmId
            );
            if (rsmRows.isEmpty()) {
                return supplierIds;
            }
            String division = (String) rsmRows.get(0).get("division");

            Set<Long> districtIds = new HashSet<>();
            if (asmId != null && asmId > 0) {
                List<Map<String, Object>> asmRows = jdbcTemplate.queryForList(
                    "SELECT district_id FROM area_sales_managers WHERE id = ? AND (rsm_id = ? OR LOWER(TRIM(division)) = LOWER(TRIM(?)))",
                    asmId, rsmId, division
                );
                for (Map<String, Object> asm : asmRows) {
                    if (asm.get("district_id") != null) {
                        districtIds.add(((Number) asm.get("district_id")).longValue());
                    }
                }
            } else {
                List<Map<String, Object>> asmRows = jdbcTemplate.queryForList(
                    "SELECT district_id FROM area_sales_managers WHERE rsm_id = ? OR LOWER(TRIM(division)) = LOWER(TRIM(?))",
                    rsmId, division
                );
                for (Map<String, Object> asm : asmRows) {
                    if (asm.get("district_id") != null) {
                        districtIds.add(((Number) asm.get("district_id")).longValue());
                    }
                }
            }

            // SOs in these districts
            if (!districtIds.isEmpty()) {
                String placeholders = String.join(",", Collections.nCopies(districtIds.size(), "?"));
                List<Map<String, Object>> soRows = jdbcTemplate.queryForList(
                    "SELECT id, supplier_id, allocated_supplier_ids FROM sales_officers WHERE district_id IN (" + placeholders + ")",
                    districtIds.toArray()
                );
                for (Map<String, Object> so : soRows) {
                    if (so.get("supplier_id") != null) {
                        supplierIds.add(((Number) so.get("supplier_id")).longValue());
                    }
                    Object alloc = so.get("allocated_supplier_ids");
                    if (alloc != null) {
                        String[] parts = alloc.toString().split(",");
                        for (String p : parts) {
                            try {
                                long sid = Long.parseLong(p.trim());
                                if (sid > 0) supplierIds.add(sid);
                            } catch (Exception ignored) {}
                        }
                    }
                }
            }

            // Also suppliers whose division matches RSM division (or primary_district_id in districtIds)
            if (asmId == null || asmId <= 0) {
                List<Map<String, Object>> supRows = jdbcTemplate.queryForList(
                    "SELECT id FROM supplier_profiles WHERE LOWER(TRIM(division_name)) = LOWER(TRIM(?))",
                    division
                );
                for (Map<String, Object> sp : supRows) {
                    if (sp.get("id") != null) {
                        supplierIds.add(((Number) sp.get("id")).longValue());
                    }
                }
            } else if (!districtIds.isEmpty()) {
                String placeholders = String.join(",", Collections.nCopies(districtIds.size(), "?"));
                List<Map<String, Object>> supRows = jdbcTemplate.queryForList(
                    "SELECT id FROM supplier_profiles WHERE primary_district_id IN (" + placeholders + ")",
                    districtIds.toArray()
                );
                for (Map<String, Object> sp : supRows) {
                    if (sp.get("id") != null) {
                        supplierIds.add(((Number) sp.get("id")).longValue());
                    }
                }
            }
        } catch (Exception e) {
            System.err.println("[DeliveryController] Failed to resolve suppliers for RSM: " + e.getMessage());
        }
        return supplierIds;
    }

    // ==========================================
    // 1. DELIVERY TEAMS & FLEET MANAGEMENT
    // ==========================================

    @GetMapping("/teams")
    public ResponseEntity<?> getDeliveryTeams(
            @RequestParam(required = false) Long supplierId,
            @RequestParam(required = false) Long userId,
            @RequestParam(required = false) Long rsmId,
            @RequestParam(required = false) Long asmId,
            @RequestParam(required = false, defaultValue = "false") boolean all) {

        List<Map<String, Object>> teams;
        if (rsmId != null) {
            Set<Long> supplierIds = getSupplierIdsForRsm(rsmId, asmId);
            if (supplierIds.isEmpty()) {
                teams = Collections.emptyList();
            } else {
                String placeholders = String.join(",", Collections.nCopies(supplierIds.size(), "?"));
                teams = jdbcTemplate.queryForList(
                    "SELECT t.*, s.business_name as supplier_name " +
                    "FROM supplier_delivery_teams t " +
                    "LEFT JOIN supplier_profiles s ON t.supplier_id = s.id " +
                    "WHERE t.supplier_id IN (" + placeholders + ") " +
                    "ORDER BY t.created_at DESC",
                    supplierIds.toArray()
                );
            }
        } else if (all) {
            teams = jdbcTemplate.queryForList(
                "SELECT t.*, s.business_name as supplier_name " +
                "FROM supplier_delivery_teams t " +
                "LEFT JOIN supplier_profiles s ON t.supplier_id = s.id " +
                "ORDER BY t.created_at DESC"
            );
        } else {
            Long sId = resolveSupplierId(userId, supplierId);
            teams = jdbcTemplate.queryForList(
                "SELECT t.*, s.business_name as supplier_name " +
                "FROM supplier_delivery_teams t " +
                "LEFT JOIN supplier_profiles s ON t.supplier_id = s.id " +
                "WHERE t.supplier_id = ? " +
                "ORDER BY t.created_at DESC",
                sId
            );
        }
        return ResponseEntity.ok(teams);
    }

    @PostMapping("/teams")
    public ResponseEntity<?> createDeliveryTeam(@RequestBody Map<String, Object> body) {
        Long userId = body.containsKey("user_id") && body.get("user_id") != null ? Long.parseLong(body.get("user_id").toString()) : null;
        Long supplierId = body.containsKey("supplier_id") && body.get("supplier_id") != null ? Long.parseLong(body.get("supplier_id").toString()) : null;
        Long sId = resolveSupplierId(userId, supplierId);

        String teamName = (String) body.getOrDefault("team_name", "Supplier Delivery Fleet");
        String regNo = (String) body.getOrDefault("vehicle_registration_no", "DHA-METRO-" + System.currentTimeMillis() % 10000);
        String vehicleType = (String) body.getOrDefault("vehicle_type", "Covered Van");
        String driverName = (String) body.getOrDefault("driver_name", "Lead Driver");
        String driverPhone = (String) body.getOrDefault("driver_phone", "01700-000000");
        String members = (String) body.getOrDefault("team_members", driverName + " (Lead Driver)");
        int maxCapacity = body.containsKey("max_capacity_cases") && body.get("max_capacity_cases") != null
                ? Integer.parseInt(body.get("max_capacity_cases").toString()) : 250;

        jdbcTemplate.update(
            "INSERT INTO supplier_delivery_teams " +
            "(supplier_id, team_name, vehicle_registration_no, vehicle_type, driver_name, driver_phone, team_members, max_capacity_cases, status, created_at, updated_at) " +
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'AVAILABLE', NOW(), NOW())",
            sId, teamName, regNo, vehicleType, driverName, driverPhone, members, maxCapacity
        );

        Long newId = jdbcTemplate.queryForObject("SELECT LAST_INSERT_ID()", Long.class);
        return ResponseEntity.ok(Map.of(
            "success", true,
            "message", "Delivery team '" + teamName + "' created successfully with vehicle registration " + regNo + "!",
            "id", newId != null ? newId : 0
        ));
    }

    @PutMapping("/teams/{id}")
    public ResponseEntity<?> updateDeliveryTeam(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        StringBuilder sql = new StringBuilder("UPDATE supplier_delivery_teams SET updated_at = NOW() ");
        List<Object> params = new ArrayList<>();

        if (body.containsKey("team_name")) {
            sql.append(", team_name = ? ");
            params.add(body.get("team_name"));
        }
        if (body.containsKey("vehicle_registration_no")) {
            sql.append(", vehicle_registration_no = ? ");
            params.add(body.get("vehicle_registration_no"));
        }
        if (body.containsKey("vehicle_type")) {
            sql.append(", vehicle_type = ? ");
            params.add(body.get("vehicle_type"));
        }
        if (body.containsKey("driver_name")) {
            sql.append(", driver_name = ? ");
            params.add(body.get("driver_name"));
        }
        if (body.containsKey("driver_phone")) {
            sql.append(", driver_phone = ? ");
            params.add(body.get("driver_phone"));
        }
        if (body.containsKey("team_members")) {
            sql.append(", team_members = ? ");
            params.add(body.get("team_members"));
        }
        if (body.containsKey("max_capacity_cases")) {
            sql.append(", max_capacity_cases = ? ");
            params.add(Integer.parseInt(body.get("max_capacity_cases").toString()));
        }
        if (body.containsKey("status")) {
            sql.append(", status = ? ");
            params.add(body.get("status"));
        }

        sql.append("WHERE id = ?");
        params.add(id);

        jdbcTemplate.update(sql.toString(), params.toArray());
        return ResponseEntity.ok(Map.of("success", true, "message", "Delivery team updated successfully."));
    }

    @DeleteMapping("/teams/{id}")
    public ResponseEntity<?> deleteDeliveryTeam(@PathVariable Long id) {
        jdbcTemplate.update("DELETE FROM supplier_delivery_teams WHERE id = ?", id);
        return ResponseEntity.ok(Map.of("success", true, "message", "Delivery team removed successfully."));
    }

    // ==========================================
    // 2. SUB-ROUTES & OUTLET DEMANDS
    // ==========================================

    @GetMapping("/subroutes")
    public ResponseEntity<?> getSubroutesAndOutlets(
            @RequestParam(required = false) Long supplierId,
            @RequestParam(required = false) Long userId) {

        Long sId = resolveSupplierId(userId, supplierId);
        SupplierProfile sp = supplierProfileRepository.findById(sId).orElse(null);

        // Fetch all outlets
        List<Outlet> allOutlets = outletRepository.findAll();

        // Fetch all open / pending outlet requisitions
        List<Map<String, Object>> openDemands = jdbcTemplate.queryForList(
            "SELECT r.id, r.requisition_code, r.outlet_id, r.product_id, r.quantity, r.unit_price, r.total_amount, " +
            "r.status, r.created_date, p.brand, p.flavor_variant, p.category, p.sku " +
            "FROM outlet_requisitions r " +
            "JOIN products p ON r.product_id = p.product_id " +
            "WHERE r.status IN ('PENDING', 'APPROVED', 'DISPATCHED') AND r.outlet_id IS NOT NULL " +
            "ORDER BY r.created_date DESC"
        );

        Map<Long, List<Map<String, Object>>> demandsByOutlet = new HashMap<>();
        for (Map<String, Object> d : openDemands) {
            Object outIdObj = d.get("outlet_id");
            if (outIdObj == null) {
                outIdObj = d.get("OUTLET_ID");
            }
            if (outIdObj instanceof Number) {
                Long outId = ((Number) outIdObj).longValue();
                demandsByOutlet.computeIfAbsent(outId, k -> new ArrayList<>()).add(d);
            }
        }

        // Group outlets by sub_route (fallback to area if sub_route is blank)
        Map<String, List<Map<String, Object>>> routesMap = new LinkedHashMap<>();

        for (Outlet o : allOutlets) {
            String routeName = (o.getSubRoute() != null && !o.getSubRoute().trim().isEmpty())
                    ? o.getSubRoute().trim()
                    : ((o.getArea() != null && !o.getArea().trim().isEmpty()) ? o.getArea().trim() : "Main Territory Route");

            List<Map<String, Object>> outletDemands = demandsByOutlet.getOrDefault(o.getOutletId(), Collections.emptyList());

            int totalOutletDemandedCases = outletDemands.stream()
                    .mapToInt(dm -> dm.get("quantity") != null ? ((Number) dm.get("quantity")).intValue() : 0)
                    .sum();

            Map<String, Object> outMap = new HashMap<>();
            outMap.put("outlet_id", o.getOutletId());
            outMap.put("outlet_name", o.getOutletName());
            outMap.put("branch_name", o.getBranchName());
            outMap.put("franchise_name", o.getFranchiseName());
            outMap.put("location_address", o.getLocationAddress());
            outMap.put("contact_phone", o.getContactPhone());
            outMap.put("area", o.getArea());
            outMap.put("sub_route", routeName);
            outMap.put("demands", outletDemands);
            outMap.put("total_demanded_cases", totalOutletDemandedCases);

            routesMap.computeIfAbsent(routeName, k -> new ArrayList<>()).add(outMap);
        }

        List<Map<String, Object>> result = new ArrayList<>();
        for (Map.Entry<String, List<Map<String, Object>>> entry : routesMap.entrySet()) {
            int subrouteTotalCases = entry.getValue().stream()
                    .mapToInt(om -> ((Number) om.get("total_demanded_cases")).intValue())
                    .sum();

            Map<String, Object> rm = new HashMap<>();
            rm.put("sub_route", entry.getKey());
            rm.put("outlet_count", entry.getValue().size());
            rm.put("total_pending_demanded_cases", subrouteTotalCases);
            rm.put("outlets", entry.getValue());
            result.add(rm);
        }

        return ResponseEntity.ok(result);
    }

    // ==========================================
    // 3. VEHICLE DISPATCHES & TRIP MANIFESTS
    // ==========================================

    @GetMapping("/dispatches")
    public ResponseEntity<?> getDispatches(
            @RequestParam(required = false) Long supplierId,
            @RequestParam(required = false) Long userId,
            @RequestParam(required = false) Long soId,
            @RequestParam(required = false) Long salesOfficerId,
            @RequestParam(required = false) Long rsmId,
            @RequestParam(required = false) Long asmId,
            @RequestParam(required = false, defaultValue = "false") boolean all) {

        List<Map<String, Object>> list;
        Long targetSoId = soId != null ? soId : salesOfficerId;
        if (rsmId != null) {
            Set<Long> supplierIds = getSupplierIdsForRsm(rsmId, asmId);
            if (supplierIds.isEmpty()) {
                list = Collections.emptyList();
            } else {
                String placeholders = String.join(",", Collections.nCopies(supplierIds.size(), "?"));
                list = jdbcTemplate.queryForList(
                    "SELECT d.*, t.team_name, t.vehicle_registration_no, t.vehicle_type, t.driver_name, t.driver_phone, t.team_members, " +
                    "s.business_name as supplier_name " +
                    "FROM supplier_delivery_dispatches d " +
                    "LEFT JOIN supplier_delivery_teams t ON d.delivery_team_id = t.id " +
                    "LEFT JOIN supplier_profiles s ON d.supplier_id = s.id " +
                    "WHERE d.supplier_id IN (" + placeholders + ") " +
                    "ORDER BY d.dispatched_at DESC",
                    supplierIds.toArray()
                );
            }
        } else if (targetSoId != null) {
            List<Map<String, Object>> soRows = jdbcTemplate.queryForList(
                "SELECT id, supplier_id, assigned_area, city FROM sales_officers WHERE id = ? OR user_id = ?",
                targetSoId, targetSoId
            );
            if (!soRows.isEmpty()) {
                Object supIdVal = soRows.get(0).get("supplier_id");
                Long sId = (supIdVal instanceof Number) ? ((Number) supIdVal).longValue() : 1L;
                list = jdbcTemplate.queryForList(
                    "SELECT d.*, t.team_name, t.vehicle_registration_no, t.vehicle_type, t.driver_name, t.driver_phone, t.team_members, " +
                    "s.business_name as supplier_name " +
                    "FROM supplier_delivery_dispatches d " +
                    "LEFT JOIN supplier_delivery_teams t ON d.delivery_team_id = t.id " +
                    "LEFT JOIN supplier_profiles s ON d.supplier_id = s.id " +
                    "WHERE d.supplier_id = ? " +
                    "ORDER BY d.dispatched_at DESC",
                    sId
                );
            } else {
                list = Collections.emptyList();
            }
        } else if (all) {
            list = jdbcTemplate.queryForList(
                "SELECT d.*, t.team_name, t.vehicle_registration_no, t.vehicle_type, t.driver_name, t.driver_phone, t.team_members, " +
                "s.business_name as supplier_name " +
                "FROM supplier_delivery_dispatches d " +
                "LEFT JOIN supplier_delivery_teams t ON d.delivery_team_id = t.id " +
                "LEFT JOIN supplier_profiles s ON d.supplier_id = s.id " +
                "ORDER BY d.dispatched_at DESC"
            );
        } else {
            Long sId = resolveSupplierId(userId, supplierId);
            list = jdbcTemplate.queryForList(
                "SELECT d.*, t.team_name, t.vehicle_registration_no, t.vehicle_type, t.driver_name, t.driver_phone, t.team_members, " +
                "s.business_name as supplier_name " +
                "FROM supplier_delivery_dispatches d " +
                "LEFT JOIN supplier_delivery_teams t ON d.delivery_team_id = t.id " +
                "LEFT JOIN supplier_profiles s ON d.supplier_id = s.id " +
                "WHERE d.supplier_id = ? AND (t.supplier_id = ? OR t.supplier_id IS NULL) " +
                "ORDER BY d.dispatched_at DESC",
                sId, sId
            );
        }

        // Parse items_json
        List<Map<String, Object>> enriched = new ArrayList<>();
        for (Map<String, Object> row : list) {
            Map<String, Object> map = new HashMap<>(row);
            if (row.get("items_json") != null) {
                try {
                    List<Map<String, Object>> items = objectMapper.readValue(
                        row.get("items_json").toString(),
                        new TypeReference<List<Map<String, Object>>>() {}
                    );
                    map.put("items", items);
                } catch (Exception e) {
                    map.put("items", Collections.emptyList());
                }
            } else {
                map.put("items", Collections.emptyList());
            }
            enriched.add(map);
        }

        return ResponseEntity.ok(enriched);
    }

    @PostMapping("/dispatches")
    public ResponseEntity<?> createDispatch(@RequestBody Map<String, Object> body) {
        Long userId = body.containsKey("user_id") && body.get("user_id") != null ? Long.parseLong(body.get("user_id").toString()) : null;
        Long supplierId = body.containsKey("supplier_id") && body.get("supplier_id") != null ? Long.parseLong(body.get("supplier_id").toString()) : null;
        Long sId = resolveSupplierId(userId, supplierId);

        if (!body.containsKey("delivery_team_id") || body.get("delivery_team_id") == null) {
            return ResponseEntity.badRequest().body(ApiResponse.fail("Please select a delivery team / vehicle for this dispatch."));
        }
        Long teamId = Long.parseLong(body.get("delivery_team_id").toString());
        String subRoute = body.containsKey("sub_route") && body.get("sub_route") != null ? body.get("sub_route").toString() : "Central Sub-Route";
        String notes = body.containsKey("notes") && body.get("notes") != null ? body.get("notes").toString() : "";

        Object itemsObj = body.get("items");
        List<Map<String, Object>> items = new ArrayList<>();
        if (itemsObj instanceof List) {
            items = (List<Map<String, Object>>) itemsObj;
        }

        if (items.isEmpty()) {
            return ResponseEntity.badRequest().body(ApiResponse.fail("Please assign at least one outlet and product cases for this delivery route."));
        }

        int totalCases = 0;
        Set<Object> uniqueOutlets = new HashSet<>();
        for (Map<String, Object> it : items) {
            int qty = it.containsKey("assigned_cases") && it.get("assigned_cases") != null
                    ? Integer.parseInt(it.get("assigned_cases").toString())
                    : (it.containsKey("demanded_cases") && it.get("demanded_cases") != null ? Integer.parseInt(it.get("demanded_cases").toString()) : 0);
            totalCases += qty;
            if (it.containsKey("outlet_id")) {
                uniqueOutlets.add(it.get("outlet_id"));
            }
        }

        String dispatchCode = "DSP-FLEET-" + (System.currentTimeMillis() % 1000000) + "-" + (100 + new Random().nextInt(900));
        String itemsJson;
        try {
            itemsJson = objectMapper.writeValueAsString(items);
        } catch (Exception e) {
            itemsJson = "[]";
        }

        jdbcTemplate.update(
            "INSERT INTO supplier_delivery_dispatches " +
            "(dispatch_code, supplier_id, delivery_team_id, sub_route, total_cases, total_outlets, status, items_json, notes, dispatched_at, created_at, updated_at) " +
            "VALUES (?, ?, ?, ?, ?, ?, 'DISPATCHED', ?, ?, NOW(), NOW(), NOW())",
            dispatchCode, sId, teamId, subRoute, totalCases, uniqueOutlets.size(), itemsJson, notes
        );

        Long newDispatchId = null;
        try {
            newDispatchId = jdbcTemplate.queryForObject("SELECT LAST_INSERT_ID()", Long.class);
        } catch (Exception ignored) {}

        // Update team status to ON_DELIVERY
        jdbcTemplate.update("UPDATE supplier_delivery_teams SET status = 'ON_DELIVERY', updated_at = NOW() WHERE id = ?", teamId);

        // Update assigned outlet requisitions to DISPATCHED
        for (Map<String, Object> it : items) {
            String rCode = it.get("requisition_code") != null ? it.get("requisition_code").toString() : null;
            if (it.containsKey("requisition_id") && it.get("requisition_id") != null) {
                try {
                    Long reqId = Long.parseLong(it.get("requisition_id").toString());
                    jdbcTemplate.update(
                        "UPDATE outlet_requisitions SET status = 'DISPATCHED', admin_supplier_notes = ?, updated_date = NOW() WHERE id = ?",
                        "Assigned to Delivery Fleet (" + dispatchCode + ")", reqId
                    );
                    if (rCode == null) {
                        try {
                            List<Map<String, Object>> rRows = jdbcTemplate.queryForList("SELECT requisition_code FROM outlet_requisitions WHERE id = ?", reqId);
                            if (!rRows.isEmpty() && rRows.get(0).get("requisition_code") != null) {
                                rCode = rRows.get(0).get("requisition_code").toString();
                            }
                        } catch (Exception ignored) {}
                    }
                } catch (Exception ignored) {}
            }
            if (rCode != null && !rCode.trim().isEmpty()) {
                try {
                    jdbcTemplate.update(
                        "UPDATE psr_orders SET status = 'DISPATCHED', updated_at = NOW() WHERE order_code = ?",
                        rCode
                    );
                } catch (Exception ignored) {}
            }
        }

        // Fetch team details for response
        Map<String, Object> teamInfo = null;
        try {
            List<Map<String, Object>> tRows = jdbcTemplate.queryForList(
                "SELECT team_name, vehicle_registration_no, driver_name FROM supplier_delivery_teams WHERE id = ?", teamId
            );
            if (!tRows.isEmpty()) teamInfo = tRows.get(0);
        } catch (Exception ignored) {}

        // Notify outlets in this trip
        for (Object outIdObj : uniqueOutlets) {
            try {
                Long outId = Long.parseLong(outIdObj.toString());
                AppNotification notif = new AppNotification();
                notif.setRecipientRole("OUTLET");
                notif.setRecipientUserId(outId);
                notif.setTitle("Delivery Vehicle Dispatched by Supplier");
                notif.setMessage("A delivery vehicle has been dispatched on " + subRoute + " with your requested beverage cases (Trip Code: " + dispatchCode + ").");
                notif.setType("FLEET_DELIVERY_DISPATCHED");
                notif.setReferenceCode(dispatchCode);
                notif.setReferenceId(outId);
                notificationRepository.save(notif);
            } catch (Exception ignored) {}
        }

        // Notify Sales Officers for this supplier/subroute
        try {
            notifySalesOfficersForDispatch(
                sId, subRoute,
                "🚚 Delivery Truck Dispatched (" + subRoute + ")",
                "Vehicle dispatched for subroute '" + subRoute + "' with " + totalCases + " cases across " + uniqueOutlets.size() + " stores. Live map tracking active.",
                "SO_FLEET_DISPATCHED",
                dispatchCode,
                newDispatchId
            );
        } catch (Exception ignored) {}

        Map<String, Object> respMap = new HashMap<>();
        respMap.put("success", true);
        respMap.put("dispatch_id", newDispatchId);
        respMap.put("dispatch_code", dispatchCode);
        respMap.put("delivery_team_id", teamId);
        if (teamInfo != null) {
            respMap.put("team_name", teamInfo.get("team_name"));
            respMap.put("vehicle_registration_no", teamInfo.get("vehicle_registration_no"));
            respMap.put("driver_name", teamInfo.get("driver_name"));
        }
        respMap.put("message", "Successfully dispatched delivery vehicle on route '" + subRoute + "' with " + totalCases + " cases assigned to " + uniqueOutlets.size() + " outlets!");

        return ResponseEntity.ok(respMap);
    }

    @PutMapping("/dispatches/{id}/status")
    public ResponseEntity<?> updateDispatchStatus(
            @PathVariable Long id,
            @RequestBody Map<String, Object> body) {

        String newStatus = (String) body.getOrDefault("status", "IN_TRANSIT");

        List<Map<String, Object>> rows = jdbcTemplate.queryForList(
            "SELECT * FROM supplier_delivery_dispatches WHERE id = ?", id
        );
        if (rows.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ApiResponse.fail("Dispatch not found."));
        }
        Map<String, Object> trip = rows.get(0);
        Object dtIdObj = trip.get("delivery_team_id");
        Long teamId = (dtIdObj instanceof Number) ? ((Number) dtIdObj).longValue() : null;

        if ("DELIVERED".equalsIgnoreCase(newStatus) || "COMPLETED".equalsIgnoreCase(newStatus)) {
            jdbcTemplate.update(
                "UPDATE supplier_delivery_dispatches SET status = ?, delivered_at = NOW(), updated_at = NOW() WHERE id = ?",
                newStatus.toUpperCase(), id
            );
            // Free the delivery team back to AVAILABLE
            if (teamId != null) {
                jdbcTemplate.update("UPDATE supplier_delivery_teams SET status = 'AVAILABLE', updated_at = NOW() WHERE id = ?", teamId);
            }
        } else {
            jdbcTemplate.update(
                "UPDATE supplier_delivery_dispatches SET status = ?, updated_at = NOW() WHERE id = ?",
                newStatus.toUpperCase(), id
            );
        }

        return ResponseEntity.ok(Map.of(
            "success", true,
            "status", newStatus.toUpperCase(),
            "message", "Dispatch trip status updated to " + newStatus.toUpperCase() + "."
        ));
    }

    // ==========================================
    // 3B. DRIVER BOARDING & PROGRESSION ACTIONS
    // ==========================================

    @PutMapping("/dispatches/{id}/board")
    public ResponseEntity<?> boardDispatch(@PathVariable Long id) {
        List<Map<String, Object>> rows = jdbcTemplate.queryForList(
            "SELECT d.*, t.vehicle_registration_no, t.driver_name, t.supplier_id as team_supplier_id " +
            "FROM supplier_delivery_dispatches d " +
            "LEFT JOIN supplier_delivery_teams t ON d.delivery_team_id = t.id " +
            "WHERE d.id = ?", id
        );
        if (rows.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ApiResponse.fail("Dispatch trip not found."));
        }
        Map<String, Object> trip = rows.get(0);
        String regNo = (String) trip.getOrDefault("vehicle_registration_no", "FLEET");
        String driver = (String) trip.getOrDefault("driver_name", "Driver");
        String route = (String) trip.getOrDefault("sub_route", "Route");
        Long supplierId = ((Number) trip.get("supplier_id")).longValue();

        jdbcTemplate.update(
            "UPDATE supplier_delivery_dispatches SET status = 'BOARDED', boarded_at = NOW(), updated_at = NOW() WHERE id = ?",
            id
        );

        // Notify Supplier in real time
        try {
            AppNotification notif = new AppNotification();
            notif.setRecipientRole("SUPPLIER");
            notif.setRecipientUserId(supplierId);
            notif.setTitle("Stocks Boarded on Truck (" + regNo + ")");
            notif.setMessage("Driver " + driver + " confirmed stocks boarded onto vehicle " + regNo + " for subroute '" + route + "'. Ready to roll.");
            notif.setType("FLEET_STOCKS_BOARDED");
            notif.setReferenceCode((String) trip.get("dispatch_code"));
            notif.setReferenceId(id);
            notificationRepository.save(notif);
        } catch (Exception ignored) {}

        // Notify Sales Officers in real time
        try {
            notifySalesOfficersForDispatch(
                supplierId, route,
                "📦 Stocks Boarded on Truck (" + regNo + ")",
                "Driver " + driver + " confirmed stocks boarded onto vehicle " + regNo + " for subroute '" + route + "'.",
                "SO_FLEET_STOCKS_BOARDED",
                (String) trip.get("dispatch_code"),
                id
            );
        } catch (Exception ignored) {}

        // Update assigned outlet requisitions to BOARDED and notify outlets in real time
        if (trip.get("items_json") != null) {
            try {
                List<Map<String, Object>> items = objectMapper.readValue(
                    trip.get("items_json").toString(),
                    new TypeReference<List<Map<String, Object>>>() {}
                );
                Set<Long> notifiedOutlets = new HashSet<>();
                for (Map<String, Object> it : items) {
                    if (it.get("requisition_id") != null) {
                        try {
                            Long rId = Long.parseLong(it.get("requisition_id").toString());
                            jdbcTemplate.update(
                                "UPDATE outlet_requisitions SET status = 'BOARDED', admin_supplier_notes = ?, updated_date = NOW() WHERE id = ?",
                                "Verified & Boarded on truck " + regNo + " (" + driver + ")", rId
                            );
                        } catch (Exception ignored) {}
                    }
                    if (it.get("outlet_id") != null) {
                        try {
                            Long outId = Long.parseLong(it.get("outlet_id").toString());
                            if (notifiedOutlets.add(outId)) {
                                AppNotification outNotif = new AppNotification();
                                outNotif.setRecipientRole("OUTLET");
                                outNotif.setRecipientUserId(outId);
                                outNotif.setTitle("📦 Order Boarded on Delivery Truck (" + regNo + ")");
                                outNotif.setMessage("Your restock consignment has been verified and loaded onto vehicle " + regNo + " by driver " + driver + ". Departure shortly.");
                                outNotif.setType("OUTLET_STOCKS_BOARDED");
                                outNotif.setReferenceCode((String) trip.get("dispatch_code"));
                                outNotif.setReferenceId(id);
                                notificationRepository.save(outNotif);
                            }
                        } catch (Exception ignored) {}
                    }
                }
            } catch (Exception ignored) {}
        }

        return ResponseEntity.ok(Map.of(
            "success", true,
            "status", "BOARDED",
            "message", "Stocks verified and boarded on truck " + regNo + " successfully!"
        ));
    }

    @PutMapping("/dispatches/{id}/start-ride")
    public ResponseEntity<?> startDeliveryRide(@PathVariable Long id) {
        List<Map<String, Object>> rows = jdbcTemplate.queryForList(
            "SELECT d.*, t.vehicle_registration_no, t.driver_name " +
            "FROM supplier_delivery_dispatches d " +
            "LEFT JOIN supplier_delivery_teams t ON d.delivery_team_id = t.id " +
            "WHERE d.id = ?", id
        );
        if (rows.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ApiResponse.fail("Dispatch trip not found."));
        }
        Map<String, Object> trip = rows.get(0);
        String regNo = (String) trip.getOrDefault("vehicle_registration_no", "FLEET");
        String driver = (String) trip.getOrDefault("driver_name", "Driver");
        String route = (String) trip.getOrDefault("sub_route", "Route");
        Long supplierId = ((Number) trip.get("supplier_id")).longValue();

        jdbcTemplate.update(
            "UPDATE supplier_delivery_dispatches SET status = 'IN_TRANSIT', ride_started_at = NOW(), updated_at = NOW() WHERE id = ?",
            id
        );

        // Notify Supplier
        try {
            AppNotification notif = new AppNotification();
            notif.setRecipientRole("SUPPLIER");
            notif.setRecipientUserId(supplierId);
            notif.setTitle("Vehicle In Transit (" + regNo + ")");
            notif.setMessage("Delivery run started! Driver " + driver + " is now in transit along subroute '" + route + "'.");
            notif.setType("FLEET_RIDE_STARTED");
            notif.setReferenceCode((String) trip.get("dispatch_code"));
            notif.setReferenceId(id);
            notificationRepository.save(notif);
        } catch (Exception ignored) {}

        // Notify Sales Officers in real time
        try {
            notifySalesOfficersForDispatch(
                supplierId, route,
                "🚚 Delivery Truck In Transit (" + regNo + ")",
                "Delivery ride started! Driver " + driver + " is now in transit along subroute '" + route + "'. Track live progression on map.",
                "SO_FLEET_RIDE_STARTED",
                (String) trip.get("dispatch_code"),
                id
            );
        } catch (Exception ignored) {}

        // Update assigned outlet requisitions to IN_TRANSIT and notify outlets in real time
        if (trip.get("items_json") != null) {
            try {
                List<Map<String, Object>> items = objectMapper.readValue(
                    trip.get("items_json").toString(),
                    new TypeReference<List<Map<String, Object>>>() {}
                );
                Set<Long> notifiedOutlets = new HashSet<>();
                for (Map<String, Object> it : items) {
                    if (it.get("requisition_id") != null) {
                        try {
                            Long rId = Long.parseLong(it.get("requisition_id").toString());
                            jdbcTemplate.update(
                                "UPDATE outlet_requisitions SET status = 'IN_TRANSIT', admin_supplier_notes = ?, updated_date = NOW() WHERE id = ?",
                                "On the way to outlet via " + regNo + " (Driver: " + driver + ")", rId
                            );
                        } catch (Exception ignored) {}
                    }
                    if (it.get("outlet_id") != null) {
                        try {
                            Long outId = Long.parseLong(it.get("outlet_id").toString());
                            if (notifiedOutlets.add(outId)) {
                                AppNotification outNotif = new AppNotification();
                                outNotif.setRecipientRole("OUTLET");
                                outNotif.setRecipientUserId(outId);
                                outNotif.setTitle("🚚 Delivery Truck On The Way! (" + regNo + ")");
                                outNotif.setMessage("Delivery truck " + regNo + " (driver " + driver + ") has departed depot and is now on the way to your outlet along " + route + "!");
                                outNotif.setType("OUTLET_RIDE_STARTED");
                                outNotif.setReferenceCode((String) trip.get("dispatch_code"));
                                outNotif.setReferenceId(id);
                                notificationRepository.save(outNotif);
                            }
                        } catch (Exception ignored) {}
                    }
                }
            } catch (Exception ignored) {}
        }

        return ResponseEntity.ok(Map.of(
            "success", true,
            "status", "IN_TRANSIT",
            "message", "Delivery ride started for vehicle " + regNo + "!"
        ));
    }

    @PostMapping("/dispatches/{id}/confirm-outlet-delivery")
    public ResponseEntity<?> confirmOutletDelivery(
            @PathVariable Long id,
            @RequestBody Map<String, Object> body) {

        if (!body.containsKey("outlet_id") || body.get("outlet_id") == null) {
            return ResponseEntity.badRequest().body(ApiResponse.fail("Missing outlet_id."));
        }
        Long targetOutletId = Long.parseLong(body.get("outlet_id").toString());
        Integer deliveredCases = body.containsKey("quantity_delivered") && body.get("quantity_delivered") != null
                ? Integer.parseInt(body.get("quantity_delivered").toString()) : null;
        String notes = body.containsKey("notes") && body.get("notes") != null ? body.get("notes").toString() : "";

        List<Map<String, Object>> rows = jdbcTemplate.queryForList(
            "SELECT d.*, t.vehicle_registration_no, t.driver_name " +
            "FROM supplier_delivery_dispatches d " +
            "LEFT JOIN supplier_delivery_teams t ON d.delivery_team_id = t.id " +
            "WHERE d.id = ?", id
        );
        if (rows.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ApiResponse.fail("Dispatch trip not found."));
        }
        Map<String, Object> trip = rows.get(0);
        String regNo = (String) trip.getOrDefault("vehicle_registration_no", "FLEET");
        String driver = (String) trip.getOrDefault("driver_name", "Driver");
        String route = (String) trip.getOrDefault("sub_route", "Route");
        Long supplierId = ((Number) trip.get("supplier_id")).longValue();

        List<Map<String, Object>> items = new ArrayList<>();
        if (trip.get("items_json") != null) {
            try {
                items = objectMapper.readValue(
                    trip.get("items_json").toString(),
                    new TypeReference<List<Map<String, Object>>>() {}
                );
            } catch (Exception ignored) {}
        }

        String outletName = "Outlet #" + targetOutletId;
        int totalCasesDelivered = 0;
        int totalOutletsOnTrip = ((Number) trip.getOrDefault("total_outlets", 1)).intValue();
        Set<Object> deliveredOutletsSet = new HashSet<>();

        for (Map<String, Object> it : items) {
            Long outId = it.containsKey("outlet_id") && it.get("outlet_id") != null
                    ? Long.parseLong(it.get("outlet_id").toString()) : -1L;
            if (outId.equals(targetOutletId)) {
                if (it.containsKey("outlet_name")) outletName = it.get("outlet_name").toString();
                it.put("stop_status", "DELIVERED_BY_DRIVER");
                it.put("driver_delivered_at", LocalDateTime.now().toString());
                int itemCases = deliveredCases != null ? deliveredCases
                        : (it.containsKey("assigned_cases") ? Integer.parseInt(it.get("assigned_cases").toString()) : 0);
                it.put("driver_delivered_cases", itemCases);
                it.put("driver_delivery_notes", notes);
                totalCasesDelivered += itemCases;
            }
            if ("DELIVERED_BY_DRIVER".equalsIgnoreCase(String.valueOf(it.get("stop_status")))
                    || "CONFIRMED_BY_OUTLET".equalsIgnoreCase(String.valueOf(it.get("stop_status")))) {
                deliveredOutletsSet.add(it.get("outlet_id"));
            }
        }

        String updatedItemsJson;
        try {
            updatedItemsJson = objectMapper.writeValueAsString(items);
        } catch (Exception e) {
            updatedItemsJson = trip.get("items_json").toString();
        }

        int deliveredCount = deliveredOutletsSet.size();
        String nextStatus = (deliveredCount >= totalOutletsOnTrip) ? "DELIVERED" : "IN_TRANSIT";

        jdbcTemplate.update(
            "UPDATE supplier_delivery_dispatches SET items_json = ?, delivered_outlets_count = ?, status = ?, updated_at = NOW() WHERE id = ?",
            updatedItemsJson, deliveredCount, nextStatus, id
        );

        // Real-time Notification to Supplier
        try {
            AppNotification notif = new AppNotification();
            notif.setRecipientRole("SUPPLIER");
            notif.setRecipientUserId(supplierId);
            notif.setTitle("Stock Delivered to " + outletName + " (" + regNo + ")");
            notif.setMessage("Driver " + driver + " confirmed delivery of " + totalCasesDelivered + " cases to " + outletName + " on route " + route + ". Awaiting outlet confirmation.");
            notif.setType("FLEET_STOP_DELIVERED");
            notif.setReferenceCode((String) trip.get("dispatch_code"));
            notif.setReferenceId(id);
            notificationRepository.save(notif);
        } catch (Exception ignored) {}

        // Notification to Outlet
        try {
            AppNotification outNotif = new AppNotification();
            outNotif.setRecipientRole("OUTLET");
            outNotif.setRecipientUserId(targetOutletId);
            outNotif.setTitle("Delivery Unloaded by Driver (" + regNo + ")");
            outNotif.setMessage("Vehicle " + regNo + " (Driver " + driver + ") has arrived and unloaded " + totalCasesDelivered + " cases at your branch. Please confirm receipt in your Inbound Deliveries tab.");
            outNotif.setType("FLEET_STOCK_ARRIVED");
            outNotif.setReferenceCode((String) trip.get("dispatch_code"));
            outNotif.setReferenceId(targetOutletId);
            notificationRepository.save(outNotif);
        } catch (Exception ignored) {}

        // Notification to Sales Officers
        try {
            notifySalesOfficersForDispatch(
                supplierId, route,
                "📦 Stock Dropped at " + outletName + " (" + regNo + ")",
                "Driver " + driver + " confirmed delivery of " + totalCasesDelivered + " cases to " + outletName + " on route " + route + ". Awaiting outlet confirmation.",
                "SO_FLEET_STOP_DELIVERED",
                (String) trip.get("dispatch_code"),
                id
            );
        } catch (Exception ignored) {}

        return ResponseEntity.ok(Map.of(
            "success", true,
            "outlet_id", targetOutletId,
            "stop_status", "DELIVERED_BY_DRIVER",
            "message", "Successfully confirmed delivery of " + totalCasesDelivered + " cases to " + outletName + "!"
        ));
    }

    @PostMapping("/confirm-outlet-receipt")
    public ResponseEntity<?> confirmOutletReceipt(@RequestBody Map<String, Object> body) {
        if (!body.containsKey("outlet_id") || body.get("outlet_id") == null) {
            return ResponseEntity.badRequest().body(ApiResponse.fail("Missing outlet_id."));
        }
        Long outletId = Long.parseLong(body.get("outlet_id").toString());
        Long dispatchId = body.containsKey("dispatch_id") && body.get("dispatch_id") != null
                ? Long.parseLong(body.get("dispatch_id").toString()) : null;

        List<Map<String, Object>> candidateTrips;
        if (dispatchId != null && dispatchId > 0) {
            candidateTrips = jdbcTemplate.queryForList("SELECT * FROM supplier_delivery_dispatches WHERE id = ?", dispatchId);
        } else {
            // Find most recent active trip for this outlet
            candidateTrips = jdbcTemplate.queryForList(
                "SELECT * FROM supplier_delivery_dispatches WHERE status IN ('DISPATCHED', 'BOARDED', 'IN_TRANSIT', 'DELIVERED') ORDER BY id DESC"
            );
        }

        if (candidateTrips.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ApiResponse.fail("No active delivery dispatch found."));
        }

        Map<String, Object> targetTrip = null;
        List<Map<String, Object>> targetItems = null;

        for (Map<String, Object> trip : candidateTrips) {
            if (trip.get("items_json") != null) {
                try {
                    List<Map<String, Object>> items = objectMapper.readValue(
                        trip.get("items_json").toString(),
                        new TypeReference<List<Map<String, Object>>>() {}
                    );
                    boolean hasOutlet = items.stream().anyMatch(it -> {
                        Long oid = it.get("outlet_id") != null ? Long.parseLong(it.get("outlet_id").toString()) : -1L;
                        return oid.equals(outletId);
                    });
                    if (hasOutlet) {
                        targetTrip = trip;
                        targetItems = items;
                        break;
                    }
                } catch (Exception ignored) {}
            }
        }

        if (targetTrip == null || targetItems == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ApiResponse.fail("Outlet not associated with this dispatch trip."));
        }

        Long tripId = ((Number) targetTrip.get("id")).longValue();
        Long supplierId = ((Number) targetTrip.get("supplier_id")).longValue();
        String dispatchCode = (String) targetTrip.get("dispatch_code");

        BigDecimal totalStopProfit = BigDecimal.ZERO;
        String outletName = "Outlet #" + outletId;
        int stopDeliveredCases = 0;
        Set<Object> confirmedOutletsSet = new HashSet<>();
        int totalTripOutlets = ((Number) targetTrip.getOrDefault("total_outlets", 1)).intValue();

        for (Map<String, Object> it : targetItems) {
            Long oid = it.get("outlet_id") != null ? Long.parseLong(it.get("outlet_id").toString()) : -1L;
            if (oid.equals(outletId)) {
                if (it.containsKey("outlet_name")) outletName = it.get("outlet_name").toString();
                it.put("stop_status", "CONFIRMED_BY_OUTLET");
                it.put("outlet_confirmed_at", LocalDateTime.now().toString());
                it.put("outlet_confirmation_status", "CONFIRMED");

                int qty = it.containsKey("driver_delivered_cases") && it.get("driver_delivered_cases") != null
                        ? Integer.parseInt(it.get("driver_delivered_cases").toString())
                        : (it.containsKey("assigned_cases") ? Integer.parseInt(it.get("assigned_cases").toString()) : 0);
                stopDeliveredCases += qty;

                // Profit calculation:
                // Profit = (outlet_sale_price - product_sold_to_so_price) * cases
                Long prodId = it.get("product_id") != null ? Long.parseLong(it.get("product_id").toString()) : 1L;
                Product product = productRepository.findById(prodId).orElse(null);
                if (product != null) {
                    BigDecimal soldToSoRate = product.getSupplierPrice() != null ? product.getSupplierPrice()
                            : (product.getBasePrice() != null ? product.getBasePrice() : BigDecimal.valueOf(30.00));
                    BigDecimal outletPrice = product.getOutletPrice() != null ? product.getOutletPrice()
                            : (product.getBasePrice() != null ? product.getBasePrice() : soldToSoRate.multiply(BigDecimal.valueOf(1.15)));
                    BigDecimal unitProfit = outletPrice.subtract(soldToSoRate);
                    BigDecimal itemProfit = unitProfit.multiply(BigDecimal.valueOf(qty));
                    it.put("profit_earned", itemProfit.doubleValue());
                    totalStopProfit = totalStopProfit.add(itemProfit);

                    // Replenish outlet shelf stock in shop_inventory
                    try {
                        List<Map<String, Object>> exInv = jdbcTemplate.queryForList(
                            "SELECT stock_quantity FROM shop_inventory WHERE branch_id = ? AND product_id = ?",
                            outletId, prodId
                        );
                        if (exInv.isEmpty()) {
                            jdbcTemplate.update(
                                "INSERT INTO shop_inventory (branch_id, product_id, stock_quantity, created_date, updated_date) VALUES (?, ?, ?, NOW(), NOW())",
                                outletId, prodId, qty
                            );
                        } else {
                            jdbcTemplate.update(
                                "UPDATE shop_inventory SET stock_quantity = stock_quantity + ?, updated_date = NOW() WHERE branch_id = ? AND product_id = ?",
                                qty, outletId, prodId
                            );
                        }
                    } catch (Exception ex) {
                        System.err.println("[DeliveryController] Error updating shop_inventory: " + ex.getMessage());
                    }

                    // Mark outlet_requisitions COMPLETED
                    try {
                        jdbcTemplate.update(
                            "UPDATE outlet_requisitions SET status = 'COMPLETED', updated_date = NOW() WHERE outlet_id = ? AND product_id = ? AND status IN ('PENDING', 'APPROVED', 'DISPATCHED')",
                            outletId, prodId
                        );
                    } catch (Exception ignored) {}

                    // Mark psr_orders DELIVERED
                    try {
                        jdbcTemplate.update(
                            "UPDATE psr_orders SET status = 'DELIVERED', updated_at = NOW() WHERE (outlet_id = ? AND product_id = ? AND status IN ('SUBMITTED_TO_PSR', 'SUBMITTED_TO_SO', 'REQUESTED_FROM_SUPPLIER', 'DISPATCHED'))",
                            outletId, prodId
                        );
                    } catch (Exception ignored) {}

                    // Also fulfill free bonus package items if any
                    try {
                        List<Map<String, Object>> freeItems = jdbcTemplate.queryForList(
                            "SELECT free_product_id, free_quantity FROM outlet_requisitions " +
                            "WHERE outlet_id = ? AND product_id = ? AND free_product_id IS NOT NULL AND free_quantity > 0 ORDER BY id DESC LIMIT 1",
                            outletId, prodId
                        );
                        if (!freeItems.isEmpty()) {
                            Long freePId = ((Number) freeItems.get(0).get("free_product_id")).longValue();
                            int freeQ = ((Number) freeItems.get(0).get("free_quantity")).intValue();
                            if (freePId > 0 && freeQ > 0) {
                                List<Map<String, Object>> exFreeInv = jdbcTemplate.queryForList(
                                    "SELECT stock_quantity FROM shop_inventory WHERE branch_id = ? AND product_id = ?",
                                    outletId, freePId
                                );
                                if (exFreeInv.isEmpty()) {
                                    jdbcTemplate.update(
                                        "INSERT INTO shop_inventory (branch_id, product_id, stock_quantity, created_date, updated_date) VALUES (?, ?, ?, NOW(), NOW())",
                                        outletId, freePId, freeQ
                                    );
                                } else {
                                    jdbcTemplate.update(
                                        "UPDATE shop_inventory SET stock_quantity = stock_quantity + ?, updated_date = NOW() WHERE branch_id = ? AND product_id = ?",
                                        freeQ, outletId, freePId
                                    );
                                }
                                Optional<SupplierProfile> spOpt = supplierProfileRepository.findById(supplierId);
                                if (spOpt.isPresent() && spOpt.get().getPrimaryDistrictId() != null) {
                                    Long distId = spOpt.get().getPrimaryDistrictId();
                                    jdbcTemplate.update(
                                        "UPDATE district_inventory SET current_stock = GREATEST(0, current_stock - ?), updated_at = NOW() WHERE district_id = ? AND product_id = ?",
                                        freeQ, distId, freePId
                                    );
                                }
                            }
                        }
                    } catch (Exception ex) {
                        System.err.println("[DeliveryController] Note on free package delivery: " + ex.getMessage());
                    }

                    // Deduct from supplier depot stock if supplied from depot
                    try {
                        Optional<SupplierProfile> spOpt = supplierProfileRepository.findById(supplierId);
                        if (spOpt.isPresent() && spOpt.get().getPrimaryDistrictId() != null) {
                            Long distId = spOpt.get().getPrimaryDistrictId();
                            jdbcTemplate.update(
                                "UPDATE district_inventory SET current_stock = GREATEST(0, current_stock - ?), updated_at = NOW() WHERE district_id = ? AND product_id = ?",
                                qty, distId, prodId
                            );
                        }
                    } catch (Exception ignored) {}

                    // Update stock count on the products purchased from supplier by the SO (deducted ONLY upon confirmed outlet delivery)
                    Long soId = null;
                    try {
                        List<Map<String, Object>> soList = jdbcTemplate.queryForList(
                            "SELECT sales_officer_id FROM outlet_requisitions WHERE outlet_id = ? AND product_id = ? AND sales_officer_id IS NOT NULL ORDER BY id DESC LIMIT 1",
                            outletId, prodId
                        );
                        if (!soList.isEmpty() && soList.get(0).get("sales_officer_id") != null) {
                            soId = ((Number) soList.get(0).get("sales_officer_id")).longValue();
                        }
                    } catch (Exception ignored) {}

                    if (soId == null) {
                        try {
                            Outlet outObj = outletRepository.findById(outletId).orElse(null);
                            if (outObj != null && outObj.getArea() != null) {
                                List<Map<String, Object>> soAreaList = jdbcTemplate.queryForList(
                                    "SELECT id FROM sales_officers WHERE LOWER(assigned_area) = LOWER(?) LIMIT 1",
                                    outObj.getArea().trim()
                                );
                                if (!soAreaList.isEmpty()) {
                                    soId = ((Number) soAreaList.get(0).get("id")).longValue();
                                }
                            }
                        } catch (Exception ignored) {}
                    }

                    if (soId != null) {
                        try {
                            jdbcTemplate.update(
                                "UPDATE sales_officer_inventory " +
                                "SET current_stock = GREATEST(0, current_stock - ?), " +
                                "    total_distributed = total_distributed + ?, " +
                                "    updated_at = NOW() " +
                                "WHERE sales_officer_id = ? AND product_id = ?",
                                qty, qty, soId, prodId
                            );
                        } catch (Exception ex) {
                            System.err.println("[DeliveryController] Failed to update sales_officer_inventory: " + ex.getMessage());
                        }

                        // Record distribution record towards SO target
                        try {
                            List<Map<String, Object>> existingDist = jdbcTemplate.queryForList(
                                "SELECT id FROM sales_officer_distributions WHERE notes LIKE ?",
                                "%" + dispatchCode + "%"
                            );
                            if (existingDist.isEmpty()) {
                                jdbcTemplate.update(
                                    "INSERT INTO sales_officer_distributions (sales_officer_id, outlet_id, product_id, quantity, cost_price, sale_price, total_cost, total_revenue, profit_earned, notes, distribution_date) " +
                                    "VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, NOW())",
                                    soId, outletId, prodId, qty, soldToSoRate, outletPrice,
                                    soldToSoRate.multiply(BigDecimal.valueOf(qty)),
                                    outletPrice.multiply(BigDecimal.valueOf(qty)),
                                    "Delivery confirmed by " + outletName + " from SO purchased stock (" + dispatchCode + ")"
                                );
                            }
                        } catch (Exception ignored) {}

                        // Notify Sales Officer
                        try {
                            List<Map<String, Object>> soUserList = jdbcTemplate.queryForList("SELECT user_id, name FROM sales_officers WHERE id = ?", soId);
                            Long soUserId = !soUserList.isEmpty() && soUserList.get(0).get("user_id") != null ? ((Number) soUserList.get(0).get("user_id")).longValue() : (100L + soId);
                            AppNotification soNotif = new AppNotification();
                            soNotif.setRecipientRole("SALES_OFFICER");
                            soNotif.setRecipientUserId(soUserId);
                            soNotif.setTitle("Delivery Confirmed by " + outletName);
                            soNotif.setMessage(outletName + " has confirmed receipt of " + qty + " cases of " + product.getBrand() + " " + product.getFlavorVariant() + ". Your purchased stock count has been updated towards monthly target fulfillment.");
                            soNotif.setType("SO_STOCK_DELIVERY_CONFIRMED");
                            soNotif.setReferenceCode(dispatchCode);
                            soNotif.setReferenceId(tripId);
                            notificationRepository.save(soNotif);
                        } catch (Exception ignored) {}
                    }
                }
            }
            if ("CONFIRMED_BY_OUTLET".equalsIgnoreCase(String.valueOf(it.get("stop_status")))) {
                confirmedOutletsSet.add(it.get("outlet_id"));
            }
        }

        String updatedItemsJson;
        try {
            updatedItemsJson = objectMapper.writeValueAsString(targetItems);
        } catch (Exception e) {
            updatedItemsJson = targetTrip.get("items_json").toString();
        }

        int confirmedCount = confirmedOutletsSet.size();
        boolean tripFullyCompleted = confirmedCount >= totalTripOutlets;

        jdbcTemplate.update(
            "UPDATE supplier_delivery_dispatches SET items_json = ?, confirmed_outlets_count = ?, " +
            "total_profit_earned = total_profit_earned + ?, " +
            "status = CASE WHEN ? = TRUE THEN 'COMPLETED' ELSE status END, " +
            "delivered_at = CASE WHEN ? = TRUE THEN NOW() ELSE delivered_at END, " +
            "updated_at = NOW() WHERE id = ?",
            updatedItemsJson, confirmedCount, totalStopProfit, tripFullyCompleted, tripFullyCompleted, tripId
        );

        if (tripFullyCompleted) {
            Long teamId = ((Number) targetTrip.get("delivery_team_id")).longValue();
            jdbcTemplate.update("UPDATE supplier_delivery_teams SET status = 'AVAILABLE', updated_at = NOW() WHERE id = ?", teamId);
        }

        // Credit Supplier Wallet & Record Supplier Transaction
        try {
            Optional<SupplierProfile> spOpt = supplierProfileRepository.findById(supplierId);
            if (spOpt.isPresent()) {
                SupplierProfile sp = spOpt.get();
                BigDecimal cur = sp.getWalletBalance() != null ? sp.getWalletBalance() : BigDecimal.ZERO;
                sp.setWalletBalance(cur.add(totalStopProfit));
                supplierProfileRepository.saveAndFlush(sp);

                String txCode = "TXN-OUT-" + System.currentTimeMillis() + "-" + (100 + new Random().nextInt(900));
                jdbcTemplate.update(
                    "INSERT INTO supplier_transactions (transaction_code, supplier_id, reference_code, type, entry_type, amount, payment_method, description, status, created_at) " +
                    "VALUES (?, ?, ?, 'OUTLET_SALE', 'CREDIT', ?, 'OUTLET_WHOLESALE', ?, 'COMPLETED', NOW())",
                    txCode, supplierId, dispatchCode, totalStopProfit,
                    "Wholesale profit earned from outlet delivery of " + stopDeliveredCases + " cases to " + outletName + " (" + dispatchCode + "). Profit credited: +৳" + totalStopProfit
                );
            }
        } catch (Exception ex) {
            System.err.println("[DeliveryController] Failed to record profit transaction: " + ex.getMessage());
        }

        // Real-time Notification to Supplier of Earned Profit
        try {
            AppNotification notif = new AppNotification();
            notif.setRecipientRole("SUPPLIER");
            notif.setRecipientUserId(supplierId);
            notif.setTitle("🎉 Delivery Confirmed & Profit Credited (" + outletName + ")");
            notif.setMessage(outletName + " has confirmed receipt of " + stopDeliveredCases + " cases. Wholesale profit of +৳" + String.format(Locale.US, "%.2f", totalStopProfit.doubleValue()) + " has been automatically credited to your dashboard!");
            notif.setType("FLEET_OUTLET_CONFIRMED");
            notif.setReferenceCode(dispatchCode);
            notif.setReferenceId(tripId);
            notificationRepository.save(notif);
        } catch (Exception ignored) {}

        return ResponseEntity.ok(Map.of(
            "success", true,
            "outlet_id", outletId,
            "stop_status", "CONFIRMED_BY_OUTLET",
            "profit_earned", totalStopProfit,
            "trip_completed", tripFullyCompleted,
            "message", "Consignment receipt confirmed successfully! Stock added to shop inventory and profit of ৳" + String.format(Locale.US, "%.2f", totalStopProfit.doubleValue()) + " credited to supplier."
        ));
    }

    @PostMapping("/cancel-outlet-order")
    public ResponseEntity<?> cancelOutletOrder(@RequestBody Map<String, Object> body) {
        if (!body.containsKey("outlet_id") || body.get("outlet_id") == null) {
            return ResponseEntity.badRequest().body(ApiResponse.fail("Missing outlet_id."));
        }
        Long outletId = Long.parseLong(body.get("outlet_id").toString());
        Long dispatchId = body.containsKey("dispatch_id") && body.get("dispatch_id") != null
                ? Long.parseLong(body.get("dispatch_id").toString()) : null;
        Long requisitionId = body.containsKey("requisition_id") && body.get("requisition_id") != null
                ? Long.parseLong(body.get("requisition_id").toString()) : null;
        String reason = body.containsKey("reason") && body.get("reason") != null
                ? body.get("reason").toString() : "Cancelled by outlet while vehicle in transit";

        // 1. Fetch Outlet details
        String outletName = "Outlet #" + outletId;
        try {
            List<Map<String, Object>> outRows = jdbcTemplate.queryForList("SELECT outlet_name, branch_name FROM outlets WHERE outlet_id = ?", outletId);
            if (!outRows.isEmpty()) {
                outletName = (String) outRows.get(0).get("outlet_name");
                if (outRows.get(0).get("branch_name") != null) {
                    outletName += " (" + outRows.get(0).get("branch_name") + ")";
                }
            }
        } catch (Exception ignored) {}

        BigDecimal totalRefundAmount = BigDecimal.ZERO;
        int totalCancelledCases = 0;
        String refCode = "CANCEL-" + System.currentTimeMillis();

        // 2. Identify and Cancel Requisitions
        List<Map<String, Object>> targetReqs = new ArrayList<>();
        if (requisitionId != null) {
            targetReqs = jdbcTemplate.queryForList("SELECT * FROM outlet_requisitions WHERE id = ? AND outlet_id = ?", requisitionId, outletId);
        } else if (dispatchId != null) {
            List<Map<String, Object>> dispRows = jdbcTemplate.queryForList("SELECT * FROM supplier_delivery_dispatches WHERE id = ?", dispatchId);
            if (!dispRows.isEmpty() && dispRows.get(0).get("items_json") != null) {
                try {
                    List<Map<String, Object>> its = objectMapper.readValue(dispRows.get(0).get("items_json").toString(), new TypeReference<List<Map<String, Object>>>() {});
                    for (Map<String, Object> it : its) {
                        Long oid = it.get("outlet_id") != null ? Long.parseLong(it.get("outlet_id").toString()) : -1L;
                        if (oid.equals(outletId)) {
                            Long rId = it.get("requisition_id") != null ? Long.parseLong(it.get("requisition_id").toString()) : null;
                            if (rId != null) {
                                targetReqs.addAll(jdbcTemplate.queryForList("SELECT * FROM outlet_requisitions WHERE id = ?", rId));
                            }
                        }
                    }
                } catch (Exception ignored) {}
            }
        }

        if (targetReqs.isEmpty() && requisitionId != null) {
            targetReqs = jdbcTemplate.queryForList("SELECT * FROM outlet_requisitions WHERE id = ?", requisitionId);
        }

        List<String> prodNames = new ArrayList<>();
        for (Map<String, Object> req : targetReqs) {
            Long reqId = ((Number) req.get("id")).longValue();
            String rCode = req.get("requisition_code") != null ? req.get("requisition_code").toString() : ("REQ-" + reqId);
            refCode = rCode;
            int qty = ((Number) req.getOrDefault("quantity", 0)).intValue();
            totalCancelledCases += qty;
            BigDecimal amt = req.get("total_amount") != null ? new BigDecimal(req.get("total_amount").toString()) : BigDecimal.valueOf(qty * 35.0);
            totalRefundAmount = totalRefundAmount.add(amt);
            if (req.get("product_name") != null) prodNames.add(req.get("product_name").toString());

            jdbcTemplate.update(
                "UPDATE outlet_requisitions SET status = 'CANCELLED_REFUNDED', " +
                "admin_supplier_notes = CONCAT('CANCELLED & REFUNDED (৳', ?, ') - ', ?), " +
                "updated_date = NOW() WHERE id = ?",
                amt, reason, reqId
            );
        }
        String affectedProducts = String.join(", ", prodNames);
        if (affectedProducts.isEmpty()) affectedProducts = "Assigned Beverages";

        // 3. Update the Delivery Dispatch items_json and stop status
        List<Map<String, Object>> candidateDispatches = new ArrayList<>();
        if (dispatchId != null) {
            candidateDispatches = jdbcTemplate.queryForList(
                "SELECT d.*, t.vehicle_registration_no, t.driver_name, t.driver_phone, t.id as team_id " +
                "FROM supplier_delivery_dispatches d " +
                "LEFT JOIN supplier_delivery_teams t ON d.delivery_team_id = t.id " +
                "WHERE d.id = ?", dispatchId
            );
        } else {
            candidateDispatches = jdbcTemplate.queryForList(
                "SELECT d.*, t.vehicle_registration_no, t.driver_name, t.driver_phone, t.id as team_id " +
                "FROM supplier_delivery_dispatches d " +
                "LEFT JOIN supplier_delivery_teams t ON d.delivery_team_id = t.id " +
                "WHERE d.items_json LIKE CONCAT('%\"outlet_id\":', ?, '%') " +
                "AND d.status IN ('DISPATCHED', 'BOARDED', 'IN_TRANSIT', 'DELIVERING') ORDER BY d.id DESC LIMIT 5",
                outletId
            );
        }

        for (Map<String, Object> trip : candidateDispatches) {
            Long tripId = ((Number) trip.get("id")).longValue();
            Long teamId = trip.get("team_id") != null ? ((Number) trip.get("team_id")).longValue() : null;
            Long supplierId = trip.get("supplier_id") != null ? ((Number) trip.get("supplier_id")).longValue() : 1L;
            String regNo = (String) trip.getOrDefault("vehicle_registration_no", "FLEET");
            String driver = (String) trip.getOrDefault("driver_name", "Driver");
            String route = (String) trip.getOrDefault("sub_route", "Route");
            String dispCode = (String) trip.getOrDefault("dispatch_code", "DSP-" + tripId);

            if (trip.get("items_json") != null) {
                try {
                    List<Map<String, Object>> items = objectMapper.readValue(
                        trip.get("items_json").toString(),
                        new TypeReference<List<Map<String, Object>>>() {}
                    );
                    boolean modified = false;
                    int activeStopsCount = 0;
                    for (Map<String, Object> it : items) {
                        Long oid = it.get("outlet_id") != null ? Long.parseLong(it.get("outlet_id").toString()) : -1L;
                        if (oid.equals(outletId)) {
                            it.put("stop_status", "CANCELLED");
                            it.put("is_cancelled", true);
                            it.put("cancelled_at", LocalDateTime.now().toString());
                            it.put("cancellation_reason", reason);
                            it.put("refund_amount", totalRefundAmount.doubleValue());
                            modified = true;
                        } else if (!"CANCELLED".equalsIgnoreCase(String.valueOf(it.get("stop_status")))
                                && !"CONFIRMED_BY_OUTLET".equalsIgnoreCase(String.valueOf(it.get("stop_status")))) {
                            activeStopsCount++;
                        }
                    }

                    if (modified) {
                        String updatedJson = objectMapper.writeValueAsString(items);
                        String newDispStatus = (activeStopsCount == 0) ? "CANCELLED" : trip.get("status").toString();
                        jdbcTemplate.update(
                            "UPDATE supplier_delivery_dispatches SET items_json = ?, status = ?, updated_at = NOW() WHERE id = ?",
                            updatedJson, newDispStatus, tripId
                        );

                        if ("CANCELLED".equals(newDispStatus) && teamId != null) {
                            jdbcTemplate.update("UPDATE supplier_delivery_teams SET status = 'AVAILABLE', updated_at = NOW() WHERE id = ?", teamId);
                        }
                    }
                } catch (Exception ignored) {}
            }

            // 4. Send Cancellation Notification directly to DELIVERY TEAM
            try {
                if (teamId != null) {
                    AppNotification teamNotif = new AppNotification();
                    teamNotif.setRecipientRole("DELIVERY_TEAM");
                    teamNotif.setRecipientUserId(teamId);
                    teamNotif.setTitle("🚨 STOP CANCELLED: Order Cancelled by " + outletName);
                    teamNotif.setMessage("Outlet " + outletName + " has cancelled order (" + totalCancelledCases + " cases of " + affectedProducts + ") on route '" + route + "' and received a full refund (৳" + String.format(Locale.US, "%.2f", totalRefundAmount.doubleValue()) + "). DO NOT deliver this consignment. Skip this stop.");
                    teamNotif.setType("DELIVERY_ORDER_CANCELLED");
                    teamNotif.setReferenceCode(dispCode);
                    teamNotif.setReferenceId(tripId);
                    notificationRepository.save(teamNotif);
                }

                AppNotification teamBroadcast = new AppNotification();
                teamBroadcast.setRecipientRole("DELIVERY_TEAM");
                teamBroadcast.setRecipientUserId(null);
                teamBroadcast.setTitle("🚨 STOP CANCELLED: " + outletName + " (" + regNo + ")");
                teamBroadcast.setMessage("Order cancelled and refunded for " + outletName + " (" + totalCancelledCases + " cases). Driver " + driver + " on vehicle " + regNo + ": do not deliver to this store.");
                teamBroadcast.setType("DELIVERY_ORDER_CANCELLED");
                teamBroadcast.setReferenceCode(dispCode);
                teamBroadcast.setReferenceId(tripId);
                notificationRepository.save(teamBroadcast);
            } catch (Exception ignored) {}

            // 5. Notify Supplier
            try {
                AppNotification supNotif = new AppNotification();
                supNotif.setRecipientRole("SUPPLIER");
                supNotif.setRecipientUserId(supplierId);
                supNotif.setTitle("Order Cancelled & Refunded by " + outletName);
                supNotif.setMessage("Outlet " + outletName + " cancelled order (" + totalCancelledCases + " cases) while vehicle " + regNo + " was en route. Full refund of ৳" + String.format(Locale.US, "%.2f", totalRefundAmount.doubleValue()) + " processed. Delivery team notified.");
                supNotif.setType("DELIVERY_ORDER_CANCELLED");
                supNotif.setReferenceCode(dispCode);
                supNotif.setReferenceId(tripId);
                notificationRepository.save(supNotif);
            } catch (Exception ignored) {}
        }

        // 6. Notify Outlet confirming cancellation & refund
        try {
            AppNotification outNotif = new AppNotification();
            outNotif.setRecipientRole("OUTLET");
            outNotif.setRecipientUserId(outletId);
            outNotif.setTitle("Order Cancelled & Full Refund Processed");
            outNotif.setMessage("Your order (" + totalCancelledCases + " cases of " + affectedProducts + ") has been successfully cancelled. A full refund of ৳" + String.format(Locale.US, "%.2f", totalRefundAmount.doubleValue()) + " has been processed. The delivery team has been notified to skip delivery.");
            outNotif.setType("ORDER_CANCELLED_REFUNDED");
            outNotif.setReferenceCode(refCode);
            outNotif.setReferenceId(outletId);
            notificationRepository.save(outNotif);
        } catch (Exception ignored) {}

        return ResponseEntity.ok(Map.of(
            "success", true,
            "refund_amount", totalRefundAmount,
            "cancelled_cases", totalCancelledCases,
            "status", "CANCELLED_REFUNDED",
            "message", "Order successfully cancelled! Full refund of ৳" + String.format(Locale.US, "%.2f", totalRefundAmount.doubleValue()) + " processed. Delivery team has been notified to skip delivery."
        ));
    }

    @PostMapping("/dispatches/{id}/offer-stock")
    public ResponseEntity<?> offerStockToOutlet(
            @PathVariable Long id,
            @RequestBody Map<String, Object> body) {

        if (!body.containsKey("target_outlet_id") || body.get("target_outlet_id") == null) {
            return ResponseEntity.badRequest().body(ApiResponse.fail("Missing target_outlet_id."));
        }
        Long targetOutletId = Long.parseLong(body.get("target_outlet_id").toString());
        int casesToOffer = body.containsKey("cases") && body.get("cases") != null
                ? Integer.parseInt(body.get("cases").toString()) : 1;
        String driverNotes = body.containsKey("driver_notes") && body.get("driver_notes") != null
                ? body.get("driver_notes").toString() : "Direct in-transit stock offer";

        // 1. Fetch dispatch
        List<Map<String, Object>> dispRows = jdbcTemplate.queryForList(
            "SELECT d.*, t.vehicle_registration_no, t.driver_name, t.driver_phone, t.id as team_id " +
            "FROM supplier_delivery_dispatches d " +
            "LEFT JOIN supplier_delivery_teams t ON d.delivery_team_id = t.id " +
            "WHERE d.id = ?", id
        );
        if (dispRows.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ApiResponse.fail("Dispatch trip not found."));
        }
        Map<String, Object> trip = dispRows.get(0);
        Long teamId = trip.get("team_id") != null ? ((Number) trip.get("team_id")).longValue() : null;
        Long supplierId = trip.get("supplier_id") != null ? ((Number) trip.get("supplier_id")).longValue() : 1L;
        String regNo = (String) trip.getOrDefault("vehicle_registration_no", "FLEET");
        String driver = (String) trip.getOrDefault("driver_name", "Driver");
        String driverPhone = (String) trip.getOrDefault("driver_phone", "");

        // 2. Fetch target outlet details
        List<Map<String, Object>> outRows = jdbcTemplate.queryForList("SELECT * FROM outlets WHERE outlet_id = ?", targetOutletId);
        if (outRows.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ApiResponse.fail("Target outlet not found."));
        }
        Map<String, Object> targetOutlet = outRows.get(0);
        String targetOutletName = (String) targetOutlet.get("outlet_name");
        String targetBranch = targetOutlet.get("branch_name") != null ? targetOutlet.get("branch_name").toString() : "";
        String targetAddress = targetOutlet.get("location_address") != null ? targetOutlet.get("location_address").toString() : "";
        String targetPhone = targetOutlet.get("contact_phone") != null ? targetOutlet.get("contact_phone").toString() : "";

        // 3. Find cancelled item to offer
        List<Map<String, Object>> items = new ArrayList<>();
        if (trip.get("items_json") != null) {
            try {
                items = objectMapper.readValue(
                    trip.get("items_json").toString(),
                    new TypeReference<List<Map<String, Object>>>() {}
                );
            } catch (Exception ignored) {}
        }

        Map<String, Object> sourceItem = null;
        Long prodId = null;
        String prodName = "Pepsi Regular";
        String catName = "Pepsi";
        BigDecimal unitPrice = BigDecimal.valueOf(42.0);

        for (Map<String, Object> it : items) {
            if ("CANCELLED".equalsIgnoreCase(String.valueOf(it.get("stop_status")))
                    || Boolean.TRUE.equals(it.get("is_cancelled"))) {
                sourceItem = it;
                prodId = it.get("product_id") != null ? Long.parseLong(it.get("product_id").toString()) : null;
                if (it.get("product_name") != null) prodName = it.get("product_name").toString();
                if (it.get("category") != null) catName = it.get("category").toString();
                if (it.get("unit_price") != null) unitPrice = new BigDecimal(it.get("unit_price").toString());
                break;
            }
        }

        if (sourceItem == null && !items.isEmpty()) {
            sourceItem = items.get(0);
            prodId = sourceItem.get("product_id") != null ? Long.parseLong(sourceItem.get("product_id").toString()) : null;
            if (sourceItem.get("product_name") != null) prodName = sourceItem.get("product_name").toString();
            if (sourceItem.get("unit_price") != null) unitPrice = new BigDecimal(sourceItem.get("unit_price").toString());
        }

        if (prodId == null) {
            prodId = 21L;
        }

        // 4. Create new outlet requisition for target outlet with DIRECT_SUPPLY urgency
        String newReqCode = "OUT-OFFER-" + (System.currentTimeMillis() % 1000000);
        BigDecimal totalAmt = unitPrice.multiply(BigDecimal.valueOf(casesToOffer));
        String memo = "⚡ In-Transit Stock Offer from Driver " + driver + " (" + regNo + ") - Onboarded stock reallocated to " + targetOutletName;

        Long newReqId = null;
        try {
            jdbcTemplate.update(
                "INSERT INTO outlet_requisitions " +
                "(requisition_code, outlet_id, product_id, product_name, quantity, unit_price, total_amount, urgency, status, admin_supplier_notes, outlet_remarks, supplier_id, created_date, updated_date) " +
                "VALUES (?, ?, ?, ?, ?, ?, ?, 'DIRECT_SUPPLY', 'OFFER_PENDING', ?, ?, ?, NOW(), NOW())",
                newReqCode, targetOutletId, prodId, prodName, casesToOffer, unitPrice, totalAmt, memo, driverNotes, supplierId
            );
            List<Map<String, Object>> lastId = jdbcTemplate.queryForList("SELECT LAST_INSERT_ID() as id");
            if (!lastId.isEmpty() && lastId.get(0).get("id") != null) {
                newReqId = ((Number) lastId.get(0).get("id")).longValue();
            }
        } catch (Exception ex) {
            System.err.println("[DeliveryController] Error creating offer requisition: " + ex.getMessage());
        }

        // 5. Update items_json in the dispatch
        if (sourceItem != null) {
            sourceItem.put("reallocated_to_outlet_id", targetOutletId);
            sourceItem.put("reallocated_to_outlet_name", targetOutletName);
            sourceItem.put("reallocated_at", LocalDateTime.now().toString());
        }

        boolean targetExists = false;
        for (Map<String, Object> it : items) {
            Long oid = it.get("outlet_id") != null ? Long.parseLong(it.get("outlet_id").toString()) : -1L;
            if (oid.equals(targetOutletId) && !"CANCELLED".equalsIgnoreCase(String.valueOf(it.get("stop_status")))) {
                int curAssigned = it.get("assigned_cases") != null ? Integer.parseInt(it.get("assigned_cases").toString()) : 0;
                it.put("assigned_cases", curAssigned + casesToOffer);
                it.put("offered_cases", casesToOffer);
                it.put("offered_from_vehicle", true);
                it.put("offer_status", "PENDING");
                it.put("requisition_id", newReqId);
                it.put("requisition_code", newReqCode);
                targetExists = true;
                break;
            }
        }

        if (!targetExists) {
            Map<String, Object> newItem = new HashMap<>();
            newItem.put("outlet_id", targetOutletId);
            newItem.put("outlet_name", targetOutletName);
            newItem.put("branch_name", targetBranch);
            newItem.put("location_address", targetAddress);
            newItem.put("contact_phone", targetPhone);
            newItem.put("product_id", prodId);
            newItem.put("product_name", prodName);
            newItem.put("category", catName);
            newItem.put("demanded_cases", casesToOffer);
            newItem.put("assigned_cases", casesToOffer);
            newItem.put("unit_price", unitPrice.doubleValue());
            newItem.put("requisition_id", newReqId);
            newItem.put("requisition_code", newReqCode);
            newItem.put("stop_status", "OFFER_PENDING");
            newItem.put("is_offered_stock", true);
            newItem.put("offer_status", "PENDING");
            newItem.put("urgency", "DIRECT_SUPPLY");
            items.add(newItem);
        }

        Set<Object> activeOutlets = new HashSet<>();
        for (Map<String, Object> it : items) {
            if (!"CANCELLED".equalsIgnoreCase(String.valueOf(it.get("stop_status")))) {
                activeOutlets.add(it.get("outlet_id"));
            }
        }

        String updatedJson;
        try {
            updatedJson = objectMapper.writeValueAsString(items);
        } catch (Exception e) {
            updatedJson = trip.get("items_json").toString();
        }

        jdbcTemplate.update(
            "UPDATE supplier_delivery_dispatches SET items_json = ?, status = 'IN_TRANSIT', total_outlets = ?, updated_at = NOW() WHERE id = ?",
            updatedJson, activeOutlets.size(), id
        );

        if (teamId != null) {
            jdbcTemplate.update("UPDATE supplier_delivery_teams SET status = 'ON_DELIVERY', updated_at = NOW() WHERE id = ?", teamId);
        }

        // 6. Notify recipient outlet
        try {
            AppNotification outNotif = new AppNotification();
            outNotif.setRecipientRole("OUTLET");
            outNotif.setRecipientUserId(targetOutletId);
            outNotif.setTitle("⚡ In-Transit Stock Offer: " + casesToOffer + " Cases of " + prodName);
            outNotif.setMessage("Delivery vehicle " + regNo + " (Driver " + driver + ") is in transit nearby and has offered " + casesToOffer + " cases of " + prodName + " for immediate delivery. Would you like to accept or deny this stock offer?");
            outNotif.setType("STOCK_OFFER_RECEIVED");
            outNotif.setReferenceCode(newReqCode);
            outNotif.setReferenceId(newReqId != null ? newReqId : targetOutletId);
            notificationRepository.save(outNotif);
        } catch (Exception ignored) {}

        // 7. Notify supplier
        try {
            AppNotification supNotif = new AppNotification();
            supNotif.setRecipientRole("SUPPLIER");
            supNotif.setRecipientUserId(supplierId);
            supNotif.setTitle("Onboarded Stock Reassigned to " + targetOutletName);
            supNotif.setMessage("Driver " + driver + " on vehicle " + regNo + " offered " + casesToOffer + " cases of " + prodName + " to " + targetOutletName + " (" + targetBranch + "). Consignment #" + newReqCode + " created.");
            supNotif.setType("STOCK_REASSIGNED");
            supNotif.setReferenceCode(newReqCode);
            supNotif.setReferenceId(id);
            notificationRepository.save(supNotif);
        } catch (Exception ignored) {}

        return ResponseEntity.ok(Map.of(
            "success", true,
            "target_outlet_id", targetOutletId,
            "target_outlet_name", targetOutletName,
            "cases_offered", casesToOffer,
            "requisition_code", newReqCode,
            "message", "Successfully offered " + casesToOffer + " cases of " + prodName + " to " + targetOutletName + "! Waiting for outlet acceptance."
        ));
    }

    @PostMapping("/stock-offers/{code}/respond")
    public ResponseEntity<?> respondStockOffer(
            @PathVariable String code,
            @RequestBody(required = false) Map<String, Object> body) {
        String action = body != null && body.get("action") != null 
            ? body.get("action").toString().trim().toUpperCase() 
            : "ACCEPT";
        boolean isAccept = "ACCEPT".equals(action) || "ACCEPTED".equals(action);
        return doHandleOfferResponse(code, isAccept);
    }

    @PostMapping("/stock-offers/{code}/accept")
    public ResponseEntity<?> acceptStockOffer(@PathVariable String code) {
        return doHandleOfferResponse(code, true);
    }

    @PostMapping("/stock-offers/{code}/deny")
    public ResponseEntity<?> denyStockOffer(@PathVariable String code) {
        return doHandleOfferResponse(code, false);
    }

    private ResponseEntity<?> doHandleOfferResponse(String code, boolean isAccept) {
        if (code == null || code.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Invalid offer code."));
        }
        String cleanCode = code.trim();

        List<Map<String, Object>> reqRows = jdbcTemplate.queryForList(
            "SELECT * FROM outlet_requisitions WHERE requisition_code = ? OR CAST(id AS CHAR) = ? LIMIT 1",
            cleanCode, cleanCode
        );

        if (reqRows.isEmpty()) {
            // Also check dispatches for an item with this code or requisition_id
            List<Map<String, Object>> dispMatches = jdbcTemplate.queryForList(
                "SELECT id, items_json FROM supplier_delivery_dispatches WHERE items_json LIKE ?",
                "%" + cleanCode + "%"
            );
            if (dispMatches.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Stock offer not found for code: " + cleanCode));
            }
        }

        Map<String, Object> req = !reqRows.isEmpty() ? reqRows.get(0) : Collections.emptyMap();
        Long reqId = req.get("id") != null ? ((Number) req.get("id")).longValue() : null;
        String reqCode = req.get("requisition_code") != null ? req.get("requisition_code").toString() : cleanCode;
        Long outletId = req.get("outlet_id") != null ? ((Number) req.get("outlet_id")).longValue() : null;
        String prodName = req.get("product_name") != null ? req.get("product_name").toString() : "Beverages";
        int cases = req.get("quantity") != null ? ((Number) req.get("quantity")).intValue() : 0;
        Long supplierId = req.get("supplier_id") != null ? ((Number) req.get("supplier_id")).longValue() : 1L;

        String outletName = "Franchise Store";
        String branchName = "";
        if (outletId != null) {
            List<Map<String, Object>> oRows = jdbcTemplate.queryForList(
                "SELECT outlet_name, branch_name FROM outlets WHERE outlet_id = ?", outletId
            );
            if (!oRows.isEmpty()) {
                outletName = oRows.get(0).get("outlet_name") != null ? oRows.get(0).get("outlet_name").toString() : outletName;
                branchName = oRows.get(0).get("branch_name") != null ? oRows.get(0).get("branch_name").toString() : branchName;
            }
        }

        // 1. Update outlet_requisitions
        if (reqId != null) {
            if (isAccept) {
                jdbcTemplate.update(
                    "UPDATE outlet_requisitions SET status = 'IN_TRANSIT', admin_supplier_notes = CONCAT(COALESCE(admin_supplier_notes, ''), ' [ACCEPTED BY OUTLET]'), updated_date = NOW() WHERE id = ?",
                    reqId
                );
            } else {
                jdbcTemplate.update(
                    "UPDATE outlet_requisitions SET status = 'DENIED', admin_supplier_notes = CONCAT(COALESCE(admin_supplier_notes, ''), ' [DENIED BY OUTLET]'), updated_date = NOW() WHERE id = ?",
                    reqId
                );
            }
        }

        // 2. Update dispatch items_json and recalculate active stops
        List<Map<String, Object>> dispatches = jdbcTemplate.queryForList(
            "SELECT d.id, d.items_json, d.delivery_team_id, d.supplier_id, t.vehicle_registration_no, t.driver_name " +
            "FROM supplier_delivery_dispatches d " +
            "LEFT JOIN supplier_delivery_teams t ON d.delivery_team_id = t.id " +
            "WHERE d.items_json LIKE ? OR d.items_json LIKE ?",
            "%" + cleanCode + "%", reqId != null ? "%\"requisition_id\":" + reqId + "%" : "%" + cleanCode + "%"
        );

        Long matchedTeamId = null;
        String matchedRegNo = "Delivery Vehicle";
        String matchedDriver = "Lead Driver";
        Long matchedDispatchId = null;

        for (Map<String, Object> disp : dispatches) {
            Object dispIdVal = disp.get("id");
            if (dispIdVal == null) continue;
            Long dId = ((Number) dispIdVal).longValue();
            matchedDispatchId = dId;
            matchedTeamId = disp.get("delivery_team_id") != null ? ((Number) disp.get("delivery_team_id")).longValue() : matchedTeamId;
            matchedRegNo = disp.get("vehicle_registration_no") != null ? disp.get("vehicle_registration_no").toString() : matchedRegNo;
            matchedDriver = disp.get("driver_name") != null ? disp.get("driver_name").toString() : matchedDriver;

            if (disp.get("items_json") != null) {
                try {
                    List<Map<String, Object>> items = objectMapper.readValue(
                        disp.get("items_json").toString(),
                        new TypeReference<List<Map<String, Object>>>() {}
                    );

                    for (Map<String, Object> it : items) {
                        boolean match = false;
                        if (it.get("requisition_code") != null && it.get("requisition_code").toString().equalsIgnoreCase(reqCode)) match = true;
                        if (reqId != null && it.get("requisition_id") != null && it.get("requisition_id").toString().equals(String.valueOf(reqId))) match = true;
                        if (outletId != null && outletId.equals(it.get("outlet_id")) && Boolean.TRUE.equals(it.get("is_offered_stock"))) match = true;

                        if (match) {
                            if (isAccept) {
                                it.put("offer_status", "ACCEPTED");
                                it.put("stop_status", "ASSIGNED");
                            } else {
                                it.put("offer_status", "DENIED");
                                it.put("stop_status", "OFFER_DENIED");
                                it.put("denied_at", LocalDateTime.now().toString());
                            }
                        }
                    }

                    Set<Object> activeOutlets = new HashSet<>();
                    for (Map<String, Object> it : items) {
                        String st = String.valueOf(it.get("stop_status"));
                        if (!"CANCELLED".equalsIgnoreCase(st) && !"OFFER_DENIED".equalsIgnoreCase(st)) {
                            activeOutlets.add(it.get("outlet_id"));
                        }
                    }

                    String updatedJson = objectMapper.writeValueAsString(items);
                    jdbcTemplate.update(
                        "UPDATE supplier_delivery_dispatches SET items_json = ?, total_outlets = ?, updated_at = NOW() WHERE id = ?",
                        updatedJson, activeOutlets.size(), dId
                    );
                } catch (Exception ex) {
                    System.err.println("[DeliveryController] Error updating dispatch on offer response: " + ex.getMessage());
                }
            }
        }

        // 3. Send Notification to Delivery Team
        try {
            AppNotification teamNotif = new AppNotification();
            teamNotif.setRecipientRole("DELIVERY_TEAM");
            teamNotif.setRecipientUserId(matchedTeamId);
            if (isAccept) {
                teamNotif.setTitle("⚡ Stock Offer Accepted by " + outletName);
                teamNotif.setMessage(outletName + (branchName != null && !branchName.isEmpty() ? " (" + branchName + ")" : "") + " has ACCEPTED your offer of " + cases + " cases of " + prodName + "! Stop is confirmed on your vehicle " + matchedRegNo + ". Proceed to deliver.");
                teamNotif.setType("STOCK_OFFER_ACCEPTED");
            } else {
                teamNotif.setTitle("⚠️ Stock Offer Denied by " + outletName);
                teamNotif.setMessage(outletName + (branchName != null && !branchName.isEmpty() ? " (" + branchName + ")" : "") + " DECLINED your offer of " + cases + " cases of " + prodName + ". This stock remains in vehicle " + matchedRegNo + " and can be offered to another outlet.");
                teamNotif.setType("STOCK_OFFER_DENIED");
            }
            teamNotif.setReferenceCode(reqCode);
            teamNotif.setReferenceId(matchedDispatchId);
            notificationRepository.save(teamNotif);
        } catch (Exception ignored) {}

        // 4. Send Notification to Regional Supplier
        try {
            AppNotification supNotif = new AppNotification();
            supNotif.setRecipientRole("SUPPLIER");
            supNotif.setRecipientUserId(supplierId);
            if (isAccept) {
                supNotif.setTitle("Stock Offer Accepted by " + outletName);
                supNotif.setMessage(outletName + " accepted " + cases + " cases of " + prodName + " offered by Driver " + matchedDriver + " (" + matchedRegNo + ").");
                supNotif.setType("STOCK_OFFER_ACCEPTED");
            } else {
                supNotif.setTitle("Stock Offer Denied by " + outletName);
                supNotif.setMessage(outletName + " declined " + cases + " cases of " + prodName + " offered by Driver " + matchedDriver + " (" + matchedRegNo + "). Stock available for reallocation.");
                supNotif.setType("STOCK_OFFER_DENIED");
            }
            supNotif.setReferenceCode(reqCode);
            supNotif.setReferenceId(matchedDispatchId);
            notificationRepository.save(supNotif);

            // Also notify the assigned PSR when stock offer is accepted
            if (isAccept) {
                try {
                    List<Map<String, Object>> psrLookup = jdbcTemplate.queryForList(
                        "SELECT p.id, p.user_id, p.name FROM pre_sales_representatives p " +
                        "JOIN outlets o ON (o.assigned_psr_id = p.id OR (o.assigned_psr_id IS NULL AND o.district_id = p.district_id)) " +
                        "WHERE o.id = ? LIMIT 1",
                        outletId
                    );
                    if (!psrLookup.isEmpty()) {
                        Map<String, Object> psrMap = psrLookup.get(0);
                        Long pId = ((Number) psrMap.get("id")).longValue();
                        Long pUserId = psrMap.get("user_id") != null ? ((Number) psrMap.get("user_id")).longValue() : (200L + pId);
                        AppNotification psrNotif = new AppNotification();
                        psrNotif.setRecipientRole("PSR");
                        psrNotif.setRecipientUserId(pUserId);
                        psrNotif.setTitle("Stock Offer Accepted by " + outletName);
                        psrNotif.setMessage(outletName + " accepted " + cases + " cases of " + prodName + " from delivery consignment (" + reqCode + ").");
                        psrNotif.setType("STOCK_OFFER_ACCEPTED");
                        psrNotif.setReferenceCode(reqCode);
                        psrNotif.setReferenceId(pId);
                        notificationRepository.save(psrNotif);
                    }
                } catch (Exception ignored) {}
            }
        } catch (Exception ignored) {}

        // 5. Mark the outlet's notification as read
        try {
            jdbcTemplate.update(
                "UPDATE app_notifications SET is_read = true WHERE reference_code = ? AND UPPER(recipient_role) = 'OUTLET'",
                reqCode
            );
        } catch (Exception ignored) {}

        return ResponseEntity.ok(Map.of(
            "success", true,
            "status", isAccept ? "ACCEPTED" : "DENIED",
            "requisition_code", reqCode,
            "outlet_name", outletName,
            "message", isAccept ? "Stock offer accepted! Consignment is on the way." : "Stock offer was denied."
        ));
    }

    @GetMapping("/outlet-pending-deliveries/{outletId}")
    public ResponseEntity<?> getOutletPendingDeliveries(@PathVariable Long outletId) {
        List<Map<String, Object>> activeTrips = jdbcTemplate.queryForList(
            "SELECT d.*, t.vehicle_registration_no, t.vehicle_type, t.driver_name, t.driver_phone, s.business_name as supplier_name " +
            "FROM supplier_delivery_dispatches d " +
            "LEFT JOIN supplier_delivery_teams t ON d.delivery_team_id = t.id " +
            "LEFT JOIN supplier_profiles s ON d.supplier_id = s.id " +
            "WHERE d.status IN ('DISPATCHED', 'BOARDED', 'IN_TRANSIT', 'DELIVERED', 'COMPLETED', 'CANCELLED') " +
            "ORDER BY d.dispatched_at DESC LIMIT 30"
        );

        List<Map<String, Object>> outletDeliveries = new ArrayList<>();
        for (Map<String, Object> trip : activeTrips) {
            if (trip.get("items_json") != null) {
                try {
                    List<Map<String, Object>> items = objectMapper.readValue(
                        trip.get("items_json").toString(),
                        new TypeReference<List<Map<String, Object>>>() {}
                    );
                    List<Map<String, Object>> myItems = items.stream().filter(it -> {
                        Long oid = it.get("outlet_id") != null ? Long.parseLong(it.get("outlet_id").toString()) : -1L;
                        return oid.equals(outletId);
                    }).toList();

                    if (!myItems.isEmpty()) {
                        Map<String, Object> outDelivery = new HashMap<>(trip);
                        outDelivery.put("outlet_items", myItems);
                        boolean isDeliveredByDriver = myItems.stream().anyMatch(it -> "DELIVERED_BY_DRIVER".equalsIgnoreCase(String.valueOf(it.get("stop_status"))));
                        boolean isConfirmed = myItems.stream().allMatch(it -> "CONFIRMED_BY_OUTLET".equalsIgnoreCase(String.valueOf(it.get("stop_status"))));
                        boolean isCancelled = myItems.stream().allMatch(it -> "CANCELLED".equalsIgnoreCase(String.valueOf(it.get("stop_status"))));
                        boolean isOfferDenied = myItems.stream().allMatch(it -> "OFFER_DENIED".equalsIgnoreCase(String.valueOf(it.get("stop_status"))) || "DENIED".equalsIgnoreCase(String.valueOf(it.get("offer_status"))));
                        boolean isOfferPending = myItems.stream().anyMatch(it -> "OFFER_PENDING".equalsIgnoreCase(String.valueOf(it.get("stop_status"))) || "PENDING".equalsIgnoreCase(String.valueOf(it.get("offer_status"))));
                        outDelivery.put("is_delivered_by_driver", isDeliveredByDriver);
                        outDelivery.put("is_confirmed_by_outlet", isConfirmed);
                        outDelivery.put("is_cancelled", isCancelled);
                        outDelivery.put("is_offer_denied", isOfferDenied);
                        outDelivery.put("is_offer_pending", isOfferPending);
                        outletDeliveries.add(outDelivery);
                    }
                } catch (Exception ignored) {}
            }
        }
        return ResponseEntity.ok(outletDeliveries);
    }

    // ==========================================
    // 4. DELIVERY TEAM PORTAL / INTERFACE
    // ==========================================

    @GetMapping("/team-portal")
    public ResponseEntity<?> getTeamPortalData(
            @RequestParam(required = false) String regNo,
            @RequestParam(required = false) Long teamId) {

        List<Map<String, Object>> teamRows;
        if (teamId != null && teamId > 0) {
            teamRows = jdbcTemplate.queryForList(
                "SELECT t.*, s.business_name as supplier_name " +
                "FROM supplier_delivery_teams t " +
                "LEFT JOIN supplier_profiles s ON t.supplier_id = s.id " +
                "WHERE t.id = ?",
                teamId
            );
        } else if (regNo != null && !regNo.trim().isEmpty()) {
            teamRows = jdbcTemplate.queryForList(
                "SELECT t.*, s.business_name as supplier_name " +
                "FROM supplier_delivery_teams t " +
                "LEFT JOIN supplier_profiles s ON t.supplier_id = s.id " +
                "WHERE LOWER(TRIM(t.vehicle_registration_no)) = LOWER(TRIM(?))",
                regNo.trim()
            );
        } else {
            // Default to first active team
            teamRows = jdbcTemplate.queryForList(
                "SELECT t.*, s.business_name as supplier_name " +
                "FROM supplier_delivery_teams t " +
                "LEFT JOIN supplier_profiles s ON t.supplier_id = s.id " +
                "ORDER BY t.id ASC LIMIT 1"
            );
        }

        if (teamRows.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ApiResponse.fail("Delivery team or vehicle registration not found."));
        }

        Map<String, Object> team = teamRows.get(0);
        Object teamIdVal = team.get("id");
        Long resolvedTeamId = (teamIdVal instanceof Number) ? ((Number) teamIdVal).longValue() : 1L;

        // Get trips assigned to this team
        List<Map<String, Object>> trips = jdbcTemplate.queryForList(
            "SELECT d.*, s.business_name as supplier_name " +
            "FROM supplier_delivery_dispatches d " +
            "LEFT JOIN supplier_profiles s ON d.supplier_id = s.id " +
            "WHERE d.delivery_team_id = ? " +
            "ORDER BY d.dispatched_at DESC LIMIT 20",
            resolvedTeamId
        );

        List<Map<String, Object>> parsedTrips = new ArrayList<>();
        for (Map<String, Object> t : trips) {
            Map<String, Object> tm = new HashMap<>(t);
            if (t.get("items_json") != null) {
                try {
                    List<Map<String, Object>> items = objectMapper.readValue(
                        t.get("items_json").toString(),
                        new TypeReference<List<Map<String, Object>>>() {}
                    );
                    tm.put("items", items);
                } catch (Exception e) {
                    tm.put("items", Collections.emptyList());
                }
            } else {
                tm.put("items", Collections.emptyList());
            }
            parsedTrips.add(tm);
        }

        // All teams for quick selector in UI
        List<Map<String, Object>> allTeams = jdbcTemplate.queryForList(
            "SELECT t.id, t.team_name, t.vehicle_registration_no, t.driver_name, t.status, s.business_name as supplier_name " +
            "FROM supplier_delivery_teams t " +
            "LEFT JOIN supplier_profiles s ON t.supplier_id = s.id " +
            "ORDER BY t.id ASC"
        );

        return ResponseEntity.ok(Map.of(
            "team", team,
            "trips", parsedTrips,
            "all_teams", allTeams
        ));
    }
}
