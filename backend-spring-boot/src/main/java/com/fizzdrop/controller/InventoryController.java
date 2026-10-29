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
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.*;

@RestController
@RequestMapping("/api/inventory")
public class InventoryController {

    private final ShopInventoryRepository inventoryRepository;
    private final ProductRepository productRepository;
    private final OutletRepository outletRepository;
    private final DistrictInventoryRepository districtInventoryRepository;
    private final SupplierProfileRepository supplierProfileRepository;

    public InventoryController(ShopInventoryRepository inventoryRepository,
                               ProductRepository productRepository,
                               OutletRepository outletRepository,
                               DistrictInventoryRepository districtInventoryRepository,
                               SupplierProfileRepository supplierProfileRepository) {
        this.inventoryRepository = inventoryRepository;
        this.productRepository = productRepository;
        this.outletRepository = outletRepository;
        this.districtInventoryRepository = districtInventoryRepository;
        this.supplierProfileRepository = supplierProfileRepository;
    }

    /**
     * Supplier supplies a particular amount of products to a particular outlet in the database
     */
    @PostMapping("/supply")
    public ResponseEntity<?> supplyStockToOutlet(@RequestBody SupplyRequest req) {
        if (req.getProductId() == null) {
            return ResponseEntity.badRequest().body(ApiResponse.fail("Product ID is required"));
        }
        if (req.getOutletId() == null) {
            return ResponseEntity.badRequest().body(ApiResponse.fail("Outlet ID is required"));
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

        // Verify outlet exists in database
        Optional<Outlet> outletOpt = outletRepository.findById(req.getOutletId());
        if (outletOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiResponse.fail("Outlet with ID " + req.getOutletId() + " not found in database"));
        }
        Outlet outlet = outletOpt.get();

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

        // Deduct supplied stock from supplier's district/depot inventory if tracked
        Long resolvedUserId = (req.getUserId() != null && req.getUserId() > 0) ? req.getUserId() : 4L;
        supplierProfileRepository.findByUserId(resolvedUserId).ifPresent(sp -> {
            Long targetDistId = (req.getDistrictId() != null && req.getDistrictId() > 0) ? req.getDistrictId() : sp.getPrimaryDistrictId();
            if (targetDistId != null) {
                districtInventoryRepository.findByDistrictIdAndProductId(targetDistId, product.getProductId()).ifPresent(di -> {
                    int remaining = Math.max(0, di.getCurrentStock() - req.getQuantity());
                    di.setCurrentStock(remaining);
                    districtInventoryRepository.save(di);
                });
            }
        });

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

        return ResponseEntity.ok(result);
    }

    /**
     * Stock distribution view across all products and database outlets for Superadmin and Supplier
     */
    @GetMapping("/distribution")
    public ResponseEntity<List<Map<String, Object>>> getStockDistribution() {
        List<Product> products = productRepository.findAll();
        List<Outlet> outlets = outletRepository.findAll();
        List<Map<String, Object>> response = new ArrayList<>();

        for (Product p : products) {
            Map<String, Object> prodMap = new HashMap<>();
            prodMap.put("product_id", p.getProductId());
            prodMap.put("brand", p.getBrand());
            prodMap.put("flavor_variant", p.getFlavorVariant());
            prodMap.put("sku", p.getSku());
            prodMap.put("base_price", p.getBasePrice());
            prodMap.put("image_url", p.getImageUrl());
            prodMap.put("expiry_date", p.getExpiryDate() != null ? p.getExpiryDate().toString() : null);

            List<Map<String, Object>> outletAllocations = new ArrayList<>();
            int totalStock = 0;

            for (Outlet o : outlets) {
                var invOpt = inventoryRepository.findByBranchIdAndProductId(o.getOutletId(), p.getProductId());
                int stock = invOpt.map(ShopInventory::getStockQuantity).orElse(0);
                totalStock += stock;

                Map<String, Object> outMap = new HashMap<>();
                outMap.put("outlet_id", o.getOutletId());
                outMap.put("outlet_name", o.getOutletName());
                outMap.put("location_address", o.getLocationAddress());
                outMap.put("contact_phone", o.getContactPhone());
                outMap.put("stock_quantity", stock);
                outMap.put("status", o.getStatus());
                outMap.put("last_updated", invOpt.map(i -> i.getUpdatedDate().toString()).orElse("N/A"));
                outletAllocations.add(outMap);
            }

            prodMap.put("total_stock", totalStock);
            prodMap.put("outlet_allocations", outletAllocations);
            response.add(prodMap);
        }

        return ResponseEntity.ok(response);
    }
}
