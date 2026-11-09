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

            // Pre-Sales Officer (PSR) & Sub-Routes Tables
            try {
                jdbcTemplate.execute("ALTER TABLE outlets ADD COLUMN sub_route VARCHAR(255) NULL");
            } catch (Exception ignored) {}
            try {
                jdbcTemplate.execute("ALTER TABLE outlets ADD COLUMN assigned_psr_id BIGINT NULL");
            } catch (Exception ignored) {}

            try {
                jdbcTemplate.execute(
                    "CREATE TABLE IF NOT EXISTS pre_sales_officers (" +
                    "id BIGINT AUTO_INCREMENT PRIMARY KEY, " +
                    "psr_code VARCHAR(50) NOT NULL UNIQUE, " +
                    "name VARCHAR(150) NOT NULL, " +
                    "phone VARCHAR(50) NOT NULL, " +
                    "email VARCHAR(100) NOT NULL UNIQUE, " +
                    "password_hash VARCHAR(100) NOT NULL DEFAULT 'Psr123!', " +
                    "sales_officer_id BIGINT NOT NULL, " +
                    "sub_route VARCHAR(255) NOT NULL, " +
                    "assigned_area VARCHAR(150) NOT NULL, " +
                    "status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE', " +
                    "notes TEXT, " +
                    "user_id BIGINT NULL, " +
                    "created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, " +
                    "updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, " +
                    "INDEX idx_psr_so (sales_officer_id), " +
                    "INDEX idx_psr_route (sub_route)" +
                    ")"
                );
            } catch (Exception ignored) {}

            try {
                jdbcTemplate.execute(
                    "CREATE TABLE IF NOT EXISTS psr_orders (" +
                    "id BIGINT AUTO_INCREMENT PRIMARY KEY, " +
                    "order_code VARCHAR(60) NOT NULL UNIQUE, " +
                    "psr_id BIGINT NOT NULL, " +
                    "psr_name VARCHAR(150), " +
                    "sales_officer_id BIGINT NOT NULL, " +
                    "outlet_id BIGINT NOT NULL, " +
                    "outlet_name VARCHAR(150), " +
                    "sub_route VARCHAR(255), " +
                    "product_id BIGINT NOT NULL, " +
                    "product_name VARCHAR(150), " +
                    "quantity INT NOT NULL, " +
                    "unit_price DECIMAL(10,2) NOT NULL, " +
                    "total_amount DECIMAL(12,2) NOT NULL, " +
                    "urgency VARCHAR(30) DEFAULT 'NORMAL', " +
                    "status VARCHAR(50) NOT NULL DEFAULT 'SUBMITTED_TO_SO', " +
                    "outlet_remarks TEXT, " +
                    "psr_notes TEXT, " +
                    "created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, " +
                    "updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, " +
                    "INDEX idx_psr_orders_so (sales_officer_id, status), " +
                    "INDEX idx_psr_orders_psr (psr_id), " +
                    "INDEX idx_psr_orders_outlet (outlet_id)" +
                    ")"
                );
            } catch (Exception ignored) {}

            try {
                jdbcTemplate.execute(
                    "CREATE TABLE IF NOT EXISTS psr_refund_requests (" +
                    "id BIGINT AUTO_INCREMENT PRIMARY KEY, " +
                    "refund_code VARCHAR(60) NOT NULL UNIQUE, " +
                    "psr_id BIGINT NOT NULL, " +
                    "psr_name VARCHAR(150), " +
                    "sales_officer_id BIGINT NOT NULL, " +
                    "outlet_id BIGINT NOT NULL, " +
                    "outlet_name VARCHAR(150), " +
                    "sub_route VARCHAR(255), " +
                    "product_id BIGINT NOT NULL, " +
                    "product_name VARCHAR(150), " +
                    "quantity INT NOT NULL, " +
                    "unit_price DECIMAL(10,2) NOT NULL, " +
                    "refund_amount DECIMAL(12,2) NOT NULL, " +
                    "reason VARCHAR(100) NOT NULL, " +
                    "status VARCHAR(50) NOT NULL DEFAULT 'SUBMITTED_TO_SO', " +
                    "outlet_remarks TEXT, " +
                    "psr_notes TEXT, " +
                    "so_remarks TEXT, " +
                    "created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, " +
                    "updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, " +
                    "INDEX idx_psr_refunds_so (sales_officer_id, status), " +
                    "INDEX idx_psr_refunds_psr (psr_id)" +
                    ")"
                );
            } catch (Exception ignored) {}

            try {
                jdbcTemplate.execute(
                    "CREATE TABLE IF NOT EXISTS psr_visit_logs (" +
                    "id BIGINT AUTO_INCREMENT PRIMARY KEY, " +
                    "psr_id BIGINT NOT NULL, " +
                    "sales_officer_id BIGINT NOT NULL, " +
                    "outlet_id BIGINT NOT NULL, " +
                    "outlet_name VARCHAR(150), " +
                    "visit_type VARCHAR(50) NOT NULL, " +
                    "notes TEXT, " +
                    "created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, " +
                    "INDEX idx_psr_visit_psr (psr_id), " +
                    "INDEX idx_psr_visit_outlet (outlet_id)" +
                    ")"
                );
            } catch (Exception ignored) {}

            // Pre-Sales Officers and Outlets are cleanly created and assigned by the Superadmin and Sales Officers.
        };
    }
}
