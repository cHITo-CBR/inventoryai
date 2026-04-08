import pg from "pg";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/postgres",
});

async function seedAdmin() {
  const hash = await bcrypt.hash("password123", 10);
  const uuid = crypto.randomUUID();
  
  try {
    const res = await pool.query(`
      INSERT INTO users (id, full_name, email, password_hash, role_id, status, is_active) 
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (email) DO UPDATE SET password_hash = $4, role_id = $5, status = $6, is_active = $7
    `, [uuid, 'Super Admin', 'admin@flowstock.com', hash, 1, 'approved', true]);
    
    console.log("Admin seeded successfully! Email: admin@flowstock.com, Password: password123");
  } catch(e) {
    console.error("Error seeding admin:", e.message);
  } finally {
    pool.end();
  }
}

seedAdmin();
