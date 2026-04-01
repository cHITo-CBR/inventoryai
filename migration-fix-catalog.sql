-- Migration: Fix Product Catalog Tables
-- Run this in phpMyAdmin or MySQL to fix the missing tables/columns
-- Date: 2026-04-01

-- =====================================================
-- 1. Fix product_categories table (add missing columns)
-- =====================================================
ALTER TABLE `product_categories` 
ADD COLUMN IF NOT EXISTS `is_archived` TINYINT(1) DEFAULT 0,
ADD COLUMN IF NOT EXISTS `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- =====================================================
-- 2. Fix brands table (add description and other columns)
-- =====================================================
ALTER TABLE `brands` 
ADD COLUMN IF NOT EXISTS `description` TEXT,
ADD COLUMN IF NOT EXISTS `is_archived` TINYINT(1) DEFAULT 0,
ADD COLUMN IF NOT EXISTS `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- =====================================================
-- 3. Create units table
-- =====================================================
CREATE TABLE IF NOT EXISTS `units` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(255) NOT NULL,
  `abbreviation` VARCHAR(50),
  `is_active` TINYINT(1) DEFAULT 1,
  `is_archived` TINYINT(1) DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================
-- 4. Create packaging_types table
-- =====================================================
CREATE TABLE IF NOT EXISTS `packaging_types` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(255) NOT NULL,
  `description` TEXT,
  `is_active` TINYINT(1) DEFAULT 1,
  `is_archived` TINYINT(1) DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================
-- 4a. Add items_per_case column to packaging_types (if missing)
-- =====================================================
ALTER TABLE `packaging_types` 
ADD COLUMN IF NOT EXISTS `items_per_case` INT DEFAULT 1;

-- =====================================================
-- 5. Add columns to products table
-- =====================================================
ALTER TABLE `products` 
ADD COLUMN IF NOT EXISTS `packaging_id` INT,
ADD COLUMN IF NOT EXISTS `image_url` VARCHAR(500),
ADD COLUMN IF NOT EXISTS `total_cases` INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS `packaging_price` DECIMAL(10,2) DEFAULT 0.00;

-- =====================================================
-- 6. Add foreign key constraint (separate from column addition)
-- =====================================================
SET @constraint_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS 
  WHERE CONSTRAINT_NAME = 'fk_products_packaging' 
  AND TABLE_NAME = 'products'
);

SET @sql = IF(@constraint_exists = 0, 
  'ALTER TABLE products ADD CONSTRAINT fk_products_packaging FOREIGN KEY (packaging_id) REFERENCES packaging_types (id)',
  'SELECT "Constraint already exists" as message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- =====================================================
-- 7. Insert sample packaging types
-- =====================================================
INSERT IGNORE INTO `packaging_types` (`name`, `description`, `items_per_case`) VALUES 
('Box of 48', '155g', 48),
('Case of 24', '300g', 24),
('Pack of 12', '500g', 12),
('Carton of 36', '200g', 36);

-- =====================================================
-- 8. Create inventory_movement_types table
-- =====================================================
CREATE TABLE IF NOT EXISTS `inventory_movement_types` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(255) NOT NULL,
  `direction` ENUM('in', 'out') NOT NULL,
  `description` TEXT,
  `is_active` TINYINT(1) DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================
-- 9. Create inventory_ledger table  
-- =====================================================
CREATE TABLE IF NOT EXISTS `inventory_ledger` (
  `id` VARCHAR(36) NOT NULL,
  `product_id` VARCHAR(36),
  `movement_type_id` INT,
  `quantity` INT NOT NULL,
  `balance` INT NOT NULL DEFAULT 0,
  `notes` TEXT,
  `recorded_by` VARCHAR(36),
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_product_created` (`product_id`, `created_at`),
  INDEX `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================
-- 10. Create product_variants table
-- =====================================================
CREATE TABLE IF NOT EXISTS `product_variants` (
  `id` VARCHAR(36) NOT NULL,
  `product_id` VARCHAR(36),
  `name` VARCHAR(255) NOT NULL,
  `sku` VARCHAR(100),
  `unit_price` DECIMAL(10,2) DEFAULT 0.00,
  `packaging_id` INT,
  `unit_id` INT,
  `is_active` TINYINT(1) DEFAULT 1,
  `is_archived` TINYINT(1) DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_sku` (`sku`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================
-- 11. Insert sample movement types
-- =====================================================
INSERT IGNORE INTO `inventory_movement_types` (`name`, `direction`, `description`) VALUES 
('Stock In', 'in', 'Inventory received/added'),
('Stock Out', 'out', 'Inventory sold/removed'),
('Adjustment In', 'in', 'Positive stock adjustment'),
('Adjustment Out', 'out', 'Negative stock adjustment'),
('Return', 'in', 'Returned inventory'),
('Damage', 'out', 'Damaged inventory removal');

-- =====================================================
-- Done! All catalog tables should now work properly.
-- =====================================================
