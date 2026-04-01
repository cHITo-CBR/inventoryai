-- Quick test queries to verify packaging_price functionality
-- Run these in phpMyAdmin after testing the frontend

-- 1. Check if packaging_price column exists and its structure
DESCRIBE products;

-- 2. See current packaging_price values (should show actual values, not NULL)
SELECT id, name, packaging_price, created_at 
FROM products 
ORDER BY created_at DESC 
LIMIT 10;

-- 3. Test inserting a product with packaging_price directly
INSERT INTO products (id, name, packaging_price, is_active, is_archived) 
VALUES (UUID(), 'Test Product Price', 99.99, 1, 0);

-- 4. Verify the insert worked
SELECT id, name, packaging_price 
FROM products 
WHERE name = 'Test Product Price';

-- 5. If packaging_price shows as NULL, check column definition
SHOW CREATE TABLE products;

-- 6. Update an existing product with packaging_price (replace 'PRODUCT_ID' with real ID)
-- UPDATE products SET packaging_price = 150.75 WHERE id = 'PRODUCT_ID';