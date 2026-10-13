# 뮤직 플레이어 자동화 (music-player) — 인수인계

> ★ 최상위 규칙: 이 프로그램은 AI·외부 계정을 쓰지 않는 브라우저 기능이다. 나중에 AI(예: 곡 분석)를 붙이면 **회원 본인 Gemini 키**만 사용하고 운영자 키로 폴백하지 않는다. ([TOP_RULE](../docs/TOP_RULE_PERSONAL_ACCOUNT_API.md))

작업 시작 전: 루트 `CLAUDE.md`, `docs/HANDOFF.md`, `docs/ERROR_LESSONS.md`를 먼저 읽는다. 썸네일은 **`docs/PLATFORM_PATTERNS.md §13` + `scripts/generate-program-thumbnail.mjs`**만 쓴다.

## 기본 정보

| 항목 | 값 |
|---|---|
| 이름 / slug | 뮤직 플레이어 자동화 / `music-player` |
| 버전 | **v1.01** (`src/lib/version.ts` = DB `programs.version`) |
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
