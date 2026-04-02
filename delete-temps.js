const fs = require('fs');

const files = [
  'quotas-page-temp.tsx',
  'quota-table-temp.tsx',
  'quota-form-dialog-temp.tsx',
  'app/admin/quotas.placeholder'
];

files.forEach(f => {
  try {
    if (fs.existsSync(f)) {
      fs.unlinkSync(f);
      console.log('✓ Deleted: ' + f);
    } else {
      console.log('✗ Not found: ' + f);
    }
  } catch (e) {
    console.error('✗ Error deleting ' + f + ': ' + e.message);
  }
});
