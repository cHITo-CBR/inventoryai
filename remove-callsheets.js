const fs = require('fs');
const glob = require('fs').promises.readdir;
const path = require('path');

async function processFile(file) {
    let content = fs.readFileSync(file, 'utf8');
    
    // Custom logic to handle specific files
    if (file.includes('post-receive') || file.includes('.git') || file.includes('node_modules')) return;

    if (file.endsWith('.sql')) {
        // Remove table definitions
        let newContent = content.replace(/CREATE TABLE.*?callsheet_items.*?\;/gis, '');
        newContent = newContent.replace(/CREATE TABLE.*?callsheets.*?\;/gis, '');
        newContent = newContent.replace(/CREATE TABLE IF NOT EXISTS.*?callsheet_items.*?\;/gis, '');
        newContent = newContent.replace(/CREATE TABLE IF NOT EXISTS.*?callsheets.*?\;/gis, '');
        newContent = newContent.replace(/^.*callsheet.*$/gim, ''); // any line remaining
        if (content !== newContent) {
           fs.writeFileSync(file, newContent);
           console.log('Processed', file);
        }
    }
}
