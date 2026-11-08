package com.fizzdrop.controller;

import com.fizzdrop.dto.ApiResponse;
import com.fizzdrop.entity.CentralInventory;
import com.fizzdrop.entity.District;
import com.fizzdrop.entity.DistrictInventory;
import com.fizzdrop.entity.Outlet;
import com.fizzdrop.entity.Product;
import com.fizzdrop.entity.ShopInventory;
import com.fizzdrop.entity.SupplierProfile;
import com.fizzdrop.repository.CentralInventoryRepository;
import com.fizzdrop.repository.DistrictInventoryRepository;
import com.fizzdrop.repository.DistrictRepository;
import com.fizzdrop.repository.OutletRepository;
import com.fizzdrop.repository.ProductRepository;
import com.fizzdrop.repository.ShopInventoryRepository;
import com.fizzdrop.repository.SupplierProfileRepository;
import com.fizzdrop.service.RequisitionProcessingService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.*;

@RestController
@RequestMapping("/api/products")
public class ProductController {

    private final ProductRepository productRepository;
    private final ShopInventoryRepository inventoryRepository;
    private final OutletRepository outletRepository;
    private final CentralInventoryRepository centralInventoryRepository;
    private final DistrictInventoryRepository districtInventoryRepository;
    private final SupplierProfileRepository supplierProfileRepository;
    private final DistrictRepository districtRepository;

    public ProductController(ProductRepository productRepository, 
                             ShopInventoryRepository inventoryRepository,
                             OutletRepository outletRepository,
                             CentralInventoryRepository centralInventoryRepository,
                             DistrictInventoryRepository districtInventoryRepository,
                             SupplierProfileRepository supplierProfileRepository,
                             DistrictRepository districtRepository) {
        this.productRepository = productRepository;
        this.inventoryRepository = inventoryRepository;
        this.outletRepository = outletRepository;
        this.centralInventoryRepository = centralInventoryRepository;
        this.districtInventoryRepository = districtInventoryRepository;
        this.supplierProfileRepository = supplierProfileRepository;
        this.districtRepository = districtRepository;
    }

    private void populateProductMetadata(Product p, Long branchId, Long userId, List<Outlet> outlets) {
        populateProductMetadata(p, branchId, userId, null, outlets);
    }

    private void populateProductMetadata(Product p, Long branchId, Long userId, Long supplierId, List<Outlet> outlets) {
        List<Map<String, Object>> outletList = new ArrayList<>();
        int calculatedTotalStock = 0;

        if (outlets != null && !outlets.isEmpty()) {
            for (Outlet o : outlets) {
                var invOpt = inventoryRepository.findByBranchIdAndProductId(o.getOutletId(), p.getProductId());
                int stock;
                if (invOpt.isEmpty()) {
                    stock = 0; // Default to 0 until supplier allocates stock
                    inventoryRepository.save(new ShopInventory(o.getOutletId(), p.getProductId(), stock));
                } else {
                    stock = invOpt.get().getStockQuantity();
                }

                calculatedTotalStock += stock;

                Map<String, Object> outMap = new HashMap<>();
                outMap.put("outlet_id", o.getOutletId());
                outMap.put("outlet_name", o.getOutletName());
                outMap.put("location_address", o.getLocationAddress());
                outMap.put("contact_phone", o.getContactPhone());
                outMap.put("status", o.getStatus());
                outMap.put("stock_quantity", stock);
                outMap.put("in_stock", stock > 0);
                outletList.add(outMap);
            }
        } else {
            calculatedTotalStock = 0;
        }

        p.setTotalStock(calculatedTotalStock);
        var centralOpt = centralInventoryRepository.findByProductId(p.getProductId());
        p.setCentralStock(centralOpt.map(CentralInventory::getAvailableStock).orElse(0));

        if (branchId != null) {
            var inv = inventoryRepository.findByBranchIdAndProductId(branchId, p.getProductId());
            p.setBranchStock(inv.map(ShopInventory::getStockQuantity).orElse(0));
        } else {
            p.setBranchStock(calculatedTotalStock);
        }
        p.setAvailableOutlets(outletList);

        // Supplier Depot Stock Calculation
        SupplierProfile sp = null;
        if (supplierId != null && supplierId > 0) {
            sp = supplierProfileRepository.findById(supplierId).orElse(null);
        }
        if (sp == null && userId != null && userId > 0) {
            sp = supplierProfileRepository.findByUserId(userId).orElse(null);
        }
        if (sp == null) {
            // Robust fallback to primary active supplier (e.g. when superadmin views supplier portal or userId is generic)
            List<SupplierProfile> allSuppliers = supplierProfileRepository.findAll();
            if (!allSuppliers.isEmpty()) {
                sp = allSuppliers.get(0);
            }
        }

        int totalSupplierDepotStock = 0;
        List<Map<String, Object>> depotBreakdown = new ArrayList<>();

        if (sp != null) {
            List<Long> districtIds = new ArrayList<>();
            if (sp.getPrimaryDistrictId() != null) {
                districtIds.add(sp.getPrimaryDistrictId());
            }
            if (sp.getCoveredDistrictIds() != null && !sp.getCoveredDistrictIds().trim().isEmpty()) {
                for (String sid : sp.getCoveredDistrictIds().split(",")) {
                    try {
                        Long dId = Long.parseLong(sid.trim());
                        if (!districtIds.contains(dId)) {
                            districtIds.add(dId);
                        }
                    } catch (NumberFormatException ignored) {}
                }
            }

            for (Long distId : districtIds) {
                var distInv = districtInventoryRepository.findByDistrictIdAndProductId(distId, p.getProductId());
                int st = distInv.map(DistrictInventory::getCurrentStock).orElse(0);
                totalSupplierDepotStock += st;

                String distName = districtRepository.findById(distId).map(District::getName).orElse("District #" + distId);
                Map<String, Object> dm = new HashMap<>();
                dm.put("district_id", distId);
                dm.put("district_name", distName);
                dm.put("stock", st);
                depotBreakdown.add(dm);
            }
        }
        p.setSupplierStock(totalSupplierDepotStock);
        p.setDepotBreakdown(depotBreakdown);
    }

    @GetMapping
    public ResponseEntity<List<Product>> getAllProducts(
            @RequestParam(required = false) Long branchId,
            @RequestParam(required = false) Long userId,
            @RequestParam(required = false) Long supplierId,
            @RequestParam(required = false) String brand,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String search) {

        List<Product> products;
        if (search != null && !search.trim().isEmpty()) {
            products = productRepository.searchProducts(search.trim());
        } else if (brand != null && !brand.equalsIgnoreCase("All Brands") && !brand.trim().isEmpty()) {
            products = productRepository.findByBrandIgnoreCase(brand.trim());
        } else if (category != null && !category.equalsIgnoreCase("All Categories") && !category.trim().isEmpty()) {
            products = productRepository.findByCategoryIgnoreCase(category.trim());
        } else {
            products = productRepository.findAll();
        }

        List<Outlet> outlets = outletRepository.findAll();
        for (Product p : products) {
            populateProductMetadata(p, branchId, userId, supplierId, outlets);
        }

        return ResponseEntity.ok(products);
    }

    @GetMapping("/new-arrivals")
    public ResponseEntity<List<Product>> getNewArrivals(
            @RequestParam(required = false) Long branchId,
            @RequestParam(required = false) Long userId,
            @RequestParam(required = false) Long supplierId) {
        List<Product> list = productRepository.findTopNewArrivals();
        if (list.size() > 8) {
            list = list.subList(0, 8);
        }
        List<Outlet> outlets = outletRepository.findAll();
        for (Product p : list) {
            populateProductMetadata(p, branchId, userId, supplierId, outlets);
        }
        return ResponseEntity.ok(list);
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getProductById(
            @PathVariable Long id,
            @RequestParam(required = false) Long userId,
            @RequestParam(required = false) Long supplierId) {
        Optional<Product> product = productRepository.findById(id);
        if (product.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiResponse.fail("Product with ID " + id + " not found"));
        }
        Product p = product.get();
        List<Outlet> outlets = outletRepository.findAll();
        populateProductMetadata(p, null, userId, supplierId, outlets);
        return ResponseEntity.ok(p);
    }

    @PostMapping
    public ResponseEntity<?> createProduct(@RequestBody Product product) {
        try {
            if (product.getBasePrice() == null && product.getSupplierPrice() != null) {
                product.setBasePrice(product.getSupplierPrice());
            }
            if (product.getSupplierPrice() == null && product.getBasePrice() != null) {
                product.setSupplierPrice(product.getBasePrice());
            }
            if (product.getOutletPrice() == null && product.getSupplierPrice() != null) {
                product.setOutletPrice(product.getSupplierPrice().multiply(BigDecimal.valueOf(1.15)).setScale(2, java.math.RoundingMode.HALF_UP));
            }
            if (product.getRetailPrice() == null && product.getOutletPrice() != null) {
                product.setRetailPrice(product.getOutletPrice().multiply(BigDecimal.valueOf(1.15)).setScale(2, java.math.RoundingMode.HALF_UP));
            }
            Product saved = productRepository.save(product);
            List<Outlet> outlets = outletRepository.findAll();

            // Save custom initial stocks per branch if provided by the supplier
            if (product.getInitialStockByBranch() != null && !product.getInitialStockByBranch().isEmpty()) {
                for (Map.Entry<String, Integer> entry : product.getInitialStockByBranch().entrySet()) {
                    try {
                        Long bId = Long.parseLong(entry.getKey());
                        int qty = entry.getValue() != null ? Math.max(0, entry.getValue()) : 0;
                        inventoryRepository.save(new ShopInventory(bId, saved.getProductId(), qty));
                    } catch (Exception ex) {
                        // ignore malformed keys
                    }
                }
            }

            // Initialize Superadmin central inventory for this product
            int targetFixedStock = (product.getCentralStock() != null && product.getCentralStock() > 0)
                    ? product.getCentralStock()
                    : (product.getTotalStock() != null && product.getTotalStock() > 0)
                    ? product.getTotalStock()
                    : RequisitionProcessingService.getFixedCategoryStock(saved.getCategory());

            centralInventoryRepository.findByProductId(saved.getProductId()).ifPresentOrElse(
                    ci -> {
                        ci.setAvailableStock(targetFixedStock);
                        ci.setCategory(saved.getCategory());
                        centralInventoryRepository.save(ci);
                    },
                    () -> centralInventoryRepository.save(new CentralInventory(
                            saved.getProductId(),
                            saved.getCategory() != null ? saved.getCategory() : "Beverage",
                            targetFixedStock,
                            0
                    ))
            );

            populateProductMetadata(saved, null, null, outlets);
            return ResponseEntity.status(HttpStatus.CREATED).body(saved);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.fail("Failed to create product: " + e.getMessage()));
        }
    }

    
    @PutMapping("/{id}/price")
    public ResponseEntity<?> updateProductPrice(
            @PathVariable Long id,
            @RequestBody Map<String, Object> body) {
        return productRepository.findById(id).map(product -> {
            if (body.containsKey("outlet_price") && body.get("outlet_price") != null) {
                product.setOutletPrice(new BigDecimal(body.get("outlet_price").toString()));
            }
            if (body.containsKey("supplier_price") && body.get("supplier_price") != null) {
                product.setSupplierPrice(new BigDecimal(body.get("supplier_price").toString()));
            }
            if (body.containsKey("base_price") && body.get("base_price") != null) {
                product.setBasePrice(new BigDecimal(body.get("base_price").toString()));
            }
            Product saved = productRepository.save(product);
            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Product pricing updated successfully by supplier!",
                "product", saved
            ));
        }).orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("success", false, "message", "Product not found")));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateProduct(@PathVariable Long id, @RequestBody Product productUpdates) {
        return productRepository.findById(id).map(existing -> {
            if (productUpdates.getBrand() != null) existing.setBrand(productUpdates.getBrand());
            if (productUpdates.getFlavorVariant() != null) existing.setFlavorVariant(productUpdates.getFlavorVariant());
            if (productUpdates.getPackaging() != null) existing.setPackaging(productUpdates.getPackaging());
            if (productUpdates.getSizeVolume() != null) existing.setSizeVolume(productUpdates.getSizeVolume());
            if (productUpdates.getSku() != null) existing.setSku(productUpdates.getSku());
            if (productUpdates.getBasePrice() != null) existing.setBasePrice(productUpdates.getBasePrice());
            if (productUpdates.getSupplierPrice() != null) existing.setSupplierPrice(productUpdates.getSupplierPrice());
            if (productUpdates.getOutletPrice() != null) existing.setOutletPrice(productUpdates.getOutletPrice());
            if (productUpdates.getRetailPrice() != null) existing.setRetailPrice(productUpdates.getRetailPrice());
            if (productUpdates.getCategory() != null) existing.setCategory(productUpdates.getCategory());
            if (productUpdates.getImageUrl() != null) existing.setImageUrl(productUpdates.getImageUrl());
            if (productUpdates.getExpiryDate() != null) existing.setExpiryDate(productUpdates.getExpiryDate());
            
            Product updated = productRepository.save(existing);

            if (productUpdates.getCategory() != null) {
                centralInventoryRepository.findByProductId(existing.getProductId()).ifPresent(ci -> {
                    ci.setCategory(existing.getCategory());
                    centralInventoryRepository.save(ci);
                });
            }

            if (productUpdates.getCentralStock() != null) {
                centralInventoryRepository.findByProductId(existing.getProductId()).ifPresentOrElse(
                    ci -> {
                        ci.setAvailableStock(productUpdates.getCentralStock());
                        ci.setUpdatedAt(java.time.LocalDateTime.now());
                        centralInventoryRepository.save(ci);
                    },
                    () -> {
                        centralInventoryRepository.save(new CentralInventory(
                            existing.getProductId(),
                            existing.getCategory() != null ? existing.getCategory() : "Beverage",
                            productUpdates.getCentralStock(),
                            0
                        ));
                    }
                );
            }

            return ResponseEntity.ok(updated);
        }).orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(null));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteProduct(@PathVariable Long id) {
        if (!productRepository.existsById(id)) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiResponse.fail("Product with ID " + id + " not found"));
        }
        centralInventoryRepository.findByProductId(id).ifPresent(centralInventoryRepository::delete);
        try {
            inventoryRepository.deleteAll(inventoryRepository.findAll().stream().filter(i -> id.equals(i.getProductId())).toList());
        } catch (Exception ignored) {}
        productRepository.deleteById(id);
        return ResponseEntity.ok(ApiResponse.ok("Product deleted successfully", id));
    }
}
