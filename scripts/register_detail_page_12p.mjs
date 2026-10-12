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
  console.log("=== AI 12단 상세페이지 자동화 카탈로그 등록 & 썸네일 업로드 시작 ===");

  // 1. 썸네일 업로드
  const thumbnailPath = "D:/Antigravity/AIMaster/scratch/detail-page-12p-thumbnail.jpg";
  let thumbnailUrl = null;

  if (fs.existsSync(thumbnailPath)) {
    const fileBuffer = fs.readFileSync(thumbnailPath);
    const storagePath = "catalog/detail-page-12p-thumbnail.jpg";

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
  const slug = "detail-page-12p";
  const { data: existing } = await supabase
    .from("programs")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  const programPayload = {
    name: "AI 12단 상세페이지 자동화",
    slug: slug,
    category_id: "729e7dd9-571e-4f2b-adb8-0ff941edbea1", // Tools 카테고리
    short_desc: "쿠팡 12단 및 스마트스토어 9단 규격 자동 최적화, 1초 스펙 자동검색, Nano Banana AI 멀티모달 상세페이지 일괄 완성 스튜디오",
    description: `쿠팡 로켓배송 12장면 및 네이버 스마트스토어 9장면 이커머스 규격에 완벽하게 맞추어, 상품명 1초 스펙 자동검색, 사양서 문서 파싱, Gemini Nano Banana AI 비주얼 렌더링을 통해 12단 풀 패키지 상세페이지를 원클릭으로 완성하는 상업용 상세페이지 스튜디오입니다.

주요 핵심 기능:
1. 플랫폼 규격 자동 최적화: 쿠팡 모바일 가로 860px 12단 시퀀스 및 네이버 스마트스토어 감성 리뷰형 9단 시퀀스 원클릭 자동 구성
2. 1초 스펙 자동검색: 상품명 하나만 입력하면 핵심 스펙 4종, 설득력 있는 제품 설명, 타겟 고객, 할인율, 3대 후킹 포인트를 AI가 1초 만에 자동 작성
3. 사양서 및 다각도 제품 실물 사진 인식: PDF, TXT, MD 파일 내용 파싱 및 #FFFFFF 순백 누끼 사진 다각도 분석 렌더링
4. Nano Banana 상업용 비주얼 렌더링: ⚡ Nano Banana (초고속 상업용 렌더링) 및 ✨ Nano Banana2 (초고해상도 극세사 질감)
5. 실시간 스마트폰 앱 라이브 시뮬레이터: 실제 소비자가 쿠팡/네이버 앱에서 스크롤하며 보는 화면을 실시간 시뮬레이션
6. 860px 쿠팡 표준 세로 통상세페이지 자동 합성 & 원클릭 다운로드: 12개 장면을 HTML5 Canvas로 깔끔하게 하나의 긴 상세페이지 이미지로 합성하여 다운로드 지원
7. 100% 회원 본인 Google Gemini API 키 독립 연동`,
    sort_order: 127, // 카탈로그 최상단 1순위
    badges: ["free", "new"], // 가입 회원 누구나 무료 체험 배지
    is_active: true,
    version: "v1.01",
    app_url: "https://detail-12p.buylife.xyz",
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
