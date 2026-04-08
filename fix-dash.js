const fs = require('fs');
const file = 'app/actions/dashboard.ts';
let content = fs.readFileSync(file, 'utf8');
content = content.replace('queryOne<{ total: number }>(', 'queryOne<{ total: number } & RowDataPacket>(');
fs.writeFileSync(file, content);