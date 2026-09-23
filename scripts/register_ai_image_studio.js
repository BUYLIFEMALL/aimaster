require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://esgxyikcnnvmlhygjkth.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('SUPABASE_SERVICE_ROLE_KEY is required in .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

async function run() {
  console.log('1. Checking / Creating "멀티미디어" category...');
  let { data: catData, error: catErr } = await supabase
    .from('categories')
    .select('*')
    .eq('name', '멀티미디어')
    .maybeSingle();

  if (catErr) {
    console.error('Error fetching categories:', catErr);
  }

  if (!catData) {
    const { data: maxOrderData } = await supabase
      .from('categories')
      .select('sort_order')
      .order('sort_order', { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextOrder = (maxOrderData?.sort_order || 0) + 1;

    const { data: newCat, error: insertCatErr } = await supabase
      .from('categories')
      .insert({
        name: '멀티미디어',
        slug: 'multimedia',
        sort_order: nextOrder
      })
      .select()
      .single();

    if (insertCatErr) {
      console.error('Error inserting multimedia category:', insertCatErr);
      process.exit(1);
    }
    catData = newCat;
    console.log('Created new category "멀티미디어":', catData.id);
  } else {
    console.log('Category "멀티미디어" already exists:', catData.id);
  }

  console.log('2. Fetching basic grade id...');
  const { data: gradeData } = await supabase
    .from('member_grades')
    .select('id')
    .eq('name', 'basic')
    .maybeSingle();

  const requiredGradeId = gradeData?.id || null;

  console.log('3. Upserting "AI 이미지 스튜디오" program...');
  const { data: maxProgOrder } = await supabase
    .from('programs')
    .select('sort_order')
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle();

  const programPayload = {
    category_id: catData.id,
    required_grade_id: requiredGradeId,
    name: 'AI 이미지 스튜디오',
    slug: 'ai-image-studio',
    short_desc: 'OpenAI GPT Image, Google Gemini, FLUX.1 및 Stability AI 다중 엔진 지원 고품질 AI 이미지 스튜디오',
    description: 'OpenAI GPT Image(2.5 Sunburst, 2.5 Flare, 2, 1.5), Google Gemini (Nanobanana), FLUX.1 및 Stability AI 등 최신 다중 AI 이미지 생성 플랫폼을 지원하며, 1장~10장 연속 생성 및 세부 비율·화질 맞춤 설정이 가능한 고품질 이미지 스튜디오입니다.',
    is_active: true,
    badges: ['new'],
    sort_order: (maxProgOrder?.sort_order || 0) + 1,
    app_url: 'https://ai-image-studio.vercel.app',
    thumbnail_url: 'https://www.buylife.xyz/thumbnails/ai-image-studio.png'
  };

  const { data: existingProg } = await supabase
    .from('programs')
    .select('id')
    .eq('slug', 'ai-image-studio')
    .maybeSingle();

  let programId;
  if (existingProg) {
    const { data: updatedProg, error: updateErr } = await supabase
      .from('programs')
      .update(programPayload)
      .eq('id', existingProg.id)
      .select()
      .single();
    if (updateErr) {
      console.error('Error updating program:', updateErr);
      process.exit(1);
    }
    programId = updatedProg.id;
    console.log('Updated program "AI 이미지 스튜디오":', programId);
  } else {
    const { data: newProg, error: insertProgErr } = await supabase
      .from('programs')
      .insert(programPayload)
      .select()
      .single();
    if (insertProgErr) {
      console.error('Error inserting program:', insertProgErr);
      process.exit(1);
    }
    programId = newProg.id;
    console.log('Inserted program "AI 이미지 스튜디오":', programId);
  }

  console.log('SUCCESS! Registration completed perfectly.');
}

run().catch(console.error);
