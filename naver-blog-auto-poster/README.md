# 네이버 블로그 자동화 (기획 단계)

네이버는 블로그 포스팅 공식 API를 제공하지 않는다. 그래서 다른 서브프로젝트들(threads,
naver-cafe-poster 등)처럼 OAuth+공식 API로 구현할 수 없고, 실제 네이버 블로그 글쓰기 화면을
"자동화 도구가 대신 조작"하는 방식으로 가야 한다. 이 폴더는 아직 코드가 없는 **기획/조사
단계** 산출물이다 — 실제 구현은 아래 작업 리스트를 순서대로 진행하면서 채워나간다.

## 진행 순서 (사용자 결정, 2026-09-12)

1. **1단계 — 데스크톱 앱 버전을 먼저 만든다.**
2. **2단계 — 크롬 확장 버전은 그 이후 별도로 진행한다.**

데스크톱 앱을 먼저 하는 이유: 크롬 확장은 배포하려면 Chrome 웹스토어 등록·심사(또는 최소
비공개 Unlisted 등록)를 거쳐야 하는데, 데스크톱 앱(Electron + Playwright)은 그 과정 없이
바로 배포·반복 테스트가 가능해서 빠르게 검증하기 좋다.

## 조사한 참고 사례 2건

### ① Easy-peasy SNS (크롬 확장, 사이드패널 방식)
- 크롬 웹스토어: https://chromewebstore.google.com/detail/easy-peasy-sns-%E2%80%94-ai-writi/jgfdeppnjijgddbledcbhgiinddkcjem
- 참고 영상: https://www.youtube.com/watch?v=223Z4N3F43E
- Chrome Side Panel을 기본 UI로 씀 — 왼쪽엔 실제 사이트(네이버 블로그 글쓰기 창), 오른쪽엔
  확장의 사이드패널(주제 입력→AI 생성→수정 UI).
- AI는 **API 키가 아니라 사용자의 로그인된 Gemini/ChatGPT 웹 세션을 그대로 자동화**해서 쓴다
  (API 비용 0원, 대신 AI 서비스 자체 이용약관상 자동화 접근 금지 소지가 있음 — 우리는 이
  방식은 안 쓰고 공식 API+본인 키로 갈 것).
- 생성 파이프라인: 1차 호출(초안 작성) → 2차 호출(그 초안을 AI에게 다시 줘서 오류/이상한
  점 수정 요청) — 셀프 리뷰 2단계 구조.
- 이미지는 AI가 본문 분석 후 "몇 장 필요한지" 스스로 판단해서 순차 생성.
- "네이버 글쓰기 창에 넣기" 버튼 하나로 제목·본문·이미지·태그를 에디터 DOM에 한 번에 주입.
- 개발자 본인이 "네이버가 레이아웃 바꿀 때마다 수정이 필요하다"고 영상에서 직접 인정 —
  DOM 자동화의 근본적 유지보수 부담을 보여주는 사례.

### ② blogauto-naver (Electron 데스크톱 앱, Playwright 방식) — 1단계에서 참고할 주 사례
- GitHub: https://github.com/boksajang/blogauto-naver
- 참고 영상: https://www.youtube.com/watch?v=9hAcDsqHlR4
- **기술 스택**: Electron(데스크톱 UI) + `playwright-core`(실제 브라우저 자동화). 크롬
  확장이 아니라 독립 실행 프로그램(.exe, Windows 포터블 빌드)이라 **Chrome 웹스토어가
  아예 필요 없다**.
- **세션 재사용**: `chromium.launchPersistentContext(profileDir)`로 로컬에 브라우저
  프로필을 유지 — 최초 1회만 사용자가 직접 로그인(보안인증 포함)하고, 이후엔 그 쿠키를
  그대로 재사용. `detectLoginState()`가 "로그인 필요 / 보안확인 필요 / 정상" 3단계로
  세션 상태를 판별해서 필요할 때만 재로그인 유도.
- **DOM 자동화 안정성 확보 방식** (`src/lib/naverPublisher.js`):
  - 셀렉터를 하나만 쓰지 않고 여러 후보를 순서대로 시도 (`.se-title-text`,
    `textarea[placeholder*='제목']` 등)
  - 네이버 에디터가 iframe을 많이 써서 `page.frames()`로 모든 프레임을 순회하며 요소 탐색
  - 팝업(`[data-group='popupLayer']`) 자동 감지·제거
  - `humanType()`으로 75~120ms 랜덤 지연을 주며 타이핑 — 봇 탐지 회피 목적
  - 작업 중 세션이 끊기면(보안 확인 화면 등) 감지해서 재로그인 유도, 복구 실패 시
    "처음부터 재작성 필요" 에러로 명확히 실패 처리(어정쩡하게 계속 진행하지 않음)
- **AI 비용 처리**: OpenAI API 키(종량제)가 아니라 **Codex를 ChatGPT 계정 로그인으로
  사용** — Codex CLI의 공식 ChatGPT 계정 인증 방식이라 API처럼 사용량만큼 과금되는 게
  아니라 사용자의 ChatGPT 플랜에 포함된 사용량을 쓴다(단, 기본 제공량 초과 시 생성 불가).
- **멀티 에이전트 파이프라인**: Research/Title Agent(주제 조사·근거 확보) → Writer
  Agent(본문 작성) → Main Review Agent(내용 검증) → Image Worker(이미지 생성) → 발행.
  정책·가격·일정처럼 정확성이 중요한 내용은 공식 자료 기준으로 리서치하도록 별도 단계를 둠.
- **한계**: 현재 Windows 전용, 코드서명 없는 .exe라 SmartScreen 경고 가능성, 네이버 UI
  변경에 여전히 취약(개발자 본인도 인정).

## 우리 프로젝트에 적용할 설계 원칙 (지금까지 대화에서 결정된 것)

1. **100% 완전 자동화가 아니라 단계별로 사용자가 통제할 수 있게 한다.**
   생성된 초안(제목/본문/이미지/태그)을 사용자가 자유롭게 수정한 뒤, 그 최종본만 네이버
   블로그 글쓰기 화면으로 넘기는 구조. "발행" 버튼은 되도록 사람이 직접 누르게 남겨서
   완전 무인 자동 게시가 아니라 "작성 보조 도구" 포지션을 유지한다(threads-affiliate-poster
   와 동일한 원칙 — 사람이 최종 확인 후 게시).
2. **AI 생성은 본인 API 키로, 공식 API를 통해서만 한다.** Easy-peasy SNS처럼 AI 챗 웹
   UI 자체를 자동화해서 API 비용을 우회하는 방식은 쓰지 않는다 — 이 플랫폼 전체 원칙(본인
   키만 사용, 폴백 없음)과 AI 제공사 이용약관 준수를 그대로 지킨다.
3. **네이버 계정/세션은 사용자 본인 것만 쓴다.** 계정 공유나 대리 로그인 없음. 계정 제재
   리스크는 자동화 도구를 쓰는 회원 본인이 감수하는 것이라는 점을 UI에 명시해야 한다.
4. **DOM 자동화는 blogauto-naver의 안정성 패턴(다중 후보 셀렉터, 프레임 순회, 세션 상태
   감지, 사람과 유사한 입력 속도)을 참고해서 처음부터 견고하게 설계한다** — 사후에 땜질하지
   않는다.
5. **(절대 불변 원칙, 2026-09-20 사용자 명시적 지시) 네이버 봇 탐지에 걸리지 않도록 세심하고
   정확하게 만든다 — 이 저장소를 이어받는 모든 세션(Codex/Gemini 포함)에 예외 없이 적용.**
   - 텍스트 입력은 `fill()`/`evaluate()`로 값을 한 번에 넣지 않고, 반드시 실제 클릭으로
     포커스를 옮긴 뒤 `src/lib/humanInput.js`의 `humanType`/`clickAndType`처럼 한 글자씩
     무작위 간격(70~170ms, 가끔 250~700ms의 "생각하는 시간")으로 타이핑한다.
   - 새 자동 입력 기능을 추가할 때도 이 두 헬퍼를 재사용한다 — 값 대입 방식으로 절대
     되돌아가지 않는다.
   - 글쓰기 화면에는 네이버의 봇 탐지용 iframe(`wtm.pstatic.net/.../iframe.html`, title
     "nCaptcha")이 상시 로드되어 있음을 확인했다(프로토타입 2). 보안 확인 화면이 뜨면
     `naverSession.js`의 `security_check` 판별 로직대로 사람이 직접 완료하게 하고, 절대
     자동으로 우회/통과시키려 하지 않는다.
   - **검수(코드 리뷰) 시에도 이 기준을 최우선으로 확인한다**: 새로 추가된 자동 입력 코드가
     `humanType`/`clickAndType`를 거치지 않고 값을 즉시 채워 넣는 부분이 있는지, 클릭 없이
     바로 포커스나 값을 조작하는 부분이 있는지 검수 때마다 확인한다.

## 참고 저장소 분석 (2026-09-20)

`boksajang/blogauto-naver`를 클론해서 실제 소스(`main.js`/`naverPublisher.js`/`codexRunner.js`
등)를 전부 읽고 분석했다 — **이 저장소는 LICENSE 파일이 없어 코드를 그대로 복사하지 않고,
검증된 기법(다중 후보 셀렉터, iframe 순회, 로그인 3단계 판별, 사람 같은 타이핑 속도, 세션
복구)만 참고해서 우리 코드로 새로 작성한다.** 분석 후 클론은 삭제했다.

**우리가 그대로 안 가져가는 부분(AIMaster 원칙과 충돌)**: 이 참고 저장소는 AI 생성을
API 키가 아니라 **Codex CLI를 ChatGPT 계정 세션으로 실행**해서 처리한다 — 이건 "본인 API
키로 공식 API만 쓴다"는 이 플랫폼의 원칙(위 "설계 원칙" 2번)과 정면으로 어긋난다. 멀티에이전트
파이프라인 구조(Research/Title → Writer → Review → Image)라는 **아이디어**는 유지하되,
실행은 OpenAI/Gemini 공식 API + `user_api_keys`로 바꾼다.

**배포 방식 결정**: 완성된 실행파일(.exe)은 Supabase Storage가 아니라 **GitHub Releases**에
올린다 — `BUYLIFEMALL/aimaster` 저장소가 Public이라 인증 없이 바로 다운로드되고, Supabase는
이미 Free 플랜 저장공간이 빠듯해서(§ 다른 서브프로젝트 작업 중 확인) 70~100MB급 실행파일을
감당하기 부담스럽다.

**AIMaster 계정 연동 방식 결정**: 데스크톱 앱 안에 이메일/비밀번호 로그인 폼을 새로 만들지
않고, **"웹(buylife.xyz)에서 로그인 → 발급된 토큰을 데스크톱 앱에 붙여넣기"** 방식으로 간다.
아직 토큰 발급 화면은 안 만들었음 — AI 생성 단계(본인 API 키 조회가 필요해지는 시점)에서
같이 설계할 것.

## 프로토타입 2 조사 결과 (2026-09-20, 셀렉터 조사)

실제 계정으로 글쓰기 화면을 직접 열어서 확인한 실제 DOM 구조. **네이버가 언제든 클래스명을
바꿀 수 있으므로, 실제 구현 시 아래 셀렉터를 1순위로 쓰되 반드시 다중 후보 + 예외 처리를
같이 넣는다** (설계 원칙 4번).

- **글쓰기 화면 진입 경로**: `https://blog.naver.com/<blogId>` 메인 페이지 안에
  `iframe[src*="PostWriteForm.naver"]`가 실제 에디터. URL을 직접 하드코딩해서 이동하지 않고,
  사람처럼 "내 블로그 → 글쓰기" 순서로 클릭해서 들어가는 편이 안전하다(파라미터가 많고
  세션/카테고리 상태에 따라 달라짐).
- **제목**: `.se-documentTitle` (제목 영역 컨테이너) 안의 `.se-title-text` 모듈이 실제
  입력 대상. `value` 직접 대입이 안 되는 리치 텍스트 영역이므로, 클릭해서 포커스 → 사람처럼
  타이핑(keyboard.type)하는 방식으로 입력해야 한다.
- **본문**: `.se-body` 컨테이너 안에 문단마다 `.se-text-paragraph`(`<p>` 태그, 실제 텍스트는
  그 안의 `.se-component-content`)가 생성된다. 마찬가지로 클릭 후 타이핑 방식.
  **주의(2026-09-20 실사용 테스트에서 두 차례 발견한 버그)**: `.se-text-paragraph` 클래스는
  본문 전용이 아니라 **제목 모듈도 내부적으로 재사용**한다. 셀렉터를 단독으로 쓰면 DOM
  순서상 제목의 문단이 먼저 걸려서 "본문 클릭"이 실제로는 제목을 다시 클릭하는 사고가 난다
  (본문 첫 줄이 제목 뒤에 그대로 붙어버리는 결과로 실제 확인함). **`.se-body`로 범위를
  좁히는 것도 소용없다 — `.se-body`는 본문 전용 컨테이너가 아니라 제목까지 포함한 문서
  전체 컨테이너였다.** 올바른 방법은 `.se-text-paragraph` 후보들을 순서대로 확인하며
  `.closest(".se-documentTitle")`이 없는(=제목 안이 아닌) 첫 번째 요소를 찾는 것이다
  (`src/lib/naverBlogAutomation.js` 참고). 컨테이너 셀렉터로 범위를 좁히려는 시도는 이
  화면에서 두 번 다 틀렸다는 걸 기억할 것.
- **이미지 업로드**: 캡처 시점엔 `input[type=file]`이 화면에 없었다 — "사진 추가" 툴바 버튼
  (`.se-image-toolbar-button`)을 누르면 그때 OS 파일 선택 창이 뜨는 방식으로 추정된다.
  Playwright에서는 `page.waitForEvent("filechooser")`로 그 네이티브 다이얼로그를 가로채서
  파일 경로를 넘기는 방식으로 구현해야 한다(히든 input을 직접 채우는 방식이 아님).
- **저장/발행 버튼**: `.save_btn__FuUyN`(저장, 임시저장) / `.publish_btn__v_kS9`(발행 —
  누르면 바로 게시되는 게 아니라 발행 설정 레이어가 뜸) / `.reserve_btn__Yc1V8`(예약 발행).
- **태그**: 발행 버튼을 눌러야 뜨는 설정 레이어 안에 `#tag-input`(`input[type=text]`,
  placeholder "태그 입력 (최대 30개)")가 실제 입력창. 일반 input이라 `.fill()`로 바로 채울 수
  있을 것으로 보인다(리치 텍스트 아님).
- **카테고리**: 발행 설정 레이어 안의 `.selectbox_button__IxraO` 버튼이 현재 선택된 카테고리를
  보여주며(예: "●여행/핫플레이스") 클릭하면 `.option_list_layer__o54Wx` > `.list__QTq8Z`(UL)
  > `.item__dTdzo`(LI, 라디오+라벨 포함) 목록이 열린다. 항목 텍스트 앞에 카테고리별 색상
  기호(●◆★▶)가 붙어 있어서, 완전 일치 대신 부분 포함으로 찾아서 클릭한다
  (`src/lib/naverBlogAutomation.js`의 `selectCategory` 참고).
- **주의**: 글쓰기 화면에 네이버의 봇 탐지용 iframe(`wtm.pstatic.net/.../iframe.html`,
  title "nCaptcha")이 상시 로드되어 있는 것을 확인함 — 참고 저장소가 강조한 "사람처럼 느리게
  타이핑"(`humanType`, 75~120ms 랜덤 지연) 방식을 실제 구현 때 그대로 적용해야 한다.

## 작업 리스트 (1단계: 데스크톱 앱)

- [x] 기술 스택 확정: Electron + `playwright-core`(`channel: "chrome"`로 시스템 크롬 재사용)
- [x] 프로토타입 1 — 네이버 로그인 세션 유지 검증: `src/lib/naverSession.js` +
      `src/main.js`/`src/renderer/`에 최소 UI로 구현. `launchPersistentContext`로
      계정별 프로필(`runtime/browser-profiles/<accountKey>`)에 세션 저장, 아이디/비밀번호는
      절대 자동 입력하지 않고 로그인/보안확인은 사람이 직접 완료하도록 대기만 한다(3단계
      판별: `login_required`/`security_check`/`logged_in`). **2026-09-20 실제 데스크톱에서
      검증 완료**: `npm start` → 로그인(단, 네이버 로그인 화면의 "로그인 상태 유지" 체크박스를
      반드시 체크해야 함 — 안 하면 세션 쿠키가 브라우저 종료 시 같이 삭제되어 재로그인 없이
      유지되지 않는 걸 실제로 재현·확인함) → 앱 완전 종료 후 재시작 → 재로그인 없이 바로
      로그인 상태로 확인됨.
- [x] 프로토타입 2 — 네이버 블로그 글쓰기 에디터 셀렉터 조사: `src/lib/blogEditorInspector.js`로
      실제 화면 구조를 로컬 JSON으로 캡처해서 조사 완료(2026-09-20). 아래 "프로토타입 2 조사
      결과" 참고.
- [x] AIMaster 계정 연동("웹 로그인 → 토큰 붙여넣기") — 2026-09-20 구현·검증 완료.
      실제 데스크톱에서 토큰 발급 → 앱에 붙여넣기 → "연동됨: 계정 이메일" 표시까지 확인함
      (www 리다이렉트로 인증 헤더가 사라지던 버그 수정 후 정상 동작). 아래 "AIMaster 계정
      연동 아키텍처" 참고.
- [x] AI 생성 파이프라인 (1차, 제목+본문) — 2026-09-20 구현·검증 완료. 주제 입력 → 제목+본문
      생성 → "1단계: 초안 작성" 입력창에 자동 채움. 본인 OpenAI API 키 등록(기존
      `user_api_keys` 공용 테이블 재사용, 새로 만들지 않음) — 계정 연동 토큰으로 인증된
      루트 앱의 `/api/naver-blog-auto-poster/generate`가 서버에서 `resolveApiKey()`로
      키를 조회해 OpenAI를 호출하고, 데스크톱 앱에는 생성 결과(제목/본문 텍스트)만
      돌려준다(원문 API 키는 데스크톱 앱에 절대 내려주지 않는다 — 다른 서브프로젝트와
      동일한 "본인 키는 서버에서만 사용" 원칙, CLAUDE.md 멀티테넌시 3번 참고). 실제
      데스크톱에서 주제 입력 → 생성 → "1단계: 초안 작성" 입력창에 정상적으로 채워지는
      것을 확인함.
- [x] AI 생성 파이프라인 (2차, 셀프 리뷰 + 이미지) — 2026-09-20 구현 완료.
      `lib/naverBlogAutoPoster/generate.ts`에 1차 초안 → 2차 셀프 리뷰(오탈자/어색한 문장
      다듬기, Easy-peasy SNS 참고 사례의 2단계 구조) 추가. `includeImage` 체크 시
      Gemini(나노바나나)로 주제에 맞는 사진도 함께 생성(`lib/naverBlogAutoPoster/generateImage.ts`,
      docs/PLATFORM_PATTERNS.md §12 패턴 재사용) — 서버는 base64만 반환하고, 데스크톱
      앱이 이를 `runtime/generated-images/`에 파일로 저장해서 기존 `insertImage()`가
      바로 쓸 수 있게 한다(Playwright의 이미지 삽입은 실제 파일 경로가 필요해서 base64를
      직접 못 씀). Gemini 키 미등록/생성 실패는 텍스트 생성 자체를 막지 않고
      `imageError`로만 알려준다. 이미지 모델은 blog 서브프로젝트의 나노바나나 모델별
      선택 방식(`utils/news/nanoBananaConfig.ts`/`imageGenerator.ts`)을 그대로 재사용해
      4가지 옵션(NanoBanana 2-2K 추천/2-4K/Pro/Standard)을 드롭다운으로 고를 수 있게
      함(`lib/naverBlogAutoPoster/nanoBananaConfig.ts`). **2026-09-21 실제 데스크톱에서
      검증 완료**: 모델 선택 → 이미지 포함 생성 → 네이버 화면에 제목/본문/이미지까지
      전부 정상적으로 들어가는 것을 확인함.
- [x] 프로토타입 3 — 제목/본문 자동 입력: `src/lib/humanInput.js`(사람처럼 한 글자씩 타이핑)
      + `src/lib/naverBlogAutomation.js`(`fillTitleAndBody`)로 구현. 앱 UI에 제목/본문
      입력창과 "네이버에 자동 입력" 버튼을 추가함. 발행/저장 버튼은 절대 대신 누르지 않음 —
      결과 확인 후 사람이 직접 발행. **2026-09-20 실제 데스크톱에서 검증 완료**: 두 차례
      버그(제목/본문 문단 셀렉터 혼동, 위 "프로토타입 2 조사 결과" 참고)를 고친 뒤 제목엔
      제목만, 본문엔 본문만 정확히 들어가는 것을 확인함.
- [x] 사용자 편집 UI — 2026-09-21 구현 완료. 제목/본문은 이미 입력창이라 처음부터
      자유롭게 수정 가능했고, 빠져 있던 건 **이미지 미리보기**였다 — AI가 만든 이미지가
      화면에 아예 안 보인 채 체크박스만 자동으로 켜지던 것을 고쳐서, 생성 직후
      "1단계: 초안 작성" 아래에 실제 이미지를 보여주고 "이미지 지우기" 버튼으로
      빼거나(그러면 1단계 실행 시 기존처럼 파일 선택창이 뜸) 그대로 쓸 수 있게 함
      (`imageDataUrl`을 렌더러에 같이 내려줌 — 실제 파일 경로는 Playwright 삽입 전용이라
      contextIsolation 렌더러가 직접 못 읽음). 본문 입력창도 8줄로 넓힘. **2026-09-21
      실제 데스크톱에서 검증 완료**: 미리보기/지우기, 지운 뒤 수동 파일 선택창으로
      정상 복귀하는 것까지 확인함.
- [x] 네이버 자동 삽입 기능 확장 (1/2) — 이미지 업로드: `insertImage()`로 구현.
      Playwright가 OS 파일창을 가로채므로, `dialog.showOpenDialog`로 앱이 먼저 사용자에게
      직접 파일을 물어본 뒤 그 경로를 `filechooser` 이벤트에 넘기는 방식. **2026-09-20
      실제 데스크톱에서 검증 완료**: 이미지가 본문에 정상적으로 삽입되는 것을 확인함.
- [x] 네이버 자동 삽입 기능 확장 (2/2, 태그) — `fillTags()`로 구현. "발행" 버튼은 사람이
      직접 눌러서 발행 설정창을 여는 것을 전제로 하고(이 앱이 대신 누르지 않음), 그 안의
      `#tag-input`에 쉼표로 구분한 태그를 하나씩 사람처럼 입력한다. **2026-09-20 실제
      데스크톱에서 검증 완료**: 태그가 정상적으로 입력되는 것을 확인함.
- [x] 카테고리 선택 — `selectCategory()`로 구현. 드롭다운이 닫혀 있으면 먼저 열고, 이름이
      일치하는 항목(부분 포함 검색)을 찾아 클릭한다. **2026-09-20 실제 데스크톱에서 검증
      완료**: 정확한 카테고리가 선택되는 것을 확인함.
- [x] 5가지(제목/본문/이미지/태그/카테고리) 자동 입력을 2단계로 통합함(2026-09-20). 앱
      UI도 2개 버튼("1단계 시작"/"2단계 시작")으로 재구성:
      - **1단계 — 초안 작성** (`runDraftStep()`): 제목+본문+(선택)이미지. "발행" 버튼을
        열기 전에 하는 작업이라 준비 없이 바로 실행 가능.
      - **2단계 — 발행 정보 입력** (`runPublishSettingsStep()`): 태그+(선택)카테고리.
        반드시 사람이 먼저 브라우저 창에서 "발행" 버튼을 직접 눌러 발행 설정창을 연
        뒤에 실행해야 함 — 이 앱은 그 버튼을 절대 대신 누르지 않는다(설계 원칙 1번).
      완전히 하나로(5가지 전부 한 클릭) 합치지 않은 이유: "발행" 버튼(설정창을 여는
      버튼)까지 앱이 대신 누르게 되면 사람이 최종 확인 없이 진행되는 범위가 넓어져서,
      2026-09-20 사용자가 명시적으로 "사람이 발행 버튼을 직접 누르는" 방식을 선택함.
- [x] 실제 계정으로 end-to-end 테스트 — 2026-09-21 완료. 로그인 → AI 생성(제목/본문/
      이미지) → 수정 → 1단계 자동 삽입 → 사람이 직접 "발행" 버튼 클릭 → 2단계로
      태그/카테고리 입력 → 사람이 직접 최종 발행까지 실제로 실행해서 실제 게시물이
      정상적으로(카테고리·태그 포함) 올라간 것을 확인함. 프로토타입 1단계(데스크톱 앱)의
      핵심 기능이 전부 실사용 검증 완료됨.
- [x] 배포 준비 (1/2, 패키징) — 2026-09-21 완료·검증. `npm run dist`(electron-builder,
      기존 설정 그대로 재사용)로 포터블 exe(`AIMaster-Naver-Blog-Auto-Poster-0.1.0.exe`,
      약 70MB) 생성. 패키지된 실행 파일은 개발 모드(`npm start`)와 저장 위치가 다르다는
      점 확인함 — `getRuntimeRoot()`가 `app.isPackaged` 여부로 개발 중엔 프로젝트 폴더
      안 `runtime/`, 패키지 후엔 `app.getPath("userData")/runtime`을 쓰도록 이미 설계돼
      있어서, 패키지 버전에서는 AIMaster 계정 연동과 네이버 로그인을 처음 한 번 새로
      해야 하는 게 정상 동작임(다른 사용자 컴퓨터에 배포됐을 때와 동일한 상황). 실제로
      계정 연동 → 네이버 로그인 → AI 초안 생성(이미지 포함)까지 패키지된 exe에서 전부
      정상 동작하는 것을 확인함.
- [x] 배포 준비 (2/2, GitHub Releases 업로드) — 2026-09-21 완료. GitHub CLI(`gh`)를
      설치·인증(계정: BUYLIFEMALL)한 뒤 `naver-blog-auto-poster-v0.1.0` 태그로 릴리스
      생성, `AIMaster-Naver-Blog-Auto-Poster-0.1.0.exe`(70MB) 첨부.
      https://github.com/BUYLIFEMALL/aimaster/releases/tag/naver-blog-auto-poster-v0.1.0
- [x] 공개 판매 전환 — 2026-09-21 완료. `programs.is_active=true`로 전환
      (`supabase/migrations/0009_...`), 카탈로그 노출용 문구/썸네일 갱신
      (`scripts/generate-program-thumbnail.mjs` 재사용, docs/PLATFORM_PATTERNS.md
      §12/13). 로그인-only였던 체크를 실제 이용 권한 확인으로 교체함:
      - `app/(dashboard)/naver-blog-auto-poster/page.tsx` — `checkProgramAccess()`로
        교체, GitHub Release exe 다운로드 버튼 추가.
      - `/api/naver-blog-auto-poster/{whoami,generate}` — 새로 만든
        `lib/personalAccessTokenAuth.ts`의 `verifyPersonalAccessTokenWithProgramAccess()`
        (토큰 검증 + `checkProgramAccess()`를 합친 함수)로 교체.
      https://www.buylife.xyz/programs/naver-blog-auto-poster 에서 정상 노출 확인함.

## AIMaster 계정 연동 아키텍처 (2026-09-20)

데스크톱 앱에 이메일/비밀번호 로그인 폼을 만들지 않고, "루트 AIMaster 웹사이트에서
로그인 → 토큰 발급 → 앱에 붙여넣기" 방식으로 연동한다. 구현은 전부 **루트 AIMaster
저장소**(이 폴더 밖, `D:\Antigravity\AIMaster` 최상위) 쪽에 있다 — 이 앱만 봐서는 안
보이니 다른 세션에서 이어받을 때 주의할 것.

- **DB**: `personal_access_tokens` 테이블(루트 `supabase/migrations/0008_...`) — 범용
  설계라 향후 다른 데스크톱 앱도 `program_slug`만 다르게 해서 재사용한다. 토큰은
  발급 시 평문을 한 번만 보여주고 해시(sha256)만 저장한다.
- **프로그램 등록**: `programs` 테이블에 `naver-blog-auto-poster` slug로 등록됨(루트
  `supabase/migrations/0007_...`). **2026-09-21 공개 판매 전환 완료** —
  `is_active=true`(루트 `supabase/migrations/0009_...`), 요금제(1/2/3개월)도 이미
  등록돼 있어 카탈로그에서 바로 구독 가능.
- **토큰 발급 UI**: 루트 앱의 `app/(dashboard)/naver-blog-auto-poster/page.tsx` +
  `TokenManager.tsx`. `checkProgramAccess()`로 실제 이용 권한(구독/개별부여/등급)을
  확인하고, 미보유 시 `/programs/naver-blog-auto-poster`(구매 페이지)로 돌려보낸다.
  GitHub Release exe로 바로 가는 다운로드 버튼도 이 페이지에 있음.
- **토큰 검증 API**: 루트 앱의 `app/api/naver-blog-auto-poster/whoami/route.ts` +
  `generate/route.ts`. 둘 다 `lib/personalAccessTokenAuth.ts`의
  `verifyPersonalAccessTokenWithProgramAccess()`(토큰 해시 조회 + `checkProgramAccess()`
  를 합친 함수)로 "토큰 유효성"과 "실제 이용 권한"을 함께 확인한다 — redirect 없이
  JSON으로만 응답(`checkProgramAccessApi` 스타일).
- **데스크톱 앱 쪽**: `src/lib/appConfig.js`가 토큰을 `runtime/config.json`(gitignore됨)에
  로컬 저장하고, `src/main.js`의 `aimaster:getStatus`/`aimaster:setToken`이 저장 전에
  바로 `/whoami`를 호출해 유효성을 확인한다.
- **주의(2026-09-20 실사용 테스트에서 발견한 버그)**: 루트 사이트 주소를 `https://buylife.xyz`
  (www 없음)로 쓰면 서버가 `https://www.buylife.xyz`로 307 리다이렉트하는데, Node의 fetch가
  이 리다이렉트를 따라가면서 "다른 하위 도메인으로 이동"으로 판단해 `Authorization` 헤더를
  자동으로 떼어내 버린다 — 그 결과 서버는 헤더가 아예 없는 것으로 보고 401을 반환했다.
  **반드시 `www.buylife.xyz`까지 정확히 써서 리다이렉트 자체가 발생하지 않게 할 것**
  (`src/main.js`의 `AIMASTER_BASE_URL` 참고). 앞으로 이 플랫폼의 다른 곳에서 서버 간
  API를 호출하는 코드를 짤 때도 이 리다이렉트 함정을 기억할 것.

## 2단계: 크롬 확장 버전

1단계(데스크톱 앱) 완료 후 착수(2026-09-21). Easy-peasy SNS의 사이드패널 구조를
참고하되, AI 생성·계정 연동은 1단계와 **동일한 백엔드를 그대로 재사용**한다 — 새 프로그램
등록 없이 같은 `naver-blog-auto-poster` 카탈로그 항목의 또 다른 배포 형태로 취급한다.
코드는 `naver-blog-auto-poster/extension/`(Manifest V3, 사이드패널) 폴더에 둔다. 배포는
Chrome 웹스토어 비공개(Unlisted) 등록 방식을 검토한다.

**1단계와 구조적으로 다른 점**: 데스크톱 앱은 Playwright가 별도 브라우저를 "바깥에서
원격 조종"하지만(CDP 기반, 실제 키보드 입력과 거의 동일하게 전달됨), 크롬 확장은 사용자의
평소 크롬 창 안에서 **그 페이지 자신의 자바스크립트로 직접 DOM을 조작**한다. 이 차이 때문에
`humanInput.js`의 타이핑 방식을 그대로 가져다 쓸 수 없다 — 확장에서 스크립트로 발생시킨
입력 이벤트는 `isTrusted: false`로 남아서 진짜 사용자 입력과 구분될 수 있다. **본문/제목
자동 입력 기능을 만들 때 이 부분부터 별도로 조사·설계할 것** (docs/PLATFORM_PATTERNS.md
§19의 원칙은 여전히 적용되지만, 구현 방법은 데스크톱 버전과 다르게 다시 검증해야 한다).

### 작업 리스트 (2단계: 크롬 확장)
- [x] 프로토타입 1 — 사이드패널 스캐폴딩 + AIMaster 계정 연동: `extension/manifest.json`
      (Manifest V3, `sidePanel` 권한) + `background.js`(액션 클릭 시 사이드패널 열기) +
      `sidepanel.html`/`sidepanel.js`(데스크톱 앱과 같은 `personal_access_tokens` 백엔드
      재사용, 토큰은 `chrome.storage.local`에 저장). **2026-09-21 실제 크롬에서 검증
      완료**: 압축해제된 확장 로드 → 사이드패널 정상 표시 → 데스크톱 앱과 같은 토큰으로
      계정 연동까지 정상 동작하는 것을 확인함.
- [ ] 프로토타입 2 — 네이버 블로그 글쓰기 화면에서 제목/본문 자동 입력: 구현 완료,
      **실사용 검증 대기 중**. `chrome.scripting.executeScript`로 활성 탭의 모든
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
      안 되면 정확히 어느 지점이 문제인지 바로 알 수 있게 함. **아직 실사용 재검증
      전** — 다음 테스트 결과에 따라 계속 반복 조사할 것.
- [ ] 이미지/태그/카테고리 자동 삽입 (1단계 로직 참고, 확장 환경에 맞게 재구현)
- [ ] AI 생성 UI (1단계와 동일한 `/api/naver-blog-auto-poster/generate` 재사용)
- [ ] Chrome 웹스토어 등록(비공개 Unlisted) 검토 및 배포
