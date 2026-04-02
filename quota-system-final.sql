-- Salesman Quota System - Error-Free Implementation
-- Execute each section separately in phpMyAdmin for best results

-- =====================================================
-- 1. Create salesman_quotas table
-- =====================================================
CREATE TABLE IF NOT EXISTS `salesman_quotas` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `salesman_id` VARCHAR(36) NOT NULL,
  `month` TINYINT NOT NULL,
  `year` YEAR NOT NULL,
  `target_amount` DECIMAL(12,2),
  `target_units` INT,
  `target_orders` INT,
  `achieved_amount` DECIMAL(12,2) DEFAULT 0,
  `achieved_units` INT DEFAULT 0,
  `achieved_orders` INT DEFAULT 0,
  `status` ENUM('pending','ongoing','completed') DEFAULT 'pending',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `unique_quota` (`salesman_id`, `month`, `year`),
  INDEX `idx_salesman_date` (`salesman_id`, `year`, `month`),
  INDEX `idx_year_month` (`year`, `month`),
  INDEX `idx_status` (`status`),
  CONSTRAINT `fk_salesman_quota_user` FOREIGN KEY (`salesman_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================
-- 2. Create quota_achievements table
-- =====================================================
CREATE TABLE IF NOT EXISTS `quota_achievements` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `quota_id` INT NOT NULL,
  `achievement_date` DATE NOT NULL,
  `amount` DECIMAL(12,2) DEFAULT 0,
  `units` INT DEFAULT 0,
  `orders` INT DEFAULT 0,
  `notes` TEXT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_quota_date` (`quota_id`, `achievement_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================
-- 3. Create quota_audit_logs table (NEW - for tracking changes)
-- =====================================================
CREATE TABLE IF NOT EXISTS `quota_audit_logs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `quota_id` INT NOT NULL,
  `action` ENUM('created','updated','deleted','achieved','status_changed') NOT NULL,
  `old_values` JSON,
  `new_values` JSON,
  `changed_by` VARCHAR(36) NOT NULL,
  `change_reason` TEXT,
  `ip_address` VARCHAR(45),
  `user_agent` TEXT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX `idx_quota_action` (`quota_id`, `action`),
  INDEX `idx_changed_by` (`changed_by`),
  INDEX `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================
-- 4. Create reporting view (simplified and error-free)
-- =====================================================
DROP VIEW IF EXISTS `quota_report_view`;
CREATE VIEW `quota_report_view` AS
SELECT 
  sq.id,
  sq.salesman_id,
  sq.month,
  sq.year,
  sq.target_amount,
  sq.target_units,
  sq.target_orders,
  sq.achieved_amount,
  sq.achieved_units,
  sq.achieved_orders,
  sq.status,
  sq.created_at,
  sq.updated_at,
  COALESCE(u.full_name, 'Unknown') as salesman_name,
  COALESCE(u.email, '') as salesman_email,
  CASE 
    WHEN sq.target_amount > 0 THEN ROUND((sq.achieved_amount / sq.target_amount) * 100, 2)
    ELSE 0
  END as amount_percentage,
  CASE 
    WHEN sq.target_units > 0 THEN ROUND((sq.achieved_units / sq.target_units) * 100, 2)
    ELSE 0
  END as units_percentage,
  CASE 
    WHEN sq.target_orders > 0 THEN ROUND((sq.achieved_orders / sq.target_orders) * 100, 2)
    ELSE 0
  END as orders_percentage,
  CASE sq.month
    WHEN 1 THEN 'January'
    WHEN 2 THEN 'February'
    WHEN 3 THEN 'March'
    WHEN 4 THEN 'April'
    WHEN 5 THEN 'May'
    WHEN 6 THEN 'June'
    WHEN 7 THEN 'July'
    WHEN 8 THEN 'August'
    WHEN 9 THEN 'September'
    WHEN 10 THEN 'October'
    WHEN 11 THEN 'November'
    WHEN 12 THEN 'December'
    ELSE 'Unknown'
  END as month_name
FROM salesman_quotas sq
LEFT JOIN users u ON sq.salesman_id = u.id;

-- =====================================================
-- 5. Add foreign key constraints (optional - run if no errors)
-- =====================================================
-- ALTER TABLE quota_achievements 
-- ADD CONSTRAINT fk_quota_achievements_quota 
-- FOREIGN KEY (quota_id) REFERENCES salesman_quotas(id) ON DELETE CASCADE;

-- ALTER TABLE quota_audit_logs 
-- ADD CONSTRAINT fk_quota_audit_logs_quota 
-- FOREIGN KEY (quota_id) REFERENCES salesman_quotas(id) ON DELETE CASCADE;

-- =====================================================
-- 6. Test the implementation
-- =====================================================
SELECT 'Tables created successfully' as result;
SELECT COUNT(*) as quota_count FROM salesman_quotas;
SELECT COUNT(*) as achievements_count FROM quota_achievements;
SELECT COUNT(*) as audit_logs_count FROM quota_audit_logs;
SELECT COUNT(*) as view_count FROM quota_report_view;