import fs from 'node:fs';

const bundle = fs.readFileSync('scripts/audio_index-e2mEYwXS.js', 'utf8');
console.log('Bundle length:', bundle.length);

// Extract Korean strings
const koMatches = bundle.match(/[가-힣0-9a-zA-Z\s·,\.!\?~:;\-_"'\(\)\[\]\/]{3,}/g) || [];
const filteredKo = koMatches.filter(s => /[가-힣]/.test(s) && s.length > 3).map(s => s.trim());
const uniqueKo = [...new Set(filteredKo)];
fs.writeFileSync('scripts/audio_korean_strings.json', JSON.stringify(uniqueKo, null, 2), 'utf8');
console.log('Saved', uniqueKo.length, 'Korean strings');

// Search for Gemini prompts
const geminiPrompts = [];
const systemPromptRegex = /(?:systemInstruction|prompt|contents|generateContent)[^;]{10,800}/g;
let pMatch;
while ((pMatch = systemPromptRegex.exec(bundle)) !== null) {
  geminiPrompts.push(pMatch[0]);
}
fs.writeFileSync('scripts/audio_gemini_snippets.json', JSON.stringify(geminiPrompts.slice(0, 50), null, 2), 'utf8');

// Search for tabs or navigation items
console.log('Sample Korean strings:');
console.log(uniqueKo.slice(0, 40));
