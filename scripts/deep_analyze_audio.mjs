import fs from 'node:fs';

const bundle = fs.readFileSync('scripts/audio_index-e2mEYwXS.js', 'utf8');

// Find all schema/response_schema objects
const schemaMatches = bundle.match(/responseSchema\s*:\s*\{[\s\S]*?\}\s*\}\s*\}/g) || [];
console.log('Schema matches count:', schemaMatches.length);
if (schemaMatches.length > 0) {
  fs.writeFileSync('scripts/audio_schemas.txt', schemaMatches.join('\n\n---\n\n'), 'utf8');
}

// Find all state definitions and tabs
const tabMatches = bundle.match(/activeTab[^;]{10,200}/g) || [];
console.log('Tab matches:', tabMatches);

// Search for mode selection (Speech vs Music or other modes)
const modeMatches = bundle.match(/mode[^;]{10,200}/g) || [];
console.log('Mode matches sample:', modeMatches.slice(0, 10));

// Find entire prompt strings
const promptBlocks = [];
const pRegex = /(당신은 최고의 음성 분석 전문가입니다[\s\S]*?한국어로 작성하십시오\.)/g;
let m;
while ((m = pRegex.exec(bundle)) !== null) {
  promptBlocks.push({ type: 'speech', prompt: m[1] });
}

const pMusicRegex = /(당신은 음악 분석 마스터[\s\S]*?한국어로 작성하십시오\.)/g;
while ((m = pMusicRegex.exec(bundle)) !== null) {
  promptBlocks.push({ type: 'music', prompt: m[1] });
}

fs.writeFileSync('scripts/audio_prompts_full.json', JSON.stringify(promptBlocks, null, 2), 'utf8');
console.log('Found full prompt blocks:', promptBlocks.length);
