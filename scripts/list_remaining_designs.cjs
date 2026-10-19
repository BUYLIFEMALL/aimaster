const fs = require('fs');
const content = fs.readFileSync('DESIGN.md', 'utf8');
const lines = content.split(/\r?\n/);
const tableLines = lines.filter(l => l.startsWith('|') && /\|\s*\d+\s*\|/.test(l));

const notDone = [];
const completed = [];
const paused = [];

tableLines.forEach(l => {
  const parts = l.split('|').map(p => p.trim());
  const no = parts[1];
  const name = parts[2];
  const slug = parts[3];
  const style = parts[4];
  const theme = parts[5];
  const status = parts[6];
  if (status.includes('보류')) {
    paused.push({ no, name, slug, style, theme, status });
  } else if (status.includes('완료')) {
    completed.push({ no, name, slug, style, theme, status });
  } else {
    notDone.push({ no, name, slug, style, theme, status });
  }
});

console.log('총 프로그램:', tableLines.length);
console.log('완료(✅):', completed.length);
console.log('남은 대상(미완료/작업예정/작업중):', notDone.length);
console.log('보류(⏸):', paused.length);
console.log('\n--- 남은 대상 상세 목록 ---');
notDone.forEach(p => {
  console.log(`${p.no}|${p.name}|${p.slug}|${p.style}|${p.theme}|${p.status}`);
});
