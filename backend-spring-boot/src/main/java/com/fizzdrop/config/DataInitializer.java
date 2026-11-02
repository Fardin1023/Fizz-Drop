package com.fizzdrop.config;

import com.fizzdrop.entity.Role;
import com.fizzdrop.entity.User;
import com.fizzdrop.repository.ProductRepository;
import com.fizzdrop.repository.RoleRepository;
import com.fizzdrop.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.JdbcTemplate;

@Configuration
public class DataInitializer {

    @Bean
    public CommandLineRunner initData(RoleRepository roleRepo, UserRepository userRepo, ProductRepository productRepo, JdbcTemplate jdbcTemplate) {
        return args -> {
            // Seed base roles if empty
            if (roleRepo.count() == 0) {
                roleRepo.save(new Role("SuperAdmin"));
                roleRepo.save(new Role("Admin"));
                roleRepo.save(new Role("Manager"));
                roleRepo.save(new Role("Supplier"));
                roleRepo.save(new Role("Customer"));
                System.out.println("[DataInitializer] Base system roles created.");
            }

            // Seed initial superadmin user if empty
            if (userRepo.findByEmail("superadmin@fizzdrop.com").isEmpty()) {
                userRepo.save(new User(1L, 1L, "superadmin@fizzdrop.com", "admin123"));
                System.out.println("[DataInitializer] Default Superadmin registered: superadmin@fizzdrop.com / admin123");
            }

            // Seed base products if database is fresh and empty
            if (productRepo.count() == 0) {
                java.math.BigDecimal p25 = new java.math.BigDecimal("25.50");
                java.math.BigDecimal p35 = new java.math.BigDecimal("35.00");
                java.math.BigDecimal p40 = new java.math.BigDecimal("40.00");
                java.math.BigDecimal p45 = new java.math.BigDecimal("45.00");
                java.math.BigDecimal p20 = new java.math.BigDecimal("20.00");
                java.math.BigDecimal pJacket = new java.math.BigDecimal("3500.00");
                java.math.BigDecimal pHelmet = new java.math.BigDecimal("2200.00");
                java.math.BigDecimal pBike = new java.math.BigDecimal("185000.00");
                java.math.BigDecimal pTshirt = new java.math.BigDecimal("650.00");

                productRepo.save(new com.fizzdrop.entity.Product("7up", "Drinks", "Glass Bottle", "250ml", "7UP-DRI-GLA-250", p25, "7up", null));
                productRepo.save(new com.fizzdrop.entity.Product("Pepsi", "Diet", "Can", "250ml", "PEP-DIE-CAN-250", p40, "Pepsi", null));
                productRepo.save(new com.fizzdrop.entity.Product("Mountain Dew", "Diet", "Bottle", "400ml", "MOU-DIE-BOT-400", p40, "Mountain Dew", null));
                productRepo.save(new com.fizzdrop.entity.Product("Mirinda", "Orange Blast", "Bottle", "500ml", "MIR-ORA-BOT-500", p35, "Mirinda", null));
                productRepo.save(new com.fizzdrop.entity.Product("Slice", "Thick Mango", "Bottle", "600ml", "SLI-MAN-BOT-600", p45, "Slice", null));
                productRepo.save(new com.fizzdrop.entity.Product("Sting", "Gold Rush Energy", "Can", "250ml", "STI-ENG-CAN-250", p35, "Sting", null));
                productRepo.save(new com.fizzdrop.entity.Product("Aquafina", "Pure Artesian Water", "Bottle", "1000ml", "AQU-WAT-BOT-1000", p20, "Aquafina", null));

                productRepo.save(new com.fizzdrop.entity.Product("Pepsi", "Pro Racing Biker Jacket", "Boxed Packaging", "XL", "MER-JAC-PEP-XL", pJacket, "Merchandise", null));
                productRepo.save(new com.fizzdrop.entity.Product("Mountain Dew", "Aero Motocross Helmet", "Boxed Packaging", "Standard", "MER-HEL-DEW-STD", pHelmet, "Merchandise", null));
                productRepo.save(new com.fizzdrop.entity.Product("7up", "Nitro Sport Edition Bike", "Assembled Unit", "150cc", "MER-BIK-7UP-150", pBike, "Merchandise", null));
                productRepo.save(new com.fizzdrop.entity.Product("Mirinda", "Streetwear Graphic T-Shirt", "Polybag", "L", "MER-TSH-MIR-L", pTshirt, "Merchandise", null));
                System.out.println("[DataInitializer] Initial seed products for brand drinks and merchandise created.");
            }
        };
    }
}
