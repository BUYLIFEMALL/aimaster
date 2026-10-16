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
  console.log("=== platform_guides 에 AI 12단 상세페이지 가이드 등록 시작 ===");

  const title = "AI 12단 상세페이지 자동화 - 쿠팡 12단 & 스마트스토어 상세페이지 제작 완벽 가이드";
  const category = "이커머스";

  const content = `
# AI 12단 상세페이지 자동화 완벽 활용 가이드

쿠팡(12장+)과 네이버 스마트스토어(9장+) 규격에 맞추어, 상품명 입력만으로 기획부터 비주얼 렌더링, 860px 통상세페이지 다운로드까지 원클릭으로 완성하는 방법입니다.

---

### 1. 사전 준비 (API 키 연동)
1. 프로그램 접속 후 좌측 사이드바의 **'🔑 API키등록·플랫폼연동'**을 클릭합니다.
2. 본인의 Google Gemini API 키를 입력하고 저장합니다. (키가 없으신 분은 링크를 통해 Google AI Studio에서 무료 발급 가능)
3. 등록된 키는 회원님의 고유 세션에 안전하게 보관되며, AI 상세페이지 기획 및 이미지 렌더링 시에만 직접 호출됩니다.

---

### 2. STEP 1: 제품 정보 & 1초 스펙 자동검색
1. **판매 플랫폼 선택**:
   - **쿠팡 (12단+)**: 로켓배송 모바일 860px 규격 12장면 풀 시퀀스
   - **네이버 스마트스토어 (9단+)**: 감성 리뷰형 9장면 시퀀스
2. **AI 엔진 선택**:
   - **⚡ Nano Banana**: 빠른 생성 속도 및 표준 상업용 렌더링
   - **✨ Nano Banana2**: 초고해상도 극세사 질감 및 매크로 디테일 렌더링
3. **상품명 입력 & 🔍 1초 스펙 자동검색**:
   - 상품명을 입력하고 [🔍 1초 스펙 자동검색] 버튼을 누르면 AI가 핵심 스펙, 제품 설명, 타겟 고객, 할인율, 3대 후킹 포인트를 1초 만에 자동 작성합니다.
4. **추가 자료 첨부 (선택)**:
   - 제품 실물 사진(#FFFFFF 흰색 배경 누끼 권장)이나 사양서 문서(PDF, TXT, MD)를 등록하면 더욱 정밀한 제품 디테일이 반영됩니다.

---

### 3. STEP 2: 12단 스튜디오 기획 및 이미지 렌더링
1. **[쿠팡 12단 상세페이지 원클릭 일괄 기획하기 🚀]** 버튼을 클릭합니다.
2. 총 12개 장면이 순서대로 완성됩니다:
   - 01. HOT EVENT (프로모션 배너)
   - 02. PROBLEM & SOLUTION (메인 후킹)
   - 03. KEY SPECIFICATION (대표컷 & 스펙 요약)
   - 04. FEATURE 01 (소재/성분 특장점)
   - 05. FEATURE 02 (기능/성능 특장점)
   - 06. FEATURE 03 (디자인/감성 특장점)
   - 07. LIFESTYLE (일상 연출 컷)
   - 08. FACT CHECK (타사 비교 우위표)
   - 09. MACRO DETAIL (초근접 디테일)
   - 10. HOW TO USE (1-2-3 단계별 사용 가이드)
   - 11. RECOMMENDED (타겟 고객 4대 체크리스트)
   - 12. PACKAGE & FAQ (구성품 및 안심 보증 A/S)
3. 각 씬의 카피나 프롬프트는 우측 연필 아이콘을 눌러 언제든 자유롭게 직접 편집할 수 있습니다.
4. 상단의 **[⚡ 전체 이미지 일괄 렌더링]**을 누르면 12개 씬의 고화질 비주얼이 순차적으로 자동 완성됩니다.

---

### 4. STEP 3: 모바일 실시간 검토 & 통이미지 다운로드
1. 우측의 **모바일 실시간 뷰어**에서 실제 고객이 스마트폰에서 스크롤하며 보는 화면을 미리 검토합니다.
2. 상단의 **[📥 860px 통이미지 다운로드]**를 누르면, 쿠팡과 스마트스토어에 바로 등록할 수 있는 긴 세로 통상세페이지 고화질 원본 파일이 즉시 다운로드됩니다.
3. 작업한 상세페이지는 **'3. 보관함 & 다운로드'**에 영구 보관되며 언제든 다시 열어 수정할 수 있습니다.
`;

  // 기존 등록 확인
  const { data: existing } = await supabase
    .from("platform_guides")
    .select("id")
    .eq("title", title)
    .maybeSingle();

  if (existing) {
    console.log("기존 가이드 업데이트 중...");
    await supabase.from("platform_guides").update({
      content,
      category,
      updated_at: new Date().toISOString(),
    }).eq("id", existing.id);
  } else {
    console.log("신규 가이드 생성 중...");
    await supabase.from("platform_guides").insert({
      title,
      category,
      content,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  }

  console.log("✓ platform_guides 등록 완료!");
}

main().catch(console.error);
