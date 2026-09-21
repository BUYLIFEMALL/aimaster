# 네이버 블로그 자동화 — 크롬 확장/웹버전(naver-blog-auto-poster_web)

네이버 블로그 자동화의 **크롬 확장(웹버전)** 개발 이력이다. 원래
`naver-blog-auto-poster/extension/` 하위 폴더로 개발됐다가, 2026-09-21에 유지보수 편의를
위해 이 폴더로 완전히 분리됐다 — 코드는 서로 독립이지만, **이용권한·요금제는 데스크톱
앱과 `programs.slug = naver-blog-auto-poster` 하나를 그대로 공유**한다(새 유료
프로그램으로 등록하지 않음). 데스크톱 앱 쪽 개발 이력은
[`../naver-blog-auto-poster_app/README.md`](../naver-blog-auto-poster_app/README.md)를,
AIMaster 계정 연동 아키텍처(토큰 발급/검증 등 공용 백엔드)의 전체 설명은 그 README의
"AIMaster 계정 연동 아키텍처" 절을 참고할 것.

개발 방법론(추측하지 말고 실측한다, 봇 탐지 회피 원칙 등)은
[`AGENTS.md`](./AGENTS.md)에 정리돼 있다.

## 2단계: 크롬 확장 버전

1단계(데스크톱 앱) 완료 후 착수(2026-09-21). Easy-peasy SNS의 사이드패널 구조를
참고하되, AI 생성·계정 연동은 1단계와 **동일한 백엔드를 그대로 재사용**한다 — 새 프로그램
등록 없이 같은 `naver-blog-auto-poster` 카탈로그 항목의 또 다른 배포 형태로 취급한다.
코드는 이 폴더(`naver-blog-auto-poster_web/`, Manifest V3, 사이드패널)에 둔다. 배포는
Chrome 웹스토어 비공개(Unlisted) 등록 방식을 검토한다.

**1단계와 구조적으로 다른 점**: 데스크톱 앱은 Playwright가 별도 브라우저를 "바깥에서
원격 조종"하지만(CDP 기반, 실제 키보드 입력과 거의 동일하게 전달됨), 크롬 확장은 사용자의
평소 크롬 창 안에서 **그 페이지 자신의 자바스크립트로 직접 DOM을 조작**한다. 이 차이 때문에
`humanInput.js`의 타이핑 방식을 그대로 가져다 쓸 수 없다 — 확장에서 스크립트로 발생시킨
입력 이벤트는 `isTrusted: false`로 남아서 진짜 사용자 입력과 구분될 수 있다. **본문/제목
자동 입력 기능을 만들 때 이 부분부터 별도로 조사·설계할 것** (docs/PLATFORM_PATTERNS.md
§20의 원칙은 여전히 적용되지만, 구현 방법은 데스크톱 버전과 다르게 다시 검증해야 한다).

### 작업 리스트 (2단계: 크롬 확장)
- [x] 프로토타입 1 — 사이드패널 스캐폴딩 + AIMaster 계정 연동: `manifest.json`
      (Manifest V3, `sidePanel` 권한) + `background.js`(액션 클릭 시 사이드패널 열기) +
      `sidepanel.html`/`sidepanel.js`(데스크톱 앱과 같은 `personal_access_tokens` 백엔드
      재사용, 토큰은 `chrome.storage.local`에 저장). **2026-09-21 실제 크롬에서 검증
      완료**: 압축해제된 확장 로드 → 사이드패널 정상 표시 → 데스크톱 앱과 같은 토큰으로
      계정 연동까지 정상 동작하는 것을 확인함.
- [x] 프로토타입 2 — 네이버 블로그 글쓰기 화면에서 제목/본문 자동 입력: 2026-09-21
      실사용 검증 완료(아래 함정 4가지를 전부 겪고 고친 뒤 정상 동작 확인).
      `chrome.scripting.executeScript`로 활성 탭의 모든
      프레임에 자기완결적 함수(`sidepanel.js`의 `injectedFillTitleAndBody`)를 주입해서
      `document.execCommand("insertText")`로 한 글자씩 입력한다 — dispatchEvent로 만든
      키 이벤트는 `isTrusted:false`라 브라우저가 실제 삽입으로 처리해주지 않기 때문에,
      실제 편집 명령 파이프라인을 타는 `execCommand`를 대신 썼다. **이 방식이 실제로
      SmartEditor ONE에서 동작하는지는 검증 전** — 셀렉터 자체는 1단계에서 실측 확인된
      것(`.se-title-text`, `.se-documentTitle` 조상 없는 첫 `.se-text-paragraph`)을
      그대로 재사용. 사람이 직접 테스트해서 실제로 텍스트가 들어가는지 확인 필요.
      **주의(2026-09-21 실사용 테스트에서 발견한 버그)**: 대상 탭을
      `chrome.tabs.query({active:true, currentWindow:true})`로 찾으면, 사이드패널이
      붙어있는 창과 네이버 블로그 탭이 열려있는 창이 서로 다른 별도 크롬 창일 때 엉뚱한
      탭(사이드패널이 있는 창에서 활성화된 탭, 실제로는 `chrome://extensions`)을 잡아서
      `Cannot access a chrome:// URL` 오류가 났다. 창과 무관하게
      `chrome.tabs.query({url: "https://blog.naver.com/*"})`로 직접 찾도록 수정함 —
      크롬 확장은 사이드패널의 창과 대상 탭의 창이 다를 수 있다는 걸 항상 감안할 것.
      **주의 2 — 탭을 찾아도 "입력 완료"가 실제 입력을 보장하지 않는다**: 탭을 정확히
      찾은 뒤에도, 그 탭의 창이 화면에서 실제로 포커스(활성 상태)되어 있지 않으면
      `execCommand("insertText")`가 에러 없이 조용히 아무것도 넣지 않는 문제를 실사용
      테스트에서 확인함(사이드패널 쪽에는 "입력 완료"로 응답이 왔지만 실제 화면은
      비어있었음). `chrome.scripting.executeScript`로 스크립트를 실행하기 전에
      `chrome.windows.update(tab.windowId, {focused:true})` +
      `chrome.tabs.update(tab.id, {active:true})`로 그 탭/창을 먼저 활성화하도록
      수정함. 또한 이 문제가 재발해도 바로 알아챌 수 있도록, 주입한 함수가 실제
      `textContent`를 확인해서 `verified` 값과 함께 반환하도록 검증 로직도 추가함 —
      앞으로 유사 기능을 만들 때도 "명령이 에러 없이 끝났다"와 "실제로 반영됐다"를
      구분해서 검증할 것. **주의 3 — 창을 활성화해도 여전히 반영 안 됨(2026-09-21
      추가 실사용 테스트로 발견)**: 창 포커스를 고쳤는데도 실제 텍스트가 안 들어가고
      제목/본문에 원래 있던 placeholder 문구(`"제목"`, `"글감과 함께 나의 일상을
      기록해보세요!"`)만 그대로 남아있었다. `.se-title-text`/`.se-text-paragraph`
      자체가 아니라 그 안(또는 조상)의 실제 `contenteditable="true"` 노드가 따로
      있을 가능성이 높다는 판단 하에(1단계 데스크톱 앱 초기 구조 조사에서 클래스 없는
      순수 contenteditable div가 발견됐던 것과 일치) — `findEditableTarget()`으로 진짜
      편집 가능한 노드를 찾고, `focus()`만이 아니라 실제 클릭처럼 마우스 이벤트
      (mousedown/mouseup/click)를 좌표 기반으로 발생시킨 뒤 캐럿을 두도록 수정.
      `isContentEditable`/`activeElement` 진단 정보도 결과에 포함시켜서, 이번에도
      안 되면 정확히 어느 지점이 문제인지 바로 알 수 있게 함.
      **주의 4 — 클릭하는 순간 새 내부 iframe이 동적으로 생성됨(2026-09-21 진단으로
      확정)**: 클릭 후 진단 정보(`activeElementTag: "IFRAME"`, `isContentEditable:
      false`)로 확인함 — 네이버 에디터가 제목/본문을 클릭하는 그 순간 진짜 편집
      영역을 담은 iframe을 새로 만든다(클릭 전엔 DOM에 없어서 최초 스크립트 주입
      시점엔 못 찾았던 것). `resolveActiveEditable()`을 추가해서 클릭 직후
      `document.activeElement`가 iframe이면 그 `contentDocument`까지 따라 들어가
      실제 편집 노드를 다시 찾도록 수정. `execCommand`도 그 노드의 `ownerDocument`
      기준으로 호출하고, 검증도 원래 컨테이너가 아니라 실제 캐럿을 둔 노드의
      `textContent`로 하도록 같이 고침(중첩 iframe 안의 텍스트는 바깥 문서 기준
      `textContent`에 안 잡히기 때문). **아직 실사용 재검증 전.**
- [x] 태그/카테고리 자동 삽입 — 2026-09-21 실사용 검증 완료(아래 함정 수정 후).
      `injectedRunPublishSettings()`가 `#tag-input`/`.selectbox_button__IxraO`/
      `.item__dTdzo`(1단계 데스크톱 앱에서 실측 확인된 셀렉터 재사용)를 조작한다.
      제목/본문과 달리 태그 입력창과 카테고리 목록은 클릭해도 새 iframe이 생기지
      않는 일반 DOM 요소다. 발행 버튼은 이번에도 사람이 직접 누른 뒤에만 이 기능을
      쓸 수 있다.
      **주의(2026-09-21 실사용 테스트에서 발견한 버그)**: 카테고리 드롭다운은 열리는데
      항목을 선택하지 못했다 — `<li class="item__dTdzo">`(항목 전체)를 클릭했지만,
      실제 선택 로직은 그 안의 라벨(`.radio_label__zTXH0`)이나 라디오
      (`input[type=radio]`)에 걸려있던 것으로 보인다. `<li>` 대신 그 안의 실제
      클릭 대상을 찾아 클릭하도록 수정하고, 트리거 버튼(`.selectbox_button__IxraO`)의
      텍스트가 실제로 바뀌었는지 검증하는 로직도 추가함(제목/본문 때와 같은 이유 —
      클릭이 에러 없이 끝났다고 실제 반영을 보장하지 않는다). 재검증 완료 — 정상 동작.
- [x] 이미지 자동 생성 + 클립보드 붙여넣기 (반자동) — 2026-09-21 구현·실사용 검증
      완료(클립보드 복사, Ctrl+V 붙여넣기 전부 정상 동작 확인). 브라우저 보안 정책상
      확장이 `<input type="file">`에
      스크립트로 파일을 채워 넣을 수 없어서(1단계 데스크톱 앱은 Playwright의
      `filechooser` 이벤트 가로채기라는, 확장에는 없는 특수 자동화 권한으로 우회함),
      완전 자동 삽입 대신 "AI 생성 → 클립보드에 자동 복사 → 사용자가 본문에서
      Ctrl+V로 붙여넣기" 방식으로 구현함. "AI로 초안 생성" 섹션에 데스크톱 앱과
      동일한 나노바나나 모델 4종 선택 드롭다운을 추가하고, 응답의 이미지
      base64를 canvas로 PNG 정규화한 뒤 `navigator.clipboard.write()`로 복사한다
      (Clipboard API의 `ClipboardItem`은 PNG를 가장 안정적으로 지원해서, Gemini가
      다른 mimeType을 반환해도 항상 PNG로 맞춤). 미리보기와 "클립보드에 다시 복사"
      버튼도 추가함.
- [x] AI 생성 UI(텍스트) — 2026-09-21 실사용 검증 완료. 1단계 데스크톱 앱과 동일한
      `/api/naver-blog-auto-poster/generate`를 그대로 재사용(본인 OpenAI 키로 서버가
      대신 호출, 1차 초안+2차 셀프 리뷰). 이미지 생성은 바로 위 항목으로 이어서 구현함.
- [x] 에디터 구조 분석 도구 (유지보수용) — 2026-09-21 구현·실사용 검증 완료(실제 화면
      구조가 정상적으로 캡처됨, 기존 셀렉터들이 여전히 유효함을 재확인). 1단계
      데스크톱 앱의
      `blogEditorInspector.js`와 같은 목적 — 네이버가 화면을 바꿔서 자동 입력이 안 될
      때, 추측 대신 실제 구조를 캡처해서 확인하기 위함(AGENTS.md "추측하지 말고
      실측한다" 원칙). 확장은 파일 시스템이 없어서 로컬 JSON 저장 대신 결과를 사이드
      패널의 읽기 전용 textarea에 표시해서 복사하게 함. 확인하려는 화면(제목/본문 또는
      발행 설정창)을 먼저 클릭해서 열어둔 상태에서 실행해야 한다 — 클릭 시 동적으로
      생기는 iframe(주의 4 참고) 등은 열어보기 전엔 안 잡히기 때문. **일반 사용자에게는
      노출하지 않음(2026-09-21 사용자 지시)** — 연동된 계정이 관리자(`profiles.is_admin`)
      일 때만 보이도록 `whoami` 응답에 `isAdmin` 필드를 추가하고
      (`lib/personalAccessTokenAuth.ts`), 확장은 그 값에 따라 `#admin-only-section`을
      보이거나 숨긴다.
- [x] Chrome 웹스토어 개발자 계정 등록 — 2026-09-21 사용자가 직접 완료(게시자 ID
      `e6d370e8-c375-4762-b06f-cd73a294d114`, 계정 `buylifemall@gmail.com`). **배포
      방식 결정**: 지금 바로 정식 심사에 올리지 않고, 당분간 "압축해제된 확장 프로그램
      로드" 방식으로 계속 기능을 추가/개선한 뒤, 버전이 안정화되면 그때 정식 제출해서
      심사를 받는다(업데이트마다 재심사, 비공개 Unlisted라 비교적 빠르지만 즉시는 아님).
- [x] zip 패키징 + GitHub Releases 배포 + 루트 앱 다운로드 페이지 연동 — 2026-09-21
      완료. `Compress-Archive`(PowerShell)로 이 폴더 전체를 압축해 동봉한
      `설치방법.txt`와 함께 `gh release upload`로 데스크톱 앱과 같은 GitHub Release에
      자산으로 추가. 루트 앱의 `app/(dashboard)/naver-blog-auto-poster/page.tsx`에
      데스크톱 앱 다운로드 버튼 바로 아래 "웹버전(크롬 확장) 다운로드" 섹션 + 단계별
      사용법 + 하단 "📖 연동 매뉴얼"(OpenAI/Gemini API 키 발급 안내)까지 추가.
- [x] 폴더 완전 분리 — 2026-09-21. 원래 `naver-blog-auto-poster/extension/` 하위
      폴더였던 것을 `naver-blog-auto-poster_web/`(이 폴더)로 독립시키고, 데스크톱 앱은
      `naver-blog-auto-poster_app/`으로 옮김. 사용자가 유지보수 편의를 위해 명시적으로
      요청함 — 코드/문서는 완전히 분리하되, `programs` 테이블의 이용권한·요금제는 계속
      공유한다(§0, `../naver-blog-auto-poster_app/README.md`의 "AIMaster 계정 연동
      아키텍처" 절 참고).
- [ ] Chrome 웹스토어 정식 제출 — 아이콘, 스토어 설명 문구, 개인정보처리방침 등 준비
      필요. 버전 안정화 후 진행(위 항목 참고).
