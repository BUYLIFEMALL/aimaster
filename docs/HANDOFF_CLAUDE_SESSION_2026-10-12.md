# Claude Code 작업 인수인계 — 2026-10-11 ~ 10-12 세션 (올인원·SEO 스튜디오·메인 사이트 외)

> 작성: Claude Code (주인님 지시 "그동안 작업내용 인수인계 문서로 남겨줘", 2026-10-12)
> 읽는 순서: 루트 `CLAUDE.md` → `docs/HANDOFF.md`(날짜별 한 줄 기록) → **이 문서(이번 세션 전체 요약·구조·남은 일)** → 각 프로그램 `AGENTS.md`(상세 작업 기록)
> 이 문서는 추가 전용입니다. 새 작업이 생기면 맨 아래에 날짜 절을 덧붙이고, 기존 내용은 지우지 않습니다.

---

## 1. 한눈에 보기

| 프로그램 | 이번 세션 버전 | 라이브 | 핵심 내용 |
|---|---|---|---|
| **naver-blog-allinone** (올인원) | v1.14 → **v1.39** | https://naver-blog-allinone.buylife.xyz | 4단계 글 파이프라인·AI 이미지·보관함·모델 선택·세 탭 공통 생성 설정·카테고리 2종·사람 문체·구형 Gemini 호출 통일 |
| **naver-blog-seo-studio** | v1.61 → **v1.62** | https://naver-blog-seo-studio.vercel.app | 생성 기록 분류 + 네이버 실제 카테고리 + 확장 연동 (Codex 담당 폴더, 주인님 승인 후 수정) |
| **메인 사이트(루트 앱)** | (버전 없음) | https://www.buylife.xyz | 관리자용 [편집] 버튼, 관리자 배지, 관리자 패널 바로가기 |
| **cardnews-studio** | v1.02 → v1.03 | https://cardnews-studio.buylife.xyz | 템플릿·ZIP·WebP, sharp libvips 배포 오류 수정 |
| **style-dna-analyzer** (신규) | v1.01 → v1.02 | https://style-dna-analyzer.buylife.xyz | 스타일 DNA 분석 신규 프로그램, 데스크톱 레이아웃 수정 |

공통 운영 사실: 모든 배포는 `검수 → 커밋 → 푸시 → vercel deploy --prod → DB programs.version·extension_version 갱신 → node scripts/check-extension-release.mjs <slug>`. 올인원은 확장이 있어 매 배포마다 manifest·ZIP·DB 버전을 같이 올렸습니다.

---

## 2. naver-blog-allinone (올인원) — v1.14 ~ v1.39

### 2-1. 버전별 이력 (커밋 해시는 `git log --oneline -- naver-blog-allinone`)

| 버전 | 커밋 | 내용 |
|---|---|---|
| v1.14 | 74f7897f | 크롬 확장·실시간 트렌드 분석 버튼을 상단 헤더로 이동 |
| v1.15 | 17896b06 | 헤더 버튼 색(트렌드 초록, 확장 노랑) |
| v1.16 | b8995d86 | **대규모 믹스**: naver-blog-agent 로직을 가져와 4단계 파이프라인(기획→본문→윤문→검수), 실제 AI 이미지 생성·편집, 내 보관함(DB·Storage) |
| v1.17 | 560bf1bc | 세 탭 공통 생성 설정(페르소나·글자수·세부조건·말끝·문체) + AI 글/이미지 모델 선택 + 보관함 STEP 4 |
| v1.18 | 1960f902 | [내 AIMaster 계정에 등록된 키 불러오기](`/api/my-keys`, 본인 키만) |
| v1.19~v1.22 | b567536d, aa7d0dba, 0b681fc0, c9c2d746 | 모델 카드 위치, PRO 배지·날짜/날씨 삭제, 페르소나 버튼 반반, 글 생성 설정 보라색 박스 |
| v1.23 | 51c50b2f | 모델·디자인·이미지 설정 하늘색 박스 + **설정값 저장/초기화**(localStorage) |
| v1.24 | 9c6f6233 | **카테고리 통합 관리**(보관함 분류): 회원별 목록 + 글 이동 + 보관함 칩 필터 |
| v1.25~v1.26 | 86bfd6c3 | **네이버 실제 카테고리**(확장이 읽고 적용) + 옛 확장 감지 안내 |
| v1.27 | b69be949 | 맛집 탭 섹션 순서를 아이디어 탭과 통일 |
| v1.28 | 164c481d | 맛집 탭 카테고리를 맨 위로, 글 생성 설정에 기획 세부 조건·즉시 생성, 하늘색 박스 구조 통일 |
| v1.29 | 08b3da37 | SEO 키워드를 방문 정보 박스 안으로 |
| v1.30~v1.31 | 9ac395d0, 90978fa7 | 기획 세부 조건 3칸 → 중복 칸 제거, **AI 키워드 자동 추출을 선택한 글 AI로** |
| v1.32 | 030bec52 | 맛집 탭 페르소나 선택 시 기획 세부 조건 자동 입력·수정 |
| v1.33 | cfc9ace6 | 헤더 모델 배지를 모델 카드와 같은 이름으로 |
| v1.34 | bdbb7bd7 | 맛집 탭 이미지 모델·이미지 옵션 추가(**사진 있으면 사진 우선, 없으면 AI 이미지**) |
| v1.35 | 6eb12cdd | 맛집 탭 **사람이 쓴 글처럼 쓰기**(작성자 페르소나 직접 입력·인간화 토글·실제 경험·질문 힌트) |
| v1.36 | b7daeb6f | 아이디어·키워드 탭에도 사람 문체(공용 컴포넌트) + 네이버 카테고리 연결 안내 |
| v1.37 | f9d65b9e | 저장된 네이버 카테고리 목록임을 불러온 시각과 함께 표시 |
| v1.38 | c716b9cf | 맛집 탭 방문 사진 업로드를 글 생성 설정 아래·이미지 모델 위로 |
| v1.39 | 4394f60b | 주제 추천 5곳·키워드 파인더 5곳의 구형 Gemini 직접 호출을 선택한 글 AI로 통일 |

상세는 `naver-blog-allinone/AGENTS.md`(버전별 절), `README.md`에 있습니다.

### 2-2. 구조 (이어받을 때 꼭 알아야 할 것)

- **키는 브라우저(localStorage `naver_blog_allinone_settings`)**, 글 생성은 **브라우저에서 직접** 호출합니다(Gemini/OpenAI/Claude; Anthropic은 `anthropic-dangerous-direct-browser-access: true` 헤더, Replicate는 CORS 때문에 `/api/replicate-image` 서버 프록시). 서버 API는 저장소 용도만(`/api/posts`, `/api/posts/[id]`, `/api/posts/images`, `/api/my-keys`, `/api/categories`, `/api/replicate-image`) — 모두 `authorize()`(공용 권한 판정 `src/lib/programAccess.ts`, 관리자 클라이언트) + `dynamic="force-dynamic"`/`fetchCache="force-no-store"`.
- **세 탭 구조**: 아이디어·키워드 파인더는 위쪽 고유 영역만 다르고 아래 글 생성 폼은 **같은 `PostCreationSection`** 하나를 공유합니다. 맛집 탭(`PlacesVisionSection`)은 별도 폼이지만 `GenerationPanel`·`ModelSettingsCard`·`HumanStylePanel`·`PostWorkspaceView`·`useBlogWorkspace`를 같이 씁니다.
- **글 데이터**: 본문은 태그 텍스트(`[SECTION - 제목]`, `[IMAGE INSERT - 캡션]`, `- 목록`, `> 인용`, `**강조**`). 네이버 HTML/마크다운/일반 텍스트는 `article.ts`가 매번 만들어 냅니다. 이미지는 캡션으로 본문 표식과 연결.
- **파이프라인** `lib/blog/pipeline.ts` `runBlogPipeline`: `persona`(프리셋+직접 입력 합침 `humanVoice.ts`)·`humanStyle`·`experience`·`photos`(있으면 vision 모드, 없으면 장면 프롬프트→AI 이미지)·`hint`·`keywords`·`purpose`.
- **공용 모듈**: `models.ts`(엔진·모델 목록, `resolveTextEngine/resolveImageEngine`, `missingKeyMessage`, `textModelDisplayName`), `llm.ts`(`callLlm` 3사), `askJson.ts`(프롬프트→JSON 공용 호출, 주제 추천·키워드 파인더가 사용), `humanVoice.ts`, `prefs.ts`(설정값 저장), `categories.ts`·`naverCategory.ts`.
- **저장된 설정 키(localStorage)**: `naver_blog_allinone_settings`(키·모델), `naver_blog_allinone_gen_prefs_v1`·`..._places_prefs_v1`(설정값 저장), `naver_blog_allinone_naver_category_last_v1`/`..._list_v1`/`..._list_at_v1`(네이버 카테고리 기본값·캐시).
- **두 가지 "카테고리"를 혼동하지 말 것**: ① 보관함 분류(`aio_categories`, 글 `settings.categoryId`) = 올인원 안에서 글을 묶는 분류 ② 네이버 발행 카테고리(글 `settings.naverCategory {id,name}`) = 내 네이버 블로그의 실제 카테고리를 **확장이 읽어 온 값**.

### 2-3. DB 변경 (공용 Supabase `esgxyikcnnvmlhygjkth`, 모두 적용 완료)

| 객체 | 설명 | 파일 |
|---|---|---|
| `aio_posts` + 버킷 `allinone-images` | 보관함(RLS owner-only), 이미지는 서버만 업로드·공개 읽기 | `20261012100000_allinone_posts_and_bucket.sql` |
| `aio_categories` | 회원별 보관함 분류(RLS owner-only) | `20261012190000_allinone_categories.sql` |
| `programs.version/extension_version` | 매 배포 갱신 | `..._allinone_v1_NN_version.sql` |

### 2-4. 올인원 확장 (v1.25~)

- 소스 `naver-blog-allinone/extension/`: `naver-category-page.js`(네이버 화면 안 명령: inspect·dismissResume·openPublishSettings·categories·categorySelect, ai-auto-blog가 실화면에서 확인한 셀렉터 `categoryItemText_<번호>` 재사용, **최종 발행 버튼은 찾지도 누르지도 않음**), `background.js`(`READ_NAVER_CATEGORIES` 웹 출처에서만, 새 탭에서 발행 설정창만 열어 읽고 닫음 / `APPLY_NAVER_CATEGORY` 네이버 글쓰기 위젯에서만, 번호+이름이 정확히 같을 때만 선택), `content-web.js`(웹↔확장 다리: `ALLINONE_PING_EXTENSION`→`ALLINONE_PONG_EXTENSION{version}`, `ALLINONE_READ_CATEGORIES`→`ALLINONE_CATEGORIES_RESULT`), `content-naver.js`(위젯에 [발행 카테고리 적용] 버튼).
- **로드 방법(이 PC)**: `chrome://extensions` → 개발자 모드 → [압축해제된 확장 프로그램을 로드합니다] → **`D:\Antigravity\AIMaster\naver-blog-allinone\extension`** (끝의 `\extension` 폴더. 상위 폴더를 고르면 "매니페스트 파일이 없거나 읽을 수 없습니다"). 로드·새로고침 뒤에는 웹 화면 F5(content script는 페이지를 연 뒤 설치하면 붙지 않음).
- 점검: `node scripts/check-chrome-extension-loaded.mjs naver-blog-allinone` (Chrome Secure Preferences에서 로드된 폴더만 읽음).
- 주인님 확인(2026-10-12): 확장 로드 후 카테고리 불러오기·적용 **정상 동작**.

---

## 3. naver-blog-seo-studio v1.62 (Codex 담당 폴더)

- 커밋 63450c8b. 주인님이 "SEO 스튜디오에 둘 다" 선택해 수정 승인.
- **생성 기록 분류**: `naver_blog_seo_categories`(RLS), `naver_blog_seo_drafts.category_id`. 결과 화면 `DraftCategoryPanel`, 생성 기록 칩 필터·분류 이동·관리 모달(`components/categories/*`), API `/api/categories`(GET/PUT 전체 교체)·`/api/drafts/[draftId]/category`(PATCH). 복제 시 분류 복사.
- **네이버 실제 카테고리**: `naver_blog_seo_drafts.naver_category`(jsonb). 웹 [카테고리 불러오기] → 확장(`web-bridge.js` content script, `background.js` 서비스 워커 `categories` 메시지, 사이트 출처만 허용) → 선택값 저장 → 확장 사이드패널이 `/api/extension/drafts/library` 응답의 `naver_category`로 `categorySelect`(번호+이름 정확 일치) 실행, 없으면 기존 '카테고리명' 입력 방식.
- 확장 ZIP v1.62, DB `extension_download_url`은 **절대 주소**(`https://naver-blog-seo-studio.vercel.app/downloads/naver-blog-seo-studio-extension-latest.zip`). ※ 한 번 상대 주소로 잘못 넣었다가 복구함 — 다음 배포 SQL에서도 절대 주소 유지.
- **미검증**: 로그인 후 화면·실제 네이버 목록 읽기(이 프로그램은 vercel.app 별도 로그인). 점검표 `naver-blog-seo-studio/AGENTS.md` '카테고리 기능'.

---

## 4. 메인 사이트(루트 앱) — 관리자 기능

- 커밋 504efe4c, 332f26f3, 30411e5e. 배포 https://www.buylife.xyz.
- 관리자(`profiles.is_admin`)로 로그인하면: 프로그램 카드 **썸네일 우상단 [편집]**(→ `/admin/programs/<id>/edit`), 상단 사용자 버튼에 **"관리자" 배지**, 사용자 메뉴 [관리자 패널] 아래 **관리자 좌측 메뉴 바로가기**.
- 파일: `components/programs/ProgramCard.tsx`(`isAdmin` prop), `lib/access/getIsAdmin.ts`(표시 전용 판별, /admin 자체는 기존 미들웨어·레이아웃이 막음), `components/layout/adminNavItems.ts`(관리자 메뉴 단일 목록 — `AdminSidebar`와 `Header`가 공유, 메뉴 추가는 이 파일만), `components/layout/Header.tsx`.
- **미검증**: 관리자 계정 화면(제가 확인한 Chrome은 일반 회원 로그인). 일반 회원에게 숨김은 확인함.

---

## 5. 기타 프로그램 (이 세션 앞부분)

- **cardnews-studio v1.02/v1.03**: 템플릿, ZIP 다운로드, WebP, `next.config.ts`에 `serverExternalPackages:["sharp"]` + `outputFileTracingIncludes`(Vercel에서 sharp libvips 누락으로 API가 HTML 500을 돌려주던 문제 수정).
- **style-dna-analyzer v1.01~v1.02 (신규)**: `src/lib/dna/*`, `src/lib/ai/*`, API analyze/refine/test-image/analyses, 마이그레이션 0001~0004, 테스트 21개, 전용 썸네일, 데스크톱 입력 2열·결과 전체 폭 레이아웃 수정.
- 시험용 데이터·사용기간은 정리했고(naver 계정의 cardnews 2027-10-11 일괄 부여는 의도적으로 유지) 기록은 `docs/HANDOFF.md`.

---

## 6. 이번 세션에서 생긴 규칙·교훈 (모두 저장소 문서에 반영됨)

1. **화면 검증은 실제 Chrome으로 눈으로**(주인님 2회 지시): 스크립트·DB만으로 끝내지 않고 화면을 열어 이동·입력·클릭·캡처 후 DB와 대조. 루트 `CLAUDE.md` 13번, `docs/AI_AGENT_AUTONOMOUS_DEV_WORKFLOW.md` 8-1절.
2. **검수 중 브라우저 저장소에 넣은 시험 값은 반드시 지울 것**: 올인원 네이버 카테고리 모의 응답 값이 localStorage에 남아 주인님이 "실제와 다른 값"을 보신 사고(v1.37 대응). `docs/ERROR_LESSONS.md`.
3. **확장 '연결 안 됨' 점검 순서**: ① 그 프로그램 확장이 Chrome에 로드됐는가(`check-chrome-extension-loaded.mjs`) ② 로드/새로고침 뒤 웹 화면 F5 ③ 구버전 주소 미지원. 폴더 선택은 항상 `...\extension`. `docs/ERROR_LESSONS.md`.
4. **구형 Gemini 직접 호출 금지**: 모든 AI 호출은 `resolveTextEngine`+`callLlm`(또는 `askLlmJson`)로 선택한 공급사·본인 키를 쓴다(폴백 없음). 새 기능에서 `generativelanguage.googleapis.com`을 직접 부르지 말 것.
5. **경험·후기를 AI가 지어내지 않는다**: '사람이 쓴 글처럼' 기능도 회원이 입력한 경험만 반영하고, AI는 질문 힌트만 제안한다. 토글 이름은 "AI 탐지 우회"가 아니라 "사람이 쓴 글처럼 쓰기".
6. **DB programs 갱신 SQL 주의**: 확장 프로그램은 `extension_download_url`을 절대 주소로 유지.
7. **Windows bash 주의**: heredoc에 따옴표가 섞이면 통째로 실패 → 파일 쓰기 도구로 스크립트를 만들어 실행. 스크래치 스크립트는 고유 파일명(다른 CLI와 충돌 방지). CRLF 파일은 `\r\n`을 보존하며 편집.
8. **여러 CLI가 같은 폴더를 쓴다**: 커밋은 항상 명시 경로만 add. 이번 세션에서 Codex 폴더(naver-blog-agent)는 읽기만, SEO 스튜디오는 주인님 승인 후 수정했고 다른 CLI의 미커밋 변경(emotion-writer, suno-music-studio 등)은 건드리지 않음.

---

## 7. 남은 작업·미검증 (우선순위순)

**주인님 확인 필요**
1. SEO 스튜디오 v1.62: 확장 ZIP 재설치(폴더 로드)·로그인 후 결과 화면 카테고리 패널, 생성 기록 필터, 네이버 카테고리 불러오기 확인.
2. 메인 사이트 관리자 화면: [편집] 버튼 위치, 관리자 배지, 바로가기 메뉴.
3. 올인원 실제 글 생성 품질: **사람이 쓴 글처럼 쓰기 켠 글 vs 끈 글 비교**, 맛집 탭 **사진 없이 AI 이미지** 생성(유료 호출이라 제가 시험하지 않음). 결과를 받아 `pipeline.ts`의 `humanStyle` 규칙(작성 7번·윤문 추가 지침)을 다듬을 것.
4. 올인원 `?tab=places`의 네이버 카테고리 적용(발행 설정창 선택)은 주인님이 "잘된다"고 확인.

**보류된 정리 작업 (권한 차단)**
5. **올인원 보관함의 시험용 글 3개와 이미지** — 계정 `buylifemall@naver.com`, 2026-10-11 생성(제목: "출근 전 15분 아침 루틴…", "2026 워킹맘 시간관리 비법…", "성수동 포토그래퍼 작업실 카페…", id `d3d7c50a-…`·`6531567e-…`·`21bcea88-…`). 삭제를 시도했으나 **시스템 권한 정책(클라우드 저장소 일괄 삭제)이 차단**해 삭제하지 않았습니다. 주인님이 올인원 보관함(`?tab=library`)에서 카드의 휴지통으로 직접 지우거나(이미지도 함께 삭제됨), 삭제 권한을 명시적으로 승인한 뒤 진행해야 합니다.

**선택 개선**
6. 올인원 네이버 카테고리 목록에서 구분선·선택 불가 항목이 제외되는 동작이 의도에 맞는지 주인님 블로그 목록과 대조(코드 의도는 "발행 가능한 항목만").
7. `docs/` 정리 후보: 올인원 AGENTS.md가 길어짐 — 버전별 절은 추가 전용이라 유지.

**이번 대화에서 다루지 않은 기존 백로그(`docs/HANDOFF.md`·`docs/BLOG_*` 참고)**: BLOG 쇼츠 흐름 검증, 도메인 SSO 순차 전환(`docs/DOMAIN_SSO_POLICY.md`), `aimaster.kr` 도입 검토, 2026-10-20 전 Supabase Pro 결정, 보안 마무리.

**참고 관찰**: Chrome 확장 목록에서 "BLOG(원문) 네이버 입력기 v1.60"(ai-auto-blog 확장)에 [오류] 버튼이 보였음 — 이번 작업과 무관, 내용 미확인.

---

## 8. 운영 정보

- 테스트 계정: `buylifemall@gmail.com` = 관리자, `buylifemall@naver.com` = 일반 회원(이 계정의 등록 키로 Gemini 소량 시험을 주인님이 허용). 관리자 비밀번호는 입력하지 않음.
- 올인원 소스 폴더에서 확장 배포 절차: 버전(`src/lib/version.ts`·`extension/manifest.json`·README·AGENTS) → ZIP 재생성 → 마이그레이션 SQL 파일 → build → `vercel deploy --prod --yes`(폴더에서) → MCP `execute_sql`로 programs 갱신 → `node scripts/check-extension-release.mjs naver-blog-allinone` → 커밋·푸시.
- 올인원 테스트: `cd naver-blog-allinone && npm test`(31개). SEO 스튜디오: `npm run test:categories`, `npm run test:update-banner`.

---

## 9. 이번 세션 주요 커밋 (시간 역순 일부)

올인원: 4394f60b(v1.39) · c716b9cf(v1.38) · f9d65b9e(v1.37) · b7daeb6f(v1.36) · 6eb12cdd(v1.35) · bdbb7bd7(v1.34) · cfc9ace6(v1.33) · 030bec52(v1.32) · 90978fa7(v1.31) · 9ac395d0(v1.30) · 08b3da37(v1.29) · 164c481d(v1.28) · b69be949(v1.27) · 86bfd6c3(v1.25~26) · 9c6f6233(v1.24) · 51c50b2f(v1.23)
SEO 스튜디오: 63450c8b(v1.62)
메인 사이트: 30411e5e · 332f26f3 · 504efe4c
문서·도구: 7740e7a3(확장 연결 점검 스크립트·기록)
