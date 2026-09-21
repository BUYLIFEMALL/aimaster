# naver-blog-auto-poster 개발 매뉴얼 (Claude Code / Codex / Gemini 공통 지침)

이 문서는 이 서브프로젝트를 **어떤 AI 코딩 도구로 이어받아도 동일한 방식으로 작업**할 수
있도록, 지금까지의 작업 과정·개발 기법·사용 도구를 정리한 매뉴얼이다. 상세한 변경 이력·
체크리스트·트러블슈팅 원문은 [`README.md`](./README.md)에 있으니 "무엇이 되어있는지"는
README를, "어떻게 작업해야 하는지"는 이 문서를 먼저 읽을 것.

**이 문서보다 먼저 읽어야 하는 것**: 루트 `../CLAUDE.md`(플랫폼 전체 원칙 — Platform-hub
구조, 멀티테넌시 원칙, 커뮤니케이션 규칙)와 `../docs/PLATFORM_PATTERNS.md`(재사용 패턴).
이 문서는 그 원칙들을 **이 서브프로젝트에 실제로 어떻게 적용했는지**의 구체적 사례집이다.

---

## 1. 프로젝트 한 줄 요약

네이버는 블로그 포스팅 공식 API가 없어서, **Electron 데스크톱 앱(Playwright)**이나
**크롬 확장(Manifest V3, `chrome.scripting`)** 둘 중 하나로 실제 네이버 블로그 글쓰기
화면을 사람처럼 조작해 자동 포스팅을 돕는다. 두 방식 모두 동작 원리(사람처럼 클릭+
타이핑, 실측 기반 셀렉터, 발행은 사람이 직접)는 동일하고, 실행 주체만 다르다(독립
프로세스 vs 브라우저 확장). AI 글 생성은 루트 AIMaster 서버가 사용자 본인 API 키로
대신 호출하고, 앱/확장은 결과만 받아 화면에 채워 넣는다. **발행 버튼은 항상 사람이
최종 확인 후 직접 누른다.** 2026-09-20~21에 데스크톱 앱(1단계)과 크롬 확장(2단계)
둘 다 완성·검증되고 공개 판매로 전환됐다.

---

## 2. 개발 환경 / 기술 스택

| 구분 | 선택 | 비고 |
|---|---|---|
| 데스크톱 프레임워크 | Electron 31 | `contextIsolation: true`, `nodeIntegration: false` + `preload.js`로 안전하게 IPC 노출 |
| 브라우저 자동화(데스크톱) | `playwright-core` (SDK만, Chromium 미포함) | `channel: "chrome"`로 사용자의 실제 설치된 크롬 재사용 → 앱 용량 절감(~70MB) |
| 패키징(데스크톱) | `electron-builder --win portable` | 설치 없이 실행되는 단일 exe |
| 브라우저 자동화(웹버전) | Chrome Extension **Manifest V3** | `sidePanel`+`storage`+`scripting`+`clipboardWrite` 권한, `host_permissions`로 `*.naver.com`/`www.buylife.xyz`만 허용. Playwright 없이 `chrome.scripting.executeScript`로 활성 탭에 직접 스크립트 주입 |
| 패키징(웹버전) | PowerShell `Compress-Archive` → zip | `zip` CLI가 이 Windows 환경 git-bash에 없어서 PowerShell 명령으로 압축. Chrome 웹스토어 미등록 상태라 "압축해제된 확장 프로그램" 개발자 모드 설치 방식으로 배포(§8.5 참고) |
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
- **Chrome Web Store Developer Dashboard** (`chrome.google.com/webstore/devconsole`) — 개발자
  계정 등록 완료(2026-09-21, $5 일회성 등록비 — 계정당 한 번만 내면 되고 확장 개수와
  무관, 단 업데이트마다 재심사는 필요). **사용자의 명시적 결정**: 계정만 만들어두고,
  당장은 정식 스토어 심사를 넣지 않고 "압축해제된 확장 프로그램" 방식으로 계속
  개발·배포하다가 기능이 어느 정도 안정화되면 그때 심사를 제출하기로 함.
- `chrome://extensions`(개발자 모드) — 확장 로드/새로고침/에러 확인에 사용. 코드 수정 후
  반드시 이 페이지에서 새로고침(순환 화살표) 버튼을 눌러야 반영된다는 것도 실측으로 확인.
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
   적용된다.** 크롬 확장을 새로 개발할 때도 똑같이 "구조 조사 도구 → 실측 → 함정 발견 →
   방어 코드 추가 → 검증 필드로 재발 방지"를 반복했다(§8 참고) — 실행 환경이 바뀌어도
   이 원칙 자체를 재검토할 필요는 없다.

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

---

## 6. 아키텍처 구조

### 6.1 데스크톱 앱 (`naver-blog-auto-poster/src/`)

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
```

### 6.3 데스크톱 앱 ↔ 루트 서버 통신

데스크톱 앱은 자체 백엔드가 없다. `AIMASTER_BASE_URL`(반드시 `https://www.buylife.xyz` —
§7 참고)로 루트 앱의 API를 `Authorization: Bearer <personal access token>` 헤더로 호출한다.
이 토큰은 `personal_access_tokens` 테이블 기반이며, 향후 다른 데스크톱 앱도
`program_slug`만 바꿔서 그대로 재사용 가능한 범용 설계다.

### 6.4 크롬 확장 (`naver-blog-auto-poster/extension/`)

```
manifest.json    Manifest V3. permissions: ["sidePanel","storage","scripting","clipboardWrite"]
                 host_permissions: ["https://*.naver.com/*","https://www.buylife.xyz/*"]
background.js    서비스 워커. chrome.sidePanel.setPanelBehavior({openPanelOnActionClick:true})
                 딱 한 줄 — 확장 아이콘 클릭 시 사이드패널이 열리게 하는 것 외에 하는 일 없음.
sidepanel.html   UI 전체(계정 연동, AI 초안 생성, 1단계 자동입력, 2단계 발행정보,
                 관리자 전용 구조 분석 섹션).
sidepanel.js     핵심 로직 전부(토큰 저장/검증, executeScript 호출, UI 이벤트 바인딩).
styles.css       흰색 배경 테마(§8.4 참고).
설치방법.txt      zip 배포용 동봉 설치 안내(개발자 모드로 로드하는 방법).
```

데스크톱 앱과 동일하게 자체 백엔드가 없고, 같은 `personal_access_tokens`/`whoami`/
`generate` API를 그대로 재사용한다(토큰만 `chrome.storage.local`에 저장하는 점이 다름).
자세한 내부 구현 제약과 버그 사례는 §8을 볼 것.

---

## 7. 실제로 겪은 함정 (같은 실수 반복 방지용 요약 — 원문은 README 참고)

1. **네이버 "로그인 상태 유지" 체크박스 미체크** → 세션이 브라우저 종료 시 삭제됨.
2. **`.se-text-paragraph`/`.se-body` 셀렉터가 제목과 겹침** → §4 참고, 실측으로 재조사.
3. **`buylife.xyz`(www 없음) 호출 시 307 리다이렉트로 `Authorization` 헤더 소실** —
   fetch가 리다이렉트를 따라가면서 다른 하위 도메인 이동으로 판단해 인증 헤더를 자동
   제거함. 서버 간 호출 주소는 항상 최종 도메인(`www.buylife.xyz`)을 정확히 쓸 것.
4. **`.vercelignore` 누락으로 루트 앱 배포 실패** — Electron 앱의 `runtime/`(실행 중인
   브라우저 프로필, 잠긴 파일)까지 Vercel CLI가 스캔하다 `EBUSY` 발생. 독립 실행형
   서브프로젝트를 추가하면 항상 `.vercelignore`에 등록할 것.
5. **AI 이미지 생성 프롬프트에 "no visible text"만으로는 부족** — 실제로 화면 UI를
   묘사하면서 "Publish" 같은 버튼 라벨을 언급하면 Gemini가 그 글자를 그대로 렌더링한다.
   추상적으로("illegible placeholder lines") 묘사해야 확실히 텍스트 없이 나온다.
6. **PowerShell에서 공백 있는 경로 실행** — `"C:\Program Files\..."`만 입력하면 실행이
   안 되고, 반드시 `& "C:\Program Files\..."`처럼 호출 연산자가 필요하다.
7. **패키지된 앱(exe)은 개발 모드(`npm start`)와 저장 위치가 다르다** — `app.isPackaged`
   여부로 `runtime/` 경로가 프로젝트 폴더 안(개발) ↔ `userData` 폴더(패키지 후)로
   갈리므로, 패키지 버전에서는 계정 연동·로그인을 새로 해야 하는 게 정상 동작이다.
8. **(크롬 확장) `chrome.tabs.query({active:true, currentWindow:true})`가 엉뚱한 탭을
   잡는다** — 사이드패널 자체가 별도 창에 떠 있으면 "현재 창의 활성 탭"이 확장 관리
   페이지(`chrome://extensions`)가 될 수 있다. `url: "https://blog.naver.com/*"`로
   모든 창을 검색하는 방식으로 바꿔야 한다(§8.2 참고).
9. **(크롬 확장) 대상 탭/창이 OS 포커스를 갖고 있지 않으면 `execCommand`가 조용히
   무시된다** — 에러 없이 끝나지만 실제로는 아무것도 입력되지 않는다. 반드시
   `chrome.windows.update({focused:true})` + `chrome.tabs.update({active:true})` 후 약간
   대기(200ms)하고 나서 스크립트를 주입해야 한다.
10. **(크롬 확장) 네이버 SmartEditor가 클릭 시점에 동적으로 새 iframe을 만든다** —
    스크립트 주입 시점에 찾아둔 요소가 실제 입력 가능한 요소가 아닐 수 있다. 클릭 후
    `document.activeElement`가 IFRAME이면 그 `.contentDocument`를 재귀적으로 따라
    들어가서 진짜 편집 가능한 요소를 다시 찾아야 한다(§8.2의 `resolveActiveEditable()`).
11. **(크롬 확장) 카테고리 `<li>`를 클릭해도 선택되지 않는다** — 실제 선택 로직은 그
    `<li>` 안의 라디오 라벨/인풋에 바인딩돼 있다. 컨테이너가 아니라 내부의 실제 클릭
    대상을 찾아 클릭해야 한다.
12. **(크롬 확장) `<input type="file">`을 스크립트로 채울 수 없다** — 브라우저가 보안상
    막아둔다. AI가 생성한 이미지는 캔버스로 PNG 정규화 후
    `navigator.clipboard.write([new ClipboardItem(...)])`로 클립보드에 복사해두고,
    사용자가 본문에 직접 Ctrl+V 하는 방식으로 우회했다(§8.3 참고).
13. **`chrome.scripting.executeScript`에 넘기는 함수는 완전히 자기완결적이어야 한다** —
    외부 스코프의 변수/헬퍼 함수를 참조할 수 없다(직렬화돼서 페이지 컨텍스트로 주입되기
    때문). 데스크톱 앱의 `humanInput.js`/`blogEditorInspector.js`처럼 공용 모듈을 import해서
    재사용하는 게 불가능하므로, 확장에서는 같은 로직(사람처럼 타이핑, 구조 조사)을 각
    주입 함수 내부에 통째로 다시 작성해야 한다(§8.1 참고).

---

## 8. 크롬 확장 버전 개발 상세

데스크톱 앱(Playwright)과 원리는 같지만 실행 환경이 완전히 다르기 때문에 별도로
겪은 제약·버그·설계 결정을 모아둔다. 크롬 확장을 처음 만지는 AI 도구는 이 섹션부터
읽을 것 — 특히 8.1(자기완결형 함수 제약)을 모르면 데스크톱 앱 코드를 그대로
재사용하려다 바로 막힌다.

### 8.1 `chrome.scripting.executeScript`의 자기완결형 함수 제약

확장의 sidepanel(`sidepanel.js`)에서 실행하는 코드와, 네이버 탭 안에서 실행하는 코드는
완전히 다른 JS 컨텍스트다. `chrome.scripting.executeScript({target:{tabId, allFrames:true},
func, args})`로 넘기는 `func`은 **직렬화돼서 페이지 컨텍스트에 주입**되기 때문에, 클로저로
외부 스코프의 변수나 다른 함수를 참조할 수 없다 — 데스크톱 앱처럼
`humanInput.js`/`blogEditorInspector.js`를 import해서 재사용하는 방식이 아예 불가능하다.
그래서 `injectedFillTitleAndBody`/`injectedRunPublishSettings`/`injectedInspectStructure`
같은 각 주입 함수 내부에 `sleep`/`randomDelay`/`humanType`/`findEditableTarget`/
`simulateClick`/`resolveActiveEditable` 등 필요한 헬퍼를 전부 다시 정의해 넣었다(중복
코드가 생기는 게 정상 — 이 제약 때문에 어쩔 수 없다). 새 주입 함수를 추가할 때마다
이 제약을 잊지 말 것.

### 8.2 탭/창 관련 버그 2건

1. **엉뚱한 탭이 잡힘** — `chrome.tabs.query({active:true, currentWindow:true})`는
   "사이드패널이 열려 있는 창의 활성 탭"을 반환하는데, 네이버 탭이 다른 창에 떠 있으면
   `chrome://extensions` 같은 엉뚱한 탭이 잡혀 `Cannot access a chrome:// URL` 에러가
   난다. `chrome.tabs.query({url:"https://blog.naver.com/*"})`로 창과 무관하게
   검색하도록 고쳐서 `findAndFocusNaverTab()` 공용 헬퍼로 뺐다.
2. **OS 포커스가 없으면 `execCommand`가 조용히 무시됨** — 탭을 찾아도 그 탭/창이 실제
   OS 레벨에서 포커스된 상태가 아니면 `document.execCommand("insertText", ...)`가 에러
   없이 그냥 아무 일도 안 한다. "명령이 에러 없이 끝났다"가 "실제로 반영됐다"를 보장하지
   않는다는 것을 이 버그로 다시 확인했다. 해결: `executeScript` 전에 반드시
   `chrome.windows.update(tab.windowId, {focused:true})` + `chrome.tabs.update(tab.id,
   {active:true})` + 200ms 대기.
3. **네이버 SmartEditor가 클릭 시점에 동적으로 새 iframe을 생성함** — 스크립트 주입
   시점에 `querySelector`로 찾아둔 요소가, 실제로 클릭해보면 그 요소가 아니라 새로
   생성된 중첩 iframe 안의 요소로 대체돼 있었다(사용자가 제공한 진단 데이터
   `{"activeElementIsSame":false,"activeElementTag":"IFRAME","isContentEditable":false}`로
   확인). `resolveActiveEditable()`을 만들어서, 클릭 후 `document.activeElement`가
   IFRAME이면 `.contentDocument`를 최대 5단계까지 재귀적으로 따라 들어가 실제 편집
   가능한 요소를 다시 찾고, 이후의 모든 Range/Selection/execCommand 연산을 그 요소의
   `ownerDocument` 기준으로 수행하도록 고쳤다. 검증(`verified` 필드)도 바깥 문서가 아니라
   이 재탐색된 요소의 `textContent`를 확인하도록 같이 고쳤다(중첩 iframe 안의 텍스트는
   바깥 문서의 `textContent`에 나타나지 않기 때문).

이 세 가지 모두 "에러 없이 끝남 ≠ 실제로 반영됨"이라는 데스크톱 앱 때부터의 원칙(§4)을
그대로 재확인한 사례이고, 그래서 매번 실제 결과를 다시 읽어서 확인하는 `verified` 필드를
결과 객체에 추가하는 방식으로 대응했다.

### 8.3 카테고리 선택 버그 + 클립보드 이미지 워크어라운드

- **카테고리 `<li>`를 클릭해도 선택 안 됨** — 구조 조사 결과 실제 선택 로직은 `<li
  class="item__dTdzo">` 자체가 아니라 그 안의 `.radio_label__zTXH0` 라벨(또는
  `input[type=radio]`, `.option__y4XPa`)에 바인딩돼 있었다. 컨테이너 대신
  `target.querySelector(".radio_label__zTXH0") || target.querySelector('input[type="radio"]')
  || target.querySelector(".option__y4XPa") || target` 순서로 실제 클릭 대상을 찾아
  클릭하도록 고치고, `.selectbox_button__IxraO`의 textContent로 사후 검증을 추가했다.
- **AI 생성 이미지를 `<input type="file">`에 넣을 수 없음** — 브라우저가 보안상 스크립트로
  파일 입력을 채우는 것 자체를 막는다. 우회 방법: 캔버스로 이미지를 PNG로 정규화한 뒤
  `navigator.clipboard.write([new ClipboardItem({"image/png": blob})])`로 클립보드에
  복사해두고, 사용자가 본문을 클릭한 뒤 Ctrl+V로 직접 붙여넣게 했다(ClipboardItem이
  PNG를 가장 안정적으로 지원해서 다른 포맷이면 캔버스로 먼저 변환).

### 8.4 관리자 전용 진단 도구 노출

데스크톱 앱의 `blogEditorInspector.js`(§4)와 같은 역할을 하는 구조 조사 도구를 확장에도
`injectedInspectStructure()`로 이식했는데(결과를 파일 대신 사이드패널의 읽기전용
textarea에 표시), 일반 회원에게는 불필요한 유지보수용 도구라 관리자 계정으로 연동했을
때만 보이도록 했다. `verifyPersonalAccessTokenWithProgramAccess()`가 반환하는
`VerifiedToken`에 `isAdmin: boolean`을 추가(→ `profiles.is_admin` 조회)하고, `whoami`
API 응답에도 `isAdmin`을 포함시켜, 확장 쪽 `renderStatus()`가
`result.linked && result.isAdmin`일 때만 `#admin-only-section`을 보이게 했다. 이
`isAdmin` 플루밍은 향후 다른 서브프로젝트가 "관리자에게만 보이는 도구"를 만들 때도
그대로 재사용 가능한 패턴이다.

### 8.5 배포 방식 — Chrome 웹스토어 대신 zip 직접 배포

Chrome 웹스토어 개발자 계정은 만들어뒀지만(§3 참고) 아직 정식 심사를 제출하지 않기로
했다. 대신:
1. `Compress-Archive`(PowerShell)로 `extension/` 폴더를 zip으로 압축, 동봉한
   `설치방법.txt`에 "개발자 모드 → 압축해제된 확장 프로그램 로드" 절차를 안내.
2. 데스크톱 앱 exe와 마찬가지로 `gh release upload`로 같은 GitHub Release
   (`naver-blog-auto-poster-v0.1.0`)에 자산으로 추가.
3. 루트 앱 다운로드 페이지(`app/(dashboard)/naver-blog-auto-poster/page.tsx`)에서 데스크톱
   앱 다운로드 버튼 바로 아래에 "웹버전(크롬 확장) 다운로드" 섹션을 추가하고, 그 아래에
   단계별 사용법(11단계 `<ol>`)과 맨 하단에 "📖 연동 매뉴얼"(OpenAI/Gemini API 키 발급
   안내, `platform_guides` 재사용 + 팝업창 오픈 — CLAUDE.md의 "API키등록·플랫폼연동
   페이지 표준" 그대로 따름)을 추가했다.
   - 업데이트가 나오면 사용자가 새 zip을 다시 풀어서 폴더 전체를 교체하고
     `chrome://extensions`에서 새로고침해야 한다는 안내도 `설치방법.txt`에 명시.

### 8.6 이 김에 같이 고친 루트 앱 버그/기능 (직접적인 확장 코드는 아니지만 같은 작업 흐름에서 발견)

- **토큰 "폐기" 버튼 무반응** — `createPersonalAccessToken()`이 DB `id`를 반환하지 않아서,
  방금 만든 토큰은 `pending-${Date.now()}` 같은 임시 id로 화면에 표시되고 있었고,
  `handleRevoke()`에 그 임시 id는 무시하는 방어 코드가 있어서 새로고침 전까지는 폐기
  버튼이 아예 반응하지 않았다. 서버 액션이 `.select("id, created_at").single()`로 실제
  id를 반환하도록 고치고, 그 방어 코드를 제거해 실제 에러가 표면화되도록 했다.
- **사이드바 좌하단 로그인 계정 표시** — 모든 대시보드 페이지가 공유하는
  `components/layout/Sidebar.tsx`에 `supabase.auth.getUser()`로 가져온 이메일을 하단에
  표시하는 블록을 추가했다(이 루트 컴포넌트라서 naver-blog-auto-poster뿐 아니라 모든
  서브프로그램 대시보드 화면에 공통 적용됨 — 이 서브프로젝트 작업 중 발견/요청됐지만
  변경 자체는 플랫폼 전역 파일에 한 것이니 다른 서브프로젝트를 만질 때도 이 파일이 이미
  이 기능을 갖고 있다는 것을 기억할 것).

---

## 9. 공개 판매 전환 시 지킨 절차 (다음에 다른 프로그램에도 참고)

1. `programs.is_active = true` 전환 + 카탈로그 문구(`short_desc`/`description`/`app_url`)
   현행화 + 썸네일 생성(§13 스타일 고정 템플릿, "photorealistic" 등 4개 키워드 필수,
   텍스트/로고 없이).
2. **로그인만 확인하던 모든 지점을 실제 이용 권한 확인으로 교체** — 페이지는
   `checkProgramAccess()`, API route는 토큰 검증과 이용 권한 확인을 합친 전용 헬퍼로.
   이 교체를 빠뜨리면 "로그인한 비구독자가 무료로 쓸 수 있는" 구멍이 생긴다(CLAUDE.md
   멀티테넌시 원칙 1번 — 이 저장소에서 가장 자주 반복된 실수).
3. 빌드 확인 → 커밋 → 푸시 → 배포 → 실제 카탈로그 페이지에서 노출 확인.
4. (크롬 확장은 스토어 미등록이라 이 절차 중 "카탈로그 노출"만 해당 — 확장 자체 배포는
   §8.5의 GitHub Releases + zip 방식을 따른다.)

---

## 10. 다음 단계 (미착수)

1. **크롬 확장 Chrome 웹스토어 정식 심사 제출** — 기능이 충분히 안정화됐다고 판단되면
   §3/§8.5에서 만들어둔 개발자 계정으로 제출. 그 전까지는 zip 직접 배포 유지.
2. **티스토리 블로그 자동화** — 사용자가 네이버 작업 완료 후 진행하기로 결정(2026-09-XX).
   이 문서의 방법론(§4 실측 원칙, §5 봇 탐지 회피, §8.1 자기완결형 함수 제약 등)을 거의
   그대로 재사용할 수 있을 것으로 예상 — 새로 시작할 때 이 문서 전체를 먼저 참고할 것.
3. 그 외 이 매뉴얼의 원칙(사람이 발행 버튼 클릭, 봇 탐지 회피, 실측 후 자동화, 기능 단위
   검증 루프)은 어떤 새 자동화 기능을 추가하든 예외 없이 동일하게 적용할 것.
