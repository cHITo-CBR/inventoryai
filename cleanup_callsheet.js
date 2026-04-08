const fs = require('fs');
const glob = require('glob');

// remove files with callsheet in the name
const filesToRemove = [
    'app/actions/callsheets.ts',
    'app/salesman/callsheets'
];

filesToRemove.forEach(f => {
    try {
        fs.rmSync(f, { recursive: true, force: true });
        console.log('Deleted ' + f);
    } catch (e) {
        console.error(e.message);
    }
});
