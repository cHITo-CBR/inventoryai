import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '.env.local') });

async function fixDB() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'navicat',
  });

  console.log("Fixing database structure...");

  try {
    await connection.query('ALTER TABLE packaging_types DROP COLUMN items_per_case;');
    console.log("Dropped items_per_case from packaging_types");
  } catch (e) {
    console.log("items_per_case in packaging_types might already be dropped:", e.message);
  }

  try {
    await connection.query('ALTER TABLE products ADD COLUMN items_per_case INT DEFAULT 1;');
    console.log("Added items_per_case to products");
  } catch (e) {
    console.log("items_per_case might already exist in products:", e.message);
  }

  try {
    await connection.query('UPDATE products SET items_per_case = total_cases WHERE items_per_case = 1 AND total_cases > 0;');
    await connection.query('UPDATE products SET total_cases = 0;');
    console.log("Transferred packing sizes and reset total inventory cases to 0");
  } catch (e) {
    console.log("Error updating data:", e.message);
  }

  console.log('Database fixes applied successfully!');
  await connection.end();
}

fixDB();
