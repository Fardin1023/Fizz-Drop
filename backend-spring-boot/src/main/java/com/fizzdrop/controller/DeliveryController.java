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

    // ==========================================
    // 1. DELIVERY TEAMS & FLEET MANAGEMENT
    // ==========================================

    @GetMapping("/teams")
    public ResponseEntity<?> getDeliveryTeams(
            @RequestParam(required = false) Long supplierId,
            @RequestParam(required = false) Long userId,
            @RequestParam(required = false, defaultValue = "false") boolean all) {

        List<Map<String, Object>> teams;
        if (all) {
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
            "WHERE r.status IN ('PENDING', 'APPROVED', 'DISPATCHED') " +
            "ORDER BY r.created_date DESC"
        );

        Map<Long, List<Map<String, Object>>> demandsByOutlet = new HashMap<>();
        for (Map<String, Object> d : openDemands) {
            Long outId = ((Number) d.get("outlet_id")).longValue();
            demandsByOutlet.computeIfAbsent(outId, k -> new ArrayList<>()).add(d);
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
            @RequestParam(required = false, defaultValue = "false") boolean all) {

        List<Map<String, Object>> list;
        if (all) {
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
                "WHERE d.supplier_id = ? " +
                "ORDER BY d.dispatched_at DESC",
                sId
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

        // Update team status to ON_DELIVERY
        jdbcTemplate.update("UPDATE supplier_delivery_teams SET status = 'ON_DELIVERY', updated_at = NOW() WHERE id = ?", teamId);

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

        return ResponseEntity.ok(Map.of(
            "success", true,
            "dispatch_code", dispatchCode,
            "message", "Successfully dispatched delivery vehicle on route '" + subRoute + "' with " + totalCases + " cases assigned to " + uniqueOutlets.size() + " outlets!"
        ));
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
        Long teamId = ((Number) trip.get("delivery_team_id")).longValue();

        if ("DELIVERED".equalsIgnoreCase(newStatus) || "COMPLETED".equalsIgnoreCase(newStatus)) {
            jdbcTemplate.update(
                "UPDATE supplier_delivery_dispatches SET status = ?, delivered_at = NOW(), updated_at = NOW() WHERE id = ?",
                newStatus.toUpperCase(), id
            );
            // Free the delivery team back to AVAILABLE
            jdbcTemplate.update("UPDATE supplier_delivery_teams SET status = 'AVAILABLE', updated_at = NOW() WHERE id = ?", teamId);
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
    // 4. DELIVERY TEAM PORTAL / INTERFACE
    // ==========================================

    @GetMapping("/team-portal")
    public ResponseEntity<?> getTeamPortalData(
            @RequestParam(required = false) String regNo,
            @RequestParam(required = false) Long teamId) {

        List<Map<String, Object>> teamRows;
        if (teamId != null && teamId > 0) {
            teamRows = jdbcTemplate.queryForList("SELECT * FROM supplier_delivery_teams WHERE id = ?", teamId);
        } else if (regNo != null && !regNo.trim().isEmpty()) {
            teamRows = jdbcTemplate.queryForList(
                "SELECT * FROM supplier_delivery_teams WHERE LOWER(vehicle_registration_no) = LOWER(?)",
                regNo.trim()
            );
        } else {
            // Default to first active team
            teamRows = jdbcTemplate.queryForList("SELECT * FROM supplier_delivery_teams ORDER BY id ASC LIMIT 1");
        }

        if (teamRows.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ApiResponse.fail("Delivery team or vehicle registration not found."));
        }

        Map<String, Object> team = teamRows.get(0);
        Long resolvedTeamId = ((Number) team.get("id")).longValue();

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
            "SELECT id, team_name, vehicle_registration_no, driver_name, status FROM supplier_delivery_teams ORDER BY id ASC"
        );

        return ResponseEntity.ok(Map.of(
            "team", team,
            "trips", parsedTrips,
            "all_teams", allTeams
        ));
    }
}
