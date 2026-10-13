# AI 패션스타일 자동화 (ai-fashion-style) — 인수인계

> ★ 최상위 규칙: AI는 **회원 본인 Gemini 키**(`user_api_keys`)로만 호출한다. 키가 없으면 `needKey` 안내, 운영자·다른 회원 키 폴백 금지. 사진·옷장·결과는 서버에 저장하지 않는다. ([TOP_RULE](../docs/TOP_RULE_PERSONAL_ACCOUNT_API.md))

작업 시작 전: 루트 `CLAUDE.md`, `docs/HANDOFF.md`, `docs/ERROR_LESSONS.md`. 썸네일은 **`docs/PLATFORM_PATTERNS.md §13` + `scripts/generate-program-thumbnail.mjs`**만 사용.
**이어받는 CLI는 [docs/CLI_HANDOFF.md](docs/CLI_HANDOFF.md)부터 읽으세요.**

## 기본 정보

| 항목 | 값 |
|---|---|
| 이름 / slug | AI 패션스타일 자동화 / `ai-fashion-style` |
| 버전 | **v1.01** (`src/lib/version.ts` = DB `programs.version`) |
| 주소 | https://ai-fashion-style.buylife.xyz (Vercel `buylife/ai-fashion-style`, CLI 직접 배포) |
| 카테고리 / 접근 | 이미지 / 최소 등급 일반 + 관리자 부여 사용기간(FREE 아님), 기본 3요금제 |
| 참고 원본 | AI Studio "LookStudio AI (배포용)" — 흐름·프롬프트 구조만 참고, 코드 복제 없음. 분석·계획 [docs/DEVELOPMENT_PLAN.md](docs/DEVELOPMENT_PLAN.md) |

## 구조

- Next.js 16.4 + React 19.3 + TS, 순수 CSS, `idb`, `@google/genai`(서버만).
- `src/lib/look/` 순수/클라이언트: `types` · `aspect`(종횡비·축소) · `prompts`(연도·한국인·배경 규칙, 상황 문구 정리) · `validate`(요청 이미지·모델 응답 검증) · `ssrf`(내부 주소 차단) · `history`(되돌리기) · `i18n`(KO/EN) · `storage`(IndexedDB 옷장·최근 룩·설정) · `api`(클라이언트 호출, `NeedKeyError`) · `clientImages`(축소·변환·`shrinkImage`).
- 서버: `src/lib/gemini.ts`(모델 구성·호출·오류 분류·pro→standard 폴백), `aiRoute.ts`(관문: 권한→본문 한도→본인 키), `fetchImage.ts`(SSRF 방어 이미지 프록시).
- API(전부 `checkProgramAccessApi` + `force-dynamic`): `/api/ai/{recommend,item-image,item-name,tryon,beauty-advice,beauty-apply}`, `/api/fetch-image`, `/api/keys`.
- 화면: `/studio`(3열 스튜디오 `components/look/Studio.tsx`), `/guide`(매뉴얼), `/settings`(키 등록).

## 핵심 설계 결정

- 서버 DB 테이블 없음. 인물 사진·옷장·결과는 회원 브라우저(IndexedDB, 회원별 DB)에만 보관.
- 입력 사진은 클라이언트에서 긴 변 1600px JPEG로 축소, **AI가 돌려준 PNG(약 1~2.4MB)도 JPEG로 줄여 보관**(`shrinkImage`) — 레이어드 누적 요청이 Vercel 본문 한도(4.5MB)를 넘지 않게.
- 추천 아이템 이미지는 동시 2개·최대 3회 재시도·개별 재생성·취소. 아이템/이름 생성은 항상 standard 이미지/텍스트 모델.
- 배경: 기본 "유지", 옵션 "상황에 맞게 변환"은 상황이 있을 때만 배경 변경 지시(원본의 문구-동작 불일치 해소).
- 안전 필터 거부는 사유를 분류해 안내하고 자동 우회 프롬프트는 쓰지 않는다.

## 검수 기록 (2026-10-13)

- 자동: `tsc`, `npm test` 12/12(종횡비·프롬프트·검증·SSRF·히스토리·번역·설정), `next build` 통과.
- **보이는 Chrome 시험 `npm run test:browser` 15/15** (모의 Gemini 응답): 동의 전 차단, 업로드·JPEG 변환, 추천(2세트·이미지 4장), 입어보기(종횡비 3:4·배경·상황 전달), 레이어드 누적, 되돌리기·다시 실행·비교, 갈아입기, 배경 변환 옵션, 안전 필터 안내, 뷰티 분석·적용, PNG 저장·최근 룩, 옷장(이름·URL·새로고침 유지·삭제), 키 없음 모달·영어 전환, 모바일 390px.
- **실제 Gemini 호출(주인님 본인 키, 가상 인물 이미지 1장)**: 추천 11.6초(세트 2개), 아이템 이미지 1.26MB PNG, 입어보기 2.4MB PNG, 뷰티 분석 정상. 모델 standard(`gemini-2.5-flash`/`gemini-2.5-flash-image`).
- 미검수: pro 모델(`gemini-3-pro-preview`·`gemini-3.1-flash-image-preview`) 실호출, 일반(naver) 회원 실계정, 실제 사용자 사진·쇼핑몰 이미지 품질, 모바일 실기기.

## 남은 일 / 후속

pro 모델 가용성 확인(폴백은 구현됨), 일반 회원 실계정, 룩북·공유 카드, 쇼핑 링크 연동, 다중 인물.

## 함정

- AI 응답 PNG가 커서 그대로 다시 보내면 413 — 반드시 `shrinkImage`.
- `server-only` 모듈을 스크립트로 시험하려면 `NODE_OPTIONS=--conditions=react-server`와 `tsx`를 쓴다.
- 서버 이미지 프록시는 응답도 4.5MB 한도라 원본 3MB까지만 받는다.
- 원본의 브라우저 키 저장·`cors-anywhere` 폴백은 쓰지 않는다.
