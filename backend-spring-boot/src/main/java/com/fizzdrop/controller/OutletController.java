package com.fizzdrop.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
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
    private final ObjectMapper objectMapper = new ObjectMapper();

    public OutletController(OutletRepository outletRepository,
                            DistrictRepository districtRepository,
                            SupplierProfileRepository supplierProfileRepository) {
        this.outletRepository = outletRepository;
        this.districtRepository = districtRepository;
        this.supplierProfileRepository = supplierProfileRepository;
    }

    private void enrichOutlet(Outlet o, Map<Long, District> districtMap) {
        // Auto derive franchise_name and branch_name if null/empty
        if (o.getFranchiseName() == null || o.getFranchiseName().trim().isEmpty()) {
            String name = (o.getOutletName() != null) ? o.getOutletName().trim() : "Franchise Store";
            String lower = name.toLowerCase();
            if (lower.contains("shwapno")) {
                o.setFranchiseName("Shwapno");
            } else if (lower.contains("unimart")) {
                o.setFranchiseName("Unimart");
            } else if (lower.contains("meena") || lower.contains("meenabazar")) {
                o.setFranchiseName("Meena Bazar");
            } else if (lower.contains("agora")) {
                o.setFranchiseName("Agora");
            } else if (lower.contains("prince")) {
                o.setFranchiseName("Prince Bazar");
            } else if (lower.contains("daily shopping") || lower.contains("dailyshopping")) {
                o.setFranchiseName("Daily Shopping");
            } else if (lower.contains("almas")) {
                o.setFranchiseName("Almas Super Shop");
            } else {
                o.setFranchiseName(name.replaceAll("(?i)\\s+(store|shop|super shop|outlet|superstore)$", "").trim());
            }
        }
        if (o.getBranchName() == null || o.getBranchName().trim().isEmpty()) {
            if (o.getArea() != null && !o.getArea().trim().isEmpty()) {
                o.setBranchName(o.getArea() + " Branch");
            } else if (o.getCity() != null && !o.getCity().trim().isEmpty()) {
                o.setBranchName(o.getCity() + " Branch");
            } else {
                o.setBranchName("Main Branch");
            }
        }

        if (o.getDistrictId() != null && districtMap.containsKey(o.getDistrictId())) {
            District d = districtMap.get(o.getDistrictId());
            o.setDistrictName(d.getName());
            o.setDivisionName(d.getDivision());
            if (o.getCity() == null || o.getCity().trim().isEmpty()) {
                o.setCity(d.getName());
            }
            return;
        }

        // Auto-detect district from location address or city if not explicitly assigned
        String addr = (o.getLocationAddress() != null) ? o.getLocationAddress().toLowerCase() : "";
        String city = (o.getCity() != null) ? o.getCity().toLowerCase() : "";
        for (District d : districtMap.values()) {
            String dName = d.getName().toLowerCase();
            if (addr.contains(dName) || city.contains(dName)) {
                o.setDistrictId(d.getId());
                o.setDistrictName(d.getName());
                o.setDivisionName(d.getDivision());
                if (o.getCity() == null || o.getCity().trim().isEmpty()) {
                    o.setCity(d.getName());
                }
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
                        if (o.getCity() == null || o.getCity().trim().isEmpty()) {
                            o.setCity(dhaka.getName());
                        }
                    });
        }
    }

    private Map<String, List<String>> parseAllocatedAreas(String jsonOrText) {
        Map<String, List<String>> map = new HashMap<>();
        if (jsonOrText == null || jsonOrText.trim().isEmpty()) return map;
        try {
            JsonNode root = objectMapper.readTree(jsonOrText);
            if (root.isObject()) {
                Iterator<Map.Entry<String, JsonNode>> fields = root.fields();
                while (fields.hasNext()) {
                    Map.Entry<String, JsonNode> entry = fields.next();
                    String city = entry.getKey().trim().toLowerCase();
                    List<String> areas = new ArrayList<>();
                    if (entry.getValue().isArray()) {
                        for (JsonNode node : entry.getValue()) {
                            if (node.isTextual() && !node.asText().trim().isEmpty()) {
                                areas.add(node.asText().trim().toLowerCase());
                            }
                        }
                    } else if (entry.getValue().isTextual() && !entry.getValue().asText().trim().isEmpty()) {
                        areas.add(entry.getValue().asText().trim().toLowerCase());
                    }
                    map.put(city, areas);
                }
                return map;
            }
        } catch (Exception ignored) {}

        // Fallback for simple comma separated text
        List<String> list = new ArrayList<>();
        for (String p : jsonOrText.split(",")) {
            if (!p.trim().isEmpty()) list.add(p.trim().toLowerCase());
        }
        map.put("all", list);
        return map;
    }

    @GetMapping
    public ResponseEntity<List<Outlet>> getAllOutlets(@RequestParam(required = false) Long userId,
                                                      @RequestParam(required = false) Long districtId,
                                                      @RequestParam(required = false) String city,
                                                      @RequestParam(required = false) String area) {
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
        }

        // If city filter is given
        if (city != null && !city.trim().isEmpty() && !"ALL".equalsIgnoreCase(city.trim())) {
            String cityTerm = city.trim().toLowerCase();
            all = all.stream().filter(o -> {
                String oCity = (o.getCity() != null ? o.getCity() : o.getDistrictName() != null ? o.getDistrictName() : "").toLowerCase();
                return oCity.contains(cityTerm);
            }).toList();
        }

        // If area filter is given
        if (area != null && !area.trim().isEmpty() && !"ALL".equalsIgnoreCase(area.trim())) {
            String areaTerm = area.trim().toLowerCase();
            all = all.stream().filter(o -> {
                String oArea = (o.getArea() != null ? o.getArea() : "").toLowerCase();
                String oAddr = (o.getLocationAddress() != null ? o.getLocationAddress() : "").toLowerCase();
                return oArea.contains(areaTerm) || oAddr.contains(areaTerm);
            }).toList();
        }

        // If supplier userId is given, filter to only outlets within the areas and cities allocated to that supplier
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

                Map<String, List<String>> allocatedAreasMap = parseAllocatedAreas(sp.getAllocatedAreas());

                all = all.stream().filter(o -> {
                    // Check if city/district is covered by supplier
                    boolean districtMatches = (o.getDistrictId() != null && allowedDistrictIds.contains(o.getDistrictId()));
                    String outletCity = (o.getCity() != null ? o.getCity() : o.getDistrictName() != null ? o.getDistrictName() : "").toLowerCase().trim();
                    boolean cityMatchesAllocated = allocatedAreasMap.containsKey(outletCity);

                    if (!districtMatches && !cityMatchesAllocated && !allowedDistrictIds.isEmpty()) {
                        return false;
                    }

                    // Check area allocation for this city
                    List<String> cityAllocatedAreas = allocatedAreasMap.get(outletCity);
                    if (cityAllocatedAreas == null || cityAllocatedAreas.isEmpty()) {
                        cityAllocatedAreas = allocatedAreasMap.get("all");
                    }

                    // If supplier has specific areas allocated for this city, outlet must match one of the allocated areas
                    if (cityAllocatedAreas != null && !cityAllocatedAreas.isEmpty()) {
                        String oArea = (o.getArea() != null ? o.getArea() : "").toLowerCase().trim();
                        String oAddress = (o.getLocationAddress() != null ? o.getLocationAddress() : "").toLowerCase().trim();
                        String oName = (o.getOutletName() != null ? o.getOutletName() : "").toLowerCase().trim();

                        return cityAllocatedAreas.stream().anyMatch(allocatedZone -> 
                            (!oArea.isEmpty() && (oArea.contains(allocatedZone) || allocatedZone.contains(oArea))) ||
                            oAddress.contains(allocatedZone) ||
                            oName.contains(allocatedZone)
                        );
                    }

                    // If no specific area restriction for this city, all outlets in the covered city/district are accessible
                    return true;
                }).toList();
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
            if (outlet.getFranchiseName() != null) {
                outlet.setFranchiseName(outlet.getFranchiseName().trim());
            }
            if (outlet.getBranchName() != null) {
                outlet.setBranchName(outlet.getBranchName().trim());
            }
            if ((outlet.getOutletName() == null || outlet.getOutletName().trim().isEmpty()) &&
                outlet.getFranchiseName() != null && !outlet.getFranchiseName().isEmpty()) {
                String br = (outlet.getBranchName() != null && !outlet.getBranchName().isEmpty()) 
                    ? outlet.getBranchName() 
                    : (outlet.getArea() != null && !outlet.getArea().isEmpty()) ? outlet.getArea() + " Branch" : "Main Branch";
                outlet.setOutletName(outlet.getFranchiseName() + " - " + br);
            }
            if (outlet.getOutletName() == null || outlet.getOutletName().trim().isEmpty()) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(ApiResponse.fail("Outlet or Franchise name is required"));
            }
            if (outlet.getLocationAddress() == null || outlet.getLocationAddress().trim().isEmpty()) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(ApiResponse.fail("Location address is required"));
            }
            if (outlet.getStatus() == null || outlet.getStatus().trim().isEmpty()) {
                outlet.setStatus("Active");
            }
            if (outlet.getCity() != null) {
                outlet.setCity(outlet.getCity().trim());
            }
            if (outlet.getArea() != null) {
                outlet.setArea(outlet.getArea().trim());
            }

            // Auto-detect district if omitted
            if (outlet.getDistrictId() == null) {
                String addr = outlet.getLocationAddress().toLowerCase();
                String city = (outlet.getCity() != null) ? outlet.getCity().toLowerCase() : "";
                for (District d : districtRepository.findAll()) {
                    String dName = d.getName().toLowerCase();
                    if (addr.contains(dName) || city.contains(dName)) {
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
                    if (saved.getCity() == null || saved.getCity().trim().isEmpty()) {
                        saved.setCity(d.getName());
                    }
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
            if (updates.getOutletName() != null) existing.setOutletName(updates.getOutletName().trim());
            if (updates.getFranchiseName() != null) existing.setFranchiseName(updates.getFranchiseName().trim());
            if (updates.getBranchName() != null) existing.setBranchName(updates.getBranchName().trim());
            if (updates.getLocationAddress() != null) existing.setLocationAddress(updates.getLocationAddress().trim());
            if (updates.getContactPhone() != null) existing.setContactPhone(updates.getContactPhone().trim());
            if (updates.getStatus() != null) existing.setStatus(updates.getStatus());
            if (updates.getDistrictId() != null) existing.setDistrictId(updates.getDistrictId());
            if (updates.getCity() != null) existing.setCity(updates.getCity().trim());
            if (updates.getArea() != null) existing.setArea(updates.getArea().trim());

            Outlet saved = outletRepository.save(existing);
            if (saved.getDistrictId() != null) {
                districtRepository.findById(saved.getDistrictId()).ifPresent(d -> {
                    saved.setDistrictName(d.getName());
                    saved.setDivisionName(d.getDivision());
                    if (saved.getCity() == null || saved.getCity().trim().isEmpty()) {
                        saved.setCity(d.getName());
                    }
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
