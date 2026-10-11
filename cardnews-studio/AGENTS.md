# CARDNEWS STUDIO — AI 에이전트 인수인계 문서 (AGENTS.md)

> # ★★★ 최상위 절대 불변 규칙 (2026-10-09 주인님 지시)
> **모든 사용자는 본인의 계정과 본인 API 키(Gemini·OpenAI·Claude)를 각각 직접 등록·연동해서 사용한다.**
> 운영자(주인님)나 타인의 키로 대신 처리하지 않으며, 키가 없으면 "본인 키를 등록해주세요"로 안내한다. 상세: 루트 `docs/TOP_RULE_PERSONAL_ACCOUNT_API.md`.

작업 전에 루트 `CLAUDE.md`, `docs/HANDOFF.md`, `docs/ERROR_LESSONS.md`, `docs/SIDEBAR_LAYOUT_STANDARD.md`, `docs/AI_MODEL_INTEGRATION_STANDARD.md`를 먼저 읽는다.

## 1. 개요와 현황
- 프로그램명 `CARDNEWS STUDIO` / slug `cardnews-studio` / 현재 버전 **v1.01** (`src/lib/version.ts`, `package.json`, DB `programs.version`, 마이그레이션 SQL 모두 같이 올린다)
- 주소: https://cardnews-studio.buylife.xyz (Vercel 프로젝트 `buylife/cardnews-studio`, 별칭 `cardnews-studio-lime.vercel.app`)
- 기술: Next.js 16 + React 19 + Tailwind 4 + Supabase SSR(공유 DB `esgxyikcnnvmlhygjkth`). 글자 얹기는 브라우저 캔버스. 기반 코드는 `youtube-channel-consultant`(로그인·권한·키 저장·사이드바).
- 기획 배경: 주인님이 Google Flow의 "Carousel Pro" 도구(Flow "도구 빌더"로 만든 카드뉴스 생성 도구) 화면 캡처 여러 장을 주고 같은 기능을 요청했다. 기능 흐름과 선택지(분야·어조·화풍·구성·테마 컬러·배치·표시 효과·폰트·페이지 수)를 참고해 새로 만들었고 이름·디자인은 복제하지 않았다. 화면은 흰색 바탕(`docs/PLATFORM_PATTERNS.md` §27-1).
- 기존 프로그램과의 관계: `auto-instagram-posting`(INSTA 포스팅)은 글자 없는 사진 슬라이드 + 게시 자동화, `ai-image-studio`는 이미지 생성만이라 **글자가 얹힌 카드뉴스 디자인**은 이 프로그램이 처음이다. v1.03에서 INSTA 포스팅 연동 예정.

## 2. 흐름 (사이드바 번호 = 사용 순서)
대시보드(내 프로젝트·보관함) → ① 기획 `/plan` → ② 문구 `/copy` → ③ 디자인 `/design` → ④ 배경 생성 `/background` → ⑤ 내보내기 `/export`, 그리고 `API키등록·플랫폼연동 /settings`.
- ① 분야(자기계발·경제/재테크·맛집/카페·뷰티/패션 + 직접 입력), 핵심 주제(✨ **주제 추천**: 분야로 AI가 주제 5개 제안), 어조(일반·진지·국뽕·유머·넉살), 페이지 수 4/6/8/10, 비율 4:5(1080×1350)/1:1, 글쓰기 AI 선택.
- ② 페이지별 `headline`(18자 권장)·`sub`(70자 권장)를 AI가 JSON으로 작성 → 직접 수정. 1장은 표지, 마지막은 저장·공유 유도.
- ③ 디자인 무드(정보형/감성형/임팩트형/미니멀형 — 고르면 배치·막 진하기·효과 추천값이 같이 바뀜), 화풍(실사·디지털 아트·3D 렌더링·수채화), 구성(백그라운드·인포그래픽·캐릭터·텍스트강조), 테마 컬러(Auto·Warm/Beige·Cool/Blue·Minimal B&W), 텍스트 배치(중앙/상단/하단/좌측), 표시 스타일(기본·그림자·외곽선·형광펜), 배경 불투명도(글자 뒤 막), 폰트, 헤드라인·서브 크기/굵기/좌우/상하/색.
- ④ 이미지 모델(Nano Banana 2 2K 기본 / Pro 4K / 1K)로 페이지별 배경 생성. 전체 생성은 확인 안내(호출 횟수 표시) 후 2장씩 동시에, 실패한 장은 개별 재시도, 만든 이미지는 장당 최대 6개 이력 중 선택.
- ⑤ 미리보기와 같은 함수로 그려 PNG 저장(장별 / 전체 연속 다운로드).

## 3. 파일 구조
- `src/lib/cardnews/` — `presets.ts`(모든 옵션 목록, 참고 도구 선택지 + 정한 프리셋), `types.ts`, `defaults.ts`, `layout.ts`(줄바꿈·배치 계산, **순수 함수 — 자동 검사 대상**), `render.ts`(캔버스 그리기), `renderClient.ts`(이미지·글꼴 로딩, PNG 만들기), `fonts.ts`(글꼴 CSS), `sanitize.ts`(저장 전 검증), `apiGuard.ts`(권한·본인 키·AI 검증)
- `src/lib/ai/` — `models.ts`(글쓰기 모델 레지스트리), `llm.ts`(공급사 REST 호출, `json` 옵션), `copyPrompts.ts`(문구·주제 프롬프트와 JSON 파싱), `imagePrompts.ts`(배경 프롬프트), `imageModels.ts`, `image.ts`(Gemini 이미지 호출)
- `src/app/api/cardnews/{topics,copy,image}`, `src/app/api/projects[/id]`, `src/app/api/settings/api-keys`
- `src/components/studio/` — `ProjectProvider`(프로젝트 상태·1.5초 자동 저장·새로고침 복원), `CardCanvas`, `ui`
- `src/lib/access.ts` ← `src/lib/programAccess.ts`(루트 `lib/access/checkProgramAccess.ts`의 **사본**, 규칙이 바뀌면 같이 고칠 것)

## 4. DB·저장소 (2026-10-11 적용, `supabase/migrations/0001`, `0002`)
- 테이블 `cns_projects`(id, user_id→auth.users, title, data jsonb, created_at, updated_at) + **RLS owner-only 4개 정책**. 앱은 세션 클라이언트 + `.eq("user_id", …)`로 이중 한정.
- 공개 버킷 `cardnews-images`(이미지 형식만, 15MB 제한). **업로드·삭제는 서버(서비스 키)만**, 경로는 항상 `<user_id>/<uuid>.<확장자>`. 저장 전 `sanitize.ts`가 이미지 주소를 "내 폴더 주소"만 허용해 다른 회원 이미지·외부 주소 저장을 막는다.
- 프로젝트 삭제 시 그 프로젝트의 내 이미지 파일도 함께 삭제(실패해도 삭제는 완료).
- `programs` 등록: 카테고리 **인스타**, 최소 등급 `일반`, FREE 배지 없음(유료/승인제), 표준 요금제 1만/2만/3만 원, `app_url` 새 주소.

## 5. 규칙·주의
- 모든 API route·레이아웃에 `dynamic = "force-dynamic"` + `fetchCache = "force-no-store"`, 모든 쓰기 API는 `checkProgramAccessApi()` + 본인 키(`resolve`가 아니라 `getUserApiKey(user.id, …)`)만. 폴백 없음.
- 배경 이미지 프롬프트: **글자·로고를 그리지 않게 하고(우리가 얹는다)**, 인물은 기본 한국인, 사용자 입력은 `<data>`로 감싸고 꺾쇠 제거. 문구 프롬프트: 현재 연도 자동 주입, 지어낸 수치·출처 금지, **국뽕 어조는 사실이 아닌 수치·주장과 타국 비하 금지**.
- 폰트는 프로그램에 함께 들어 있는 무료 공개 글꼴(OFL): Pretendard, 블랙한산스, 나눔명조, 나눔손글씨 펜. 참고 도구의 `GmarketSans`는 npm 패키지가 없어 **블랙한산스로 대체**했다(주인님 확인 없이 정한 선택 — 필요하면 파일을 받아 넣는다). 외부 주소에서 받지 않으므로 PNG 저장 때 글꼴이 빠지지 않는다.
- 모델 ID는 운영 중 `naver-blog-agent` 레지스트리와 같은 값(글쓰기: Gemini 3.7 Flash 기본 등, 이미지: `gemini-3.1-flash-image`). 2026-10-11 라이브에서 실제 호출한 것은 Gemini 3.7 Flash(주제·문구)와 Nano Banana 2 2K(이미지)뿐이다.

## 6. 검수 기록 (2026-10-11, v1.01)
- 자동: `npm test` 16개(줄바꿈·배치·밝기, 저장 데이터 검증, 프롬프트·JSON 파싱, 이미지 프롬프트 규칙, `callLlm` json 옵션, 권한 판정 8개), `npm run build`, `tsc` 통과. 로그인 없이 API 호출 시 401은 `youtube-channel-consultant`와 같은 `checkProgramAccessApi` 사용.
- 실제 로그인 Chrome(관리자 `buylifemall@gmail.com` 세션, 본인 키): ✨주제 추천(5개) → 주제 선택·4장 → 문구 기획(4장, 표지·마무리 구조) → 디자인(폰트·외곽선·하단 배치가 미리보기에 즉시 반영) → 배경 1장 생성(실사, 한국인 여성 인물, 글자 없음) 후 글자 얹힌 카드 확인 → 캔버스 PNG 변환 성공(1080×1350, 약 2.2MB, 오염 없음) → 대시보드에 프로젝트·썸네일 표시.
- 일반 회원 경로는 `youtube-channel-consultant`와 같은 권한 판정 사본을 쓰며 `buylifemall@naver.com`에 사용기간(30일)을 부여해 두었다(직접 화면 검수는 하지 않음).

## 7. 알려진 한계·다음 작업
- **v1.02 완료(2026-10-11):** 5단계 "전체 ZIP 한 번에 받기"(브라우저에서 jszip, 서버로 보내지 않음), 3단계 "내 템플릿"(디자인 스타일만 저장·적용·삭제, 회원당 20개, 테이블 `cns_templates` RLS owner-only, `api/templates`), 새 배경은 sharp로 폭 1620 WebP q90 변환 후 저장(`src/lib/ai/imageOptimize.ts`), 프로젝트 저장 시 더는 참조되지 않는 내 이미지 파일 삭제(`removedImagePaths`). 마이그레이션 `0004_v1_02_templates.sql`. 테스트 18개. 라이브에서 템플릿 API 저장·조회·삭제 왕복 확인(ZIP 내려받기는 다운로드 허용 없이 직접 눌러보지 않음). 예전에 만든 PNG 이미지는 그대로 남는다.
- **v1.03(2026-10-11) 긴급 수정:** v1.02에서 넣은 sharp(WebP 축소)가 운영 Vercel 함수에서 libvips 누락으로 로드되지 않아 `/api/cardnews/image`(배경 생성)가 500이었다. `next.config.ts`에 `serverExternalPackages: ["sharp"]` + `outputFileTracingIncludes`(`@img/sharp-libvips-linux-x64`, `@img/sharp-linux-x64`)를 추가해 재배포, 같은 API가 JSON 400으로 정상 응답함을 확인(`docs/ERROR_LESSONS.md` 2026-10-11 항목). 마이그레이션 `0005_v1_03_sharp_fix.sql`. **실제 화면 검수(2026-10-11, 주인님 Chrome 데스크톱):** 4단계에서 2번 카드 "배경 생성" → 생성 중 표시 → 완료, 저장소에 WebP 182KB(예전 JPG 2.3MB)가 올라온 것을 확인. 완료 직후 Chrome 창이 가려져(탭 hidden) 생성된 카드 이미지의 최종 표시 캡처는 못 했다.
- **v1.03 예정:** INSTA 포스팅(`auto-instagram-posting`)으로 완성 카드를 바로 게시.
- 카탈로그 전용 실사 썸네일: 2026-10-11 제작·등록 완료(`program-images/catalog/cardnews-studio-thumbnail.jpg`, `scripts/generate-program-thumbnail.mjs`, 관리자 키 사용을 주인님께 확인받고 1회 생성, 마이그레이션 `0003_thumbnail.sql`).
- 모바일: 같은 출처 iframe(390px)로 기획·디자인·배경 생성 화면을 확인했다(상단 바 + 한 줄 레이아웃, 프로젝트 상태 공유). 실제 폰 기기는 아직 확인하지 않았다. `npm run lint`는 ESLint 설정 파일이 없어 동작하지 않는다(복사 원본과 동일).
- 이미지 생성은 한 장씩 유료 호출이므로(2K 기본) 사용 요금은 회원의 Gemini 계정에 청구된다. "전체 배경 생성" 전에 호출 횟수를 안내한다.
- 첫 렌더 때 글꼴 조각을 받는 동안 캔버스가 잠시 비어 보일 수 있다(수 초).

## 8. 배포
```bash
cd cardnews-studio
npm test && npm run build
vercel deploy --prod --yes --scope buylife
```
버전을 올릴 때: `src/lib/version.ts` + `package.json`(+lock) + DB `update programs set version='v1.0X' where slug='cardnews-studio';` + `supabase/migrations/`에 새 SQL. **올린 뒤 `grep APP_VERSION src/lib/version.ts`와 라이브 사이드바 표기까지 확인**(`docs/ERROR_LESSONS.md` 2026-10-11 버전 표기 어긋남 기록).
첫 배포 메모: `vercel.json {"framework":"nextjs"}` 필요, 환경변수 4개(`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_MAIN_SITE_URL`)는 production에만 등록, 도메인은 `vercel domains add cardnews-studio.buylife.xyz cardnews-studio --scope buylife`.
