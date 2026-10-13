# AI 패션스타일 자동화 — 작업 재개 인수인계 (CLI_HANDOFF)

작성: 2026-10-13 (Claude Code). 이어받는 CLI는 **이 문서 → [AGENTS.md](../AGENTS.md) → [DEVELOPMENT_PLAN.md](DEVELOPMENT_PLAN.md)** 순서로 읽으세요.

## 1. 한눈에 보기

| 항목 | 값 |
|---|---|
| 프로그램 | AI 패션스타일 자동화 (`slug: ai-fashion-style`) — 코디 추천 → 가상 피팅 → 뷰티 → 저장 |
| 버전 | **v1.01** (`src/lib/version.ts` = DB `programs.version`) |
| 주소 | https://ai-fashion-style.buylife.xyz (카탈로그 https://www.buylife.xyz/programs/ai-fashion-style) |
| Vercel | `buylife/ai-fashion-style`, Git 미연동, 폴더 `ai-fashion-style/`에서 `vercel deploy --prod --yes --scope buylife` |
| DB | 전용 테이블 없음. `programs`(이미지, new, 최소 일반), 3요금제, VIP 접근, 썸네일 등록 |
| 저장 | 사진·옷장·최근 룩·설정은 회원 브라우저 IndexedDB(`ai-fashion-style-<userId>`). 서버 저장 없음 |
| AI | 서버 라우트에서만, 회원 본인 Gemini 키. 키 없으면 `needKey` |
| 참고 원본 | AI Studio "LookStudio AI (배포용)" (코드 복제 없음) |

## 2. 완료된 일

| 내용 |
|---|
| 분석·계획 `docs/DEVELOPMENT_PLAN.md`(커밋 `8d362d91`) |
| v1.01 신규 개발: 사진 입력·축소, 추천(동시 2·재시도·재생성·취소), 옷장(IndexedDB·URL 프록시·이름 생성), 가상 피팅(레이어드/갈아입기·배경 옵션), 되돌리기·비교, 뷰티 분석·적용, 저장·최근 룩, KO/EN, 매뉴얼, 키 관리, DB 등록·도메인·썸네일(§13)·배포 |

## 3. 코드 지도

```
src/lib/look/    types · aspect · prompts · validate · ssrf · history · i18n · storage · api · clientImages  (순수/클라이언트, tests/look.test.mjs 12개)
src/lib/         gemini.ts(서버: 모델·호출·오류 분류·폴백) · aiRoute.ts(관문) · fetchImage.ts(SSRF 방어) · apiKeys.ts · access.ts
src/app/api/     ai/{recommend,item-image,item-name,tryon,beauty-advice,beauty-apply} · fetch-image · keys · auth/logout
src/components/look/Studio.tsx   3열 스튜디오(상태·저장·붙여넣기·드롭·모달)
tests/browser.mjs + browser-entry.tsx   보이는 Chrome 15개(모의 Gemini)
```

핵심 규칙: AI 응답 PNG는 즉시 `shrinkImage`(JPEG ≤1600px) — 안 하면 레이어드 누적 요청이 4.5MB 한도 초과. 아이템/이름은 항상 standard 모델. 안전 필터 거부는 분류해 안내(우회 금지).

## 4. 개발·검수·배포

```bash
cd ai-fashion-style && npm install
npm test && npx tsc --noEmit
npm run test:browser          # Playwright + Chrome(보이는 창), Gemini는 모의 응답
npx next build && vercel deploy --prod --yes --scope buylife
# 수정 때마다 DB 버전 +0.01
```
- 실제 Gemini 형식 점검은 `NODE_OPTIONS=--conditions=react-server node --import tsx <스크립트>`로 `src/lib/gemini.ts`를 직접 호출(주인님 본인 키, 가상 인물 이미지만 사용, 소액).
- 커밋은 경로 명시(`git add ai-fashion-style`), 루트 `HANDOFF.md`·`ERROR_LESSONS.md`는 다른 CLI의 미커밋 변경이 섞여 있어 내 블록만 별도 반영.
- 썸네일 교체는 `PLATFORM_PATTERNS.md §13` + `scripts/generate-program-thumbnail.mjs`만.

## 5. 검수 증거 (2026-10-13)

테스트 12/12·빌드·보이는 Chrome 15/15. 실제 Gemini(standard): 추천 11.6초·세트 2개, 아이템 이미지 1.26MB, 입어보기 2.4MB PNG, 뷰티 분석 정상. 운영 접속: 로그인·접근·화면 렌더 확인(주인님 세션).

## 6. 남은 일

1. pro 모델 실호출 확인(미가용이면 standard 폴백이 동작해야 함).
2. 일반(naver) 회원 실계정 흐름(비밀번호 입력 필요 — AI 에이전트 불가).
3. 실제 사용자 사진·쇼핑몰 이미지로 품질 확인(본인 사진, 소액).
4. 후속: 룩북·공유 카드, 쇼핑 링크, 다중 인물, 체형 분석.

## 7. 함정·교훈

- 요청/응답 4.5MB 한도: 입력 ≤1600px JPEG, 결과도 JPEG로 축소, 프록시는 원본 3MB까지.
- 숨김 MCP 창에서는 미디어·파일 선택이 안 되므로 UI 검수는 Playwright 하네스(보이는 Chrome)로.
- 안전 필터 우회용 프롬프트 변형 금지(거부 시 사용자 안내).
- 원본의 브라우저 키 저장·`cors-anywhere` 폴백·운영자 키 주입은 사용하지 않는다.
