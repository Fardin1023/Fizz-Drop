package com.fizzdrop.controller;

import com.fizzdrop.entity.AppNotification;
import com.fizzdrop.entity.CentralInventory;
import com.fizzdrop.entity.District;
import com.fizzdrop.entity.DistrictProductPricing;
import com.fizzdrop.entity.Product;
import com.fizzdrop.entity.SupplierProfile;
import com.fizzdrop.repository.*;
import jakarta.annotation.PostConstruct;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping({"/api/v1/pricing", "/api/pricing"})
@CrossOrigin(origins = "*")
public class DistrictPricingController {

    private final DistrictProductPricingRepository pricingRepository;
    private final DistrictRepository districtRepository;
    private final ProductRepository productRepository;
    private final CentralInventoryRepository centralInventoryRepository;
    private final SupplierProfileRepository supplierProfileRepository;
    private final OutletRepository outletRepository;
    private final AppNotificationRepository notificationRepository;

    public DistrictPricingController(DistrictProductPricingRepository pricingRepository,
                                     DistrictRepository districtRepository,
                                     ProductRepository productRepository,
                                     CentralInventoryRepository centralInventoryRepository,
                                     SupplierProfileRepository supplierProfileRepository,
                                     OutletRepository outletRepository,
                                     AppNotificationRepository notificationRepository) {
        this.pricingRepository = pricingRepository;
        this.districtRepository = districtRepository;
        this.productRepository = productRepository;
        this.centralInventoryRepository = centralInventoryRepository;
        this.supplierProfileRepository = supplierProfileRepository;
        this.outletRepository = outletRepository;
        this.notificationRepository = notificationRepository;
    }

    /**
     * Pre-seeds all 64 districts with their own independent pricing records.
     * Guarantees each district has completely isolated, individual rows in district_product_pricing.
     */
    @PostConstruct
    @Transactional
    public void seedAllDistrictsIfEmpty() {
        try {
            List<District> districts = districtRepository.findAll();
            List<Product> products = productRepository.findAll();
            if (districts.isEmpty() || products.isEmpty()) return;

            List<DistrictProductPricing> allExisting = pricingRepository.findAll();
            Set<String> existingKeys = allExisting.stream()
                    .map(p -> p.getDistrictId() + "_" + p.getProductId())
                    .collect(Collectors.toSet());

            List<DistrictProductPricing> toSeed = new ArrayList<>();
            for (District d : districts) {
                for (Product prod : products) {
                    String key = d.getId() + "_" + prod.getProductId();
                    if (!existingKeys.contains(key)) {
                        BigDecimal base = prod.getBasePrice() != null ? prod.getBasePrice() : new BigDecimal("25.00");
                        BigDecimal out = base.multiply(new BigDecimal("1.15")).setScale(2, RoundingMode.HALF_UP);
                        BigDecimal ret = out.multiply(new BigDecimal("1.15")).setScale(2, RoundingMode.HALF_UP);

                        toSeed.add(new DistrictProductPricing(d.getId(), prod.getProductId(), base, out, ret));
                    }
                }
            }

            if (!toSeed.isEmpty()) {
                pricingRepository.saveAll(toSeed);
            }
        } catch (Exception ignored) {}
    }

    /**
     * Get all 64 districts with their divisions and pricing counts for Superadmin
     */
    @GetMapping("/districts")
    public ResponseEntity<List<Map<String, Object>>> getDistrictsPricingOverview() {
        List<District> districts = districtRepository.findAll();
        districts.sort(Comparator.comparing(District::getId));

        List<DistrictProductPricing> allPricing = pricingRepository.findAll();
        Map<Long, Long> countsByDistrict = allPricing.stream()
                .collect(Collectors.groupingBy(DistrictProductPricing::getDistrictId, Collectors.counting()));

        long totalProducts = productRepository.count();

        List<Map<String, Object>> result = new ArrayList<>();
        for (District d : districts) {
            Map<String, Object> map = new HashMap<>();
            map.put("id", d.getId());
            map.put("name", d.getName());
            map.put("division", d.getDivision());
            long pricedCount = countsByDistrict.getOrDefault(d.getId(), 0L);
            map.put("priced_products_count", pricedCount);
            map.put("total_products_count", totalProducts);
            map.put("is_fully_priced", totalProducts > 0 && pricedCount >= totalProducts);
            result.add(map);
        }

        return ResponseEntity.ok(result);
    }

    /**
     * Get all product pricing for a specific district.
     * Auto-seeds/initializes default pricing from master products if missing.
     */
    @GetMapping("/district/{districtId}")
    @Transactional
    public ResponseEntity<?> getPricingForDistrict(@PathVariable Long districtId) {
        Optional<District> distOpt = districtRepository.findById(districtId);
        if (distOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", "District with ID " + districtId + " not found"));
        }
        District district = distOpt.get();

        List<Product> products = productRepository.findAll();
        List<DistrictProductPricing> existingPricing = pricingRepository.findByDistrictId(districtId);
        Map<Long, DistrictProductPricing> pricingMap = existingPricing.stream()
                .collect(Collectors.toMap(DistrictProductPricing::getProductId, p -> p, (a, b) -> a));

        Map<Long, Integer> stockMap = centralInventoryRepository.findAll().stream()
                .collect(Collectors.toMap(CentralInventory::getProductId, CentralInventory::getAvailableStock, (a, b) -> a));

        List<DistrictProductPricing> toSave = new ArrayList<>();
        List<DistrictProductPricing> responseList = new ArrayList<>();

        for (Product prod : products) {
            DistrictProductPricing item = pricingMap.get(prod.getProductId());
            if (item == null) {
                // Initialize default prices from product factory benchmark, completely independent per district
                BigDecimal supPrice = prod.getBasePrice() != null ? prod.getBasePrice() : new BigDecimal("25.00");

                // Supplier -> Outlet price: 15% wholesale markup
                BigDecimal outPrice = supPrice.multiply(new BigDecimal("1.15")).setScale(2, RoundingMode.HALF_UP);

                // Outlet -> Customer price: 15% retail markup
                BigDecimal retPrice = outPrice.multiply(new BigDecimal("1.15")).setScale(2, RoundingMode.HALF_UP);

                item = new DistrictProductPricing(districtId, prod.getProductId(), supPrice, outPrice, retPrice);
                toSave.add(item);
            }

            // Populate transient fields
            item.setDistrictName(district.getName());
            item.setDivisionName(district.getDivision());
            item.setProductName(prod.getBrand() + " " + prod.getFlavorVariant());
            item.setBrand(prod.getBrand());
            item.setFlavorVariant(prod.getFlavorVariant());
            item.setSku(prod.getSku());
            item.setCategory(prod.getCategory());
            item.setPackaging(prod.getPackaging());
            item.setSizeVolume(prod.getSizeVolume());
            item.setImageUrl(prod.getImageUrl());
            item.setCentralStock(stockMap.getOrDefault(prod.getProductId(), 0));

            responseList.add(item);
        }

        if (!toSave.isEmpty()) {
            pricingRepository.saveAll(toSave);
        }

        // Sort by product ID
        responseList.sort(Comparator.comparing(DistrictProductPricing::getProductId));

        Map<String, Object> response = new HashMap<>();
        response.put("district_id", district.getId());
        response.put("district_name", district.getName());
        response.put("division_name", district.getDivision());
        response.put("total_products", responseList.size());
        response.put("pricing", responseList);

        return ResponseEntity.ok(response);
    }

    /**
     * Superadmin updates or allots pricing for one or multiple products in a district.
     */
    @PutMapping("/district/{districtId}")
    @Transactional
    public ResponseEntity<?> updateDistrictPricing(
            @PathVariable Long districtId,
            @RequestBody Object body) {

        Optional<District> distOpt = districtRepository.findById(districtId);
        if (distOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", "District with ID " + districtId + " not found"));
        }
        District district = distOpt.get();

        List<Map<String, Object>> itemsToUpdate = new ArrayList<>();
        if (body instanceof List) {
            itemsToUpdate = (List<Map<String, Object>>) body;
        } else if (body instanceof Map) {
            Map<String, Object> map = (Map<String, Object>) body;
            if (map.containsKey("pricing") && map.get("pricing") instanceof List) {
                itemsToUpdate = (List<Map<String, Object>>) map.get("pricing");
            } else {
                itemsToUpdate.add(map);
            }
        }

        List<DistrictProductPricing> updatedList = new ArrayList<>();

        for (Map<String, Object> entry : itemsToUpdate) {
            Object pIdObj = entry.get("product_id") != null ? entry.get("product_id") : entry.get("productId");
            if (pIdObj == null) continue;

            Long productId = Long.parseLong(pIdObj.toString());
            Optional<Product> prodOpt = productRepository.findById(productId);
            if (prodOpt.isEmpty()) continue;
            Product prod = prodOpt.get();

            Optional<DistrictProductPricing> existingOpt = pricingRepository.findByDistrictIdAndProductId(districtId, productId);
            DistrictProductPricing pricing = existingOpt.orElseGet(() -> {
                DistrictProductPricing newP = new DistrictProductPricing();
                newP.setDistrictId(districtId);
                newP.setProductId(productId);
                return newP;
            });

            if (entry.containsKey("supplier_price") && entry.get("supplier_price") != null) {
                pricing.setSupplierPrice(new BigDecimal(entry.get("supplier_price").toString()));
            } else if (entry.containsKey("supplierPrice") && entry.get("supplierPrice") != null) {
                pricing.setSupplierPrice(new BigDecimal(entry.get("supplierPrice").toString()));
            } else if (pricing.getSupplierPrice() == null) {
                pricing.setSupplierPrice(prod.getBasePrice() != null ? prod.getBasePrice() : new BigDecimal("30.00"));
            }

            if (entry.containsKey("outlet_price") && entry.get("outlet_price") != null) {
                pricing.setOutletPrice(new BigDecimal(entry.get("outlet_price").toString()));
            } else if (entry.containsKey("outletPrice") && entry.get("outletPrice") != null) {
                pricing.setOutletPrice(new BigDecimal(entry.get("outletPrice").toString()));
            } else if (pricing.getOutletPrice() == null) {
                pricing.setOutletPrice(pricing.getSupplierPrice().multiply(new BigDecimal("1.15")).setScale(2, RoundingMode.HALF_UP));
            }

            if (entry.containsKey("retail_price") && entry.get("retail_price") != null) {
                pricing.setRetailPrice(new BigDecimal(entry.get("retail_price").toString()));
            } else if (entry.containsKey("retailPrice") && entry.get("retailPrice") != null) {
                pricing.setRetailPrice(new BigDecimal(entry.get("retailPrice").toString()));
            } else if (pricing.getRetailPrice() == null) {
                pricing.setRetailPrice(pricing.getOutletPrice().multiply(new BigDecimal("1.15")).setScale(2, RoundingMode.HALF_UP));
            }

            pricing.setUpdatedAt(LocalDateTime.now());
            updatedList.add(pricing);
        }

        if (!updatedList.isEmpty()) {
            pricingRepository.saveAll(updatedList);
        }

        ProductController.invalidateCatalogCache();

        List<SupplierProfile> targetSuppliers = supplierProfileRepository.findAll().stream()
                .filter(s -> (s.getPrimaryDistrictId() != null && s.getPrimaryDistrictId().equals(districtId)) ||
                             (s.getCoveredDistrictIds() != null && Arrays.asList(s.getCoveredDistrictIds().split(",")).contains(String.valueOf(districtId))))
                .collect(Collectors.toList());
        long supplierCount = targetSuppliers.size();

        long outletCount = outletRepository.findAll().stream()
                .filter(o -> o.getDistrictId() != null && o.getDistrictId().equals(districtId))
                .count();

        // Send real-time notifications to superadmin, regional suppliers and outlets of this district
        try {
            // 1. Superadmin Alert
            AppNotification adminNotif = new AppNotification();
            adminNotif.setRecipientRole("SUPERADMIN");
            adminNotif.setTitle("Price Set for " + district.getName() + " District");
            adminNotif.setMessage("Pricing successfully allotted and saved in database for " + district.getName() + " (" + updatedList.size() + " SKUs). Applied to " + supplierCount + " suppliers and " + outletCount + " outlets.");
            adminNotif.setType("PRICE_UPDATED");
            adminNotif.setReferenceId(districtId);
            notificationRepository.save(adminNotif);

            // 2. Role-wide Supplier Alert for this district
            AppNotification supNotif = new AppNotification();
            supNotif.setRecipientRole("SUPPLIER");
            supNotif.setTitle("Price Set for " + district.getName() + " District");
            supNotif.setMessage("Superadmin updated 3-tier product pricing for " + district.getName() + " district (" + updatedList.size() + " SKUs). New buy rates and wholesale prices are now in effect.");
            supNotif.setType("PRICE_UPDATED");
            supNotif.setReferenceId(districtId);
            notificationRepository.save(supNotif);

            // 3. User-specific notifications for all suppliers assigned to this district
            for (SupplierProfile sp : targetSuppliers) {
                if (sp.getUserId() != null) {
                    AppNotification indivSupNotif = new AppNotification();
                    indivSupNotif.setRecipientRole("SUPPLIER");
                    indivSupNotif.setRecipientUserId(sp.getUserId());
                    indivSupNotif.setTitle("Price Set for " + district.getName() + " District");
                    indivSupNotif.setMessage("Superadmin updated product pricing for your district (" + district.getName() + "). New inventory buy rates and wholesale supply prices are now applied.");
                    indivSupNotif.setType("PRICE_UPDATED");
                    indivSupNotif.setReferenceId(districtId);
                    notificationRepository.save(indivSupNotif);
                }
            }

            // 4. Outlet Alert for this district
            AppNotification outNotif = new AppNotification();
            outNotif.setRecipientRole("OUTLET");
            outNotif.setTitle("Price Set for " + district.getName() + " District");
            outNotif.setMessage("Superadmin updated wholesale purchase and retail MRP rates for " + district.getName() + " district (" + updatedList.size() + " SKUs).");
            outNotif.setType("PRICE_UPDATED");
            outNotif.setReferenceId(districtId);
            notificationRepository.save(outNotif);
        } catch (Exception ignored) {}

        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Successfully allotted and saved pricing for " + updatedList.size() + " products in " + district.getName() + " district. Applied to " + supplierCount + " regional suppliers and " + outletCount + " retail outlets in this district.",
                "district_id", districtId,
                "district_name", district.getName(),
                "updated_count", updatedList.size(),
                "suppliers_affected", supplierCount,
                "outlets_affected", outletCount
        ));
    }

    /**
     * Copy pricing from one district to other districts (or all districts)
     */
    @PostMapping("/copy")
    @Transactional
    public ResponseEntity<?> copyDistrictPricing(@RequestBody Map<String, Object> request) {
        Object fromObj = request.get("from_district_id") != null ? request.get("from_district_id") : request.get("fromDistrictId");
        if (fromObj == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "from_district_id is required"));
        }
        Long fromDistrictId = Long.parseLong(fromObj.toString());

        List<DistrictProductPricing> sourcePricing = pricingRepository.findByDistrictId(fromDistrictId);
        if (sourcePricing.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "No pricing records found for source district #" + fromDistrictId));
        }

        boolean applyToAll = Boolean.TRUE.equals(request.get("all"));
        List<Long> targetDistrictIds = new ArrayList<>();

        if (applyToAll) {
            List<District> allDistricts = districtRepository.findAll();
            for (District d : allDistricts) {
                if (!d.getId().equals(fromDistrictId)) {
                    targetDistrictIds.add(d.getId());
                }
            }
        } else if (request.containsKey("target_district_ids")) {
            List<?> rawList = (List<?>) request.get("target_district_ids");
            for (Object item : rawList) {
                targetDistrictIds.add(Long.parseLong(item.toString()));
            }
        }

        List<DistrictProductPricing> toSave = new ArrayList<>();
        for (Long tId : targetDistrictIds) {
            Map<Long, DistrictProductPricing> targetMap = pricingRepository.findByDistrictId(tId).stream()
                    .collect(Collectors.toMap(DistrictProductPricing::getProductId, p -> p, (a, b) -> a));

            for (DistrictProductPricing src : sourcePricing) {
                DistrictProductPricing target = targetMap.get(src.getProductId());
                if (target == null) {
                    target = new DistrictProductPricing();
                    target.setDistrictId(tId);
                    target.setProductId(src.getProductId());
                }
                target.setSupplierPrice(src.getSupplierPrice());
                target.setOutletPrice(src.getOutletPrice());
                target.setRetailPrice(src.getRetailPrice());
                target.setUpdatedAt(LocalDateTime.now());
                toSave.add(target);
            }
        }

        if (!toSave.isEmpty()) {
            pricingRepository.saveAll(toSave);
        }

        ProductController.invalidateCatalogCache();

        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Successfully copied pricing from district #" + fromDistrictId + " to " + targetDistrictIds.size() + " districts.",
                "target_districts_count", targetDistrictIds.size()
        ));
    }

    /**
     * Get Price Board for a supplier across their assigned districts.
     * Supports selecting any district assigned to the supplier (e.g. Comilla, Chittagong, etc.),
     * and returns the multi-district pricing matrix for all assigned territories.
     */
    @GetMapping("/supplier/board")
    @Transactional
    public ResponseEntity<?> getSupplierPriceBoard(
            @RequestParam(required = false) Long userId,
            @RequestParam(required = false) Long supplierId,
            @RequestParam(required = false) Long districtId) {

        Optional<SupplierProfile> profileOpt = Optional.empty();
        if (supplierId != null && supplierId > 0) {
            profileOpt = supplierProfileRepository.findById(supplierId);
        }
        if (profileOpt.isEmpty() && userId != null && userId > 0) {
            profileOpt = supplierProfileRepository.findByUserId(userId);
        }
        if (profileOpt.isEmpty()) {
            profileOpt = supplierProfileRepository.findByUserId(4L);
        }
        if (profileOpt.isEmpty()) {
            profileOpt = supplierProfileRepository.findAll().stream().findFirst();
        }

        Long targetUserId = userId != null ? userId : (profileOpt.map(SupplierProfile::getUserId).orElse(4L));
        Long primaryDistrictId = 1L;
        String businessName = "Regional Supplier";
        String depotAddress = "Regional Territory Depot";
        List<Long> assignedDistrictIds = new ArrayList<>();

        if (profileOpt.isPresent()) {
            SupplierProfile profile = profileOpt.get();
            if (profile.getUserId() != null) {
                targetUserId = profile.getUserId();
            }
            if (profile.getPrimaryDistrictId() != null) {
                primaryDistrictId = profile.getPrimaryDistrictId();
                if (!assignedDistrictIds.contains(primaryDistrictId)) {
                    assignedDistrictIds.add(primaryDistrictId);
                }
            }
            if (profile.getCoveredDistrictIds() != null && !profile.getCoveredDistrictIds().isBlank()) {
                String[] parts = profile.getCoveredDistrictIds().split(",");
                for (String part : parts) {
                    try {
                        Long pId = Long.parseLong(part.trim());
                        if (!assignedDistrictIds.contains(pId)) {
                            assignedDistrictIds.add(pId);
                        }
                    } catch (Exception ignored) {}
                }
            }
            if (profile.getBusinessName() != null && !profile.getBusinessName().isBlank()) {
                businessName = profile.getBusinessName();
            }
            if (profile.getDepotAddress() != null && !profile.getDepotAddress().isBlank()) {
                depotAddress = profile.getDepotAddress();
            }
        }

        if (assignedDistrictIds.isEmpty()) {
            assignedDistrictIds.add(primaryDistrictId);
        }

        // Fetch District entities for metadata
        List<District> allDistricts = districtRepository.findAll();
        Map<Long, District> distMap = allDistricts.stream().collect(Collectors.toMap(District::getId, d -> d, (a, b) -> a));

        List<Map<String, Object>> assignedDistrictsList = new ArrayList<>();
        for (Long dId : assignedDistrictIds) {
            District d = distMap.get(dId);
            if (d != null) {
                Map<String, Object> dm = new HashMap<>();
                dm.put("id", d.getId());
                dm.put("name", d.getName());
                dm.put("division", d.getDivision());
                dm.put("is_primary", Objects.equals(d.getId(), primaryDistrictId));
                assignedDistrictsList.add(dm);
            }
        }

        // Determine effective district: if requested districtId is among assigned districts (or user is superadmin), use it!
        Long effectiveDistrictId = primaryDistrictId;
        if (districtId != null && districtId > 0) {
            if (assignedDistrictIds.contains(districtId) || targetUserId.equals(4L) || targetUserId.equals(1L)) {
                effectiveDistrictId = districtId;
            }
        }

        // Delegate to existing getPricingForDistrict logic which guarantees seeded rates
        ResponseEntity<?> distPricingRes = getPricingForDistrict(effectiveDistrictId);
        if (distPricingRes.getStatusCode() != HttpStatus.OK || !(distPricingRes.getBody() instanceof Map)) {
            return distPricingRes;
        }

        @SuppressWarnings("unchecked")
        Map<String, Object> body = new HashMap<>((Map<String, Object>) distPricingRes.getBody());
        body.put("supplier_user_id", targetUserId);
        body.put("supplier_id", profileOpt.map(SupplierProfile::getId).orElse(null));
        body.put("business_name", businessName);
        body.put("depot_address", depotAddress);
        body.put("primary_district_id", primaryDistrictId);
        body.put("selected_district_id", effectiveDistrictId);
        body.put("assigned_districts", assignedDistrictsList);
        body.put("is_supplier_locked", true);
        body.put("timestamp", System.currentTimeMillis());

        // Multi-district pricing compilation for all assigned districts
        Map<String, Object> multiDistrictPricing = new HashMap<>();
        for (Long dId : assignedDistrictIds) {
            List<DistrictProductPricing> dpps = pricingRepository.findByDistrictId(dId);
            Map<String, Object> prodPricingMap = new HashMap<>();
            for (DistrictProductPricing p : dpps) {
                Map<String, Object> pDetail = new HashMap<>();
                pDetail.put("supplier_price", p.getSupplierPrice());
                pDetail.put("outlet_price", p.getOutletPrice());
                pDetail.put("retail_price", p.getRetailPrice());
                pDetail.put("district_id", p.getDistrictId());
                prodPricingMap.put(String.valueOf(p.getProductId()), pDetail);
            }
            multiDistrictPricing.put(String.valueOf(dId), prodPricingMap);
        }
        body.put("multi_district_pricing", multiDistrictPricing);

        return ResponseEntity.ok(body);
    }

    /**
     * Get multi-district price board for Superadmin across all districts.
     */
    @GetMapping("/board/all")
    public ResponseEntity<?> getAllDistrictsPriceBoard() {
        List<District> districts = districtRepository.findAll();
        districts.sort(Comparator.comparing(District::getId));

        List<DistrictProductPricing> allPricing = pricingRepository.findAll();
        Map<Long, List<DistrictProductPricing>> pricingByDistrict = allPricing.stream()
                .collect(Collectors.groupingBy(DistrictProductPricing::getDistrictId));

        List<Product> products = productRepository.findAll();
        Map<Long, Product> productMap = products.stream()
                .collect(Collectors.toMap(Product::getProductId, p -> p, (a, b) -> a));

        List<Map<String, Object>> result = new ArrayList<>();
        for (District d : districts) {
            Map<String, Object> dMap = new HashMap<>();
            dMap.put("district_id", d.getId());
            dMap.put("district_name", d.getName());
            dMap.put("division_name", d.getDivision());

            List<DistrictProductPricing> pList = pricingByDistrict.getOrDefault(d.getId(), Collections.emptyList());
            List<Map<String, Object>> pricingDetails = new ArrayList<>();
            for (DistrictProductPricing dp : pList) {
                Product prod = productMap.get(dp.getProductId());
                Map<String, Object> item = new HashMap<>();
                item.put("id", dp.getId());
                item.put("product_id", dp.getProductId());
                item.put("supplier_price", dp.getSupplierPrice());
                item.put("outlet_price", dp.getOutletPrice());
                item.put("retail_price", dp.getRetailPrice());
                item.put("updated_at", dp.getUpdatedAt());
                if (prod != null) {
                    item.put("product_name", prod.getBrand() + " " + prod.getFlavorVariant());
                    item.put("brand", prod.getBrand());
                    item.put("flavor_variant", prod.getFlavorVariant());
                    item.put("category", prod.getCategory());
                    item.put("sku", prod.getSku());
                    item.put("packaging", prod.getPackaging());
                    item.put("size_volume", prod.getSizeVolume());
                    item.put("image_url", prod.getImageUrl());
                }
                pricingDetails.add(item);
            }
            dMap.put("pricing", pricingDetails);
            dMap.put("priced_count", pricingDetails.size());
            result.add(dMap);
        }

        return ResponseEntity.ok(result);
    }
}
