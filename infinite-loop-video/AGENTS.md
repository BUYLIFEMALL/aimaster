# 무한루프 영상자동화 — 인수인계 (AGENTS.md)

> 다른 CLI(Codex·Gemini·다른 Claude 세션)가 대화 없이 이어서 작업할 수 있도록 쓴 문서입니다. 작업 전에 루트 `CLAUDE.md`, `docs/HANDOFF.md`, `docs/ERROR_LESSONS.md`를 먼저 읽습니다. 작업 기록은 아래 "작업 기록"에 **추가만** 합니다(기존 내용 삭제 금지).

## 1. 한눈에 보기
| 항목 | 값 |
|---|---|
| 이름 / slug | 무한루프 영상자동화 / `infinite-loop-video` |
| 현재 버전 | **v1.03** (코드 `src/lib/version.ts` = `package.json` = DB `programs.version` 모두 일치) |
| 라이브 | https://infinite-loop-video.buylife.xyz (옛 주소 `infinite-loop-video.vercel.app` 유지) |
| Vercel | 팀 `buylife`, 프로젝트 `infinite-loop-video` (CLI 업로드 배포, Git 연동 없음이 정상) |
| 배지·카테고리 | FREE + new, 멀티미디어, 최소 등급 일반 |
| 요금제 | 1·2·3개월 1만/2만/3만원 등록(FREE를 떼면 사용) |
| 썸네일 | 등록 완료(`programs.thumbnail_url`) |
| 스택 | Next.js 16 · React 19 · Tailwind 4 · Supabase(@supabase/ssr) · ffmpeg.wasm |
| 비용 | 서버·API 비용 없음(브라우저 전용) → **프리미엄 후보 아님**, 회원 API 키도 불필요 |

## 2. 무엇을 하는 프로그램인가
영상 한 개를 올리면 시작과 끝이 가장 닮은 구간을 찾아 끝없이 반복되는 영상(MP4·WebM·GIF)으로 만든다. 영상은 서버로 가지 않고 브라우저 안에서만 처리된다. 참고 원본은 `seamless-loop-studio.vercel.app`(구조·알고리즘만 분석해 새로 구현, 코드·문구 복제 없음).

화면 흐름(좌측 메뉴 1개 + 사용 안내): `/studio` = ① 업로드(큰 업로드 카드 + 3단계 안내 카드 + 상세 가이드 버튼) → ② 루프 방식·구간(정사각형 미리보기) → ③ 내보내기. `/guide` = 사용 안내.

## 3. 코드 구조
```
src/lib/loop/analysis.ts   프레임 특징 → 유사도 → 구간 탐색 (순수 함수)
src/lib/loop/plan.ts       파라미터 보정 + ffmpeg 필터/인자 생성 (순수 함수)
src/lib/loop/browser.ts    Canvas 프레임 추출 + ffmpeg.wasm 렌더링 (브라우저 전용)
src/components/tool/LoopTool.tsx   메인 화면 전체
src/components/layout/Sidebar.tsx  표준 사이드바(번호 흐름, ← 다른 프로그램 보기, 계정 바로 아래 로그아웃)
src/lib/access.ts · programAccess.ts  접근 판정(핸드폰 확인 포함, image-convert-studio와 동일)
src/lib/supabase/*  쿠키 도메인(.buylife.xyz) 포함 공용 패턴
supabase/migrations/0001_register_program.sql  프로그램 등록 SQL(적용 완료)
tests/loop.test.mjs · access.test.mjs   `npm test` 15개 통과
```

### 알고리즘 요약
- 8fps로 프레임을 뽑아 64×64로 줄이고 특징 3종(밝기 히스토그램 64칸, 32×32 밝기 격자, 4×4 색 격자)을 만든다.
- 유사도 = 밝기격자 0.55 + 색격자 0.25 + 히스토그램(Bhattacharyya) 0.2.
- 구간 점수 = (앞뒤 ±2프레임 가중평균 [.1,.2,.4,.2,.1]) × 0.75 + (다음 프레임 쌍 유사도 = 움직임 연속성) × 0.25 + 길이 보너스 최대 0.02. 최소 길이(기본 1초)~30초 범위의 모든 쌍을 점수화해 상위 5개(서로 비슷한 후보는 제외)를 보여준다.
- 선택한 후보는 시작·끝 ±0.35초를 30fps로 다시 훑어 가장 닮은 프레임 쌍으로 보정(`refinePair`).
- 분석은 최대 60초 구간까지(`MAX_ANALYZE_SEC`), 메인 스레드에서 청크로 비동기 처리(Web Worker 아님).
- 점수 등급: ≥0.95 매우 자연스러움 / ≥0.88 자연스러움 / ≥0.75 보통 / 그 미만 어색함.

### 렌더링 요약(ffmpeg.wasm, `@ffmpeg/core` 0.12.6 를 jsdelivr에서 불러옴)
- **스마트/강제 오버랩**: 끝 cf초(페이드아웃)와 시작 cf초(페이드인)를 `xfade`+`acrossfade`로 겹친 조각 + 가운데 조각을 이어 1회분(길이 = 구간 − cf)을 만든다. 강제 오버랩은 분석 없이 영상 전체, cf 1초 고정.
- **바운스**: 정방향 + `reverse`(소리는 `areverse`) 이어 붙임, 1회분 = 구간×2.
- 1회분을 만든 뒤 `-stream_loop N-1 -c copy`로 반복 횟수(1~200)만큼 이어 붙임. MP4=x264+aac, WebM=vp8+vorbis.
- GIF: 1회분 MP4를 만든 뒤 팔레트 방식(480px, 15fps)으로 변환, 소리 없음, 반복은 재생기가 무한 반복하므로 이어 붙이지 않는다.
- 파라미터 보정(`normalize`): 크로스페이드 0.1~2초이면서 구간 길이의 절반 이하, 반복 1~200, 구간 최소 0.1초.

## 4. 배포·운영 절차 (이 프로그램을 고칠 때)
1. 코드 수정 → `npm test` → `npm run build`.
2. 버전 +0.01: `src/lib/version.ts`(**`APP_VERSION` 줄만** 고칠 것 — 주석의 "v1.01 형태" 문구를 바꾸지 않게 주의), `package.json`, DB `update programs set version='vX.YY' where slug='infinite-loop-video';`, 이 문서·README 작업 기록.
3. `cd infinite-loop-video && vercel deploy --prod --yes --scope buylife`.
4. 커밋은 **경로를 지정**(`git commit -- infinite-loop-video ...`)해서 다른 CLI의 스테이징과 섞이지 않게 한다 → `git push origin master`.
5. 확인: 라이브 주소를 새로고침(캐시된 이전 화면이 남을 수 있음)하고 사이드바 버전이 올라갔는지 본다.
- 환경변수 4개(Supabase URL/ANON/SERVICE_ROLE, `NEXT_PUBLIC_MAIN_SITE_URL`)는 `scripts/add-infinite-loop-vercel-env.mjs`로 이미 production에 등록했다.

## 5. 알려진 한계·남은 일
- **[가장 중요] 실제 영상으로 끝에서 끝까지 화면 검수를 못 했다.** 검수 때 Chrome 창이 백그라운드(`document.visibilityState === "hidden"`)라 영상 로딩이 멈춰 업로드 이후(분석→만들기→재생→다운로드)를 확인하지 못했다. 로그인 후 화면 렌더, 업로드 카드 개편, 사이드바는 화면으로 확인했다. **창이 앞에 보이는 상태에서** 5~20초 영상 1개로 3가지 방식 × 3가지 형식을 시험하고, ffmpeg 필터(`xfade`/`acrossfade`/`reverse`)가 `@ffmpeg/core` 0.12.6 에서 실제로 통과하는지(특히 소리 있는 영상, 오디오 없는 영상, 크로스페이드가 구간 절반에 가까운 경우) 확인할 것. 필터 문자열은 단위 테스트로 형태만 검증했다.
- 원본에 있던 **밝기 보정(0.7~1.4)**, 전체화면 미리보기, **크로스페이드가 적용된 실시간 미리보기**는 미구현. 현재 미리보기는 선택 구간만 반복하고, 이음새는 만든 결과 영상에서 확인한다.
- 분석이 메인 스레드라 긴 영상에서 화면이 잠깐 굼뜰 수 있다(Web Worker 이전 후보). 현재는 프레임마다 이벤트 루프를 양보하며 진행률을 보여준다.
- 영상에 소리가 있는지는 `video.audioTracks`(없으면 Firefox 속성, 둘 다 없으면 "있음"으로 간주)로 판단한다. 소리가 없는데 있다고 판단되면 필터의 `[0:a]`가 없어 렌더가 실패할 수 있다 — 이 경우 `browser.ts`에서 ffmpeg 입력을 먼저 `ffprobe` 대신 시도 후 무음 재시도로 보강하면 된다.
- 녹화 파일처럼 길이 정보가 없는(Infinity) 영상은 `1e101` 위치로 이동해 길이를 알아낸다(v1.02).
- 파일 크기: 하드 제한 200MB(권장 50MB, 30초 미만). ffmpeg.wasm은 메모리를 많이 쓰므로 큰 파일은 브라우저가 느려질 수 있다.
- 첫 렌더 때 ffmpeg 코어(약 30MB)를 CDN에서 내려받아 오래 걸린다(이후 캐시). CDN 접근이 막힌 환경에서는 실패한다.
- 이 프로그램은 운영자 비용이 없어 FREE로 운영한다. 나중에 서버 처리가 들어가면 `docs/GRADE_AND_BILLING_POLICY.md`의 프리미엄 후보로 다시 판단할 것.

## 6. 규칙 체크리스트(이미 지킨 것)
- 접근 판정 순서: 정지 → 관리자 → 핸드폰 → FREE → 구독 → 등급+부여(`createAdminClient`로 DB 조회). 대시보드 레이아웃에 `dynamic = "force-dynamic"` + `fetchCache = "force-no-store"`.
- 사이드바 표준(`docs/SIDEBAR_LAYOUT_STANDARD.md`): `← 다른 프로그램 보기`(https://www.buylife.xyz/programs), 번호 흐름, 계정·로그아웃이 마지막 메뉴 바로 아래, 흰색 베이스.
- 서버 쓰기 API·Server Action 없음(브라우저 전용). 나중에 서버 API를 추가하면 `checkProgramAccessApi()`가 필요하다.
- 회원 API 키·외부 계정 연동 없음(최상위 규칙과 충돌 없음).

## 7. 작업 기록 (추가만)
- **2026-10-12 v1.01** 신규 구축, 프로그램 등록(SQL: `supabase/migrations/0001_register_program.sql`), Vercel 프로젝트·환경변수·도메인 연결, 첫 배포.
- **2026-10-12 v1.02** 길이 정보 없는 녹화 영상(Infinity) 보정. 버전 표시 누락(주석 문구만 바뀐 실수)도 바로잡음.
- **2026-10-12 v1.03** 업로드 영역을 참고 화면 구성으로 개편, 미리보기 정사각형. 썸네일 생성·등록(Gemini, 관리자 키 1회 사용, 임시 파일 삭제).
- 커밋: `6cc0a5fd`(신규) → `539f3051`(v1.03) → `6bf82590`(썸네일 기록).
