-- ============================================================================
-- FizzDrop Multi-Tier Beverage E-Commerce & B2B Logistics Platform
-- Database Tier Implementation - MySQL 8.0+
-- Script: 03_fizzdrop_seed_data.sql
-- Description: Master seed data for Roles, Branches, Users, Master Products Catalog,
--              Physical Branch Inventory, Sample Orders, and B2B Restock Requests.
-- ============================================================================

USE `fizzdrop_db`;

-- Disable FK checks and safe updates temporarily for bulk idempotent data ingestion
SET FOREIGN_KEY_CHECKS = 0;
SET SQL_SAFE_UPDATES = 0;

TRUNCATE TABLE `Order_Items`;
TRUNCATE TABLE `Orders`;
TRUNCATE TABLE `Restock_Items`;
TRUNCATE TABLE `Restock_Requests`;
TRUNCATE TABLE `Shop_Inventory`;
TRUNCATE TABLE `Products`;
TRUNCATE TABLE `Users`;
TRUNCATE TABLE `Branches`;
TRUNCATE TABLE `Roles`;

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================================
-- 1. SEED ROLES (Customer, Shopkeeper, Supplier)
-- ============================================================================
INSERT INTO `Roles` (`role_id`, `role_name`, `created_by`, `created_date`, `updated_by`, `updated_date`)
VALUES
(1, 'Customer',   NULL, NOW(), NULL, NOW()),
(2, 'Shopkeeper', NULL, NOW(), NULL, NOW()),
(3, 'Supplier',   NULL, NOW(), NULL, NOW());

-- ============================================================================
-- 2. SEED BRANCHES
-- ============================================================================
INSERT INTO `Branches` (`branch_id`, `branch_name`, `location_address`, `created_by`, `created_date`, `updated_by`, `updated_date`)
VALUES
(1, 'Dhaka Central Hub',      'House 42, Road 11, Banani, Dhaka 1213',         NULL, NOW(), NULL, NOW()),
(2, 'Chittagong Port Branch', 'GEC Circle, Nasirabad, Chittagong 4000',        NULL, NOW(), NULL, NOW()),
(3, 'Sylhet Metro Outlet',    'Subidbazar Main Road, Sylhet 3100',             NULL, NOW(), NULL, NOW()),
(4, 'Rajshahi City Depot',    'Shaheb Bazar Commercial Area, Rajshahi 6000',   NULL, NOW(), NULL, NOW());

-- ============================================================================
-- 3. SEED USERS
-- Notice:
--   - Customers (role 1): branch_id IS NULL
--   - Shopkeepers (role 2): branch_id IS NOT NULL (tied to physical branch)
--   - Central Suppliers (role 3): branch_id IS NULL
-- Password hashes use standard BCrypt format representing hashed test credentials: 'Password123!'
-- ============================================================================
INSERT INTO `Users` (`user_id`, `role_id`, `branch_id`, `email`, `password_hash`, `created_by`, `created_date`, `updated_by`, `updated_date`)
VALUES
-- System bootstrap supplier
(1, 3, NULL, 'central.supplier@fizzdrop.com',   '$2a$12$e0MYzXyjpJS7Pd0RVvHwHeY8rDqf9mKn11OQW0Hk6qV.iY6p0f5m2', 1, NOW(), 1, NOW()),
-- Additional central supplier
(2, 3, NULL, 'logistics.supplier@fizzdrop.com', '$2a$12$e0MYzXyjpJS7Pd0RVvHwHeY8rDqf9mKn11OQW0Hk6qV.iY6p0f5m2', 1, NOW(), 1, NOW()),
-- Shopkeepers tied to physical branches
(3, 2, 1,    'shopkeeper.dhaka@fizzdrop.com',   '$2a$12$e0MYzXyjpJS7Pd0RVvHwHeY8rDqf9mKn11OQW0Hk6qV.iY6p0f5m2', 1, NOW(), 1, NOW()),
(4, 2, 2,    'shopkeeper.ctg@fizzdrop.com',     '$2a$12$e0MYzXyjpJS7Pd0RVvHwHeY8rDqf9mKn11OQW0Hk6qV.iY6p0f5m2', 1, NOW(), 1, NOW()),
(5, 2, 3,    'shopkeeper.sylhet@fizzdrop.com',  '$2a$12$e0MYzXyjpJS7Pd0RVvHwHeY8rDqf9mKn11OQW0Hk6qV.iY6p0f5m2', 1, NOW(), 1, NOW()),
-- Customers with branch_id NULL
(6, 1, NULL, 'rahim.customer@gmail.com',        '$2a$12$e0MYzXyjpJS7Pd0RVvHwHeY8rDqf9mKn11OQW0Hk6qV.iY6p0f5m2', 1, NOW(), 1, NOW()),
(7, 1, NULL, 'fatima.customer@yahoo.com',       '$2a$12$e0MYzXyjpJS7Pd0RVvHwHeY8rDqf9mKn11OQW0Hk6qV.iY6p0f5m2', 1, NOW(), 1, NOW()),
(8, 1, NULL, 'tanvir.customer@outlook.com',     '$2a$12$e0MYzXyjpJS7Pd0RVvHwHeY8rDqf9mKn11OQW0Hk6qV.iY6p0f5m2', 1, NOW(), 1, NOW());

-- Backfill audit FKs on base Roles and Branches to user 1
UPDATE `Roles` SET `created_by` = 1, `updated_by` = 1 WHERE `role_id` > 0;
UPDATE `Branches` SET `created_by` = 1, `updated_by` = 1 WHERE `branch_id` > 0;

-- ============================================================================
-- 4. SEED MASTER PRODUCT CATALOG (Products)
-- Global definitions: SKU, brand, flavor, packaging, size, base_price, category
-- ============================================================================
INSERT INTO `Products` (`product_id`, `brand`, `flavor_variant`, `packaging`, `size_volume`, `sku`, `base_price`, `category`, `created_by`, `created_date`, `updated_by`, `updated_date`)
VALUES
-- Pepsi
(1,  'Pepsi',        'Sugar',      'Bottle',    '250ml',     'PEP-SUG-BOT-250',   25.00,  'Beverage',    1, NOW(), 1, NOW()),
(2,  'Pepsi',        'Sugar',      'Bottle',    '500ml',     'PEP-SUG-BOT-500',   40.00,  'Beverage',    1, NOW(), 1, NOW()),
(3,  'Pepsi',        'Sugar',      'Bottle',    '1L',        'PEP-SUG-BOT-1000',  75.00,  'Beverage',    1, NOW(), 1, NOW()),
(4,  'Pepsi',        'Sugar',      'Bottle',    '2L',        'PEP-SUG-BOT-2000',  130.00, 'Beverage',    1, NOW(), 1, NOW()),
(5,  'Pepsi',        'Diet',       'Bottle',    '500ml',     'PEP-DIE-BOT-500',   45.00,  'Beverage',    1, NOW(), 1, NOW()),
(6,  'Pepsi',        'Zero Sugar', 'Can',       '250ml',     'PEP-ZER-CAN-250',   50.00,  'Beverage',    1, NOW(), 1, NOW()),
-- 7up
(7,  '7up',          'Sugar',      'Bottle',    '250ml',     '7UP-SUG-BOT-250',   25.00,  'Beverage',    1, NOW(), 1, NOW()),
(8,  '7up',          'Sugar',      'Bottle',    '500ml',     '7UP-SUG-BOT-500',   40.00,  'Beverage',    1, NOW(), 1, NOW()),
(9,  '7up',          'Sugar',      'Bottle',    '1.5L',      '7UP-SUG-BOT-1500',  100.00, 'Beverage',    1, NOW(), 1, NOW()),
(10, '7up',          'Diet',       'Can',       '250ml',     '7UP-DIE-CAN-250',   50.00,  'Beverage',    1, NOW(), 1, NOW()),
-- Mirinda
(11, 'Mirinda',      'Sugar',      'Bottle',    '250ml',     'MIR-SUG-BOT-250',   25.00,  'Beverage',    1, NOW(), 1, NOW()),
(12, 'Mirinda',      'Sugar',      'Bottle',    '500ml',     'MIR-SUG-BOT-500',   40.00,  'Beverage',    1, NOW(), 1, NOW()),
(13, 'Mirinda',      'Sugar',      'Bottle',    '1L',        'MIR-SUG-BOT-1000',  75.00,  'Beverage',    1, NOW(), 1, NOW()),
-- Mountain Dew
(14, 'Mountain Dew', 'Sugar',      'Bottle',    '250ml',     'MDW-SUG-BOT-250',   25.00,  'Beverage',    1, NOW(), 1, NOW()),
(15, 'Mountain Dew', 'Sugar',      'Bottle',    '500ml',     'MDW-SUG-BOT-500',   40.00,  'Beverage',    1, NOW(), 1, NOW()),
(16, 'Mountain Dew', 'Sugar',      'Bottle',    '1L',        'MDW-SUG-BOT-1000',  75.00,  'Beverage',    1, NOW(), 1, NOW()),
-- Sting
(17, 'Sting',        'Sugar',      'Bottle',    '250ml',     'STG-SUG-BOT-250',   35.00,  'Beverage',    1, NOW(), 1, NOW()),
(18, 'Sting',        'Sugar',      'Can',       '250ml',     'STG-SUG-CAN-250',   50.00,  'Beverage',    1, NOW(), 1, NOW()),
-- Slice
(19, 'Slice',        'Sugar',      'Bottle',    '250ml',     'SLC-SUG-BOT-250',   30.00,  'Beverage',    1, NOW(), 1, NOW()),
(20, 'Slice',        'Sugar',      'Bottle',    '600ml',     'SLC-SUG-BOT-600',   55.00,  'Beverage',    1, NOW(), 1, NOW()),
-- Aquafina
(21, 'Aquafina',     'Pure Water', 'Bottle',    '500ml',     'AQU-WAT-BOT-500',   20.00,  'Beverage',    1, NOW(), 1, NOW()),
(22, 'Aquafina',     'Pure Water', 'Bottle',    '1L',        'AQU-WAT-BOT-1000',  30.00,  'Beverage',    1, NOW(), 1, NOW()),
(23, 'Aquafina',     'Pure Water', 'Bottle',    '2L',        'AQU-WAT-BOT-2000',  50.00,  'Beverage',    1, NOW(), 1, NOW()),
-- Merchandise
(24, 'Pepsi',        'Classic',    'Cotton',    'Large',     'MER-PEP-TSH-LRG',   450.00, 'Merchandise', 1, NOW(), 1, NOW()),
(25, 'Mountain Dew', 'Neon Green', 'Polyester', 'Free Size', 'MER-MDW-CAP-FRS',   300.00, 'Merchandise', 1, NOW(), 1, NOW());

-- ============================================================================
-- 5. SEED PHYSICAL BRANCH INVENTORY (Shop_Inventory)
-- Localized branch stock counts preventing overselling
-- ============================================================================
INSERT INTO `Shop_Inventory` (`branch_id`, `product_id`, `stock_quantity`, `created_by`, `created_date`, `updated_by`, `updated_date`)
VALUES
-- Branch 1: Dhaka Central Hub
(1, 1,  150, 1, NOW(), 1, NOW()),
(1, 2,  120, 1, NOW(), 1, NOW()),
(1, 3,  60,  1, NOW(), 1, NOW()),
(1, 5,  40,  1, NOW(), 1, NOW()),
(1, 6,  75,  1, NOW(), 1, NOW()),
(1, 7,  100, 1, NOW(), 1, NOW()),
(1, 8,  80,  1, NOW(), 1, NOW()),
(1, 11, 90,  1, NOW(), 1, NOW()),
(1, 14, 110, 1, NOW(), 1, NOW()),
(1, 17, 200, 1, NOW(), 1, NOW()),
(1, 19, 70,  1, NOW(), 1, NOW()),
(1, 21, 250, 1, NOW(), 1, NOW()),
(1, 22, 180, 1, NOW(), 1, NOW()),
(1, 24, 15,  1, NOW(), 1, NOW()), -- Merchandise low stock
(1, 25, 8,   1, NOW(), 1, NOW()), -- Merchandise low stock

-- Branch 2: Chittagong Port Branch
(2, 1,  80,  1, NOW(), 1, NOW()),
(2, 2,  60,  1, NOW(), 1, NOW()),
(2, 6,  30,  1, NOW(), 1, NOW()),
(2, 7,  90,  1, NOW(), 1, NOW()),
(2, 14, 50,  1, NOW(), 1, NOW()),
(2, 17, 120, 1, NOW(), 1, NOW()),
(2, 21, 150, 1, NOW(), 1, NOW()),
(2, 22, 100, 1, NOW(), 1, NOW()),

-- Branch 3: Sylhet Metro Outlet (Some near critical stock to test low-stock alert)
(3, 1,  12,  1, NOW(), 1, NOW()), -- Low stock
(3, 2,  5,   1, NOW(), 1, NOW()), -- Critical low stock
(3, 7,  4,   1, NOW(), 1, NOW()), -- Critical low stock
(3, 17, 50,  1, NOW(), 1, NOW()),
(3, 21, 100, 1, NOW(), 1, NOW());

-- ============================================================================
-- 6. SEED ORDERS AND ORDER ITEMS (Demonstrating Historical Price Immutability)
-- ============================================================================
INSERT INTO `Orders` (`order_id`, `user_id`, `branch_id`, `order_date`, `total_amount`, `order_status`, `created_by`, `created_date`, `updated_by`, `updated_date`)
VALUES
(1, 6, 1, DATE_SUB(NOW(), INTERVAL 2 DAY), 190.00, 'Completed', 6, DATE_SUB(NOW(), INTERVAL 2 DAY), 3, DATE_SUB(NOW(), INTERVAL 2 DAY)),
(2, 7, 1, DATE_SUB(NOW(), INTERVAL 1 DAY), 115.00, 'Completed', 7, DATE_SUB(NOW(), INTERVAL 1 DAY), 3, DATE_SUB(NOW(), INTERVAL 1 DAY)),
(3, 8, 2, NOW(),                           90.00,  'Pending',   8, NOW(),                           8, NOW());

INSERT INTO `Order_Items` (`order_item_id`, `order_id`, `product_id`, `quantity`, `price_at_purchase`, `created_by`, `created_date`, `updated_by`, `updated_date`)
VALUES
-- Order 1: 2 x Pepsi 500ml ($40) + 1 x Mountain Dew 1L ($75) + 1 x Sting 250ml ($35) = $190
(1, 1, 2,  2, 40.00, 6, NOW(), 6, NOW()),
(2, 1, 16, 1, 75.00, 6, NOW(), 6, NOW()),
(3, 1, 17, 1, 35.00, 6, NOW(), 6, NOW()),
-- Order 2: 1 x 7up 500ml ($40) + 1 x Aquafina 1L ($30) + 1 x Pepsi Diet ($45) = $115
(4, 2, 8,  1, 40.00, 7, NOW(), 7, NOW()),
(5, 2, 22, 1, 30.00, 7, NOW(), 7, NOW()),
(6, 2, 5,  1, 45.00, 7, NOW(), 7, NOW()),
-- Order 3: 2 x Pepsi 250ml ($25) + 1 x 7up 500ml ($40) = $90
(7, 3, 1,  2, 25.00, 8, NOW(), 8, NOW()),
(8, 3, 8,  1, 40.00, 8, NOW(), 8, NOW());

-- ============================================================================
-- 7. SEED B2B RESTOCK REQUESTS & RESTOCK ITEMS
-- ============================================================================
INSERT INTO `Restock_Requests` (`request_id`, `branch_id`, `supplier_id`, `request_date`, `request_status`, `created_by`, `created_date`, `updated_by`, `updated_date`)
VALUES
-- Historical approved request fulfilled by Supplier 1
(1, 1, 1, DATE_SUB(NOW(), INTERVAL 5 DAY), 'Approved', 3, DATE_SUB(NOW(), INTERVAL 5 DAY), 1, DATE_SUB(NOW(), INTERVAL 4 DAY)),
-- Active pending restock request from Sylhet branch awaiting supplier approval
(2, 3, NULL, NOW(), 'Pending', 5, NOW(), 5, NOW());

INSERT INTO `Restock_Items` (`restock_item_id`, `request_id`, `product_id`, `requested_quantity`, `created_by`, `created_date`, `updated_by`, `updated_date`)
VALUES
-- Items for Request 1 (Fulfilled)
(1, 1, 1,  200, 3, NOW(), 3, NOW()),
(2, 1, 17, 300, 3, NOW(), 3, NOW()),
-- Items for Request 2 (Pending for low-stock Sylhet branch)
(3, 2, 1,  100, 5, NOW(), 5, NOW()),
(4, 2, 2,  80,  5, NOW(), 5, NOW()),
(5, 2, 7,  60,  5, NOW(), 5, NOW());
