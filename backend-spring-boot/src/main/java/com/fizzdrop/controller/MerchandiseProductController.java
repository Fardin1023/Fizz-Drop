package com.fizzdrop.controller;

import com.fizzdrop.dto.ApiResponse;
import com.fizzdrop.entity.MerchandiseProduct;
import com.fizzdrop.repository.MerchandiseProductRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/merchandise")
@CrossOrigin(origins = "*")
public class MerchandiseProductController {

    private final MerchandiseProductRepository merchandiseRepo;

    @Autowired
    public MerchandiseProductController(MerchandiseProductRepository merchandiseRepo) {
        this.merchandiseRepo = merchandiseRepo;
    }

    @GetMapping
    public ResponseEntity<List<MerchandiseProduct>> getAllMerchandise(
            @RequestParam(required = false) String brand,
            @RequestParam(required = false) String itemType,
            @RequestParam(required = false) String search) {

        if (search != null && !search.trim().isEmpty()) {
            return ResponseEntity.ok(merchandiseRepo.searchMerchandise(search.trim()));
        }
        if (brand != null && !brand.equalsIgnoreCase("All Brands") && !brand.trim().isEmpty()) {
            return ResponseEntity.ok(merchandiseRepo.findByBrandIgnoreCase(brand.trim()));
        }
        if (itemType != null && !itemType.equalsIgnoreCase("All Items") && !itemType.trim().isEmpty()) {
            return ResponseEntity.ok(merchandiseRepo.findByItemTypeIgnoreCase(itemType.trim()));
        }
        return ResponseEntity.ok(merchandiseRepo.findAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getMerchandiseById(@PathVariable Long id) {
        Optional<MerchandiseProduct> item = merchandiseRepo.findById(id);
        if (item.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiResponse.fail("Merchandise item with ID " + id + " not found"));
        }
        return ResponseEntity.ok(item.get());
    }

    @PostMapping
    public ResponseEntity<?> createMerchandise(@RequestBody MerchandiseProduct product) {
        try {
            if (product.getSku() != null && !product.getSku().trim().isEmpty()) {
                if (merchandiseRepo.findBySku(product.getSku().trim()).isPresent()) {
                    return ResponseEntity.status(HttpStatus.CONFLICT)
                            .body(ApiResponse.fail("SKU '" + product.getSku() + "' already exists in merchandise catalog"));
                }
            }
            MerchandiseProduct saved = merchandiseRepo.save(product);
            return ResponseEntity.status(HttpStatus.CREATED).body(saved);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.fail("Failed to create merchandise product: " + e.getMessage()));
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateMerchandise(@PathVariable Long id, @RequestBody MerchandiseProduct updates) {
        Optional<MerchandiseProduct> opt = merchandiseRepo.findById(id);
        if (opt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiResponse.fail("Merchandise product with ID " + id + " not found"));
        }
        MerchandiseProduct existing = opt.get();
        if (updates.getBrand() != null) existing.setBrand(updates.getBrand());
        if (updates.getItemType() != null) existing.setItemType(updates.getItemType());
        if (updates.getName() != null) existing.setName(updates.getName());
        if (updates.getSku() != null) existing.setSku(updates.getSku());
        if (updates.getSizeSpec() != null) existing.setSizeSpec(updates.getSizeSpec());
        if (updates.getPackaging() != null) existing.setPackaging(updates.getPackaging());
        if (updates.getPrice() != null) existing.setPrice(updates.getPrice());
        if (updates.getStockQuantity() != null) existing.setStockQuantity(updates.getStockQuantity());
        if (updates.getDescription() != null) existing.setDescription(updates.getDescription());
        if (updates.getImageUrl() != null) existing.setImageUrl(updates.getImageUrl());
        if (updates.getWarrantyPeriod() != null) existing.setWarrantyPeriod(updates.getWarrantyPeriod());
        if (updates.getStatus() != null) existing.setStatus(updates.getStatus());

        MerchandiseProduct saved = merchandiseRepo.save(existing);
        return ResponseEntity.ok(saved);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteMerchandise(@PathVariable Long id) {
        if (!merchandiseRepo.existsById(id)) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiResponse.fail("Merchandise product with ID " + id + " not found"));
        }
        merchandiseRepo.deleteById(id);
        return ResponseEntity.ok(ApiResponse.ok("Merchandise product deleted successfully", id));
    }
}
