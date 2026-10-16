import fs from "fs";
import { createClient } from "@supabase/supabase-js";

const envContent = fs.readFileSync(".env.local", "utf8");
const env = {};
for (const line of envContent.split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const idx = trimmed.indexOf("=");
  if (idx !== -1) {
    env[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, "");
  }
}

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, (env.SUPABASE_SECRET_KEY?.trim() || env.SUPABASE_SERVICE_ROLE_KEY?.trim()), {
  auth: { persistSession: false },
});

async function main() {
  console.log("1. Finding category and grade...");
  const { data: categories } = await supabase.from("categories").select("id, name, slug");
  const { data: grades } = await supabase.from("member_grades").select("id, name, slug");

  const toolsCat = categories?.find((c) => c.slug === "tools") || categories?.[0];
  const basicGrade = grades?.find((g) => g.slug === "basic") || grades?.[0];

  console.log("Selected category ID:", toolsCat?.id, toolsCat?.name);
  console.log("Selected grade ID:", basicGrade?.id, basicGrade?.name);

  const { data: maxSortData } = await supabase
    .from("programs")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1);

  const nextSortOrder = (maxSortData?.[0]?.sort_order || 0) + 1;

  console.log("2. Upserting ai-slide-builder program...");
  const programPayload = {
    slug: "ai-slide-builder",
    name: "AI 슬라이드 빌더 PRO",
    short_desc: "22개 슬라이드 스키마 기반 IR 피치덱·사업계획서·C-Suite 보고서 원클릭 생성 및 16:9 와이드 PPTX 다운로드",
    description: "22개 전문 슬라이드 스키마와 3대 기획 프레임워크(표준, 확장판, C-Suite 보고 형식)를 탑재한 프레젠테이션 자동화 솔루션입니다. PDF, DOCX, XLSX, TXT 등 실무 문서를 파싱하여 슬라이드별 핵심 지표와 전략을 자동 구성하며, 브라우저에서 직접 16:9 와이드스크린 파워포인트(PPTX) 파일로 즉시 다운로드하거나 16:9 반응형 슬라이드쇼로 미리 볼 수 있습니다. 모든 기능은 회원 본인의 Google Gemini API 키로 구동됩니다.",
    app_url: "https://ai-slide-builder.buylife.xyz",
    version: "v1.01",
    is_active: true,
    badges: ["free", "new"],
    category_id: toolsCat?.id,
    required_grade_id: basicGrade?.id,
    sort_order: nextSortOrder,
    thumbnail_url: "https://ai-slide-builder.buylife.xyz/ai-slide-builder-thumbnail.jpg",
  };

  const { data: existing } = await supabase
    .from("programs")
    .select("id, slug, sort_order")
    .eq("slug", "ai-slide-builder")
    .maybeSingle();

  if (existing) {
    console.log("Existing program found, updating:", existing.id);
    delete programPayload.sort_order; // preserve sort order
    const { data: updated, error } = await supabase
      .from("programs")
      .update(programPayload)
      .eq("id", existing.id)
      .select()
      .single();
    if (error) {
      console.error("Error updating program:", error);
    } else {
      console.log("Successfully updated program:", updated.name, updated.version);
    }
  } else {
    console.log("Inserting new program with sort_order:", nextSortOrder);
    const { data: inserted, error } = await supabase
      .from("programs")
      .insert(programPayload)
      .select()
      .single();
    if (error) {
      console.error("Error inserting program:", error);
    } else {
      console.log("Successfully inserted program:", inserted.name, inserted.version);
    }
  }
}

main().catch(console.error);
