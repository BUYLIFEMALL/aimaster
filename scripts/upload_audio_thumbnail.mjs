import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';

function loadEnv(path) {
  const text = fs.readFileSync(path, 'utf8');
  const env = {};
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx !== -1) env[trimmed.slice(0, idx)] = trimmed.slice(idx + 1).replace(/^["']|["']$/g, '');
  }
  return env;
}

const env = loadEnv('D:/Antigravity/AIMaster/.env.local');
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const src = 'C:/Users/Administrator/.gemini/antigravity-cli/brain/4f5c1467-5b51-43c6-9a0c-101992cfa96d/audio_analyzer_thumbnail_1791833273933.jpg';
  const destScratch = 'D:/Antigravity/AIMaster/scratch/audio-analyzer-thumbnail.jpg';
  const destPublicDir = 'D:/Antigravity/AIMaster/ai-audio-analyzer/public';
  const destPublic = `${destPublicDir}/audio-analyzer-thumbnail.jpg`;

  if (!fs.existsSync(destPublicDir)) {
    fs.mkdirSync(destPublicDir, { recursive: true });
  }

  // Copy files
  fs.copyFileSync(src, destScratch);
  fs.copyFileSync(src, destPublic);
  console.log('Copied to scratch and public/audio-analyzer-thumbnail.jpg');

  // Upload to Supabase Storage: catalog/audio-analyzer-thumbnail.jpg
  const fileBuffer = fs.readFileSync(src);
  const storagePath = 'catalog/audio-analyzer-thumbnail.jpg';

  console.log('Uploading to Supabase Storage: program-images /', storagePath);
  const { data, error } = await supabase.storage
    .from('program-images')
    .upload(storagePath, fileBuffer, {
      contentType: 'image/jpeg',
      upsert: true,
    });

  if (error) {
    console.error('Storage upload failed:', error);
    process.exit(1);
  }

  const { data: urlData } = supabase.storage
    .from('program-images')
    .getPublicUrl(storagePath);

  console.log('Upload successful! Public URL:', urlData.publicUrl);
}

run();
