package com.fizzdrop.controller;

import com.fizzdrop.repository.OutletRepository;
import com.fizzdrop.repository.ProductRepository;
import com.fizzdrop.repository.ShopInventoryRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private final ProductRepository productRepository;
    private final OutletRepository outletRepository;
    private final ShopInventoryRepository inventoryRepository;

    public AdminController(ProductRepository productRepository,
                           OutletRepository outletRepository,
                           ShopInventoryRepository inventoryRepository) {
        this.productRepository = productRepository;
        this.outletRepository = outletRepository;
        this.inventoryRepository = inventoryRepository;
    }

    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> getAdminStats() {
        Map<String, Object> stats = new HashMap<>();
        long totalProducts = productRepository.count();
        long totalBranches = outletRepository.count();

        // Calculate low stock items (< 20)
        long lowStockCount = productRepository.findAll().stream()
                .filter(p -> {
                    Integer stock = inventoryRepository.getTotalStockByProductId(p.getProductId());
                    return stock == null || stock < 20;
                })
                .count();

        stats.put("totalProducts", totalProducts);
        stats.put("totalBranches", totalBranches);
        stats.put("lowStockCount", lowStockCount);
        stats.put("pendingRestocks", 0);

        Map<String, Object> dbStatus = new HashMap<>();
        dbStatus.put("connected", true);
        dbStatus.put("engine", "Relational Database Engine");
        stats.put("dbStatus", dbStatus);

        return ResponseEntity.ok(stats);
    }
}
