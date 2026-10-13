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
- 운영 Chrome(주인님 세션): 빈 화면·드롭 추가(4곡 중 오디오 3+테스트 1, 텍스트 파일 제외)·파일명 해석("03. Gamma Tone" → 제목만, "Alpha - First Tone" → 아티스트/제목)·목록·정렬 표시·화면 레이아웃 확인.
- **미검수**: 실제 소리 재생·시각화 움직임·EQ 청감 — 자동화 Chrome 창이 숨김 상태(`visibilityState=hidden`)라 `Audio` 메타데이터조차 로드되지 않아 확인하지 못함. 주인님 실제 Chrome(보이는 창)에서 확인 필요.

## 남은 일 / 후속 후보

실제 소리·시각화·EQ 실기기 확인, 모바일 폭, 일반 회원 실계정 확인, 다중 재생목록·즐겨찾기, 재생목록 JSON 내보내기, 클라우드 설정 동기화(오디오 제외), AI 곡 분석(본인 키).

## 함정

- 자동화 브라우저가 숨김 창이면 미디어 로드/재생이 되지 않는다 → 소리 관련 검수는 보이는 Chrome에서.
- `webkitdirectory`는 타입이 없어 스프레드로 전달한다. Safari 일부 버전은 폴더 선택 미지원.
- IndexedDB는 시크릿 창·사이트 데이터 삭제 시 비어 있다(매뉴얼에 안내).
