package com.fizzdrop.controller;

import com.fizzdrop.entity.AppNotification;
import com.fizzdrop.entity.CentralInventory;
import com.fizzdrop.entity.District;
import com.fizzdrop.entity.DistrictProductPricing;
import com.fizzdrop.entity.Product;
import com.fizzdrop.repository.*;
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
                // Initialize default prices:
                // Superadmin -> Supplier buy price: product.supplierPrice or basePrice
                BigDecimal supPrice = prod.getSupplierPrice() != null
                        ? prod.getSupplierPrice()
                        : (prod.getBasePrice() != null ? prod.getBasePrice() : new BigDecimal("30.00"));

                // Supplier -> Outlet price: product.outletPrice or 15% wholesale markup
                BigDecimal outPrice = prod.getOutletPrice() != null
                        ? prod.getOutletPrice()
                        : supPrice.multiply(new BigDecimal("1.15")).setScale(2, RoundingMode.HALF_UP);

                // Outlet -> Customer price: product.retailPrice or 15% retail markup
                BigDecimal retPrice = prod.getRetailPrice() != null
                        ? prod.getRetailPrice()
                        : outPrice.multiply(new BigDecimal("1.15")).setScale(2, RoundingMode.HALF_UP);

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

        // Keep master product table fallback rates in sync when central HQ district #1 is updated
        if (Long.valueOf(1L).equals(districtId)) {
            for (DistrictProductPricing p : updatedList) {
                productRepository.findById(p.getProductId()).ifPresent(prod -> {
                    prod.setSupplierPrice(p.getSupplierPrice());
                    prod.setOutletPrice(p.getOutletPrice());
                    prod.setRetailPrice(p.getRetailPrice());
                    prod.setBasePrice(p.getSupplierPrice());
                    productRepository.save(prod);
                });
            }
        }

        ProductController.invalidateCatalogCache();

        long supplierCount = supplierProfileRepository.findAll().stream()
                .filter(s -> (s.getPrimaryDistrictId() != null && s.getPrimaryDistrictId().equals(districtId)) ||
                             (s.getCoveredDistrictIds() != null && Arrays.asList(s.getCoveredDistrictIds().split(",")).contains(String.valueOf(districtId))))
                .count();

        long outletCount = outletRepository.findAll().stream()
                .filter(o -> o.getDistrictId() != null && o.getDistrictId().equals(districtId))
                .count();

        // Send real-time notifications to suppliers and outlets of this district
        try {
            AppNotification supNotif = new AppNotification();
            supNotif.setRecipientRole("SUPPLIER");
            supNotif.setTitle("District Pricing Allotted: " + district.getName());
            supNotif.setMessage("Superadmin updated 3-tier product pricing for " + district.getName() + " district (" + updatedList.size() + " SKUs). Buy rate and wholesale supply prices are now applied.");
            supNotif.setType("INFO");
            supNotif.setReferenceId(districtId);
            notificationRepository.save(supNotif);

            AppNotification outNotif = new AppNotification();
            outNotif.setRecipientRole("OUTLET");
            outNotif.setTitle("District Pricing Allotted: " + district.getName());
            outNotif.setMessage("Superadmin updated wholesale purchase and consumer retail MRP rates for " + district.getName() + " district (" + updatedList.size() + " SKUs).");
            outNotif.setType("INFO");
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

        if (targetDistrictIds.contains(1L)) {
            for (DistrictProductPricing p : toSave) {
                if (Long.valueOf(1L).equals(p.getDistrictId())) {
                    productRepository.findById(p.getProductId()).ifPresent(prod -> {
                        prod.setSupplierPrice(p.getSupplierPrice());
                        prod.setOutletPrice(p.getOutletPrice());
                        prod.setRetailPrice(p.getRetailPrice());
                        prod.setBasePrice(p.getSupplierPrice());
                        productRepository.save(prod);
                    });
                }
            }
        }

        ProductController.invalidateCatalogCache();

        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Successfully copied pricing from district #" + fromDistrictId + " to " + targetDistrictIds.size() + " districts.",
                "target_districts_count", targetDistrictIds.size()
        ));
    }
}
