import fs from 'node:fs';

const bundle = fs.readFileSync('scripts/audio_index-e2mEYwXS.js', 'utf8');

const target1 = '당신은 최고의 음성 분석 전문가입니다';
const idx1 = bundle.indexOf(target1);
if (idx1 !== -1) {
  console.log('--- SPEECH ANALYSIS CONTEXT ---');
  console.log(bundle.slice(Math.max(0, idx1 - 500), idx1 + 2500));
}

const target2 = '당신은 음악 분석 마스터';
const idx2 = bundle.indexOf(target2);
if (idx2 !== -1) {
  console.log('--- MUSIC ANALYSIS CONTEXT ---');
  console.log(bundle.slice(Math.max(0, idx2 - 500), idx2 + 3000));
}
