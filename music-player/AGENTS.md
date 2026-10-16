# 뮤직 플레이어 자동화 (music-player) — 인수인계

> ★ 최상위 규칙: 이 프로그램은 AI·외부 계정을 쓰지 않는 브라우저 기능이다. 나중에 AI(예: 곡 분석)를 붙이면 **회원 본인 Gemini 키**만 사용하고 운영자 키로 폴백하지 않는다. ([TOP_RULE](../docs/TOP_RULE_PERSONAL_ACCOUNT_API.md))

**이어받는 CLI는 [docs/CLI_HANDOFF.md](docs/CLI_HANDOFF.md)(완료 커밋·코드 지도·절차·남은 일·함정)부터 읽으세요.**

작업 시작 전: 루트 `CLAUDE.md`, `docs/HANDOFF.md`, `docs/ERROR_LESSONS.md`를 먼저 읽는다. 썸네일은 **`docs/PLATFORM_PATTERNS.md §13` + `scripts/generate-program-thumbnail.mjs`**만 쓴다.

## 기본 정보

| 항목 | 값 |
|---|---|
| 이름 / slug | 뮤직 플레이어 자동화 / `music-player` |
| 버전 | **v1.04** (`src/lib/version.ts` = DB `programs.version`) |
| 디자인 인수인계 | [docs/DESIGN_HANDOFF.md](docs/DESIGN_HANDOFF.md) (디자인 개발완료) / [docs/IMPROVEMENTS.md](docs/IMPROVEMENTS.md) (기능 개선과제) |
| 주소 | https://music-player.buylife.xyz (Vercel `buylife/music-player`, CLI 직접 배포) |
| 카테고리 / 접근 | 멀티미디어 / **FREE+new 배지**(가입 회원 누구나), 최소 등급 일반, 기본 3요금제 등록 |
| 참고 원본 | AI Studio "GPT PARK MUSIC PLAYER" — 기능·로직만 참고, 코드 복제 없음. 분석·계획: [docs/DEVELOPMENT_PLAN.md](docs/DEVELOPMENT_PLAN.md) |

## 구조

- Next.js 16.4 + React 19.3 + TS, 순수 CSS, `idb`(IndexedDB). 서버 API는 로그아웃뿐(음악은 서버로 보내지 않는다).
- `src/lib/player/` 순수 로직+테스트: `queue.ts`(다음/이전·셔플·검색·정렬), `id3.ts`(ID3v2.2~2.4 제목·아티스트·앨범·커버), `format.ts`(시간·파일명), `eq.ts`(8밴드·프리셋·보정), `storage.ts`(IndexedDB·설정 보정), `engine.ts`(Web Audio 그래프), `types.ts`.
- `src/components/player/` : `Player.tsx`(상태·저장·단축키·드롭), `Visualizer.tsx`(5모드), `Equalizer.tsx`.
- 저장: 회원별 DB `music-player-<userId>` — `tracks`(메타), `blobs`(파일+커버), `settings`(볼륨·EQ·모드·정렬·마지막 곡·내 프리셋).
- 접근 판정: `src/lib/access.ts` + `programAccess.ts`(루트 사본). 레이아웃 `(workspace)/layout.tsx`에서 `requireProgramAccess()`.
- 진입: `/` → `/player`(플레이어), 매뉴얼 `/guide`.

## 핵심 설계 결정

- `AudioContext`/`MediaElementSource`는 한 번만 만들고 목록이 비어도 닫지 않는다(원본: 비운 뒤 다시 추가하면 소스 중복 생성 오류 위험).
- 이전/다음은 **화면에 보이는 순서(검색·정렬 반영)** 기준. 수동 다음은 끝에서 처음으로, 자동 이동은 반복 설정을 따른다. 셔플은 한 바퀴 동안 중복 없음.
- 길이를 못 읽은 곡은 재생할 때 알게 된 길이를 목록·저장소에 반영한다.
- 저장 공간이 부족하면 그 곡만 "이번 접속에만 유지"(!) 표시, 나머지는 정상.

## 검수 기록 (2026-10-13)

- 자동: `tsc`, `npm test` 10/10, `next build` 통과.
- **실제 Chrome(보이는 창) 시험 `npm run test:browser` 13/13 통과** — esbuild로 실제 `Player` 컴포넌트를 묶어 로컬 서버에 올리고 Playwright(+설치된 Chrome, `headless:false`)로 조작. 확인 항목: 빈 목록 안내, 파일 추가·파일명 해석·길이 읽기·텍스트 파일 제외, 곡 클릭 재생(시간 진행·분석기 에너지 RMS 0.136), Space 일시정지, N 다음 곡, **이퀄라이저·프리앰프가 실제 소리에 반영(기본 0.136 → 1k +15dB 0.745 → 프리앰프 −12dB 0.035)**, 볼륨·음소거, 새로고침 후 목록·마지막 곡·EQ 복원, 검색·정렬, 선택 삭제(앱 내 확인창), **목록을 모두 비운 뒤 다시 추가해도 재생(원본 결함 해결)**, ID3 제목·아티스트, 모바일 390px 가로 넘침 없음, 페이지 오류 0. 증거: `test-artifacts/browser-results.json`, `music-player.png`, `music-player-mobile.png`(Git 제외).
- 운영 Chrome(주인님 세션): 로그인·접근 게이트 통과, 드롭 추가·목록·레이아웃. (자동화 창이 숨김이라 소리 검수는 위 로컬 시험으로 대체)
- 남은 확인: 일반(naver) 회원 실계정, 실제 사용자 음악 파일(mp3 내장 커버 등)로 한 번 더.

## 남은 일 / 후속 후보

일반 회원 실계정 확인, 실제 mp3(내장 커버) 파일 확인, 다중 재생목록·즐겨찾기, 재생목록 JSON 내보내기, 클라우드 설정 동기화(오디오 제외), AI 곡 분석(본인 키).

## 함정

- MCP 제어 Chrome 창은 숨김이라 미디어가 로드되지 않는다 → 소리·재생 검수는 `npm run test:browser`(보이는 Chrome)로 한다. 시각화 캔버스 그림 자체는 단순 톤에서 막대 하나만 보이므로 실제 음악으로 육안 확인을 권장.
- `webkitdirectory`는 타입이 없어 스프레드로 전달한다. Safari 일부 버전은 폴더 선택 미지원.
- IndexedDB는 시크릿 창·사이트 데이터 삭제 시 비어 있다(매뉴얼에 안내).

## 2026-10-14 v1.02 — 모바일 셸 CSS 추가 (Claude Code)

- 증상: 767px 이하에서도 좌측 메뉴가 남아 본문이 눌림. 원인: `Sidebar.tsx`의 `.mobile-sidebar`(위쪽 접는 메뉴)는 있었지만 `src/app/globals.css`에 전환 규칙이 없었음(복사한 뼈대 공통 누락).
- 수정: `globals.css` 끝에 `@media(max-width:767px)` 셸 규칙(markdown-studio·four-cut-comics와 동일) 추가. 기능 로직 변경 없음. 버전 v1.02(코드·package·DB).
- 검수: 빌드, 프로덕션 배포, 운영 화면을 폭 400px 틀(iframe)에 띄워 좌측 메뉴 숨김·위쪽 메뉴 표시·본문 385px·가로 넘침 없음 확인. 실제 휴대폰 터치는 미확인.


## 2026-10-16 DB 연동 변수 호환 — v1.03 (music-player)

작업 전 [최상위 데이터베이스 연동 지침](../docs/DATABASE_CONNECTION_POLICY.md)과 [전체 전환 인수인계](../docs/DATABASE_CONNECTION_HANDOFF.md)를 먼저 읽습니다. 공개 키는 새 PUBLISHABLE 이름 우선·기존 ANON 이름 호환, 서버 키는 새 SECRET 이름 우선·기존 SERVICE_ROLE 이름 호환입니다. 새 값 없음/공백일 때만 같은 종류의 기존 값을 사용하며, 인증 실패 후 다른 키로 재시도하지 않습니다. 기존 변수·실제 키·회원 권한·Cron은 유지합니다. 배포·회원 검수 결과는 전체 인수인계의 프로그램별 기록에서 확인합니다. 기존 변수 삭제와 실제 키 폐기는 별개이며 안정화 확인 전 삭제하지 않습니다.


## 2026-10-16 v1.04 — 사이버 다크 테마 전면 개편 및 매뉴얼 비주얼화 (Antigravity)

- **배경**: 주인님 지시("검정색 바탕의 주목도 높은 디자인", "플레이어니까 화려하게 디자인", "연동/사용 매뉴얼 비주얼화").
- **수정 내용**:
  1. `src/app/globals.css`: 딥 블랙(`--background: #060911`) & 미드나잇 오로라 그래디언트 배경 구축, 센터 플레이 버튼(`0 0 25px` 네온 글로우), 8밴드 이퀄라이저 슬라이더 랙마운트 콘솔 스타일링, 글래스모피즘 재생목록 하이라이트.
  2. `src/app/(workspace)/guide/page.tsx`: 4단계 시각적 워크플로우 파이프라인, Web Audio 신호 흐름 아키텍처 다이어그램, 8밴드 주파수 대역별 사운드 특성 카드, 포맷 칩, 네온 키캡 단축키 치트시트, 100% 로컬 보안 안내 적용.
  3. `docs/DESIGN_HANDOFF.md`: 디자인 개발완료 및 유의사항 보고서 신설.
  4. `docs/IMPROVEMENTS.md`: 향후 로직/기능 개선과제(드래그 정렬, MediaSession API, 다중 플레이리스트, 파형 시크바 등) 신설 (Claude Code/Codex 인수인계용).
  5. 버전 `v1.04` 동기화 (`src/lib/version.ts`, DB `programs.version`).
- **검수**: Microsoft Edge 전용 브라우저(`msedge`), 테스트 계정 `buylifemall@naver.com` 실세션 검수 통과 (데스크톱 1440px / 모바일 375px 스크린샷 대조 확인).
