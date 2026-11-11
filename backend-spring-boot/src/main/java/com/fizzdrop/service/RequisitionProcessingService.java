package com.fizzdrop.service;

import com.fizzdrop.dto.AdminReviewDTO;
import com.fizzdrop.dto.CreateRequisitionDTO;
import com.fizzdrop.dto.CreateReturnRequestDTO;
import com.fizzdrop.dto.ReturnReviewDTO;
import com.fizzdrop.dto.SupplierFinancialSummaryDTO;
import com.fizzdrop.dto.SupplierProfileDTO;
import com.fizzdrop.entity.*;
import com.fizzdrop.repository.*;
import jakarta.annotation.PostConstruct;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class RequisitionProcessingService {

    private final DistrictRepository districtRepository;
    private final SupplierProfileRepository supplierProfileRepository;
    private final DistrictInventoryRepository districtInventoryRepository;
    private final StockRequisitionRepository requisitionRepository;
    private final StockRequisitionItemRepository requisitionItemRepository;
    private final ProductRepository productRepository;
    private final ShopInventoryRepository shopInventoryRepository;
    private final AppNotificationRepository notificationRepository;
    private final CentralInventoryRepository centralInventoryRepository;
    private final UserRepository userRepository;
    private final StockReturnRequestRepository stockReturnRequestRepository;
    private final StockReturnItemRepository stockReturnItemRepository;
    private final SupplierTransactionRepository supplierTransactionRepository;
    private final org.springframework.jdbc.core.JdbcTemplate jdbcTemplate;

    @org.springframework.beans.factory.annotation.Value("${stripe.publishable.key:}")
    private String stripePublishableKey;

    public RequisitionProcessingService(DistrictRepository districtRepository,
                                        SupplierProfileRepository supplierProfileRepository,
                                        DistrictInventoryRepository districtInventoryRepository,
                                        StockRequisitionRepository requisitionRepository,
                                        StockRequisitionItemRepository requisitionItemRepository,
                                        ProductRepository productRepository,
                                        ShopInventoryRepository shopInventoryRepository,
                                        AppNotificationRepository notificationRepository,
                                        CentralInventoryRepository centralInventoryRepository,
                                        UserRepository userRepository,
                                        StockReturnRequestRepository stockReturnRequestRepository,
                                        StockReturnItemRepository stockReturnItemRepository,
                                        SupplierTransactionRepository supplierTransactionRepository,
                                        org.springframework.jdbc.core.JdbcTemplate jdbcTemplate) {
        this.districtRepository = districtRepository;
        this.supplierProfileRepository = supplierProfileRepository;
        this.districtInventoryRepository = districtInventoryRepository;
        this.requisitionRepository = requisitionRepository;
        this.requisitionItemRepository = requisitionItemRepository;
        this.productRepository = productRepository;
        this.shopInventoryRepository = shopInventoryRepository;
        this.notificationRepository = notificationRepository;
        this.centralInventoryRepository = centralInventoryRepository;
        this.userRepository = userRepository;
        this.stockReturnRequestRepository = stockReturnRequestRepository;
        this.stockReturnItemRepository = stockReturnItemRepository;
        this.supplierTransactionRepository = supplierTransactionRepository;
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

        // 2. Auto-initialize profiles for multiple distinct regional suppliers if not present
        District dhaka = districtRepository.findByNameIgnoreCase("Dhaka").orElse(null);
        Long dhakaDistId = (dhaka != null) ? dhaka.getId() : 1L;

        // Ensure central supplier user exists in Users table
        Optional<User> centralUserOpt = userRepository.findByEmail("central.supplier@fizzdrop.com");
        Long centralUserId = centralUserOpt.map(User::getUserId).orElse(1L);
        if (centralUserOpt.isEmpty()) {
            User savedCentral = userRepository.save(new User(3L, 1L, "central.supplier@fizzdrop.com", "supplier123"));
            centralUserId = savedCentral.getUserId();
        }

        // Supplier: Dhaka Division Hub
        if (supplierProfileRepository.count() == 0) {
            District gazipur = districtRepository.findByNameIgnoreCase("Gazipur").orElse(null);
            District narayanganj = districtRepository.findByNameIgnoreCase("Narayanganj").orElse(null);
            String covered = dhakaDistId + (gazipur != null ? "," + gazipur.getId() : "") + (narayanganj != null ? "," + narayanganj.getId() : "");

            SupplierProfile dhakaProf = new SupplierProfile(
                    centralUserId,
                    "Dhaka Metropolitan & Central Beverage Logistics Hub",
                    dhakaDistId,
                    "Road 11, Plot 42, Gulshan-1 Logistics Depot, Dhaka",
                    "+8801700112233"
            );
            dhakaProf.setDivisionName("Dhaka");
            dhakaProf.setCoveredDistrictIds(covered);
            dhakaProf.setTradeLicenseNumber("TRD-DHK-2026-9812");
            dhakaProf.setIsVerified(true);
            dhakaProf.setDefaultPaymentMethod("STRIPE_CARD");
            dhakaProf.setBankName(null);
            dhakaProf.setBankAccountNumber(null);
            dhakaProf.setBankAccountName(null);
            dhakaProf.setMobileBankingNumber("+8801700112233");
            // Set guaranteed initial working capital of 100,000.00 so wallet NEVER starts at 0
            dhakaProf.setWalletBalance(new java.math.BigDecimal("100000.00"));
            dhakaProf.setAllocatedAreas("{\"Dhaka\":[\"Gulshan\",\"Banani\",\"Uttara\",\"Dhanmondi\",\"Mirpur\"],\"Gazipur\":[\"Tongi\",\"Joydebpur\"],\"Narayanganj\":[\"Chashara\",\"Siddhirganj\"]}");
            supplierProfileRepository.saveAndFlush(dhakaProf);
        } else {
            SupplierProfile p = supplierProfileRepository.findAll().get(0);
            boolean needSave = false;
            if (p.getUserId() == null || !p.getUserId().equals(centralUserId)) {
                p.setUserId(centralUserId);
                needSave = true;
            }
            if (p.getDivisionName() == null || p.getDivisionName().trim().isEmpty()) {
                p.setDivisionName("Dhaka");
                needSave = true;
            }
            if (p.getCoveredDistrictIds() == null || p.getCoveredDistrictIds().trim().isEmpty()) {
                p.setCoveredDistrictIds(String.valueOf(p.getPrimaryDistrictId() != null ? p.getPrimaryDistrictId() : dhakaDistId));
                needSave = true;
            }
            if (p.getAllocatedAreas() == null || p.getAllocatedAreas().trim().isEmpty()) {
                p.setAllocatedAreas("{\"Dhaka\":[\"Gulshan\",\"Banani\",\"Uttara\",\"Dhanmondi\",\"Mirpur\"],\"Gazipur\":[\"Tongi\",\"Joydebpur\"],\"Narayanganj\":[\"Chashara\",\"Siddhirganj\"]}");
                needSave = true;
            }
            // CRITICAL PERSISTENCE: Ensure wallet_balance is NEVER reset to 0 or null on restarts.
            // If it was null or 0, initialize with working capital of 100,000.00; if already positive, strictly preserve it!
            if (p.getWalletBalance() == null || p.getWalletBalance().compareTo(java.math.BigDecimal.ZERO) <= 0) {
                p.setWalletBalance(new java.math.BigDecimal("100000.00"));
                needSave = true;
            }
            if (needSave) {
                supplierProfileRepository.saveAndFlush(p);
                try {
                    jdbcTemplate.update("UPDATE supplier_profiles SET wallet_balance = ?, updated_at = NOW() WHERE id = ?", p.getWalletBalance(), p.getId());
                } catch (Exception ignored) {}
            }
        }

        // 3. Seed initial district inventory for active products in Dhaka if empty
        if (districtInventoryRepository.count() == 0 && dhaka != null) {
            List<Product> products = productRepository.findAll();
            for (Product p : products) {
                districtInventoryRepository.save(new DistrictInventory(dhaka.getId(), p.getProductId(), 120, 0));
            }
        }

        // 4. Preserve existing outlet and shop inventory stocks across restarts
        System.out.println("[Database Init] Outlet product stocks preserved across restarts.");

        // 5. Maintain Superadmin fixed stock for every category of products for supplying to suppliers
        try {
            List<Product> allProducts = productRepository.findAll();
            for (Product p : allProducts) {
                var existingOpt = centralInventoryRepository.findByProductId(p.getProductId());
                int targetFixedStock = getFixedCategoryStock(p.getCategory());
                if (existingOpt.isEmpty()) {
                    centralInventoryRepository.save(new CentralInventory(
                            p.getProductId(),
                            p.getCategory() != null ? p.getCategory() : "Beverage",
                            targetFixedStock,
                            0
                    ));
                } else {
                    CentralInventory ci = existingOpt.get();
                    if (ci.getAvailableStock() == null || ci.getAvailableStock() == 0) {
                        ci.setAvailableStock(targetFixedStock);
                        ci.setCategory(p.getCategory() != null ? p.getCategory() : "Beverage");
                        ci.setUpdatedAt(LocalDateTime.now());
                        centralInventoryRepository.save(ci);
                    }
                }
            }
            System.out.println("[Database Init] Superadmin central fixed category stocks initialized.");
        } catch (Exception ex) {
            System.err.println("[Database Init] Failed to initialize central inventory: " + ex.getMessage());
        }
    }

    public static int getFixedCategoryStock(String category) {
        if (category == null) return 1000;
        return switch (category.trim()) {
            case "Pepsi" -> 1500;
            case "7UP", "7up", "7Up" -> 1500;
            case "Mountain Dew" -> 1200;
            case "Mirinda" -> 1200;
            case "Slice" -> 1000;
            case "Sting" -> 1000;
            case "Aquafina" -> 2000;
            case "Merchandise" -> 200;
            case "Carbonated Soft Drink" -> 1500;
            case "Energy Drink" -> 1200;
            case "Fruit Juice" -> 1000;
            case "Purified Water" -> 2000;
            case "Beverage" -> 1500;
            default -> 1000;
        };
    }

    public List<District> getAllDistricts() {
        return districtRepository.findAllByOrderByDivisionAscNameAsc();
    }

    public List<SupplierProfile> getAllSupplierProfiles() {
        List<SupplierProfile> all = supplierProfileRepository.findAll();
        Map<Long, District> distMap = districtRepository.findAll().stream()
                .collect(Collectors.toMap(District::getId, d -> d, (a, b) -> a));
        Map<Long, User> userMap = userRepository.findAll().stream()
                .collect(Collectors.toMap(User::getUserId, u -> u, (a, b) -> a));

        for (SupplierProfile profile : all) {
            if (profile.getPrimaryDistrictId() != null) {
                District d = distMap.get(profile.getPrimaryDistrictId());
                if (d != null) {
                    profile.setDistrictName(d.getName());
                    if (profile.getDivisionName() == null || profile.getDivisionName().trim().isEmpty()) {
                        profile.setDivisionName(d.getDivision());
                    }
                }
            }

            String coveredIdsStr = profile.getCoveredDistrictIds();
            List<Long> idList = new ArrayList<>();
            if (coveredIdsStr != null && !coveredIdsStr.trim().isEmpty()) {
                for (String s : coveredIdsStr.split(",")) {
                    String trimmed = s.trim();
                    if (!trimmed.isEmpty()) {
                        try {
                            idList.add(Long.parseLong(trimmed));
                        } catch (NumberFormatException ignored) {}
                    }
                }
            }
            if (idList.isEmpty() && profile.getPrimaryDistrictId() != null) {
                idList.add(profile.getPrimaryDistrictId());
            }

            List<Map<String, Object>> assignedDistricts = new ArrayList<>();
            for (Long dId : idList) {
                District d = distMap.get(dId);
                if (d != null) {
                    Map<String, Object> map = new HashMap<>();
                    map.put("id", d.getId());
                    map.put("name", d.getName());
                    map.put("division", d.getDivision());
                    assignedDistricts.add(map);
                }
            }

            profile.setCoveredDistrictIdsList(idList);
            profile.setAssignedDistricts(assignedDistricts);

            if (profile.getUserId() != null) {
                User u = userMap.get(profile.getUserId());
                if (u != null) {
                    profile.setUserEmail(u.getEmail());
                }
            }
        }
        return all;
    }

    public SupplierProfile resolveSupplierProfile(Long userId, Long supplierId) {
        if (supplierId != null && supplierId > 0) {
            java.util.Optional<SupplierProfile> byId = supplierProfileRepository.findById(supplierId);
            if (byId.isPresent()) {
                SupplierProfile profile = byId.get();
                enrichProfile(profile);
                return profile;
            }
        }
        if (userId != null && userId > 0) {
            java.util.Optional<SupplierProfile> byUser = supplierProfileRepository.findByUserId(userId);
            if (byUser.isPresent()) {
                SupplierProfile profile = byUser.get();
                enrichProfile(profile);
                return profile;
            }
        }
        return getSupplierProfile(userId);
    }

    public SupplierProfile getSupplierProfile(Long userId) {
        if (userId != null && userId > 0) {
            Optional<SupplierProfile> byUser = supplierProfileRepository.findByUserId(userId);
            if (byUser.isPresent()) {
                SupplierProfile profile = byUser.get();
                enrichProfile(profile);
                return profile;
            }
        }

        // Return first available primary supplier profile
        List<SupplierProfile> all = supplierProfileRepository.findAll();
        if (!all.isEmpty()) {
            SupplierProfile profile = all.get(0);
            if (profile.getWalletBalance() == null || profile.getWalletBalance().compareTo(java.math.BigDecimal.ZERO) <= 0) {
                profile.setWalletBalance(new java.math.BigDecimal("100000.00"));
                supplierProfileRepository.saveAndFlush(profile);
                try {
                    jdbcTemplate.update("UPDATE supplier_profiles SET wallet_balance = ?, updated_at = NOW() WHERE id = ?", profile.getWalletBalance(), profile.getId());
                } catch (Exception ignored) {}
            }
            enrichProfile(profile);
            return profile;
        }

        // Fallback only if table is completely empty
        District dhaka = districtRepository.findByNameIgnoreCase("Dhaka").orElse(null);
        Long defaultDistrictId = (dhaka != null) ? dhaka.getId() : 1L;
        SupplierProfile newProf = new SupplierProfile(
                userId != null ? userId : 1L,
                "Dhaka Metropolitan & Central Beverage Logistics Hub",
                defaultDistrictId,
                "Road 11, Plot 42, Gulshan-1 Logistics Depot, Dhaka",
                "+8801700112233"
        );
        newProf.setDivisionName("Dhaka");
        newProf.setCoveredDistrictIds("1,2,3");
        newProf.setTradeLicenseNumber("TRD-DHK-2026-9812");
        newProf.setIsVerified(true);
        newProf.setWalletBalance(new java.math.BigDecimal("100000.00"));
        SupplierProfile saved = supplierProfileRepository.save(newProf);
        enrichProfile(saved);
        return saved;
    }

    @Transactional
    public SupplierProfile updateSupplierRegion(Long userId, SupplierProfileDTO dto) {
        SupplierProfile profile = supplierProfileRepository.findByUserId(userId).orElseGet(() -> {
            SupplierProfile p = new SupplierProfile();
            p.setUserId(userId);
            return p;
        });

        String targetDivision = dto.getDivisionName();
        List<Long> coveredIds = dto.getCoveredDistrictIds();

        if (coveredIds != null && !coveredIds.isEmpty()) {
            List<District> selectedDistricts = districtRepository.findAllById(coveredIds);
            if (selectedDistricts.isEmpty()) {
                throw new IllegalArgumentException("Selected districts cannot be empty.");
            }

            String determinedDivision = (targetDivision != null && !targetDivision.trim().isEmpty())
                    ? targetDivision.trim()
                    : selectedDistricts.get(0).getDivision();

            for (District d : selectedDistricts) {
                if (!d.getDivision().equalsIgnoreCase(determinedDivision)) {
                    throw new IllegalArgumentException("All selected cities must belong to the single chosen division: '" 
                            + determinedDivision + "'. City '" + d.getName() + "' is in '" + d.getDivision() + "' division.");
                }
            }

            profile.setDivisionName(determinedDivision);
            profile.setCoveredDistrictIds(String.join(",", coveredIds.stream().map(String::valueOf).toList()));

            if (dto.getPrimaryDistrictId() != null && coveredIds.contains(dto.getPrimaryDistrictId())) {
                profile.setPrimaryDistrictId(dto.getPrimaryDistrictId());
            } else if (profile.getPrimaryDistrictId() == null || !coveredIds.contains(profile.getPrimaryDistrictId())) {
                profile.setPrimaryDistrictId(coveredIds.get(0));
            }
        } else if (dto.getPrimaryDistrictId() != null) {
            District d = districtRepository.findById(dto.getPrimaryDistrictId()).orElseThrow(
                    () -> new IllegalArgumentException("District with ID " + dto.getPrimaryDistrictId() + " does not exist.")
            );
            profile.setPrimaryDistrictId(d.getId());
            profile.setDivisionName(d.getDivision());
            profile.setCoveredDistrictIds(String.valueOf(d.getId()));
        } else if (targetDivision != null && !targetDivision.trim().isEmpty()) {
            profile.setDivisionName(targetDivision.trim());
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
        if (dto.getDefaultPaymentMethod() != null && !dto.getDefaultPaymentMethod().trim().isEmpty()) {
            profile.setDefaultPaymentMethod(dto.getDefaultPaymentMethod().trim());
        }
        if (dto.getBankName() != null) {
            profile.setBankName(dto.getBankName().trim());
        }
        if (dto.getBankAccountNumber() != null) {
            profile.setBankAccountNumber(dto.getBankAccountNumber().trim());
        }
        if (dto.getBankAccountName() != null) {
            profile.setBankAccountName(dto.getBankAccountName().trim());
        }
        if (dto.getMobileBankingNumber() != null) {
            profile.setMobileBankingNumber(dto.getMobileBankingNumber().trim());
        }
        if (dto.getIsVerified() != null) {
            profile.setIsVerified(dto.getIsVerified());
        }
        if (dto.getAllocatedAreas() != null) {
            profile.setAllocatedAreas(dto.getAllocatedAreas().trim());
        }
        if (dto.getVatRegistrationNo() != null) {
            profile.setVatRegistrationNo(dto.getVatRegistrationNo().trim());
        }
        if (dto.getApplicationDocument() != null) {
            profile.setApplicationDocument(dto.getApplicationDocument());
            profile.setApplicationDocName(dto.getApplicationDocName());
            profile.setApplicationDocType(dto.getApplicationDocType());
        }
        if (dto.getTradeLicenseDocument() != null) {
            profile.setTradeLicenseDocument(dto.getTradeLicenseDocument());
            profile.setTradeLicenseDocName(dto.getTradeLicenseDocName());
            profile.setTradeLicenseDocType(dto.getTradeLicenseDocType());
        }
        if (dto.getTinDocument() != null) {
            profile.setTinDocument(dto.getTinDocument());
            profile.setTinDocName(dto.getTinDocName());
            profile.setTinDocType(dto.getTinDocType());
        }
        if (dto.getBinDocument() != null) {
            profile.setBinDocument(dto.getBinDocument());
            profile.setBinDocName(dto.getBinDocName());
            profile.setBinDocType(dto.getBinDocType());
        }
        if (dto.getTdsVdsDocument() != null) {
            profile.setTdsVdsDocument(dto.getTdsVdsDocument());
            profile.setTdsVdsDocName(dto.getTdsVdsDocName());
            profile.setTdsVdsDocType(dto.getTdsVdsDocType());
        }
        if (dto.getTdsVdsNumber() != null) {
            profile.setTdsVdsNumber(dto.getTdsVdsNumber().trim());
        }


        if (profile.getUserId() != null) {
            userRepository.findById(profile.getUserId()).ifPresent(u -> {
                boolean changed = false;
                if (dto.getEmail() != null && !dto.getEmail().trim().isEmpty()) {
                    u.setEmail(dto.getEmail().trim().toLowerCase());
                    changed = true;
                }
                if (dto.getPassword() != null && !dto.getPassword().trim().isEmpty()) {
                    u.setPasswordHash(dto.getPassword().trim());
                    changed = true;
                }
                if (changed) {
                    u.setUpdatedDate(LocalDateTime.now());
                    userRepository.save(u);
                }
            });
        }

        profile.setUpdatedAt(LocalDateTime.now());
        SupplierProfile saved = supplierProfileRepository.save(profile);
        enrichProfile(saved);
        return saved;
    }

    @Transactional
    public SupplierProfile createSupplierAccount(SupplierProfileDTO dto) {
        if (dto.getEmail() == null || dto.getEmail().trim().isEmpty()) {
            throw new IllegalArgumentException("Supplier login email is required.");
        }
        if (dto.getBusinessName() == null || dto.getBusinessName().trim().isEmpty()) {
            throw new IllegalArgumentException("Supplier business name is required.");
        }

        String email = dto.getEmail().trim().toLowerCase();
        User user = userRepository.findByEmail(email).orElseGet(() -> {
            User newUser = new User();
            newUser.setEmail(email);
            newUser.setPasswordHash(dto.getPassword() != null && !dto.getPassword().trim().isEmpty() 
                    ? dto.getPassword().trim() 
                    : "Password123!");
            newUser.setRoleId(3L); // Supplier role
            newUser.setBranchId(1L);
            newUser.setCreatedDate(LocalDateTime.now());
            newUser.setUpdatedDate(LocalDateTime.now());
            return userRepository.save(newUser);
        });

        if (dto.getPassword() != null && !dto.getPassword().trim().isEmpty()) {
            user.setPasswordHash(dto.getPassword().trim());
            user.setUpdatedDate(LocalDateTime.now());
            userRepository.save(user);
        }

        SupplierProfile profile = supplierProfileRepository.findByUserId(user.getUserId()).orElseGet(() -> {
            SupplierProfile sp = new SupplierProfile();
            sp.setUserId(user.getUserId());
            sp.setCreatedAt(LocalDateTime.now());
            return sp;
        });

        profile.setBusinessName(dto.getBusinessName().trim());
        profile.setTradeLicenseNumber(dto.getTradeLicenseNumber() != null ? dto.getTradeLicenseNumber().trim() : "TRD-" + System.currentTimeMillis());
        profile.setDepotAddress(dto.getDepotAddress() != null ? dto.getDepotAddress().trim() : "Regional Depot Hub");
        profile.setPhoneNumber(dto.getPhoneNumber() != null ? dto.getPhoneNumber().trim() : "+8801700000000");
        profile.setIsVerified(dto.getIsVerified() != null ? dto.getIsVerified() : true);
        profile.setDefaultPaymentMethod(dto.getDefaultPaymentMethod() != null ? dto.getDefaultPaymentMethod().trim() : "CORPORATE_BANK_TRANSFER");
        profile.setBankName(dto.getBankName());
        profile.setBankAccountNumber(dto.getBankAccountNumber());
        profile.setBankAccountName(dto.getBankAccountName());
        profile.setMobileBankingNumber(dto.getMobileBankingNumber());
        if (dto.getAllocatedAreas() != null) {
            profile.setAllocatedAreas(dto.getAllocatedAreas().trim());
        }
        if (dto.getVatRegistrationNo() != null) {
            profile.setVatRegistrationNo(dto.getVatRegistrationNo().trim());
        }
        if (dto.getApplicationDocument() != null) {
            profile.setApplicationDocument(dto.getApplicationDocument());
            profile.setApplicationDocName(dto.getApplicationDocName());
            profile.setApplicationDocType(dto.getApplicationDocType());
        }
        if (dto.getTradeLicenseDocument() != null) {
            profile.setTradeLicenseDocument(dto.getTradeLicenseDocument());
            profile.setTradeLicenseDocName(dto.getTradeLicenseDocName());
            profile.setTradeLicenseDocType(dto.getTradeLicenseDocType());
        }
        if (dto.getTinDocument() != null) {
            profile.setTinDocument(dto.getTinDocument());
            profile.setTinDocName(dto.getTinDocName());
            profile.setTinDocType(dto.getTinDocType());
        }
        if (dto.getBinDocument() != null) {
            profile.setBinDocument(dto.getBinDocument());
            profile.setBinDocName(dto.getBinDocName());
            profile.setBinDocType(dto.getBinDocType());
        }
        if (dto.getTdsVdsDocument() != null) {
            profile.setTdsVdsDocument(dto.getTdsVdsDocument());
            profile.setTdsVdsDocName(dto.getTdsVdsDocName());
            profile.setTdsVdsDocType(dto.getTdsVdsDocType());
        }
        if (dto.getTdsVdsNumber() != null) {
            profile.setTdsVdsNumber(dto.getTdsVdsNumber().trim());
        }


        String targetDivision = dto.getDivisionName();
        List<Long> coveredIds = dto.getCoveredDistrictIds();
        if (coveredIds != null && !coveredIds.isEmpty()) {
            List<District> selectedDistricts = districtRepository.findAllById(coveredIds);
            String determinedDivision = (targetDivision != null && !targetDivision.trim().isEmpty())
                    ? targetDivision.trim()
                    : (selectedDistricts.isEmpty() ? "Dhaka" : selectedDistricts.get(0).getDivision());

            for (District d : selectedDistricts) {
                if (!d.getDivision().equalsIgnoreCase(determinedDivision)) {
                    throw new IllegalArgumentException("All selected cities must belong to the single chosen division: '" 
                            + determinedDivision + "'. City '" + d.getName() + "' is in '" + d.getDivision() + "' division.");
                }
            }
            profile.setDivisionName(determinedDivision);
            profile.setCoveredDistrictIds(String.join(",", coveredIds.stream().map(String::valueOf).toList()));
            profile.setPrimaryDistrictId(dto.getPrimaryDistrictId() != null && coveredIds.contains(dto.getPrimaryDistrictId())
                    ? dto.getPrimaryDistrictId()
                    : coveredIds.get(0));
        } else {
            District dhaka = districtRepository.findByNameIgnoreCase("Dhaka").orElse(null);
            Long dId = dhaka != null ? dhaka.getId() : 1L;
            profile.setDivisionName("Dhaka");
            profile.setCoveredDistrictIds(String.valueOf(dId));
            profile.setPrimaryDistrictId(dId);
        }

        profile.setUpdatedAt(LocalDateTime.now());
        SupplierProfile saved = supplierProfileRepository.save(profile);
        enrichProfile(saved);
        return saved;
    }

    @Transactional
    public void deleteSupplierAccount(Long profileId) {
        SupplierProfile profile = supplierProfileRepository.findById(profileId)
                .orElseThrow(() -> new IllegalArgumentException("Supplier profile not found with ID: " + profileId));
        Long userId = profile.getUserId();
        supplierProfileRepository.delete(profile);
        if (userId != null && userId > 6) {
            userRepository.deleteById(userId);
        }
    }

    @Transactional
    public StockRequisition createRequisition(Long userId, CreateRequisitionDTO dto) {
        SupplierProfile profile = getSupplierProfile(userId);
        Long districtId = profile.getPrimaryDistrictId();

        if (dto.getDistrictId() != null) {
            District targetDist = districtRepository.findById(dto.getDistrictId()).orElse(null);
            if (targetDist != null) {
                districtId = targetDist.getId();
            }
        }

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

        String paymentMethod = (dto.getPaymentMethod() != null && !dto.getPaymentMethod().trim().isEmpty())
                ? dto.getPaymentMethod().trim()
                : (profile.getDefaultPaymentMethod() != null ? profile.getDefaultPaymentMethod() : "CORPORATE_BANK_TRANSFER");
        req.setPaymentMethod(paymentMethod);

        String paymentRef = (dto.getPaymentReference() != null && !dto.getPaymentReference().trim().isEmpty())
                ? dto.getPaymentReference().trim()
                : ("REF-" + reqCode.replace("REQ-", ""));
        req.setPaymentReference(paymentRef);
        req.setInvoiceNumber("INV-" + reqCode.replace("REQ-", ""));
        req.setPaymentStatus("AUTHORIZED");

        StockRequisition savedReq = requisitionRepository.save(req);

        List<StockRequisitionItem> items = new ArrayList<>();
        int totalCases = 0;
        java.math.BigDecimal totalAmount = java.math.BigDecimal.ZERO;

        for (CreateRequisitionDTO.ItemRequest ir : dto.getItems()) {
            if (ir.getProductId() != null && ir.getRequestedQuantity() != null && ir.getRequestedQuantity() > 0) {
                StockRequisitionItem item = new StockRequisitionItem(savedReq.getId(), ir.getProductId(), ir.getRequestedQuantity());
                items.add(item);
                totalCases += ir.getRequestedQuantity();

                Product p = productRepository.findById(ir.getProductId()).orElse(null);
                if (p != null) {
                    java.math.BigDecimal rate = p.getSupplierPrice() != null ? p.getSupplierPrice() : p.getBasePrice();
                    if (rate != null) {
                        totalAmount = totalAmount.add(rate.multiply(java.math.BigDecimal.valueOf(ir.getRequestedQuantity())));
                    }
                }
            }
        }

        requisitionItemRepository.saveAll(items);

        // Include 5% wholesale distribution VAT so totalAmount reflects final billing & matches invoice
        java.math.BigDecimal vatMultiplier = java.math.BigDecimal.valueOf(1.05);
        java.math.BigDecimal totalWithVat = totalAmount.multiply(vatMultiplier).setScale(2, java.math.RoundingMode.HALF_UP);

        // Commercial Wallet Validation: Supplier can buy stocks based on their wallet amount
        java.math.BigDecimal currentWallet = profile.getWalletBalance() != null ? profile.getWalletBalance() : java.math.BigDecimal.ZERO;
        if (currentWallet.compareTo(totalWithVat) < 0) {
            requisitionRepository.delete(savedReq);
            throw new IllegalArgumentException("Insufficient wallet balance (৳" + currentWallet.toPlainString() + "). Requisition order requires ৳" + totalWithVat.toPlainString() + ". Please deposit funds into your supplier commercial wallet before purchasing stocks.");
        }

        // Deduct order amount directly from Supplier's Commercial Wallet
        profile.setWalletBalance(currentWallet.subtract(totalWithVat));
        supplierProfileRepository.saveAndFlush(profile);
        try {
            jdbcTemplate.update("UPDATE supplier_profiles SET wallet_balance = ?, updated_at = NOW() WHERE id = ?", profile.getWalletBalance(), profile.getId());
        } catch (Exception ignored) {}

        savedReq.setTotalAmount(totalWithVat);
        requisitionRepository.save(savedReq);

        savedReq.setItems(items);
        savedReq.setTotalRequestedCases(totalCases);
        savedReq.setTotalApprovedCases(0);
        enrichRequisition(savedReq, profile);

        try {
            SupplierTransaction tx = new SupplierTransaction(
                    "TXN-" + System.currentTimeMillis() + "-" + (100 + new Random().nextInt(900)),
                    profile.getId(),
                    savedReq.getId(),
                    null,
                    savedReq.getRequisitionCode(),
                    "STOCK_PURCHASE",
                    "DEBIT",
                    savedReq.getTotalAmount(),
                    savedReq.getPaymentMethod(),
                    "Initial stock purchase payment for " + totalCases + " cases (" + savedReq.getRequisitionCode() + ")",
                    "COMPLETED"
            );
            supplierTransactionRepository.saveAndFlush(tx);
        } catch (Exception ex) {
            System.err.println("[Transaction Error] Initial purchase transaction record failed: " + ex.getMessage());
        }

        // Real-time Notification for Superadmin
        try {
            String distName = savedReq.getDistrictName() != null ? savedReq.getDistrictName() : "Regional";
            String bizName = profile.getBusinessName() != null ? profile.getBusinessName() : "Supplier";
            AppNotification superadminNotification = new AppNotification(
                    "SUPERADMIN",
                    null,
                    "New Stock Requisition: " + reqCode,
                    "Supplier " + bizName + " (" + distName + " Depot) requested " + totalCases + " cases with " + req.getUrgency() + " priority.",
                    "NEW_REQUISITION",
                    reqCode,
                    savedReq.getId()
            );
            notificationRepository.save(superadminNotification);
        } catch (Exception ex) {
            System.err.println("[Notification Error] Superadmin notification creation failed: " + ex.getMessage());
        }

        return savedReq;
    }

    public List<StockRequisition> getSupplierRequisitions(Long userId) {
        SupplierProfile profile = getSupplierProfile(userId);
        List<StockRequisition> list = requisitionRepository.findBySupplierIdOrderByCreatedAtDesc(profile.getId());
        batchEnrichRequisitions(list);
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

        batchEnrichRequisitions(list);
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

            // Central warehouse unallocated stock (Superadmin fixed category stock pool)
            var centralInvOpt = centralInventoryRepository.findByProductId(it.getProductId());
            int centralStock = centralInvOpt
                    .map(CentralInventory::getAvailableStock)
                    .orElseGet(() -> {
                        Product p = productRepository.findById(it.getProductId()).orElse(null);
                        return getFixedCategoryStock(p != null ? p.getCategory() : "Beverage");
                    });
            it.setCentralStock(centralStock);
        }

        req.setItems(items);
        return req;
    }

    @Transactional
    public StockRequisition processRequisitionAction(Long requisitionId, AdminReviewDTO reviewDto) {
        StockRequisition req = requisitionRepository.findById(requisitionId).orElseThrow(
                () -> new IllegalArgumentException("Requisition with ID " + requisitionId + " not found.")
        );

        String action = reviewDto.getAction() != null ? reviewDto.getAction().toUpperCase() : "APPROVE_PARTIAL";
        List<StockRequisitionItem> items = requisitionItemRepository.findByRequisitionId(req.getId());

        int totalApproved = 0;
        int totalRequested = 0;

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
            int requested = item.getRequestedQuantity() != null ? item.getRequestedQuantity() : 0;
            int previousApproved = item.getApprovedQuantity() != null ? item.getApprovedQuantity() : 0;
            totalRequested += requested;

            int approved;
            if ("REJECT".equals(action)) {
                approved = 0;
            } else if (approvedMap.containsKey(item.getId())) {
                approved = Math.max(0, approvedMap.get(item.getId()));
            } else if ("APPROVE_FULL".equals(action)) {
                approved = requested;
            } else {
                approved = requested;
            }

            item.setApprovedQuantity(approved);
            totalApproved += approved;

            if (approved > 0) {
                allZero = false;
            }
            if (approved < requested) {
                allFull = false;
            }

            int delta = approved - previousApproved;
            if (delta > 0) {
                allocateDistrictStock(req.getDistrictId(), item.getProductId(), delta);
                deductCentralStock(item.getProductId(), delta);
            } else if (delta < 0) {
                reduceDistrictStock(req.getDistrictId(), item.getProductId(), -delta);
                restoreCentralStock(item.getProductId(), -delta);
            }
        }

        if (allZero) {
            req.setStatus("REJECTED");
        } else if (allFull) {
            req.setStatus("APPROVED");
        } else {
            req.setStatus("PARTIALLY_APPROVED");
        }

        requisitionItemRepository.saveAll(items);

        // Financial Settlement: Calculate Total Requested, Fulfilled Value, and Leftover Refund
        java.math.BigDecimal originalSubtotal = java.math.BigDecimal.ZERO;
        java.math.BigDecimal fulfilledSubtotal = java.math.BigDecimal.ZERO;

        for (StockRequisitionItem item : items) {
            Product p = productRepository.findById(item.getProductId()).orElse(null);
            java.math.BigDecimal price = (p != null && p.getSupplierPrice() != null)
                    ? p.getSupplierPrice()
                    : (p != null && p.getBasePrice() != null ? p.getBasePrice() : java.math.BigDecimal.valueOf(48.0));
            int reqQty = item.getRequestedQuantity() != null ? item.getRequestedQuantity() : 0;
            int appQty = item.getApprovedQuantity() != null ? item.getApprovedQuantity() : 0;

            originalSubtotal = originalSubtotal.add(price.multiply(java.math.BigDecimal.valueOf(reqQty)));
            fulfilledSubtotal = fulfilledSubtotal.add(price.multiply(java.math.BigDecimal.valueOf(appQty)));
        }

        java.math.BigDecimal vatMultiplier = java.math.BigDecimal.valueOf(1.05); // 5% wholesale distribution VAT
        java.math.BigDecimal originalTotalWithVat = originalSubtotal.multiply(vatMultiplier).setScale(2, java.math.RoundingMode.HALF_UP);

        java.math.BigDecimal initialPaid = (req.getTotalAmount() != null && req.getTotalAmount().compareTo(java.math.BigDecimal.ZERO) > 0)
                ? req.getTotalAmount()
                : originalTotalWithVat;

        // If the initial totalAmount was recorded without VAT (raw subtotal), normalize it to originalTotalWithVat
        if (initialPaid.compareTo(originalSubtotal.setScale(2, java.math.RoundingMode.HALF_UP)) == 0) {
            initialPaid = originalTotalWithVat;
        }

        java.math.BigDecimal fulfilledTotalWithVat;
        java.math.BigDecimal leftoverRefund = java.math.BigDecimal.ZERO;
        java.math.BigDecimal remainingDue = java.math.BigDecimal.ZERO;

        if (totalApproved == totalRequested) {
            // Exact fulfillment: delivered value matches initial authorized billing exactly. No additional fee!
            fulfilledTotalWithVat = initialPaid;
            leftoverRefund = java.math.BigDecimal.ZERO;
            remainingDue = java.math.BigDecimal.ZERO;
        } else if (totalApproved < totalRequested) {
            fulfilledTotalWithVat = fulfilledSubtotal.multiply(vatMultiplier).setScale(2, java.math.RoundingMode.HALF_UP);
            if (fulfilledTotalWithVat.compareTo(initialPaid) < 0) {
                leftoverRefund = initialPaid.subtract(fulfilledTotalWithVat).max(java.math.BigDecimal.ZERO);
            }
        } else {
            fulfilledTotalWithVat = fulfilledSubtotal.multiply(vatMultiplier).setScale(2, java.math.RoundingMode.HALF_UP);
            if (fulfilledTotalWithVat.compareTo(initialPaid) > 0) {
                remainingDue = fulfilledTotalWithVat.subtract(initialPaid);
            }
        }

        req.setTotalAmount(initialPaid);
        req.setFulfilledAmount(fulfilledTotalWithVat);
        req.setRefundAmount(leftoverRefund);
        req.setDueAmount(remainingDue);

        if ("REJECTED".equals(req.getStatus())) {
            req.setPaymentStatus("REFUNDED_FULL");
        } else if (remainingDue.compareTo(java.math.BigDecimal.ZERO) > 0) {
            req.setPaymentStatus("ADDITIONAL_PAYMENT_DUE");
        } else if (leftoverRefund.compareTo(java.math.BigDecimal.ZERO) > 0) {
            req.setPaymentStatus("PARTIALLY_SETTLED_REFUNDED");
        } else {
            req.setPaymentStatus("PAID_SETTLED");
        }

        if (reviewDto.getAdminRemarks() != null && !reviewDto.getAdminRemarks().trim().isEmpty()) {
            req.setAdminRemarks(reviewDto.getAdminRemarks().trim());
        }

        req.setUpdatedAt(LocalDateTime.now());
        StockRequisition saved = requisitionRepository.save(req);


        SupplierProfile sp = supplierProfileRepository.findById(req.getSupplierId()).orElse(null);
        enrichRequisition(saved, sp);
        saved.setItems(items);
        saved.setTotalRequestedCases(totalRequested);
        saved.setTotalApprovedCases(totalApproved);

        if (leftoverRefund.compareTo(java.math.BigDecimal.ZERO) > 0) {
            try {
                if (sp != null) {
                    java.math.BigDecimal cur = sp.getWalletBalance() != null ? sp.getWalletBalance() : java.math.BigDecimal.ZERO;
                    sp.setWalletBalance(cur.add(leftoverRefund));
                    supplierProfileRepository.save(sp);
                }
                SupplierTransaction refTx = new SupplierTransaction(
                        "TXN-" + System.currentTimeMillis() + "-" + (100 + new Random().nextInt(900)),
                        saved.getSupplierId(),
                        saved.getId(),
                        null,
                        saved.getRequisitionCode(),
                        "SHORTFALL_REFUND",
                        "CREDIT",
                        leftoverRefund,
                        saved.getPaymentMethod(),
                        "Automated shortfall refund for requisition " + saved.getRequisitionCode() + " (" + (totalRequested - totalApproved) + " cases unfulfilled)",
                        "COMPLETED"
                );
                supplierTransactionRepository.save(refTx);
            } catch (Exception ex) {
                System.err.println("[Transaction Error] Shortfall refund transaction record failed: " + ex.getMessage());
            }
        }

        // Real-time Notification for Supplier with leftover refund disclosure
        try {
            Long supplierUserId = sp != null ? sp.getUserId() : null;
            String statusBadge = saved.getStatus().replace('_', ' ');
            String remarksPart = (reviewDto.getAdminRemarks() != null && !reviewDto.getAdminRemarks().trim().isEmpty())
                    ? " Remarks: " + reviewDto.getAdminRemarks().trim()
                    : "";
            String refundPart = leftoverRefund.compareTo(java.math.BigDecimal.ZERO) > 0
                    ? " Leftover amount of ৳" + leftoverRefund.setScale(2, java.math.RoundingMode.HALF_UP) + " has been returned/refunded to your " + (saved.getPaymentMethod() != null ? saved.getPaymentMethod().replace('_', ' ') : "payment") + " account."
                    : "";
            String duePart = remainingDue.compareTo(java.math.BigDecimal.ZERO) > 0
                    ? " Additional stock was allocated! An additional balance due of ৳" + remainingDue.setScale(2, java.math.RoundingMode.HALF_UP) + " is pending on your invoice. Please complete the remaining payment."
                    : "";

            String msg = "Superadmin has processed requisition " + saved.getRequisitionCode() +
                    ". Decision: " + statusBadge + " (" + totalApproved + "/" + totalRequested + " cases permitted)." + refundPart + duePart + remarksPart;

            AppNotification supplierNotification = new AppNotification(
                    "SUPPLIER",
                    supplierUserId,
                    "Stock Requisition " + statusBadge + ": " + saved.getRequisitionCode(),
                    msg,
                    saved.getStatus(),
                    saved.getRequisitionCode(),
                    saved.getId()
            );
            notificationRepository.save(supplierNotification);
        } catch (Exception ex) {
            System.err.println("[Notification Error] Supplier notification creation failed: " + ex.getMessage());
        }

        return saved;
    }

    @Transactional
    public StockRequisition settleDuePayment(Long requisitionId, String paymentMethod, String paymentRef) {
        StockRequisition req = requisitionRepository.findById(requisitionId)
                .orElseThrow(() -> new RuntimeException("Requisition not found with id: " + requisitionId));

        if (req.getDueAmount() == null || req.getDueAmount().compareTo(java.math.BigDecimal.ZERO) <= 0) {
            throw new RuntimeException("No remaining balance due for requisition: " + req.getRequisitionCode());
        }

        java.math.BigDecimal settledDue = req.getDueAmount();
        req.setTotalAmount(req.getFulfilledAmount());
        req.setDueAmount(java.math.BigDecimal.ZERO);
        req.setPaymentStatus("PAID_SETTLED");
        if (paymentMethod != null && !paymentMethod.trim().isEmpty()) {
            req.setPaymentMethod(paymentMethod);
        }
        if (paymentRef != null && !paymentRef.trim().isEmpty()) {
            req.setPaymentReference(paymentRef);
        }
        req.setUpdatedAt(LocalDateTime.now());
        StockRequisition saved = requisitionRepository.save(req);

        try {
            SupplierTransaction dueTx = new SupplierTransaction(
                    "TXN-" + System.currentTimeMillis() + "-" + (100 + new Random().nextInt(900)),
                    saved.getSupplierId(),
                    saved.getId(),
                    null,
                    saved.getRequisitionCode(),
                    "DUE_SETTLEMENT",
                    "DEBIT",
                    settledDue,
                    paymentMethod != null ? paymentMethod : saved.getPaymentMethod(),
                    "Additional balance due payment settled for requisition " + saved.getRequisitionCode(),
                    "COMPLETED"
            );
            supplierTransactionRepository.save(dueTx);
        } catch (Exception ex) {
            System.err.println("[Transaction Error] Due settlement transaction record failed: " + ex.getMessage());
        }



        try {
            SupplierProfile sp = supplierProfileRepository.findById(saved.getSupplierId()).orElse(null);
            Long supplierUserId = sp != null ? sp.getUserId() : null;

            AppNotification supplierNotif = new AppNotification(
                    "SUPPLIER",
                    supplierUserId,
                    "Payment Settled: " + saved.getRequisitionCode(),
                    "Your remaining balance payment of ৳" + settledDue.setScale(2, java.math.RoundingMode.HALF_UP) + " has been successfully settled for requisition " + saved.getRequisitionCode() + ".",
                    "PAID_SETTLED",
                    saved.getRequisitionCode(),
                    saved.getId()
            );
            notificationRepository.save(supplierNotif);

            AppNotification superadminNotif = new AppNotification(
                    "SUPERADMIN",
                    null,
                    "Requisition Due Balance Paid: " + saved.getRequisitionCode(),
                    "Supplier " + (sp != null ? sp.getBusinessName() : "N/A") + " has paid the additional balance due of ৳" + settledDue.setScale(2, java.math.RoundingMode.HALF_UP) + " for requisition " + saved.getRequisitionCode() + ".",
                    "PAID_SETTLED",
                    saved.getRequisitionCode(),
                    saved.getId()
            );
            notificationRepository.save(superadminNotif);
        } catch (Exception ex) {
            System.err.println("[Notification Error] Settlement notification failed: " + ex.getMessage());
        }

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

    private void reduceDistrictStock(Long districtId, Long productId, int qty) {
        districtInventoryRepository.findByDistrictIdAndProductId(districtId, productId).ifPresent(di -> {
            int newStock = Math.max(0, di.getCurrentStock() - qty);
            di.setCurrentStock(newStock);
            districtInventoryRepository.save(di);
        });
    }

    private void deductCentralStock(Long productId, int qty) {
        centralInventoryRepository.findByProductId(productId).ifPresent(ci -> {
            int newAvailable = Math.max(0, ci.getAvailableStock() - qty);
            ci.setAvailableStock(newAvailable);
            ci.setUpdatedAt(LocalDateTime.now());
            centralInventoryRepository.save(ci);
        });
    }

    private void restoreCentralStock(Long productId, int qty) {
        centralInventoryRepository.findByProductId(productId).ifPresent(ci -> {
            ci.setAvailableStock(ci.getAvailableStock() + qty);
            ci.setUpdatedAt(LocalDateTime.now());
            centralInventoryRepository.save(ci);
        });
    }

    public List<CentralInventory> getCentralInventory() {
        List<CentralInventory> list = centralInventoryRepository.findAll();
        Map<Long, Product> prodMap = productRepository.findAll().stream()
                .collect(Collectors.toMap(Product::getProductId, p -> p, (a, b) -> a));
        for (CentralInventory ci : list) {
            Product p = prodMap.get(ci.getProductId());
            if (p != null) {
                ci.setBrand(p.getBrand());
                ci.setFlavorVariant(p.getFlavorVariant());
                ci.setSku(p.getSku());
                if (p.getCategory() != null) ci.setCategory(p.getCategory());
            }
        }
        return list;
    }

    private void batchEnrichRequisitions(List<StockRequisition> requisitions) {
        if (requisitions == null || requisitions.isEmpty()) return;

        Map<Long, SupplierProfile> supMap = supplierProfileRepository.findAll().stream()
                .collect(Collectors.toMap(SupplierProfile::getId, s -> s, (a, b) -> a));
        Map<Long, District> distMap = districtRepository.findAll().stream()
                .collect(Collectors.toMap(District::getId, d -> d, (a, b) -> a));
        Map<Long, Product> prodMap = productRepository.findAll().stream()
                .collect(Collectors.toMap(Product::getProductId, p -> p, (a, b) -> a));
        List<StockRequisitionItem> allItems = requisitionItemRepository.findAll();
        Map<Long, List<StockRequisitionItem>> itemsByReq = allItems.stream()
                .collect(Collectors.groupingBy(StockRequisitionItem::getRequisitionId));

        for (StockRequisition req : requisitions) {
            SupplierProfile sp = supMap.get(req.getSupplierId());
            if (sp != null) {
                req.setSupplierName(sp.getBusinessName());
            }
            if (req.getDistrictId() != null) {
                District d = distMap.get(req.getDistrictId());
                if (d != null) {
                    req.setDistrictName(d.getName());
                    req.setDivisionName(d.getDivision());
                }
            }

            List<StockRequisitionItem> items = itemsByReq.getOrDefault(req.getId(), new ArrayList<>());
            req.setItems(items);
            int reqCases = 0;
            int appCases = 0;
            java.math.BigDecimal originalSubtotal = java.math.BigDecimal.ZERO;
            java.math.BigDecimal fulfilledSubtotal = java.math.BigDecimal.ZERO;

            for (StockRequisitionItem i : items) {
                int rQty = (i.getRequestedQuantity() != null ? i.getRequestedQuantity() : 0);
                int aQty = (i.getApprovedQuantity() != null ? i.getApprovedQuantity() : 0);
                reqCases += rQty;
                appCases += aQty;

                Product p = prodMap.get(i.getProductId());
                if (p != null) {
                    i.setBrand(p.getBrand());
                    i.setFlavorVariant(p.getFlavorVariant());
                    i.setPackaging(p.getPackaging());
                    i.setSizeVolume(p.getSizeVolume());
                    i.setSku(p.getSku());
                    java.math.BigDecimal supplierRate = p.getSupplierPrice() != null ? p.getSupplierPrice() : p.getBasePrice();
                    i.setBasePrice(supplierRate);

                    java.math.BigDecimal price = supplierRate != null ? supplierRate : java.math.BigDecimal.valueOf(48.0);
                    originalSubtotal = originalSubtotal.add(price.multiply(java.math.BigDecimal.valueOf(rQty)));
                    fulfilledSubtotal = fulfilledSubtotal.add(price.multiply(java.math.BigDecimal.valueOf(aQty)));
                }
            }
            req.setTotalRequestedCases(reqCases);
            req.setTotalApprovedCases(appCases);

            java.math.BigDecimal vatMultiplier = java.math.BigDecimal.valueOf(1.05);
            java.math.BigDecimal calcOriginalWithVat = originalSubtotal.multiply(vatMultiplier).setScale(2, java.math.RoundingMode.HALF_UP);
            java.math.BigDecimal calcFulfilledWithVat = fulfilledSubtotal.multiply(vatMultiplier).setScale(2, java.math.RoundingMode.HALF_UP);

            if (req.getTotalAmount() == null || req.getTotalAmount().compareTo(java.math.BigDecimal.ZERO) == 0) {
                req.setTotalAmount(calcOriginalWithVat);
            }

            if (req.getFulfilledAmount() == null) {
                if ("APPROVED".equalsIgnoreCase(req.getStatus())) {
                    req.setFulfilledAmount(req.getTotalAmount());
                } else if ("REJECTED".equalsIgnoreCase(req.getStatus())) {
                    req.setFulfilledAmount(java.math.BigDecimal.ZERO);
                } else if ("PARTIALLY_APPROVED".equalsIgnoreCase(req.getStatus())) {
                    req.setFulfilledAmount(calcFulfilledWithVat);
                }
            }

            if (req.getRefundAmount() == null) {
                if ("REJECTED".equalsIgnoreCase(req.getStatus())) {
                    req.setRefundAmount(req.getTotalAmount());
                } else if ("PARTIALLY_APPROVED".equalsIgnoreCase(req.getStatus())) {
                    java.math.BigDecimal diff = req.getTotalAmount().subtract(req.getFulfilledAmount() != null ? req.getFulfilledAmount() : calcFulfilledWithVat);
                    req.setRefundAmount(diff.compareTo(java.math.BigDecimal.ZERO) > 0 ? diff : java.math.BigDecimal.ZERO);
                } else {
                    req.setRefundAmount(java.math.BigDecimal.ZERO);
                }
            }
        }
    }

    private void enrichProfile(SupplierProfile profile) {
        if (profile.getPrimaryDistrictId() != null) {
            districtRepository.findById(profile.getPrimaryDistrictId()).ifPresent(d -> {
                profile.setDistrictName(d.getName());
                if (profile.getDivisionName() == null || profile.getDivisionName().trim().isEmpty()) {
                    profile.setDivisionName(d.getDivision());
                }
            });
        }

        String coveredIdsStr = profile.getCoveredDistrictIds();
        List<Long> idList = new ArrayList<>();
        if (coveredIdsStr != null && !coveredIdsStr.trim().isEmpty()) {
            for (String s : coveredIdsStr.split(",")) {
                String trimmed = s.trim();
                if (!trimmed.isEmpty()) {
                    try {
                        idList.add(Long.parseLong(trimmed));
                    } catch (NumberFormatException ignored) {}
                }
            }
        }
        if (idList.isEmpty() && profile.getPrimaryDistrictId() != null) {
            idList.add(profile.getPrimaryDistrictId());
        }

        List<Map<String, Object>> assignedDistricts = new ArrayList<>();
        for (Long dId : idList) {
            districtRepository.findById(dId).ifPresent(d -> {
                Map<String, Object> map = new HashMap<>();
                map.put("id", d.getId());
                map.put("name", d.getName());
                map.put("division", d.getDivision());
                assignedDistricts.add(map);
            });
        }

        profile.setCoveredDistrictIdsList(idList);
        profile.setAssignedDistricts(assignedDistricts);

        if (profile.getUserId() != null) {
            userRepository.findById(profile.getUserId()).ifPresent(u -> {
                profile.setUserEmail(u.getEmail());
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
        java.math.BigDecimal originalSubtotal = java.math.BigDecimal.ZERO;
        java.math.BigDecimal fulfilledSubtotal = java.math.BigDecimal.ZERO;

        for (StockRequisitionItem i : items) {
            int rQty = (i.getRequestedQuantity() != null ? i.getRequestedQuantity() : 0);
            int aQty = (i.getApprovedQuantity() != null ? i.getApprovedQuantity() : 0);
            reqCases += rQty;
            appCases += aQty;

            Product p = productRepository.findById(i.getProductId()).orElse(null);
            if (p != null) {
                i.setBrand(p.getBrand());
                i.setFlavorVariant(p.getFlavorVariant());
                i.setPackaging(p.getPackaging());
                i.setSizeVolume(p.getSizeVolume());
                i.setSku(p.getSku());
                java.math.BigDecimal supplierRate = p.getSupplierPrice() != null ? p.getSupplierPrice() : p.getBasePrice();
                i.setBasePrice(supplierRate);

                java.math.BigDecimal price = supplierRate != null ? supplierRate : java.math.BigDecimal.valueOf(48.0);
                originalSubtotal = originalSubtotal.add(price.multiply(java.math.BigDecimal.valueOf(rQty)));
                fulfilledSubtotal = fulfilledSubtotal.add(price.multiply(java.math.BigDecimal.valueOf(aQty)));
            }
        }
        req.setTotalRequestedCases(reqCases);
        req.setTotalApprovedCases(appCases);

        java.math.BigDecimal vatMultiplier = java.math.BigDecimal.valueOf(1.05);
        java.math.BigDecimal calcOriginalWithVat = originalSubtotal.multiply(vatMultiplier).setScale(2, java.math.RoundingMode.HALF_UP);
        java.math.BigDecimal calcFulfilledWithVat = fulfilledSubtotal.multiply(vatMultiplier).setScale(2, java.math.RoundingMode.HALF_UP);

        if (req.getTotalAmount() == null || req.getTotalAmount().compareTo(java.math.BigDecimal.ZERO) == 0) {
            req.setTotalAmount(calcOriginalWithVat);
        }

        if (req.getFulfilledAmount() == null) {
            if ("APPROVED".equalsIgnoreCase(req.getStatus())) {
                req.setFulfilledAmount(req.getTotalAmount());
            } else if ("REJECTED".equalsIgnoreCase(req.getStatus())) {
                req.setFulfilledAmount(java.math.BigDecimal.ZERO);
            } else if ("PARTIALLY_APPROVED".equalsIgnoreCase(req.getStatus())) {
                req.setFulfilledAmount(calcFulfilledWithVat);
            }
        }

        if (req.getRefundAmount() == null) {
            if ("REJECTED".equalsIgnoreCase(req.getStatus())) {
                req.setRefundAmount(req.getTotalAmount());
            } else if ("PARTIALLY_APPROVED".equalsIgnoreCase(req.getStatus())) {
                java.math.BigDecimal diff = req.getTotalAmount().subtract(req.getFulfilledAmount() != null ? req.getFulfilledAmount() : calcFulfilledWithVat);
                req.setRefundAmount(diff.compareTo(java.math.BigDecimal.ZERO) > 0 ? diff : java.math.BigDecimal.ZERO);
            } else {
                req.setRefundAmount(java.math.BigDecimal.ZERO);
            }
        }

        if (req.getInvoiceNumber() == null && req.getRequisitionCode() != null) {
            req.setInvoiceNumber("INV-" + req.getRequisitionCode().replace("REQ-", ""));
        }
        if (req.getPaymentMethod() == null) {
            req.setPaymentMethod("CORPORATE_BANK_TRANSFER");
        }
        if (req.getPaymentStatus() == null) {
            if ("REJECTED".equalsIgnoreCase(req.getStatus())) {
                req.setPaymentStatus("REFUNDED_FULL");
            } else if ("PARTIALLY_APPROVED".equalsIgnoreCase(req.getStatus()) && req.getRefundAmount() != null && req.getRefundAmount().compareTo(java.math.BigDecimal.ZERO) > 0) {
                req.setPaymentStatus("PARTIALLY_SETTLED_REFUNDED");
            } else if ("APPROVED".equalsIgnoreCase(req.getStatus())) {
                req.setPaymentStatus("PAID_SETTLED");
            } else {
                req.setPaymentStatus("AUTHORIZED");
            }
        }
    }

    // ==========================================
    // STOCK RETURN & REFUND / EXCHANGE WORKFLOWS
    // ==========================================

    @Transactional
    public StockReturnRequest createReturnRequest(Long userId, CreateReturnRequestDTO dto) {
        if (dto.getRequisitionId() == null) {
            throw new IllegalArgumentException("Requisition ID is required for return request.");
        }
        StockRequisition req = requisitionRepository.findById(dto.getRequisitionId())
                .orElseThrow(() -> new IllegalArgumentException("Requisition not found with ID: " + dto.getRequisitionId()));

        if (!"APPROVED".equalsIgnoreCase(req.getStatus()) && !"PARTIALLY_APPROVED".equalsIgnoreCase(req.getStatus())) {
            throw new IllegalStateException("Only approved or partially approved requisitions can be returned.");
        }

        SupplierProfile profile = getSupplierProfile(userId);

        if (dto.getItems() == null || dto.getItems().isEmpty()) {
            throw new IllegalArgumentException("At least one product item must be specified for return.");
        }

        if (dto.getReasonCategory() == null || dto.getReasonCategory().trim().isEmpty()) {
            throw new IllegalArgumentException("A valid return reason category is required by return policy.");
        }
        if (dto.getReasonDetails() == null || dto.getReasonDetails().trim().isEmpty()) {
            throw new IllegalArgumentException("Detailed explanation for return is required.");
        }

        String year = String.valueOf(LocalDateTime.now().getYear());
        int randomCode = 1000 + new Random().nextInt(9000);
        String returnCode = "RET-" + year + "-" + randomCode;
        while (stockReturnRequestRepository.findByReturnCode(returnCode).isPresent()) {
            randomCode = 1000 + new Random().nextInt(9000);
            returnCode = "RET-" + year + "-" + randomCode;
        }

        StockReturnRequest returnReq = new StockReturnRequest();
        returnReq.setReturnCode(returnCode);
        returnReq.setRequisitionId(req.getId());
        returnReq.setRequisitionCode(req.getRequisitionCode());
        returnReq.setSupplierId(profile.getId());
        returnReq.setDistrictId(req.getDistrictId());
        returnReq.setReturnType(dto.getReturnType() != null ? dto.getReturnType().toUpperCase() : "REFUND_CASH");
        returnReq.setStatus("PENDING_REVIEW");
        returnReq.setReasonCategory(dto.getReasonCategory().trim());
        returnReq.setReasonDetails(dto.getReasonDetails().trim());

        List<StockRequisitionItem> reqItems = requisitionItemRepository.findByRequisitionId(req.getId());
        Map<Long, StockRequisitionItem> reqItemMap = new HashMap<>();
        for (StockRequisitionItem ri : reqItems) {
            reqItemMap.put(ri.getProductId(), ri);
        }

        int totalReturnedCases = 0;
        int totalKeptCases = 0;
        java.math.BigDecimal subtotalReturn = java.math.BigDecimal.ZERO;

        List<StockReturnItem> itemsToSave = new ArrayList<>();

        for (CreateReturnRequestDTO.ItemReturnDetail itemDetail : dto.getItems()) {
            Long prodId = itemDetail.getProductId();
            int returnedQty = itemDetail.getReturnedQuantity() != null ? Math.max(0, itemDetail.getReturnedQuantity()) : 0;
            int keptQty = itemDetail.getKeptQuantity() != null ? Math.max(0, itemDetail.getKeptQuantity()) : 0;

            if (returnedQty == 0 && keptQty == 0) continue;

            Product product = productRepository.findById(prodId).orElse(null);
            java.math.BigDecimal unitPrice = (product != null && product.getBasePrice() != null)
                    ? product.getBasePrice()
                    : java.math.BigDecimal.valueOf(48.0);

            int receivedQty = returnedQty + keptQty;
            StockRequisitionItem originalItem = reqItemMap.get(prodId);
            if (originalItem != null && originalItem.getApprovedQuantity() != null) {
                receivedQty = originalItem.getApprovedQuantity();
            }

            java.math.BigDecimal lineTotal = unitPrice.multiply(java.math.BigDecimal.valueOf(returnedQty));
            subtotalReturn = subtotalReturn.add(lineTotal);
            totalReturnedCases += returnedQty;
            totalKeptCases += keptQty;

            StockReturnItem returnItem = new StockReturnItem();
            returnItem.setProductId(prodId);
            returnItem.setReceivedQuantity(receivedQty);
            returnItem.setKeptQuantity(keptQty);
            returnItem.setReturnedQuantity(returnedQty);
            returnItem.setUnitPrice(unitPrice);
            returnItem.setLineTotal(lineTotal);
            itemsToSave.add(returnItem);
        }

        if (totalReturnedCases == 0) {
            throw new IllegalArgumentException("Returned quantity must be greater than 0 cases.");
        }

        // Apply 5% wholesale distribution VAT to refund calculation
        java.math.BigDecimal totalRefundWithVat = subtotalReturn.multiply(java.math.BigDecimal.valueOf(1.05))
                .setScale(2, java.math.RoundingMode.HALF_UP);

        returnReq.setReturnedQuantity(totalReturnedCases);
        returnReq.setKeptQuantity(totalKeptCases);
        returnReq.setRefundAmount(totalRefundWithVat);

        if ("EXCHANGE_PRODUCT".equalsIgnoreCase(returnReq.getReturnType())) {
            returnReq.setReplacementProductId(dto.getReplacementProductId());
            returnReq.setReplacementQuantity(dto.getReplacementQuantity() != null ? dto.getReplacementQuantity() : totalReturnedCases);
            if (dto.getReplacementProductId() != null) {
                productRepository.findById(dto.getReplacementProductId()).ifPresent(p -> {
                    returnReq.setReplacementProductName(p.getBrand() + " " + p.getFlavorVariant() + " (" + p.getSizeVolume() + ")");
                });
            }
        }

        returnReq.setCreatedAt(LocalDateTime.now());
        returnReq.setUpdatedAt(LocalDateTime.now());
        StockReturnRequest savedReturn = stockReturnRequestRepository.save(returnReq);

        for (StockReturnItem item : itemsToSave) {
            item.setReturnRequestId(savedReturn.getId());
        }
        stockReturnItemRepository.saveAll(itemsToSave);

        savedReturn.setItems(itemsToSave);
        enrichReturnRequest(savedReturn);

        // Notify Superadmin
        try {
            String modeStr = "REFUND_CASH".equalsIgnoreCase(savedReturn.getReturnType()) ? "Cash Refund" : "Product Replacement/Exchange";
            String msg = "Supplier " + profile.getBusinessName() + " has filed a return request (" + savedReturn.getReturnCode() +
                    ") for Requisition " + req.getRequisitionCode() + ". " + totalReturnedCases + " cases returned (" + modeStr + "). Reason: " +
                    savedReturn.getReasonCategory() + " - " + savedReturn.getReasonDetails();

            AppNotification notif = new AppNotification(
                    "SUPERADMIN",
                    null,
                    "New Stock Return Request: " + savedReturn.getReturnCode(),
                    msg,
                    "RETURN_REQUEST",
                    savedReturn.getReturnCode(),
                    savedReturn.getId()
            );
            notificationRepository.save(notif);
        } catch (Exception ex) {
            System.err.println("[Notification Error] Return request superadmin notification failed: " + ex.getMessage());
        }

        return savedReturn;
    }

    @Transactional
    public StockReturnRequest processReturnDecision(Long returnId, ReturnReviewDTO reviewDto) {
        StockReturnRequest returnReq = stockReturnRequestRepository.findById(returnId)
                .orElseThrow(() -> new IllegalArgumentException("Return request not found with ID: " + returnId));

        if (!"PENDING_REVIEW".equalsIgnoreCase(returnReq.getStatus())) {
            throw new IllegalStateException("Return request has already been processed with status: " + returnReq.getStatus());
        }

        String decision = (reviewDto.getDecision() != null) ? reviewDto.getDecision().toUpperCase() : "APPROVE";
        returnReq.setAdminRemarks(reviewDto.getAdminRemarks());
        returnReq.setUpdatedAt(LocalDateTime.now());

        SupplierProfile profile = supplierProfileRepository.findById(returnReq.getSupplierId()).orElse(null);
        Long supplierUserId = profile != null ? profile.getUserId() : null;

        List<StockReturnItem> items = stockReturnItemRepository.findByReturnRequestId(returnReq.getId());

        if ("APPROVE".equalsIgnoreCase(decision)) {
            returnReq.setStatus("APPROVED");

            // 1. Return stock back from supplier's district inventory to central inventory
            for (StockReturnItem item : items) {
                if (item.getReturnedQuantity() != null && item.getReturnedQuantity() > 0) {
                    reduceDistrictStock(returnReq.getDistrictId(), item.getProductId(), item.getReturnedQuantity());
                    restoreCentralStock(item.getProductId(), item.getReturnedQuantity());
                }
            }

            // 2. Handle refund or exchange
            if ("REFUND_CASH".equalsIgnoreCase(returnReq.getReturnType())) {
                if (profile != null && returnReq.getRefundAmount() != null) {
                    java.math.BigDecimal cur = profile.getWalletBalance() != null ? profile.getWalletBalance() : java.math.BigDecimal.ZERO;
                    profile.setWalletBalance(cur.add(returnReq.getRefundAmount()));
                    supplierProfileRepository.saveAndFlush(profile);
                    try {
                        jdbcTemplate.update("UPDATE supplier_profiles SET wallet_balance = ?, updated_at = NOW() WHERE id = ?", profile.getWalletBalance(), profile.getId());
                    } catch (Exception ignored) {}
                }
                // Record CREDIT transaction for refund
                SupplierTransaction tx = new SupplierTransaction(
                        "TXN-" + System.currentTimeMillis() + "-" + (100 + new Random().nextInt(900)),
                        returnReq.getSupplierId(),
                        returnReq.getRequisitionId(),
                        returnReq.getId(),
                        returnReq.getReturnCode(),
                        "STOCK_RETURN_REFUND",
                        "CREDIT",
                        returnReq.getRefundAmount(),
                        profile != null ? profile.getDefaultPaymentMethod() : "CORPORATE_BANK_TRANSFER",
                        "Policy-approved cash refund for returned stock on " + returnReq.getReturnCode() + " (" + returnReq.getReturnedQuantity() + " cases).",
                        "COMPLETED"
                );
                supplierTransactionRepository.saveAndFlush(tx);

// Requisition refund metrics preserved; return refund tracked in StockReturnRequest and SupplierTransaction

            } else if ("EXCHANGE_PRODUCT".equalsIgnoreCase(returnReq.getReturnType())) {
                // Exchange: allocate replacement product to supplier district and deduct from central
                if (returnReq.getReplacementProductId() != null && returnReq.getReplacementQuantity() != null && returnReq.getReplacementQuantity() > 0) {
                    deductCentralStock(returnReq.getReplacementProductId(), returnReq.getReplacementQuantity());
                    allocateDistrictStock(returnReq.getDistrictId(), returnReq.getReplacementProductId(), returnReq.getReplacementQuantity());
                }

                SupplierTransaction tx = new SupplierTransaction(
                        "TXN-" + System.currentTimeMillis() + "-" + (100 + new Random().nextInt(900)),
                        returnReq.getSupplierId(),
                        returnReq.getRequisitionId(),
                        returnReq.getId(),
                        returnReq.getReturnCode(),
                        "PRODUCT_EXCHANGE",
                        "CREDIT",
                        returnReq.getRefundAmount(),
                        "STOCK_EXCHANGE_VOUCHER",
                        "Replacement exchange approved: Returned " + returnReq.getReturnedQuantity() + " cases, Dispatched " +
                                returnReq.getReplacementQuantity() + " cases of " +
                                (returnReq.getReplacementProductName() != null ? returnReq.getReplacementProductName() : "replacement product") + ".",
                        "COMPLETED"
                );
                supplierTransactionRepository.save(tx);
            }

            // Notify Supplier of approval
            try {
                String refundOrExchangeMsg = "REFUND_CASH".equalsIgnoreCase(returnReq.getReturnType())
                        ? "A cash refund of ৳" + returnReq.getRefundAmount() + " has been credited to your account."
                        : "Replacement stock of " + returnReq.getReplacementQuantity() + " cases (" + returnReq.getReplacementProductName() + ") has been dispatched to your depot.";

                String remarksPart = (reviewDto.getAdminRemarks() != null && !reviewDto.getAdminRemarks().trim().isEmpty())
                        ? " Remarks: " + reviewDto.getAdminRemarks().trim()
                        : "";

                AppNotification notif = new AppNotification(
                        "SUPPLIER",
                        supplierUserId,
                        "Stock Return Approved: " + returnReq.getReturnCode(),
                        "Your return request for " + returnReq.getRequisitionCode() + " has been APPROVED. " + refundOrExchangeMsg + remarksPart,
                        "RETURN_APPROVED",
                        returnReq.getReturnCode(),
                        returnReq.getId()
                );
                notificationRepository.save(notif);
            } catch (Exception ex) {
                System.err.println("[Notification Error] Return approval notification failed: " + ex.getMessage());
            }

        } else {
            returnReq.setStatus("REJECTED");

            // Notify Supplier of rejection
            try {
                String remarksPart = (reviewDto.getAdminRemarks() != null && !reviewDto.getAdminRemarks().trim().isEmpty())
                        ? " Reason from Admin: " + reviewDto.getAdminRemarks().trim()
                        : " Did not comply with wholesale return policy conditions.";

                AppNotification notif = new AppNotification(
                        "SUPPLIER",
                        supplierUserId,
                        "Stock Return Rejected: " + returnReq.getReturnCode(),
                        "Your return request " + returnReq.getReturnCode() + " for Requisition " + returnReq.getRequisitionCode() + " was REJECTED." + remarksPart,
                        "RETURN_REJECTED",
                        returnReq.getReturnCode(),
                        returnReq.getId()
                );
                notificationRepository.save(notif);
            } catch (Exception ex) {
                System.err.println("[Notification Error] Return rejection notification failed: " + ex.getMessage());
            }
        }

        StockReturnRequest saved = stockReturnRequestRepository.save(returnReq);
        saved.setItems(items);
        enrichReturnRequest(saved);
        return saved;
    }

    public List<StockReturnRequest> getSupplierReturnRequests(Long userId) {
        SupplierProfile profile = getSupplierProfile(userId);
        List<StockReturnRequest> list = stockReturnRequestRepository.findBySupplierIdOrderByCreatedAtDesc(profile.getId());
        for (StockReturnRequest r : list) {
            enrichReturnRequest(r);
        }
        return list;
    }

    public List<StockReturnRequest> getAllReturnRequestsForAdmin(String status) {
        List<StockReturnRequest> list;
        if (status != null && !status.trim().isEmpty() && !"ALL".equalsIgnoreCase(status)) {
            list = stockReturnRequestRepository.findByStatusOrderByCreatedAtDesc(status.toUpperCase());
        } else {
            list = stockReturnRequestRepository.findAllByOrderByCreatedAtDesc();
        }
        for (StockReturnRequest r : list) {
            enrichReturnRequest(r);
        }
        return list;
    }

        public List<Long> getOutletIdsForSupplier(SupplierProfile profile) {
        List<Long> outletIds = new ArrayList<>();
        if (profile == null) return outletIds;
        try {
            Long primaryDist = profile.getPrimaryDistrictId() != null ? profile.getPrimaryDistrictId() : 1L;
            List<String> coveredDists = profile.getCoveredDistrictIds() != null
                ? Arrays.asList(profile.getCoveredDistrictIds().split(","))
                : Collections.emptyList();
            String division = profile.getDivisionName();

            List<Map<String, Object>> outletRows = jdbcTemplate.queryForList("SELECT outlet_id, district_id, city FROM outlets");
            for (Map<String, Object> o : outletRows) {
                Long oId = ((Number) o.get("outlet_id")).longValue();
                Long oDist = o.get("district_id") != null ? ((Number) o.get("district_id")).longValue() : 1L;
                String city = (String) o.get("city");

                boolean matched = false;
                if (!coveredDists.isEmpty() && coveredDists.contains(String.valueOf(oDist))) {
                    matched = true;
                } else if (primaryDist.equals(oDist)) {
                    matched = true;
                } else if (division != null && city != null && division.equalsIgnoreCase(city)) {
                    matched = true;
                }
                if (matched) {
                    outletIds.add(oId);
                }
            }
        } catch (Exception ignored) {}
        return outletIds;
    }

    @Transactional
    public SupplierFinancialSummaryDTO getSupplierFinancialSummary(Long userId) {
        return getSupplierFinancialSummary(userId, null);
    }

    @Transactional
    public SupplierFinancialSummaryDTO getSupplierFinancialSummary(Long userId, Long supplierIdParam) {
        SupplierProfile profile = resolveSupplierProfile(userId, supplierIdParam);
        Long supplierId = profile.getId();

        // 1. Backfill legacy requisitions ONLY if NO transactions exist for them at all
        List<StockRequisition> requisitions = requisitionRepository.findBySupplierIdOrderByCreatedAtDesc(supplierId);
        for (StockRequisition req : requisitions) {
            List<SupplierTransaction> existingTx = supplierTransactionRepository.findByRequisitionId(req.getId());
            if (existingTx.isEmpty()) {
                // Legacy requisition without any recorded transactions: backfill purchase
                java.math.BigDecimal amount = (req.getTotalAmount() != null && req.getTotalAmount().compareTo(java.math.BigDecimal.ZERO) > 0)
                        ? req.getTotalAmount()
                        : java.math.BigDecimal.valueOf(1000.0);
                SupplierTransaction tx = new SupplierTransaction(
                        "TXN-" + req.getId() + "-PUR",
                        supplierId,
                        req.getId(),
                        null,
                        req.getRequisitionCode(),
                        "STOCK_PURCHASE",
                        "DEBIT",
                        amount,
                        req.getPaymentMethod() != null ? req.getPaymentMethod() : profile.getDefaultPaymentMethod(),
                        "Initial stock requisition purchase for " + req.getRequisitionCode(),
                        "COMPLETED"
                );
                if (req.getCreatedAt() != null) {
                    tx.setCreatedAt(req.getCreatedAt());
                }
                supplierTransactionRepository.save(tx);

                // Backfill shortfall refund ONLY if requisition was REJECTED or PARTIALLY_APPROVED
                if ("REJECTED".equalsIgnoreCase(req.getStatus())) {
                    SupplierTransaction refTx = new SupplierTransaction(
                            "TXN-" + req.getId() + "-REF",
                            supplierId,
                            req.getId(),
                            null,
                            req.getRequisitionCode(),
                            "SHORTFALL_REFUND",
                            "CREDIT",
                            amount,
                            req.getPaymentMethod() != null ? req.getPaymentMethod() : profile.getDefaultPaymentMethod(),
                            "Full rejection refund for requisition " + req.getRequisitionCode(),
                            "COMPLETED"
                    );
                    if (req.getUpdatedAt() != null) {
                        refTx.setCreatedAt(req.getUpdatedAt());
                    }
                    supplierTransactionRepository.save(refTx);
                } else if ("PARTIALLY_APPROVED".equalsIgnoreCase(req.getStatus())) {
                    java.math.BigDecimal shortfall = (req.getRefundAmount() != null && req.getRefundAmount().compareTo(java.math.BigDecimal.ZERO) > 0)
                            ? req.getRefundAmount()
                            : (req.getTotalAmount() != null && req.getFulfilledAmount() != null ? req.getTotalAmount().subtract(req.getFulfilledAmount()) : java.math.BigDecimal.ZERO);
                    if (shortfall.compareTo(java.math.BigDecimal.ZERO) > 0) {
                        SupplierTransaction refTx = new SupplierTransaction(
                                "TXN-" + req.getId() + "-REF",
                                supplierId,
                                req.getId(),
                                null,
                                req.getRequisitionCode(),
                                "SHORTFALL_REFUND",
                                "CREDIT",
                                shortfall,
                                req.getPaymentMethod() != null ? req.getPaymentMethod() : profile.getDefaultPaymentMethod(),
                                "Shortfall refund for unfulfilled stock on " + req.getRequisitionCode(),
                                "COMPLETED"
                        );
                        if (req.getUpdatedAt() != null) {
                            refTx.setCreatedAt(req.getUpdatedAt());
                        }
                        supplierTransactionRepository.save(refTx);
                    }
                }
            }
        }

        // 1b. Backfill legacy dispatched outlet requisitions to supplier_transactions so past sales are NEVER lost
        try {
            List<Long> supplierOutletIds = getOutletIdsForSupplier(profile);
            if (!supplierOutletIds.isEmpty()) {
                String outletInSql = supplierOutletIds.stream().map(String::valueOf).collect(java.util.stream.Collectors.joining(","));
                List<Map<String, Object>> dispatchedReqs = jdbcTemplate.queryForList(
                    "SELECT id, requisition_code, outlet_id, product_name, quantity, unit_price, total_amount, created_date " +
                    "FROM outlet_requisitions WHERE status = 'DISPATCHED' AND outlet_id IN (" + outletInSql + ")"
                );
                for (Map<String, Object> dReq : dispatchedReqs) {
                    String refCode = (String) dReq.get("requisition_code");
                    if (refCode != null) {
                        List<Map<String, Object>> existing = jdbcTemplate.queryForList(
                            "SELECT id FROM supplier_transactions WHERE reference_code = ? AND supplier_id = ?",
                            refCode, supplierId
                        );
                        if (existing.isEmpty()) {
                            java.math.BigDecimal amt = dReq.get("total_amount") != null
                                    ? new java.math.BigDecimal(dReq.get("total_amount").toString())
                                    : (dReq.get("unit_price") != null && dReq.get("quantity") != null
                                        ? new java.math.BigDecimal(dReq.get("unit_price").toString()).multiply(new java.math.BigDecimal(dReq.get("quantity").toString()))
                                        : java.math.BigDecimal.ZERO);
                            SupplierTransaction saleTx = new SupplierTransaction(
                                "TXN-OUT-" + System.currentTimeMillis() + "-" + (100 + new Random().nextInt(900)),
                                supplierId,
                                null,
                                null,
                                refCode,
                                "OUTLET_SALE",
                                "CREDIT",
                                amt,
                                "OUTLET_WHOLESALE",
                                "Wholesale delivery of " + dReq.get("quantity") + " units of " + dReq.get("product_name") + " (" + refCode + ")",
                                "COMPLETED"
                            );
                            if (dReq.get("created_date") != null) {
                                try {
                                    saleTx.setCreatedAt(LocalDateTime.parse(dReq.get("created_date").toString().replace(" ", "T")));
                                } catch (Exception ignored) {}
                            }
                            supplierTransactionRepository.saveAndFlush(saleTx);
                        }
                    }
                }
            }
        } catch (Exception ex) {
            System.err.println("[Backfill Warning] Dispatched outlet requisitions backfill: " + ex.getMessage());
        }

        // 2. Fetch all transactions for this supplier
        List<SupplierTransaction> txList = supplierTransactionRepository.findBySupplierIdOrderByCreatedAtDesc(supplierId);

        java.math.BigDecimal totalSpent = java.math.BigDecimal.ZERO;
        java.math.BigDecimal totalRefunded = java.math.BigDecimal.ZERO;
        java.math.BigDecimal totalRevenue = java.math.BigDecimal.ZERO;
        java.math.BigDecimal totalWholesaleProfit = java.math.BigDecimal.ZERO;
        java.math.BigDecimal totalDeposited = java.math.BigDecimal.ZERO;

        for (SupplierTransaction tx : txList) {
            if ("COMPLETED".equalsIgnoreCase(tx.getStatus()) && tx.getAmount() != null) {
                String txType = tx.getType() != null ? tx.getType().toUpperCase() : "";
                String entryType = tx.getEntryType() != null ? tx.getEntryType().toUpperCase() : "";

                if ("WALLET_TOPUP".equals(txType) || "WALLET_DEPOSIT".equals(txType)) {
                    // Commercial Wallet top-up / deposit: Liquid wallet balance, NOT a refund!
                    totalDeposited = totalDeposited.add(tx.getAmount());
                } else if ("OUTLET_SALE".equals(txType) || "WHOLESALE_SALE".equals(txType)) {
                    // Direct wholesale revenue earned from outlet stock dispatches
                    totalRevenue = totalRevenue.add(tx.getAmount());
                } else if (txType.contains("REFUND") || "SHORTFALL_REFUND".equals(txType) || "STOCK_RETURN_REFUND".equals(txType)) {
                    // True product shortfall / returns cash refunds credited back to supplier
                    totalRefunded = totalRefunded.add(tx.getAmount());
                } else if ("DEBIT".equals(entryType) || "STOCK_PURCHASE".equals(txType)) {
                    // Product requisitions & stock purchases outflow
                    totalSpent = totalSpent.add(tx.getAmount());
                }
            }
        }

        // Calculate wholesale profit & revenue from dispatched outlet requisitions mapped to this supplier
        List<Long> underOutletIds = getOutletIdsForSupplier(profile);
        if (!underOutletIds.isEmpty()) {
            String inSql = underOutletIds.stream().map(String::valueOf).collect(java.util.stream.Collectors.joining(","));
            try {
                Double p = jdbcTemplate.queryForObject(
                    "SELECT COALESCE(SUM((r.unit_price - COALESCE(p.supplier_price, p.base_price, 0)) * r.quantity), 0) " +
                    "FROM outlet_requisitions r " +
                    "JOIN products p ON r.product_id = p.product_id " +
                    "WHERE r.status = 'DISPATCHED' AND r.outlet_id IN (" + inSql + ")",
                    Double.class
                );
                if (p != null) {
                    totalWholesaleProfit = java.math.BigDecimal.valueOf(p).setScale(2, java.math.RoundingMode.HALF_UP);
                }
            } catch (Exception ignored) {}

            try {
                Double rev = jdbcTemplate.queryForObject(
                    "SELECT COALESCE(SUM(COALESCE(r.total_amount, r.quantity * COALESCE(r.unit_price, p.outlet_price, 0))), 0) " +
                    "FROM outlet_requisitions r " +
                    "JOIN products p ON r.product_id = p.product_id " +
                    "WHERE r.status = 'DISPATCHED' AND r.outlet_id IN (" + inSql + ")",
                    Double.class
                );
                if (rev != null && rev > 0) {
                    totalRevenue = totalRevenue.add(java.math.BigDecimal.valueOf(rev).setScale(2, java.math.RoundingMode.HALF_UP));
                }
            } catch (Exception ignored) {}
        }

        // Net capital investment = Total amount spent buying stock MINUS true refunds received (shortfalls / returned items)
        java.math.BigDecimal netInvestment = totalSpent.subtract(totalRefunded);

        long pendingReturnsCount = stockReturnRequestRepository.countBySupplierIdAndStatus(supplierId, "PENDING_REVIEW");
        java.math.BigDecimal pendingReturnsVal = java.math.BigDecimal.ZERO;
        List<StockReturnRequest> pendingReturns = stockReturnRequestRepository.findByStatusOrderByCreatedAtDesc("PENDING_REVIEW");
        for (StockReturnRequest pr : pendingReturns) {
            if (pr.getSupplierId().equals(supplierId) && pr.getRefundAmount() != null) {
                pendingReturnsVal = pendingReturnsVal.add(pr.getRefundAmount());
            }
        }

        SupplierFinancialSummaryDTO finSummary = new SupplierFinancialSummaryDTO(
                totalSpent,
                totalRefunded,
                netInvestment,
                totalRevenue,
                totalWholesaleProfit,
                pendingReturnsCount,
                pendingReturnsVal,
                txList
        );
        finSummary.setTotalDeposited(totalDeposited);
        SupplierProfile spObj = supplierProfileRepository.findById(supplierId).orElse(null);
        if (spObj != null && spObj.getWalletBalance() != null) {
            finSummary.setWalletBalance(spObj.getWalletBalance());
        }
        return finSummary;
    }

    private void enrichReturnRequest(StockReturnRequest r) {
        if (r.getSupplierId() != null) {
            supplierProfileRepository.findById(r.getSupplierId()).ifPresent(sp -> {
                r.setSupplierName(sp.getBusinessName());
            });
        }
        if (r.getDistrictId() != null) {
            districtRepository.findById(r.getDistrictId()).ifPresent(d -> {
                r.setDistrictName(d.getName());
            });
        }
        if (r.getItems() == null || r.getItems().isEmpty()) {
            r.setItems(stockReturnItemRepository.findByReturnRequestId(r.getId()));
        }
        for (StockReturnItem item : r.getItems()) {
            productRepository.findById(item.getProductId()).ifPresent(p -> {
                item.setBrand(p.getBrand());
                item.setFlavorVariant(p.getFlavorVariant());
                item.setSku(p.getSku());
                item.setPackaging(p.getPackaging());
                item.setSizeVolume(p.getSizeVolume());
            });
        }
    }

    public Map<String, Object> getSupplierWalletDetails(Long userId) {
        return getSupplierWalletDetails(userId, null);
    }

    public Map<String, Object> getSupplierWalletDetails(Long userId, Long supplierIdParam) {
        SupplierProfile profile = resolveSupplierProfile(userId, supplierIdParam);
        List<SupplierTransaction> txList = supplierTransactionRepository.findBySupplierIdOrderByCreatedAtDesc(profile.getId());

        Map<String, Object> res = new HashMap<>();
        res.put("supplier_id", profile.getId());
        res.put("business_name", profile.getBusinessName());
        res.put("wallet_balance", profile.getWalletBalance() != null ? profile.getWalletBalance() : java.math.BigDecimal.ZERO);
        res.put("bank_name", profile.getBankName());
        res.put("bank_account_number", profile.getBankAccountNumber());
        res.put("bank_account_name", profile.getBankAccountName());
        res.put("mobile_banking_number", profile.getMobileBankingNumber());
        res.put("default_payment_method", profile.getDefaultPaymentMethod());
        res.put("depot_address", profile.getDepotAddress());
        res.put("phone_number", profile.getPhoneNumber());
        res.put("division_name", profile.getDivisionName());
        res.put("transactions", txList);

        // Available commercial payment options / deposit channels
        List<Map<String, Object>> paymentOptions = new ArrayList<>();
        Map<String, Object> stripeOpt = new HashMap<>();
        stripeOpt.put("id", "STRIPE_CARD");
        stripeOpt.put("label", "Stripe Card (Instant)");
        stripeOpt.put("type", "GATEWAY");
        stripeOpt.put("provider", "STRIPE");
        stripeOpt.put("currency", "BDT");
        stripeOpt.put("enabled", true);
        paymentOptions.add(stripeOpt);

        Map<String, Object> bankOpt = new HashMap<>();
        bankOpt.put("id", "BANK_TRANSFER");
        bankOpt.put("label", "Corporate Bank Wire");
        bankOpt.put("type", "MANUAL_CLEARING");
        bankOpt.put("enabled", true);
        paymentOptions.add(bankOpt);

        Map<String, Object> bkashOpt = new HashMap<>();
        bkashOpt.put("id", "BKASH");
        bkashOpt.put("label", "bKash Merchant");
        bkashOpt.put("type", "MFS");
        bkashOpt.put("enabled", true);
        paymentOptions.add(bkashOpt);

        Map<String, Object> nagadOpt = new HashMap<>();
        nagadOpt.put("id", "NAGAD");
        nagadOpt.put("label", "Nagad Commercial");
        nagadOpt.put("type", "MFS");
        nagadOpt.put("enabled", true);
        paymentOptions.add(nagadOpt);

        res.put("payment_options", paymentOptions);
        res.put("stripe_enabled", true);
        res.put("stripe_publishable_key", stripePublishableKey);

        // Calculate Supplier P&L (Profit and Loss)
        double spProcurementSpent = 0.0;
        try {
            Double spSpent = jdbcTemplate.queryForObject(
                "SELECT COALESCE(SUM(total_amount - COALESCE(refund_amount, 0)), 0) FROM stock_requisitions WHERE supplier_id = ? AND status != 'REJECTED'",
                Double.class,
                profile.getId()
            );
            if (spSpent != null) spProcurementSpent = spSpent;
        } catch (Exception ignored) {}

        double spDepotInventoryValue = 0.0;
        int spDepotInventoryUnits = 0;
        try {
            List<Map<String, Object>> invRows = jdbcTemplate.queryForList(
                "SELECT COALESCE(SUM(di.current_stock), 0) as total_units, " +
                "COALESCE(SUM(di.current_stock * COALESCE(p.supplier_price, p.base_price, 0)), 0) as total_value " +
                "FROM district_inventory di " +
                "JOIN products p ON di.product_id = p.product_id " +
                "WHERE di.district_id = ?",
                profile.getPrimaryDistrictId()
            );
            if (!invRows.isEmpty()) {
                spDepotInventoryUnits = ((Number) invRows.get(0).getOrDefault("total_units", 0)).intValue();
                spDepotInventoryValue = ((Number) invRows.get(0).getOrDefault("total_value", 0.0)).doubleValue();
            }
        } catch (Exception ignored) {}

        double spWholesaleRevenue = 0.0;
        double spWholesaleCogs = 0.0;
        double spWholesaleGrossProfit = 0.0;

        List<Long> pnlOutletIds = getOutletIdsForSupplier(profile);
        if (!pnlOutletIds.isEmpty()) {
            String inSql = pnlOutletIds.stream().map(String::valueOf).collect(java.util.stream.Collectors.joining(","));
            try {
                List<Map<String, Object>> pnlRows = jdbcTemplate.queryForList(
                    "SELECT " +
                    "COALESCE(SUM(COALESCE(r.total_amount, r.quantity * COALESCE(r.unit_price, p.outlet_price, 0))), 0) AS rev, " +
                    "COALESCE(SUM(r.quantity * COALESCE(p.supplier_price, p.base_price, 0)), 0) AS cogs, " +
                    "COALESCE(SUM(COALESCE(r.total_amount, r.quantity * COALESCE(r.unit_price, p.outlet_price, 0)) - (r.quantity * COALESCE(p.supplier_price, p.base_price, 0))), 0) AS profit " +
                    "FROM outlet_requisitions r " +
                    "JOIN products p ON r.product_id = p.product_id " +
                    "WHERE r.status = 'DISPATCHED' AND r.outlet_id IN (" + inSql + ")"
                );
                if (!pnlRows.isEmpty()) {
                    spWholesaleRevenue = ((Number) pnlRows.get(0).getOrDefault("rev", 0.0)).doubleValue();
                    spWholesaleCogs = ((Number) pnlRows.get(0).getOrDefault("cogs", 0.0)).doubleValue();
                    spWholesaleGrossProfit = ((Number) pnlRows.get(0).getOrDefault("profit", 0.0)).doubleValue();
                }
            } catch (Exception ignored) {}
        }

        try {
            Double txRev = jdbcTemplate.queryForObject(
                "SELECT COALESCE(SUM(amount), 0) FROM supplier_transactions WHERE supplier_id = ? AND type = 'OUTLET_SALE' AND status = 'COMPLETED'",
                Double.class,
                profile.getId()
            );
            if (txRev != null && txRev > 0 && spWholesaleRevenue == 0) {
                spWholesaleRevenue = txRev;
            }
        } catch (Exception ignored) {}

        double spMarginPct = spWholesaleRevenue > 0 ? (spWholesaleGrossProfit / spWholesaleRevenue) * 100.0 : 0.0;

        Map<String, Object> pnl = new HashMap<>();
        pnl.put("procurement_spent", spProcurementSpent);
        pnl.put("wholesale_revenue", spWholesaleRevenue);
        pnl.put("wholesale_cogs", spWholesaleCogs);
        pnl.put("wholesale_gross_profit", spWholesaleGrossProfit);
        pnl.put("profit_margin_pct", Math.round(spMarginPct * 100.0) / 100.0);
        pnl.put("depot_inventory_value", spDepotInventoryValue);
        pnl.put("depot_inventory_units", spDepotInventoryUnits);
        pnl.put("net_cash_flow", spWholesaleRevenue - spProcurementSpent);

        res.put("financial_pnl", pnl);
        return res;
    }

    @Transactional
    public Map<String, Object> topupSupplierWallet(Long userId, Map<String, Object> payload) {
        return topupSupplierWallet(userId, null, payload);
    }

    @Transactional
    public Map<String, Object> topupSupplierWallet(Long userId, Long supplierIdParam, Map<String, Object> payload) {
        SupplierProfile profile = resolveSupplierProfile(userId, supplierIdParam);
        if (payload == null || !payload.containsKey("amount")) {
            throw new IllegalArgumentException("Deposit amount is required.");
        }

        Object amtObj = payload.get("amount");
        java.math.BigDecimal amount;
        try {
            amount = new java.math.BigDecimal(amtObj.toString());
        } catch (Exception e) {
            throw new IllegalArgumentException("Invalid top-up amount format.");
        }

        if (amount.compareTo(java.math.BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Top-up deposit amount must be greater than zero.");
        }

        String paymentMethod = payload.get("payment_method") != null ? payload.get("payment_method").toString().trim() : "BANK_TRANSFER";
        String referenceCode = payload.get("reference_code") != null ? payload.get("reference_code").toString().trim() : ("DEP-" + System.currentTimeMillis());
        String notes = payload.get("notes") != null ? payload.get("notes").toString().trim() : ("Commercial Wallet deposit via " + paymentMethod);

        // Optionally update banking/MFS credentials if provided in top-up modal
        if (payload.get("bank_name") != null && !payload.get("bank_name").toString().trim().isEmpty()) {
            profile.setBankName(payload.get("bank_name").toString().trim());
        }
        if (payload.get("bank_account_number") != null && !payload.get("bank_account_number").toString().trim().isEmpty()) {
            profile.setBankAccountNumber(payload.get("bank_account_number").toString().trim());
        }
        if (payload.get("bank_account_name") != null && !payload.get("bank_account_name").toString().trim().isEmpty()) {
            profile.setBankAccountName(payload.get("bank_account_name").toString().trim());
        }
        if (payload.get("mobile_banking_number") != null && !payload.get("mobile_banking_number").toString().trim().isEmpty()) {
            profile.setMobileBankingNumber(payload.get("mobile_banking_number").toString().trim());
        }

        java.math.BigDecimal currentWallet = profile.getWalletBalance() != null ? profile.getWalletBalance() : java.math.BigDecimal.ZERO;
        java.math.BigDecimal newBalance = currentWallet.add(amount);
        profile.setWalletBalance(newBalance);
        supplierProfileRepository.saveAndFlush(profile);
        try {
            jdbcTemplate.update("UPDATE supplier_profiles SET wallet_balance = ?, updated_at = NOW() WHERE id = ?", newBalance, profile.getId());
        } catch (Exception ignored) {}

        SupplierTransaction tx = new SupplierTransaction(
                "TXN-TOPUP-" + System.currentTimeMillis() + "-" + (100 + new Random().nextInt(900)),
                profile.getId(),
                null,
                null,
                referenceCode,
                "WALLET_TOPUP",
                "CREDIT",
                amount,
                paymentMethod,
                notes,
                "COMPLETED"
        );
        supplierTransactionRepository.saveAndFlush(tx);

        Map<String, Object> result = new HashMap<>();
        result.put("success", true);
        result.put("message", "Wallet topped up successfully with ৳" + amount.toPlainString());
        result.put("wallet_balance", newBalance);
        result.put("transaction", tx);
        return result;
    }

    @Transactional
    public Map<String, Object> updateSupplierWalletSettings(Long userId) {
        return updateSupplierWalletSettings(userId, null, new HashMap<>());
    }

    @Transactional
    public Map<String, Object> updateSupplierWalletSettings(Long userId, Map<String, String> payload) {
        return updateSupplierWalletSettings(userId, null, payload);
    }

    @Transactional
    public Map<String, Object> updateSupplierWalletSettings(Long userId, Long supplierIdParam, Map<String, String> payload) {
        SupplierProfile profile = resolveSupplierProfile(userId, supplierIdParam);
        if (payload != null) {
            if (payload.containsKey("bank_name")) profile.setBankName(payload.get("bank_name"));
            if (payload.containsKey("bank_account_number")) profile.setBankAccountNumber(payload.get("bank_account_number"));
            if (payload.containsKey("bank_account_name")) profile.setBankAccountName(payload.get("bank_account_name"));
            if (payload.containsKey("mobile_banking_number")) profile.setMobileBankingNumber(payload.get("mobile_banking_number"));
            if (payload.containsKey("default_payment_method")) profile.setDefaultPaymentMethod(payload.get("default_payment_method"));
            supplierProfileRepository.save(profile);
        }
        Map<String, Object> res = new HashMap<>();
        res.put("success", true);
        res.put("message", "Wallet settings updated successfully.");
        res.put("wallet_balance", profile.getWalletBalance() != null ? profile.getWalletBalance() : java.math.BigDecimal.ZERO);
        res.put("bank_name", profile.getBankName());
        res.put("bank_account_number", profile.getBankAccountNumber());
        res.put("bank_account_name", profile.getBankAccountName());
        res.put("mobile_banking_number", profile.getMobileBankingNumber());
        res.put("default_payment_method", profile.getDefaultPaymentMethod());
        return res;
    }

}
