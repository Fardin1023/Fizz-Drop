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
@RequestMapping("/api/v1/trade-offers")
@CrossOrigin(origins = "*")
public class TradeOfferController {

    private final TradeOfferRepository tradeOfferRepository;
    private final DistrictRepository districtRepository;
    private final ProductRepository productRepository;
    private final MerchandiseProductRepository merchandiseProductRepository;
    private final SupplierProfileRepository supplierProfileRepository;
    private final OutletRepository outletRepository;
    private final DistrictProductPricingRepository districtProductPricingRepository;
    private final PreSalesOfficerRepository psrRepository;
    private final SalesOfficerRepository salesOfficerRepository;
    private final AppNotificationRepository notificationRepository;
    private final FreeStockRepository freeStockRepository;
    private final FreeStockTransactionRepository transactionRepository;
    private final JdbcTemplate jdbcTemplate;

    public TradeOfferController(TradeOfferRepository tradeOfferRepository,
                                DistrictRepository districtRepository,
                                ProductRepository productRepository,
                                MerchandiseProductRepository merchandiseProductRepository,
                                SupplierProfileRepository supplierProfileRepository,
                                OutletRepository outletRepository,
                                DistrictProductPricingRepository districtProductPricingRepository,
                                PreSalesOfficerRepository psrRepository,
                                SalesOfficerRepository salesOfficerRepository,
                                AppNotificationRepository notificationRepository,
                                FreeStockRepository freeStockRepository,
                                FreeStockTransactionRepository transactionRepository,
                                JdbcTemplate jdbcTemplate) {
        this.tradeOfferRepository = tradeOfferRepository;
        this.districtRepository = districtRepository;
        this.productRepository = productRepository;
        this.merchandiseProductRepository = merchandiseProductRepository;
        this.supplierProfileRepository = supplierProfileRepository;
        this.outletRepository = outletRepository;
        this.districtProductPricingRepository = districtProductPricingRepository;
        this.psrRepository = psrRepository;
        this.salesOfficerRepository = salesOfficerRepository;
        this.notificationRepository = notificationRepository;
        this.freeStockRepository = freeStockRepository;
        this.transactionRepository = transactionRepository;
        this.jdbcTemplate = jdbcTemplate;
    }

    @PostConstruct
    public void initOffersTableAndSampleData() {
        try {
            jdbcTemplate.execute(
                "CREATE TABLE IF NOT EXISTS trade_offers (" +
                "id BIGINT AUTO_INCREMENT PRIMARY KEY, " +
                "title VARCHAR(200) NOT NULL, " +
                "district_id BIGINT NOT NULL, " +
                "district_name VARCHAR(100) NULL, " +
                "division_name VARCHAR(100) NULL, " +
                "buy_product_id BIGINT NOT NULL, " +
                "buy_product_name VARCHAR(200) NULL, " +
                "buy_quantity_cases INT NOT NULL DEFAULT 10, " +
                "free_product_id BIGINT NOT NULL, " +
                "free_product_name VARCHAR(200) NULL, " +
                "free_quantity_cases INT NOT NULL DEFAULT 1, " +
                "free_item_type VARCHAR(30) NOT NULL DEFAULT 'BEVERAGE', " +
                "description TEXT NULL, " +
                "status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE', " +
                "valid_from DATETIME NULL, " +
                "valid_until DATETIME NULL, " +
                "created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, " +
                "updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, " +
                "INDEX idx_trade_offers_district (district_id), " +
                "INDEX idx_trade_offers_status (status)" +
                ")"
            );

            // Ensure free_item_type exists if table was created previously
            try {
                jdbcTemplate.execute("ALTER TABLE trade_offers ADD COLUMN IF NOT EXISTS free_item_type VARCHAR(30) DEFAULT 'BEVERAGE'");
            } catch (Exception ignored) {}

            // Table to track offers pitched/disclosed to specific outlets by PSR
            jdbcTemplate.execute(
                "CREATE TABLE IF NOT EXISTS outlet_disclosed_offers (" +
                "id BIGINT AUTO_INCREMENT PRIMARY KEY, " +
                "outlet_id BIGINT NOT NULL, " +
                "trade_offer_id BIGINT NOT NULL, " +
                "psr_id BIGINT NULL, " +
                "psr_name VARCHAR(150) NULL, " +
                "disclosed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, " +
                "UNIQUE KEY uq_outlet_offer (outlet_id, trade_offer_id), " +
                "INDEX idx_disclosed_outlet (outlet_id)" +
                ")"
            );

            // Ensure Cumilla / Comilla Sales Officer and Outlets are mapped to district 16 (Comilla)
            try {
                jdbcTemplate.update("UPDATE sales_officers SET district_id = 16 WHERE id = 5 OR officer_code = 'SO-COM-318' OR city = 'Comilla' OR city = 'Cumilla'");
                jdbcTemplate.update("UPDATE outlets SET district_id = 16, assigned_psr_id = 19 WHERE city = 'Comilla' OR city = 'Cumilla' OR area = 'EPZ Area' OR outlet_name LIKE '%EPZ%'");
            } catch (Exception ex) {
                System.err.println("[TradeOfferController] Note on SO/district sync: " + ex.getMessage());
            }

            // Ensure trade package columns exist on psr_orders and outlet_requisitions
            try { jdbcTemplate.execute("ALTER TABLE psr_orders ADD COLUMN free_product_id BIGINT NULL"); } catch (Exception ignored) {}
            try { jdbcTemplate.execute("ALTER TABLE psr_orders ADD COLUMN free_product_name VARCHAR(255) NULL"); } catch (Exception ignored) {}
            try { jdbcTemplate.execute("ALTER TABLE psr_orders ADD COLUMN free_quantity INT DEFAULT 0"); } catch (Exception ignored) {}
            try { jdbcTemplate.execute("ALTER TABLE psr_orders ADD COLUMN is_trade_package BOOLEAN DEFAULT FALSE"); } catch (Exception ignored) {}
            try { jdbcTemplate.execute("ALTER TABLE psr_orders ADD COLUMN trade_offer_id BIGINT NULL"); } catch (Exception ignored) {}

            try { jdbcTemplate.execute("ALTER TABLE outlet_requisitions ADD COLUMN free_product_id BIGINT NULL"); } catch (Exception ignored) {}
            try { jdbcTemplate.execute("ALTER TABLE outlet_requisitions ADD COLUMN free_product_name VARCHAR(255) NULL"); } catch (Exception ignored) {}
            try { jdbcTemplate.execute("ALTER TABLE outlet_requisitions ADD COLUMN free_quantity INT DEFAULT 0"); } catch (Exception ignored) {}
            try { jdbcTemplate.execute("ALTER TABLE outlet_requisitions ADD COLUMN is_trade_package BOOLEAN DEFAULT FALSE"); } catch (Exception ignored) {}
            try { jdbcTemplate.execute("ALTER TABLE outlet_requisitions ADD COLUMN trade_offer_id BIGINT NULL"); } catch (Exception ignored) {}

            // Unify existing duplicate pair from user screenshot (REQ-63251 and REQ-FREE-63268) so only 1 unified package request exists
            try {
                jdbcTemplate.update(
                    "UPDATE psr_orders SET " +
                    "product_name = 'Pepsi Regular (400ml) [🎁 Package: +2 Free cs Aquafina Water (1L)]', " +
                    "free_product_id = 22, free_product_name = 'Aquafina Water (1L)', free_quantity = 2, is_trade_package = true, " +
                    "psr_notes = '🎁 Trade Scheme Package Bundle | Includes 2 Free cs Aquafina Water (1L)' " +
                    "WHERE order_code = 'REQ-63251'"
                );
                jdbcTemplate.update("DELETE FROM psr_orders WHERE order_code = 'REQ-FREE-63268'");

                jdbcTemplate.update(
                    "UPDATE outlet_requisitions SET " +
                    "product_name = 'Pepsi Regular (400ml) [🎁 Package: +2 Free cs Aquafina Water (1L)]', " +
                    "free_product_id = 22, free_product_name = 'Aquafina Water (1L)', free_quantity = 2, is_trade_package = true, " +
                    "admin_supplier_notes = '🎁 Trade Scheme Package Bundle | 10cs Pepsi + 2 Free cs Aquafina Water (1L)' " +
                    "WHERE requisition_code = 'REQ-63251'"
                );
                jdbcTemplate.update("DELETE FROM outlet_requisitions WHERE requisition_code = 'REQ-FREE-63268'");
            } catch (Exception ex) {
                System.err.println("[TradeOfferController] Note on legacy order unification: " + ex.getMessage());
            }
        } catch (Exception e) {
            System.err.println("[TradeOfferController] Note on table creation: " + e.getMessage());
        }

        // Zero automatic sample seeding: merchandise and trade offers are created exclusively via user/admin action.
    }

    /**
     * List all trade offers (supports ?district_id=X and ?status=ACTIVE)
     */
    @GetMapping
    public ResponseEntity<?> getAllOffers(@RequestParam(value = "district_id", required = false) Long districtId,
                                          @RequestParam(value = "status", required = false) String status) {
        List<TradeOffer> offers;
        if (districtId != null && status != null) {
            offers = tradeOfferRepository.findByDistrictIdAndStatus(districtId, status);
        } else if (districtId != null) {
            offers = tradeOfferRepository.findByDistrictId(districtId);
        } else if (status != null) {
            offers = tradeOfferRepository.findByStatusOrderByCreatedAtDesc(status);
        } else {
            offers = tradeOfferRepository.findAllByOrderByCreatedAtDesc();
        }

        List<Map<String, Object>> response = offers.stream().map(this::enrichOfferData).collect(Collectors.toList());
        return ResponseEntity.ok(response);
    }

    /**
     * Get single trade offer
     */
    @GetMapping("/{id}")
    public ResponseEntity<?> getOfferById(@PathVariable Long id) {
        return tradeOfferRepository.findById(id)
                .map(offer -> ResponseEntity.ok(enrichOfferData(offer)))
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Get active offers for a specific district (used by Outlet Portal & Territory Filter)
     */
    @GetMapping("/district/{districtId}")
    public ResponseEntity<?> getOffersForDistrict(@PathVariable Long districtId) {
        List<TradeOffer> activeOffers = tradeOfferRepository.findByDistrictIdAndStatus(districtId, "ACTIVE");
        List<Map<String, Object>> enriched = activeOffers.stream().map(this::enrichOfferData).collect(Collectors.toList());
        return ResponseEntity.ok(enriched);
    }

    /**
     * Get active offers for all districts assigned to a supplier (strictly isolated to supplier's assigned districts only)
     */
    @GetMapping("/supplier/{supplierId}")
    public ResponseEntity<?> getOffersForSupplier(
            @PathVariable Long supplierId,
            @RequestParam(value = "district_id", required = false) Long filterDistrictId) {
        Optional<SupplierProfile> supOpt = supplierProfileRepository.findById(supplierId);
        if (supOpt.isEmpty()) {
            supOpt = supplierProfileRepository.findByUserId(supplierId);
        }
        if (supOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Supplier not found with ID: " + supplierId));
        }
        SupplierProfile sup = supOpt.get();

        Set<Long> districtIds = new HashSet<>();
        if (sup.getPrimaryDistrictId() != null) {
            districtIds.add(sup.getPrimaryDistrictId());
        }
        if (sup.getCoveredDistrictIds() != null && !sup.getCoveredDistrictIds().trim().isEmpty()) {
            for (String p : sup.getCoveredDistrictIds().split(",")) {
                try {
                    districtIds.add(Long.parseLong(p.trim()));
                } catch (Exception ignored) {}
            }
        }

        // Strict district enforcement: If a specific district is requested, only allow it if it belongs to this supplier
        Set<Long> effectiveDistrictIds = new HashSet<>(districtIds);
        if (filterDistrictId != null) {
            if (effectiveDistrictIds.contains(filterDistrictId)) {
                effectiveDistrictIds = Collections.singleton(filterDistrictId);
            } else {
                // Security & territory isolation: District not assigned to this supplier -> return empty
                effectiveDistrictIds = Collections.emptySet();
            }
        }

        List<TradeOffer> offers;
        if (!effectiveDistrictIds.isEmpty()) {
            offers = tradeOfferRepository.findByDistrictIdInAndStatus(new ArrayList<>(effectiveDistrictIds), "ACTIVE");
        } else {
            offers = Collections.emptyList();
        }

        // Strict secondary guard: ensure no offer from any unauthorized district is returned
        final Set<Long> finalDistricts = effectiveDistrictIds;
        List<Map<String, Object>> enriched = offers.stream()
                .filter(o -> o.getDistrictId() != null && finalDistricts.contains(o.getDistrictId()))
                .map(this::enrichOfferData)
                .collect(Collectors.toList());

        // Get district names for filter convenience (strictly the supplier's own districts)
        List<Map<String, Object>> assignedDistricts = new ArrayList<>();
        for (Long dId : districtIds) {
            districtRepository.findById(dId).ifPresent(d -> assignedDistricts.add(Map.of(
                    "id", d.getId(),
                    "name", d.getName(),
                    "division", d.getDivision(),
                    "is_primary", Objects.equals(d.getId(), sup.getPrimaryDistrictId())
            )));
        }

        return ResponseEntity.ok(Map.of(
                "supplier_id", sup.getId(),
                "user_id", sup.getUserId() != null ? sup.getUserId() : 0L,
                "business_name", sup.getBusinessName() != null ? sup.getBusinessName() : "Regional Supplier Depot",
                "assigned_districts", assignedDistricts,
                "total_offers", enriched.size(),
                "offers", enriched
        ));
    }

    /**
     * Flexible query endpoint for supplier offers
     */
    @GetMapping("/supplier")
    public ResponseEntity<?> getOffersForSupplierQuery(
            @RequestParam(value = "supplierId", required = false) Long supplierId,
            @RequestParam(value = "userId", required = false) Long userId,
            @RequestParam(value = "district_id", required = false) Long filterDistrictId) {
        Long targetId = supplierId != null ? supplierId : userId;
        if (targetId == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "supplierId or userId required"));
        }
        return getOffersForSupplier(targetId, filterDistrictId);
    }

    /**
     * Helper to detect Comilla / Cumilla across variations in spelling, code, and area names.
     */
    private boolean isComillaDistrict(String str) {
        if (str == null) return false;
        String s = str.trim().toLowerCase();
        return s.contains("cumilla") || s.contains("comilla") || s.contains("com-") || s.contains("epz");
    }

    /**
     * Normalizes district names across Bangladesh English spelling reforms and abbreviations.
     */
    private String normalizeDistrictKey(String str) {
        if (str == null) return "";
        String s = str.trim().toLowerCase().replaceAll("[^a-z0-9]", "");
        if (s.contains("cumilla") || s.contains("comilla") || s.contains("com")) return "cumilla";
        if (s.contains("chattogram") || s.contains("chittagong") || s.contains("ctg")) return "chittagong";
        if (s.contains("barishal") || s.contains("barisal") || s.contains("bar")) return "barishal";
        if (s.contains("jashore") || s.contains("jessore") || s.contains("jas")) return "jashore";
        if (s.contains("bogura") || s.contains("bogra") || s.contains("bog")) return "bogura";
        if (s.contains("coxsbazar") || s.contains("coxbazar") || s.contains("cox")) return "coxsbazar";
        if (s.contains("bbaria") || s.contains("brahmanbaria")) return "brahmanbaria";
        return s;
    }

    /**
     * Check if two district/city/area names refer to the same district, including all Bangladesh spelling variations.
     */
    private boolean isSameDistrict(String dist1, String dist2) {
        if (dist1 == null || dist2 == null) return false;
        String s1 = dist1.trim().toLowerCase();
        String s2 = dist2.trim().toLowerCase();
        if (s1.equals(s2)) return true;
        String k1 = normalizeDistrictKey(dist1);
        String k2 = normalizeDistrictKey(dist2);
        if (!k1.isEmpty() && k1.equals(k2)) return true;
        return isComillaDistrict(s1) && isComillaDistrict(s2);
    }

    /**
     * Comprehensively resolve all district IDs that belong to a Sales Officer's jurisdiction across all 64 districts.
     */
    private Set<Long> resolveDistrictIdsForSo(SalesOfficer so) {
        Set<Long> ids = new HashSet<>();
        if (so == null) return ids;
        if (so.getDistrictId() != null) ids.add(so.getDistrictId());

        List<District> allDistricts = districtRepository.findAll();

        for (District d : allDistricts) {
            if (isSameDistrict(d.getName(), so.getCity()) ||
                isSameDistrict(d.getName(), so.getAssignedArea())) {
                ids.add(d.getId());
            }
            if (isComillaDistrict(d.getName()) && (
                isComillaDistrict(so.getCity()) ||
                isComillaDistrict(so.getAssignedArea()) ||
                (so.getOfficerCode() != null && so.getOfficerCode().toUpperCase().contains("COM"))
            )) {
                ids.add(d.getId());
            }
        }

        // Match by officer code abbreviation (e.g. SO-DHA -> Dhaka, SO-CTG -> Chittagong, SO-COM -> Comilla, etc.)
        if (so.getOfficerCode() != null && so.getOfficerCode().length() >= 6) {
            String prefix = so.getOfficerCode().substring(3, 6).toUpperCase();
            for (District d : allDistricts) {
                String dKey = normalizeDistrictKey(d.getName()).toUpperCase();
                if (dKey.startsWith(prefix) || 
                    (prefix.equals("COM") && (dKey.startsWith("CUM") || dKey.startsWith("COM"))) ||
                    (prefix.equals("CTG") && (dKey.startsWith("CHI") || dKey.startsWith("CHA"))) ||
                    (prefix.equals("DHA") && dKey.startsWith("DHA")) ||
                    (prefix.equals("BAR") && dKey.startsWith("BAR")) ||
                    (prefix.equals("RAJ") && dKey.startsWith("RAJ")) ||
                    (prefix.equals("SYL") && dKey.startsWith("SYL")) ||
                    (prefix.equals("KHU") && dKey.startsWith("KHU")) ||
                    (prefix.equals("GAZ") && dKey.startsWith("GAZ")) ||
                    (prefix.equals("NAR") && dKey.startsWith("NAR"))) {
                    ids.add(d.getId());
                }
            }
        }

        // Check outlets under this SO or SO's PSRs
        List<PreSalesOfficer> soPsrs = psrRepository.findAll().stream()
                .filter(p -> p.getSalesOfficerId() != null && p.getSalesOfficerId().equals(so.getId()))
                .collect(Collectors.toList());
        Set<Long> psrIds = soPsrs.stream().map(PreSalesOfficer::getId).collect(Collectors.toSet());

        for (Outlet o : outletRepository.findAll()) {
            if ((o.getAssignedPsrId() != null && psrIds.contains(o.getAssignedPsrId())) ||
                isSameDistrict(o.getCity(), so.getCity()) ||
                (so.getAssignedArea() != null && so.getAssignedArea().equalsIgnoreCase(o.getArea()))) {
                if (o.getDistrictId() != null) ids.add(o.getDistrictId());
            }
        }

        if (isComillaDistrict(so.getCity()) ||
            (so.getOfficerCode() != null && so.getOfficerCode().toUpperCase().contains("COM")) ||
            isComillaDistrict(so.getAssignedArea())) {
            ids.add(16L);
        }

        return ids;
    }

    /**
     * Comprehensively resolve all district IDs that belong to a Pre-Sales Officer's route / area across all 64 districts.
     */
    private Set<Long> resolveDistrictIdsForPsr(PreSalesOfficer psr) {
        Set<Long> ids = new HashSet<>();
        if (psr == null) return ids;

        List<District> allDistricts = districtRepository.findAll();

        // 1. Direct assigned outlets
        List<Outlet> psrOutlets = outletRepository.findAll().stream()
                .filter(o -> o.getAssignedPsrId() != null && o.getAssignedPsrId().equals(psr.getId()))
                .collect(Collectors.toList());
        for (Outlet o : psrOutlets) {
            if (o.getDistrictId() != null) {
                ids.add(o.getDistrictId());
            } else if (o.getCity() != null) {
                for (District d : allDistricts) {
                    if (isSameDistrict(d.getName(), o.getCity())) ids.add(d.getId());
                }
            }
        }

        // 2. From assigned supervising Sales Officer
        if (psr.getSalesOfficerId() != null) {
            salesOfficerRepository.findById(psr.getSalesOfficerId()).ifPresent(so -> {
                ids.addAll(resolveDistrictIdsForSo(so));
            });
        }

        // 3. From PSR code / area / subroute
        for (District d : allDistricts) {
            if (isSameDistrict(d.getName(), psr.getAssignedArea()) ||
                isSameDistrict(d.getName(), psr.getSubRoute())) {
                ids.add(d.getId());
            }
        }

        if (psr.getPsrCode() != null && psr.getPsrCode().toUpperCase().contains("SO")) {
            String code = psr.getPsrCode().toUpperCase();
            for (District d : allDistricts) {
                String dKey = normalizeDistrictKey(d.getName()).toUpperCase();
                if (dKey.length() >= 3 && code.contains(dKey.substring(0, Math.min(3, dKey.length())))) {
                    ids.add(d.getId());
                }
            }
        }

        if (isComillaDistrict(psr.getAssignedArea()) ||
            isComillaDistrict(psr.getSubRoute()) ||
            (psr.getPsrCode() != null && psr.getPsrCode().toUpperCase().contains("COM")) ||
            (psr.getAssignedArea() != null && psr.getAssignedArea().equalsIgnoreCase("EPZ Area")) ||
            (psr.getSubRoute() != null && psr.getSubRoute().toLowerCase().contains("medical road"))) {
            ids.add(16L);
        }

        return ids;
    }

    /**
     * Get active trade schemes for a Sales Officer's assigned territory
     */
    @GetMapping("/so/{soId}")
    public ResponseEntity<?> getOffersForSalesOfficer(@PathVariable Long soId) {
        Optional<SalesOfficer> soOpt = salesOfficerRepository.findById(soId);
        if (soOpt.isEmpty()) {
            soOpt = salesOfficerRepository.findByUserId(soId);
        }
        if (soOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Sales Officer not found with ID: " + soId));
        }
        SalesOfficer so = soOpt.get();
        Set<Long> districtIds = resolveDistrictIdsForSo(so);

        List<TradeOffer> allActive = tradeOfferRepository.findByStatusOrderByCreatedAtDesc("ACTIVE");
        List<TradeOffer> offers = allActive.stream()
                .filter(offer -> {
                    if (offer.getDistrictId() != null && districtIds.contains(offer.getDistrictId())) {
                        return true;
                    }
                    if (isComillaDistrict(offer.getDistrictName()) && (
                            isComillaDistrict(so.getCity()) ||
                            isComillaDistrict(so.getAssignedArea()) ||
                            (so.getOfficerCode() != null && so.getOfficerCode().toUpperCase().contains("COM"))
                    )) {
                        return true;
                    }
                    if (so.getCity() != null && isSameDistrict(offer.getDistrictName(), so.getCity())) {
                        return true;
                    }
                    return false;
                })
                .collect(Collectors.toList());

        if (offers.isEmpty() && districtIds.isEmpty()) {
            offers = allActive;
        }

        List<Map<String, Object>> enriched = offers.stream().map(this::enrichOfferData).collect(Collectors.toList());
        Long primaryDistrictId = so.getDistrictId() != null ? so.getDistrictId() : (districtIds.isEmpty() ? 0L : districtIds.iterator().next());
        return ResponseEntity.ok(Map.of(
                "so_id", so.getId(),
                "so_name", so.getName(),
                "district_id", primaryDistrictId,
                "total_offers", enriched.size(),
                "offers", enriched
        ));
    }

    /**
     * Get active trade schemes for a Pre-Sales Officer's route / assigned outlets
     */
    @GetMapping("/psr/{psrId}")
    public ResponseEntity<?> getOffersForPsr(@PathVariable Long psrId) {
        Optional<PreSalesOfficer> psrOpt = psrRepository.findById(psrId);
        if (psrOpt.isEmpty()) {
            psrOpt = psrRepository.findByUserId(psrId);
        }
        if (psrOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Pre-Sales Officer not found with ID: " + psrId));
        }
        PreSalesOfficer psr = psrOpt.get();
        Set<Long> districtIds = resolveDistrictIdsForPsr(psr);

        List<Outlet> psrOutlets = outletRepository.findAll().stream()
                .filter(o -> o.getAssignedPsrId() != null && o.getAssignedPsrId().equals(psr.getId()))
                .collect(Collectors.toList());

        List<TradeOffer> allActive = tradeOfferRepository.findByStatusOrderByCreatedAtDesc("ACTIVE");
        List<TradeOffer> offers = allActive.stream()
                .filter(offer -> {
                    if (offer.getDistrictId() != null && districtIds.contains(offer.getDistrictId())) {
                        return true;
                    }
                    if (isComillaDistrict(offer.getDistrictName()) && (
                            isComillaDistrict(psr.getAssignedArea()) ||
                            isComillaDistrict(psr.getSubRoute()) ||
                            (psr.getPsrCode() != null && psr.getPsrCode().toUpperCase().contains("COM"))
                    )) {
                        return true;
                    }
                    return false;
                })
                .collect(Collectors.toList());

        if (offers.isEmpty() && districtIds.isEmpty()) {
            offers = allActive;
        }

        List<Map<String, Object>> enriched = offers.stream().map(this::enrichOfferData).collect(Collectors.toList());
        return ResponseEntity.ok(Map.of(
                "psr_id", psr.getId(),
                "psr_name", psr.getName(),
                "assigned_outlets_count", psrOutlets.size(),
                "total_offers", enriched.size(),
                "offers", enriched
        ));
    }

    /**
     * PSR pitches and discloses a trade offer to a specific outlet.
     * Records disclosure and sends an immediate AppNotification to the outlet!
     */
    @PostMapping("/{offerId}/disclose-to-outlet/{outletId}")
    @Transactional
    public ResponseEntity<?> discloseOfferToOutlet(
            @PathVariable Long offerId,
            @PathVariable Long outletId,
            @RequestBody(required = false) Map<String, Object> req) {
        Optional<TradeOffer> offerOpt = tradeOfferRepository.findById(offerId);
        if (offerOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Trade offer not found with ID: " + offerId));
        }
        TradeOffer offer = offerOpt.get();

        Optional<Outlet> outletOpt = outletRepository.findById(outletId);
        if (outletOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Outlet not found with ID: " + outletId));
        }
        Outlet outlet = outletOpt.get();

        Long psrId = null;
        String psrName = "Assigned Field Officer (PSR)";
        if (req != null) {
            if (req.get("psr_id") != null) {
                try { psrId = Long.parseLong(req.get("psr_id").toString()); } catch (Exception ignored) {}
            }
            if (req.get("psr_name") != null && !req.get("psr_name").toString().trim().isEmpty()) {
                psrName = req.get("psr_name").toString().trim();
            }
        }

        // 1. Record disclosed offer in outlet_disclosed_offers
        try {
            jdbcTemplate.update(
                "MERGE INTO outlet_disclosed_offers (outlet_id, trade_offer_id, psr_id, psr_name, disclosed_at) " +
                "KEY (outlet_id, trade_offer_id) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)",
                outletId, offerId, psrId, psrName
            );
        } catch (Exception ex) {
            try {
                jdbcTemplate.update(
                    "INSERT INTO outlet_disclosed_offers (outlet_id, trade_offer_id, psr_id, psr_name, disclosed_at) " +
                    "VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP) ON DUPLICATE KEY UPDATE psr_name = VALUES(psr_name), disclosed_at = CURRENT_TIMESTAMP",
                    outletId, offerId, psrId, psrName
                );
            } catch (Exception ex2) {
                System.err.println("[discloseOfferToOutlet] Insert fallback note: " + ex2.getMessage());
            }
        }

        // 2. Dispatch real-time AppNotification to Outlet!
        try {
            boolean isMerch = "MERCHANDISE".equalsIgnoreCase(offer.getFreeItemType());
            String freeRewardText = isMerch
                    ? (offer.getFreeQuantityCases() + " free gift(s) (" + offer.getFreeProductName() + ")")
                    : (offer.getFreeQuantityCases() + " case(s) of " + offer.getFreeProductName());

            AppNotification notif = new AppNotification();
            notif.setRecipientRole("OUTLET");
            notif.setRecipientUserId(outlet.getOutletId());
            notif.setType("OFFER_DISCLOSED");
            notif.setTitle("Exclusive Trade Scheme Pitched by PSR " + psrName);
            notif.setMessage("Your Pre-Sales Officer " + psrName + " has introduced an exclusive promotion: " +
                    offer.getTitle() + ". Order " + offer.getBuyQuantityCases() + " cases of " + offer.getBuyProductName() +
                    " to get " + freeRewardText + " 100% FREE!");
            notif.setReferenceId(offer.getId());
            notif.setReferenceCode("OFFER-" + offer.getId());
            notif.setIsRead(false);
            notif.setCreatedAt(LocalDateTime.now());
            notificationRepository.save(notif);
        } catch (Exception e) {
            System.err.println("Error sending notification to outlet: " + e.getMessage());
        }

        return ResponseEntity.ok(Map.of(
            "status", "DISCLOSED",
            "message", "Trade offer successfully pitched and sent to outlet " + outlet.getOutletName(),
            "outlet_id", outletId,
            "offer_id", offerId,
            "psr_name", psrName
        ));
    }

    /**
     * Get trade offers specifically disclosed to an outlet by their PSR
     */
    @GetMapping("/outlet/{outletId}")
    public ResponseEntity<?> getOffersForOutlet(@PathVariable Long outletId) {
        List<Map<String, Object>> rows = new ArrayList<>();
        try {
            rows = jdbcTemplate.queryForList(
                "SELECT o.*, d.psr_name, d.disclosed_at " +
                "FROM trade_offers o " +
                "JOIN outlet_disclosed_offers d ON o.id = d.trade_offer_id " +
                "WHERE d.outlet_id = ? AND o.status = 'ACTIVE' " +
                "ORDER BY d.disclosed_at DESC",
                outletId
            );
        } catch (Exception ex) {
            System.err.println("[getOffersForOutlet] query error: " + ex.getMessage());
        }

        List<Map<String, Object>> results = new ArrayList<>();
        for (Map<String, Object> r : rows) {
            Long offerId = ((Number) r.get("id")).longValue();
            tradeOfferRepository.findById(offerId).ifPresent(offer -> {
                Map<String, Object> enriched = enrichOfferData(offer);
                enriched.put("disclosed_by_psr_name", r.get("psr_name"));
                enriched.put("disclosed_at", r.get("disclosed_at"));
                results.add(enriched);
            });
        }

        return ResponseEntity.ok(results);
    }

    /**
     * Check active offers available for an outlet's district and optionally for a specific product.
     * Shows whether each offer has been disclosed to the outlet already.
     */
    @GetMapping("/check")
    public ResponseEntity<?> checkOutletOffers(
            @RequestParam Long outletId,
            @RequestParam(required = false) Long productId) {
        Optional<Outlet> outletOpt = outletRepository.findById(outletId);
        if (outletOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Outlet not found"));
        }
        Outlet outlet = outletOpt.get();
        Long districtId = outlet.getDistrictId();
        if (districtId == null && outlet.getCity() != null) {
            for (District d : districtRepository.findAll()) {
                if (isSameDistrict(d.getName(), outlet.getCity())) {
                    districtId = d.getId();
                    break;
                }
            }
        }
        if (districtId == null && isComillaDistrict(outlet.getArea())) {
            districtId = 16L;
        }
        if (districtId == null) districtId = 1L;

        final Long resolvedDistrictId = districtId;
        List<TradeOffer> allActive = tradeOfferRepository.findByStatusOrderByCreatedAtDesc("ACTIVE");
        List<TradeOffer> offers = allActive.stream()
                .filter(o -> {
                    if (resolvedDistrictId.equals(o.getDistrictId())) return true;
                    if (isComillaDistrict(o.getDistrictName()) && (
                            isComillaDistrict(outlet.getCity()) || isComillaDistrict(outlet.getArea()) || resolvedDistrictId.equals(16L)
                    )) return true;
                    if (outlet.getCity() != null && isSameDistrict(o.getDistrictName(), outlet.getCity())) return true;
                    return false;
                })
                .collect(Collectors.toList());

        if (productId != null) {
            offers = offers.stream()
                    .filter(o -> o.getBuyProductId().equals(productId) || o.getFreeProductId().equals(productId))
                    .collect(Collectors.toList());
        }

        // Get already disclosed offer IDs for this outlet
        Set<Long> disclosedOfferIds = new HashSet<>();
        try {
            List<Map<String, Object>> rows = jdbcTemplate.queryForList(
                "SELECT trade_offer_id FROM outlet_disclosed_offers WHERE outlet_id = ?",
                outletId
            );
            for (Map<String, Object> r : rows) {
                disclosedOfferIds.add(((Number) r.get("trade_offer_id")).longValue());
            }
        } catch (Exception ignored) {}

        List<Map<String, Object>> enrichedList = new ArrayList<>();
        for (TradeOffer o : offers) {
            Map<String, Object> data = enrichOfferData(o);
            data.put("is_disclosed", disclosedOfferIds.contains(o.getId()));
            enrichedList.add(data);
        }

        return ResponseEntity.ok(Map.of(
            "outlet_id", outletId,
            "district_id", districtId,
            "total_schemes", enrichedList.size(),
            "schemes", enrichedList
        ));
    }

    /**
     * Superadmin creates a trade offer for a specific district and products.
     * Automatically dispatches notifications to suppliers and outlets of that district!
     */
    @PostMapping
    @Transactional
    public ResponseEntity<?> createTradeOffer(@RequestBody Map<String, Object> req) {
        try {
            Long districtId = Long.parseLong(req.get("district_id").toString());
            Long buyProductId = Long.parseLong(req.get("buy_product_id").toString());
            Long freeProductId = Long.parseLong(req.get("free_product_id").toString());
            int buyQty = req.containsKey("buy_quantity_cases") ? Integer.parseInt(req.get("buy_quantity_cases").toString()) : 10;
            int freeQty = req.containsKey("free_quantity_cases") ? Integer.parseInt(req.get("free_quantity_cases").toString()) : 1;
            String freeItemType = req.containsKey("free_item_type") && req.get("free_item_type") != null
                    ? req.get("free_item_type").toString().trim().toUpperCase() : "BEVERAGE";

            District district = districtRepository.findById(districtId)
                    .orElseThrow(() -> new IllegalArgumentException("District not found: " + districtId));
            Product buyProduct = productRepository.findById(buyProductId)
                    .orElseThrow(() -> new IllegalArgumentException("Buy product not found: " + buyProductId));

            String freeItemName;
            String freeSku = "";
            String freeCategory = "BEVERAGE";
            BigDecimal freeUnitVal = BigDecimal.valueOf(15.00);

            if ("MERCHANDISE".equalsIgnoreCase(freeItemType)) {
                MerchandiseProduct merch = merchandiseProductRepository.findById(freeProductId)
                        .orElseThrow(() -> new IllegalArgumentException("Merchandise product not found: " + freeProductId));
                freeItemName = merch.getName() + " [" + merch.getBrand() + " Merchandise]";
                freeSku = merch.getSku();
                freeCategory = "MERCHANDISE";
                if (merch.getPrice() != null) {
                    freeUnitVal = merch.getPrice();
                }
            } else {
                Product freeProduct = productRepository.findById(freeProductId)
                        .orElseThrow(() -> new IllegalArgumentException("Free product not found: " + freeProductId));
                freeItemName = freeProduct.getBrand() + " " + freeProduct.getFlavorVariant() + " (" + freeProduct.getSizeVolume() + ")";
                freeSku = freeProduct.getSku();
                freeCategory = (freeProduct.getCategory() != null) ? freeProduct.getCategory() : "BEVERAGE";
                Optional<DistrictProductPricing> dpp = districtProductPricingRepository.findByDistrictIdAndProductId(districtId, freeProduct.getProductId());
                freeUnitVal = dpp.map(DistrictProductPricing::getOutletPrice)
                        .orElse(freeProduct.getOutletPrice() != null ? freeProduct.getOutletPrice() : BigDecimal.valueOf(15.00));
            }

            String title;
            if (req.containsKey("title") && req.get("title") != null && !req.get("title").toString().trim().isEmpty()) {
                title = req.get("title").toString().trim();
            } else if ("MERCHANDISE".equalsIgnoreCase(freeItemType)) {
                title = "Buy " + buyQty + " Cases " + buyProduct.getBrand() + " " + buyProduct.getFlavorVariant()
                        + " (" + buyProduct.getSizeVolume() + ") -> Get " + freeQty + " " + freeItemName + " FREE";
            } else {
                title = "Buy " + buyQty + " Cases " + buyProduct.getBrand() + " " + buyProduct.getFlavorVariant()
                        + " (" + buyProduct.getSizeVolume() + ") -> Get " + freeQty + " Case(s) " + freeItemName + " FREE";
            }

            String desc;
            if (req.containsKey("description") && req.get("description") != null && !req.get("description").toString().trim().isEmpty()) {
                desc = req.get("description").toString().trim();
            } else if ("MERCHANDISE".equalsIgnoreCase(freeItemType)) {
                desc = "Exclusive promotional merchandise reward for " + district.getName() + " district outlets. Order "
                        + buyQty + " cases of " + buyProduct.getBrand() + " to receive " + freeQty + " official "
                        + freeItemName + " (Worth ৳" + freeUnitVal + ") 100% free of charge.";
            } else {
                desc = "Special promotional scheme valid for " + district.getName() + " district outlets. Buy "
                        + buyQty + " cases of " + buyProduct.getBrand() + " to receive " + freeQty + " case(s) of "
                        + freeItemName + " completely free of cost.";
            }

            TradeOffer offer = new TradeOffer();
            offer.setTitle(title);
            offer.setDistrictId(district.getId());
            offer.setDistrictName(district.getName());
            offer.setDivisionName(district.getDivision());
            offer.setBuyProductId(buyProduct.getProductId());
            offer.setBuyProductName(buyProduct.getBrand() + " " + buyProduct.getFlavorVariant() + " (" + buyProduct.getSizeVolume() + ")");
            offer.setBuyQuantityCases(buyQty);
            offer.setFreeProductId(freeProductId);
            offer.setFreeProductName(freeItemName);
            offer.setFreeQuantityCases(freeQty);
            offer.setFreeItemType(freeItemType);
            offer.setDescription(desc);
            offer.setStatus("ACTIVE");

            TradeOffer saved = tradeOfferRepository.save(offer);

            // Automatically allocate Free Stock pool for this trade scheme
            try {
                int initialPool = req.containsKey("initial_free_stock_pool")
                        ? Integer.parseInt(req.get("initial_free_stock_pool").toString())
                        : (freeQty * 50); // standard 50-bundle free stock pool

                FreeStock fs = new FreeStock();
                fs.setOfferId(saved.getId());
                fs.setOfferTitle(saved.getTitle());
                fs.setDistrictId(district.getId());
                fs.setDistrictName(district.getName());
                fs.setDivisionName(district.getDivision());
                fs.setProductId(freeProductId);
                fs.setProductName(freeItemName);
                fs.setSku(freeSku);
                fs.setCategory(freeCategory);
                fs.setOfferedCases(initialPool);
                fs.setSuppliedCases(0);
                fs.setUnitValue(freeUnitVal);
                fs.setStatus("ACTIVE");
                fs.setNotes("Allocated for trade scheme: " + saved.getTitle() + " [Type: " + freeItemType + "]");
                freeStockRepository.save(fs);
            } catch (Exception ex) {
                System.err.println("[TradeOfferController] Error creating free stock allocation: " + ex.getMessage());
            }

            // ================= NOTIFICATIONS DISPATCH =================
            // 1. Notify suppliers assigned to this district
            List<SupplierProfile> allSuppliers = supplierProfileRepository.findAll();
            List<SupplierProfile> targetSuppliers = allSuppliers.stream()
                    .filter(s -> {
                        if (s.getPrimaryDistrictId() != null && s.getPrimaryDistrictId().equals(districtId)) return true;
                        if (s.getCoveredDistrictIds() != null) {
                            String[] parts = s.getCoveredDistrictIds().split(",");
                            for (String p : parts) {
                                if (p.trim().equals(String.valueOf(districtId))) return true;
                            }
                        }
                        return false;
                    })
                    .collect(Collectors.toList());

            // General notification for SUPPLIER role
            String rewardDesc = "MERCHANDISE".equalsIgnoreCase(freeItemType)
                    ? (freeQty + " FREE Merchandise Gift (" + freeItemName + ")")
                    : (freeQty + " FREE bonus case(s) " + freeItemName);

            AppNotification supRoleNotif = new AppNotification();
            supRoleNotif.setRecipientRole("SUPPLIER");
            supRoleNotif.setTitle("New Extra Stock Offer: " + district.getName() + " District");
            supRoleNotif.setMessage("Superadmin launched a new trade scheme for " + district.getName() + ": Buy "
                    + buyQty + " cases " + buyProduct.getBrand() + " -> Get " + rewardDesc
                    + ". Outlets can now order extra bonus stocks.");
            supRoleNotif.setType("OFFER_CREATED");
            supRoleNotif.setReferenceId(saved.getId());
            notificationRepository.save(supRoleNotif);

            // Individual notification to each assigned supplier user
            for (SupplierProfile sp : targetSuppliers) {
                if (sp.getUserId() != null) {
                    AppNotification indNotif = new AppNotification();
                    indNotif.setRecipientRole("SUPPLIER");
                    indNotif.setRecipientUserId(sp.getUserId());
                    indNotif.setTitle("Trade Scheme Active for " + district.getName());
                    indNotif.setMessage("A new trade offer is now live in your territory (" + district.getName() + "): "
                            + title + ". Outlets placing orders will receive bonus stock.");
                    indNotif.setType("OFFER_CREATED");
                    indNotif.setReferenceId(saved.getId());
                    notificationRepository.save(indNotif);
                }
            }

            // 2. Identify and notify Sales Officers covering this district
            List<SalesOfficer> allSos = salesOfficerRepository.findAll();
            List<SalesOfficer> targetSos = allSos.stream()
                    .filter(so -> {
                        Set<Long> soDists = resolveDistrictIdsForSo(so);
                        return soDists.contains(districtId) || isSameDistrict(so.getCity(), district.getName());
                    })
                    .collect(Collectors.toList());

            for (SalesOfficer so : targetSos) {
                Long soUserId = so.getUserId() != null ? so.getUserId() : so.getId();
                AppNotification indSoNotif = new AppNotification();
                indSoNotif.setRecipientRole("SALES_OFFICER");
                indSoNotif.setRecipientUserId(soUserId);
                indSoNotif.setTitle("Territory Trade Scheme: " + district.getName());
                indSoNotif.setMessage("Superadmin launched a new trade scheme for " + district.getName() + ": " + title + ". Guide your PSRs to pitch this offer to retail outlets.");
                indSoNotif.setType("OFFER_CREATED");
                indSoNotif.setReferenceId(saved.getId());
                indSoNotif.setReferenceCode("OFFER-" + saved.getId());
                indSoNotif.setIsRead(false);
                indSoNotif.setCreatedAt(LocalDateTime.now());
                notificationRepository.save(indSoNotif);
            }

            // 3. Identify and notify PSRs operating in this district
            List<PreSalesOfficer> allPsrs = psrRepository.findAll();
            List<Outlet> allOutlets = outletRepository.findAll();

            Set<Long> targetSupplierIds = targetSuppliers.stream()
                    .map(SupplierProfile::getId)
                    .collect(Collectors.toSet());
            Set<Long> targetSoIds = targetSos.stream()
                    .map(SalesOfficer::getId)
                    .collect(Collectors.toSet());

            List<PreSalesOfficer> targetPsrs = allPsrs.stream()
                    .filter(p -> {
                        Set<Long> pDists = resolveDistrictIdsForPsr(p);
                        if (pDists.contains(districtId)) return true;
                        if (p.getSalesOfficerId() != null && targetSoIds.contains(p.getSalesOfficerId())) return true;
                        if (p.getSupplierId() != null && targetSupplierIds.contains(p.getSupplierId())) return true;
                        return false;
                    })
                    .collect(Collectors.toList());

            // Fallback: if no specific PSR mapped yet, notify all active PSRs
            if (targetPsrs.isEmpty()) {
                targetPsrs = allPsrs;
            }

            String rewardNotice = "MERCHANDISE".equalsIgnoreCase(freeItemType)
                    ? (freeQty + " FREE " + freeItemName + " Gift")
                    : (freeQty + " FREE bonus case(s) of " + freeItemName);

            for (PreSalesOfficer psr : targetPsrs) {
                AppNotification psrNotif = new AppNotification();
                psrNotif.setRecipientRole("PSR");
                psrNotif.setRecipientUserId(psr.getId());
                psrNotif.setTitle("New Scheme to Pitch Outlets: " + district.getName());
                psrNotif.setMessage("A new trade offer is active for " + district.getName() + ": " + title +
                        ". Order " + buyQty + " cases of " + buyProduct.getBrand() + " to get " + rewardNotice +
                        ". You can now pitch this offer to your outlets when taking orders so they unlock bonus stock.");
                psrNotif.setType("OFFER_CREATED");
                psrNotif.setReferenceId(saved.getId());
                psrNotif.setReferenceCode("OFFER-" + saved.getId());
                psrNotif.setIsRead(false);
                psrNotif.setCreatedAt(LocalDateTime.now());
                notificationRepository.save(psrNotif);

                // If psr has an explicit user_id differing from id, also save for user_id
                if (psr.getUserId() != null && !psr.getUserId().equals(psr.getId())) {
                    AppNotification psrUserNotif = new AppNotification();
                    psrUserNotif.setRecipientRole("PSR");
                    psrUserNotif.setRecipientUserId(psr.getUserId());
                    psrUserNotif.setTitle(psrNotif.getTitle());
                    psrUserNotif.setMessage(psrNotif.getMessage());
                    psrUserNotif.setType("OFFER_CREATED");
                    psrUserNotif.setReferenceId(saved.getId());
                    psrUserNotif.setReferenceCode("OFFER-" + saved.getId());
                    psrUserNotif.setIsRead(false);
                    psrUserNotif.setCreatedAt(LocalDateTime.now());
                    notificationRepository.save(psrUserNotif);
                }
            }

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Trade Offer created and notifications sent to suppliers, SOs, and " + targetPsrs.size() + " PSR(s) in " + district.getName(),
                    "offer", enrichOfferData(saved),
                    "notified_suppliers", targetSuppliers.size(),
                    "notified_psrs", targetPsrs.size()
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", e.getMessage()
            ));
        }
    }

    /**
     * Update or toggle status of a trade offer
     */
    @PutMapping("/{id}")
    @Transactional
    public ResponseEntity<?> updateTradeOffer(@PathVariable Long id, @RequestBody Map<String, Object> req) {
        return tradeOfferRepository.findById(id).map(offer -> {
            if (req.containsKey("status")) {
                offer.setStatus(req.get("status").toString().toUpperCase());
            }
            if (req.containsKey("title")) {
                offer.setTitle(req.get("title").toString());
            }
            if (req.containsKey("description")) {
                offer.setDescription(req.get("description").toString());
            }
            if (req.containsKey("buy_quantity_cases")) {
                offer.setBuyQuantityCases(Integer.parseInt(req.get("buy_quantity_cases").toString()));
            }
            if (req.containsKey("free_quantity_cases")) {
                offer.setFreeQuantityCases(Integer.parseInt(req.get("free_quantity_cases").toString()));
            }
            if (req.containsKey("free_item_type") && req.get("free_item_type") != null) {
                offer.setFreeItemType(req.get("free_item_type").toString().toUpperCase());
            }
            TradeOffer updated = tradeOfferRepository.save(offer);
            return ResponseEntity.ok(Map.of("success", true, "offer", enrichOfferData(updated)));
        }).orElse(ResponseEntity.notFound().build());
    }

    /**
     * Delete trade offer
     */
    @DeleteMapping("/{id}")
    @Transactional
    public ResponseEntity<?> deleteTradeOffer(@PathVariable Long id) {
        if (!tradeOfferRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        tradeOfferRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("success", true, "message", "Trade offer deleted successfully"));
    }

    /**
     * Outlet places order directly based on the offer.
     * Automatically adds:
     * 1) Purchased items at normal district wholesale price.
     * 2) Free bonus items at ৳0.00 with promotional annotation.
     * Automatically links to Pre-Sales Officer (PSR) and Supplier!
     */
    @PostMapping("/{id}/order")
    @Transactional
    public ResponseEntity<?> orderViaTradeOffer(@PathVariable Long id, @RequestBody Map<String, Object> req) {
        try {
            TradeOffer offer = tradeOfferRepository.findById(id)
                    .orElseThrow(() -> new IllegalArgumentException("Offer not found: " + id));

            if (!"ACTIVE".equalsIgnoreCase(offer.getStatus())) {
                return ResponseEntity.badRequest().body(Map.of("error", "This offer is currently inactive or expired."));
            }

            if (!req.containsKey("outlet_id") || req.get("outlet_id") == null) {
                return ResponseEntity.badRequest().body(Map.of("error", "Outlet ID is required."));
            }
            Long outletId = Long.parseLong(req.get("outlet_id").toString());

            Outlet outlet = outletRepository.findById(outletId)
                    .orElseThrow(() -> new IllegalArgumentException("Outlet not found: " + outletId));

            int multipliers = 1;
            if (req.containsKey("multipliers") && req.get("multipliers") != null) {
                multipliers = Math.max(1, Integer.parseInt(req.get("multipliers").toString()));
            }

            String remarks = req.getOrDefault("remarks", "").toString();
            String urgency = req.getOrDefault("urgency", "NORMAL").toString();

            boolean isMerch = "MERCHANDISE".equalsIgnoreCase(offer.getFreeItemType());

            // Total cases / items to supply
            int buyCases = offer.getBuyQuantityCases() * multipliers;
            int freeCases = offer.getFreeQuantityCases() * multipliers;

            // Resolve buy product wholesale unit price in this district
            Long distId = (outlet.getDistrictId() != null) ? outlet.getDistrictId() : offer.getDistrictId();
            Optional<DistrictProductPricing> buyPricing = districtProductPricingRepository.findByDistrictIdAndProductId(distId, offer.getBuyProductId());
            Product buyProduct = productRepository.findById(offer.getBuyProductId()).orElse(null);
            Product freeProduct = isMerch ? null : productRepository.findById(offer.getFreeProductId()).orElse(null);
            MerchandiseProduct freeMerch = isMerch ? merchandiseProductRepository.findById(offer.getFreeProductId()).orElse(null) : null;

            BigDecimal buyUnitPrice = buyPricing.map(DistrictProductPricing::getOutletPrice)
                    .orElse(buyProduct != null && buyProduct.getOutletPrice() != null ? buyProduct.getOutletPrice() : BigDecimal.valueOf(30.00));
            BigDecimal buyTotalAmount = buyUnitPrice.multiply(BigDecimal.valueOf(buyCases));

            BigDecimal freeUnitVal;
            if (isMerch) {
                freeUnitVal = (freeMerch != null && freeMerch.getPrice() != null) ? freeMerch.getPrice() : BigDecimal.valueOf(2500.00);
            } else {
                freeUnitVal = (freeProduct != null && freeProduct.getOutletPrice() != null) ? freeProduct.getOutletPrice() : BigDecimal.valueOf(15.00);
            }

            // Resolve assigned Pre-Sales Officer (PSR) & Supplier for outlet
            PreSalesOfficer assignedPsr = null;
            if (outlet.getAssignedPsrId() != null) {
                assignedPsr = psrRepository.findById(outlet.getAssignedPsrId()).orElse(null);
            }
            if (assignedPsr == null) {
                List<PreSalesOfficer> allPsrs = psrRepository.findAll();
                String oArea = outlet.getArea() != null ? outlet.getArea().trim().toLowerCase() : "";
                String oCity = outlet.getCity() != null ? outlet.getCity().trim().toLowerCase() : "";
                String oSub = outlet.getSubRoute() != null ? outlet.getSubRoute().trim().toLowerCase() : "";

                for (PreSalesOfficer p : allPsrs) {
                    String pArea = p.getAssignedArea() != null ? p.getAssignedArea().trim().toLowerCase() : "";
                    String pSub = p.getSubRoute() != null ? p.getSubRoute().trim().toLowerCase() : "";
                    if ((!oSub.isEmpty() && pSub.contains(oSub)) || (!oArea.isEmpty() && pArea.contains(oArea)) || (!oCity.isEmpty() && pArea.contains(oCity))) {
                        assignedPsr = p;
                        break;
                    }
                }
                if (assignedPsr == null && (isComillaDistrict(oArea) || isComillaDistrict(oCity))) {
                    for (PreSalesOfficer p : allPsrs) {
                        if (isComillaDistrict(p.getAssignedArea()) || isComillaDistrict(p.getSubRoute()) || (p.getPsrCode() != null && p.getPsrCode().toUpperCase().contains("COM"))) {
                            assignedPsr = p;
                            break;
                        }
                    }
                }
                if (assignedPsr == null && !allPsrs.isEmpty()) {
                    assignedPsr = allPsrs.get(0);
                }
            }

            String psrName = assignedPsr != null ? assignedPsr.getName() : "Route Pre-Sales Officer";
            Long psrId = assignedPsr != null ? assignedPsr.getId() : 1L;
            Long soId = assignedPsr != null && assignedPsr.getSalesOfficerId() != null ? assignedPsr.getSalesOfficerId() : 1L;
            String subRoute = assignedPsr != null && assignedPsr.getSubRoute() != null ? assignedPsr.getSubRoute() : "Route-Default";

            Long supplierId = (assignedPsr != null && assignedPsr.getSupplierId() != null) ? assignedPsr.getSupplierId() : 1L;
            String supplierName = (assignedPsr != null && assignedPsr.getSupplierName() != null) ? assignedPsr.getSupplierName() : "Central Beverage Logistics Hub";

            String bundleCode = "OFFER-BND-" + (System.currentTimeMillis() % 1000000);
            String packageReqCode = "REQ-" + (System.currentTimeMillis() % 1000000);

            String freeLabel = isMerch
                    ? (freeCases + " Free " + offer.getFreeProductName())
                    : (freeCases + " Free cs " + offer.getFreeProductName());
            String unifiedProductName = offer.getBuyProductName() + " [🎁 Package: +" + freeLabel + "]";

            String packageRemarks = "🎁 Trade Offer Order [" + offer.getTitle() + "] - " + multipliers + "x Bundle (" + buyCases + " cases + " + freeLabel + "). " + remarks;
            String psrPackageNotes = "🎁 Scheme Package Bundle: " + bundleCode + " | Includes " + freeCases + (isMerch ? " FREE merchandise item(s)" : " FREE bonus cases") + " of " + offer.getFreeProductName();
            String adminPackageNotes = "🎁 Scheme Package (" + bundleCode + "): " + buyCases + "cs " + offer.getBuyProductName() + " + " + freeLabel + " under offer #" + offer.getId();

            // 1. Insert ONLY 1 unified Trade Offer Package order into psr_orders (No split rows!)
            jdbcTemplate.update(
                    "INSERT INTO psr_orders (order_code, psr_id, psr_name, sales_officer_id, outlet_id, outlet_name, sub_route, product_id, product_name, quantity, unit_price, total_amount, urgency, status, outlet_remarks, psr_notes, supplier_id, supplier_name, free_product_id, free_product_name, free_quantity, is_trade_package, trade_offer_id, created_at, updated_at) " +
                    "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'SUBMITTED_TO_PSR', ?, ?, ?, ?, ?, ?, ?, true, ?, NOW(), NOW())",
                    packageReqCode, psrId, psrName, soId, outletId, outlet.getOutletName(), subRoute,
                    offer.getBuyProductId(), unifiedProductName, buyCases, buyUnitPrice, buyTotalAmount, urgency,
                    packageRemarks, psrPackageNotes, supplierId, supplierName,
                    offer.getFreeProductId(), offer.getFreeProductName(), freeCases, offer.getId()
            );

            // 2. Insert ONLY 1 unified Trade Offer Package requisition into outlet_requisitions (Only 1 goes to supplier!)
            jdbcTemplate.update(
                    "INSERT INTO outlet_requisitions (requisition_code, outlet_id, product_id, product_name, quantity, unit_price, total_amount, urgency, status, outlet_remarks, admin_supplier_notes, sales_officer_id, supplier_id, free_product_id, free_product_name, free_quantity, is_trade_package, trade_offer_id, created_date, updated_date) " +
                    "VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PENDING_PSR', ?, ?, ?, ?, ?, ?, ?, true, ?, NOW(), NOW())",
                    packageReqCode, outletId, offer.getBuyProductId(), unifiedProductName, buyCases, buyUnitPrice, buyTotalAmount, urgency,
                    packageRemarks, adminPackageNotes, soId, supplierId,
                    offer.getFreeProductId(), offer.getFreeProductName(), freeCases, offer.getId()
            );

            // 2b. Automatically Record in Free Stocks & Update Supplied Ledger
            try {
                Optional<FreeStock> fsOpt = freeStockRepository.findByOfferId(offer.getId());
                FreeStock fs = fsOpt.orElse(null);
                if (fs == null) {
                    fs = freeStockRepository.findByDistrictIdAndProductId(distId, offer.getFreeProductId()).orElse(null);
                }

                if (fs != null) {
                    fs.setSuppliedCases(fs.getSuppliedCases() + freeCases);
                    freeStockRepository.save(fs);
                }

                FreeStockTransaction fst = new FreeStockTransaction();
                if (fs != null) fst.setFreeStockId(fs.getId());
                fst.setOfferId(offer.getId());
                fst.setOfferTitle(offer.getTitle());
                fst.setRequisitionCode(packageReqCode);
                fst.setDistrictId(distId);
                fst.setDistrictName(offer.getDistrictName());
                fst.setOutletId(outletId);
                fst.setOutletName(outlet.getOutletName());
                fst.setSupplierId(supplierId);
                fst.setSupplierName(supplierName);
                fst.setProductId(offer.getFreeProductId());
                fst.setProductName(offer.getFreeProductName());
                fst.setCasesSupplied(freeCases);
                fst.setUnitValue(freeUnitVal);
                fst.setTotalValue(freeUnitVal.multiply(BigDecimal.valueOf(freeCases)));
                fst.setStatus("DISPATCHED");
                transactionRepository.save(fst);
            } catch (Exception ex) {
                System.err.println("[TradeOfferController] Error logging free stock transaction: " + ex.getMessage());
            }

            // 3. Dispatch Notification to Supplier (Single unified package notification!)
            try {
                AppNotification supOrderNotif = new AppNotification();
                supOrderNotif.setRecipientRole("SUPPLIER");
                supOrderNotif.setRecipientUserId(supplierId);
                supOrderNotif.setTitle("Trade Scheme Package Order: " + outlet.getOutletName());
                String freeNotifLabel = isMerch ? (freeCases + " FREE merchandise gift(s) (" + offer.getFreeProductName() + ")") : (freeCases + " FREE bonus cases of " + offer.getFreeProductName());
                supOrderNotif.setMessage("Outlet " + outlet.getOutletName() + " ordered " + buyCases + " cases of " + offer.getBuyProductName()
                        + " + " + freeNotifLabel + " under Scheme [" + offer.getTitle() + "] as 1 unified package. Total: ৳" + buyTotalAmount);
                supOrderNotif.setType("NEW_REQUISITION");
                supOrderNotif.setReferenceCode(packageReqCode);
                notificationRepository.save(supOrderNotif);
            } catch (Exception ignored) {}

            Map<String, Object> orderResp = new LinkedHashMap<>();
            orderResp.put("success", true);
            orderResp.put("message", "Trade Offer order successfully submitted! You received " + freeCases + (isMerch ? " free merchandise gift(s)." : " free bonus cases."));
            orderResp.put("bundle_code", bundleCode);
            orderResp.put("requisition_code", packageReqCode);
            orderResp.put("buy_requisition_code", packageReqCode);
            orderResp.put("free_requisition_code", packageReqCode);
            orderResp.put("product_name", unifiedProductName);
            orderResp.put("buy_cases", buyCases);
            orderResp.put("free_cases", freeCases);
            orderResp.put("free_item_type", offer.getFreeItemType() != null ? offer.getFreeItemType() : "BEVERAGE");
            orderResp.put("buy_unit_price", buyUnitPrice);
            orderResp.put("total_payable", buyTotalAmount);
            orderResp.put("savings_amount", freeUnitVal.multiply(BigDecimal.valueOf(freeCases)));

            return ResponseEntity.ok(orderResp);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", e.getMessage()
            ));
        }
    }

    private Map<String, Object> enrichOfferData(TradeOffer offer) {
        Map<String, Object> map = new HashMap<>();
        map.put("id", offer.getId());
        map.put("title", offer.getTitle());
        map.put("district_id", offer.getDistrictId());
        map.put("district_name", offer.getDistrictName());
        map.put("division_name", offer.getDivisionName());
        map.put("buy_product_id", offer.getBuyProductId());
        map.put("buy_product_name", offer.getBuyProductName());
        map.put("buy_quantity_cases", offer.getBuyQuantityCases());
        map.put("free_product_id", offer.getFreeProductId());
        map.put("free_product_name", offer.getFreeProductName());
        map.put("free_quantity_cases", offer.getFreeQuantityCases());
        map.put("free_item_type", offer.getFreeItemType() != null ? offer.getFreeItemType() : "BEVERAGE");
        map.put("description", offer.getDescription());
        map.put("status", offer.getStatus());
        map.put("created_at", offer.getCreatedAt());
        map.put("updated_at", offer.getUpdatedAt());

        // Attach product metadata if available
        productRepository.findById(offer.getBuyProductId()).ifPresent(p -> {
            map.put("buy_product_sku", p.getSku());
            map.put("buy_product_image", p.getImageUrl());
            map.put("buy_product_brand", p.getBrand());
            map.put("buy_product_volume", p.getSizeVolume());
            // Look up district price
            Optional<DistrictProductPricing> dpp = districtProductPricingRepository.findByDistrictIdAndProductId(offer.getDistrictId(), offer.getBuyProductId());
            BigDecimal buyPrice = dpp.map(DistrictProductPricing::getOutletPrice).orElse(p.getOutletPrice() != null ? p.getOutletPrice() : p.getBasePrice());
            map.put("buy_unit_price", buyPrice);
        });

        if ("MERCHANDISE".equalsIgnoreCase(offer.getFreeItemType())) {
            merchandiseProductRepository.findById(offer.getFreeProductId()).ifPresent(m -> {
                map.put("free_product_sku", m.getSku());
                map.put("free_product_image", m.getImageUrl());
                map.put("free_product_brand", m.getBrand());
                map.put("free_product_volume", m.getSizeSpec() != null ? m.getSizeSpec() : m.getItemType());
                map.put("free_product_packaging", m.getPackaging());
                map.put("free_unit_value", m.getPrice());
                map.put("free_merchandise_details", m);
            });
        } else {
            productRepository.findById(offer.getFreeProductId()).ifPresent(p -> {
                map.put("free_product_sku", p.getSku());
                map.put("free_product_image", p.getImageUrl());
                map.put("free_product_brand", p.getBrand());
                map.put("free_product_volume", p.getSizeVolume());
                Optional<DistrictProductPricing> dpp = districtProductPricingRepository.findByDistrictIdAndProductId(offer.getDistrictId(), offer.getFreeProductId());
                BigDecimal freePrice = dpp.map(DistrictProductPricing::getOutletPrice).orElse(p.getOutletPrice() != null ? p.getOutletPrice() : p.getBasePrice());
                map.put("free_unit_value", freePrice);
            });
        }

        return map;
    }
}
