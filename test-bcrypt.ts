import bcrypt from "bcryptjs";

async function testPassword() {
  const hash = "$2b$10$wSebDdUsNzgzuwyqMBIbz.pPwRgeq.DyO.EA08YpJAcpZY7Shnnei";
  const match = await bcrypt.compare("admin123", hash);
  console.log("admin123 match:", match);
}

testPassword();
