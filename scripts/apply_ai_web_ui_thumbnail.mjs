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
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, (env.SUPABASE_SECRET_KEY?.trim() || env.SUPABASE_SERVICE_ROLE_KEY?.trim()));

async function run() {
  console.log('--- AI 웹 UI 제작 자동화 썸네일 업로드 및 DB 등록 시작 ---');

  const imgPath = 'D:/Antigravity/AIMaster/scratch/ai-web-ui-thumbnail.jpg';
  if (!fs.existsSync(imgPath)) {
    console.error('File not found:', imgPath);
    process.exit(1);
  }

  const fileBuffer = fs.readFileSync(imgPath);
  const storagePath = 'catalog/ai-web-ui-thumbnail.jpg';
  console.log('Uploading to bucket "program-images", path:', storagePath);

  const { data: uploadData, error: uploadErr } = await supabase
    .storage
    .from('program-images')
    .upload(storagePath, fileBuffer, {
      contentType: 'image/jpeg',
      upsert: true
    });

  if (uploadErr) {
    console.error('Storage Upload Error:', uploadErr);
    process.exit(1);
  }

  const timestamp = Date.now();
  const publicUrl = `${env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/program-images/${storagePath}?v=${timestamp}`;
  console.log('Thumbnail Public URL:', publicUrl);

  // programs 테이블 갱신: slug = 'ai-web-ui', thumbnail_url, version = 'v1.03'
  // 기존 레코드 ID로 찾거나 이전 slug로 찾기
  const { data: existing } = await supabase
    .from('programs')
    .select('id')
    .or('slug.eq.react-ui-showcase,slug.eq.ai-web-ui')
    .single();

  if (!existing) {
    console.error('Program record not found!');
    process.exit(1);
  }

  const { data: updated, error: updateErr } = await supabase
    .from('programs')
    .update({
      name: 'AI 웹 UI 제작 자동화',
      slug: 'ai-web-ui',
      short_desc: 'React 19 & Tailwind CSS 기반 웹 UI 제작 자동화 · 12대 필수 UI 컴포넌트 갤러리 · 10종 인터랙티브 시뮬레이터 · 클린 TSX 코드 복사 & Gemini AI 자동 생성기',
      thumbnail_url: publicUrl,
      app_url: 'https://ai-web-ui.buylife.xyz',
      version: 'v1.03',
      is_active: true,
      updated_at: new Date().toISOString()
    })
    .eq('id', existing.id)
    .select('id, name, slug, version, app_url, thumbnail_url')
    .single();

  if (updateErr) {
    console.error('Update Error:', updateErr);
    process.exit(1);
  }

  console.log('Successfully updated program:', updated);
  console.log('--- AI 웹 UI 제작 자동화 등록 완료 ---');
}

run();
