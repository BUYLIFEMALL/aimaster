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
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, (env.SUPABASE_SECRET_KEY?.trim() || env.SUPABASE_SERVICE_ROLE_KEY?.trim()));

async function main() {
  console.log("=== AI Prompt 자동화 카탈로그 등록 & 썸네일 업로드 시작 ===");

  // 1. 썸네일 업로드
  const thumbnailPath = "D:/Antigravity/AIMaster/scratch/ai-prompt-auto-thumbnail.jpg";
  let thumbnailUrl = null;

  if (fs.existsSync(thumbnailPath)) {
    const fileBuffer = fs.readFileSync(thumbnailPath);
    const storagePath = "catalog/ai-prompt-auto-thumbnail.jpg";

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
  const slug = "ai-prompt-studio";
  const { data: existing } = await supabase
    .from("programs")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  const programPayload = {
    name: "AI Prompt 자동화",
    slug: slug,
    category_id: "729e7dd9-571e-4f2b-adb8-0ff941edbea1", // Tools 카테고리
    short_desc: "RTSC, 비즈니스 프레임워크, Vertex AI XML, CoT 논리적 추론 기반 메타 프롬프트 엔지니어링 자동화 스튜디오",
    description: `사용자의 거친 아이디어를 분석하여 ChatGPT, Claude, Gemini 등에 바로 붙여넣어 실행할 수 있는 완성형 메타 프롬프트(Meta-Prompt)를 설계해주는 AI 엔지니어링 스튜디오입니다.

주요 핵심 기능:
1. ⚡ 빠른 프롬프트 만들기 (Quick Magic): 역질문 유도(Interview), 페르소나 자동부여(Auto Persona), 비판적 개선(Critical Refine) 3대 마법 수식 원클릭 적용
2. 5대 프로 엔지니어링 모드: RTSC 마스터, 글로벌 비즈니스 프레임워크(CO-STAR/RTF/RICE/PREP/SWOT/PAS), 프롬프트 아키텍트(Zero-Question 실행문), Google Vertex AI 표준 XML 태그 구조화, 논리적 추론(Chain-of-Thought & 내부 독백)
3. 단계별 실시간 AI 제안: AI 구체화(Goal), 추천 역할 5선(Role), 작업문 자동 작성(Task), 출력 포맷 & 제약 조건 추천
4. 모델 기능 제한(Capability Constraints): 웹 검색, 코드 실행, 이미지 생성 등 특정 도구 호출 차단 지시 자동 주입
5. 반복 개선 피드백 루프: 결과물에 대한 추가 요구사항 및 어조 수정 지시 반영 재작성
6. 100% 회원 본인 Google Gemini API 키 독립 연동`,
    sort_order: 125, // 카탈로그 최상단 1순위
    badges: ["free", "new"], // 가입 회원 누구나 무료 체험 배지
    is_active: true,
    version: "v1.01",
    app_url: "https://ai-prompt.buylife.xyz",
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
