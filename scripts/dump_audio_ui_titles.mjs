import fs from 'node:fs';

const bundle = fs.readFileSync('scripts/audio_index-e2mEYwXS.js', 'utf8');

// Find UI tabs or section titles
const titleRegex = /["']([가-힣\s\(\)&]{2,30})["']/g;
const titles = [];
let tMatch;
while ((tMatch = titleRegex.exec(bundle)) !== null) {
  if (tMatch[1].length > 3 && tMatch[1].trim() !== '') {
    titles.push(tMatch[1].trim());
  }
}

const uniqueTitles = [...new Set(titles)];
console.log('Sample Korean UI titles:');
console.log(uniqueTitles.slice(0, 80));
