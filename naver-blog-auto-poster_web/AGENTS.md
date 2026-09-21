# naver-blog-auto-poster_web 개발 매뉴얼 (Claude Code / Codex / Gemini 공통 지침)

이 문서는 **네이버 블로그 자동화의 크롬 확장(웹버전)** 을 어떤 AI 코딩 도구로 이어받아도
동일한 방식으로 작업할 수 있도록 정리한 매뉴얼이다. 상세한 변경 이력·체크리스트·
트러블슈팅 원문은 [`README.md`](./README.md)에 있으니 "무엇이 되어있는지"는 README를,
"어떻게 작업해야 하는지"는 이 문서를 먼저 읽을 것.

**이 문서보다 먼저 읽어야 하는 것 (순서대로)**:
1. 루트 `../CLAUDE.md` — 플랫폼 전체 원칙(Platform-hub 구조, 멀티테넌시 원칙, 커뮤니케이션 규칙).
2. `../docs/PLATFORM_PATTERNS.md` §20 — "공식 API 없는 서비스를 브라우저 자동화로 만들 때"의
   봇 탐지 회피 원칙(플랫폼 전역 규칙).
3. **`../naver-blog-auto-poster_app/AGENTS.md`** — 같은 제품의 데스크톱 앱(Electron+
   Playwright) 개발 매뉴얼. **이 문서는 그 문서의 방법론을 전제로 한다** — 특히 §4(추측하지
   말고 실측한다), §5(봇 탐지 회피 원칙)는 이 문서에서 반복 설명하지 않고 요약만 하니,
   전체 근거가 필요하면 반드시 그 문서를 참고할 것.

## 0. 이 프로그램과 데스크톱 앱의 관계 (가장 먼저 이해할 것)

**코드·문서뿐 아니라 판매(programs 등록)까지 완전히 분리된, 서로 다른 유료 프로그램이다.**

- 2026-09-21에 유지보수 편의를 위해 `naver-blog-auto-poster/` 폴더를 `naver-blog-auto-poster_app`
  (데스크톱 앱)과 `naver-blog-auto-poster_web`(이 폴더, 크롬 확장)로 완전히 분리했다. 이후
  두 폴더의 코드는 서로 import하지 않고 각자 독립적으로 유지보수한다.
- **같은 날 바로 이어서, `programs` 테이블 등록·요금제·기기 연동 토큰도 완전히
  분리했다.** 이 폴더(크롬 확장)는 `programs.slug = naver-blog-auto-poster-web`("네이버
  블로그 자동화 - 크롬 확장")이라는 독립된 유료 프로그램이고, 데스크톱 앱은
  `naver-blog-auto-poster`("네이버 블로그 자동화 - PC 앱")다 — 요금제도 각자 따로 등록돼
  있고, 한쪽을 구매해도 다른 쪽은 자동으로 이용할 수 없다. 처음엔 "코드만 분리하고
  이용권한은 공유"하는 방향이었으나, 자동화 로직 자체가 서로 다르고 앞으로 각자 다른
  속도로 유지보수될 것이라는 이유로 사용자가 완전 별도 프로그램으로 재결정했다(분리
  시점에 활성 구독/토큰이 0건이라 기존 회원 이관 이슈는 없었음,
  `supabase/migrations/0010_split_naver_blog_auto_poster_into_separate_programs.sql`).
- 이 폴더가 호출하는 루트 API는 `app/api/naver-blog-auto-poster-web/*`(데스크톱 앱의
  `app/api/naver-blog-auto-poster/*`와는 별도 라우트)다. AI 생성 로직 자체
  (`lib/naverBlogAutoPoster/*`)는 콘텐츠 품질을 위해 계속 공유하지만, 이용권한 검증에
  쓰이는 `PROGRAM_SLUG`는 절대 데스크톱 앱과 같은 값으로 고치지 말 것.

---

## 1. 프로젝트 한 줄 요약

네이버는 블로그 포스팅 공식 API가 없어서, 크롬 확장(Manifest V3)이
`chrome.scripting.executeScript`로 실제 네이버 블로그 글쓰기 화면에 스크립트를 주입해
사람처럼 조작한다. 별도 프로그램 설치 없이 크롬 사이드패널에서 바로 쓸 수 있다는 게
데스크톱 앱과의 차이점이고, 동작 원리(사람처럼 클릭+타이핑, 실측 기반 셀렉터, 발행은
사람이 직접)는 데스크톱 앱과 동일하다. AI 글 생성은 루트 AIMaster 서버가 사용자 본인 API
키로 대신 호출하고, 확장은 결과만 받아 화면에 채워 넣는다. **발행 버튼은 항상 사람이 최종
확인 후 직접 누른다.** 2026-09-21에 완성·검증되고 공개 판매(데스크톱 앱과 공동 카탈로그)로
전환됐다.

---

## 2. 개발 환경 / 기술 스택

| 구분 | 선택 | 비고 |
|---|---|---|
| 확장 형식 | Chrome Extension **Manifest V3** | `sidePanel`+`storage`+`scripting`+`clipboardWrite` 권한, `host_permissions`로 `*.naver.com`/`www.buylife.xyz`만 허용 |
| 브라우저 자동화 | `chrome.scripting.executeScript` | Playwright 없이, 사용자가 이미 로그인해 열어둔 실제 크롬 탭에 직접 스크립트 주입. §7의 자기완결형 함수 제약이 핵심 |
| UI | 순수 HTML/CSS/JS (사이드패널) | 프레임워크·빌드 스텝 없음 — `sidepanel.html`/`sidepanel.js`/`styles.css`를 그대로 로드 |
| 패키징/배포 | PowerShell `Compress-Archive` → zip, GitHub Releases | Chrome 웹스토어 미등록 상태라 "압축해제된 확장 프로그램" 개발자 모드 설치 방식으로 배포(§9 참고) |
| 백엔드(AI 생성·계정 연동) | 루트 AIMaster Next.js 앱(App Router) + Supabase | 이 폴더 자체에는 서버 코드 없음 — `naver-blog-auto-poster_app`과 동일한 루트 API를 공유 |
| DB | Supabase(Postgres), 플랫폼 전체가 공유하는 프로젝트 `esgxyikcnnvmlhygjkth` | 이 폴더 전용 DB 아님 |

---

## 3. 사용한 도구·플러그인

- **Chrome Web Store Developer Dashboard** (`chrome.google.com/webstore/devconsole`) — 개발자
  계정 등록 완료(2026-09-21, $5 일회성 등록비 — 계정당 한 번만 내면 되고 확장 개수와 무관,
  단 업데이트마다 재심사는 필요). **사용자의 명시적 결정**: 계정만 만들어두고, 당장은 정식
  스토어 심사를 넣지 않고 "압축해제된 확장 프로그램" 방식으로 계속 개발·배포하다가 기능이
  어느 정도 안정화되면 그때 심사를 제출하기로 함.
- `chrome://extensions`(개발자 모드) — 확장 로드/새로고침/에러 확인에 사용. 코드 수정 후
  반드시 이 페이지에서 새로고침(순환 화살표) 버튼을 눌러야 반영된다는 것도 실측으로 확인.
- **GitHub CLI (`gh`)** — `gh release upload --clobber`로 zip을 GitHub Releases
  (`BUYLIFEMALL/aimaster` 저장소의 `naver-blog-auto-poster-v0.1.0` 릴리스)에 자산으로 추가.
  데스크톱 앱 exe와 같은 릴리스를 공유한다.
- PowerShell `Compress-Archive` — 이 폴더 전체를 zip으로 압축. `zip` CLI가 이 Windows
  환경 git-bash에 없어서 PowerShell 명령을 사용.
- **로컬 스크린샷 폴더(`D:\PDS`)** — 사용자가 실제 화면을 캡처해서 파일명만 언급하면
  그 폴더에서 찾아 확인하는 방식으로 매 단계를 검증했다(데스크톱 앱과 동일한 핵심 개발 루프).

---

## 4. 핵심 개발 방법론 (요약 — 전체 근거는 `_app/AGENTS.md` §4)

- **네이버 화면의 실제 DOM 구조를 절대 미리 추측해서 하드코딩하지 않는다.** 이 폴더에도
  `injectedInspectStructure()`라는 전용 구조 조사 도구가 있다(§6 참고) — 실제 화면에서
  버튼을 눌러 DOM을 확인한 뒤에만 자동화 코드를 작성한다.
- **작업 단위는 항상: 기능 하나 구현 → 사용자가 실제 화면에서 테스트 → 결과 확인 →
  README에 기록 → 커밋/푸시.** 여러 기능을 몰아서 만들지 않는다.
- **"발행" 버튼처럼 되돌릴 수 없는 액션은 절대 자동화하지 않는다.** 발행 설정창을 여는
  것까지만 자동화하고, 실제 발행은 항상 사람이 직접 누른다.
- 이 원칙은 데스크톱 앱과 완전히 동일하게 적용되며, 재검토가 필요 없다.

---

## 5. 봇 탐지 회피 원칙 (절대 불변 — 전체 근거는 `_app/AGENTS.md` §5)

`sidepanel.js`의 각 주입 함수 내부에 정의된 `humanType`/`randomDelay` 헬퍼를 모든 텍스트
입력에 강제한다.

- 값을 즉시 대입하지 않는다 — 반드시 실제 클릭으로 포커스를 옮긴 뒤 한 글자씩, 무작위
  간격으로 타이핑한다.
- 네이버 글쓰기 화면에는 상시 로드되는 봇 탐지용 iframe(nCaptcha)이 있다 — 보안 확인 화면이
  뜨면 사람이 직접 완료하게 하고, 절대 자동으로 우회하려 하지 않는다.
- 새 자동 입력 기능을 추가할 때마다 이 원칙을 최우선으로 확인한다.

---

## 6. 아키텍처 구조

```
manifest.json    Manifest V3. permissions: ["sidePanel","storage","scripting","clipboardWrite"]
                 host_permissions: ["https://*.naver.com/*","https://www.buylife.xyz/*"]
background.js    서비스 워커. chrome.sidePanel.setPanelBehavior({openPanelOnActionClick:true})
                 딱 한 줄 — 확장 아이콘 클릭 시 사이드패널이 열리게 하는 것 외에 하는 일 없음.
sidepanel.html   UI 전체(계정 연동, AI 초안 생성, 1단계 자동입력, 2단계 발행정보,
                 관리자 전용 구조 분석 섹션).
sidepanel.js     핵심 로직 전부(토큰 저장/검증, executeScript 호출, UI 이벤트 바인딩,
                 네이버 탭에 주입되는 모든 함수).
styles.css       흰색 배경 테마.
설치방법.txt      zip 배포용 동봉 설치 안내(개발자 모드로 로드하는 방법).
```

**루트 서버 통신**: 이 확장은 자체 백엔드가 없다. `AIMASTER_BASE_URL`(반드시
`https://www.buylife.xyz` — www 없이 호출하면 307 리다이렉트로 `Authorization` 헤더가
사라진다)로 루트 앱의 `/api/naver-blog-auto-poster-web/whoami`(토큰 검증)와
`/api/naver-blog-auto-poster-web/generate`(AI 초안+이미지 생성) API를 `Authorization:
Bearer <personal access token>` 헤더로 호출한다 — 데스크톱 앱의 `/api/naver-blog-auto-poster/*`
와는 별도 라우트다(2026-09-21 완전 별도 프로그램으로 분리되면서 나뉨). 토큰은
`chrome.storage.local`에 저장한다(데스크톱 앱은 로컬 파일에 저장 — 저장 위치뿐 아니라
`program_slug`도 다른 완전히 별도의 토큰 발급 체계다).

---

## 7. `chrome.scripting.executeScript`의 자기완결형 함수 제약 (가장 중요한 제약)

확장의 sidepanel(`sidepanel.js`)에서 실행하는 코드와, 네이버 탭 안에서 실행하는 코드는
완전히 다른 JS 컨텍스트다. `chrome.scripting.executeScript({target:{tabId, allFrames:true},
func, args})`로 넘기는 `func`은 **직렬화돼서 페이지 컨텍스트에 주입**되기 때문에, 클로저로
외부 스코프의 변수나 다른 함수를 참조할 수 없다 — 데스크톱 앱처럼 `humanInput.js`/
`blogEditorInspector.js` 같은 공용 모듈을 import해서 재사용하는 방식이 아예 불가능하다.

그래서 `injectedFillTitleAndBody`/`injectedRunPublishSettings`/`injectedInspectStructure`
같은 각 주입 함수 내부에 `sleep`/`randomDelay`/`humanType`/`findEditableTarget`/
`simulateClick`/`resolveActiveEditable` 등 필요한 헬퍼를 전부 다시 정의해 넣었다(중복
코드가 생기는 게 정상 — 이 제약 때문에 어쩔 수 없다). **새 주입 함수를 추가할 때마다 이
제약을 잊지 말 것** — `_app`의 `src/lib/`를 그대로 가져다 쓰려는 시도는 바로 막힌다.

---

## 8. 실제로 겪은 함정 (같은 실수 반복 방지용)

1. **엉뚱한 탭이 잡힘** — `chrome.tabs.query({active:true, currentWindow:true})`는
   "사이드패널이 열려 있는 창의 활성 탭"을 반환하는데, 네이버 탭이 다른 창에 떠 있으면
   `chrome://extensions` 같은 엉뚱한 탭이 잡혀 `Cannot access a chrome:// URL` 에러가 난다.
   `chrome.tabs.query({url:"https://blog.naver.com/*"})`로 창과 무관하게 검색하도록 고쳐서
   `findAndFocusNaverTab()` 공용 헬퍼로 뺐다.
2. **OS 포커스가 없으면 `execCommand`가 조용히 무시됨** — 탭을 찾아도 그 탭/창이 실제 OS
   레벨에서 포커스된 상태가 아니면 `document.execCommand("insertText", ...)`가 에러 없이
   그냥 아무 일도 안 한다. "명령이 에러 없이 끝났다"가 "실제로 반영됐다"를 보장하지 않는다는
   것을 이 버그로 다시 확인했다. 해결: `executeScript` 전에 반드시
   `chrome.windows.update(tab.windowId, {focused:true})` + `chrome.tabs.update(tab.id,
   {active:true})` + 200ms 대기.
3. **네이버 SmartEditor가 클릭 시점에 동적으로 새 iframe을 생성함** — 스크립트 주입 시점에
   `querySelector`로 찾아둔 요소가, 실제로 클릭해보면 그 요소가 아니라 새로 생성된 중첩
   iframe 안의 요소로 대체돼 있었다(사용자가 제공한 진단 데이터
   `{"activeElementIsSame":false,"activeElementTag":"IFRAME","isContentEditable":false}`로
   확인). `resolveActiveEditable()`을 만들어서, 클릭 후 `document.activeElement`가 IFRAME이면
   `.contentDocument`를 최대 5단계까지 재귀적으로 따라 들어가 실제 편집 가능한 요소를 다시
   찾고, 이후의 모든 Range/Selection/execCommand 연산을 그 요소의 `ownerDocument` 기준으로
   수행하도록 고쳤다. 검증(`verified` 필드)도 바깥 문서가 아니라 이 재탐색된 요소의
   `textContent`를 확인하도록 같이 고쳤다(중첩 iframe 안의 텍스트는 바깥 문서의
   `textContent`에 나타나지 않기 때문).
4. **카테고리 `<li>`를 클릭해도 선택 안 됨** — 구조 조사 결과 실제 선택 로직은
   `<li class="item__dTdzo">` 자체가 아니라 그 안의 `.radio_label__zTXH0` 라벨(또는
   `input[type=radio]`, `.option__y4XPa`)에 바인딩돼 있었다. 컨테이너 대신
   `target.querySelector(".radio_label__zTXH0") || target.querySelector('input[type="radio"]')
   || target.querySelector(".option__y4XPa") || target` 순서로 실제 클릭 대상을 찾아 클릭하도록
   고치고, `.selectbox_button__IxraO`의 textContent로 사후 검증을 추가했다.
5. **AI 생성 이미지를 `<input type="file">`에 넣을 수 없음** — 브라우저가 보안상 스크립트로
   파일 입력을 채우는 것 자체를 막는다. 우회 방법: 캔버스로 이미지를 PNG로 정규화한 뒤
   `navigator.clipboard.write([new ClipboardItem({"image/png": blob})])`로 클립보드에
   복사해두고, 사용자가 본문을 클릭한 뒤 Ctrl+V로 직접 붙여넣게 했다(ClipboardItem이 PNG를
   가장 안정적으로 지원해서 다른 포맷이면 캔버스로 먼저 변환).
6. **`buylife.xyz`(www 없음) 호출 시 307 리다이렉트로 `Authorization` 헤더 소실** — 서버 간
   호출 주소는 항상 최종 도메인(`www.buylife.xyz`)을 정확히 쓸 것(§6 참고, `_app`과 동일한
   교훈).

위 1~3번은 모두 "에러 없이 끝남 ≠ 실제로 반영됨"이라는 데스크톱 앱 때부터의 원칙(`_app`의
AGENTS.md §4)을 다시 확인한 사례이고, 그래서 매번 실제 결과를 다시 읽어서 확인하는
`verified` 필드를 결과 객체에 추가하는 방식으로 대응했다.

---

## 9. 관리자 전용 진단 도구 노출

데스크톱 앱의 `blogEditorInspector.js`와 같은 역할을 하는 구조 조사 도구를 이 확장에도
`injectedInspectStructure()`로 이식했는데(결과를 파일 대신 사이드패널의 읽기전용 textarea에
표시), 일반 회원에게는 불필요한 유지보수용 도구라 관리자 계정으로 연동했을 때만 보이도록
했다. `verifyPersonalAccessTokenWithProgramAccess()`가 반환하는 `VerifiedToken`에
`isAdmin: boolean`을 추가(→ `profiles.is_admin` 조회)하고, `whoami` API 응답에도 `isAdmin`을
포함시켜, `renderStatus()`가 `result.linked && result.isAdmin`일 때만 `#admin-only-section`을
보이게 했다. 이 `isAdmin` 플루밍은 향후 다른 서브프로젝트가 "관리자에게만 보이는 도구"를
만들 때도 그대로 재사용 가능한 패턴이다.

---

## 10. 배포 방식 — Chrome 웹스토어 대신 zip 직접 배포

Chrome 웹스토어 개발자 계정은 만들어뒀지만(§3 참고) 아직 정식 심사를 제출하지 않기로 했다.
대신:
1. `Compress-Archive`(PowerShell)로 이 폴더 전체를 zip으로 압축, 동봉한 `설치방법.txt`에
   "개발자 모드 → 압축해제된 확장 프로그램 로드" 절차를 안내.
2. 데스크톱 앱 exe와 마찬가지로 `gh release upload`로 같은 GitHub Release
   (`naver-blog-auto-poster-v0.1.0`)에 자산으로 추가.
3. 루트 앱 다운로드 페이지(`app/(dashboard)/naver-blog-auto-poster/page.tsx`)에서 데스크톱 앱
   다운로드 버튼 바로 아래에 "웹버전(크롬 확장) 다운로드" 섹션을 두고, 그 아래에 단계별
   사용법과 맨 하단에 "📖 연동 매뉴얼"(OpenAI/Gemini API 키 발급 안내, `platform_guides`
   재사용 + 팝업창 오픈 — CLAUDE.md의 "API키등록·플랫폼연동 페이지 표준" 그대로 따름)을
   함께 두었다. 이 페이지는 `naver-blog-auto-poster_app`과 이 폴더가 공유하는 화면이다.
   - 업데이트가 나오면 사용자가 새 zip을 다시 풀어서 폴더 전체를 교체하고
     `chrome://extensions`에서 새로고침해야 한다는 안내도 `설치방법.txt`에 명시.

---

## 11. 이 폴더 작업 중 같이 고친 루트 앱 버그/기능 (참고용 — 코드는 루트에 있음)

- **토큰 "폐기" 버튼 무반응** — `createPersonalAccessToken()`이 DB `id`를 반환하지 않아서
  발생한 버그. `lib/actions/personalAccessTokens.ts`에서 수정 완료. **당시(2026-09-21
  프로그램 분리 이전)에는 데스크톱 앱/이 확장이 같은 토큰 관리 화면
  (`app/(dashboard)/naver-blog-auto-poster/TokenManager.tsx`)을 썼기 때문에 양쪽 모두에
  영향이 있었다** — 지금은 각 프로그램이 자기 `TokenManager.tsx`를 따로 갖고 있지만
  (`app/(dashboard)/naver-blog-auto-poster/TokenManager.tsx`와
  `app/(dashboard)/naver-blog-auto-poster-web/TokenManager.tsx`), 둘 다 같은
  `lib/actions/personalAccessTokens.ts` 서버 액션을 호출하므로 이 파일을 고치면 여전히
  두 프로그램 모두에 영향이 있다.
- **사이드바 좌하단 로그인 계정 표시** — 모든 대시보드 페이지가 공유하는
  `components/layout/Sidebar.tsx`에 추가된 기능. 이 폴더와는 직접 관련 없지만 같은 작업
  흐름에서 발견/요청됐다.

---

## 12. 공개 판매 전환 절차 (전체 절차는 `_app/AGENTS.md` §9)

**2026-09-21부터 이 확장도 데스크톱 앱과 별개로 독립된 `programs` 행
(`naver-blog-auto-poster-web`)과 요금제를 갖는다** — §0 참고. 새 기능을 추가했을 때 카탈로그
문구/썸네일을 갱신해야 한다면 이 프로그램 자체의 row를 직접 수정할 것(데스크톱 앱 row에
영향 없음). 이 폴더가 관여하는 이용권한 관련 부분은: **로그인만 확인하던 지점을 실제
이용 권한 확인으로 교체**하는 것 — `whoami` API가 `checkProgramAccessApi()` 결과를 그대로
반환하는지 확인한다(이 부분은 루트 앱 코드라 이 폴더에는 없다). 확장 자체 배포는 §10의
GitHub Releases + zip 방식을 따른다.

---

## 13. 다음 단계 (미착수)

1. **Chrome 웹스토어 정식 심사 제출** — 기능이 충분히 안정화됐다고 판단되면 §3/§10에서
   만들어둔 개발자 계정으로 제출. 그 전까지는 zip 직접 배포 유지.
2. 그 외 이 매뉴얼의 원칙(사람이 발행 버튼 클릭, 봇 탐지 회피, 실측 후 자동화, 기능 단위
   검증 루프)은 어떤 새 기능을 추가하든 예외 없이 동일하게 적용할 것.
