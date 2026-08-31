# 🤖 AI Agent 협업 가이드라인 (AGENTS.md)

이 문서는 **상품소싱 자동화(trending-product-finder)** 프로젝트에서 AI Agent(Claude Code
등)가 협업할 때 준수해야 할 필수 가이드라인 및 규칙입니다.

---

## 🛡️ 에이전트 실행 및 안전 수칙 (Mandatory Rules)

### 1. 자율 진행 허용 작업
다음 작업은 사용자 사전 승인 없이 자율적으로 수행합니다:
- 파일 생성 및 코드 수정
- 패키지 설치 (`npm` 등)
- 로컬 테스트 및 빌드 실행
- 스키마 추가/마이그레이션

### 2. 사전 승인 필수 작업 (🚨 승인 없이 금지)
다음 작업은 실행하기 전 **반드시 사용자에게 명확히 확인 및 승인**을 받으세요:
1. **파일이나 폴더 삭제**
2. **Git push**
3. **실제 서비스 배포 (Vercel 프로덕션)**
4. **데이터베이스 데이터 삭제**
5. **환경변수와 API 키 변경**
6. **유료 API 호출** (데이터랩/쇼핑검색은 사용자 본인 키로 무료 한도 내 호출, OpenAI/Gemini는
   본인 키로 소량 과금 발생 — "지금 리포트 생성" 1회당 등록 키워드 수만큼 호출됨)

---

## 🎯 프로젝트 목적

잘 팔리는 상품, 사람들이 많이 검색하는 상품, 지금 시즌/트렌드에 맞는 상품을 자동으로
발굴·추천해주는 프로그램. 회원이 관심 카테고리+키워드를 등록하면, 네이버 데이터랩(관심도
추이)과 네이버쇼핑 검색(경쟁 상품 수)을 결합해 "관심도는 오르는데 경쟁은 적은" 기회를
점수화하고, AI가 추천 사유를 문장으로 설명해준다.

**주의**: `sourcing/`(제조 공장 견적서·위챗 대화 비교 코파일럿)과는 완전히 다른, 별개의
서브프로젝트다. 이름이 비슷해 보일 수 있으니 혼동하지 말 것.

---

## 📂 프로젝트 작업 디렉토리
* **메인 모듈 경로**: `trending-product-finder/`
* 모든 관련 소스 코드(Next.js App Router), API 라우트, 서버 액션은
  `trending-product-finder/` 폴더 내에서 개발 및 관리합니다.

---

## 🔗 AIMaster 플랫폼 공통 원칙

trending-product-finder는 AIMaster 저장소 안의 서브프로젝트다. 개발/유지보수 시 루트의
`../CLAUDE.md`를 **메인 지침**으로 반드시 함께 읽을 것 — 특히 아래 항목:

- **불변의 핵심 원칙 4번**: 엔진(코드/로직/UI)은 우리가 함께 만들고, 그 엔진을 구동하는
  API 키(네이버/OpenAI/Gemini)는 이용하는 각 회원이 본인 것을 설정 페이지에서 직접 연동해서
  쓴다. 운영자 키로 대신 동작하지 않는다.
- 페이지는 `requireProgramAccess()`(권한 없으면 redirect), 향후 API route를 추가한다면
  redirect 대신 결과 객체를 반환하는 `checkProgramAccessApi()`로 로그인 여부뿐 아니라 프로그램
  이용 권한까지 확인한다. **`requireProgramAccess()`/`checkProgramAccessApi()`를 쓰는 모든
  layout.tsx/route.ts에는 `export const dynamic = "force-dynamic"`과
  `export const fetchCache = "force-no-store"` 두 줄을 반드시 같이 선언할 것** —
  2026-08-30 플랫폼 전수 감사에서 이 두 줄 누락이 Vercel의 정적 캐싱으로 이어져 권한 체크
  자체가 무력화되는 버그가 발견됐다 (`docs/PLATFORM_PATTERNS.md` §10 참고).
- API 키는 공용 `user_api_keys` 테이블(`resolveApiKey()`: 본인 키만, 관리자 키로 폴백 없음)을
  그대로 쓴다. 이 프로그램은 `naver_client_id`/`naver_client_secret`(신규 provider, 이
  마이그레이션에서 추가)과 `openai`/`gemini`(기존 provider, 택1) 를 쓴다.
- 사용자 소유 데이터 테이블(`trend_watchlist`, `trend_snapshots`, `shopping_competition`,
  `recommendation_reports`)은 `user_id` + RLS owner-only 정책으로 격리한다.

## 📦 Phase 진행 상태

| Phase | 내용 | 상태 |
|-------|------|------|
| 1 | 관심 카테고리+키워드 등록, 데이터랩 관심도 추이 + 쇼핑검색 경쟁도 조회, 기회 점수 계산, AI 추천 사유 생성, 리포트 뷰 | ✅ 구현 완료 (2026-08-30) |
| 2 | 쿠팡파트너스 결합 → 실제 판매 가능 후보 매칭, `threads-affiliate-poster` 원클릭 연동 | ⏳ 예정 |
| 3 | 알리익스프레스 원가 비교 + 마진 시뮬레이션 | ⏳ 예정 |
| 4 | Google Ads API(선택), Vercel Cron 정기 자동 리포트 | ⏳ 예정 |

한 번에 다 만들지 않고 Phase별로 하나씩 붙여나가기로 했다(사용자 지시: "단계별로 하나씩
진행하면 되"). 새 Phase를 시작할 때는 이 표를 갱신할 것.

## ⚠️ 미검증 항목 (실사용 전 반드시 확인)

- `lib/naver/categories.ts`의 카테고리 코드(cid)는 웹 조사로 확보한 것이라 전체가 100%
  정확하다고 보장할 수 없다. 실제 회원이 네이버 API 키를 등록하고 첫 리포트를 생성해볼 때
  반드시 실제 응답으로 재검증할 것 — 필요하면 네이버쇼핑 카테고리 URL의 `cat_id` 값으로
  직접 대조.
- 아직 실제 네이버 Client ID/Secret으로 라이브 테스트를 하지 않았다. 배포 전 최소 1회
  실계정으로 관심 키워드 등록 → 리포트 생성까지 end-to-end 테스트 필요.
