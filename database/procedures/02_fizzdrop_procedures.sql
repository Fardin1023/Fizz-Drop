-- ============================================================================
-- FizzDrop Multi-Tier Beverage E-Commerce & B2B Logistics Platform
-- Database Tier Implementation - MySQL 8.0+
-- Script: 02_fizzdrop_procedures.sql
-- Description: Stored Procedures & Atomic Transaction routines for:
--              1) Atomic Stock Deduction (Anti-Overselling with row locking)
--              2) B2B Replenishment Fulfillment (Stock increment upon approval)
--              3) Store Inventory & Low-Stock Alerting queries
-- ============================================================================

USE `fizzdrop_db`;

DELIMITER $$

-- ============================================================================
-- PROCEDURE: sp_PlaceCustomerOrder
-- Purpose: Atomically validate stock using SELECT ... FOR UPDATE row-level locking,
--          prevent overselling, decrement branch inventory, record order header,
--          and capture historical price-at-purchase in order items.
-- Parameters:
--   p_user_id      : INT (Customer placing order)
--   p_branch_id    : INT (Branch fulfilling order)
--   p_items_json   : JSON array format: '[{"product_id": 1, "quantity": 2}, ...]'
--   OUT p_order_id : INT (Created order id)
--   OUT p_total    : DECIMAL(10,2) (Calculated total)
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

    -- Standard error handler for transactional rollback
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    -- Validate user role
    SELECT r.role_name INTO v_user_role
    FROM Users u
    JOIN Roles r ON u.role_id = r.role_id
    WHERE u.user_id = p_user_id;

    IF v_user_role IS NULL THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Order Error: Customer user not found.';
    END IF;

    -- Parse JSON items length
    SET v_item_count = JSON_LENGTH(p_items_json);
    IF v_item_count IS NULL OR v_item_count = 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Order Error: Order item list cannot be empty.';
    END IF;

    -- Start Atomic Transaction
    START TRANSACTION;

    -- 1. Create Order Header initially with 0 total
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

    -- 2. Iterate items with Row-Level Locking (FOR UPDATE)
    WHILE i < v_item_count DO
        SET v_product_id   = JSON_UNQUOTE(JSON_EXTRACT(p_items_json, CONCAT('$[', i, '].product_id')));
        SET v_req_quantity = JSON_UNQUOTE(JSON_EXTRACT(p_items_json, CONCAT('$[', i, '].quantity')));

        IF v_req_quantity <= 0 THEN
            SIGNAL SQLSTATE '45000'
                SET MESSAGE_TEXT = 'Order Error: Quantity must be greater than zero.';
        END IF;

        -- Fetch base price from global master catalog
        SELECT `base_price` INTO v_unit_price
        FROM `Products`
        WHERE `product_id` = v_product_id;

        IF v_unit_price IS NULL THEN
            SIGNAL SQLSTATE '45000'
                SET MESSAGE_TEXT = 'Order Error: Requested product does not exist in master catalog.';
        END IF;

        -- ROW-LEVEL LOCKING ON PHYSICAL BRANCH INVENTORY
        -- Ensures anti-overselling under concurrent transactional load
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

        -- Atomically decrement stock
        UPDATE `Shop_Inventory`
        SET `stock_quantity` = `stock_quantity` - v_req_quantity,
            `updated_by`     = p_user_id,
            `updated_date`   = NOW()
        WHERE `branch_id` = p_branch_id AND `product_id` = v_product_id;

        -- Insert line item capturing historical purchase price
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

        -- Accumulate total
        SET v_order_total = v_order_total + (v_unit_price * v_req_quantity);
        SET i = i + 1;
    END WHILE;

    -- Update order header total
    UPDATE `Orders`
    SET `total_amount` = v_order_total,
        `updated_by`   = p_user_id,
        `updated_date` = NOW()
    WHERE `order_id` = p_order_id;

    SET p_total = v_order_total;

    -- Commit atomic transaction
    COMMIT;
END proc_block$$

-- ============================================================================
-- PROCEDURE: sp_ApproveRestockRequest
-- Purpose: Atomic B2B replenishment fulfillment:
--          Validates 'Pending' restock request, transitions status to 'Approved',
--          locks restock line items, and atomically increments branch stock
--          in Shop_Inventory.
-- Parameters:
--   p_request_id   : INT (ID of the restock request)
--   p_supplier_id  : INT (User ID of the approving supplier)
-- ============================================================================
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

    -- Cursor to iterate all restock items for this request
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

    -- Verify supplier identity and role
    SELECT r.role_name INTO v_supplier_role
    FROM Users u
    JOIN Roles r ON u.role_id = r.role_id
    WHERE u.user_id = p_supplier_id;

    IF v_supplier_role != 'Supplier' THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Restock Error: Approver must possess the Supplier role.';
    END IF;

    -- Start Atomic Transaction
    START TRANSACTION;

    -- Lock request row and verify status
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

    -- Iterate restock line items and increment physical branch inventory
    OPEN cur_items;
    read_loop: LOOP
        FETCH cur_items INTO v_product_id, v_req_quantity;
        IF done = 1 THEN
            LEAVE read_loop;
        END IF;

        -- Upsert stock into Shop_Inventory
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

    -- Update request status
    UPDATE `Restock_Requests`
    SET `request_status` = 'Approved',
        `supplier_id`    = p_supplier_id,
        `updated_by`     = p_supplier_id,
        `updated_date`   = NOW()
    WHERE `request_id` = p_request_id;

    COMMIT;
END proc_block$$

-- ============================================================================
-- PROCEDURE: sp_GetLowStockProducts
-- Purpose: Optimized query for shopkeeper inventory management and low-stock
--          alerting, leveraging secondary index `idx_shop_inventory_branch_stock`.
-- ============================================================================
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
