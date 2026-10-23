# 인수인계 — 이미지 변환 스튜디오 (image-convert-studio) v1.04

작성: 2026-10-12 Claude Code. 다른 CLI가 이 대화 없이 바로 이어서 작업할 수 있도록 정리한 문서입니다.

## 1. 한눈에
| 항목 | 내용 |
|---|---|
| 폴더 | `image-convert-studio/` (자체 package.json·Vercel 프로젝트 `image-convert-studio`, 팀 buylife) |
| 라이브 | https://image-convert-studio.buylife.xyz (옛 vercel.app 주소는 유지) |
| 버전 | v1.04 (코드 `src/lib/version.ts` = package.json 1.04.0 = DB `programs.version`) |
| DB | `programs` slug `image-convert-studio`, 카테고리 멀티미디어, 최소 등급 일반, 배지 `new`+`free`, 요금제 1·2·3개월(1/2/3만원) |
| 권한 | FREE 배지 → 가입 회원 누구나. 판정은 `src/lib/access.ts` + `src/lib/programAccess.ts`(루트 판정 사본) |
| 성격 | 100% 브라우저 처리. 서버 API·API 키·외부 계정 없음(최상위 규칙 해당 없음) |
| 참고 원본 | https://imagic-ochre.vercel.app (Imagic). 코드·문구는 복사하지 않고 동작만 분석해 새로 작성 |
| 커밋 | `7c85503a`(신규 v1.02), `c914f245`(v1.04) — 모두 master 푸시 완료 |

## 2. 기능
- **변환(`/convert`)**: 형식 WebP(기본)/PNG/JPEG/AVIF, 품질 0.1~1(기본 0.9, PNG 비활성), 배율 0.5·1·1.5·2·3·4, 리샘플링 필터(배율≠1 또는 크기 제한 시 표시, 기본 lanczos3), 선명도 0~300(배율>1일 때만, 기본 80), 최대 너비·높이 제한, 카드별 변환/저장/삭제, 선택 일괄 변환(순차), ZIP, 용량 절감률 표시.
- **콜라주(`/collage`)**: 격자(열 수)/가로/세로, 셀 크기(기본 400×400), 간격 8, 여백 16, 배경색, cover/contain, 순서 ◀▶·삭제, 형식·품질, 미리보기·다운로드. 오류는 `alert` 대신 화면 안에 표시.
- **사용 안내(`/guide`)**: 한국어/English. **일본어(JA)는 주인님 지시(2026-10-12)로 삭제됨 — 다시 넣지 않는다.** 한국어 안내 본문은 주인님이 준 Imagic 가이드를 반영한 것(JPEG 투명은 실제 동작대로 "흰색 채움").
- 한도: 최대 300장, 100장 초과 시 안내, 한 변 16384px / 약 1.2억 화소 초과 출력 차단.

## 3. 구조
- `src/lib/imageTools/formats.ts` 순수 함수(크기·콜라주 좌표·파일명) — `npm test`(16개 통과)
- `src/lib/imageTools/engine.ts` `convertImage`, `buildZip`, `renderCollage` (pica·JSZip·canvas)
- `src/lib/i18n.ts` KO/EN 사전, `LANG_STORAGE_KEY=image_convert_studio_lang`
- `src/components/tool/{ConvertTool,CollageTool,GuideView,Dropzone,LangProvider}.tsx`, `src/components/layout/{Sidebar,TopBar}.tsx`
- 사이드바: 1 변환 · 2 콜라주 · (구분선) 사용 안내 · 계정/로그아웃. "← 다른 프로그램 보기"는 https://www.buylife.xyz/programs. API키등록 메뉴는 키가 없어 만들지 않음.
- 등록 SQL: `supabase/migrations/0001_register_program.sql` (현재 값 v1.04 기준으로 맞춰 둠)

## 4. 반드시 알아둘 것
1. **pica는 `features: ["js","wasm"]`로만 초기화한다.** 기본 웹 워커(`ww`)는 Turbopack 번들에서 응답하지 않아 확대/축소가 영원히 "변환 중"에 멈췄다(v1.01 → v1.02에서 수정). 상세: `docs/ERROR_LESSONS.md` 2026-10-12 항목.
2. 배포 후에는 1배 변환만 보지 말고 **2× 확대 + 콜라주까지** 실제 Chrome에서 눌러 본다.
3. 환경변수(Vercel production): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_MAIN_SITE_URL`. 등록 스크립트 `scripts/add-image-convert-vercel-env.mjs`(값은 루트 `.env.local`에서 읽음, 값은 저장소에 없음).
4. 수정할 때마다: `version.ts` + package.json + DB `programs.version` + 마이그레이션 SQL + README 기록을 함께 올린다(핵심 원칙 5번). 확장 프로그램은 없다.
5. 배포: `cd image-convert-studio && vercel deploy --prod --yes --scope buylife` (도메인은 이미 연결됨).

## 5. 검수 이력 (실제 Chrome, member 계정 buylifemall@naver.com)
- 3장 일괄 변환 PNG→WebP: 용량 56~60% 절감 확인.
- 2× 확대 PNG: 300×200 → 600×400, 200×300 → 400×600 확인(v1.02 이후).
- 콜라주 4장(격자 3열, 셀 400, 간격 8, 여백 16): 1248×840 확인.
- `/guide`: KO/EN만 표시, 새 안내 본문 확인.
- 확인하지 못한 것: 관리자 화면, AVIF 실제 저장(브라우저 의존), 100장 이상 대량 처리.

## 6. 남은 일
- 없음(필수). 선택: 메인 사이트 카드용 썸네일 제작(`scripts/generate-program-thumbnail.mjs`), EN 안내 문구를 한국어 안내와 동일한 구성으로 다듬기.
