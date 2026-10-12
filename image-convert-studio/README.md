# 이미지 변환 스튜디오 (image-convert-studio) — v1.03

참고 원본: `imagic-ochre.vercel.app`(Imagic). 동작 방식을 분석해 AIMaster 규칙(통합 로그인·권한, 흰색 베이스, 표준 사이드바)에 맞춰 새로 만들었습니다. 문구·코드는 원본을 복사하지 않았습니다.

- 주소: https://image-convert-studio.buylife.xyz (Vercel 프로젝트 `image-convert-studio`, 팀 buylife)
- 카테고리 멀티미디어, FREE 배지(가입 회원 누구나). API 키·외부 계정이 필요 없는 100% 브라우저 처리 도구입니다(최상위 규칙 해당 없음).
- 메뉴: 1 변환(`/convert`) · 2 콜라주(`/collage`) · 사용 안내(`/guide`). 한국어/English(우측 상단, localStorage `image_convert_studio_lang`).

## 구조
- `src/lib/imageTools/formats.ts` 순수 함수(크기 계산·콜라주 좌표·파일명) — `npm test`로 검증.
- `src/lib/imageTools/engine.ts` 브라우저 엔진: `createImageBitmap` → canvas → `toBlob`, 확대/축소는 `pica`(Lanczos3 등 + 언샵 마스크), ZIP은 JSZip, 콜라주는 canvas.
- `src/components/tool/{ConvertTool,CollageTool,GuideView,Dropzone,LangProvider}.tsx`
- 권한: `src/lib/access.ts`(`requireProgramAccess`/`checkProgramAccessApi`, admin 클라이언트 + 루트 판정 사본).

## 핵심 규칙·주의
- 한도: 최대 300장, 100장 초과 시 안내, 한 변 16384px / 약 1.2억 화소 초과 출력 차단. AVIF는 최신 브라우저만, JPEG는 투명을 흰색으로 채웁니다.
- **pica는 `features: ["js","wasm"]`로만 초기화합니다.** 기본값(웹 워커 `ww`)은 번들러(Turbopack) 환경에서 webworkify가 응답하지 않아 확대/축소가 영원히 "변환 중"에 멈춥니다(v1.01 → v1.02 수정).
- 등록 SQL: `supabase/migrations/0001_register_program.sql`.

## 작업 기록
- v1.01 (2026-10-12): 신규 제작·등록·배포.
- v1.02 (2026-10-12): 업스케일(pica) 멈춤 수정. 실제 Chrome(member 계정)에서 3장 일괄 변환, 2× PNG 확대(300×200→600×400), 콜라주(1248×840) 확인.
- 남은 일: 없음(관리자 화면·결제 흐름은 FREE 배지라 해당 없음). 썸네일은 필요 시 `scripts/generate-program-thumbnail.mjs`.
- v1.03 (2026-10-12): 주인님 지시로 일본어(JA) 기능 삭제 — 언어는 한국어/English만.
- v1.04 (2026-10-12): 한국어 사용 안내를 주인님 제공 가이드 본문으로 교체(JPEG 투명은 실제 동작대로 흰색 채움).
- v1.05 (2026-10-12): 핸드폰 번호 필수 정책 적용 — 핸드폰 번호가 없는 회원(관리자 제외)은 이용할 수 없고 메인 사이트 설정에서 번호를 등록하도록 안내합니다. 공용 규칙은 루트 `lib/utils/phone.ts`, 상세는 `docs/HANDOFF.md` 2026-10-12 항목.
