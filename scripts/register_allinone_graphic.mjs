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

const SLUG = "allinone-graphic";
const NAME = "AI 올인원 그래픽 자동화";
const APP_URL = "https://graphic.buylife.xyz";
const CATEGORY_ID = "b5cec438-a6cc-43e5-83bc-59368f8a2c4d"; // 이미지 카테고리
const VERSION = "v1.01";

const SHORT_DESC = "19개 전문 직군 123종 프리셋, 초고해상도 나노바나나 엔진, 브러시 인페인팅 & 아웃페인팅 올인원 그래픽 스튜디오";

const DESCRIPTION = `### 🎨 19개 직군 123종 전문 템플릿 & 스마트 매직 에디터 올인원 스튜디오

**AI 올인원 그래픽 자동화**는 개발자, 기획자, 마케터, 디자이너, 1인 창업가, 셀러, 크리에이터 등 모든 실무자가 디자이너나 외주 없이 고품질 상업용 비주얼을 1분 만에 완성할 수 있는 전문가용 AI 크리에이티브 스튜디오입니다.
단순한 텍스트 프롬프트 생성을 넘어, 기획서 문서 분석, 123종 사전 프리셋, 나노바나나(Nano Banana) 초고해상도 렌더링, 브러시 마스크 인페인팅/아웃페인팅 부분 수정까지 브라우저 하나로 완벽하게 해결합니다.

---

#### 🌟 6대 핵심 특장점

1. **19개 전문 직군 & 123종 상업용 템플릿 완비**:
   - **IT/기술**: UI/UX 플레이스홀더, 랜딩 배너, 앱 아이콘, 404 에러 일러스트, 관리자 대시보드, DB 다이어그램, 3D 게임 에셋, 공정 시뮬레이션, HMI 제어 패널 등
   - **창작/예술**: 유튜브 고화질 썸네일, 텍스트 심도 플레이리스트, 3D 가상 아바타 캐릭터 시트, 웹툰 배경 라인아트, 잡지/소설 표지, 동화책 삽화, 상업용 스톡 포토, 콘티 스토리보드 등
   - **비즈니스/마케팅**: 경영진 1장 요약 인포그래픽, 제품 컨셉 목업, 브랜드 무드보드, 타이포그래피 포스터, SNS 피드 광고, 명함 목업, 금융 차트 등
   - **커머스/자영업**: 흰 배경 상품 누끼, 쇼핑몰 기획전 배너, 제품 상세페이지, 메뉴판, 음식 포스터, 패션 룩북, 가상 피팅 모델, 의류 작업지시서 테크팩 등
   - **전문 서비스/라이프**: 학습 교재 삽화, 의학 해부도, 3D 아파트 인테리어 투시도, 건축 외관 렌더링, 모바일 청첩장, 파티 포스터 등
2. **AI 입력 도우미: 기획서 한 장으로 입력창 원클릭 완성**:
   - 제품 사양서, 회의록, 기획서 메모 파일(.txt, .md, .json, .pdf)을 첨부하면 AI가 문서를 정밀 분석하여 템플릿의 가변 필드를 100% 자동 채움 지원.
3. **나노바나나(Nano Banana) 초고해상도 비주얼 엔진**:
   - ⚡ **나노바나나 (표준)**: 빠른 속도, 아이디어 스케치용 1K 고화질 생성.
   - ✨ **나노바나나2 (Pro)**: 2K/4K 초고해상도 극세사 질감 지원, 매크로 접사 및 텍스트 렌더링 최적화.
4. **브러시 마스크 인페인팅 (In-painting) 에디터**:
   - 캔버스에서 마우스/펜 브러시로 원하는 영역을 칠하고 수정 프롬프트를 입력하면, 배경은 유지한 채 해당 영역만 마법처럼 교체, 추가, 또는 지우개 제거 복원.
5. **지능형 캔버스 아웃페인팅 (Out-painting)**:
   - 1:1 정방형 이미지를 16:9 유튜브 와이드나 9:16 쇼츠 세로형으로 비율 확장 시, 피사체를 중앙에 자연스럽게 두고 빈 배경을 인공지능으로 자연 연장.
6. **11대 화풍 스타일 & 다국어 텍스트 지원**:
   - 실사 8K, 3D 렌더링, 애니메이션 지브리풍, 유화, 수채화, 픽셀 아트, 사이버펑크, 벡터 일러스트 등 11종 스타일 즉시 적용.
   - 한국어, 영어, 일본어, 중국어 등 이미지 내 다국어 타이포그래피 렌더링 지원.

---

#### 🔒 100% 회원 본인 Google Gemini API 키 연동 원칙
회원 본인의 Google Gemini API 키를 직접 등록하여 독립적이고 무제한으로 고속 생성할 수 있습니다. 운영자나 타인의 키로 폴백하지 않으며, 데이터는 회원 본인 세션에 안전하게 보장됩니다.`;

async function main() {
  console.log("1. Checking existing program...");
  const { data: existing } = await supabase.from("programs").select("id").eq("slug", SLUG).maybeSingle();

  let programId;
  const programPayload = {
    name: NAME,
    slug: SLUG,
    category_id: CATEGORY_ID,
    short_desc: SHORT_DESC,
    description: DESCRIPTION,
    app_url: APP_URL,
    version: VERSION,
    badges: ["free", "new"],
    sort_order: 128, // 최상단 노출
    is_active: true,
    updated_at: new Date().toISOString(),
  };

  if (existing) {
    console.log("Updating existing program:", existing.id);
    const { error } = await supabase.from("programs").update(programPayload).eq("id", existing.id);
    if (error) throw error;
    programId = existing.id;
  } else {
    console.log("Inserting new program...");
    const { data: created, error } = await supabase
      .from("programs")
      .insert({
        ...programPayload,
        created_at: new Date().toISOString(),
      })
      .select("id")
      .single();
    if (error) throw error;
    programId = created.id;
  }
  console.log("Program saved with ID:", programId);

  // 2. Pricing Plans (3종)
  console.log("2. Updating pricing plans...");
  const { data: currentPlans } = await supabase.from("pricing_plans").select("id").eq("program_id", programId);
  if (!currentPlans || currentPlans.length === 0) {
    const plans = [
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
    const { error: planErr } = await supabase.from("pricing_plans").insert(plans);
    if (planErr) console.error("Plan insert error:", planErr);
    else console.log("Created 3 pricing plans successfully");
  } else {
    console.log("Pricing plans already exist:", currentPlans.length);
  }

  // 3. Platform Guides 등록
  console.log("3. Registering platform guide...");
  const GUIDE_SLUG = "allinone-graphic-guide";
  const { data: existingGuide } = await supabase.from("platform_guides").select("id").eq("slug", GUIDE_SLUG).maybeSingle();

  const guidePayload = {
    slug: GUIDE_SLUG,
    title: "AI 올인원 그래픽 자동화 - 19개 직군 123종 프리셋 & 매직 인페인팅 완벽 가이드",
    category: "이미지",
    summary: "디자이너 없이 1분 만에 끝내는 상업용 비주얼 제작! 123종 전문 프리셋 선택부터 기획서 AI 자동 입력, 나노바나나 고화질 렌더링, 브러시 인페인팅 부분 수정까지 전 과정을 알기 쉽게 설명합니다.",
    content: DESCRIPTION,
    sort_order: 128,
    is_published: true,
    updated_at: new Date().toISOString(),
  };

  if (existingGuide) {
    await supabase.from("platform_guides").update(guidePayload).eq("id", existingGuide.id);
    console.log("Platform guide updated");
  } else {
    await supabase.from("platform_guides").insert({
      ...guidePayload,
      created_at: new Date().toISOString(),
    });
    console.log("Platform guide inserted");
  }

  console.log("All catalog registration steps completed!");
}

main().catch(console.error);
