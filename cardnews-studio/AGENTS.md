# INSTA Cardnews 자동화 — AI 에이전트 인수인계 문서 (AGENTS.md)

> # ★★★ 최상위 절대 불변 규칙 (2026-10-09 주인님 지시)
> **모든 사용자는 본인의 계정과 본인 API 키(Gemini·OpenAI·Claude)를 각각 직접 등록·연동해서 사용한다.**
> 운영자(주인님)나 타인의 키로 대신 처리하지 않으며, 키가 없으면 "본인 키를 등록해주세요"로 안내한다. 상세: 루트 `docs/TOP_RULE_PERSONAL_ACCOUNT_API.md`.

작업 전에 루트 `CLAUDE.md`, `docs/HANDOFF.md`, `docs/ERROR_LESSONS.md`, `docs/SIDEBAR_LAYOUT_STANDARD.md`, `docs/AI_MODEL_INTEGRATION_STANDARD.md`를 먼저 읽는다.

## 1. 개요와 현황
- 프로그램명: **INSTA Cardnews 자동화** (영문 `INSTA Cardnews Auto` / `CARDNEWS STUDIO`) / slug `cardnews-studio` / 현재 버전 **v1.06** (`src/lib/version.ts`, `package.json`, DB `programs.version`, 마이그레이션 SQL 모두 같이 올린다)
- 주소: https://cardnews-studio.buylife.xyz (Vercel 프로젝트 `buylife/cardnews-studio`, 별칭 `cardnews-studio-lime.vercel.app`)
- 기술: Next.js 16 + React 19 + Tailwind 4 + Supabase SSR(공유 DB `esgxyikcnnvmlhygjkth`). 글자 얹기는 브라우저 캔버스. 기반 코드는 `youtube-channel-consultant`(로그인·권한·키 저장·사이드바).
- 기획 배경: 주인님이 Google Flow의 "Carousel Pro" 도구(Flow "도구 빌더"로 만든 카드뉴스 생성 도구, `b2391618-385d-4d96-84aa-a23959efa0ee`) 화면과 기능을 레퍼런스로 요청하심. 카드뉴스 제작뿐 아니라 인스타그램 피드 캡션(후킹 카피, 본문 요약, CTA, 타겟 해시태그 20~25개) 원클릭 생성·복사 패키지 기능 탑재.
- 기존 프로그램과의 관계: `auto-instagram-posting`(INSTA 포스팅)은 글자 없는 사진 슬라이드 + 게시 자동화, `ai-image-studio`는 이미지 생성만이라 **글자가 얹힌 카드뉴스 디자인 + 인스타 피드 캡션 생성**을 한 번에 완성하는 솔루션임.


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

## 6. 검수 기록
- 자동: `npm test` 19개(줄바꿈·배치·밝기, 저장 데이터 검증, 프롬프트·JSON 파싱, 이미지 프롬프트 규칙, `callLlm` json 옵션, 권한 판정 8개, 인스타 캡션&해시태그 생성기 및 파싱), `npm run build`, `tsc` 통과. 로그인 없이 API 호출 시 401은 `youtube-channel-consultant`와 같은 `checkProgramAccessApi` 사용.
- 실제 로그인 Chrome(관리자 `buylifemall@gmail.com` 세션, 본인 키): ✨주제 추천(5개) → 주제 선택·4장 → 문구 기획(4장, 표지·마무리 구조) → 디자인(폰트·외곽선·하단 배치가 미리보기에 즉시 반영) → 배경 1장 생성(실사, 한국인 여성 인물, 글자 없음) 후 글자 얹힌 카드 확인 → 캔버스 PNG 변환 성공(1080×1350, 약 2.2MB, 오염 없음) → 대시보드에 프로젝트·썸네일 표시.
- 일반 회원 경로는 `youtube-channel-consultant`와 같은 권한 판정 사본을 쓰며 `buylifemall@naver.com`에 사용기간(30일)을 부여해 두었다(직접 화면 검수는 하지 않음).

## 7. 버전 이력 및 알려진 한계
- **v1.06 완료(2026-10-12, 주인님 지시 — Google Flow "Carousel Pro" 옵션 1:1 대조):**
  - 대조 결과 빠져 있던 **카드 아이콘** 추가: 장마다 헤드라인 위에 선 아이콘(lucide 24종, `src/lib/cardnews/iconData.ts` — `scripts/gen-icons.mjs`로 생성, ISC 라이선스). AI가 문구 생성 때 장 내용에 맞는 아이콘 id를 고르고(`copyPrompts.ts`, 허용 목록 밖은 버림), 2단계에서 장별로 바꿀 수 있고, 3단계 "아이콘 설정"에서 표시 여부·크기(기본 130px)·좌우·상하를 조절한다. 색은 제목 글자색, 그림자 효과는 같이 적용.
  - 디자인 무드 이름을 Flow와 같게 "임팩트형"→"볼드형"으로 변경(저장값 `impact`는 그대로).
  - 대조해서 이미 같음을 확인한 항목: 분야 4종, 어조 5종, 생성 모델(Nano Banana 2/Pro), 비주얼 스타일 4종, 비주얼 구성 4종, 테마 컬러 4종, 텍스트 배치(우리는 좌측형 추가), 표시 스타일(우리는 형광펜 추가), 배경 불투명도, 페이지 4/6/8/10, 폰트·헤드라인·서브 크기/굵기/위치, 인스타 캡션(수정·복사), ZIP 저장.
  - 이전 버전 프로젝트·템플릿은 아이콘 설정이 없어도 기본값으로 열린다(`sanitizeStyle`). 마이그레이션 `0009_v1_06_card_icons.sql`(버전만).
- **v1.05 완료(2026-10-12, 주인님 지시):**
  - 공식 프로그램명을 **"INSTA Cardnews 자동화"** (`INSTA Cardnews Auto`)로 리브랜딩 (`APP_NAME`, 대시보드 헤더 H1, 레이아웃 메타데이터, DB `programs.name`).
  - 버전 `v1.05` 판올림 및 배포 완료. 마이그레이션 `0008_v1_05_rebrand_insta_cardnews.sql`.
- **v1.04 완료(2026-10-12):**
  - Google Flow 방식의 인스타그램 피드 캡션 & 해시태그 패키징 기능 탑재:
    - `src/lib/ai/copyPrompts.ts`: `buildCaptionPrompt`, `parseCaption` (후킹 헤드라인, 3~5단락 본문 요약, 참여 유도 CTA, 타겟 해시태그 20~25개 배열 및 전체 캡션 포맷팅).
    - `src/app/api/cardnews/caption/route.ts`: 회원 본인 키 전용 AI 캡션 생성 API 신규 구축 (`apiGuard` 연동).
    - `src/app/(dashboard)/export/page.tsx`: 5단계 내보내기 화면에 인스타그램 캡션/해시태그 원클릭 AI 생성 및 복사 UI, 인스타그램 웹 바로가기 통합.
    - `src/lib/cardnews/sanitize.ts` 및 `types.ts`: `ProjectData.caption` 데이터 모델 확장 및 정제 로직 반영.
    - 단위 테스트 19개 전체 PASS, 프로덕션 빌드 검증 완료. 마이그레이션 `0006_v1_04_rebrand_and_captions.sql`.

- **v1.03(2026-10-11) 긴급 수정:** v1.02에서 넣은 sharp(WebP 축소)가 운영 Vercel 함수에서 libvips 누락으로 로드되지 않아 `/api/cardnews/image`(배경 생성)가 500이었던 현상 해결.
- **v1.02 완료(2026-10-11):** 5단계 "전체 ZIP 한 번에 받기", 3단계 "내 템플릿", WebP 최적화.
- **카탈로그 전용 실사 썸네일 및 최상단 등록 (2026-10-12, 주인님 요청):**
  - 전문 크리에이터 스튜디오에서 한국인 마케터가 4:5 인스타그램 캐러셀 카드뉴스를 편집하는 실사 16:9 썸네일 제작 및 Supabase Storage `program-images/catalog/cardnews-studio-thumbnail.jpg` 업로드 완료.
  - 메인 카탈로그 `sort_order = 121`로 갱신하여 전체 프로그램 최상단 1위 배치 및 `badges = ["new", "best"]` 등록 완료. 마이그레이션 `0007_thumbnail_and_sort_order.sql`.


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
