# AI 슬라이드 자동화 (ai-slide-builder) — 개선사항 및 고도화 제안

> **문서 번호**: `IMP-20261019-71`  
> **프로그램**: 71번 AI 슬라이드 자동화 (`ai-slide-builder`)  
> **현재 버전**: `v1.10`  
> **작성 일자**: 2026-10-19  
> **작성자**: Antigravity CLI (Windows)

---

## 1. 프로그램 로직 및 기능 개선 (Logic & Feature Improvements)
1. **장표별 컬러 테마 및 브랜드 팔레트 커스텀**:
   - 기업 브랜드에 맞춘 Primary/Secondary 컬러를 지정하면 22종 슬라이드의 모든 도형, 차트, 강조 박스 색상이 일괄 리스타일링되는 기능.
2. **슬라이드 드래그 앤 드롭 순서 변경**:
   - 우측 슬라이드 카드 목록에서 마우스 드래그 앤 드롭으로 장표의 순서를 자유롭게 변경할 수 있는 UI 지원.
3. **Google Slides 직접 API 전송**:
   - PPTX 파일 다운로드 외에도 구글 드라이브/Google Slides API를 연동하여 웹상에서 즉시 슬라이드를 생성하고 공유할 수 있는 다이렉트 퍼블리싱 기능.

---

## 2. 사용자 인터페이스 / UI 가독성 및 사용편리성 개선 (UI/UX Improvements)
1. **전체화면 프레젠테이션 프리뷰어 단축키 (F5)**:
   - 파워포인트 프로그램을 열지 않고도 브라우저 상에서 즉시 16:9 와이드 전체화면 슬라이드쇼 발표를 진행할 수 있는 단축키 모드 지원.
2. **장표별 스피커 노트 글자 크기 조절기**:
   - 발표 대본을 읽기 편하도록 스피커 노트 영역의 폰트 크기 확대/축소 및 복사 버튼 제공.
3. **텍스트 하이라이트 및 키워드 볼드 처리 자동화**:
   - AI가 슬라이드 본문 중 가장 중요한 핵심 수치나 키워드를 자동으로 볼드/컬러 하이라이트하여 청중의 시선 집중 유도.

---

## 3. 현재 만들어져 있는 다른 자동화 프로그램과의 연계 가능한 기능 (Ecosystem Integration)
1. **69번 `landing-architect` (AI 랜딩페이지 기획)과의 연계**:
   - `landing-architect`의 기획안(JSON)을 원클릭으로 불러와 투자자용 IR 피칭 슬라이드나 제품 소개 슬라이드로 자동 변환.
2. **68번 `ai-writing-editor` (AI 글쓰기/카피라이팅)과의 연계**:
   - 슬라이드 내 각 장표의 헤드라인과 요약 카피를 `ai-writing-editor` 엔진으로 보내 설득력 높은 비즈니스 문장으로 정밀 윤문.
3. **76번 `thumbnail-master` / 80번 `banana-canvas`와의 연계**:
   - 슬라이드 표지(`title`) 배경 그래픽이나 장표 삽화 이미지를 `banana-canvas` 및 `thumbnail-master` 툴에서 생성하여 직접 삽입.
- **미배포 대기(2026-10-23, 커밋 `22c6cda35`)**: 좌측 메뉴 계정·로그아웃이 화면 맨 아래로 밀리던 것을 마지막 메뉴 바로 아래(8~16px)로 — `docs/SIDEBAR_LAYOUT_STANDARD.md` 「계정 이메일·로그아웃 위치」(메뉴 `flex-1`/틀 `justify-between`/계정 `mt-auto` 제거). 클래스만 바꿈, tsc 통과. **다음 배포 때 함께 내보내고(버전 +0.01) 데스크톱·휴대폰 폭에서 계정 위치 확인 후 이 줄과 `docs/PENDING_DEPLOYS.md` 줄 지우기.** (Claude Code 윈도우, YOUTUBE Shots v1.38과 같은 수정)

---

## 2026-11-13 전체 점검에서 발견 (정책 담당 세션 `claude-win-20261112-policy`)

기준: 코드 `v1.12`(`src/lib/version.ts`). 이 섹션은 코드를 읽어 확인한 내용이며, 화면을 열어 본 것은 아니다(브라우저 미확인). 상태 「제안」은 아직 구현하지 않은 것이다.

### 1) 프로그램 로직·기능
- **[높음·제안] 권한 판정이 표준 순서와 다르다.** 근거: `src/lib/programAccess.ts:4-45`, `src/lib/access.ts:7-37`. 표준은 정지 → 관리자(`profiles.is_admin`) → 핸드폰 → FREE → 결제 구독 → 등급+사용기간인데, 여기는 정지 → FREE → `user_program_access.expires_at`만 본다. 영향: (가) `expires_at`이 빈(무기한) 부여는 `new Date(null)`이 1970년이라 **만료로 판정돼 차단**된다(`programAccess.ts:42`) (나) 결제 구독(`subscriptions`)만 있는 회원은 차단 (다) 핸드폰 미등록 회원이 FREE일 때 통과 (라) 관리자 판정이 이메일 문자열 비교(`access.ts:16`, `access.ts:33`)이고, `/api/generate`·`/api/analyze`·`/api/regenerate`는 그 예외도 없이 `checkProgramAccess`만 불러 관리자가 부여 줄이 없으면 403. 고칠 때는 다른 프로그램의 표준 `lib/access.ts` 판정을 그대로 가져온다.
- **[높음·제안] PPTX에서 본문이 빠지는 슬라이드 종류가 있다.** 근거: `src/lib/pptxGenerator.ts:34-338`. 전용 처리는 `title`·`section`·`closing`·`compare`·`kpi`·`process`·`processList`·`table` 8개뿐이고, 나머지는 `default`(298줄)에서 `points`·`items`(`title`/`desc`)·`milestones`만 글머리표로 넣는다. 프롬프트 스키마(`src/lib/constants.ts:112-120`)의 `quote`(`text`·`author`), `faq`(`items`의 `q`·`a` → 「: 」만 찍힘), `statsCompare`·`barCompare`(`stats`), `pyramid`(`levels`), `flowChart`(`flows`)는 이 세 필드가 없어 **제목만 있는 빈 슬라이드**가 된다. 화면·소개 문구의 「22가지 전문 시각화 패턴」과 내려받은 파일이 다르다. 영향: 결과물 품질(회원이 바로 보는 부분). 이번에는 매뉴얼에 한계를 적어 두기만 했다.
- **[중간·제안] 키 저장 때 검증을 하지 않는데 문구는 「유효성 검사」라고 한다.** 근거: `src/components/settings/ApiKeyModal.tsx:67`(성공 문구 「검증 및 저장」), 같은 파일 저장 버튼 「API 키 유효성 검사 및 저장」, 서버 `src/app/api/keys/route.ts:22-43`·`src/lib/apiKeys.ts:22-55`는 그대로 저장만 한다. 값싼 모델 목록 호출로 실제 확인을 넣거나 문구를 「저장」으로 바꾼다.
- **[중간·제안] `/api/keys`는 로그인만 확인한다.** 근거: `src/app/api/keys/route.ts:5-10`, `:22-27`(`getCurrentUser`만). 공용 키 표에 쓰는 API이므로 `checkProgramAccessApi()`로 맞추는 것이 원칙(멀티테넌시 1번). 또 `/api/generate`·`/api/analyze`·`/api/regenerate`·`/api/keys`에는 `dynamic`·`fetchCache` 선언이 없다(POST라 캐시 위험은 낮음, GET `/api/keys`는 넣는 편이 안전).
- **[중간·제안] 만든 슬라이드가 어디에도 저장되지 않는다.** 근거: `src/components/studio/SlideBuilderApp.tsx:20`(`useState`뿐, `localStorage`·DB 호출 없음). 매뉴얼로 이동하는 링크(`<a href="/guide">`)만 눌러도 작업이 사라진다. 최소안: 브라우저 `localStorage`에 마지막 구성안 1건 자동 보관 + 「이어서 하기」. 서버 보관을 넣는다면 회원별 표 + 30일 정리(`retention_exempt` 제외) + 저장공간 규칙을 처음부터 적용.
- **[중간·제안] PDF를 쪽마다 2배율 JPEG로 만들어 한 번에 Gemini로 보낸다.** 근거: `src/lib/fileParser.ts:38-84`, `src/app/api/analyze/route.ts`. 쪽수·용량 제한이 없어 긴 PDF는 요청 본문 한도(Vercel 약 4.5MB)를 넘겨 실패할 수 있다(실패 여부 미확인 — 실제 시험 필요). 쪽수 상한 안내 또는 글자 추출 우선(pdfjs `getTextContent`) 뒤 글자가 없을 때만 그림 방식.
- **[낮음·제안] 전체 일괄 AI 수정은 장수만큼 차례로 호출한다.** 근거: `src/components/studio/SlideEditor.tsx:129-154`. 실행 전 「○장 = ○회 호출」 확인 문구가 없다.
- **[낮음·제안] 바깥 스크립트를 실행 때 CDN에서 받아 온다.** 근거: `src/lib/fileParser.ts:40`(pdf 작업자), `:88`(mammoth), `:112`(`xlsx-latest` — 버전 고정 아님). CDN 장애·버전 변경에 영향을 받는다. 패키지로 넣거나 버전을 고정.

### 2) 화면·가독성·사용 편의
- **[중간·제안] 「🚀 Google 슬라이드 생성기」 링크가 Apps Script 개발용 주소(`…/dev`)다.** 근거: `src/components/studio/ActionFooter.tsx:30`. `/dev` 주소는 보통 스크립트 편집 권한이 있는 계정에서만 열린다(일반 회원 계정에서 열리는지 미확인). 배포용 `/exec` 주소로 바꾸거나, 열리지 않으면 버튼을 내린다. 이 스크립트의 소유 계정·내용도 저장소에 기록이 없다.
- **[낮음·이번에 고침(미배포)] 화면에 박혀 있던 `v1.10`.** `src/components/layout/Sidebar.tsx:75`, `src/components/studio/SlideBuilderApp.tsx:100`, `src/app/guide/GuideClient.tsx`를 `APP_VERSION`으로 바꿨다.
- **[낮음·제안] 도움말 창(`src/components/guide/HelpModal.tsx`)과 `/guide`가 같은 내용을 따로 가진다.** 지원 형식 줄에 MD·XLS가 빠져 있다(`HelpModal.tsx:95`). 한쪽을 고치면 다른 쪽이 어긋나므로 도움말 창은 짧게 줄이고 `/guide`로 보내는 편이 낫다.
- **[낮음·제안] 사이드바 「연동 & 사용 매뉴얼」의 `NEW` 표시**(`Sidebar.tsx:217`)는 10월부터 계속 붙어 있다. `package.json` 버전(`1.10.0`)도 코드 버전과 다르다.

### 3) 다른 자동화 프로그램과 연계
- **[확인] 업무 워크스페이스 → 슬라이드 받기는 이미 있다.** `src/app/api/work-inbox/received/route.ts`, `src/components/studio/WorkInboxPicker.tsx`, `src/lib/workInbox.ts`(공용 표 `work_inbox`, 본인 줄만). 반대 방향(만든 구성안을 워크스페이스·다른 프로그램으로 보내기)은 없다 — 제안(낮음).
- 그 밖의 연계 제안은 위 기존 3절과 같아 다시 쓰지 않는다.

### 4) 매뉴얼과 실제 기능의 차이 (이번에 고친 것 / 남은 것)
- 이번에 고침(미배포) — `src/app/guide/GuideClient.tsx`:
  - 없는 버튼 이름 「AI 재생성」「PPTX 다운로드」「키 저장」 → 실제 이름(「🤖 AI로 이 카드 수정하기」「💾 PPTX 파워포인트 다운로드」 등).
  - 코드에 근거가 없는 「최대 50MB」 삭제, 지원 형식에 MD·XLS 추가, PDF 처리 방식과 주의 추가.
  - 글꼴 안내 정정(코드에 글꼴 지정 없음 — `pptxGenerator.ts`에 `fontFace` 없음).
  - 새로 넣음: 업무 워크스페이스 받은 원고, 웹 검색 체크, C-Suite 설정 칸, 미리보기·일괄 수정, 「비용이 드는 버튼 & 저장 안내」 섹션(저장되지 않음 포함), PPTX 모양 한계 안내, FAQ 3개, Gemini 발급 매뉴얼 버튼.
  - 목차의 동그라미 숫자를 일반 숫자로.
- 남은 것: 도움말 창(`HelpModal.tsx`) 문구는 그대로(큰 오류는 없음). 메인 사이트 프로그램 소개(`programs.description`)가 「22가지」·「Google Slides 연동」을 어떻게 말하는지는 DB라 확인하지 않았다(미확인) — PPTX 한계를 고치기 전에는 과장 표현이 없는지 볼 필요가 있다.
- 로그인 기기 안내·보관 기간 안내는 매뉴얼에 원래 없었고, 이 프로그램은 서버 보관 자료가 없어 「저장되지 않음」으로 적었다.

### 5) 정책 점검 (`node scripts/pending-check.mjs ai-slide-builder`, 2026-11-13)
- 저작권·분석 금지 고지: 알림 없음(`NOTICE`·`public/ai.txt`·`public/robots.txt` 있음).
- 저장공간 위젯: **미적용** — `src/app/layout.tsx`에 `<Script src="https://www.buylife.xyz/storage-widget.js" strategy="afterInteractive" />` 한 줄. 다음 배포 때 함께(대기).
- 범위 없는 `signOut()` 2곳: `src/app/api/auth/logout/route.ts:6`, `src/lib/actions/auth.ts:42` → `signOut({ scope: "local" })`(대기, `docs/HANDOFF_20261113_LOGIN_POLICY_ROLLOUT.md`).
- 서버 로그인 기기 정보 미전달: 서버용 Supabase 클라이언트에 `global.headers["User-Agent"]` 넣기(대기, 같은 문서 2-2절).
- 30일 정리·예외 회원: 서버에 보관하는 생성 자료가 없어 해당 없음.
- 설정 화면 링크: Gemini 「📖 발급 방법」 버튼을 설정 창(`ApiKeyModal.tsx`)과 매뉴얼에 추가함(이번에 고침, 미배포).
