package com.fizzdrop.controller;

import com.fizzdrop.dto.ApiResponse;
import com.fizzdrop.entity.Outlet;
import com.fizzdrop.entity.Product;
import com.fizzdrop.entity.ShopInventory;
import com.fizzdrop.repository.OutletRepository;
import com.fizzdrop.repository.ProductRepository;
import com.fizzdrop.repository.ShopInventoryRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/products")
public class ProductController {

    private final ProductRepository productRepository;
    private final ShopInventoryRepository inventoryRepository;
    private final OutletRepository outletRepository;

    public ProductController(ProductRepository productRepository, 
                             ShopInventoryRepository inventoryRepository,
                             OutletRepository outletRepository) {
        this.productRepository = productRepository;
        this.inventoryRepository = inventoryRepository;
        this.outletRepository = outletRepository;
    }

    private void populateProductMetadata(Product p, Long branchId, List<Outlet> outlets) {
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
        if (branchId != null) {
            var inv = inventoryRepository.findByBranchIdAndProductId(branchId, p.getProductId());
            p.setBranchStock(inv.map(ShopInventory::getStockQuantity).orElse(0));
        } else {
            p.setBranchStock(calculatedTotalStock);
        }
        p.setAvailableOutlets(outletList);
    }

    @GetMapping
    public ResponseEntity<List<Product>> getAllProducts(
            @RequestParam(required = false) Long branchId,
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
            populateProductMetadata(p, branchId, outlets);
        }

        return ResponseEntity.ok(products);
    }

    @GetMapping("/new-arrivals")
    public ResponseEntity<List<Product>> getNewArrivals(@RequestParam(required = false) Long branchId) {
        List<Product> list = productRepository.findTopNewArrivals();
        if (list.size() > 8) {
            list = list.subList(0, 8);
        }
        List<Outlet> outlets = outletRepository.findAll();
        for (Product p : list) {
            populateProductMetadata(p, branchId, outlets);
        }
        return ResponseEntity.ok(list);
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getProductById(@PathVariable Long id) {
        Optional<Product> product = productRepository.findById(id);
        if (product.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiResponse.fail("Product with ID " + id + " not found"));
        }
        Product p = product.get();
        List<Outlet> outlets = outletRepository.findAll();
        populateProductMetadata(p, null, outlets);
        return ResponseEntity.ok(p);
    }

    @PostMapping
    public ResponseEntity<?> createProduct(@RequestBody Product product) {
        try {
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

            populateProductMetadata(saved, null, outlets);
            return ResponseEntity.status(HttpStatus.CREATED).body(saved);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.fail("Failed to create product: " + e.getMessage()));
        }
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
            if (productUpdates.getCategory() != null) existing.setCategory(productUpdates.getCategory());
            if (productUpdates.getImageUrl() != null) existing.setImageUrl(productUpdates.getImageUrl());
            if (productUpdates.getExpiryDate() != null) existing.setExpiryDate(productUpdates.getExpiryDate());
            
            Product updated = productRepository.save(existing);
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
        productRepository.deleteById(id);
        return ResponseEntity.ok(ApiResponse.ok("Product deleted successfully", id));
    }
}
