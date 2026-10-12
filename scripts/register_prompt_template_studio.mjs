import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

function loadEnv(path) {
  const text = fs.readFileSync(path, "utf8");
  const env = {};
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx !== -1) env[trimmed.slice(0, idx)] = trimmed.slice(idx + 1).replace(/^["']|["']$/g, "");
  }
  return env;
}

const env = loadEnv("D:/Antigravity/AIMaster/.env.local");
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  console.log("=== AI 프롬프트 템플릿 자동화 카탈로그 등록 & 썸네일 업로드 시작 ===");

  // 1. 썸네일 업로드
  const thumbnailPath = "D:/Antigravity/AIMaster/scratch/prompt-template-studio-thumbnail.jpg";
  let thumbnailUrl = null;

  if (fs.existsSync(thumbnailPath)) {
    const fileBuffer = fs.readFileSync(thumbnailPath);
    const storagePath = "catalog/prompt-template-studio-thumbnail.jpg";

    const { error: uploadErr } = await supabase.storage
      .from("program-images")
      .upload(storagePath, fileBuffer, { contentType: "image/jpeg", upsert: true });

    if (uploadErr) {
      console.error("썸네일 업로드 실패:", uploadErr);
    } else {
      const { data: pubUrl } = supabase.storage.from("program-images").getPublicUrl(storagePath);
      thumbnailUrl = `${pubUrl.publicUrl}?v=${Date.now()}`;
      console.log("✓ 썸네일 업로드 성공:", thumbnailUrl);
    }
  } else {
    console.warn("썸네일 파일이 존재하지 않습니다:", thumbnailPath);
  }

  // 2. 프로그램 등록 또는 업데이트
  const slug = "prompt-template-studio";
  const { data: existing } = await supabase
    .from("programs")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  const programPayload = {
    name: "AI 프롬프트 템플릿 자동화",
    slug: slug,
    category_id: "729e7dd9-571e-4f2b-adb8-0ff941edbea1", // Tools 카테고리
    short_desc: "동적 변수({{...}}) 기반 맞춤형 프롬프트 보관함, AI 자동 채우기 및 원클릭 즉시 실행 스튜디오",
    description: `자주 쓰는 고품질 프롬프트를 템플릿으로 저장하고, 변경이 필요한 부분만 동적 변수({{변수명}})로 지정하여 원클릭으로 AI 실행 및 결과물 추출까지 끝내는 프롬프트 라이브러리 스튜디오입니다.

주요 핵심 기능:
1. 템플릿 라이브러리 & 카테고리: Writing, Coding, Business, Marketing, Personal 등 카테고리별 분류 및 무제한 카테고리 추가, 실시간 검색
2. 동적 변수({{variable}}) 자동 감지: 본문 입력 시 중괄호 2개로 작성된 변수를 실시간으로 감지하여 태그 칩 생성
3. 제작 시 AI 3단 어시스턴트: 제목, 설명, 템플릿 본문 작성 시 Gemini AI가 최적의 문장과 변수 배치 자동 제안
4. 실행 시 AI 변수 자동 채우기: 변수 입력창에서 AI가 맥락에 꼭 맞는 현실적이고 창의적인 예시 데이터를 자동으로 쏙 채워줌
5. 원클릭 프롬프트 실행: Google Gemini 2.5 Flash 모델로 즉시 실행하여 마크다운 결과물 생성, 원클릭 복사 및 .md 파일 다운로드
6. 라이브러리 백업 및 복원: 보관된 전체 프롬프트를 표준 JSON 파일로 안전하게 백업 및 파일 업로드 복원
7. 100% 회원 본인 Google Gemini API 키 독립 연동`,
    sort_order: 126, // 카탈로그 최상단 1순위
    badges: ["free", "new"], // 가입 회원 누구나 무료 체험 배지
    is_active: true,
    version: "v1.01",
    app_url: "https://prompt-template.buylife.xyz",
    updated_at: new Date().toISOString(),
  };

  if (thumbnailUrl) {
    programPayload.thumbnail_url = thumbnailUrl;
  }

  let programId = existing?.id;

  if (programId) {
    console.log(`기존 프로그램(ID: ${programId}) 업데이트...`);
    const { error: updErr } = await supabase
      .from("programs")
      .update(programPayload)
      .eq("id", programId);
    if (updErr) throw updErr;
  } else {
    console.log("신규 프로그램 생성...");
    programPayload.created_at = new Date().toISOString();
    const { data: newProg, error: insErr } = await supabase
      .from("programs")
      .insert(programPayload)
      .select("id")
      .single();
    if (insErr) throw insErr;
    programId = newProg.id;
  }

  console.log(`✓ 프로그램 등록 완료 (ID: ${programId}, Name: ${programPayload.name}, sort_order: ${programPayload.sort_order})`);

  // 3. pricing_plans 기본값 등록 (1개월, 2개월, 3개월)
  const { data: existingPlans } = await supabase
    .from("pricing_plans")
    .select("id")
    .eq("program_id", programId);

  if (!existingPlans || existingPlans.length === 0) {
    console.log("기본 플랜 3종 등록 중...");
    const defaultPlans = [
      {
        program_id: programId,
        name: "1개월",
        billing_type: "monthly",
        price: 10000,
        original_price: 10000,
        is_active: true,
        sort_order: 0,
      },
      {
        program_id: programId,
        name: "2개월",
        billing_type: "bimonthly",
        price: 20000,
        original_price: 20000,
        is_active: true,
        sort_order: 1,
      },
      {
        program_id: programId,
        name: "3개월",
        billing_type: "quarterly",
        price: 30000,
        original_price: 30000,
        is_active: true,
        sort_order: 2,
      },
    ];

    const { error: planErr } = await supabase.from("pricing_plans").insert(defaultPlans);
    if (planErr) {
      console.error("플랜 등록 실패:", planErr);
    } else {
      console.log("✓ 기본 플랜 3종 등록 성공!");
    }
  } else {
    console.log(`이미 ${existingPlans.length}개의 플랜이 존재합니다.`);
  }

  console.log("=== 모든 등록 절차 완료! ===");
}

main().catch(console.error);
