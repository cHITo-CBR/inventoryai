-- Create tables for Bookings/Sales Transactions System
-- Run this in phpMyAdmin if these tables don't exist

-- =====================================================
-- Create customers table (if not exists)
-- =====================================================
CREATE TABLE IF NOT EXISTS `customers` (
  `id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `store_name` VARCHAR(255) NOT NULL,
  `contact_person` VARCHAR(255),
  `email` VARCHAR(255),
  `phone` VARCHAR(20),
  `address` TEXT,
  `is_active` TINYINT(1) DEFAULT 1,
  `is_archived` TINYINT(1) DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX `idx_store_name` (`store_name`),
  INDEX `idx_active` (`is_active`, `is_archived`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================
-- Create sales_transactions table (if not exists)  
-- =====================================================
CREATE TABLE IF NOT EXISTS `sales_transactions` (
  `id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `salesman_id` VARCHAR(36) NOT NULL,
  `customer_id` VARCHAR(36),
  `total_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `status` ENUM('pending','approved','completed','cancelled') DEFAULT 'pending',
  `notes` TEXT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (`salesman_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE SET NULL,
  
  INDEX `idx_salesman_date` (`salesman_id`, `created_at`),
  INDEX `idx_status` (`status`),
  INDEX `idx_customer` (`customer_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================
-- Create transaction_items table (for detailed line items)
-- =====================================================
CREATE TABLE IF NOT EXISTS `transaction_items` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `transaction_id` VARCHAR(36) NOT NULL,
  `product_id` VARCHAR(36) NOT NULL,
  `quantity` INT NOT NULL DEFAULT 1,
  `unit_price` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `total_price` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `notes` TEXT,
  
  FOREIGN KEY (`transaction_id`) REFERENCES `sales_transactions`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE CASCADE,
  
  INDEX `idx_transaction` (`transaction_id`),
  INDEX `idx_product` (`product_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================
-- Insert sample customers (optional - for testing)
-- =====================================================
INSERT IGNORE INTO `customers` (`id`, `store_name`, `contact_person`, `email`, `phone`, `address`) VALUES 
(UUID(), 'ABC Grocery Store', 'John Doe', 'john@abcgrocery.com', '09123456789', '123 Main St, City'),
(UUID(), 'XYZ Supermarket', 'Jane Smith', 'jane@xyzsupermarket.com', '09987654321', '456 Oak Ave, Town'),
(UUID(), 'Quick Mart', 'Bob Johnson', 'bob@quickmart.com', '09555123456', '789 Pine Rd, Village');

-- =====================================================
-- Check if tables were created successfully
-- =====================================================
DESCRIBE customers;
DESCRIBE sales_transactions;
DESCRIBE transaction_items;

-- =====================================================
-- Test queries to verify everything works
-- =====================================================
SELECT 'customers' as table_name, COUNT(*) as row_count FROM customers
UNION ALL
SELECT 'sales_transactions' as table_name, COUNT(*) as row_count FROM sales_transactions
UNION ALL  
SELECT 'transaction_items' as table_name, COUNT(*) as row_count FROM transaction_items;