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

            // Clean up any legacy seed product data completely from DB (Superadmin inputs products)
            try {
                jdbcTemplate.execute("DELETE FROM stock_requisition_items");
                jdbcTemplate.execute("DELETE FROM stock_requisitions");
                jdbcTemplate.execute("DELETE FROM central_inventory");
                jdbcTemplate.execute("DELETE FROM district_inventory");
                jdbcTemplate.execute("DELETE FROM Shop_Inventory");
                jdbcTemplate.execute("DELETE FROM Products");
                System.out.println("[DataInitializer] Seed product records wiped. Database is clean for Superadmin product input.");
            } catch (Exception ex) {
                System.err.println("[DataInitializer] Note on product cleanup: " + ex.getMessage());
            }
        };
    }
}
