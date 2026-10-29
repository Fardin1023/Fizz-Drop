package com.fizzdrop.controller;

import com.fizzdrop.dto.ApiResponse;
import com.fizzdrop.entity.Outlet;
import com.fizzdrop.repository.OutletRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/outlets")
public class OutletController {

    private final OutletRepository outletRepository;

    public OutletController(OutletRepository outletRepository) {
        this.outletRepository = outletRepository;
    }

    @GetMapping
    public ResponseEntity<List<Outlet>> getAllOutlets() {
        return ResponseEntity.ok(outletRepository.findAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getOutletById(@PathVariable Long id) {
        return outletRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND).build());
    }

    @PostMapping
    public ResponseEntity<?> createOutlet(@RequestBody Outlet outlet) {
        try {
            if (outlet.getOutletName() == null || outlet.getOutletName().trim().isEmpty()) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(ApiResponse.fail("Outlet name is required"));
            }
            if (outlet.getLocationAddress() == null || outlet.getLocationAddress().trim().isEmpty()) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(ApiResponse.fail("Location address is required"));
            }
            if (outlet.getStatus() == null || outlet.getStatus().trim().isEmpty()) {
                outlet.setStatus("Active");
            }
            Outlet saved = outletRepository.save(outlet);
            return ResponseEntity.status(HttpStatus.CREATED).body(saved);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.fail("Failed to create outlet: " + e.getMessage()));
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateOutlet(@PathVariable Long id, @RequestBody Outlet updates) {
        return outletRepository.findById(id).map(existing -> {
            if (updates.getOutletName() != null) existing.setOutletName(updates.getOutletName());
            if (updates.getLocationAddress() != null) existing.setLocationAddress(updates.getLocationAddress());
            if (updates.getContactPhone() != null) existing.setContactPhone(updates.getContactPhone());
            if (updates.getStatus() != null) existing.setStatus(updates.getStatus());
            Outlet saved = outletRepository.save(existing);
            return ResponseEntity.ok(saved);
        }).orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND).build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteOutlet(@PathVariable Long id) {
        if (!outletRepository.existsById(id)) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiResponse.fail("Outlet with ID " + id + " not found"));
        }
        outletRepository.deleteById(id);
        return ResponseEntity.ok(ApiResponse.ok("Outlet deleted successfully", id));
    }
}
