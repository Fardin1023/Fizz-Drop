-- ============================================================================
-- FizzDrop Multi-Tier Beverage E-Commerce & B2B Logistics Platform
-- Database Tier Implementation - MySQL 8.0+
-- Script: 04_test_suite.sql
-- Description: Automated verification and behavioral test suite validating:
--              1) Role-Based Location Association (Branch constraints)
--              2) Anti-Overselling & Atomic Stock Deduction (Row-level lock)
--              3) Historical Price Immutability
--              4) B2B Replenishment Fulfillment (Atomic stock increment)
--              5) Referential Deletion Restraints (ON DELETE RESTRICT)
--              6) Secondary Index Coverage & Audit Trail Verification
-- ============================================================================

USE `fizzdrop_db`;

SET SQL_SAFE_UPDATES = 0;

-- Drop test results table and runner procedure if exists
DROP TABLE IF EXISTS `test_results`;
CREATE TABLE `test_results` (
    `test_id` INT AUTO_INCREMENT PRIMARY KEY,
    `test_name` VARCHAR(100) NOT NULL,
    `status` ENUM('PASSED', 'FAILED') NOT NULL,
    `details` VARCHAR(255) NOT NULL
);

DROP PROCEDURE IF EXISTS `run_fizzdrop_test_suite`;

DELIMITER $$

CREATE PROCEDURE `run_fizzdrop_test_suite`()
BEGIN
    -- Local variables for tests
    DECLARE v_failed BOOLEAN DEFAULT FALSE;
    DECLARE v_order_id INT;
    DECLARE v_total DECIMAL(10,2);
    DECLARE v_initial_stock INT;
    DECLARE v_final_stock INT;
    DECLARE v_item_count INT;
    DECLARE v_historical_price DECIMAL(10,2);
    DECLARE v_current_catalog_price DECIMAL(10,2);
    DECLARE v_stock_before INT;
    DECLARE v_stock_after INT;
    DECLARE v_status VARCHAR(50);
    DECLARE v_user_delete_failed BOOLEAN DEFAULT FALSE;
    DECLARE v_product_delete_failed BOOLEAN DEFAULT FALSE;
    DECLARE v_idx_count INT DEFAULT 0;

    -- ========================================================================
    -- TEST 1A: Shopkeeper with NULL branch_id should FAIL
    -- ========================================================================
    SET v_failed = FALSE;
    BEGIN
        DECLARE CONTINUE HANDLER FOR SQLEXCEPTION SET v_failed = TRUE;
        INSERT INTO `Users` (`role_id`, `branch_id`, `email`, `password_hash`, `created_by`, `updated_by`)
        VALUES (2, NULL, 'invalid.shopkeeper@fizzdrop.com', 'dummyhash', 1, 1);
    END;

    IF v_failed THEN
        INSERT INTO `test_results` (`test_name`, `status`, `details`)
        VALUES ('Test 1A: Reject Shopkeeper with NULL branch', 'PASSED', 'Successfully rejected Shopkeeper without branch.');
    ELSE
        INSERT INTO `test_results` (`test_name`, `status`, `details`)
        VALUES ('Test 1A: Reject Shopkeeper with NULL branch', 'FAILED', 'Violated rule: allowed Shopkeeper with NULL branch.');
    END IF;

    -- ========================================================================
    -- TEST 1B: Customer with NOT NULL branch_id should FAIL
    -- ========================================================================
    SET v_failed = FALSE;
    BEGIN
        DECLARE CONTINUE HANDLER FOR SQLEXCEPTION SET v_failed = TRUE;
        INSERT INTO `Users` (`role_id`, `branch_id`, `email`, `password_hash`, `created_by`, `updated_by`)
        VALUES (1, 1, 'invalid.customer@fizzdrop.com', 'dummyhash', 1, 1);
    END;

    IF v_failed THEN
        INSERT INTO `test_results` (`test_name`, `status`, `details`)
        VALUES ('Test 1B: Reject Customer with branch_id', 'PASSED', 'Successfully rejected Customer with assigned branch.');
    ELSE
        INSERT INTO `test_results` (`test_name`, `status`, `details`)
        VALUES ('Test 1B: Reject Customer with branch_id', 'FAILED', 'Violated rule: allowed Customer with assigned branch.');
    END IF;

    -- ========================================================================
    -- TEST 2A: Anti-Overselling Guard (sp_PlaceCustomerOrder exceeding stock)
    -- ========================================================================
    SET v_failed = FALSE;
    BEGIN
        DECLARE CONTINUE HANDLER FOR SQLEXCEPTION SET v_failed = TRUE;
        -- Branch 3 Product 2 has limited stock. Requesting 5000 units.
        CALL `sp_PlaceCustomerOrder`(6, 3, '[{"product_id": 2, "quantity": 5000}]', v_order_id, v_total);
    END;

    IF v_failed THEN
        INSERT INTO `test_results` (`test_name`, `status`, `details`)
        VALUES ('Test 2A: Anti-Overselling Guard', 'PASSED', 'Prevented overselling when requested qty > available stock.');
    ELSE
        INSERT INTO `test_results` (`test_name`, `status`, `details`)
        VALUES ('Test 2A: Anti-Overselling Guard', 'FAILED', 'Overselling was incorrectly permitted.');
    END IF;

    -- ========================================================================
    -- TEST 2B: Valid order placement, stock decrement & line-item insertion
    -- ========================================================================
    SELECT `stock_quantity` INTO v_initial_stock
    FROM `Shop_Inventory`
    WHERE `branch_id` = 1 AND `product_id` = 1;

    CALL `sp_PlaceCustomerOrder`(6, 1, '[{"product_id": 1, "quantity": 5}]', v_order_id, v_total);

    SELECT `stock_quantity` INTO v_final_stock
    FROM `Shop_Inventory`
    WHERE `branch_id` = 1 AND `product_id` = 1;

    SELECT COUNT(*) INTO v_item_count
    FROM `Order_Items`
    WHERE `order_id` = v_order_id;

    IF (v_initial_stock - v_final_stock = 5) AND (v_total = 125.00) AND (v_item_count = 1) THEN
        INSERT INTO `test_results` (`test_name`, `status`, `details`)
        VALUES ('Test 2B: Atomic Order Placement', 'PASSED', CONCAT('Order #', v_order_id, ' placed successfully, stock decremented by 5.'));
    ELSE
        INSERT INTO `test_results` (`test_name`, `status`, `details`)
        VALUES ('Test 2B: Atomic Order Placement', 'FAILED', 'Stock deduction or order insertion failed.');
    END IF;

    -- ========================================================================
    -- TEST 3: Historical Price Immutability
    -- ========================================================================
    SELECT `price_at_purchase` INTO v_historical_price
    FROM `Order_Items`
    WHERE `order_item_id` = 1;

    -- Alter master catalog price for Product 2
    UPDATE `Products` SET `base_price` = 999.99, `updated_by` = 1 WHERE `product_id` = 2;

    -- Verify that order item retains original price
    SELECT `price_at_purchase` INTO v_current_catalog_price
    FROM `Order_Items`
    WHERE `order_item_id` = 1;

    -- Revert price back
    UPDATE `Products` SET `base_price` = 40.00, `updated_by` = 1 WHERE `product_id` = 2;

    IF v_historical_price = v_current_catalog_price AND v_current_catalog_price = 40.00 THEN
        INSERT INTO `test_results` (`test_name`, `status`, `details`)
        VALUES ('Test 3: Historical Price Immutability', 'PASSED', 'Order items retained historical price_at_purchase independently.');
    ELSE
        INSERT INTO `test_results` (`test_name`, `status`, `details`)
        VALUES ('Test 3: Historical Price Immutability', 'FAILED', 'Historical price in Order_Items was altered.');
    END IF;

    -- ========================================================================
    -- TEST 4: B2B Replenishment Fulfillment (sp_ApproveRestockRequest)
    -- ========================================================================
    SELECT `stock_quantity` INTO v_stock_before
    FROM `Shop_Inventory`
    WHERE `branch_id` = 3 AND `product_id` = 1;

    -- Approve pending Restock Request 2 by Supplier 1
    CALL `sp_ApproveRestockRequest`(2, 1);

    SELECT `stock_quantity` INTO v_stock_after
    FROM `Shop_Inventory`
    WHERE `branch_id` = 3 AND `product_id` = 1;

    SELECT `request_status` INTO v_status
    FROM `Restock_Requests`
    WHERE `request_id` = 2;

    IF (v_status = 'Approved') AND (v_stock_after - v_stock_before = 100) THEN
        INSERT INTO `test_results` (`test_name`, `status`, `details`)
        VALUES ('Test 4: B2B Restock Approval & Stock Increment', 'PASSED', 'Restock approved and branch stock incremented atomically.');
    ELSE
        INSERT INTO `test_results` (`test_name`, `status`, `details`)
        VALUES ('Test 4: B2B Restock Approval & Stock Increment', 'FAILED', 'Restock request not approved or stock did not increment.');
    END IF;

    -- ========================================================================
    -- TEST 5: Referential Deletion Restraints (ON DELETE RESTRICT)
    -- ========================================================================
    SET v_user_delete_failed = FALSE;
    SET v_product_delete_failed = FALSE;

    BEGIN
        DECLARE CONTINUE HANDLER FOR SQLEXCEPTION SET v_user_delete_failed = TRUE;
        DELETE FROM `Users` WHERE `user_id` = 6;
    END;

    BEGIN
        DECLARE CONTINUE HANDLER FOR SQLEXCEPTION SET v_product_delete_failed = TRUE;
        DELETE FROM `Products` WHERE `product_id` = 1;
    END;

    IF v_user_delete_failed AND v_product_delete_failed THEN
        INSERT INTO `test_results` (`test_name`, `status`, `details`)
        VALUES ('Test 5: Referential Deletion Restraints', 'PASSED', 'ON DELETE RESTRICT prevented deletion of active entities.');
    ELSE
        INSERT INTO `test_results` (`test_name`, `status`, `details`)
        VALUES ('Test 5: Referential Deletion Restraints', 'FAILED', 'Deletion constraints failed to protect transaction history.');
    END IF;

    -- ========================================================================
    -- TEST 6: Mandated Secondary Indexes Verification
    -- ========================================================================
    SELECT COUNT(DISTINCT index_name) INTO v_idx_count
    FROM information_schema.statistics
    WHERE table_schema = 'fizzdrop_db'
      AND index_name IN (
        'idx_users_branch_role',
        'idx_products_brand_cat_size',
        'idx_shop_inventory_branch_stock',
        'idx_orders_branch_status_date',
        'idx_orders_user_date'
      );

    IF v_idx_count = 5 THEN
        INSERT INTO `test_results` (`test_name`, `status`, `details`)
        VALUES ('Test 6: Mandated Secondary Indexes', 'PASSED', 'All 5 mandated optimization indexes verified.');
    ELSE
        INSERT INTO `test_results` (`test_name`, `status`, `details`)
        VALUES ('Test 6: Mandated Secondary Indexes', 'FAILED', CONCAT('Missing indexes. Found: ', v_idx_count, '/5'));
    END IF;

END$$

DELIMITER ;

-- Execute test suite
CALL `run_fizzdrop_test_suite`();

-- Clean up runner procedure
DROP PROCEDURE IF EXISTS `run_fizzdrop_test_suite`;

-- Display Test Results Table
SELECT `test_id` AS `#`, `test_name` AS `Test Case`, `status` AS `Status`, `details` AS `Verification Details` 
FROM `test_results`;
