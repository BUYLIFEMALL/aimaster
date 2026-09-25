import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { INITIAL_IMAGE_STUDIO_PROMPTS } from "@/lib/constants/defaultPrompts";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "권한 없음" }, { status: 403 });

  const serviceClient = createServiceClient();

  // 160개 이상의 풀 세트 프롬프트를 DB에 upsert (중복 시 업데이트, 없으면 추가)
  const seedItems = INITIAL_IMAGE_STUDIO_PROMPTS.map((p) => ({
    id: p.id,
    program_slug: p.program_slug,
    category: p.category,
    title: p.title,
    prompt_text: p.prompt_text,
    description: p.description || "",
    tags: p.tags || [],
    is_active: p.is_active ?? true,
    sort_order: p.sort_order || 0,
    updated_at: new Date().toISOString(),
  }));

  const { data, error } = await serviceClient
    .from("program_prompts")
    .upsert(seedItems, { onConflict: "id" })
    .select("*");

  if (error) {
    // ID 기반 upsert 충돌 시 id 제거 후 일반 insert
    const insertItems = INITIAL_IMAGE_STUDIO_PROMPTS.map((p) => ({
      program_slug: p.program_slug,
      category: p.category,
      title: p.title,
      prompt_text: p.prompt_text,
      description: p.description || "",
      tags: p.tags || [],
      is_active: p.is_active ?? true,
      sort_order: p.sort_order || 0,
    }));

    const { data: insertData, error: insertError } = await serviceClient
      .from("program_prompts")
      .insert(insertItems)
      .select("*");

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }
    return NextResponse.json({ success: true, count: insertData?.length || 0, seeded: true });
  }

  return NextResponse.json({ success: true, count: data?.length || INITIAL_IMAGE_STUDIO_PROMPTS.length, seeded: true });
}
