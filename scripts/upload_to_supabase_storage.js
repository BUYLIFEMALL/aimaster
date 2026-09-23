const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = match[2] || '';
    if (value.length > 0 && value.startsWith('"') && value.endsWith('"')) {
      value = value.substring(1, value.length - 1);
    }
    env[match[1]] = value.trim();
  }
});

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL || 'https://esgxyikcnnvmlhygjkth.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('SUPABASE_SERVICE_ROLE_KEY is required in .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

async function run() {
  const imgPath = path.join(__dirname, '..', 'public', 'thumbnails', 'ai-image-studio.png');
  console.log('Reading image from:', imgPath);
  const fileBuffer = fs.readFileSync(imgPath);

  const storagePath = 'catalog/ai-image-studio-thumbnail.jpg';
  console.log('Uploading to Supabase Storage bucket "program-images", path:', storagePath);

  const { data: uploadData, error: uploadErr } = await supabase
    .storage
    .from('program-images')
    .upload(storagePath, fileBuffer, {
      contentType: 'image/jpeg',
      upsert: true
    });

  if (uploadErr) {
    console.error('Upload error:', uploadErr);
    process.exit(1);
  }

  console.log('Upload success:', uploadData);

  const timestamp = Date.now();
  const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/program-images/${storagePath}?v=${timestamp}`;
  console.log('Public Supabase Storage URL:', publicUrl);

  const { data: progData, error: progErr } = await supabase
    .from('programs')
    .update({
      thumbnail_url: publicUrl,
      sort_order: 1 // 상단 또는 멀티미디어 카테고리 내 첫 번째로 노출되도록 
    })
    .eq('slug', 'ai-image-studio')
    .select();

  if (progErr) {
    console.error('Program update error:', progErr);
  } else {
    console.log('Program thumbnail_url successfully updated to Supabase Storage CDN URL!');
  }
}

run().catch(console.error);
