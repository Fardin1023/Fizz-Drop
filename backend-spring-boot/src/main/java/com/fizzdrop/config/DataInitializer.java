package com.fizzdrop.config;

import com.fizzdrop.entity.Product;
import com.fizzdrop.entity.Role;
import com.fizzdrop.entity.User;
import com.fizzdrop.repository.ProductRepository;
import com.fizzdrop.repository.RoleRepository;
import com.fizzdrop.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.math.BigDecimal;
import java.util.List;

@Configuration
public class DataInitializer {

    @Bean
    public CommandLineRunner initData(RoleRepository roleRepo, UserRepository userRepo, ProductRepository productRepo) {
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

            // Seed flagship beverage products if empty
            if (productRepo.count() == 0) {
                List<Product> defaults = List.of(
                    new Product("Pepsi", "Zero Sugar", "Can", "250ml", "PEP-ZER-BOT-250", new BigDecimal("45.00"), "Carbonated Soft Drink", null),
                    new Product("Pepsi", "Regular Cola", "Bottle", "500ml", "PEP-REG-BOT-500", new BigDecimal("50.00"), "Carbonated Soft Drink", null),
                    new Product("7UP", "Lemon Lime", "Bottle", "500ml", "7UP-LEM-BOT-500", new BigDecimal("50.00"), "Carbonated Soft Drink", null),
                    new Product("Mountain Dew", "Citrus Blast", "Bottle", "500ml", "DEW-CIT-BOT-500", new BigDecimal("50.00"), "Energy Drink", null),
                    new Product("Mirinda", "Orange Zing", "Bottle", "500ml", "MIR-ORG-BOT-500", new BigDecimal("45.00"), "Carbonated Soft Drink", null),
                    new Product("Aquafina", "Pure Water", "Bottle", "500ml", "AQU-WAT-BOT-500", new BigDecimal("25.00"), "Purified Water", null),
                    new Product("Slice", "Mango Delight", "Tetra", "250ml", "SLC-MNG-TET-250", new BigDecimal("35.00"), "Fruit Juice", null)
                );
                productRepo.saveAll(defaults);
                System.out.println("[DataInitializer] Standard flagship beverage products seeded.");
            }
        };
    }
}
