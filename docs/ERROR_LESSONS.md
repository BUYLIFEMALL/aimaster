# 작업 중요 지침 — 에러 해결 기록 · 점검 체크리스트

> **모든 CLI(Claude Code, Codex, Gemini 등)는 작업을 시작하기 전에 이 문서를 먼저 읽는다.**
> 작업하다가 에러를 해결했거나, 꼭 확인해야 할 점검 사항을 발견하면 **그 작업의 커밋에 이 문서 기록을 함께 넣는다.**
> 같은 실수를 다른 CLI가 반복하지 않게 하는 것이 목적이다(2026-10-01 주인님 지시 — 루트 `CLAUDE.md` 핵심 원칙 7번).
>
> - 더 긴 배경 설명이 필요한 재사용 패턴은 `docs/PLATFORM_PATTERNS.md`, 지난 시즌 교훈 원문은 루트 `AGENTS.md` §10에 있다.
>   이 문서는 **"무엇이 터졌고 → 왜 → 어떻게 고쳤고 → 다음엔 무엇을 확인할지"를 짧게** 모은 곳이다.
> - 서브프로젝트 하나에만 해당하는 자세한 내용은 그 폴더 `AGENTS.md`에 쓰고, 여기에는 한 줄 요약 + 위치만 남긴다.

## 기록하는 방법 (형식)

새 항목은 해당 분류 맨 아래에 이 형식으로 추가한다. 날짜·프로그램·버전을 꼭 적는다.

```
- **[YYYY-MM-DD · 프로그램 vX.YY] 증상 한 줄**
  - 원인: …
  - 해결: …(파일·함수 위치)
  - 다음부터 확인: …
```

---

## A. 작업 전 점검 체크리스트 (매번)

1. `docs/HANDOFF.md`에서 **다른 CLI가 작업 중인 폴더**를 확인하고 건드리지 않는다(예: `naver-blog-seo-studio`는 Codex 담당). `git status`로 남의 미커밋 변경을 확인.
2. 스테이징(index)은 다른 CLI와 공유된다 — **`git add`는 커밋 직전에, 내 파일만 경로를 지정해서** 하고 바로 커밋한다.
3. 고칠 서브프로젝트의 `AGENTS.md`/`README.md`를 먼저 읽는다.
4. 버전 규칙: 배포할 때마다 `lib/version.ts`(또는 `utils/version.ts`) `APP_VERSION` + DB `programs.version`을 같이 +0.01.
5. 새/수정 API·Server Action은 **로그인 + 프로그램 이용 권한**(`checkProgramAccessApi`/`requireProgramAccess`) + `dynamic`/`fetchCache` 두 줄.
6. API 키는 **회원 본인 키만**(운영자 키 폴백 금지). 외부 계정 OAuth 앱도 회원 본인 앱.
7. 유료 API 호출·DB 구조 변경·환경변수 변경·실제 데이터 삭제는 먼저 주인님께 확인.
8. 브라우저 자동화(네이버 등)는 `docs/PLATFORM_PATTERNS.md` §20(봇 탐지 회피)·§28(웹→확장→네이버 입력)을 먼저 읽는다.

---

## B. 배포 · Vercel

- **[2026-10-01 · ai-auto-blog v1.06] 새 Vercel 프로젝트 첫 배포가 전 페이지 404**
  - 원인: `vercel project add`로 만든 빈 프로젝트는 프레임워크 설정이 비어 있어 Next.js로 빌드되지 않음.
  - 해결: 서브프로젝트에 `vercel.json` `{"framework": "nextjs"}`를 두고 재배포.
  - 다음부터 확인: 새 프로젝트 첫 배포 직후 주요 경로를 `curl`로 200/307 확인. 별칭은 배포 결과의 "Aliased" 주소를 쓸 것(이름이 겹치면 `-one` 등이 붙음).
- **[2026-10-01 · ai-auto-blog v1.06] 루트에 내장돼 있던 앱을 단독 빌드하자 숨은 타입 오류 발생**
  - 원인: 루트 `next.config.mjs`가 `typescript.ignoreBuildErrors: true`라 내장 시절 오류가 가려져 있었음.
  - 해결: 단독 `npm run build`로 드러난 오류 수정.
  - 다음부터 확인: 서브프로젝트를 분리하거나 옮길 때는 반드시 그 폴더에서 단독 빌드.
- **[2026-09-20] 루트 앱 배포가 `EBUSY`로 실패** — 데스크톱 앱 `runtime/`·`node_modules`를 루트 `.vercelignore`에 넣는다(루트 `CLAUDE.md`).
- **[2026-08-30] 권한 확인 결과가 캐시돼 다른 사람 화면이 보임** — 레이아웃·API에 `dynamic = "force-dynamic"` + `fetchCache = "force-no-store"`, 배포 후 `X-Vercel-Cache: MISS` 확인(`PLATFORM_PATTERNS` §10).

- **[2026-10-01 · 전 프로그램] 좌측 메뉴 "← 다른 프로그램 보기"가 BLOG 대시보드로 감**
  - 원인: 사이드바 표준이 `https://www.buylife.xyz/blog/dashboard`로 정해져 있었는데, BLOG를 단독 배포로 분리(v1.06)하면서 `/blog/*`를
    BLOG 새 주소로 넘기도록 해 모든 프로그램의 이 링크가 BLOG 대시보드로 가게 됐다. 분리할 때 다른 프로그램이 그 주소를 쓰는지 찾아보지 않았다.
  - 해결: 24개 프로그램 + ai-image-studio + BLOG의 링크를 `https://www.buylife.xyz/dashboard`로 교체, `docs/SIDEBAR_LAYOUT_STANDARD.md` 수정.
  - 다음부터 확인: **프로그램 주소를 옮기거나 넘김(redirect)을 걸 때는 저장소 전체에서 그 주소 문자열을 검색**해 다른 프로그램이 링크하고 있는지 확인한다.

- **[2026-10-01 · music, shop-detail-page] 사용하지 않는 변수 하나로 빌드 실패**
  - 원인: 사이드바 표준화 커밋(`69dc5de`)이 `components/layout/Sidebar.tsx`에 쓰지 않는 `MAIN_SITE_URL` 상수를 남김 → Next 빌드의 ESLint(no-unused-vars)가 오류로 막음. 그 뒤로 이 두 프로그램은 배포되지 않은 상태였다.
  - 해결: 그 줄 삭제 후 빌드 통과.
  - 다음부터 확인: 여러 프로그램을 한꺼번에 고친 커밋은 **고친 프로그램을 전부 빌드**해 보고 배포한다(일부만 확인하면 나머지가 조용히 깨진 채 남는다).

## C. 환경변수 · DB · 저장소

- **[2026-10-01 · ai-auto-blog v1.07] 단독 배포 후 로그인이 "fetch failed"**
  - 원인: 서브프로젝트 `.env.local`에 **없어진 옛 Supabase 프로젝트 주소**가 남아 있었고, 그 값을 Vercel에 그대로 옮김(서버 로그 `ENOTFOUND`).
  - 해결: 루트 `.env.local`의 공용 DB(`esgxyikcnnvmlhygjkth`) 값으로 교체.
  - 다음부터 확인: 환경변수는 **루트 `.env.local` 기준**으로 넣고, 주소에 공용 프로젝트 ID가 있는지 확인. 로그인 실패는 `vercel logs`부터 본다.
- **[2026-10-01 · ai-auto-blog v1.12] 글 1개가 12MB — 이미지가 base64로 본문에 통째로 저장됨**
  - 해결: 모든 AI·첨부 이미지를 Supabase Storage public 버킷에 올리고 주소만 저장(`ai-auto-blog/utils/imageStorage.ts`), 기존 글은 스크립트로 이전(원본 백업 후).
  - 다음부터 확인: 이미지·파일을 DB 칸에 base64로 넣지 않는다(`CLAUDE.md` Reusable Patterns, `PLATFORM_PATTERNS` §12).
- **[2026-10-01 · ai-auto-blog v1.13] 여러 프로그램이 함께 쓰는 버킷의 자동 삭제**
  - 확인: `post-images`는 threads·insta·naver-cafe·BLOG 공용 — 정리 작업은 **자기 프로그램 폴더(`<회원 id>/ai-auto-blog/`)만** 지운다.
- **[2026-10-01 · ai-auto-blog v1.14] 이미 기준을 넘긴 기존 데이터를 자동 삭제 규칙이 한 번에 지울 뻔함**
  - 해결: 실제 삭제 전 대상 개수를 SQL로 세어 주인님께 확인 → 정책 시작일부터 유예(`ai-auto-blog/utils/imageRetention.ts`).
  - 다음부터 확인: 삭제 규칙을 새로 켤 때는 "지금 바로 지워질 개수"를 먼저 보고한다.
- **[2026-09-30] 운영자 `GEMINI_API_KEY` 폴백으로 키 없는 회원의 생성 비용이 운영자에게 청구** — 폴백 코드·환경변수 삭제, 본인 키 없으면 `API_KEY_REQUIRED` 안내.
- **[2026-10-01 · ai-auto-blog v1.32, 티스토리 복제 중 발견(cloud)] BLOG의 `blog_*` 테이블이 "공유 블로그" 정책 그대로 열려 있음 (미수정 — 로컬 확인·승인 필요)**
  - 운영 DB 정책을 읽기 조회(`pg_policies`)로 확인: `blog_posts` SELECT는 `anon` 포함 `using (true)`(공개 키만 있으면 로그인 없이도 모든 글 조회 가능), `blog_categories` insert/update/delete는 로그인한 **모든 회원**이 가능(남의 카테고리 삭제 가능), `blog_post_categories` insert는 `anon` 가능·delete는 모든 회원, `blog_comments`/`blog_likes` insert는 `anon` 가능. 또 `GET /api/posts/[id]`는 인증 없이 서비스 롤로 글을 돌려준다(`ai-auto-blog/app/api/posts/[id]/route.ts`).
  - 원인: 예전 "누구나 읽는 공유 블로그" 설계가 멀티테넌시 원칙 2번(사용자별 격리)으로 바뀌었는데 DB 정책·GET API가 그대로 남음. BLOG 글은 회원 개인 콘텐츠(30일 보관)라 노출 대상이 아니다.
  - 해결(티스토리판): `tistory_*`는 전부 본인만(RLS owner-only) + `(id, user_id)` 복합 외래키 + GET API에 로그인·권한·소유자 확인. 파일 `tistory-auto-blog/supabase/migrations/0001_tistory_init.sql`, `tistory-auto-blog/AGENTS.md`.
  - **BLOG에는 아직 적용 안 함**: 공개 글 보기(`/posts/[id]`가 브라우저 anon 클라이언트로 읽음)·메인 카탈로그 연동 등 영향 범위를 로컬에서 확인한 뒤, 정책 교체 + GET API 인증 추가를 별도 작업(버전 +0.01, 주인님 승인)으로 진행할 것.
  - 다음부터 확인: 새 프로그램 테이블은 만들 때 `pg_policies`로 `using (true)`/`anon`이 남아 있지 않은지 점검하고, 서비스 롤을 쓰는 GET API에도 로그인·소유자 확인이 있는지 본다.

## D. 크롬 확장 · 네이버 자동 입력

- **[2026-10-01 · ai-auto-blog v1.27] 추천 링크가 실제 링크 3개 + 글자 1개로 중복 입력**
  - 원인: 붙여넣기 주입을 `executeScript({allFrames: true})`로 돌려 **여러 겹의 프레임이 같은 편집기에 각각 붙여넣음**, 동시에 돈 확인 로직이 실패로 오판해 글자까지 입력.
  - 해결: 커서가 있는 프레임 하나를 찾아(`document.activeElement`가 그 문서의 편집 영역 + `document.hasFocus()`) `frameIds`로 그 프레임에서만 1번 실행·확인(`ai-auto-blog/extension/sidepanel.js` `findFocusedEditorFrame`).
  - 다음부터 확인: **상태를 바꾸는 주입(붙여넣기·클릭·입력)은 `allFrames` 금지**, 조사·확인만 `allFrames`.
- **[2026-10-01 · ai-auto-blog v1.21~1.22] 한 글자씩 입력한 링크는 글자로만 들어가 링크가 안 걸림**
  - 원인: 키 입력으로는 링크 서식을 못 만들고, "주소 뒤 띄어쓰기 → 네이버 자동 링크"도 걸리지 않았다.
  - 해결: 링크만 있는 줄은 `<a href>` HTML을 `ClipboardEvent('paste')`로 붙여넣기 → 네이버가 실제 링크로 받아줌(주인님 화면 확인).
- **[2026-10-01 · ai-auto-blog v1.20] 두 확장이 같은 자리에 들어간 것처럼 보임**
  - 원인: 아이콘이 없어 둘 다 회색 "A" 아이콘, 같은 사이드패널 사용(크롬은 하나만 표시), 불러온 폴더 설정 실수.
  - 해결: 전용 아이콘·이름. 확장은 **불러온 폴더 위치로 구분**되므로 확장마다 다른 폴더에서 불러온다.
- **[2026-10-01 · ai-auto-blog v1.27] 웹용 이미지 설명("📷 … 고화질 확대")이 네이버 본문에 글자로 입력됨** — 편집기(Tiptap) 저장 글은 설명이 별도 문단으로 남는다. 변환기에서 제외.
- **[2026-10-01 · ai-auto-blog v1.28] 태그 추천에서 "투자협의"가 "투자협"으로 잘림**
  - 원인: 단어 끝 한 글자가 조사(의·로·도 등)처럼 보이면 무조건 떼는 규칙(SEO 스튜디오 확장 v1.57 `normalizeTagCandidate`도 같음).
  - 해결: 해시태그는 본문에 그대로 있으면 유지 → 조사 뗀 말이 본문에 있으면 그 말 → 그 밖엔 확실한 조사만 뗀다(`ai-auto-blog/extension/sidepanel.js` `resolveHashtag`).
  - 다음부터 확인: 한국어 단어 처리 규칙은 실제 회원 글 여러 개로 결과를 찍어 보고 확정한다. SEO 스튜디오 쪽은 Codex가 맞출 것.
  - 후속(같은 날 v1.29): 주인님 지시로 BLOG도 SEO v1.59 코드를 그대로 쓰게 되어 위 보완은 빠졌다. SEO v1.59는 조사 목록 방식으로 바뀌었지만 "투자협의"→"투자협"은 여전히 남는다(해시태그를 그대로 살리는 규칙인데 조사 제거가 먼저 적용됨) — SEO 쪽에서 고치면 BLOG도 복사해 맞춘다.
- **[2026-10-01] SEO 스튜디오 확장 타이핑 간격(24~52ms)이 §20 기준(70~170ms)보다 빠름** — Codex 담당 폴더라 미수정, 담당 CLI가 맞출 것.
- **[2026-10-01 · naver-blog-seo-studio v1.59] 한글 조사·문장부호 처리와 일반어 추출로 추천 태그가 훼손·중복됨**
  - 원인: 문자 클래스 끝 제거는 `메시지`의 `지`, `합니다`의 `다`처럼 조사와 겹치는 일반 글자까지 제거한다. 마침표까지 허용한 토큰은 `있습니다.`가 금칙어 비교를 우회했고, 이미 구체 태그가 있어도 `서울`·`여행` 같은 구성 단어와 `시간`·`여행지` 같은 일반어가 다시 추가됐다.
  - 해결: 실제 조사 접미사를 긴 순서로 한 번만 제거하고 문장부호를 먼저 정리했다. 주제·핵심 키워드는 보존하되 본문에서 새로 뽑은 일반어·서술어와, 이미 있는 구체 태그에 포함된 단어를 제외했다(`naver-blog-seo-studio/extension/sidepanel.js`). 두 사용자 화면 사례 회귀 테스트를 추가했다.
  - 다음부터 확인: 한국어 형태를 정규식 문자 집합으로 자르지 말고 완전한 접미사 단위로 다루며, 추천 결과에는 실제 사용자 화면 사례의 불필요 후보와 구체 태그의 구성 단어가 다시 나타나지 않는지 테스트한다.
- **확장 배포 규칙**: 프로그램 버전 = 확장 `version_name` = ZIP 버전. `ai-auto-blog`는 `prebuild`로 자동 동기화(`PLATFORM_PATTERNS` §28). 압축해제 확장은 스스로 업데이트되지 않으니 회원 안내 필수.

## E. 터미널 · 도구 (Windows + Git Bash)

- **[2026-10-01] `curl "$B/경로"`가 엉뚱한 주소로 요청** — Git Bash가 `/`로 시작하는 인자를 Windows 경로로 바꾼다. `export MSYS_NO_PATHCONV=1`을 먼저.
- **[2026-10-01] `node -e "…"` 안에 백틱(`)이 든 긴 글을 넣었더니 bash가 백틱 내용을 명령으로 실행**
  - 해결: 실제 피해는 없었지만, 긴 글·문서 수정은 **스크립트 파일(.js)로 따로 써서 실행**하거나 Edit 도구를 쓴다.
- **[2026-10-01] 문자열 치환이 "찾을 수 없음"으로 실패** — 파일이 CRLF 줄바꿈. 치환 스크립트는 `\r\n`→`\n`으로 바꿔 비교한 뒤 원래 줄바꿈으로 되돌려 저장한다.
- **[2026-10-01] 경로 일괄 치환(`blog/`→`ai-auto-blog/`)이 옛 기록 속 다른 의미의 `blog/page.tsx`까지 바꿈** — 일괄 치환 후 반드시 바뀐 줄을 훑어보고 되돌릴 것은 되돌린다.
- **[2026-10-01] 백그라운드로 넘어간 명령이 나중에 실행돼 파일을 다시 건드림** — 백그라운드 작업이 끝났다는 알림 후 `git status`로 의도치 않은 변경(줄바꿈만 바뀐 것 포함)을 확인하고 되돌린다.
- **[2026-10-01] `server-only`를 import하는 파일은 `tsx`로 바로 실행하면 모듈 없음 오류** — 테스트할 때는 `NODE_PATH`에 빈 `server-only` 모듈을 둔 임시 폴더를 지정한다.

## F. 외부 사이트 연동

- **[2026-09-30] 로컬에서 되던 외부 요청이 Vercel에서 403**(쿠팡 `coupa.ng`) — 클라우드 IP 차단. 외부 사이트를 서버에서 부르는 기능은 미리보기 배포에서 `vercel curl`로 먼저 확인(루트 `AGENTS.md` §10).
- **[2026-09-30] `sharp`가 Vercel 함수에서 실패**(libvips 누락) — 작은 이미지 처리는 순수 JS(`jpeg-js`).
- **[2026-10-01] AI 모델 ID 추측 금지** — 각 공급사 모델 목록 API(무료)로 실제 ID를 확인한 뒤 등록(`docs/AI_MODEL_INTEGRATION_STANDARD.md`). 예: Claude Haiku 4.5는 `claude-haiku-4-5-20251001`.

## G. 독립 앱 빌드

- **[2026-10-01 · tistory-auto-blog v1.01] `pricing_plans` 등록 전 조회가 `created_at` 없음으로 실패**
  - 원인: 다른 테이블 관례를 적용해 `pricing_plans.created_at`으로 정렬을 가정했지만, 이 테이블에는 그 칼럼이 없다.
  - 해결: `information_schema.columns`로 실제 스키마를 확인하고 `sort_order` 기준으로 기본 3단계 요금제를 등록했다.
  - 다음부터 확인: 공용 테이블의 데이터 등록·검증 SQL은 칼럼을 추측하지 말고 먼저 스키마를 조회한다.

- **[2026-10-01 · tistory-auto-blog v1.01] 독립 빌드가 Google Fonts 요청 실패로 중단됨**
  - 원인: 복제한 `app/layout.tsx`가 `next/font/google`의 Inter를 빌드 시 내려받아, 네트워크가 제한된 환경에서 컴파일이 실패했다.
  - 해결: 외부 폰트 import를 제거하고 CSS 시스템 글꼴 토큰으로 전환했다(`tistory-auto-blog/app/layout.tsx`, `app/globals.css`). `npm run build` 통과.
  - 다음부터 확인: 독립 배포 앱은 외부 빌드 시점 리소스에 의존하지 않도록 하고, 복제 직후 해당 폴더에서 단독 빌드를 실행한다.
