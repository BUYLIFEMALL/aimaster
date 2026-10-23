# 뮤직 플레이어 자동화 — 작업 재개 인수인계 (CLI_HANDOFF)

작성: 2026-10-13 (Claude Code), 최신 후속 갱신 2026-10-16 (Codex). **현재 작업 결과는 [v1.05 개선 인수인계](IMPROVEMENT_HANDOFF_20261016.md)를 먼저 읽습니다.** 다른 CLI(Codex·Gemini·Antigravity)나 새 Claude 세션이 이어받을 때 **이 문서 → [AGENTS.md](../AGENTS.md) → [DEVELOPMENT_PLAN.md](DEVELOPMENT_PLAN.md)** 순서로 읽으세요.

## 1. 한눈에 보기

| 항목 | 값 |
|---|---|
| 프로그램 | 뮤직 플레이어 자동화 (`slug: music-player`) — 내 음악 파일을 재생·시각화·이퀄라이징하는 브라우저 플레이어 |
| 현재 버전 | **v1.05** (`src/lib/version.ts` = DB `programs.version`) |
| 운영 주소 | https://music-player.buylife.xyz (카탈로그 https://www.buylife.xyz/programs/music-player) |
| Vercel | 프로젝트 `buylife/music-player`, Git 미연동, 폴더 `music-player/`에서 `vercel deploy --prod --yes --scope buylife` |
| DB | 공용 Supabase `esgxyikcnnvmlhygjkth` — **전용 테이블 없음**. `programs`(멀티미디어, FREE+new, 최소 등급 일반), `pricing_plans` 3요금제, VIP 등급 접근 등록 완료 |
| 데이터 저장 | 음악 파일·설정은 **회원 브라우저 IndexedDB**(`music-player-<userId>`). 서버로 오디오를 올리지 않는다(저장·트래픽 비용·저작권) |
| AI | 없음(원본에도 없음). 붙일 경우 회원 본인 Gemini 키만 — 최상위 규칙 |
| 참고 원본 | AI Studio "GPT PARK MUSIC PLAYER" — 기능·로직만 참고, 코드 복제 없음 |

## 2. 완료된 일 (커밋)

| 커밋 | 내용 |
|---|---|
| `59ab8e20` | 분석·개발 플랜(`docs/DEVELOPMENT_PLAN.md`) |
| `5355dd21` | v1.01 신규 개발: 재생/목록/시각화/EQ/ID3/저장/단축키/매뉴얼, DB 등록, 도메인, 썸네일(§13 실사), 운영 배포 |
| `394f39e7` | 실제 Chrome 브라우저 검수(13/13) 추가 + 검수 기록 |

## 3. 코드 지도

```
music-player/
  src/lib/player/        순수 로직 (tests/player.test.mjs 10개)
    queue.ts   다음/이전(셔플 중복 방지·반복)·검색·정렬
    id3.ts     ID3v2.2~2.4 제목·아티스트·앨범·APIC
    format.ts  시간·용량·파일명 해석·오디오 판별
    eq.ts      8밴드 주파수·프리셋 7·값 보정
    storage.ts IndexedDB(tracks/blobs/settings)·설정 보정
    engine.ts  Web Audio: audio → 프리앰프 → EQ 8 → 분석기 → 출력 (AudioContext 1회 생성)
  src/components/player/ Player.tsx(상태·저장·단축키·드롭·삭제) · Visualizer.tsx(5모드) · Equalizer.tsx
  src/app/(workspace)/   layout(접근 게이트+Shell) · player · guide
  src/lib/access.ts · programAccess.ts   접근 판정(루트 사본, 핸드폰 필수 포함)
  tests/browser.mjs + browser-entry.tsx  보이는 Edge 검수
```

핵심 규칙:
- `AudioContext`·`MediaElementSource`는 **한 번만** 만든다. 목록이 비어도 닫지 않는다(원본의 재생성 오류 방지).
- 이전/다음은 **화면 표시 순서** 기준. 수동 다음은 끝→처음, 자동 이동은 반복 설정을 따른다.
- 길이를 못 읽은 곡은 재생 시점의 길이를 목록·저장소에 반영한다(`Player.tsx` `onMeta`).
- 저장 실패(용량 부족) 곡은 `unsaved` 표시로 이번 접속에만 유지.

## 4. 개발·검수·배포 절차

```bash
cd music-player
npm install
npm test                # 순수 로직 10개
npm run test:browser    # 보이는 Edge 13개(소리·EQ·저장·ID3·모바일). Playwright + 설치된 Edge 필요
npx tsc --noEmit && npx next build
vercel deploy --prod --yes --scope buylife
# 수정 때마다 DB 버전 +0.01: update programs set version='v1.0X', updated_at=now() where slug='music-player';
```

- **소리 검수는 MCP 제어 Chrome(숨김 창)에서 불가** — 미디어가 로드되지 않는다. 반드시 `npm run test:browser`(보이는 Edge)를 쓴다.
- 로컬 `npm run dev`(포트 3021)는 localhost에 로그인 쿠키가 없어 로그인 화면 검수가 안 된다 → 운영 주소에서 주인님 세션으로, 또는 위 하네스로.
- 커밋은 경로 명시(`git add music-player`). 루트 `docs/HANDOFF.md`·`ERROR_LESSONS.md`는 다른 CLI의 미커밋 변경이 섞여 있으니 전체 add 금지(내 블록만 별도 반영).
- 썸네일 교체는 **`docs/PLATFORM_PATTERNS.md §13` + `scripts/generate-program-thumbnail.mjs`**만 사용.

## 5. 검수 증거 (2026-10-13)

- `tsc`·테스트 10/10·빌드 통과.
- 보이는 Chrome 13/13: 빈 안내, 추가·파일명 해석·길이, 재생(RMS 0.136), 일시정지, 다음(N), EQ 반영(0.136→0.745, 프리앰프 −12dB→0.035), 볼륨·음소거, 새로고침 복원, 검색·정렬, 선택 삭제, 비운 뒤 재추가 재생, ID3(봄날/아이유), 모바일 390px 넘침 없음, 페이지 오류 0. 증거 파일은 `test-artifacts/`(Git 제외, 재실행하면 생성).
- 운영 Chrome(주인님 세션): 로그인·접근 통과, 드롭 추가·목록·레이아웃.

## 6. 남은 일

1. **일반(naver) 회원 실계정 흐름** — 실제 회원 세션으로 수행한 최신 Edge 결과는 v1.05 개선 인수인계 참조(기존 미확인 기록 해소).
2. **실제 mp3(내장 커버 포함)로 육안 확인** — 시각화 5모드가 실제 음악에서 보기 좋은지, 커버 표시.
3. **후속 후보**: 다중 재생목록·즐겨찾기, 재생목록 JSON 내보내기·불러오기, 클라우드 설정 동기화(EQ·프리셋만, 오디오 제외), AI 곡 분석(본인 키), 모바일 전용 미니 플레이어, 이전 곡 위치 기억.

## 7. 함정·교훈

- 숨김 창에서는 `new Audio()`도 `loadedmetadata`가 안 온다(기록: `docs/ERROR_LESSONS.md` 2026-10-13).
- `webkitdirectory`는 TS 타입이 없어 스프레드로 전달. 일부 브라우저는 폴더 선택 미지원.
- IndexedDB는 시크릿 창·사이트 데이터 삭제 시 비어 있다(매뉴얼 안내). 같은 브라우저를 여러 회원이 써도 `userId`로 분리.
- 자동 재생 정책: 첫 재생은 사용자 클릭이어야 한다. `ensure()`/`resume()`는 클릭 핸들러 안에서.
- 시각화 `line`(곡선)·`wave`(시간축 파형)는 의미가 다르다 — 원본의 부정확한 구현을 정정한 것.
- 원본의 `GEMINI_API_KEY` 클라이언트 주입 패턴은 사용하지 않는다(최상위 규칙).

## 8. 관련 문서

[AGENTS.md](../AGENTS.md) · [README.md](../README.md) · [DEVELOPMENT_PLAN.md](DEVELOPMENT_PLAN.md) · 루트 [HANDOFF.md](../../docs/HANDOFF.md) · [ERROR_LESSONS.md](../../docs/ERROR_LESSONS.md) · [PLATFORM_PATTERNS.md §13](../../docs/PLATFORM_PATTERNS.md) · [TOP_RULE](../../docs/TOP_RULE_PERSONAL_ACCOUNT_API.md)
