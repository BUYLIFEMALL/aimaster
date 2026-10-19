const fs = require('fs');

const designMd = fs.readFileSync('DESIGN.md', 'utf8');
const capMd = fs.readFileSync('docs/PROGRAM_CAPABILITY_MAP.md', 'utf8');

// Parse DESIGN.md table (lines starting with | number |)
const designLines = designMd.split('\n').filter(l => /^\s*\|\s*\d+\s*\|/.test(l));
const designMap = {};
designLines.forEach(l => {
  const parts = l.split('|').map(s => s.trim());
  if (parts.length >= 8) {
    const no = parseInt(parts[1], 10);
    const name = parts[2];
    const rawSlug = parts[3].replace(/`/g, '');
    const slugMatch = rawSlug.match(/^[a-z0-9_-]+/i);
    const slug = slugMatch ? slugMatch[0] : rawSlug;
    const template = parts[4].replace(/\*\*/g, '');
    const theme = parts[5];
    const status = parts[6];
    const handoff = parts[7];
    designMap[slug] = { no, name, rawSlug, slug, template, theme, status, handoff };
  }
});

// Parse PROGRAM_CAPABILITY_MAP table
// Note: In markdown, `| 데이터수집|기획 |` creates extra column when splitting on '|'.
// We handle this carefully.
const capLines = capMd.split('\n').filter(l => /^\s*\|\s*\d+\s*\|/.test(l));
const capMap = {};
capLines.forEach(l => {
  // Replace escaped pipe or known pipe in category
  const sanitized = l.replace(/데이터수집\|기획/g, '데이터수집·기획');
  const parts = sanitized.split('|').map(s => s.trim());
  if (parts.length >= 8) {
    const capNo = parseInt(parts[1], 10);
    const capName = parts[2];
    const rawSlug = parts[3].replace(/`/g, '');
    const slugMatch = rawSlug.match(/^[a-z0-9_-]+/i);
    const slug = slugMatch ? slugMatch[0] : rawSlug;
    let category = parts[4];
    if (category === '데이터수집' || category === '기획' || category.includes('데이터수집')) {
      category = '데이터수집·기획';
    }
    const version = parts[5];
    const purpose = parts[7];
    capMap[slug] = { capNo, capName, category, version, purpose };
  }
});

const allSlugs = Array.from(new Set([...Object.keys(designMap), ...Object.keys(capMap)]));

const combined = [];
allSlugs.forEach(slug => {
  const d = designMap[slug] || {};
  const c = capMap[slug] || {};
  combined.push({
    slug,
    no: d.no,
    name: d.name || c.capName,
    category: c.category || '미분류',
    template: d.template || '미정',
    theme: d.theme || '',
    version: c.version || '',
    status: d.status || '',
    purpose: c.purpose || '',
    handoff: d.handoff || ''
  });
});

combined.sort((a, b) => (a.no || 999) - (b.no || 999));

fs.writeFileSync('scratch_combined_programs.json', JSON.stringify(combined, null, 2));

console.log('총 고유 프로그램 수:', combined.length);
const catSummary = {};
combined.forEach(p => {
  catSummary[p.category] = (catSummary[p.category] || 0) + 1;
});
console.log('카테고리별 분포:', catSummary);
