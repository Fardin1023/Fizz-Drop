-- ============================================================================
-- FizzDrop Multi-Tier Beverage E-Commerce & B2B Logistics Platform
-- All-in-One Master Deployment Script - MySQL 8.0+
-- Script: deploy.sql
-- Description: Executes full schema provisioning, triggers, stored procedures,
--              and seed data in strict dependency order.
-- Usage:
--   mysql -u <username> -p < database/deploy.sql
-- ============================================================================

CREATE DATABASE IF NOT EXISTS `fizzdrop_db`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `fizzdrop_db`;

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;
SET SQL_SAFE_UPDATES = 0;

-- Drop existing tables to guarantee pristine deployment state
DROP TABLE IF EXISTS `Order_Items`;
DROP TABLE IF EXISTS `Orders`;
DROP TABLE IF EXISTS `Restock_Items`;
DROP TABLE IF EXISTS `Restock_Requests`;
DROP TABLE IF EXISTS `Shop_Inventory`;
DROP TABLE IF EXISTS `Products`;
DROP TABLE IF EXISTS `Users`;
DROP TABLE IF EXISTS `Branches`;
DROP TABLE IF EXISTS `Roles`;

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================================
-- STEP 1: CREATE BASE LOOKUP TABLES WITHOUT AUDIT FOREIGN KEYS
-- Resolves circular dependency between Users, Roles, and Branches.
-- ============================================================================

-- Domain 1: Identity and Access Control - Roles
CREATE TABLE `Roles` (
    `role_id` INT AUTO_INCREMENT PRIMARY KEY,
    `role_name` VARCHAR(50) NOT NULL UNIQUE,
    `created_by` INT NULL,
    `created_date` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_by` INT NULL,
    `updated_date` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT `chk_roles_name_not_empty` CHECK (CHAR_LENGTH(TRIM(`role_name`)) > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Domain 1: Identity and Access Control - Branches
CREATE TABLE `Branches` (
    `branch_id` INT AUTO_INCREMENT PRIMARY KEY,
    `branch_name` VARCHAR(100) NOT NULL,
    `location_address` VARCHAR(255) NOT NULL,
    `created_by` INT NULL,
    `created_date` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_by` INT NULL,
    `updated_date` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT `chk_branches_name_not_empty` CHECK (CHAR_LENGTH(TRIM(`branch_name`)) > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- STEP 2: CREATE CENTRAL IDENTITY TABLE (Users)
-- Defines FKs to Roles and Branches, and self-referencing FKs for audit trail.
-- ============================================================================

CREATE TABLE `Users` (
    `user_id` INT AUTO_INCREMENT PRIMARY KEY,
    `role_id` INT NOT NULL,
    `branch_id` INT NULL, -- Populated ONLY for Shopkeepers; NULL for Customers & Suppliers
    `email` VARCHAR(100) NOT NULL UNIQUE,
    `password_hash` VARCHAR(255) NOT NULL,
    `created_by` INT NULL,
    `created_date` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_by` INT NULL,
    `updated_date` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
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
CREATE TABLE `Products` (
    `product_id` INT AUTO_INCREMENT PRIMARY KEY,
    `brand` VARCHAR(50) NOT NULL,
    `flavor_variant` VARCHAR(50) NOT NULL,
    `packaging` VARCHAR(50) NOT NULL,
    `size_volume` VARCHAR(20) NOT NULL,
    `sku` VARCHAR(50) NOT NULL UNIQUE,
    `base_price` DECIMAL(10,2) NOT NULL,
    `category` VARCHAR(50) NOT NULL DEFAULT 'Beverage',
    `created_by` INT NULL,
    `created_date` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_by` INT NULL,
    `updated_date` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
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
CREATE TABLE `Shop_Inventory` (
    `branch_id` INT NOT NULL,
    `product_id` INT NOT NULL,
    `stock_quantity` INT NOT NULL DEFAULT 0,
    `created_by` INT NULL,
    `created_date` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_by` INT NULL,
    `updated_date` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`branch_id`, `product_id`),
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
CREATE TABLE `Orders` (
    `order_id` INT AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT NOT NULL,
    `branch_id` INT NOT NULL,
    `order_date` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `total_amount` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    `order_status` VARCHAR(50) NOT NULL DEFAULT 'Pending',
    `created_by` INT NULL,
    `created_date` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_by` INT NULL,
    `updated_date` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
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

-- Domain 3: Commerce and Transactions - Order_Items (Line Items)
CREATE TABLE `Order_Items` (
    `order_item_id` INT AUTO_INCREMENT PRIMARY KEY,
    `order_id` INT NOT NULL,
    `product_id` INT NOT NULL,
    `quantity` INT NOT NULL,
    `price_at_purchase` DECIMAL(10,2) NOT NULL, -- Historical Price Immutability
    `created_by` INT NULL,
    `created_date` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_by` INT NULL,
    `updated_date` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
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
CREATE TABLE `Restock_Requests` (
    `request_id` INT AUTO_INCREMENT PRIMARY KEY,
    `branch_id` INT NOT NULL,
    `supplier_id` INT NULL,
    `request_date` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `request_status` VARCHAR(50) NOT NULL DEFAULT 'Pending',
    `created_by` INT NULL,
    `created_date` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_by` INT NULL,
    `updated_date` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
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

-- Domain 4: B2B Fulfillment and Restocking Logistics - Restock_Items (Line Items)
CREATE TABLE `Restock_Items` (
    `restock_item_id` INT AUTO_INCREMENT PRIMARY KEY,
    `request_id` INT NOT NULL,
    `product_id` INT NOT NULL,
    `requested_quantity` INT NOT NULL,
    `created_by` INT NULL,
    `created_date` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_by` INT NULL,
    `updated_date` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
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

-- 3. Store Inventory and Low-Stock Alerting
CREATE INDEX `idx_shop_inventory_branch_stock`
    ON `Shop_Inventory` (`branch_id`, `stock_quantity`);

-- 4. Order Processing Queues
CREATE INDEX `idx_orders_branch_status_date`
    ON `Orders` (`branch_id`, `order_status`, `order_date`);

CREATE INDEX `idx_orders_user_date`
    ON `Orders` (`user_id`, `order_date`);

-- 5. Additional Logistics Queues
CREATE INDEX `idx_restock_branch_status_date`
    ON `Restock_Requests` (`branch_id`, `request_status`, `request_date`);

CREATE INDEX `idx_restock_supplier_status`
    ON `Restock_Requests` (`supplier_id`, `request_status`);

-- ============================================================================
-- STEP 7: BUSINESS RULE ENFORCEMENT TRIGGERS
-- ============================================================================

DELIMITER $$

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

-- ============================================================================
-- STEP 8: STORED PROCEDURES (Atomic Transactions)
-- ============================================================================

DROP PROCEDURE IF EXISTS `sp_PlaceCustomerOrder`$$

CREATE PROCEDURE `sp_PlaceCustomerOrder`(
    IN  p_user_id     INT,
    IN  p_branch_id   INT,
    IN  p_items_json  JSON,
    OUT p_order_id    INT,
    OUT p_total       DECIMAL(10,2)
)
proc_block: BEGIN
    DECLARE v_item_count INT DEFAULT 0;
    DECLARE i INT DEFAULT 0;
    DECLARE v_product_id INT;
    DECLARE v_req_quantity INT;
    DECLARE v_available_stock INT;
    DECLARE v_unit_price DECIMAL(10,2);
    DECLARE v_order_total DECIMAL(10,2) DEFAULT 0.00;
    DECLARE v_user_role VARCHAR(50);

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    SELECT r.role_name INTO v_user_role
    FROM Users u
    JOIN Roles r ON u.role_id = r.role_id
    WHERE u.user_id = p_user_id;

    IF v_user_role IS NULL THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Order Error: Customer user not found.';
    END IF;

    SET v_item_count = JSON_LENGTH(p_items_json);
    IF v_item_count IS NULL OR v_item_count = 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Order Error: Order item list cannot be empty.';
    END IF;

    START TRANSACTION;

    INSERT INTO `Orders` (
        `user_id`,
        `branch_id`,
        `order_date`,
        `total_amount`,
        `order_status`,
        `created_by`,
        `updated_by`
    ) VALUES (
        p_user_id,
        p_branch_id,
        NOW(),
        0.00,
        'Pending',
        p_user_id,
        p_user_id
    );

    SET p_order_id = LAST_INSERT_ID();

    WHILE i < v_item_count DO
        SET v_product_id   = JSON_UNQUOTE(JSON_EXTRACT(p_items_json, CONCAT('$[', i, '].product_id')));
        SET v_req_quantity = JSON_UNQUOTE(JSON_EXTRACT(p_items_json, CONCAT('$[', i, '].quantity')));

        IF v_req_quantity <= 0 THEN
            SIGNAL SQLSTATE '45000'
                SET MESSAGE_TEXT = 'Order Error: Quantity must be greater than zero.';
        END IF;

        SELECT `base_price` INTO v_unit_price
        FROM `Products`
        WHERE `product_id` = v_product_id;

        IF v_unit_price IS NULL THEN
            SIGNAL SQLSTATE '45000'
                SET MESSAGE_TEXT = 'Order Error: Requested product does not exist in master catalog.';
        END IF;

        -- ROW-LEVEL LOCKING ON PHYSICAL BRANCH INVENTORY (ANTI-OVERSELLING)
        SELECT `stock_quantity` INTO v_available_stock
        FROM `Shop_Inventory`
        WHERE `branch_id` = p_branch_id AND `product_id` = v_product_id
        FOR UPDATE;

        IF v_available_stock IS NULL THEN
            SIGNAL SQLSTATE '45000'
                SET MESSAGE_TEXT = 'Order Error: Product not stocked at this branch.';
        END IF;

        IF v_available_stock < v_req_quantity THEN
            SIGNAL SQLSTATE '45000'
                SET MESSAGE_TEXT = 'Order Error: Insufficient stock for product to satisfy order.';
        END IF;

        UPDATE `Shop_Inventory`
        SET `stock_quantity` = `stock_quantity` - v_req_quantity,
            `updated_by`     = p_user_id,
            `updated_date`   = NOW()
        WHERE `branch_id` = p_branch_id AND `product_id` = v_product_id;

        INSERT INTO `Order_Items` (
            `order_id`,
            `product_id`,
            `quantity`,
            `price_at_purchase`,
            `created_by`,
            `updated_by`
        ) VALUES (
            p_order_id,
            v_product_id,
            v_req_quantity,
            v_unit_price,
            p_user_id,
            p_user_id
        );

        SET v_order_total = v_order_total + (v_unit_price * v_req_quantity);
        SET i = i + 1;
    END WHILE;

    UPDATE `Orders`
    SET `total_amount` = v_order_total,
        `updated_by`   = p_user_id,
        `updated_date` = NOW()
    WHERE `order_id` = p_order_id;

    SET p_total = v_order_total;

    COMMIT;
END proc_block$$

DROP PROCEDURE IF EXISTS `sp_ApproveRestockRequest`$$

CREATE PROCEDURE `sp_ApproveRestockRequest`(
    IN p_request_id   INT,
    IN p_supplier_id  INT
)
proc_block: BEGIN
    DECLARE v_current_status VARCHAR(50);
    DECLARE v_branch_id INT;
    DECLARE v_supplier_role VARCHAR(50);
    DECLARE done INT DEFAULT 0;
    DECLARE v_product_id INT;
    DECLARE v_req_quantity INT;

    DECLARE cur_items CURSOR FOR
        SELECT `product_id`, `requested_quantity`
        FROM `Restock_Items`
        WHERE `request_id` = p_request_id;

    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = 1;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    SELECT r.role_name INTO v_supplier_role
    FROM Users u
    JOIN Roles r ON u.role_id = r.role_id
    WHERE u.user_id = p_supplier_id;

    IF v_supplier_role != 'Supplier' THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Restock Error: Approver must possess the Supplier role.';
    END IF;

    START TRANSACTION;

    SELECT `request_status`, `branch_id`
    INTO v_current_status, v_branch_id
    FROM `Restock_Requests`
    WHERE `request_id` = p_request_id
    FOR UPDATE;

    IF v_current_status IS NULL THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Restock Error: Restock request does not exist.';
    END IF;

    IF v_current_status != 'Pending' THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Restock Error: Only Pending restock requests can be approved.';
    END IF;

    OPEN cur_items;
    read_loop: LOOP
        FETCH cur_items INTO v_product_id, v_req_quantity;
        IF done = 1 THEN
            LEAVE read_loop;
        END IF;

        INSERT INTO `Shop_Inventory` (
            `branch_id`,
            `product_id`,
            `stock_quantity`,
            `created_by`,
            `updated_by`
        ) VALUES (
            v_branch_id,
            v_product_id,
            v_req_quantity,
            p_supplier_id,
            p_supplier_id
        )
        ON DUPLICATE KEY UPDATE
            `stock_quantity` = `stock_quantity` + VALUES(`stock_quantity`),
            `updated_by`     = p_supplier_id,
            `updated_date`   = NOW();
    END LOOP;
    CLOSE cur_items;

    UPDATE `Restock_Requests`
    SET `request_status` = 'Approved',
        `supplier_id`    = p_supplier_id,
        `updated_by`     = p_supplier_id,
        `updated_date`   = NOW()
    WHERE `request_id` = p_request_id;

    COMMIT;
END proc_block$$

DROP PROCEDURE IF EXISTS `sp_GetLowStockProducts`$$

CREATE PROCEDURE `sp_GetLowStockProducts`(
    IN p_branch_id INT,
    IN p_threshold INT
)
BEGIN
    SELECT 
        si.branch_id,
        b.branch_name,
        p.product_id,
        p.sku,
        p.brand,
        p.flavor_variant,
        p.packaging,
        p.size_volume,
        p.base_price,
        si.stock_quantity,
        si.updated_date AS last_stock_update
    FROM `Shop_Inventory` si
    JOIN `Products` p ON si.product_id = p.product_id
    JOIN `Branches` b ON si.branch_id = b.branch_id
    WHERE si.branch_id = p_branch_id
      AND si.stock_quantity <= p_threshold
    ORDER BY si.stock_quantity ASC;
END$$

DELIMITER ;

-- ============================================================================
-- STEP 9: SYSTEM BOOTSTRAP (ROLES & CORE ADMINS - ZERO DEMO DATA)
-- ============================================================================

-- Roles
INSERT INTO `Roles` (`role_id`, `role_name`, `created_by`, `created_date`, `updated_by`, `updated_date`)
VALUES
(1, 'Customer',    NULL, NOW(), NULL, NOW()),
(2, 'Shopkeeper',  NULL, NOW(), NULL, NOW()),
(3, 'Supplier',    NULL, NOW(), NULL, NOW()),
(4, 'Superadmin',  NULL, NOW(), NULL, NOW());

-- Initial Administrative Accounts
INSERT INTO `Users` (`user_id`, `role_id`, `branch_id`, `email`, `password_hash`, `created_by`, `created_date`, `updated_by`, `updated_date`)
VALUES
(1, 4, NULL, 'superadmin@fizzdrop.com',       '$2a$12$e0MYzXyjpJS7Pd0RVvHwHeY8rDqf9mKn11OQW0Hk6qV.iY6p0f5m2', 1, NOW(), 1, NOW()),
(2, 3, NULL, 'central.supplier@fizzdrop.com', '$2a$12$e0MYzXyjpJS7Pd0RVvHwHeY8rDqf9mKn11OQW0Hk6qV.iY6p0f5m2', 1, NOW(), 1, NOW());

-- Backfill audit FKs on base Roles to user 1
UPDATE `Roles` SET `created_by` = 1, `updated_by` = 1 WHERE `role_id` > 0;

SELECT 'FizzDrop Database deployment completed successfully with zero demo data.' AS status;
