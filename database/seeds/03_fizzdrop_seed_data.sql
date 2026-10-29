-- ============================================================================
-- FizzDrop Multi-Tier Beverage E-Commerce & B2B Logistics Platform
-- Database Tier Implementation - MySQL 8.0+
-- Script: 03_fizzdrop_seed_data.sql
-- Description: Bootstrap roles and identity accounts (Superadmin and Supplier Admin).
--              All sample products, outlets, inventory, orders, and restocks are removed.
-- ============================================================================

USE `fizzdrop_db`;

-- Disable FK checks and safe updates temporarily for clean reset
SET FOREIGN_KEY_CHECKS = 0;
SET SQL_SAFE_UPDATES = 0;

TRUNCATE TABLE `Order_Items`;
TRUNCATE TABLE `Orders`;
TRUNCATE TABLE `Restock_Items`;
TRUNCATE TABLE `Restock_Requests`;
TRUNCATE TABLE `Shop_Inventory`;
TRUNCATE TABLE `Products`;
TRUNCATE TABLE `Outlets`;
TRUNCATE TABLE `Users`;
TRUNCATE TABLE `Branches`;
TRUNCATE TABLE `Roles`;

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================================
-- 1. SEED SYSTEM ROLES (Customer, Shopkeeper, Supplier, Superadmin)
-- ============================================================================
INSERT INTO `Roles` (`role_id`, `role_name`, `created_by`, `created_date`, `updated_by`, `updated_date`)
VALUES
(1, 'Customer',    NULL, NOW(), NULL, NOW()),
(2, 'Shopkeeper',  NULL, NOW(), NULL, NOW()),
(3, 'Supplier',    NULL, NOW(), NULL, NOW()),
(4, 'Superadmin',  NULL, NOW(), NULL, NOW());

-- ============================================================================
-- 2. SEED INITIAL ADMINISTRATIVE ACCOUNTS
-- Superadmin: superadmin@fizzdrop.com / Password123!
-- Supplier:   central.supplier@fizzdrop.com / Password123!
-- ============================================================================
INSERT INTO `Users` (`user_id`, `role_id`, `branch_id`, `email`, `password_hash`, `created_by`, `created_date`, `updated_by`, `updated_date`)
VALUES
(1, 4, NULL, 'superadmin@fizzdrop.com',       '$2a$12$e0MYzXyjpJS7Pd0RVvHwHeY8rDqf9mKn11OQW0Hk6qV.iY6p0f5m2', 1, NOW(), 1, NOW()),
(2, 3, NULL, 'central.supplier@fizzdrop.com', '$2a$12$e0MYzXyjpJS7Pd0RVvHwHeY8rDqf9mKn11OQW0Hk6qV.iY6p0f5m2', 1, NOW(), 1, NOW());

-- Backfill audit FKs on base Roles to user 1
UPDATE `Roles` SET `created_by` = 1, `updated_by` = 1 WHERE `role_id` > 0;
