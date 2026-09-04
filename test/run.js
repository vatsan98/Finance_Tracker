/* Runs every suite. Each one gets its own process, so a suite that throws on
   the way up still lets the rest report.

   Usage:  node test/run.js          (from anywhere in the repo) */

const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const dir = __dirname;
const suites = fs.readdirSync(dir).filter(f => f.endsWith('.test.js')).sort();

let failed = 0;
for (const f of suites){
  try {
    process.stdout.write(execFileSync(process.execPath, [path.join(dir, f)], { encoding:'utf8' }));
  } catch (e){
    failed++;
    process.stdout.write((e.stdout || '') + (e.stderr || ''));
    if (!e.stdout) console.log('\n' + f + ' did not run: ' + e.message);
  }
}

console.log('\n' + (failed
  ? failed + ' of ' + suites.length + ' suites failed'
  : 'all ' + suites.length + ' suites passed'));
process.exit(failed ? 1 : 0);
