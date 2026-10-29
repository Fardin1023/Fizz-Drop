package com.fizzdrop.service;

import com.fizzdrop.dto.AdminReviewDTO;
import com.fizzdrop.dto.CreateRequisitionDTO;
import com.fizzdrop.dto.SupplierProfileDTO;
import com.fizzdrop.entity.*;
import com.fizzdrop.repository.*;
import jakarta.annotation.PostConstruct;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;

@Service
public class RequisitionProcessingService {

    private final DistrictRepository districtRepository;
    private final SupplierProfileRepository supplierProfileRepository;
    private final DistrictInventoryRepository districtInventoryRepository;
    private final StockRequisitionRepository requisitionRepository;
    private final StockRequisitionItemRepository requisitionItemRepository;
    private final ProductRepository productRepository;
    private final ShopInventoryRepository shopInventoryRepository;
    private final org.springframework.jdbc.core.JdbcTemplate jdbcTemplate;

    public RequisitionProcessingService(DistrictRepository districtRepository,
                                        SupplierProfileRepository supplierProfileRepository,
                                        DistrictInventoryRepository districtInventoryRepository,
                                        StockRequisitionRepository requisitionRepository,
                                        StockRequisitionItemRepository requisitionItemRepository,
                                        ProductRepository productRepository,
                                        ShopInventoryRepository shopInventoryRepository,
                                        org.springframework.jdbc.core.JdbcTemplate jdbcTemplate) {
        this.districtRepository = districtRepository;
        this.supplierProfileRepository = supplierProfileRepository;
        this.districtInventoryRepository = districtInventoryRepository;
        this.requisitionRepository = requisitionRepository;
        this.requisitionItemRepository = requisitionItemRepository;
        this.productRepository = productRepository;
        this.shopInventoryRepository = shopInventoryRepository;
        this.jdbcTemplate = jdbcTemplate;
    }

    @PostConstruct
    @Transactional
    public void initDatabaseData() {
        // Drop legacy irrelevant branches table if present
        try {
            jdbcTemplate.execute("DROP TABLE IF EXISTS branches");
        } catch (Exception ignored) {}
        // 1. Seed 64 districts of Bangladesh if not present
        if (districtRepository.count() == 0) {
            Map<String, List<String>> divisionMap = new LinkedHashMap<>();
            divisionMap.put("Dhaka", Arrays.asList("Dhaka", "Gazipur", "Narayanganj", "Tangail", "Kishoreganj", 
                    "Manikganj", "Munshiganj", "Narsingdi", "Faridpur", "Gopalganj", "Madaripur", "Rajbari", "Shariatpur"));
            divisionMap.put("Chittagong", Arrays.asList("Chittagong", "Cox's Bazar", "Comilla", "Feni", "Brahmanbaria", 
                    "Rangamati", "Khagrachhari", "Bandarban", "Noakhali", "Chandpur", "Lakshmipur"));
            divisionMap.put("Rajshahi", Arrays.asList("Rajshahi", "Bogra", "Pabna", "Sirajganj", "Naogaon", 
                    "Natore", "Joypurhat", "Chapainawabganj"));
            divisionMap.put("Khulna", Arrays.asList("Khulna", "Jessore", "Satkhira", "Bagerhat", "Kushtia", 
                    "Jhenaidah", "Chuadanga", "Meherpur", "Magura", "Narail"));
            divisionMap.put("Barisal", Arrays.asList("Barisal", "Bhola", "Jhalokathi", "Pirojpur", "Barguna", "Patuakhali"));
            divisionMap.put("Sylhet", Arrays.asList("Sylhet", "Moulvibazar", "Habiganj", "Sunamganj"));
            divisionMap.put("Rangpur", Arrays.asList("Rangpur", "Dinajpur", "Gaibandha", "Kurigram", "Lalmonirhat", 
                    "Nilphamari", "Panchagarh", "Thakurgaon"));
            divisionMap.put("Mymensingh", Arrays.asList("Mymensingh", "Jamalpur", "Netrokona", "Sherpur"));

            List<District> toSave = new ArrayList<>();
            for (Map.Entry<String, List<String>> entry : divisionMap.entrySet()) {
                String division = entry.getKey();
                for (String districtName : entry.getValue()) {
                    toSave.add(new District(districtName, division));
                }
            }
            districtRepository.saveAll(toSave);
        }

        // 2. Auto-initialize default profile for central supplier (User ID 4)
        District dhaka = districtRepository.findByNameIgnoreCase("Dhaka").orElse(null);
        Long defaultDistrictId = (dhaka != null) ? dhaka.getId() : 1L;

        if (supplierProfileRepository.findByUserId(4L).isEmpty()) {
            SupplierProfile defaultProf = new SupplierProfile(
                    4L,
                    "Central Beverage Logistics Hub",
                    defaultDistrictId,
                    "Road 11, Plot 42, Gulshan-1 Depot, Dhaka",
                    "+8801700112233"
            );
            defaultProf.setTradeLicenseNumber("TRD-DHK-2026-9812");
            defaultProf.setIsVerified(true);
            supplierProfileRepository.save(defaultProf);
        }

        // 3. Seed initial district inventory for active products in Dhaka & key districts if empty
        if (districtInventoryRepository.count() == 0 && dhaka != null) {
            List<Product> products = productRepository.findAll();
            for (Product p : products) {
                // Dhaka regional depot stock
                districtInventoryRepository.save(new DistrictInventory(dhaka.getId(), p.getProductId(), 120, 0));
                
                // Chittagong regional depot stock
                districtRepository.findByNameIgnoreCase("Chittagong").ifPresent(ctg -> {
                    districtInventoryRepository.save(new DistrictInventory(ctg.getId(), p.getProductId(), 80, 0));
                });

                // Sylhet regional depot stock
                districtRepository.findByNameIgnoreCase("Sylhet").ifPresent(syl -> {
                    districtInventoryRepository.save(new DistrictInventory(syl.getId(), p.getProductId(), 60, 0));
                });
            }
        }
    }

    public List<District> getAllDistricts() {
        return districtRepository.findAllByOrderByDivisionAscNameAsc();
    }

    public SupplierProfile getSupplierProfile(Long userId) {
        SupplierProfile profile = supplierProfileRepository.findByUserId(userId).orElseGet(() -> {
            District dhaka = districtRepository.findByNameIgnoreCase("Dhaka").orElse(null);
            Long defaultDistrictId = (dhaka != null) ? dhaka.getId() : 1L;
            SupplierProfile newProf = new SupplierProfile(
                    userId,
                    "Supplier Depot Operations",
                    defaultDistrictId,
                    "Primary Regional Logistics Hub",
                    "+8801700000000"
            );
            newProf.setTradeLicenseNumber("TRD-PENDING-" + userId);
            return supplierProfileRepository.save(newProf);
        });

        enrichProfile(profile);
        return profile;
    }

    @Transactional
    public SupplierProfile updateSupplierRegion(Long userId, SupplierProfileDTO dto) {
        SupplierProfile profile = supplierProfileRepository.findByUserId(userId).orElseGet(() -> {
            SupplierProfile p = new SupplierProfile();
            p.setUserId(userId);
            return p;
        });

        if (dto.getPrimaryDistrictId() != null) {
            districtRepository.findById(dto.getPrimaryDistrictId()).orElseThrow(
                    () -> new IllegalArgumentException("District with ID " + dto.getPrimaryDistrictId() + " does not exist.")
            );
            profile.setPrimaryDistrictId(dto.getPrimaryDistrictId());
        }

        if (dto.getBusinessName() != null && !dto.getBusinessName().trim().isEmpty()) {
            profile.setBusinessName(dto.getBusinessName().trim());
        }
        if (dto.getTradeLicenseNumber() != null) {
            profile.setTradeLicenseNumber(dto.getTradeLicenseNumber().trim());
        }
        if (dto.getDepotAddress() != null) {
            profile.setDepotAddress(dto.getDepotAddress().trim());
        }
        if (dto.getPhoneNumber() != null) {
            profile.setPhoneNumber(dto.getPhoneNumber().trim());
        }

        profile.setUpdatedAt(LocalDateTime.now());
        SupplierProfile saved = supplierProfileRepository.save(profile);
        enrichProfile(saved);
        return saved;
    }

    @Transactional
    public StockRequisition createRequisition(Long userId, CreateRequisitionDTO dto) {
        SupplierProfile profile = getSupplierProfile(userId);
        Long districtId = profile.getPrimaryDistrictId();

        if (dto.getItems() == null || dto.getItems().isEmpty()) {
            throw new IllegalArgumentException("Requisition must contain at least one product item.");
        }

        // Generate unique tracking token (REQ-YYYY-XXXX)
        String year = String.valueOf(LocalDateTime.now().getYear());
        int randomCode = 1000 + new Random().nextInt(9000);
        String reqCode = "REQ-" + year + "-" + randomCode;

        while (requisitionRepository.findByRequisitionCode(reqCode).isPresent()) {
            randomCode = 1000 + new Random().nextInt(9000);
            reqCode = "REQ-" + year + "-" + randomCode;
        }

        StockRequisition req = new StockRequisition(
                reqCode,
                profile.getId(),
                districtId,
                dto.getUrgency() != null ? dto.getUrgency().toUpperCase() : "NORMAL",
                dto.getSupplierRemarks()
        );

        StockRequisition savedReq = requisitionRepository.save(req);

        List<StockRequisitionItem> items = new ArrayList<>();
        int totalCases = 0;

        for (CreateRequisitionDTO.ItemRequest ir : dto.getItems()) {
            if (ir.getProductId() != null && ir.getRequestedQuantity() != null && ir.getRequestedQuantity() > 0) {
                StockRequisitionItem item = new StockRequisitionItem(savedReq.getId(), ir.getProductId(), ir.getRequestedQuantity());
                items.add(item);
                totalCases += ir.getRequestedQuantity();
            }
        }

        requisitionItemRepository.saveAll(items);

        savedReq.setItems(items);
        savedReq.setTotalRequestedCases(totalCases);
        savedReq.setTotalApprovedCases(0);
        enrichRequisition(savedReq, profile);

        return savedReq;
    }

    public List<StockRequisition> getSupplierRequisitions(Long userId) {
        SupplierProfile profile = getSupplierProfile(userId);
        List<StockRequisition> list = requisitionRepository.findBySupplierIdOrderByCreatedAtDesc(profile.getId());
        for (StockRequisition r : list) {
            enrichRequisition(r, profile);
        }
        return list;
    }

    public List<StockRequisition> getAllRequisitionsForAdmin(String status, Long districtId) {
        List<StockRequisition> list;
        if (status != null && !status.equalsIgnoreCase("ALL") && districtId != null) {
            list = requisitionRepository.findByStatusAndDistrictIdOrderByCreatedAtDesc(status.toUpperCase(), districtId);
        } else if (status != null && !status.equalsIgnoreCase("ALL")) {
            list = requisitionRepository.findByStatusOrderByCreatedAtDesc(status.toUpperCase());
        } else if (districtId != null) {
            list = requisitionRepository.findByDistrictIdOrderByCreatedAtDesc(districtId);
        } else {
            list = requisitionRepository.findAllByOrderByCreatedAtDesc();
        }

        for (StockRequisition r : list) {
            SupplierProfile sp = supplierProfileRepository.findById(r.getSupplierId()).orElse(null);
            enrichRequisition(r, sp);
        }
        return list;
    }

    public StockRequisition getRequisitionWithRegionalStock(Long requisitionId) {
        StockRequisition req = requisitionRepository.findById(requisitionId).orElseThrow(
                () -> new IllegalArgumentException("Requisition with ID " + requisitionId + " not found.")
        );

        SupplierProfile sp = supplierProfileRepository.findById(req.getSupplierId()).orElse(null);
        enrichRequisition(req, sp);

        List<StockRequisitionItem> items = requisitionItemRepository.findByRequisitionId(req.getId());
        for (StockRequisitionItem it : items) {
            productRepository.findById(it.getProductId()).ifPresent(prod -> {
                it.setBrand(prod.getBrand());
                it.setFlavorVariant(prod.getFlavorVariant());
                it.setPackaging(prod.getPackaging());
                it.setSizeVolume(prod.getSizeVolume());
                it.setSku(prod.getSku());
                it.setBasePrice(prod.getBasePrice());
                it.setImageUrl(prod.getImageUrl());
            });

            // Live available stock in supplier's target district depot
            var distInv = districtInventoryRepository.findByDistrictIdAndProductId(req.getDistrictId(), it.getProductId());
            it.setRegionalStock(distInv.map(DistrictInventory::getAvailableStock).orElse(0));

            // Central warehouse unallocated stock
            Integer centralTotal = shopInventoryRepository.getTotalStockByProductId(it.getProductId());
            it.setCentralStock(centralTotal != null ? centralTotal : 150);
        }

        req.setItems(items);
        return req;
    }

    @Transactional
    public StockRequisition processRequisitionAction(Long requisitionId, AdminReviewDTO reviewDto) {
        StockRequisition req = requisitionRepository.findById(requisitionId).orElseThrow(
                () -> new IllegalArgumentException("Requisition with ID " + requisitionId + " not found.")
        );

        String action = reviewDto.getAction() != null ? reviewDto.getAction().toUpperCase() : "APPROVE_FULL";
        List<StockRequisitionItem> items = requisitionItemRepository.findByRequisitionId(req.getId());

        int totalApproved = 0;

        if ("REJECT".equals(action)) {
            req.setStatus("REJECTED");
            for (StockRequisitionItem item : items) {
                item.setApprovedQuantity(0);
            }
        } else if ("APPROVE_FULL".equals(action)) {
            req.setStatus("APPROVED");
            for (StockRequisitionItem item : items) {
                item.setApprovedQuantity(item.getRequestedQuantity());
                totalApproved += item.getRequestedQuantity();
                allocateDistrictStock(req.getDistrictId(), item.getProductId(), item.getRequestedQuantity());
            }
        } else { // APPROVE_PARTIAL / CUSTOM ALLOWANCE OPTIONS
            Map<Long, Integer> approvedMap = new HashMap<>();
            if (reviewDto.getItems() != null) {
                for (AdminReviewDTO.ItemApproval ia : reviewDto.getItems()) {
                    if (ia.getItemId() != null && ia.getApprovedQuantity() != null) {
                        approvedMap.put(ia.getItemId(), Math.max(0, ia.getApprovedQuantity()));
                    }
                }
            }

            boolean allZero = true;
            boolean allFull = true;

            for (StockRequisitionItem item : items) {
                int approved = approvedMap.getOrDefault(item.getId(), item.getRequestedQuantity());
                item.setApprovedQuantity(approved);
                totalApproved += approved;
                if (approved > 0) {
                    allZero = false;
                    allocateDistrictStock(req.getDistrictId(), item.getProductId(), approved);
                }
                if (approved < item.getRequestedQuantity()) {
                    allFull = false;
                }
            }

            if (allZero) {
                req.setStatus("REJECTED");
            } else if (allFull) {
                req.setStatus("APPROVED");
            } else {
                req.setStatus("PARTIALLY_APPROVED");
            }
        }

        requisitionItemRepository.saveAll(items);

        if (reviewDto.getAdminRemarks() != null && !reviewDto.getAdminRemarks().trim().isEmpty()) {
            req.setAdminRemarks(reviewDto.getAdminRemarks().trim());
        }

        req.setUpdatedAt(LocalDateTime.now());
        StockRequisition saved = requisitionRepository.save(req);

        SupplierProfile sp = supplierProfileRepository.findById(req.getSupplierId()).orElse(null);
        enrichRequisition(saved, sp);
        saved.setItems(items);
        saved.setTotalApprovedCases(totalApproved);

        return saved;
    }

    private void allocateDistrictStock(Long districtId, Long productId, int qty) {
        var invOpt = districtInventoryRepository.findByDistrictIdAndProductId(districtId, productId);
        DistrictInventory di;
        if (invOpt.isPresent()) {
            di = invOpt.get();
            di.setCurrentStock(di.getCurrentStock() + qty);
        } else {
            di = new DistrictInventory(districtId, productId, qty, 0);
        }
        districtInventoryRepository.save(di);
    }

    private void enrichProfile(SupplierProfile profile) {
        if (profile.getPrimaryDistrictId() != null) {
            districtRepository.findById(profile.getPrimaryDistrictId()).ifPresent(d -> {
                profile.setDistrictName(d.getName());
                profile.setDivisionName(d.getDivision());
            });
        }
    }

    private void enrichRequisition(StockRequisition req, SupplierProfile sp) {
        if (sp != null) {
            req.setSupplierName(sp.getBusinessName());
        }
        if (req.getDistrictId() != null) {
            districtRepository.findById(req.getDistrictId()).ifPresent(d -> {
                req.setDistrictName(d.getName());
                req.setDivisionName(d.getDivision());
            });
        }

        List<StockRequisitionItem> items = requisitionItemRepository.findByRequisitionId(req.getId());
        req.setItems(items);
        int reqCases = 0;
        int appCases = 0;
        for (StockRequisitionItem i : items) {
            reqCases += (i.getRequestedQuantity() != null ? i.getRequestedQuantity() : 0);
            appCases += (i.getApprovedQuantity() != null ? i.getApprovedQuantity() : 0);
        }
        req.setTotalRequestedCases(reqCases);
        req.setTotalApprovedCases(appCases);
    }
}
