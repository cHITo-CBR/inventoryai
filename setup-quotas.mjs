import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 1. Create directory
const quotasDir = path.join(__dirname, 'app', 'admin', 'quotas');
fs.mkdirSync(quotasDir, { recursive: true });
console.log('✓ Created directory:', quotasDir);

// 2. Copy quotas-page-temp.tsx to page.tsx
const pageContent = fs.readFileSync(path.join(__dirname, 'quotas-page-temp.tsx'), 'utf8');
fs.writeFileSync(path.join(quotasDir, 'page.tsx'), pageContent);
console.log('✓ Created app/admin/quotas/page.tsx');

// 3. Copy quota-table-temp.tsx to quota-table.tsx
const tableContent = fs.readFileSync(path.join(__dirname, 'quota-table-temp.tsx'), 'utf8');
fs.writeFileSync(path.join(quotasDir, 'quota-table.tsx'), tableContent);
console.log('✓ Created app/admin/quotas/quota-table.tsx');

// 4. Copy quota-form-dialog-temp.tsx to quota-form-dialog.tsx
const formContent = fs.readFileSync(path.join(__dirname, 'quota-form-dialog-temp.tsx'), 'utf8');
fs.writeFileSync(path.join(quotasDir, 'quota-form-dialog.tsx'), formContent);
console.log('✓ Created app/admin/quotas/quota-form-dialog.tsx');

console.log('\n✓ All quota admin files setup complete!');
