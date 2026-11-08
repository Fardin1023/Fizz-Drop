package com.fizzdrop.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fizzdrop.dto.ApiResponse;
import com.fizzdrop.entity.Outlet;
import com.fizzdrop.entity.SalesOfficer;
import com.fizzdrop.entity.SupplierProfile;
import com.fizzdrop.repository.DistrictRepository;
import com.fizzdrop.repository.OutletRepository;
import com.fizzdrop.repository.SalesOfficerRepository;
import com.fizzdrop.repository.SupplierProfileRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.*;

@RestController
@CrossOrigin(origins = "*")
public class SalesOfficerController {

    private final SalesOfficerRepository salesOfficerRepository;
    private final SupplierProfileRepository supplierProfileRepository;
    private final OutletRepository outletRepository;
    private final DistrictRepository districtRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public SalesOfficerController(SalesOfficerRepository salesOfficerRepository,
                                  SupplierProfileRepository supplierProfileRepository,
                                  OutletRepository outletRepository,
                                  DistrictRepository districtRepository) {
        this.salesOfficerRepository = salesOfficerRepository;
        this.supplierProfileRepository = supplierProfileRepository;
        this.outletRepository = outletRepository;
        this.districtRepository = districtRepository;
    }

    /**
     * Get all sales officers, optionally filtered by supplierId
     */
    @GetMapping("/api/v1/sales-officers")
    public ResponseEntity<List<SalesOfficer>> getAllSalesOfficers(
            @RequestParam(required = false) Long supplierId,
            @RequestParam(required = false) String status) {

        List<SalesOfficer> list;
        if (supplierId != null && status != null) {
            list = salesOfficerRepository.findBySupplierIdAndStatus(supplierId, status);
        } else if (supplierId != null) {
            list = salesOfficerRepository.findBySupplierId(supplierId);
        } else if (status != null) {
            list = salesOfficerRepository.findByStatus(status);
        } else {
            list = salesOfficerRepository.findAll();
        }

        enrichSalesOfficers(list);
        return ResponseEntity.ok(list);
    }

    /**
     * Get single sales officer by ID
     */
    @GetMapping("/api/v1/sales-officers/{id}")
    public ResponseEntity<?> getSalesOfficerById(@PathVariable Long id) {
        Optional<SalesOfficer> opt = salesOfficerRepository.findById(id);
        if (opt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiResponse.fail("Sales Officer not found with ID: " + id));
        }
        SalesOfficer so = opt.get();
        enrichSalesOfficers(Collections.singletonList(so));
        return ResponseEntity.ok(so);
    }

    /**
     * Supplier portal endpoint: Get sales officers assigned to calling supplier
     */
    @GetMapping("/api/v1/supplier/sales-officers")
    public ResponseEntity<?> getSupplierSalesOfficers(
            @RequestParam(required = false) Long userId,
            @RequestParam(required = false) Long supplierId) {

        SupplierProfile profile = resolveSupplierProfile(userId, supplierId);
        if (profile == null) {
            return ResponseEntity.ok(Collections.emptyList());
        }

        List<SalesOfficer> list = salesOfficerRepository.findBySupplierId(profile.getId());
        enrichSalesOfficers(list);

        Map<String, Object> response = new HashMap<>();
        response.put("supplier_id", profile.getId());
        response.put("business_name", profile.getBusinessName());
        response.put("sales_officers", list);
        response.put("total_officers", list.size());
        response.put("allocated_areas", profile.getAllocatedAreas());

        return ResponseEntity.ok(response);
    }

    /**
     * Superadmin assigns a new Sales Officer to a Supplier
     */
    @PostMapping("/api/v1/sales-officers")
    public ResponseEntity<?> createSalesOfficer(@RequestBody Map<String, Object> payload) {
        try {
            String name = (String) payload.get("name");
            String phone = (String) payload.get("phone");
            String email = (String) payload.get("email");
            String city = (String) payload.get("city");
            String assignedArea = (String) payload.get("assigned_area");
            if (assignedArea == null) assignedArea = (String) payload.get("assignedArea");
            if (assignedArea == null) assignedArea = (String) payload.get("area");

            Object supIdObj = payload.get("supplier_id");
            if (supIdObj == null) supIdObj = payload.get("supplierId");
            if (supIdObj == null) {
                return ResponseEntity.badRequest().body(ApiResponse.fail("Supplier ID is required"));
            }
            Long supplierId = Long.parseLong(supIdObj.toString());

            if (name == null || name.trim().isEmpty()) {
                return ResponseEntity.badRequest().body(ApiResponse.fail("Sales Officer name is required"));
            }
            if (phone == null || phone.trim().isEmpty()) {
                return ResponseEntity.badRequest().body(ApiResponse.fail("Sales Officer phone number is required"));
            }
            if (assignedArea == null || assignedArea.trim().isEmpty()) {
                return ResponseEntity.badRequest().body(ApiResponse.fail("Assigned Area is required"));
            }

            SupplierProfile supplier = supplierProfileRepository.findById(supplierId).orElse(null);
            if (supplier == null) {
                return ResponseEntity.badRequest().body(ApiResponse.fail("Supplier not found with ID: " + supplierId));
            }

            // Verify assignedArea is within the supplier's allocated areas
            if (city == null || city.trim().isEmpty()) {
                city = supplier.getDivisionName() != null ? supplier.getDivisionName() : "Dhaka";
            }

            validateAreaAllotment(supplier, city, assignedArea);

            // Generate unique officer code
            String codePrefix = "SO-" + (city.length() >= 3 ? city.substring(0, 3).toUpperCase() : "DHK") + "-";
            int randomNum = 100 + new Random().nextInt(900);
            String officerCode = (String) payload.get("officer_code");
            if (officerCode == null || officerCode.trim().isEmpty()) {
                officerCode = codePrefix + randomNum;
                while (salesOfficerRepository.findByOfficerCode(officerCode).isPresent()) {
                    randomNum = 100 + new Random().nextInt(900);
                    officerCode = codePrefix + randomNum;
                }
            }

            Long districtId = supplier.getPrimaryDistrictId();
            if (payload.get("district_id") != null) {
                districtId = Long.parseLong(payload.get("district_id").toString());
            }

            SalesOfficer so = new SalesOfficer(
                    officerCode,
                    name.trim(),
                    email != null ? email.trim() : null,
                    phone.trim(),
                    supplierId,
                    districtId,
                    city.trim(),
                    assignedArea.trim()
            );

            if (payload.get("notes") != null) {
                so.setNotes(payload.get("notes").toString());
            }

            SalesOfficer saved = salesOfficerRepository.save(so);
            enrichSalesOfficers(Collections.singletonList(saved));
            return ResponseEntity.status(HttpStatus.CREATED).body(saved);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponse.fail(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.fail("Failed to create Sales Officer: " + e.getMessage()));
        }
    }

    /**
     * Superadmin updates / reassigns an existing Sales Officer
     */
    @PutMapping("/api/v1/sales-officers/{id}")
    public ResponseEntity<?> updateSalesOfficer(@PathVariable Long id, @RequestBody Map<String, Object> payload) {
        try {
            SalesOfficer so = salesOfficerRepository.findById(id).orElse(null);
            if (so == null) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(ApiResponse.fail("Sales Officer not found with ID: " + id));
            }

            if (payload.containsKey("name")) so.setName(payload.get("name").toString().trim());
            if (payload.containsKey("phone")) so.setPhone(payload.get("phone").toString().trim());
            if (payload.containsKey("email")) so.setEmail(payload.get("email") != null ? payload.get("email").toString().trim() : null);
            if (payload.containsKey("status")) so.setStatus(payload.get("status").toString().trim());
            if (payload.containsKey("notes")) so.setNotes(payload.get("notes") != null ? payload.get("notes").toString() : null);

            if (payload.containsKey("supplier_id") || payload.containsKey("supplierId")) {
                Object supId = payload.get("supplier_id") != null ? payload.get("supplier_id") : payload.get("supplierId");
                so.setSupplierId(Long.parseLong(supId.toString()));
            }

            if (payload.containsKey("city")) so.setCity(payload.get("city").toString().trim());

            String newArea = null;
            if (payload.containsKey("assigned_area")) newArea = payload.get("assigned_area").toString().trim();
            else if (payload.containsKey("assignedArea")) newArea = payload.get("assignedArea").toString().trim();
            else if (payload.containsKey("area")) newArea = payload.get("area").toString().trim();

            if (newArea != null && !newArea.isEmpty()) {
                SupplierProfile supplier = supplierProfileRepository.findById(so.getSupplierId()).orElse(null);
                if (supplier != null) {
                    validateAreaAllotment(supplier, so.getCity(), newArea);
                }
                so.setAssignedArea(newArea);
            }

            so.setUpdatedAt(LocalDateTime.now());
            SalesOfficer saved = salesOfficerRepository.save(so);
            enrichSalesOfficers(Collections.singletonList(saved));
            return ResponseEntity.ok(saved);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponse.fail(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.fail("Failed to update Sales Officer: " + e.getMessage()));
        }
    }

    /**
     * Delete Sales Officer
     */
    @DeleteMapping("/api/v1/sales-officers/{id}")
    public ResponseEntity<?> deleteSalesOfficer(@PathVariable Long id) {
        if (!salesOfficerRepository.existsById(id)) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiResponse.fail("Sales Officer not found with ID: " + id));
        }
        salesOfficerRepository.deleteById(id);
        return ResponseEntity.ok(ApiResponse.ok("Sales Officer deleted successfully."));
    }

    // Helper: Enrich SalesOfficer with supplier name and outlet count in their area
    private void enrichSalesOfficers(List<SalesOfficer> list) {
        if (list == null || list.isEmpty()) return;

        Map<Long, String> supplierNameMap = new HashMap<>();
        List<SupplierProfile> profiles = supplierProfileRepository.findAll();
        for (SupplierProfile p : profiles) {
            supplierNameMap.put(p.getId(), p.getBusinessName());
        }

        List<Outlet> allOutlets = outletRepository.findAll();

        for (SalesOfficer so : list) {
            so.setSupplierName(supplierNameMap.getOrDefault(so.getSupplierId(), "Regional Supplier Hub"));

            int matchingOutlets = 0;
            String soArea = so.getAssignedArea() != null ? so.getAssignedArea().toLowerCase().trim() : "";
            String soCity = so.getCity() != null ? so.getCity().toLowerCase().trim() : "";

            for (Outlet o : allOutlets) {
                String oArea = o.getArea() != null ? o.getArea().toLowerCase().trim() : "";
                String oAddress = o.getLocationAddress() != null ? o.getLocationAddress().toLowerCase().trim() : "";
                String oCity = o.getCity() != null ? o.getCity().toLowerCase().trim() : "";

                boolean areaMatch = !soArea.isEmpty() && (oArea.contains(soArea) || soArea.contains(oArea) || oAddress.contains(soArea));
                boolean cityMatch = soCity.isEmpty() || oCity.isEmpty() || oCity.contains(soCity) || soCity.contains(oCity);

                if (areaMatch && cityMatch) {
                    matchingOutlets++;
                }
            }
            so.setOutletCount(matchingOutlets);
        }
    }

    // Helper: validate assigned area against supplier's allocated areas
    private void validateAreaAllotment(SupplierProfile supplier, String city, String area) {
        String allocatedAreasJson = supplier.getAllocatedAreas();
        if (allocatedAreasJson == null || allocatedAreasJson.trim().isEmpty()) {
            return; // Not strictly restricted if no custom map is set
        }

        try {
            JsonNode root = objectMapper.readTree(allocatedAreasJson);
            if (root.isObject()) {
                Iterator<Map.Entry<String, JsonNode>> fields = root.fields();
                boolean areaFound = false;
                List<String> validAreas = new ArrayList<>();

                while (fields.hasNext()) {
                    Map.Entry<String, JsonNode> entry = fields.next();
                    String cName = entry.getKey();
                    if (entry.getValue().isArray()) {
                        for (JsonNode node : entry.getValue()) {
                            String a = node.asText().trim();
                            validAreas.add(a + " (" + cName + ")");
                            if (a.equalsIgnoreCase(area.trim())) {
                                areaFound = true;
                                break;
                            }
                        }
                    }
                    if (areaFound) break;
                }

                if (!areaFound && !validAreas.isEmpty()) {
                    throw new IllegalArgumentException("Area '" + area + "' is not in the Superadmin-allocated areas for supplier '"
                            + supplier.getBusinessName() + "'. Allowed areas: " + String.join(", ", validAreas));
                }
            }
        } catch (IllegalArgumentException e) {
            throw e;
        } catch (Exception ignored) {
        }
    }

    private SupplierProfile resolveSupplierProfile(Long userId, Long supplierIdParam) {
        if (supplierIdParam != null && supplierIdParam > 0) {
            return supplierProfileRepository.findById(supplierIdParam).orElse(null);
        }
        if (userId != null && userId > 0) {
            Optional<SupplierProfile> byUser = supplierProfileRepository.findByUserId(userId);
            if (byUser.isPresent()) return byUser.get();
        }
        List<SupplierProfile> all = supplierProfileRepository.findAll();
        return all.isEmpty() ? null : all.get(0);
    }
}
