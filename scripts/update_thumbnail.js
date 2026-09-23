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
  const timestamp = Date.now();
  const thumbnailUrl = `https://www.buylife.xyz/thumbnails/ai-image-studio.png?v=${timestamp}`;

  console.log('Updating thumbnail_url for ai-image-studio to:', thumbnailUrl);

  const { data, error } = await supabase
    .from('programs')
    .update({
      thumbnail_url: thumbnailUrl,
      short_desc: 'OpenAI GPT Image(2.5/2), Gemini, FLUX.1 및 Stability AI 지원 고품질 이미지 스튜디오',
      description: 'OpenAI GPT Image(2.5 Sunburst, 2.5 Flare, 2, 1.5), Google Gemini (Nanobanana), FLUX.1 및 Stability AI 등 다양한 AI 엔진으로 1장~10장 연속 생성 및 세부 옵션 맞춤 설정이 가능한 프리미엄 이미지 스튜디오입니다.'
    })
    .eq('slug', 'ai-image-studio')
    .select();

  if (error) {
    console.error('Error updating program thumbnail:', error);
  } else {
    console.log('Successfully updated program:', data);
  }
}

run().catch(console.error);
