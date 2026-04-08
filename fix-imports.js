const fs = require("fs");
const path = require("path");

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      results = results.concat(walk(file));
    } else { 
      if (file.endsWith(".ts") || file.endsWith(".tsx")) {
        results.push(file);
      }
    }
  });
  return results;
}

const files = walk(path.join(__dirname, "app"));
files.push(...walk(path.join(__dirname, "components")));

for (const file of files) {
  let content = fs.readFileSync(file, "utf8");
  let original = content;
  
  content = content.replace(/import\s+{\s*RowDataPacket\s*}\s+from\s+["']mysql2["']/g, 'import { RowDataPacket } from "@/lib/db-helpers"');
  content = content.replace(/import\s+{\s*RowDataPacket\s*}\s+from\s+["']mysql2\/promise["']/g, 'import { RowDataPacket } from "@/lib/db-helpers"');
  content = content.replace(/import\s+{\s*RowDataPacket\s*,\s*ResultSetHeader\s*}\s+from\s+["']mysql2\/promise["']/g, 'import { RowDataPacket, ResultSetHeader } from "@/lib/db-helpers"');
  content = content.replace(/import\s+{\s*ResultSetHeader\s*}\s+from\s+["']mysql2\/promise["']/g, 'import { ResultSetHeader } from "@/lib/db-helpers"');
  
  // Fix specific file issue
  if (file.includes("bookings.ts")) {
    content = content.replace(/import\s+{\s*[^}]*\s*}\s+from\s+["']@\/lib\/db\/mysql["'];?/g, "");
  }

  if (content !== original) {
    fs.writeFileSync(file, content, "utf8");
    console.log("Updated", file);
  }
}
