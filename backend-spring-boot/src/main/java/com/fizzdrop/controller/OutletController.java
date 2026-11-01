package com.fizzdrop.controller;

import com.fizzdrop.dto.ApiResponse;
import com.fizzdrop.entity.District;
import com.fizzdrop.entity.Outlet;
import com.fizzdrop.entity.SupplierProfile;
import com.fizzdrop.repository.DistrictRepository;
import com.fizzdrop.repository.OutletRepository;
import com.fizzdrop.repository.SupplierProfileRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/outlets")
public class OutletController {

    private final OutletRepository outletRepository;
    private final DistrictRepository districtRepository;
    private final SupplierProfileRepository supplierProfileRepository;

    public OutletController(OutletRepository outletRepository,
                            DistrictRepository districtRepository,
                            SupplierProfileRepository supplierProfileRepository) {
        this.outletRepository = outletRepository;
        this.districtRepository = districtRepository;
        this.supplierProfileRepository = supplierProfileRepository;
    }

    private void enrichOutlet(Outlet o, Map<Long, District> districtMap) {
        if (o.getDistrictId() != null && districtMap.containsKey(o.getDistrictId())) {
            District d = districtMap.get(o.getDistrictId());
            o.setDistrictName(d.getName());
            o.setDivisionName(d.getDivision());
            return;
        }

        // Auto-detect district from location address if not explicitly assigned
        String addr = (o.getLocationAddress() != null) ? o.getLocationAddress().toLowerCase() : "";
        for (District d : districtMap.values()) {
            if (addr.contains(d.getName().toLowerCase())) {
                o.setDistrictId(d.getId());
                o.setDistrictName(d.getName());
                o.setDivisionName(d.getDivision());
                return;
            }
        }
        
        // Fallback default: Dhaka (ID 1)
        if (o.getDistrictId() == null && !districtMap.isEmpty()) {
            districtMap.values().stream()
                    .filter(d -> "Dhaka".equalsIgnoreCase(d.getName()))
                    .findFirst()
                    .ifPresent(dhaka -> {
                        o.setDistrictId(dhaka.getId());
                        o.setDistrictName(dhaka.getName());
                        o.setDivisionName(dhaka.getDivision());
                    });
        }
    }

    @GetMapping
    public ResponseEntity<List<Outlet>> getAllOutlets(@RequestParam(required = false) Long userId,
                                                      @RequestParam(required = false) Long districtId) {
        List<Outlet> all = outletRepository.findAll();
        List<District> districts = districtRepository.findAll();
        Map<Long, District> districtMap = new HashMap<>();
        for (District d : districts) {
            districtMap.put(d.getId(), d);
        }

        for (Outlet o : all) {
            enrichOutlet(o, districtMap);
        }

        // If districtId filter is given
        if (districtId != null && districtId > 0) {
            all = all.stream().filter(o -> Objects.equals(o.getDistrictId(), districtId)).toList();
            return ResponseEntity.ok(all);
        }

        // If supplier userId is given, filter to only outlets in cities/districts covered by that supplier
        if (userId != null && userId > 0) {
            Optional<SupplierProfile> profileOpt = supplierProfileRepository.findByUserId(userId);
            if (profileOpt.isPresent()) {
                SupplierProfile sp = profileOpt.get();
                Set<Long> allowedDistrictIds = new HashSet<>();
                if (sp.getCoveredDistrictIds() != null && !sp.getCoveredDistrictIds().trim().isEmpty()) {
                    for (String sid : sp.getCoveredDistrictIds().split(",")) {
                        try {
                            allowedDistrictIds.add(Long.parseLong(sid.trim()));
                        } catch (NumberFormatException ignored) {}
                    }
                }
                if (sp.getPrimaryDistrictId() != null) {
                    allowedDistrictIds.add(sp.getPrimaryDistrictId());
                }

                if (!allowedDistrictIds.isEmpty()) {
                    all = all.stream()
                            .filter(o -> o.getDistrictId() != null && allowedDistrictIds.contains(o.getDistrictId()))
                            .toList();
                }
            }
        }

        return ResponseEntity.ok(all);
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getOutletById(@PathVariable Long id) {
        List<District> districts = districtRepository.findAll();
        Map<Long, District> districtMap = new HashMap<>();
        for (District d : districts) districtMap.put(d.getId(), d);

        return outletRepository.findById(id)
                .map(o -> {
                    enrichOutlet(o, districtMap);
                    return ResponseEntity.ok(o);
                })
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

            // Auto-detect district if omitted
            if (outlet.getDistrictId() == null) {
                String addr = outlet.getLocationAddress().toLowerCase();
                for (District d : districtRepository.findAll()) {
                    if (addr.contains(d.getName().toLowerCase())) {
                        outlet.setDistrictId(d.getId());
                        break;
                    }
                }
            }

            Outlet saved = outletRepository.save(outlet);
            if (saved.getDistrictId() != null) {
                districtRepository.findById(saved.getDistrictId()).ifPresent(d -> {
                    saved.setDistrictName(d.getName());
                    saved.setDivisionName(d.getDivision());
                });
            }
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
            if (updates.getDistrictId() != null) existing.setDistrictId(updates.getDistrictId());
            Outlet saved = outletRepository.save(existing);
            if (saved.getDistrictId() != null) {
                districtRepository.findById(saved.getDistrictId()).ifPresent(d -> {
                    saved.setDistrictName(d.getName());
                    saved.setDivisionName(d.getDivision());
                });
            }
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
