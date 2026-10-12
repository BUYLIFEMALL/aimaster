import fs from 'node:fs';

const bundle = fs.readFileSync('scripts/audio_index-e2mEYwXS.js', 'utf8');

const idxAG = bundle.indexOf('AG={');
if (idxAG !== -1) {
  console.log('--- SPEECH SCHEMA (AG) ---');
  console.log(bundle.slice(idxAG, idxAG + 3000));
} else {
  // Try finding var AG= or const AG=
  const matchAG = bundle.match(/[a-zA-Z0-9_$]+AG\s*=\s*\{/);
  console.log('Match AG:', matchAG);
}

const idxTG = bundle.indexOf('TG={');
if (idxTG !== -1) {
  console.log('--- MUSIC SCHEMA (TG) ---');
  console.log(bundle.slice(idxTG, idxTG + 3500));
}

// Find model name (Ff)
const idxFf = bundle.indexOf('Ff="');
if (idxFf !== -1) {
  console.log('Ff:', bundle.slice(idxFf, idxFf + 50));
} else {
  const matchFf = bundle.match(/Ff\s*=\s*["'][^"']+["']/);
  console.log('Match Ff:', matchFf);
}
