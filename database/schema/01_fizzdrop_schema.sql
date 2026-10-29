-- ============================================================================
-- FizzDrop Multi-Tier Beverage E-Commerce & B2B Logistics Platform
-- Database Tier Implementation - MySQL 8.0+
-- Script: 01_fizzdrop_schema.sql
-- Description: Core schema definition with strict dependency resolution,
--              universal audit logging, foreign keys, and mandated secondary indexes.
-- ============================================================================

CREATE DATABASE IF NOT EXISTS `fizzdrop_db`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `fizzdrop_db`;

-- Set session parameters for strict SQL execution
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================================
-- STEP 1: CREATE BASE LOOKUP TABLES WITHOUT AUDIT FOREIGN KEYS
-- Resolves circular dependency between Users, Roles, and Branches.
-- ============================================================================

-- Domain 1: Identity and Access Control - Roles
CREATE TABLE IF NOT EXISTS `Roles` (
    `role_id` INT AUTO_INCREMENT PRIMARY KEY,
    `role_name` VARCHAR(50) NOT NULL UNIQUE,
    -- Standard Universal Audit Columns
    `created_by` INT NULL,
    `created_date` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_by` INT NULL,
    `updated_date` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT `chk_roles_name_not_empty` CHECK (CHAR_LENGTH(TRIM(`role_name`)) > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Domain 1: Identity and Access Control - Branches & Outlets
CREATE TABLE IF NOT EXISTS `Branches` (
    `branch_id` INT AUTO_INCREMENT PRIMARY KEY,
    `branch_name` VARCHAR(100) NOT NULL,
    `location_address` VARCHAR(255) NOT NULL,
    -- Standard Universal Audit Columns
    `created_by` INT NULL,
    `created_date` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_by` INT NULL,
    `updated_date` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT `chk_branches_name_not_empty` CHECK (CHAR_LENGTH(TRIM(`branch_name`)) > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `Outlets` (
    `outlet_id` INT AUTO_INCREMENT PRIMARY KEY,
    `outlet_name` VARCHAR(100) NOT NULL,
    `location_address` VARCHAR(255) NOT NULL,
    `contact_phone` VARCHAR(50) NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'Active',
    -- Standard Universal Audit Columns
    `created_by` INT NULL,
    `created_date` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_by` INT NULL,
    `updated_date` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT `chk_outlets_name_not_empty` CHECK (CHAR_LENGTH(TRIM(`outlet_name`)) > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- STEP 2: CREATE CENTRAL IDENTITY TABLE (Users)
-- Defines FKs to Roles and Branches, and self-referencing FKs for audit trail.
-- ============================================================================

CREATE TABLE IF NOT EXISTS `Users` (
    `user_id` INT AUTO_INCREMENT PRIMARY KEY,
    `role_id` INT NOT NULL,
    `branch_id` INT NULL, -- Populated ONLY for Shopkeepers; NULL for Customers & Suppliers
    `email` VARCHAR(100) NOT NULL UNIQUE,
    `password_hash` VARCHAR(255) NOT NULL,
    -- Standard Universal Audit Columns
    `created_by` INT NULL,
    `created_date` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_by` INT NULL,
    `updated_date` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    -- Foreign Keys
    CONSTRAINT `fk_users_role` FOREIGN KEY (`role_id`)
        REFERENCES `Roles` (`role_id`)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,
    CONSTRAINT `fk_users_branch` FOREIGN KEY (`branch_id`)
        REFERENCES `Branches` (`branch_id`)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,
    CONSTRAINT `fk_users_created_by` FOREIGN KEY (`created_by`)
        REFERENCES `Users` (`user_id`)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,
    CONSTRAINT `fk_users_updated_by` FOREIGN KEY (`updated_by`)
        REFERENCES `Users` (`user_id`)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,
    CONSTRAINT `chk_users_email_format` CHECK (`email` LIKE '%_@__%.__%')
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- STEP 3: PATCH BASE LOOKUPS WITH AUDIT FOREIGN KEYS
-- Attach FK constraints on created_by and updated_by referencing Users(user_id).
-- ============================================================================

ALTER TABLE `Roles`
    ADD CONSTRAINT `fk_roles_created_by` FOREIGN KEY (`created_by`)
        REFERENCES `Users` (`user_id`)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,
    ADD CONSTRAINT `fk_roles_updated_by` FOREIGN KEY (`updated_by`)
        REFERENCES `Users` (`user_id`)
        ON DELETE RESTRICT
        ON UPDATE CASCADE;

ALTER TABLE `Branches`
    ADD CONSTRAINT `fk_branches_created_by` FOREIGN KEY (`created_by`)
        REFERENCES `Users` (`user_id`)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,
    ADD CONSTRAINT `fk_branches_updated_by` FOREIGN KEY (`updated_by`)
        REFERENCES `Users` (`user_id`)
        ON DELETE RESTRICT
        ON UPDATE CASCADE;

-- ============================================================================
-- STEP 4: DEPLOY MASTER PRODUCT CATALOG AND LOCALIZED INVENTORY TABLES
-- ============================================================================

-- Domain 2: Master Product Catalog
CREATE TABLE IF NOT EXISTS `Products` (
    `product_id` INT AUTO_INCREMENT PRIMARY KEY,
    `brand` VARCHAR(50) NOT NULL,
    `flavor_variant` VARCHAR(50) NOT NULL,
    `packaging` VARCHAR(50) NOT NULL,
    `size_volume` VARCHAR(20) NOT NULL,
    `sku` VARCHAR(50) NOT NULL UNIQUE,
    `base_price` DECIMAL(10,2) NOT NULL,
    `category` VARCHAR(50) NOT NULL DEFAULT 'Beverage',
    `image_url` LONGTEXT NULL,
    -- Standard Universal Audit Columns
    `created_by` INT NULL,
    `created_date` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_by` INT NULL,
    `updated_date` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    -- Audit Foreign Keys
    CONSTRAINT `fk_products_created_by` FOREIGN KEY (`created_by`)
        REFERENCES `Users` (`user_id`)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,
    CONSTRAINT `fk_products_updated_by` FOREIGN KEY (`updated_by`)
        REFERENCES `Users` (`user_id`)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,
    CONSTRAINT `chk_products_base_price_non_negative` CHECK (`base_price` >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Domain 2: Localized Physical Branch Inventory
CREATE TABLE IF NOT EXISTS `Shop_Inventory` (
    `branch_id` INT NOT NULL,
    `product_id` INT NOT NULL,
    `stock_quantity` INT NOT NULL DEFAULT 0,
    -- Standard Universal Audit Columns
    `created_by` INT NULL,
    `created_date` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_by` INT NULL,
    `updated_date` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    -- Composite Primary Key
    PRIMARY KEY (`branch_id`, `product_id`),
    -- Foreign Keys
    CONSTRAINT `fk_shop_inv_branch` FOREIGN KEY (`branch_id`)
        REFERENCES `Branches` (`branch_id`)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    CONSTRAINT `fk_shop_inv_product` FOREIGN KEY (`product_id`)
        REFERENCES `Products` (`product_id`)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,
    CONSTRAINT `fk_shop_inv_created_by` FOREIGN KEY (`created_by`)
        REFERENCES `Users` (`user_id`)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,
    CONSTRAINT `fk_shop_inv_updated_by` FOREIGN KEY (`updated_by`)
        REFERENCES `Users` (`user_id`)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,
    CONSTRAINT `chk_shop_inv_stock_non_negative` CHECK (`stock_quantity` >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- STEP 5: DEPLOY TRANSACTION AND LOGISTICS TABLES
-- ============================================================================

-- Domain 3: Commerce and Transactions - Orders (Parent)
CREATE TABLE IF NOT EXISTS `Orders` (
    `order_id` INT AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT NOT NULL,
    `branch_id` INT NOT NULL,
    `order_date` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `total_amount` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    `order_status` VARCHAR(50) NOT NULL DEFAULT 'Pending',
    -- Standard Universal Audit Columns
    `created_by` INT NULL,
    `created_date` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_by` INT NULL,
    `updated_date` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    -- Foreign Keys
    CONSTRAINT `fk_orders_user` FOREIGN KEY (`user_id`)
        REFERENCES `Users` (`user_id`)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,
    CONSTRAINT `fk_orders_branch` FOREIGN KEY (`branch_id`)
        REFERENCES `Branches` (`branch_id`)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,
    CONSTRAINT `fk_orders_created_by` FOREIGN KEY (`created_by`)
        REFERENCES `Users` (`user_id`)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,
    CONSTRAINT `fk_orders_updated_by` FOREIGN KEY (`updated_by`)
        REFERENCES `Users` (`user_id`)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,
    CONSTRAINT `chk_orders_total_non_negative` CHECK (`total_amount` >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Domain 3: Commerce and Transactions - Order_Items (Dependent Line Items)
CREATE TABLE IF NOT EXISTS `Order_Items` (
    `order_item_id` INT AUTO_INCREMENT PRIMARY KEY,
    `order_id` INT NOT NULL,
    `product_id` INT NOT NULL,
    `quantity` INT NOT NULL,
    `price_at_purchase` DECIMAL(10,2) NOT NULL, -- Historical Price Immutability
    -- Standard Universal Audit Columns
    `created_by` INT NULL,
    `created_date` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_by` INT NULL,
    `updated_date` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    -- Foreign Keys
    CONSTRAINT `fk_order_items_order` FOREIGN KEY (`order_id`)
        REFERENCES `Orders` (`order_id`)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    CONSTRAINT `fk_order_items_product` FOREIGN KEY (`product_id`)
        REFERENCES `Products` (`product_id`)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,
    CONSTRAINT `fk_order_items_created_by` FOREIGN KEY (`created_by`)
        REFERENCES `Users` (`user_id`)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,
    CONSTRAINT `fk_order_items_updated_by` FOREIGN KEY (`updated_by`)
        REFERENCES `Users` (`user_id`)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,
    CONSTRAINT `chk_order_items_qty_positive` CHECK (`quantity` > 0),
    CONSTRAINT `chk_order_items_price_non_negative` CHECK (`price_at_purchase` >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Domain 4: B2B Fulfillment and Restocking Logistics - Restock_Requests (Parent)
CREATE TABLE IF NOT EXISTS `Restock_Requests` (
    `request_id` INT AUTO_INCREMENT PRIMARY KEY,
    `branch_id` INT NOT NULL,
    `supplier_id` INT NULL,
    `request_date` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `request_status` VARCHAR(50) NOT NULL DEFAULT 'Pending',
    -- Standard Universal Audit Columns
    `created_by` INT NULL,
    `created_date` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_by` INT NULL,
    `updated_date` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    -- Foreign Keys
    CONSTRAINT `fk_restock_branch` FOREIGN KEY (`branch_id`)
        REFERENCES `Branches` (`branch_id`)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,
    CONSTRAINT `fk_restock_supplier` FOREIGN KEY (`supplier_id`)
        REFERENCES `Users` (`user_id`)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,
    CONSTRAINT `fk_restock_created_by` FOREIGN KEY (`created_by`)
        REFERENCES `Users` (`user_id`)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,
    CONSTRAINT `fk_restock_updated_by` FOREIGN KEY (`updated_by`)
        REFERENCES `Users` (`user_id`)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Domain 4: B2B Fulfillment and Restocking Logistics - Restock_Items (Dependent Line Items)
CREATE TABLE IF NOT EXISTS `Restock_Items` (
    `restock_item_id` INT AUTO_INCREMENT PRIMARY KEY,
    `request_id` INT NOT NULL,
    `product_id` INT NOT NULL,
    `requested_quantity` INT NOT NULL,
    -- Standard Universal Audit Columns
    `created_by` INT NULL,
    `created_date` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_by` INT NULL,
    `updated_date` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    -- Foreign Keys
    CONSTRAINT `fk_restock_items_request` FOREIGN KEY (`request_id`)
        REFERENCES `Restock_Requests` (`request_id`)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    CONSTRAINT `fk_restock_items_product` FOREIGN KEY (`product_id`)
        REFERENCES `Products` (`product_id`)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,
    CONSTRAINT `fk_restock_items_created_by` FOREIGN KEY (`created_by`)
        REFERENCES `Users` (`user_id`)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,
    CONSTRAINT `fk_restock_items_updated_by` FOREIGN KEY (`updated_by`)
        REFERENCES `Users` (`user_id`)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,
    CONSTRAINT `chk_restock_items_qty_positive` CHECK (`requested_quantity` > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- STEP 6: QUERY OPTIMIZATION AND INDEXING STRATEGY
-- Explicit secondary indexes mandated by Section 4 of implementation plan.
-- ============================================================================

-- 1. Identity and Routing Lookups
CREATE INDEX `idx_users_branch_role`
    ON `Users` (`branch_id`, `role_id`);

-- 2. Product Catalog Browsing
CREATE INDEX `idx_products_brand_cat_size`
    ON `Products` (`brand`, `category`, `size_volume`);

-- Note: `sku` already has an implicit unique index due to `UNIQUE` constraint,
-- but created explicitly if not present:
-- CREATE UNIQUE INDEX `uq_products_sku` ON `Products` (`sku`);

-- 3. Store Inventory and Low-Stock Alerting
CREATE INDEX `idx_shop_inventory_branch_stock`
    ON `Shop_Inventory` (`branch_id`, `stock_quantity`);

-- 4. Order Processing Queues
CREATE INDEX `idx_orders_branch_status_date`
    ON `Orders` (`branch_id`, `order_status`, `order_date`);

CREATE INDEX `idx_orders_user_date`
    ON `Orders` (`user_id`, `order_date`);

-- 5. Additional Recommended Logistics Queues
CREATE INDEX `idx_restock_branch_status_date`
    ON `Restock_Requests` (`branch_id`, `request_status`, `request_date`);

CREATE INDEX `idx_restock_supplier_status`
    ON `Restock_Requests` (`supplier_id`, `request_status`);

-- ============================================================================
-- STEP 7: BUSINESS RULE ENFORCEMENT TRIGGERS
-- Enforces:
--  1) Shopkeeper MUST have branch_id, while Customer and Supplier MUST have branch_id = NULL
--  2) Inventory stock deduction validation (preventing negative inventory)
-- ============================================================================

DELIMITER $$

-- Trigger: Enforce Role-Based Location Association on INSERT
CREATE TRIGGER `trg_users_role_branch_insert`
BEFORE INSERT ON `Users`
FOR EACH ROW
BEGIN
    DECLARE v_role_name VARCHAR(50);
    SELECT `role_name` INTO v_role_name FROM `Roles` WHERE `role_id` = NEW.`role_id`;

    IF v_role_name = 'Shopkeeper' AND NEW.`branch_id` IS NULL THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Business Rule Violation: Shopkeeper must be assigned to a specific branch (branch_id cannot be NULL).';
    ELSEIF (v_role_name = 'Customer' OR v_role_name = 'Supplier') AND NEW.`branch_id` IS NOT NULL THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Business Rule Violation: Customer and central Supplier cannot be tied to a specific branch (branch_id must be NULL).';
    END IF;
END$$

-- Trigger: Enforce Role-Based Location Association on UPDATE
CREATE TRIGGER `trg_users_role_branch_update`
BEFORE UPDATE ON `Users`
FOR EACH ROW
BEGIN
    DECLARE v_role_name VARCHAR(50);
    SELECT `role_name` INTO v_role_name FROM `Roles` WHERE `role_id` = NEW.`role_id`;

    IF v_role_name = 'Shopkeeper' AND NEW.`branch_id` IS NULL THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Business Rule Violation: Shopkeeper must be assigned to a specific branch (branch_id cannot be NULL).';
    ELSEIF (v_role_name = 'Customer' OR v_role_name = 'Supplier') AND NEW.`branch_id` IS NOT NULL THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Business Rule Violation: Customer and central Supplier cannot be tied to a specific branch (branch_id must be NULL).';
    END IF;
END$$

DELIMITER ;
