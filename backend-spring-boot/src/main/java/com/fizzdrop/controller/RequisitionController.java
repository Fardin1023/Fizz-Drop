package com.fizzdrop.controller;

import com.fizzdrop.dto.AdminReviewDTO;
import com.fizzdrop.dto.ApiResponse;
import com.fizzdrop.dto.CreateRequisitionDTO;
import com.fizzdrop.dto.SupplierProfileDTO;
import com.fizzdrop.entity.CentralInventory;
import com.fizzdrop.entity.District;
import com.fizzdrop.entity.StockRequisition;
import com.fizzdrop.entity.SupplierProfile;
import com.fizzdrop.service.RequisitionProcessingService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1")
public class RequisitionController {

    private final RequisitionProcessingService requisitionService;

    public RequisitionController(RequisitionProcessingService requisitionService) {
        this.requisitionService = requisitionService;
    }

    private Long resolveUserId(String authHeader, Long explicitUserId) {
        if (explicitUserId != null && explicitUserId > 0) {
            return explicitUserId;
        }
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7);
            if (token.contains("superadmin")) return 99L;
            if (token.contains("supplier")) return 4L;
            String[] parts = token.split("-");
            if (parts.length >= 2) {
                try {
                    return Long.parseLong(parts[1]);
                } catch (NumberFormatException ignored) {}
            }
        }
        return 4L; // Central supplier fallback
    }

    // 1. Districts API
    @GetMapping("/districts")
    public ResponseEntity<List<District>> getDistricts() {
        return ResponseEntity.ok(requisitionService.getAllDistricts());
    }

    // 2. Supplier Profile API
    @GetMapping("/supplier/profile")
    public ResponseEntity<SupplierProfile> getSupplierProfile(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestParam(value = "userId", required = false) Long userId) {
        Long resolvedId = resolveUserId(authHeader, userId);
        return ResponseEntity.ok(requisitionService.getSupplierProfile(resolvedId));
    }

    @PutMapping("/supplier/profile/region")
    public ResponseEntity<?> updateSupplierRegion(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestParam(value = "userId", required = false) Long userId,
            @RequestBody SupplierProfileDTO dto) {
        try {
            Long resolvedId = resolveUserId(authHeader, userId);
            SupplierProfile updated = requisitionService.updateSupplierRegion(resolvedId, dto);
            return ResponseEntity.ok(updated);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ApiResponse.fail(e.getMessage()));
        }
    }

    // 3. Supplier Requisitions API
    @PostMapping("/supplier/requisitions")
    public ResponseEntity<?> createRequisition(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestParam(value = "userId", required = false) Long userId,
            @RequestBody CreateRequisitionDTO dto) {
        try {
            Long resolvedId = resolveUserId(authHeader, userId);
            StockRequisition req = requisitionService.createRequisition(resolvedId, dto);
            return ResponseEntity.status(HttpStatus.CREATED).body(req);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ApiResponse.fail(e.getMessage()));
        }
    }

    @GetMapping("/supplier/requisitions")
    public ResponseEntity<List<StockRequisition>> getSupplierRequisitions(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestParam(value = "userId", required = false) Long userId) {
        Long resolvedId = resolveUserId(authHeader, userId);
        return ResponseEntity.ok(requisitionService.getSupplierRequisitions(resolvedId));
    }

    // 4. Superadmin Requisitions Hub API
    @GetMapping("/admin/requisitions")
    public ResponseEntity<List<StockRequisition>> getAdminRequisitions(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) Long districtId) {
        return ResponseEntity.ok(requisitionService.getAllRequisitionsForAdmin(status, districtId));
    }

    @GetMapping("/admin/requisitions/{id}/stock-overview")
    public ResponseEntity<?> getRequisitionStockOverview(@PathVariable Long id) {
        try {
            StockRequisition req = requisitionService.getRequisitionWithRegionalStock(id);
            return ResponseEntity.ok(req);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ApiResponse.fail(e.getMessage()));
        }
    }

    @PostMapping("/admin/requisitions/{id}/action")
    public ResponseEntity<?> processRequisitionAction(
            @PathVariable Long id,
            @RequestBody AdminReviewDTO reviewDto) {
        try {
            StockRequisition updated = requisitionService.processRequisitionAction(id, reviewDto);
            return ResponseEntity.ok(updated);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ApiResponse.fail(e.getMessage()));
        }
    }

    // 5. Superadmin Central Inventory Pool API
    @GetMapping("/admin/central-inventory")
    public ResponseEntity<List<CentralInventory>> getCentralInventory() {
        return ResponseEntity.ok(requisitionService.getCentralInventory());
    }
}
