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

            // Product & merchandise persistence is preserved strictly for user/admin input (Zero automatic seed)
            try {
                jdbcTemplate.execute("ALTER TABLE sales_officers ADD COLUMN monthly_target DECIMAL(15,2) NOT NULL DEFAULT 2000000.00");
            } catch (Exception ignored) {}

            try {
                jdbcTemplate.execute("ALTER TABLE outlet_requisitions ADD COLUMN sales_officer_id BIGINT NULL");
            } catch (Exception ignored) {}

            try {
                jdbcTemplate.execute(
                    "CREATE TABLE IF NOT EXISTS sales_officer_distributions (" +
                    "id BIGINT AUTO_INCREMENT PRIMARY KEY, " +
                    "sales_officer_id BIGINT NOT NULL, " +
                    "outlet_id BIGINT NOT NULL, " +
                    "product_id BIGINT NOT NULL, " +
                    "quantity INT NOT NULL, " +
                    "cost_price DECIMAL(10,2) NOT NULL, " +
                    "sale_price DECIMAL(10,2) NOT NULL, " +
                    "total_cost DECIMAL(12,2) NOT NULL, " +
                    "total_revenue DECIMAL(12,2) NOT NULL, " +
                    "profit_earned DECIMAL(12,2) NOT NULL, " +
                    "distribution_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, " +
                    "notes TEXT, " +
                    "INDEX idx_so_dist (sales_officer_id, distribution_date)" +
                    ")"
                );
            } catch (Exception ignored) {}
        };
    }
}
