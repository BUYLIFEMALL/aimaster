# naver-blog-auto-poster_app 개발 매뉴얼 (Claude Code / Codex / Gemini 공통 지침)

이 문서는 **네이버 블로그 자동화의 데스크톱 앱(Electron+Playwright)** 을 어떤 AI 코딩
도구로 이어받아도 동일한 방식으로 작업할 수 있도록 정리한 매뉴얼이다. 상세한 변경 이력·
체크리스트·트러블슈팅 원문은 [`README.md`](./README.md)에 있으니 "무엇이 되어있는지"는
README를, "어떻게 작업해야 하는지"는 이 문서를 먼저 읽을 것.

**이 문서보다 먼저 읽어야 하는 것**: 루트 `../CLAUDE.md`(플랫폼 전체 원칙 — Platform-hub
구조, 멀티테넌시 원칙, 커뮤니케이션 규칙)와 `../docs/PLATFORM_PATTERNS.md`(재사용 패턴, 특히
§20 봇 탐지 회피 원칙). 이 문서는 그 원칙들을 **이 서브프로젝트에 실제로 어떻게
적용했는지**의 구체적 사례집이다.

## 0. 같은 제품군의 크롬 확장(웹버전)과의 관계 (가장 먼저 이해할 것)

**코드·문서뿐 아니라 판매(programs 등록)까지 완전히 분리된, 서로 다른 유료 프로그램이다.**

- 2026-09-21에 유지보수 편의를 위해 원래 하나였던 `naver-blog-auto-poster/` 폴더를 이
  `naver-blog-auto-poster_app`(데스크톱 앱)과 `../naver-blog-auto-poster_web/`(크롬 확장)로
  완전히 분리했다. 이후 두 폴더의 코드는 서로 import하지 않고 각자 독립적으로 유지보수한다
  — 애초에 크롬 확장은 `chrome.scripting.executeScript`의 자기완결형 함수 제약 때문에 이
  폴더의 `src/lib/`를 재사용할 수 없어서, 분리 이전에도 이미 로직이 전부 중복 구현돼 있었다
  (자세한 내용은 `../naver-blog-auto-poster_web/AGENTS.md` §7 참고).
- **같은 날 바로 이어서, `programs` 테이블 등록·요금제·기기 연동 토큰
  (`personal_access_tokens.program_slug`)까지 완전히 분리했다.** 이 폴더(데스크톱 앱)는
  `programs.slug = naver-blog-auto-poster`("네이버 블로그 자동화(App)")이고, 크롬
  확장은 `naver-blog-auto-poster-web`("네이버 블로그 자동화(Web)")이라는 완전히
  별도의 유료 프로그램이다 — 요금제도 각자 따로 등록돼 있고, 한쪽을 구매해도 다른 쪽은
  자동으로 이용할 수 없다. 처음엔 "코드만 분리하고 이용권한은 공유"하는 방향이었으나,
  자동화 로직 자체가 서로 다르고(Playwright vs `chrome.scripting`) 앞으로 각자 다른
  속도로 유지보수될 것이라는 이유로 사용자가 완전 별도 프로그램으로 재결정했다(분리
  시점에 활성 구독/토큰이 0건이라 기존 회원 이관 이슈는 없었음,
  `supabase/migrations/0010_split_naver_blog_auto_poster_into_separate_programs.sql`).
  **이 프로그램을 다룰 때 다른 프로그램의 코드를 참고하는 것은 괜찮지만, 이용권한 검증
  로직(`PROGRAM_SLUG` 상수)이나 토큰을 절대 서로 공유하도록 고치지 말 것.**
- 크롬 확장 쪽 개발 매뉴얼은 `../naver-blog-auto-poster_web/AGENTS.md`에 별도로 있다. 웹
  버전을 만질 때는 이 문서가 아니라 그 문서를 먼저 읽을 것.

---

## 1. 프로젝트 한 줄 요약

네이버는 블로그 포스팅 공식 API가 없어서, Electron 데스크톱 앱이 Playwright로 실제
네이버 블로그 글쓰기 화면을 사람처럼 조작해 자동 포스팅을 돕는다. AI 글 생성은 루트
AIMaster 서버가 사용자 본인 API 키로 대신 호출하고, 데스크톱 앱은 결과만 받아 화면에
채워 넣는다. **발행 버튼은 항상 사람이 최종 확인 후 직접 누른다.**

---

## 2. 개발 환경 / 기술 스택

| 구분 | 선택 | 비고 |
|---|---|---|
| 데스크톱 프레임워크 | Electron 31 | `contextIsolation: true`, `nodeIntegration: false` + `preload.js`로 안전하게 IPC 노출 |
| 브라우저 자동화 | `playwright-core` (SDK만, Chromium 미포함) | `channel: "chrome"`로 사용자의 실제 설치된 크롬 재사용 → 앱 용량 절감(~70MB) |
| 패키징 | `electron-builder --win portable` | 설치 없이 실행되는 단일 exe |
| 백엔드(AI 생성·계정 연동) | 루트 AIMaster Next.js 앱(App Router) + Supabase | 데스크톱 앱 자체에는 서버 코드 없음 — 전부 루트 저장소 쪽 |
| DB | Supabase(Postgres), 플랫폼 전체가 공유하는 프로젝트 `esgxyikcnnvmlhygjkth` | 이 서브프로젝트 전용 DB 아님 — 루트 `supabase/migrations/`에 마이그레이션 남김 |
| 배포(웹) | Vercel(`aimaster` 프로젝트, `--scope buylife`) | 루트 AIMaster 앱과 같은 배포 대상 |
| 배포(앱) | GitHub Releases (`BUYLIFEMALL/aimaster` 저장소, public) | Supabase Storage 대신 GitHub Releases 선택 — 저장공간 한도 문제 없음 |

---

## 3. 사용한 도구·플러그인 (MCP / CLI)

- **Supabase MCP** (`mcp__claude_ai_Supabase__*`) — 스키마 조회(`list_tables`), 마이그레이션
  적용(`apply_migration`), 데이터 조회/수정(`execute_sql`)을 대화 중 즉시 실행. 적용 후
  반드시 로컬 `supabase/migrations/*.sql` 파일로도 남겨서 저장소만 봐도 DB 이력을 알 수
  있게 했다(루트 CLAUDE.md 규칙).
- **Vercel CLI** (`vercel deploy --prod --yes --scope buylife`) — 루트 앱 재배포. 이
  저장소의 Vercel 프로젝트는 GitHub과 Git 연동이 안 돼 있는 게 정상(로컬 CLI 업로드 방식).
- **GitHub CLI (`gh`)** — 이번 프로젝트에서 처음 설치·인증(`winget install --id GitHub.cli`
  → `gh auth login`, 브라우저 로그인 방식)해서 `gh release create`로 exe를 GitHub
  Releases에 업로드. 최초 인증은 브라우저 로그인이 필요해 **사용자가 직접** 수행.
  PowerShell에서 공백 있는 경로는 `& "C:\...\gh.exe" ...`처럼 호출 연산자(`&`)가 필요하다는
  것도 실제로 겪은 함정.
- **electron-builder** — 이미 `package.json`에 설정돼 있던 것을 그대로 `npm run dist`로
  실행. 새로 설정할 필요 없었음(프로토타입 1 스캐폴딩 때 이미 준비됨).
- **로컬 스크린샷 폴더(`D:\PDS`)** — 사용자가 실제 화면을 캡처해서 파일명만 언급하면
  (예: "에러.png") 그 폴더에서 찾아 `Read` 도구로 직접 확인하는 방식으로 매 단계를
  검증했다. 이게 이 프로젝트 전체의 핵심 개발 루프였다(§4 참고).
- **`scripts/generate-program-thumbnail.mjs`** (루트 저장소 기존 스크립트 재사용) — 카탈로그
  썸네일을 Gemini로 직접 생성해 Supabase Storage에 업로드.

---

## 4. 핵심 개발 방법론 — "추측하지 말고 실측한다"

이 프로젝트에서 가장 많이 반복된 패턴이자 가장 중요한 교훈이다.

1. **네이버 화면의 실제 DOM 구조를 절대 미리 추측해서 하드코딩하지 않는다.**
   `src/lib/blogEditorInspector.js`라는 전용 "구조 조사" 도구를 만들어서, 사용자가 실제
   화면(제목 입력 후, 발행 설정창을 연 후 등 각 상태마다)에서 버튼 하나만 누르면 현재
   DOM 전체(모든 iframe 포함)를 로컬 JSON 파일로 캡처하게 했다. 그 JSON을 직접 읽어서
   실제 클래스명·구조를 확인한 뒤에만 자동화 코드를 작성했다.
   - 이렇게 해도 두 번 틀렸다(`.se-text-paragraph`가 제목에도 재사용됨, `.se-body`가
     본문 전용이 아니라 제목까지 포함하는 컨테이너였음) — **추측이 아니라 실사용 테스트로
     발견**했고, 그때마다 "조용히 잘못된 값을 쓰지 않고 에러를 던지는" 방어 코드를
     같이 넣어서 다음에 또 틀려도 안전하게 실패하도록 만들었다.
2. **작업 단위는 항상: 기능 하나 구현 → 로컬/원격 빌드 확인 → 커밋 → 푸시 → (필요시) 배포
   → 사용자가 실제 화면에서 테스트 → 결과 스크린샷 확인 → README에 검증 완료 기록.**
   한 번에 여러 기능을 몰아서 만들지 않고, 이 사이클을 기능 단위로 계속 반복했다(제목/
   본문 → 이미지 → 태그 → 카테고리 → 통합 → AI 생성 → 셀프 리뷰 → 이미지 생성 모델 선택
   → 편집 UI → 패키징 → 배포, 순서대로 하나씩).
3. **"발행" 버튼처럼 되돌릴 수 없는 액션은 절대 자동화하지 않는다.** 발행 설정창을 여는
   것까지는 자동화해도 되지 않을지 고민했지만, 사용자가 명시적으로 "사람이 직접 누르는"
   쪽을 선택했다 — 이 선택을 코드 전체에서 일관되게 지켰다(주석으로도 매번 명시).
4. **이 방법론은 실행 방식(Playwright 데스크톱 앱 vs 크롬 확장)과 무관하게 동일하게
   적용된다.** 크롬 확장을 개발할 때도 똑같이 "구조 조사 도구 → 실측 → 함정 발견 → 방어
   코드 추가 → 검증 필드로 재발 방지"를 반복했다 — 실행 환경이 바뀌어도 이 원칙 자체를
   재검토할 필요는 없다(자세한 크롬 확장 사례는 `../naver-blog-auto-poster_web/AGENTS.md`
   참고).

---

## 5. 봇 탐지 회피 원칙 (절대 불변 — 사용자 명시적 지시)

`src/lib/humanInput.js`의 `humanType`/`clickAndType`을 모든 텍스트 입력에 강제한다.

- 값을 `fill()`/`evaluate()`로 한 번에 넣지 않는다 — 반드시 실제 클릭으로 포커스를 옮긴
  뒤 한 글자씩, 무작위 간격(70~170ms, 가끔 250~700ms의 "생각하는 시간")으로 타이핑한다.
- 새 자동 입력 기능을 추가할 때마다 이 두 헬퍼를 재사용한다 — 절대 값 대입 방식으로
  되돌아가지 않는다.
- 네이버 글쓰기 화면에는 상시 로드되는 봇 탐지용 iframe(nCaptcha)이 있다는 것을 실측으로
  확인했다 — 보안 확인 화면이 뜨면 사람이 직접 완료하게 하고, 절대 자동으로 우회하려
  하지 않는다.
- **코드 리뷰 시에도 이 기준을 최우선으로 확인한다**: 새 자동 입력 코드가 이 헬퍼를 거치지
  않고 값을 즉시 채우거나, 클릭 없이 포커스/값을 조작하는 부분이 있으면 반드시 고친다.
- 이 원칙은 플랫폼 전역 규칙으로 격상돼 있다(`docs/PLATFORM_PATTERNS.md` §20) — 크롬 확장
  등 실행 방식이 달라져도 동일하게 적용한다.

---

## 6. 아키텍처 구조

### 6.1 데스크톱 앱 (`naver-blog-auto-poster_app/src/`)

```
main.js          Electron 메인 프로세스. 모든 ipcMain 핸들러(계정 연동, 세션 확인,
                 에디터 구조 분석, 초안 작성, 발행 정보 입력, AI 생성) 여기 모임.
preload.js       contextBridge로 렌더러에 안전하게 노출하는 API 목록.
renderer/        UI(index.html/app.js/styles.css). 순수 script(모듈 아님, 전역 스코프).
lib/
  naverSession.js        네이버 로그인 세션 유지(3단계 판별: 로그인필요/보안확인/로그인됨).
  blogEditorInspector.js DOM 구조 조사 도구(§4 참고).
  humanInput.js          봇 탐지 회피용 타이핑 헬퍼(§5 참고).
  naverBlogAutomation.js 실제 자동 입력 로직(제목/본문/이미지/태그/카테고리, 2단계 통합).
  appConfig.js           로컬 설정(AIMaster 연동 토큰) 저장/조회.
```

### 6.2 루트 저장소 쪽 (AI 생성·계정 연동 — 이 폴더 밖에 있어서 놓치기 쉬움)

```
app/(dashboard)/naver-blog-auto-poster/page.tsx   기기 연동 토큰 발급 UI + 다운로드 버튼
app/(dashboard)/naver-blog-auto-poster/TokenManager.tsx
app/api/naver-blog-auto-poster/whoami/route.ts    토큰 검증 + 이용 권한 확인
app/api/naver-blog-auto-poster/generate/route.ts  AI 초안+이미지 생성
lib/personalAccessTokenAuth.ts   토큰 해시 검증 + checkProgramAccess 통합 헬퍼(범용)
lib/apiKeys.ts                   resolveApiKey()(루트에 없어서 새로 추가, 서브프로젝트 패턴과 동일)
lib/naverBlogAutoPoster/
  generate.ts        1차 초안 + 2차 셀프 리뷰(OpenAI 직접 fetch)
  generateImage.ts    Gemini(나노바나나) 이미지 생성
  nanoBananaConfig.ts blog 서브프로젝트와 동일한 모델별(해상도/버전) 설정
supabase/migrations/0007~0009_*.sql   프로그램 등록/토큰 테이블/공개 판매 전환
supabase/migrations/0010_*.sql         PC 앱/크롬 확장 완전 별도 유료 프로그램으로 분리
```

**2026-09-22부터 크롬 확장은 이 API를 호출하지 않는다** — 완전 별도 프로그램으로
분리되면서 `app/api/naver-blog-auto-poster-web/{whoami,generate}/route.ts`라는 자기
전용 라우트가 새로 생겼다(`PROGRAM_SLUG`만 다르고 `lib/naverBlogAutoPoster/*` AI 생성
로직만 계속 공유). 이 페이지/API 자체를 고쳐도 크롬 확장에는 영향이 없다 — 반대로
`lib/naverBlogAutoPoster/*`를 고치면 양쪽 모두에 영향이 있으니 그 파일들만 공용
자산으로 취급할 것.

### 6.3 데스크톱 앱 ↔ 루트 서버 통신

데스크톱 앱은 자체 백엔드가 없다. `AIMASTER_BASE_URL`(반드시 `https://www.buylife.xyz` —
§7 참고)로 루트 앱의 API를 `Authorization: Bearer <personal access token>` 헤더로 호출한다.
이 토큰은 `personal_access_tokens` 테이블 기반이며, 향후 다른 데스크톱 앱도
`program_slug`만 바꿔서 그대로 재사용 가능한 범용 설계다.

---

## 7. 실제로 겪은 함정 (같은 실수 반복 방지용 요약 — 원문은 README 참고)

1. **네이버 "로그인 상태 유지" 체크박스 미체크** → 세션이 브라우저 종료 시 삭제됨.
2. **`.se-text-paragraph`/`.se-body` 셀렉터가 제목과 겹침** → §4 참고, 실측으로 재조사.
3. **`buylife.xyz`(www 없음) 호출 시 307 리다이렉트로 `Authorization` 헤더 소실** —
   fetch가 리다이렉트를 따라가면서 다른 하위 도메인 이동으로 판단해 인증 헤더를 자동
   제거함. 서버 간 호출 주소는 항상 최종 도메인(`www.buylife.xyz`)을 정확히 쓸 것.
4. **`.vercelignore` 누락으로 루트 앱 배포 실패** — Electron 앱의 `runtime/`(실행 중인
   브라우저 프로필, 잠긴 파일)까지 Vercel CLI가 스캔하다 `EBUSY` 발생. 독립 실행형
   서브프로젝트를 추가하면 항상 `.vercelignore`에 등록할 것(2026-09-21 폴더 분리 후
   경로가 `naver-blog-auto-poster_app/runtime`으로 갱신됨).
5. **AI 이미지 생성 프롬프트에 "no visible text"만으로는 부족** — 실제로 화면 UI를
   묘사하면서 "Publish" 같은 버튼 라벨을 언급하면 Gemini가 그 글자를 그대로 렌더링한다.
   추상적으로("illegible placeholder lines") 묘사해야 확실히 텍스트 없이 나온다.
6. **PowerShell에서 공백 있는 경로 실행** — `"C:\Program Files\..."`만 입력하면 실행이
   안 되고, 반드시 `& "C:\Program Files\..."`처럼 호출 연산자가 필요하다.
7. **패키지된 앱(exe)은 개발 모드(`npm start`)와 저장 위치가 다르다** — `app.isPackaged`
   여부로 `runtime/` 경로가 프로젝트 폴더 안(개발) ↔ `userData` 폴더(패키지 후)로
   갈리므로, 패키지 버전에서는 계정 연동·로그인을 새로 해야 하는 게 정상 동작이다.

크롬 확장에서만 발생하는 함정(탭/윈도우 포커스, 동적 iframe, 카테고리 클릭, 클립보드 이미지
등)은 `../naver-blog-auto-poster_web/AGENTS.md` §8에 따로 정리돼 있다.

---

## 8. 공개 판매 전환 시 지킨 절차 (다음에 다른 프로그램에도 참고)

1. `programs.is_active = true` 전환 + 카탈로그 문구(`short_desc`/`description`/`app_url`)
   현행화 + 썸네일 생성(§13 스타일 고정 템플릿, "photorealistic" 등 4개 키워드 필수,
   텍스트/로고 없이).
2. **로그인만 확인하던 모든 지점을 실제 이용 권한 확인으로 교체** — 페이지는
   `checkProgramAccess()`, API route는 토큰 검증과 이용 권한 확인을 합친 전용 헬퍼로.
   이 교체를 빠뜨리면 "로그인한 비구독자가 무료로 쓸 수 있는" 구멍이 생긴다(CLAUDE.md
   멀티테넌시 원칙 1번 — 이 저장소에서 가장 자주 반복된 실수).
3. 빌드 확인 → 커밋 → 푸시 → 배포 → 실제 카탈로그 페이지에서 노출 확인.
4. **크롬 확장(`naver-blog-auto-poster-web`)은 완전히 별도 프로그램이라 이 절차를 각자
   따로 수행해야 한다** — 카탈로그 문구/썸네일/요금제 모두 별도이고(2026-09-21 분리),
   확장 자체의 배포(zip+GitHub Releases)는 `../naver-blog-auto-poster_web/AGENTS.md` §10을
   따른다.

---

## 9. 다음 단계 (미착수)

1. **티스토리 블로그 자동화** — 사용자가 네이버 작업 완료 후 진행하기로 결정. 이 문서의
   방법론(§4 실측 원칙, §5 봇 탐지 회피)을 거의 그대로 재사용할 수 있을 것으로 예상 —
   새로 시작할 때 이 문서 전체를 먼저 참고할 것.
2. 크롬 확장 쪽 다음 단계(Chrome 웹스토어 정식 심사 제출 등)는
   `../naver-blog-auto-poster_web/AGENTS.md` §13 참고.
3. 그 외 이 매뉴얼의 원칙(사람이 발행 버튼 클릭, 봇 탐지 회피, 실측 후 자동화, 기능 단위
   검증 루프)은 어떤 새 자동화 기능을 추가하든 예외 없이 동일하게 적용할 것.

## 2026-10-09 — 설치 파일 다운로드 주소 이전 (프로그램 v1.02)
- 저장소 비공개 전환에 대비해 설치 파일 다운로드를 GitHub 릴리스에서 루트 사이트로 옮겼다: `app/(dashboard)/naver-blog-auto-poster/page.tsx`의 `DESKTOP_DOWNLOAD_URL` = `/downloads/AIMaster-Naver-Blog-Auto-Poster-0.1.0.exe`. 파일은 루트 `public/downloads/`에 두며 용량(약 69MB) 때문에 git에는 넣지 않는다(`.gitignore`) — 루트를 배포하는 PC에 있어야 한다. 새 설치 파일을 만들면 이 위치에 같은 파일명으로 덮어쓰고 루트를 배포한다(`gh release` 업로드는 더 이상 쓰지 않음).

## v1.03 (2026-10-15) — 웹 화면·API를 메인 사이트에서 독립 서브프로젝트로 분리 (Claude Code 보조 계정)
- 주인님 지시("모든 프로그램은 AIMaster 안의 서브프로젝트로, AIMaster는 프로그램에 들어가는 홈페이지"): 메인 사이트 `app/(dashboard)/naver-blog-auto-poster`(연동 토큰 화면)·`app/api/naver-blog-auto-poster`(whoami·generate)를 이 폴더 **`web/` 독립 Next 앱**으로 옮김(git mv). Vercel 프로젝트 `naver-blog-auto-poster`, 주소 **https://naver-blog-auto-poster.buylife.xyz**(`/`→`/naver-blog-auto-poster`), `programs.app_url` 갱신, 버전 표시 `web/lib/version.ts`(v1.03).
- 메인 사이트 공용 파일을 같은 경로로 복사(`lib/supabase/*`, `lib/access/checkProgramAccess.ts`, `lib/actions/personalAccessTokens.ts`, `lib/personalAccessTokenAuth.ts`, `lib/apiKeys.ts`, `lib/naverBlogAutoPoster/*`, `components/ui/*`, globals.css·tailwind) — 규칙을 바꾸면 루트·다른 사본과 함께 고칠 것. 루트에서는 이 프로그램만 쓰던 사본을 삭제. 화면은 메인 사이트 dashboard에서 보이던 어두운 화면 그대로(흰색 표준·사이드바 적용은 후속).
- **옛 주소 유지**: 메인 `next.config.mjs`가 `www.buylife.xyz/naver-blog-auto-poster` → 새 주소 리다이렉트, `www.buylife.xyz/api/naver-blog-auto-poster/*` → 새 앱 **프록시** — 이미 설치된 데스크톱 앱(`src/main.js`의 www 주소)은 바꾸지 않아도 된다. 다운로드 파일은 계속 메인 사이트 `public/downloads`.
- 환경변수: 공용 DB 3종(`scripts/add-naver-blog-auto-poster-vercel-env.mjs`). 배포: `vercel deploy --cwd D:/Antigravity/AIMaster/naver-blog-auto-poster_app/web --prod --yes --scope buylife`.
- 검수: 빌드(타입 포함), 새 주소 비로그인 → 메인 로그인(돌아올 주소 포함), API 비로그인 401, 옛 www 주소 리다이렉트·API 프록시 확인. **미확인**: 로그인 상태 화면 — 이 프로그램은 비공개(`is_active=false`)이고 시험 계정에 권한이 없어 관리자 계정으로만 열림.

## v1.04 (2026-10-15) — 연동 화면을 흰색 표준 + 좌측 메뉴로 (B6, Claude Code 보조 계정)
- 메인 사이트에서 옮겨 온 어두운 화면을 흰색 표준으로: `app/globals.css` 끝에 흰색 덮어쓰기(카드·버튼·입력), 화면 글자색을 밝은 화면용으로 바꿈(`page.tsx`·`TokenManager.tsx`·`GuideLinkButton.tsx`). 브랜드색은 초록(emerald).
- 좌측 메뉴 `web/components/Sidebar.tsx`(docs/SIDEBAR_LAYOUT_STANDARD.md): 프로그램명·버전 → 다른 프로그램 보기 → 작업 흐름 1 다운로드·2 사용 방법·3 기기 연동 토큰(같은 페이지 구역 #download·#howto·#tokens) → API키등록·플랫폼연동(메인 /api-settings)·연동 매뉴얼(#guides) → 계정·로그아웃(마지막 메뉴 바로 아래). 767px 이하 위쪽 ☰ 메뉴. 레이아웃의 어두운 위쪽 줄은 메뉴로 옮겨 제거.
- 로그아웃: `web/app/api/auth/logout/route.ts`(four-cut-comics와 같은 방식, 같은 출처만) → 메인 로그인으로 이동.
- 검수: tsc·빌드, 배포 후 비로그인 307(메인 로그인), 로그아웃 API 다른 출처 403, 옛 www API 주소 401(전달 유지). **화면**: 비공개 프로그램이라 시험 계정으로는 열 수 없어, 로컬 개발 서버에 로그인 확인만 뺀 임시 미리보기(커밋 안 함, 확인 후 삭제)로 엣지에서 확인 — 흰 배경·흰 카드·좌측 메뉴·계정 위치, 메뉴 클릭 시 구역 이동, 400px에서 좌측 메뉴 숨김·☰ 메뉴 같은 순서·본문 전체 폭·가로 넘침 0. **운영 로그인 화면은 관리자 계정(메인 크롬)으로 주인님 확인 필요.**


## 2026-10-16 DB 연동 변수 호환 — v1.05 (naver-blog-auto-poster)

작업 전 [최상위 데이터베이스 연동 지침](../docs/DATABASE_CONNECTION_POLICY.md)과 [전체 전환 인수인계](../docs/DATABASE_CONNECTION_HANDOFF.md)를 먼저 읽습니다. 공개 키는 새 PUBLISHABLE 이름 우선·기존 ANON 이름 호환, 서버 키는 새 SECRET 이름 우선·기존 SERVICE_ROLE 이름 호환입니다. 새 값 없음/공백일 때만 같은 종류의 기존 값을 사용하며, 인증 실패 후 다른 키로 재시도하지 않습니다. 기존 변수·실제 키·회원 권한·Cron은 유지합니다. 배포·회원 검수 결과는 전체 인수인계의 프로그램별 기록에서 확인합니다. 기존 변수 삭제와 실제 키 폐기는 별개이며 안정화 확인 전 삭제하지 않습니다.

## v1.06 (2026-10-17) 이미지 모델 최신 교체 — Claude Code(윈도우)
- `web/lib/naverBlogAutoPoster/nanoBananaConfig.ts` : 구형(gemini-2.5-flash-image·gemini-3.1-flash-image·*-preview·Imagen) → 최신 정식(`gemini-nano-banana-2.1`·`gemini-3-pro-image`), 주소 v1beta (기준: ai-image-studio v1.11 `lib/providers/adapters/gemini.ts`).
- 실제 이미지 생성 시험은 하지 않았습니다 — 이미지 생성 오류가 나면 그때 테스트 검증합니다(주인님 지시).

## 2026-10-17 v1.07 — 이미지 생성 호출을 공용 기준 코드 `gemini-image-client`로 (1단계, Claude Code 윈도우)
- `web/lib/naverBlogAutoPoster/geminiImage.ts`(사본) 추가, `generateImage.ts` `generateBlogImage()`가 모듈로 위임. **버그 수정**: 예전엔 응답의 첫 조각(parts[0])만 봐서 설명 글이 먼저 오면 이미지를 놓쳤다.
- 개선: 키를 주소 대신 요청 머리글(`x-goog-api-key`)로, 120초 시간 제한, 서버 오류·일시 혼잡·시간 초과만 1회 재시도, 응답의 모든 조각에서 이미지 탐색, 안전 필터 차단·이미지 없음·한도·키 오류 한국어 안내, 키 가리기. 프롬프트·모델·화질·비율·생성 온도는 그대로.
- 검수: tsc·eslint 0, build, 배포·DB v1.07. 관리자 전용 비공개 프로그램이라 시험 계정(일반 회원)으로는 화면에 들어갈 수 없어 화면 버전은 확인하지 못함(접근 거부 시 소개 페이지로 이동하는 기존 동작). 실제 이미지 생성 시험은 하지 않음 — 이미지 생성 오류가 나면 그때 테스트 검증(주인님 지시).
- **주의(다음 CLI)**: `geminiImage.ts`는 공용 기준 코드 `gemini-image-client`의 사본이다(기준: `ai-image-studio/lib/providers/geminiImage.ts`). 직접 고치지 않는다. 기준을 고친 뒤 `node scripts/check-shared-modules.mjs --sync` → 사본을 쓰는 프로그램 모두 테스트·빌드·배포·버전 +0.01. 프롬프트·모델·화질·온도는 각 프로그램 값을 넘기는 구조라 모듈에서 바꾸지 않는다. 지도: 루트 `docs/SHARED_FEATURE_MAP.md` §3.

## 2026-10-17 v1.08 — 이미지 생성 모델 목록 통합(공용 기준 코드 `gemini-image-models`) (Claude Code 윈도우)
- 주인님 지시("이미지 생성 모델 사용 관련 기능은 통합, 프로그램마다 다르게 나와야 하면 그때 프로그램별로 보완"). `web/lib/naverBlogAutoPoster/nanoBananaConfig.ts`를 공용 모델 목록 사본으로 교체.
- 통합 값(ai-image-studio v1.11 검증값):

| 등급 | 모델 | 기본 화질 | 온도 |
|---|---|---|---|
| nanobanana (1K 경량) | gemini-3.1-flash-lite-image | 1K | 0.7 |
| nanobanana-2-2k | gemini-nano-banana-2.1 | 2K | 0.7 |
| nanobanana-2-4k | gemini-nano-banana-2.1 | 4K | 0.7 |
| nanobanana-pro | gemini-3-pro-image | 4K | 0.4 |

- 이 프로그램에서 바뀐 값: 1K 등급 → `gemini-3.1-flash-lite-image`, Pro 온도 0.7 → 0.4.
- 호환: 불러오는 이름(`getNanoBananaConfig`·`NanoBananaModelType`·`NANO_BANANA_MODEL_OPTIONS`)·등급 키·옛 등급 이름(`nanobanana-2` → 기본 2K)은 그대로라 저장된 회원 선택값도 그대로 동작. 타입 검사·기존 테스트·빌드·배포·DB 버전 확인. 실제 이미지 생성 시험은 하지 않음 — 오류가 나면 그때 검증(주인님 지시).
- **주의(다음 CLI)**: 모델 설정 파일은 공용 기준 코드 `gemini-image-models`의 사본이다(기준: `ai-image-studio/lib/providers/nanoBananaModels.ts`). 직접 고치지 않는다. 이 프로그램만 결과를 다르게 해야 하면 `getNanoBananaConfig()` 결과를 호출하는 쪽에서 덮어써 보완한다(주인님 지시). 지도: 루트 `docs/SHARED_FEATURE_MAP.md` §3.

## 2026-10-17 v1.09 — 공용 이미지 기준 코드 갱신 반영 (Claude Code 윈도우)
- 기준 `gemini-image-client`(ai-image-studio)이 바뀌어 사본을 `--sync`로 다시 받음: ① 응답에서 **최종** 이미지를 고름 — gemini-3-pro-image가 함께 보내는 중간 초안(`thought: true`) 이미지를 결과로 잘못 쓰던 위험 제거 ② 사용량(usageMetadata) 함께 반환 ③ 선택적 요청 취소 신호(`signal`) 지원(쓰지 않으면 동작 같음). 이 프로그램 코드·프롬프트는 바꾸지 않음.
- 검수: tsc 0, Vercel 프로덕션 배포(Ready)·DB 버전. 크롬 화면 버전은 확인 못 함 — 프로그램이 비공개(`is_active=false`)이고 검수 크롬 계정에 권한이 없어 `checkProgramAccess` 거부 → 메인 `/programs/<slug>`로 이동, 비공개라 404(기존 동작). 실제 이미지 생성 시험은 하지 않음(주인님 지시).

## 2026-10-17 v1.10 — 이미지 생성 시간 초과 안내 문구 통일 (Claude Code 윈도우)
- 공용 기준 `gemini-image-client`(ai-image-studio)의 시간 초과 안내를 「이미지 생성이 N초 안에 끝나지 않았습니다. 이미지가 이미 만들어졌을 수 있으니 잠시 뒤 결과를 확인한 다음 다시 시도해 주세요.」로 바꿔 사본을 `--sync`로 다시 받음. 시간 초과여도 구글 쪽에서는 이미지가 만들어져 회원 키에 요금이 나갔을 수 있어, 바로 다시 눌러 이중 과금되는 일을 줄이려는 목적이다. 프롬프트·모델·화질·시간 제한 값은 그대로.
- 검수: 기준 테스트 8개 통과(문구 확인 추가), `check-shared-modules` 전부 OK, Vercel 프로덕션 배포·DB 버전, 크롬 화면 버전. 실제 이미지 생성 시험은 하지 않음(비용).

## 2026-10-18 v1.11 — 이미지 시간 초과 자동 재시도 중단(이중 과금 방지) (Claude Code 윈도우)
- 공용 기준 `gemini-image-client`(ai-image-studio)이 **시간 초과(TIMEOUT)는 자동으로 다시 보내지 않도록** 바뀌어 사본을 `--sync`로 다시 받음. 시간 초과여도 구글 쪽에서는 이미지가 만들어져 회원 키에 요금이 나갔을 수 있어, 자동 재시도가 이중 과금의 원인이 될 수 있었다. 서버 오류·혼잡(429)·연결 실패는 그대로 1회 재시도. 프롬프트·모델·화질·시간 제한 값·안내 문구는 그대로이고, 시간 초과 안내가 재시도 대기 없이 더 빨리 뜬다.
- 검수: 기준 테스트 8개 통과(시간 초과 1회 요청·연결 실패 2회 요청 확인), `check-shared-modules` 전부 OK, Vercel 프로덕션 배포·DB 버전, 크롬 화면 버전. 실제 이미지 생성 시험은 하지 않음(비용).

## 2026-10-18 v1.12 — 이미지 시간 초과 안내를 「Google 사용량 확인」으로 정정 (Claude Code 윈도우)
- 공용 기준 `gemini-image-client`(ai-image-studio)의 시간 초과 안내를 정정해 사본을 `--sync`로 다시 받음: 「…결과를 받지 못했습니다. 구글 쪽에서는 이미 생성되어 요금이 나갔을 수 있으니, 바로 다시 누르기 전에 Google AI Studio 사용량(https://aistudio.google.com/usage)을 확인해 주세요.」 이전 문구 「잠시 뒤 결과를 확인」은 틀린 안내였다 — 시간 초과는 우리 서버가 요청을 끊는 것이라 이미지가 프로그램(보관함 등)에 저장되지 않고, 회원이 확인할 수 있는 것은 본인 Google 사용량(요금)뿐이다.
- 검수: 기준 테스트 8개 통과(사용량 주소 포함 확인), `check-shared-modules` 전부 OK, Vercel 프로덕션 배포·DB 버전, 크롬 화면 버전. 실제 이미지 생성 시험은 하지 않음(비용).

<!-- DETAILED_PROGRAM_REVIEW_20261019 -->
## 2026-10-19 Codex — 프로그램별 상세 개선 분석(구현 아님)

[세부 개선안·필요 이유·근거·시험 조건](docs/DETAILED_REVIEW_20261019.md) · [전체 83개 분석](../docs/program-reviews-20261019/INDEX.md) · [공통 아이디어 표](../docs/PROGRAM_IDEA_BACKLOG.md). 이 프로그램 3개 검토 항목입니다. 코드·DB·환경변수·배포는 바꾸지 않았습니다. 작업 전 최신 개선 원장·ACTIVE_WORK와 대조하고 이미 해결된 기능은 보존합니다. 후속 작업 후 처리 ID·증거·미완료·새 인사이트·프로그램 링크를 기록합니다.
<!-- /DETAILED_PROGRAM_REVIEW_20261019 -->
