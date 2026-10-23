const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

function readEnv(file) {
  const env = {};
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Z_]+)=(.*)$/); if (!m) continue;
    const raw = m[2].trim();
    env[m[1]] = raw.startsWith('"') ? JSON.parse(raw) : raw.replace(/^'|'$/g, '');
  }
  return env;
}

const env = readEnv(path.join(__dirname, '..', '.env.local'));
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data, error } = await supabase.from('platform_guides').select('id, title, category, content').order('category');
  if (error) { console.error(error); return; }
  console.log('총 가이드 개수:', data.length);
  const completed = [];
  const remaining = [];
  for (const g of data) {
    const isModern = g.content && (
      g.content.includes('border-radius: 16px') || 
      g.content.includes('border-radius: 14px') || 
      g.content.includes('border-radius: 12px') ||
      g.content.includes('rounded-2xl') ||
      g.content.includes('rounded-xl') ||
      g.content.includes('스텝') ||
      g.content.includes('Step 1') ||
      g.content.includes('API 발급 개요')
    );
    if (isModern) {
      completed.push(g);
    } else {
      remaining.push(g);
    }
  }
  console.log('완료된 가이드 수:', completed.length);
  console.log('남은 가이드 수:', remaining.length);
  console.log('\n=== 남은 가이드 목록 ===');
  remaining.forEach((g, idx) => {
    console.log(`${idx + 1}. [${g.category}] ${g.title} (${g.id})`);
  });
  console.log('\n=== 첫번째 가이드 샘플 (Gemini) ===');
  console.log(data[0].title, '길이:', data[0].content?.length);
  console.log(data[0].content?.substring(0, 150));
}
run();
