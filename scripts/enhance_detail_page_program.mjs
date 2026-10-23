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
  console.log("=== programs 테이블 상품등록 상세 정보 고도화 시작 ===");

  const slug = "detail-page-12p";
  const thumbnailUrl = "https://esgxyikcnnvmlhygjkth.supabase.co/storage/v1/object/public/program-images/catalog/detail-page-12p-thumbnail.jpg?v=1791828346166";

  const richDescription = `
### 🚀 쿠팡 12단 & 스마트스토어 9단 상세페이지 원클릭 완성 솔루션

**AI 12단 상세페이지 자동화**는 대한민국 이커머스 셀러와 브랜드 디자이너를 위해 개발된 차세대 상업용 상세페이지 스튜디오입니다.
복잡한 포토샵 작업이나 비싼 외주 제작 없이, 제품명 하나만 입력하면 AI가 시장 분석부터 카피라이팅, 초고화질 비주얼 렌더링, 최종 860px 통이미지 다운로드까지 1분 안에 일괄 완성합니다.

---

#### 🌟 6대 핵심 특장점

1. **플랫폼 규격 자동 최적화**:
   - **쿠팡 로켓배송 규격 (12단+)**: 모바일 가로 860px 규격에 최적화된 12개 장면 풀 패키지 시퀀스.
   - **네이버 스마트스토어 규격 (9단+)**: 블로그형 리뷰와 감성 스토리텔링에 맞춘 9개 장면 시퀀스.
2. **1초 스펙 자동검색**:
   - 상품명만 입력하고 버튼을 누르면 AI가 핵심 스펙 4종, 매력적인 제품 설명, 타겟 고객, 할인율, 3대 후킹 포인트를 1초 만에 자동 작성합니다.
3. **사양서 & 다각도 실물 사진 인식**:
   - PDF, TXT, MD 파일 내용 파싱 및 #FFFFFF 흰색 배경 누끼 제품 사진 다각도 분석 렌더링 지원.
4. **Nano Banana 상업용 비주얼 렌더링 엔진**:
   - ⚡ **Nano Banana**: 빠른 생성 속도 및 표준 상업용 렌더링.
   - ✨ **Nano Banana2**: 초고해상도 극세사 질감 및 매크로 디테일 렌더링.
5. **실시간 모바일 앱 라이브 시뮬레이터**:
   - 실제 고객이 쿠팡/스마트스토어 앱에서 스크롤하며 보는 화면을 실시간 목업으로 시뮬레이션 검토.
6. **860px 쿠팡 표준 세로 통상세페이지 자동 합성 & 다운로드**:
   - 12개 장면을 HTML5 Canvas로 깔끔하게 하나의 긴 상세페이지 이미지로 자동 합성하여 즉시 다운로드 지원.

---

#### 📋 12단 상세페이지 표준 시퀀스 구조
- **01. HOT EVENT**: 선착순 런칭 특가 및 프로모션 배너
- **02. PROBLEM & SOLUTION**: 메인 후킹 및 문제의식 환기
- **03. KEY SPECIFICATION**: 대표컷 및 핵심 사양 요약
- **04. FEATURE 01**: 소재 / 원료 / 성분 차별점
- **05. FEATURE 02**: 기능 / 성능 / 압도적 편의성
- **06. FEATURE 03**: 디자인 / 감성 / 핏감 / 디테일
- **07. LIFESTYLE**: 일상 연출 컷 및 라이프스타일 컷
- **08. FACT CHECK**: 일반 타사 제품 vs 자사 제품 팩트 비교표
- **09. MACRO DETAIL**: 0.1mm 정밀 마감 및 초근접 디테일
- **10. HOW TO USE**: 1-2-3 단계별 간편 설치 및 사용 가이드
- **11. RECOMMENDED**: 이런 분들께 강력 추천 (4대 타겟 체크리스트)
- **12. PACKAGE & FAQ**: 풀 패키지 구성품 및 100% 안심 보증 A/S

---

#### 🔒 100% 회원 본인 Google Gemini API 키 연동
회원 본인의 Google Gemini API 키를 직접 연동하여 독립적이고 무제한으로 고속 생성할 수 있습니다.
`;

  const { error } = await supabase
    .from("programs")
    .update({
      description: richDescription.trim(),
      images: [thumbnailUrl],
      category_id: "3f365685-a7d7-4372-817a-c38217239592", // 이커머스
      updated_at: new Date().toISOString(),
    })
    .eq("slug", slug);

  if (error) {
    throw error;
  }

  console.log("✓ programs 테이블 상품 상세 정보 업데이트 성공!");
}

main().catch(console.error);
