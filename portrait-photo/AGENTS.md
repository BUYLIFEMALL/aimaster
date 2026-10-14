# AI 인물사진 자동화 (portrait-photo) — 작업 지침 (v1.05)

> 먼저 루트 `CLAUDE.md`·`docs/HANDOFF.md`·`docs/ERROR_LESSONS.md`를 읽는다. 이어받을 때는 [`docs/CLI_HANDOFF.md`](docs/CLI_HANDOFF.md), 설계 배경은 [`docs/DEVELOPMENT_PLAN.md`](docs/DEVELOPMENT_PLAN.md).

## 한 줄 요약
인물 사진 1장 + 촬영 목적(증명사진·비즈니스·SNS·시네마틱·자유) 프리셋 + 조명·카메라·배경·포즈·복장·피부 질감·필름 룩·보정 4종 → 회원 **본인 Gemini 키**로 인물 사진 1장을 만든다. 후처리(좌우 반전 입력, 배경 순백 정리, 413×531 증명사진 JPEG, 밝기·노출·대비, 가이드선)는 모두 브라우저에서 한다. 사진·결과는 **서버에 저장하지 않고** 브라우저 IndexedDB(최근 20장)에만 둔다. 참고 원본은 AI Studio "Cinematic Portrait Studio 2"이며 코드·문구·브랜드(크레딧·링크)는 복제하지 않았다.

## 구조
- `src/lib/portrait/` **순수 로직(단위 테스트)**: `options`(옵션 데이터·id), `purposes`(목적 프리셋 5종 — 모든 id가 실제 옵션을 가리켜야 함), `prompt`(`buildPrompt`: 옵션 **id만** 받아 서버가 영어 프롬프트 조립 — 임의 문장 주입 불가), `validate`(`parseGenerateRequest`: 이미지 base64 3.2M자·MIME·옵션 형식), `post`(순백 정리 BFS·`coverCrop`·`fitWithin`·`toneFilter`).
- v1.02 추가: `post.ts`의 `SIZE_PRESETS`(여권·운전면허 413×531, 주민등록증·이력서 354×472, 미국 비자 600×600, 반명함 709×945)·`clampCandidates`(1~4장), `canvas.ts`의 `renderSized`, Studio의 **후보 N장 동시 생성**(요청 N건을 `Promise.allSettled`로 병렬, 일부 실패 허용)·후보 선택 줄·**원본/결과 비교 슬라이더**(`clip-path`).
- v1.03 추가: **서버 보관함(선택)** `lib/saved.ts`·`/api/saved`(GET 목록+서명 URL 1시간, POST 저장, DELETE `?id=`/`?all=1`) — 비공개 버킷 `portrait-photo-files`, 테이블 `portrait_photo_saved`(RLS owner-only, 서비스 롤 + `user_id` 필터, 최대 30장). 회원이 스튜디오에서 토글을 켠 경우에만 **생성 결과(원본 제외)** 를 JPEG ≤2048px로 줄여 올린다(기본 꺼짐, localStorage에 선택 기억). **일괄 처리**: 사진을 최대 6장 올리면 같은 옵션으로 사진마다 1장씩 2개씩 병렬 생성, [전체 저장]. 규격 프리셋 5종(여권·주민등록증·운전면허 3.5×4.5, 이력서 3×4, 중국 비자 33×48mm 380×553, 미국 비자 600×600, 인화용 709×945).
- v1.04 추가: `zip.ts`(의존성 없는 저장 방식 ZIP·UTF-8 이름·중복 이름 처리, 일괄 [ZIP으로 전체 저장]), 규격 프리셋 7종(공식 사이트 확인분: 캐나다 `canada.ca` 1200×1800·200KB~5MB, 영국 `gov.uk` 600×750 이상·50KB~10MB — 둘 다 **AI 사진 접수 불가 가능성 경고문 `caution`** 표시, 일본 외무성 35×45mm는 기존 여권 규격과 동일), 보관 기간(7·30·90일·무기한, `expires_at`) — 만료분은 `purgeExpired`가 목록·저장 때 삭제.
- v1.05 추가: 규격 프리셋 9종(공식 사이트 확인분 인도 여권 630×810 `passportindia.gov.in`, 인도 비자 600×600·10~300KB `indianvisaonline.gov.in` 추가), **후보 한눈에 비교**(여러 후보를 격자로 보고 선택, 후보 2장 이상 생성 직후 자동으로 격자), 서버 보관함 **사용량 표시**(장수/30·합계 MB).
- 클라이언트 전용: `canvas.ts`(입력 1,600px JPEG 축소+셀카 반전, 순백 정리, PNG/413×531 렌더, 썸네일), `history.ts`(IndexedDB `portrait-photo:<userId>`, 최대 20).
- 서버: `gemini.ts`(`IMAGE_MODELS` flash=`gemini-2.5-flash-image`, pro=`gemini-3-pro-image-preview`(imageSize는 pro만), pro 없음→flash 폴백, 오류 분류 key/quota/timeout/safety/noimage), `aiRoute.ts`(`guardAi(request, maxBody)`: 권한→본문 한도→본인 키).
- API(모두 `checkProgramAccessApi` + `force-dynamic`): `POST /api/generate`, `/api/keys`(+`/test`).
- 화면: `/studio`(`Studio.tsx`, 3열: 사진·보정·모델 / 결과·저장 / 옵션), `/history`, `/settings`, `/guide`.
- DB 테이블 없음. 키는 공용 `user_api_keys`(provider `gemini`).

## 지킬 것
- 키는 회원 본인 Gemini 키만. 없으면 `needKey` 안내, 폴백 금지. 이미지 생성은 호출마다 본인 키 비용(Pro·2K/4K 더 큼)이라는 안내 유지.
- **얼굴 사진은 민감 정보**: 원본 사진은 어떤 경우에도 서버에 저장·로그하지 않는다. 생성 결과는 회원이 서버 보관함을 직접 켠 경우에만 저장한다(기본 꺼짐). "본인 또는 동의받은 사진" 확인 체크를 생성 전에 요구한다. 타인·유명인 사칭 금지 안내 유지.
- **공식 서류 통과 보장 문구 금지**(원본의 "정부24 100% 통과"류 제거). 순백 정리·413×531은 "참고용, 제출 기관 규정 확인" 안내와 함께 둔다.
- 프롬프트 첫 규칙은 **얼굴 동일성**(눈·코·입·턱 형태·나이·피부 톤 변경 금지)이고 텍스트·로고 금지. 영어 고정 템플릿이며 색 이름은 영어 `name`을 쓴다(한국어 라벨 금지 — 단위 테스트가 잡았음).
- 요청 본문은 Vercel 4.5MB 한도 때문에 입력을 긴 변 1,600px JPEG로 줄여 base64 3.2M자 이하로 보낸다.
- 새 옵션을 추가하면 `purposes.ts`의 id 참조와 `tests/portrait.test.mjs`(개수·id 일관성)를 함께 고친다.
- 버전은 `src/lib/version.ts`·`package.json`·DB `programs.version`을 함께 올린다. Supabase MCP `execute_sql`은 문장별로 보낸다.
- 화면은 흰색 베이스 + 표준 사이드바(계정은 마지막 메뉴 바로 아래, `← 다른 프로그램 보기` 상단).

## 검수
- `npm test`(순수 로직 10건: 규격 비율·픽셀 범위(캐나다·영국·인도), ZIP 구조·CRC32 표준값, 보관 기간), `npx tsc --noEmit`, `npm run build`.
- 실제 생성: `NODE_OPTIONS=--conditions=react-server node --import tsx test-artifacts/real-call.mts [flash|pro] [id-photo|business|sns|cinematic]`(운영자 키, 비용 발생. 입력은 AI가 만든 가상 인물 썸네일). 실측: flash 9초(PNG 1.5MB), pro 19초(JPEG 0.6MB).
- 운영 확인(2026-10-14): 로그인 Chrome에서 사진 올리기 → 동의 체크 없을 때 안내 → 생성(864×1184) → 순백 정리 44% → 가이드선 → PNG(843KB)·413×531 JPEG(30KB) 저장 → 기록 목록·전체 삭제.

## 남은 일 (v1.06 후보)
- 규격은 공식 사이트로 디지털 사양이 확인된 것만 추가(호주는 인쇄 35×45mm만, 솅겐은 공식 확인 불가라 보류), 후보 간 상세 확대 비교, 일괄 모드 결과 이름 지정.
- 일반 회원(`buylifemall@naver.com`) 로그인 흐름 재확인(주인님 로그인 후).
- v1.02 운영 확인(2026-10-14): 후보 3장 15초에 동시 생성 → 후보 선택 → 원본 비교 슬라이더 → 미국 비자 600×600(51KB) 저장 → 기록 삭제.
- v1.03 운영 확인(2026-10-14): 사진 2장 일괄 생성 21초 → 서버 보관함 자동 저장 → 서명 URL 이미지 200(JPEG 106KB) → 없는 id 삭제 404 → 보관함·기록 전체 삭제.
- 규격 사실 확인(웹 검색 2026-10-14): 주민등록증은 3.5×4.5cm(이력서만 3×4cm), 중국 비자 33×48mm 전자 사진은 가로 354~420·세로 472~560px(용량은 자료마다 차이), 캐나다는 자료 간 픽셀이 달라 미추가, 출입국 외국인등록은 변형 사진 불허.
- v1.04 운영 확인(2026-10-14): 일괄 2장 → 보관 기간 7일(만료 10-21 기록) → ZIP(2항목, application/zip) → 캐나다 1200×1800 226KB 저장·주의 문구 → 만료 처리된 항목이 목록 조회 때 삭제됨 → 전체 삭제.
- 규격 사실 확인(공식 사이트 검색 2026-10-14): canada.ca(50×70mm, 디지털 JPEG 200KB~5MB, 최소 1800×1200~최대 4500×3000, 사진사 촬영 원본), gov.uk(최소 600×750, 50KB~10MB, 소프트웨어 변경 금지), mofa.go.jp(35×45mm).
- v1.05 운영 확인(2026-10-14): 후보 4장 → 격자 4칸 → 4번 선택 시 스테이지 복귀·활성 4번, 인도 비자 600×600(54KB)·인도 여권 630×810(76KB) 저장·주의 문구, 보관함 사용량 `4장 / 30장 · 합계 0.5MB` → 전체 삭제.
- 규격 확인(공식 검색 2026-10-14): passportindia.gov.in(630×810 ICAO, 변경 금지), indianvisaonline.gov.in(JPEG 10~300KB 정사각), passports.gov.au(인쇄 35×45mm만·디지털 사양 없음), europa.eu(솅겐 35×45 공식 근거 확인 못함).
