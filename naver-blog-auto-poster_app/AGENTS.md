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
