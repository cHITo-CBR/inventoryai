-- Test to check if packaging_price column exists in products table
-- Run this in phpMyAdmin to verify the column exists

DESCRIBE products;

-- Also test if we can see any existing packaging_price data
SELECT id, name, packaging_price FROM products LIMIT 5;

-- Check if the column was created
SHOW COLUMNS FROM products LIKE 'packaging_price';