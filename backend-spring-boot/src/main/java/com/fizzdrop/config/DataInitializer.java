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
                jdbcTemplate.execute("ALTER TABLE sales_officers ADD COLUMN allocated_supplier_ids VARCHAR(500) NULL");
            } catch (Exception ignored) {}

            try {
                // Ensure all existing active suppliers (e.g. 1,37) are allocated to existing SOs if unset
                jdbcTemplate.execute("UPDATE sales_officers SET allocated_supplier_ids = '1,37' WHERE allocated_supplier_ids IS NULL OR allocated_supplier_ids = ''");
            } catch (Exception ignored) {}

            try {
                jdbcTemplate.execute("ALTER TABLE outlet_requisitions ADD COLUMN sales_officer_id BIGINT NULL");
            } catch (Exception ignored) {}

            try {
                jdbcTemplate.execute("ALTER TABLE outlet_requisitions MODIFY COLUMN outlet_id BIGINT NULL");
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

            try {
                jdbcTemplate.execute(
                    "CREATE TABLE IF NOT EXISTS sales_officer_inventory (" +
                    "id BIGINT AUTO_INCREMENT PRIMARY KEY, " +
                    "sales_officer_id BIGINT NOT NULL, " +
                    "product_id BIGINT NOT NULL, " +
                    "current_stock INT NOT NULL DEFAULT 0, " +
                    "total_purchased INT NOT NULL DEFAULT 0, " +
                    "total_distributed INT NOT NULL DEFAULT 0, " +
                    "last_purchased_at DATETIME NULL, " +
                    "updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, " +
                    "UNIQUE KEY uk_so_product (sales_officer_id, product_id), " +
                    "INDEX idx_so_inv_so (sales_officer_id), " +
                    "INDEX idx_so_inv_prod (product_id)" +
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
                jdbcTemplate.execute("ALTER TABLE pre_sales_officers ADD COLUMN target_cases INT DEFAULT 0");
            } catch (Exception ignored) {}
            try {
                jdbcTemplate.execute("ALTER TABLE pre_sales_officers ADD COLUMN target_sku_ounces VARCHAR(150) NULL");
            } catch (Exception ignored) {}
            try {
                jdbcTemplate.execute("ALTER TABLE pre_sales_officers ADD COLUMN target_product_id BIGINT NULL");
            } catch (Exception ignored) {}
            try {
                jdbcTemplate.execute("ALTER TABLE pre_sales_officers ADD COLUMN target_notes VARCHAR(255) NULL");
            } catch (Exception ignored) {}
            try {
                jdbcTemplate.execute("ALTER TABLE pre_sales_officers ADD COLUMN targets_json TEXT NULL");
            } catch (Exception ignored) {}
            try {
                jdbcTemplate.execute("ALTER TABLE pre_sales_officers ADD COLUMN supplier_id BIGINT NULL");
            } catch (Exception ignored) {}
            try {
                jdbcTemplate.execute("ALTER TABLE pre_sales_officers ADD COLUMN supplier_name VARCHAR(150) NULL");
            } catch (Exception ignored) {}
            try {
                jdbcTemplate.execute("ALTER TABLE psr_orders ADD COLUMN supplier_id BIGINT NULL");
            } catch (Exception ignored) {}
            try {
                jdbcTemplate.execute("ALTER TABLE psr_orders ADD COLUMN supplier_name VARCHAR(150) NULL");
            } catch (Exception ignored) {}
            try {
                jdbcTemplate.execute("ALTER TABLE outlet_requisitions ADD COLUMN supplier_id BIGINT NULL");
            } catch (Exception ignored) {}

            try {
                jdbcTemplate.execute("UPDATE pre_sales_officers SET supplier_id = 1, supplier_name = 'Dhaka Metropolitan & Central Beverage Logistics Hub' WHERE supplier_id IS NULL");
            } catch (Exception ignored) {}
            try {
                jdbcTemplate.execute("UPDATE psr_orders SET supplier_id = 1, supplier_name = 'Dhaka Metropolitan & Central Beverage Logistics Hub' WHERE supplier_id IS NULL");
            } catch (Exception ignored) {}
            try {
                jdbcTemplate.execute("UPDATE outlet_requisitions SET supplier_id = 1 WHERE supplier_id IS NULL");
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

            // Supplier Delivery Teams (Fleet Vehicles, Registration No. for Tracking, Members)
            try {
                jdbcTemplate.execute(
                    "CREATE TABLE IF NOT EXISTS supplier_delivery_teams (" +
                    "id BIGINT AUTO_INCREMENT PRIMARY KEY, " +
                    "supplier_id BIGINT NOT NULL, " +
                    "team_name VARCHAR(120) NOT NULL, " +
                    "vehicle_registration_no VARCHAR(100) NOT NULL, " +
                    "vehicle_type VARCHAR(60) NOT NULL DEFAULT 'Covered Van', " +
                    "driver_name VARCHAR(100) NOT NULL, " +
                    "driver_phone VARCHAR(50) NOT NULL, " +
                    "team_members TEXT, " +
                    "max_capacity_cases INT NOT NULL DEFAULT 250, " +
                    "status VARCHAR(30) NOT NULL DEFAULT 'AVAILABLE', " +
                    "created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, " +
                    "updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, " +
                    "INDEX idx_sdt_supplier (supplier_id), " +
                    "INDEX idx_sdt_reg (vehicle_registration_no)" +
                    ")"
                );
            } catch (Exception ignored) {}

            // Supplier Delivery Dispatches (Vehicle Trips to Outlets via Subroutes)
            try {
                jdbcTemplate.execute(
                    "CREATE TABLE IF NOT EXISTS supplier_delivery_dispatches (" +
                    "id BIGINT AUTO_INCREMENT PRIMARY KEY, " +
                    "dispatch_code VARCHAR(100) NOT NULL UNIQUE, " +
                    "supplier_id BIGINT NOT NULL, " +
                    "delivery_team_id BIGINT NOT NULL, " +
                    "sub_route VARCHAR(255) NOT NULL, " +
                    "total_cases INT NOT NULL DEFAULT 0, " +
                    "total_outlets INT NOT NULL DEFAULT 0, " +
                    "status VARCHAR(50) NOT NULL DEFAULT 'DISPATCHED', " +
                    "items_json LONGTEXT, " +
                    "notes TEXT, " +
                    "dispatched_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, " +
                    "delivered_at DATETIME NULL, " +
                    "created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, " +
                    "updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, " +
                    "INDEX idx_sdd_supplier (supplier_id), " +
                    "INDEX idx_sdd_team (delivery_team_id), " +
                    "INDEX idx_sdd_subroute (sub_route), " +
                    "INDEX idx_sdd_status (status)" +
                    ")"
                );
            } catch (Exception ignored) {}

            try {
                jdbcTemplate.execute("ALTER TABLE supplier_delivery_dispatches ADD COLUMN boarded_at DATETIME NULL");
            } catch (Exception ignored) {}
            try {
                jdbcTemplate.execute("ALTER TABLE supplier_delivery_dispatches ADD COLUMN ride_started_at DATETIME NULL");
            } catch (Exception ignored) {}
            try {
                jdbcTemplate.execute("ALTER TABLE supplier_delivery_dispatches ADD COLUMN delivered_outlets_count INT NOT NULL DEFAULT 0");
            } catch (Exception ignored) {}
            try {
                jdbcTemplate.execute("ALTER TABLE supplier_delivery_dispatches ADD COLUMN confirmed_outlets_count INT NOT NULL DEFAULT 0");
            } catch (Exception ignored) {}
            try {
                jdbcTemplate.execute("ALTER TABLE supplier_delivery_dispatches ADD COLUMN total_profit_earned DECIMAL(12,2) NOT NULL DEFAULT 0.00");
            } catch (Exception ignored) {}

            // ==========================================
            // 6 DIVISIONS & 64 DISTRICTS DISTRIBUTION
            // 6 REGIONAL SALES MANAGERS (RSM)
            // 64 AREA SALES MANAGERS (ASM)
            // ==========================================
            try {
                jdbcTemplate.execute("UPDATE districts SET division = 'Dhaka' WHERE division = 'Mymensingh'");
                jdbcTemplate.execute("UPDATE districts SET division = 'Rajshahi' WHERE division = 'Rangpur'");
                jdbcTemplate.execute("UPDATE districts SET division = 'Barishal' WHERE division = 'Barisal'");
            } catch (Exception ignored) {}

            // Regional Sales Managers (RSM) Table - 6 Divisions
            try {
                jdbcTemplate.execute(
                    "CREATE TABLE IF NOT EXISTS regional_sales_managers (" +
                    "id BIGINT AUTO_INCREMENT PRIMARY KEY, " +
                    "code VARCHAR(50) NOT NULL UNIQUE, " +
                    "name VARCHAR(150) NOT NULL, " +
                    "email VARCHAR(100) NOT NULL UNIQUE, " +
                    "phone VARCHAR(50) NOT NULL, " +
                    "division VARCHAR(100) NOT NULL UNIQUE, " +
                    "target_sales DECIMAL(15,2) NOT NULL DEFAULT 15000000.00, " +
                    "created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP" +
                    ")"
                );
            } catch (Exception ignored) {}

            // Area Sales Managers (ASM) Table - 64 Districts under RSM
            try {
                jdbcTemplate.execute(
                    "CREATE TABLE IF NOT EXISTS area_sales_managers (" +
                    "id BIGINT AUTO_INCREMENT PRIMARY KEY, " +
                    "code VARCHAR(50) NOT NULL UNIQUE, " +
                    "name VARCHAR(150) NOT NULL, " +
                    "email VARCHAR(100) NOT NULL UNIQUE, " +
                    "phone VARCHAR(50) NOT NULL, " +
                    "district_id BIGINT NOT NULL, " +
                    "district_name VARCHAR(100) NOT NULL, " +
                    "division VARCHAR(100) NOT NULL, " +
                    "rsm_id BIGINT NOT NULL, " +
                    "target_sales DECIMAL(15,2) NOT NULL DEFAULT 2500000.00, " +
                    "created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, " +
                    "INDEX idx_asm_rsm (rsm_id), " +
                    "INDEX idx_asm_district (district_id), " +
                    "INDEX idx_asm_division (division)" +
                    ")"
                );
            } catch (Exception ignored) {}

            // Sales Manager Reports Table (ASM to RSM reports & aggregated insights)
            try {
                jdbcTemplate.execute(
                    "CREATE TABLE IF NOT EXISTS sales_manager_reports (" +
                    "id BIGINT AUTO_INCREMENT PRIMARY KEY, " +
                    "report_type VARCHAR(50) NOT NULL DEFAULT 'ASM_TO_RSM', " +
                    "asm_id BIGINT NOT NULL, " +
                    "rsm_id BIGINT NOT NULL, " +
                    "district_id BIGINT NOT NULL, " +
                    "district_name VARCHAR(100) NOT NULL, " +
                    "division VARCHAR(100) NOT NULL, " +
                    "reporting_period VARCHAR(50) NOT NULL, " +
                    "total_sales_cases INT NOT NULL DEFAULT 0, " +
                    "total_revenue DECIMAL(15,2) NOT NULL DEFAULT 0.00, " +
                    "overall_profit DECIMAL(15,2) NOT NULL DEFAULT 0.00, " +
                    "overall_loss DECIMAL(15,2) NOT NULL DEFAULT 0.00, " +
                    "so_count INT NOT NULL DEFAULT 0, " +
                    "active_orders_count INT NOT NULL DEFAULT 0, " +
                    "product_demands_json TEXT, " +
                    "so_activities_json TEXT, " +
                    "notes TEXT, " +
                    "status VARCHAR(50) NOT NULL DEFAULT 'SUBMITTED', " +
                    "submitted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, " +
                    "INDEX idx_smr_asm (asm_id), " +
                    "INDEX idx_smr_rsm (rsm_id), " +
                    "INDEX idx_smr_period (reporting_period)" +
                    ")"
                );
            } catch (Exception ignored) {}

            try {
                jdbcTemplate.execute("ALTER TABLE sales_officers ADD COLUMN asm_id BIGINT NULL");
            } catch (Exception ignored) {}

            // Seed 6 Regional Sales Managers if empty
            try {
                Integer rsmCount = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM regional_sales_managers", Integer.class);
                if (rsmCount == null || rsmCount == 0) {
                    jdbcTemplate.update("INSERT INTO regional_sales_managers (code, name, email, phone, division, target_sales) VALUES (?, ?, ?, ?, ?, ?)",
                            "RSM-DHA-01", "Kazi Tariqul Islam", "rsm.dhaka@fizzdrop.com", "+8801711-100201", "Dhaka", new java.math.BigDecimal("15000000.00"));
                    jdbcTemplate.update("INSERT INTO regional_sales_managers (code, name, email, phone, division, target_sales) VALUES (?, ?, ?, ?, ?, ?)",
                            "RSM-CTG-02", "Mohammad Rafiqul Alam", "rsm.ctg@fizzdrop.com", "+8801711-100202", "Chittagong", new java.math.BigDecimal("12000000.00"));
                    jdbcTemplate.update("INSERT INTO regional_sales_managers (code, name, email, phone, division, target_sales) VALUES (?, ?, ?, ?, ?, ?)",
                            "RSM-RAJ-03", "Asif Mahmud Chowdhury", "rsm.rajshahi@fizzdrop.com", "+8801711-100203", "Rajshahi", new java.math.BigDecimal("14000000.00"));
                    jdbcTemplate.update("INSERT INTO regional_sales_managers (code, name, email, phone, division, target_sales) VALUES (?, ?, ?, ?, ?, ?)",
                            "RSM-KHU-04", "Shahriar Kabir", "rsm.khulna@fizzdrop.com", "+8801711-100204", "Khulna", new java.math.BigDecimal("10000000.00"));
                    jdbcTemplate.update("INSERT INTO regional_sales_managers (code, name, email, phone, division, target_sales) VALUES (?, ?, ?, ?, ?, ?)",
                            "RSM-BAR-05", "Mahbubur Rahman", "rsm.barishal@fizzdrop.com", "+8801711-100205", "Barishal", new java.math.BigDecimal("7000000.00"));
                    jdbcTemplate.update("INSERT INTO regional_sales_managers (code, name, email, phone, division, target_sales) VALUES (?, ?, ?, ?, ?, ?)",
                            "RSM-SYL-06", "Syed Tanvir Ahmed", "rsm.sylhet@fizzdrop.com", "+8801711-100206", "Sylhet", new java.math.BigDecimal("6000000.00"));
                    System.out.println("[DataInitializer] 6 Regional Sales Managers (RSM) created for 6 divisions.");
                }
            } catch (Exception e) {
                System.err.println("[DataInitializer] Error seeding RSMs: " + e.getMessage());
            }

            // Seed 64 Area Sales Managers (ASM) - 1 for each of the 64 districts
            try {
                Integer asmCount = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM area_sales_managers", Integer.class);
                if (asmCount == null || asmCount == 0) {
                    java.util.List<java.util.Map<String, Object>> districtRows = jdbcTemplate.queryForList("SELECT id, name, division FROM districts ORDER BY division, id");
                    java.util.List<java.util.Map<String, Object>> rsmRows = jdbcTemplate.queryForList("SELECT id, division FROM regional_sales_managers");
                    java.util.Map<String, Long> rsmDivMap = new java.util.HashMap<>();
                    for (java.util.Map<String, Object> r : rsmRows) {
                        rsmDivMap.put(r.get("division").toString().toLowerCase(), ((Number) r.get("id")).longValue());
                    }

                    String[] asmFirstNames = {
                        "Tanvir", "Sajjad", "Farhan", "Rashed", "Naimur", "Zahid", "Kamrul", "Nazmul", "Arifur",
                        "Mustafizur", "Habibur", "Shafiqul", "Enamul", "Mahfuzur", "Moshiur", "Ashraful", "Shakil",
                        "Imran", "Mehedi", "Faisal", "Tawhid", "Shahadat", "Rokon", "Jubair", "Aminul", "Babar"
                    };
                    String[] asmLastNames = {
                        "Hassan", "Hossain", "Rahman", "Ahmed", "Islam", "Khan", "Karim", "Sikder", "Molla",
                        "Chowdhury", "Talukder", "Bhuiyan", "Sarker", "Majumder", "Howlader", "Mia", "Uddin"
                    };

                    int idx = 1;
                    for (java.util.Map<String, Object> dist : districtRows) {
                        Long distId = ((Number) dist.get("id")).longValue();
                        String distName = dist.get("name").toString();
                        String division = dist.get("division").toString();
                        Long rsmId = rsmDivMap.getOrDefault(division.toLowerCase(), 1L);

                        String code = String.format("ASM-%s-%02d", division.substring(0, Math.min(3, division.length())).toUpperCase(), idx);
                        String fName = asmFirstNames[(idx * 3) % asmFirstNames.length];
                        String lName = asmLastNames[(idx * 5) % asmLastNames.length];
                        String name = fName + " " + lName;
                        String cleanDist = distName.toLowerCase().replaceAll("[^a-z0-9]", "");
                        String email = "asm." + cleanDist + "@fizzdrop.com";
                        String phone = String.format("+88017%02d-%06d", (idx % 80) + 10, (idx * 11451) % 900000 + 100000);

                        jdbcTemplate.update(
                            "INSERT INTO area_sales_managers (code, name, email, phone, district_id, district_name, division, rsm_id, target_sales) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                            code, name, email, phone, distId, distName, division, rsmId, new java.math.BigDecimal("2500000.00")
                        );
                        idx++;
                    }
                    System.out.println("[DataInitializer] 64 Area Sales Managers (ASM) created across 64 districts.");
                }
            } catch (Exception e) {
                System.err.println("[DataInitializer] Error seeding ASMs: " + e.getMessage());
            }

            // Map Sales Officers to their district ASM
            try {
                jdbcTemplate.execute("UPDATE sales_officers SET asm_id = (SELECT asm.id FROM area_sales_managers asm WHERE asm.district_id = sales_officers.district_id) WHERE asm_id IS NULL");
            } catch (Exception ignored) {}

            // Seed initial retail sales in outlet_sales if empty
            try {
                boolean isOracle = DatabaseConfig.activeDbEngine != null && DatabaseConfig.activeDbEngine.toLowerCase().contains("oracle");
                if (!isOracle) {
                    jdbcTemplate.execute(
                        "CREATE TABLE IF NOT EXISTS outlet_sales (" +
                        "id BIGINT AUTO_INCREMENT PRIMARY KEY, " +
                        "sale_code VARCHAR(100) NOT NULL, " +
                        "outlet_id BIGINT NOT NULL, " +
                        "product_id BIGINT NOT NULL, " +
                        "product_name VARCHAR(150), " +
                        "quantity INT NOT NULL, " +
                        "unit_price DECIMAL(10,2) NOT NULL, " +
                        "total_amount DECIMAL(12,2) NOT NULL, " +
                        "payment_method VARCHAR(50) DEFAULT 'Cash', " +
                        "customer_notes TEXT, " +
                        "sale_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, " +
                        "INDEX idx_os_outlet (outlet_id), " +
                        "INDEX idx_os_prod (product_id), " +
                        "INDEX idx_os_date (sale_date)" +
                        ")"
                    );
                }
            } catch (Exception e) {
                System.err.println("[DataInitializer] outlet_sales check/seed error: " + e.getMessage());
            }

            // Pre-Sales Officers and Outlets are cleanly created and assigned by the Superadmin and Sales Officers.
        };
    }
}
