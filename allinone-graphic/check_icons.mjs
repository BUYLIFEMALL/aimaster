import * as Lucide from 'lucide-react';
import fs from 'node:fs';

const appCode = fs.readFileSync('src/components/studio/AllInOneGraphicApp.tsx', 'utf8');
const match = appCode.match(/from "lucide-react"/);
const lines = appCode.split('\n');
const importNames = [];
let inImport = false;
for (const line of lines) {
  if (line.includes('from "lucide-react"')) {
    inImport = false;
    break;
  }
  if (inImport) {
    const raw = line.split('//')[0].trim();
    if (raw) {
      const parts = raw.split(',').map(p => p.trim()).filter(Boolean);
      parts.forEach(p => {
        const name = p.split(' as ')[0].trim();
        if (name && !name.startsWith('{') && !name.startsWith('}')) {
          importNames.push(name);
        }
      });
    }
  }
  if (line.includes('import {') && !line.includes('from')) {
    inImport = true;
  }
}

const missing = importNames.filter(n => !(n in Lucide));
console.log('Total checked:', importNames.length);
console.log('Missing icons in Lucide:', missing);
