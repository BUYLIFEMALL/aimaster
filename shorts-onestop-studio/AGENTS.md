# AI 쇼츠 원스톱 제작 자동화 (`shorts-onestop-studio`) — 에이전트 인수인계

> 루트 `CLAUDE.md`·`AGENTS.md`(최상단 필독: 계정 고정·동시 작업 금지·비용 최소화·DB 연동)와 `docs/HANDOFF.md`·`docs/ERROR_LESSONS.md`를 먼저 읽는다.
> 기획·참고 원본 분석·단계 계획: [`../docs/CARD_SHORTS_REFERENCE_ANALYSIS.md`](../docs/CARD_SHORTS_REFERENCE_ANALYSIS.md) (외부 상용 설치 프로그램의 **기능만** 참고 — 원본 코드·디자인·문구·이름 사용 금지, 원칙 21).
> 작업 시작 전 `docs/ACTIVE_WORK.md`에 이 폴더를 등록하고, 끝나면 지운다.

## 1. 한 줄 소개
주제 한 줄 → AI 대본(인트로·카드 3~8장·아웃트로) → 배경(스톡·AI 이미지·움직이는 배경) → 음성·자막 → 배경음악 → **브라우저에서** 1080×1920·30fps MP4. 웹 프로그램, 회원 본인 키, 서버 렌더 없음(운영자 비용 거의 없음 → 프리미엄 후보 아님).

## 2. 현재 상태 (버전 `src/lib/version.ts` = DB `programs.version`)
| 단계 | 내용 | 상태 |
|---|---|---|
| P1 뼈대 | 폴더·권한(정지→관리자→핸드폰→FREE→구독→등급+기간, 서비스 롤 조회)·흰색 레이아웃·모바일 ☰·좌측 6단계 메뉴(준비 중 안내)·API키등록(Gemini·OpenAI·Claude, 연결 확인=모델 목록 조회라 요금 없음)·DB 등록·Vercel·도메인 | **v1.01 배포**(2026-10-16) |
| P2 화면 틀·대본 | 디자인 지침(`docs/PROGRAM_DESIGN_STANDARD.md`) 적용: 다크 기본+라이트 전환, 🏠 대시보드, 번호+연결선 메뉴, 📖 매뉴얼, 화면별 히어로·빈 화면. AI 주제 8개 추천·대본(톤5×구성5, 카드3~8, 참고 자료·분야별 내 지침·내 대본 한 줄=한 장면)·대본 편집·보관함 저장(`shorts_onestop_items`, RLS)·사용할 AI/모델 선택 | **v1.02 배포**(2026-10-16) |
| P3 장면 편집 | 캔버스 장면 렌더러 `src/lib/render/scene.ts`(1080×1920, 테마 8·레이아웃 6·글꼴 5·제목 효과 4·움직이는 배경·진행 막대·세이프에어리어, 대본 글자로 웹 글꼴 선로딩) + 장면 편집 화면(크리에이티브 아틀리에: 9:16 미리보기 재생·구간 이동·디자인 저장 → `data.design`). 장면 길이는 내레이션 글자 수 어림(약 7자/초, P5에서 실제 음성 길이로) | **v1.03 배포**(2026-10-16) |
| P4 배경 | 디자인·배경 화면: 배경 방식(테마/전체 1장/장면마다)·글자 위 어둡게·AI 장면 설명(스톡 검색어+이미지 묘사, 텍스트 AI 1회)·스톡 검색/모두 채우기(본인 Pixabay·Pexels 키, 서버 검색·CDN 직접 로드 — CORS 허용 확인)·AI 이미지(본인 Gemini, 9:16, 비공개 버킷 `shorts-onestop-studio` 회원 폴더 + 1시간 서명 주소)·화풍 7·같은 인물 유지. 렌더러가 배경을 cover+켄 번즈+어둡게로 그림(`drawMedia`), 미리보기·장면 편집 공용 로더 `useMedia`. 키 발급 매뉴얼 2개(platform_guides) | **v1.04 배포·실화면 검수 완료**(2026-10-16) |
| P5 음성·자막·음악 | 음성·자막·영상 화면(`RenderView`): 본인 키 TTS(`/api/ai/tts` — OpenAI gpt-4o-mini-tts 기본·tts-1·Gemini 2.5 Flash TTS Preview, 목소리·빠르기·말투 지시) → 비공개 버킷 `<user>/voice/`, 브라우저가 길이 측정해 장면별 `voice{path,dur,text}` 저장(내레이션이 바뀌면 무효) → 타임라인이 실제 음성 길이(+앞 0.25초·뒤 0.5초). 자막 4스타일·위치·크기를 렌더러가 음성 길이에 맞춰 조각 표시(`captionChunks`). BGM은 `/api/media/bgm` 일회용 업로드 주소로 브라우저가 저장소에 직접 업로드(10MB, 서버 본문 제한 회피), 미리보기 `useAudio`가 내레이션 동기·BGM 덕킹(35%). 장면 편집 재생에도 소리 | **v1.05 배포·실화면 검수 완료**(2026-10-16) |
| P6 MP4 | `src/lib/render/export.ts`: WebCodecs H.264(avc1.640028→4d0028→42e028 지원 순) + `mp4-muxer`, `renderFrame`으로 30fps 한 장씩(배경 영상은 장면 안 시각으로 seek, 미리보기 영상은 멈췄다 되돌림), 소리는 OfflineAudioContext로 내레이션(장면 시작+LEAD)+BGM(반복·목소리 구간 35%·끝 1초 페이드) 섞어 AAC(안 되면 Opus)로 0.1초 단위 인코딩. 화면 ④ MP4 만들기·진행률·멈추기·내려받기·결과 미리보기. 좁은 화면 1열 `minmax(0,1fr)` 수정 | **v1.06 배포·실화면 검수 완료**(2026-10-16) |
| P7 SEO·발행 계획·일괄 | 업로드 문구 `/api/ai/seo`(대본 요약 → 제목 후보 5·설명·해시태그·검색 태그, `data.seo`, 음성·자막·영상 화면 ⑤에서 고쳐 쓰기·복사). 발행 계획 `/plan`(`PlanView`, `/api/ai/plan`): 채널 단계 6(`src/lib/plan.ts` STAGES)·분야 1~3·하루 1~3편·기간 3~30일(주제 최대 30개) → AI 1회로 전략+주제, 날짜·분야별 추천 시각은 서버가 배치(`UPLOAD_TIMES`·`buildSchedule`), `kind=plan`으로 저장. 일정에서 주제를 골라 대본 일괄 생성(순차, 한 편마다 프로젝트·계획 저장, 실패 표시 후 계속, 키 없음이면 멈춤, 멈추기 버튼). 분야별 내 지침 적용 | **v1.07 배포·실화면 검수 완료**(2026-10-16) |
| 개선 3건 | ① 오늘 지난 시각 자동 미루기(`buildSchedule`: 분야 다음 추천 시각 → 지금+1시간 30분 단위 → 23:30 넘으면 하루 뒤 시작) ② 일정 고치기(주제·날짜·시각)·빼기(대본은 보관함에 남음) ③ 일괄 제작을 🎨 배경(AI 장면 설명+스톡)·🎙️ 음성·🎬 MP4까지 선택 확장(`src/lib/pipeline.ts` — 훅 없는 배경 채우기·음성·미디어 준비, 단계마다 저장·끝난 단계 건너뜀·예상 요청 횟수 표시·MP4 목록 내려받기). 좁은 화면 일정 줄 버튼 줄바꿈 | **v1.08 배포·실화면 검수 완료**(2026-10-16) |
| P8 공개 | `coming` 해제 + **VIP 등급 자동 부여**(2026-10-16 주인님 지시: 완성·업데이트되면 VIP는 자동 부여, 나머지 등급은 주인님이 직접) | 진행 |

## 3. 운영 정보
- 주소: https://shorts-onestop-studio.buylife.xyz (별칭 https://shorts-onestop-studio.vercel.app), Vercel 프로젝트 `shorts-onestop-studio`(팀 `buylife`), 배포 `vercel deploy --prod --yes --scope buylife`(이 폴더에서).
- DB: `programs` slug `shorts-onestop-studio`, 카테고리 유튜브, 최소 등급 일반, **badges `coming`(개발 중)**, 요금제 3종. 등록 SQL `supabase/migrations/0001_register_shorts_onestop_studio.sql`.
  - `is_active=false`면 관리자·시험 계정도 들어갈 수 없어(권한 판정 not_found) 활성으로 두고, **등급 자동 부여(`grade_program_access`)는 공개 전까지 넣지 않는다** → 지금은 관리자 + 시험 계정(`buylifemall@naver.com`, blog-workroom 기간 복사)만 사용.
- Vercel 환경변수(Production): 공용 DB 연결값 새·기존 이름 + `NEXT_PUBLIC_MAIN_SITE_URL`. 등록 스크립트 `scripts/add-platform-env.mjs`(루트 `.env.local`에서 읽음, 값 출력 없음). **운영자 AI 키는 등록하지 않는다.**
- 저장 테이블 `shorts_onestop_items`(kind: project·preset·guideline·plan·settings, `user_id`+RLS 4정책, SQL `supabase/migrations/0002_shorts_onestop_items.sql`). 서비스 롤 접근이라 `src/lib/store.ts`가 모든 쿼리에 `user_id` 조건.
- 텍스트 모델 레지스트리 `src/lib/models.ts`(다른 프로그램이 공급사 목록으로 확인한 ID만): 기본 Gemini 3.5 Flash-Lite / GPT-4o mini / Claude Haiku 4.5. 어댑터 `src/lib/ai.ts`(blog-workroom 구조 + Anthropic Messages). 프롬프트 `src/lib/prompts.ts`(당해 연도 동적 주입), 대본 구조·정리 `src/lib/script.ts`.
- 키 provider: `gemini`·`openai`·`anthropic`(공용 `user_api_keys`). 스톡 `pexels`·`pixabay`는 제약에 이미 있음(P4에서 추가). **Groq·Cloudflare·NVIDIA·OpenRouter·Azure Speech는 `user_api_keys` 제약에 없음 → 쓰려면 DB 제약 변경(주인님 승인 필요)**.

## 4. 개발 규칙(이 프로그램)
- 디자인은 `docs/PROGRAM_DESIGN_STANDARD.md`(플로우 위저드 + 크리에이티브 아틀리에, **다크 기본·라이트 전환**). 색·그림자는 `src/app/globals.css`의 토큰(`--bg`·`--surface`·`--brand` 등)만 쓰고, 새 화면도 `Hero`·`card`·`stat-card`·`topic-card`·`scene`·`empty-state`·`avatar-tip` 클래스를 재사용. 테마 저장 키 `sos-theme`(localStorage, 실패해도 다크로 동작).
- 모든 API는 `checkProgramAccessApi()` + 같은 출처 확인 + `dynamic`/`fetchCache` 두 줄. 페이지·레이아웃은 `requireProgramAccess()`.
- AI 프롬프트에 당해 연도 주입(원칙 8), 인물 이미지는 한국인 기본(원칙 3).
- 시험: 무료 공급자·모델 목록 조회 우선, 품질 확인은 가장 저렴한 모델 소량(최상단 비용 지침). 회원 화면 검수는 크롬에서 `buylifemall@naver.com` 로그인 상태로.

## 5. 작업 기록
- 2026-10-16 v1.01 — P1 뼈대 배포.
- 2026-10-16 v1.02 — P2 화면 틀 디자인 개편 + AI 주제·대본. 크롬(관리자 계정) 실제 흐름: 생활 꿀팁 → 주제 8개(당해 연도 반영) → TOP 4 주제 선택 시 구성·카드 수 자동 → 대본 4장 생성 → 저장 → DB 일치, 보관함·라이트 전환·매뉴얼·400px 확인. 시험 비용: Gemini 3.5 Flash-Lite 2회(주제·대본), 상위 모델 없음. 주인님 안내: 메인·서브(시험) 계정 모두 키가 등록되어 있어 시험에 사용. (시험 계정 확인은 아래 v1.03 항목에서 완료)
- 2026-10-16 카탈로그 썸네일 등록(상위 이미지 모델, 화면 속 글자 없는 실사 — `programs.thumbnail_url`). 상세 소개·특징·사용 순서·활용 대상은 P8.
- 2026-10-16 메인 사이트 상세 페이지 작성(구현된 주제·대본 기능만, 순차 공개 명시 — `supabase/migrations/0004_detail_page.sql`). **단계를 공개할 때마다 상세 소개·특징·사용 순서도 함께 고친다.**
- 2026-10-16 v1.03 — P3 장면 편집(캔버스 미리보기) 공개 + 상세 페이지를 공개 기능에 맞춰 갱신(`supabase/migrations/0005_v1_03_scenes.sql`). 크롬 검수: 대본 선택 → 미리보기(첫 화면 0.9초 지점), 미드나잇·큰 숫자형으로 즉시 변경, 세이프에어리어, 재생 진행(9.3→16.0초), 디자인 저장 → DB `data.design` 일치. 시험 중 발견·수정: 웹 글꼴이 글자 묶음별로 받아져 제목에 기본 글꼴이 섞임 → `loadFontsFor()`로 대본 글자 선로딩. 시험 비용 0원(AI 호출 없음).
- 2026-10-16 v1.03 시험 계정(일반 회원) 검수 — `buylifemall@naver.com` 로그인: 권한·회원별 데이터 분리(관리자 대본 안 보임)·키 연결 확인·주제 추천→대본→저장→장면 편집 정상, DB 소유자 일치. 시험 비용 Flash-Lite 2회. 휴대폰 폭은 창 최대화로 미재확인(관리자 세션 400px 확인분 있음).
- 2026-10-16 v1.04 — P4 배경 코드 배포(stock·AI 이미지·매뉴얼·버킷). **Pexels 새 API 키 발급 일시 중단 확인**(주인님 화면) → 기본 스톡 Pixabay, 설정 화면 Pixabay 먼저·Pexels 안내, 발급 매뉴얼 안내 추가. **검수 대기**: 두 계정 모두 Pixabay 키 미등록(에이전트는 키를 대신 입력하지 않음 — 주인님이 설정 화면에 직접 등록) → 등록 후 시험 계정으로 AI 장면 설명·Pixabay 검색/모두 채우기·AI 이미지 1장(가벼운 모델)·저장·장면 편집 재생 확인, 그 뒤 상세 페이지 갱신(원칙 22). 비로그인 API 401 확인.
- 2026-10-16 v1.04 실화면 검수(시험 계정, 주인님이 두 계정에 Pixabay 키 직접 등록) — Pixabay 연결 확인(무료), AI 장면 설명 5장면, 스톡으로 모두 채우기(세로 영상, AI 이미지 장면은 건너뜀), AI 이미지 1장(gemini-2.5-flash-image, 한국인 실사), 배경 저장 DB 일치(stockId·path), 장면 편집에서 AI 이미지·영상 배경 재생. 발견·수정 3건: ① 주석이 같은 줄의 `media` 기본값을 주석 처리 → 스톡 종류가 사진으로 검색 ② Pixabay 사진 주소(`pixabay.com/get/…`) 24시간 임시 → `stockId`로 열 때마다 새 주소(`/api/stock/resolve`) ③ 장면 설명 JSON을 모델이 배열로 반환 → `generateJson`이 배열을 `{items}`로 감쌈. 개선: 모두 채우기가 AI 이미지 장면을 덮어쓰지 않음. 상세 페이지 갱신(`0010`). 시험 비용: 텍스트(Flash-Lite) 2회·이미지(가벼운 모델) 1장·스톡 무료.
- 2026-10-16 v1.05 — P5 음성·자막·배경음악 공개(SQL `0011` 버킷 오디오 허용·`0012` 버전·`0013` 상세 페이지). 시험 계정 크롬 검수: 인트로 음성 1개(gpt-4o-mini-tts, 11.8초) → 배지·미리보기 자막 표시, 저장, 소리와 재생(음성 파일 206 스트리밍 로드·자막 진행), 노란 자막 변경, 4초 시험음 wav 배경음악 업로드 성공 → DB `data.audio`(bgm path·captions.style yellow)·`intro.voice`(dur 11.83) 및 저장소 voice 1·bgm 1 일치, 시험 음악은 빼고 다시 저장. 메인 상세 v1.05·새 특징 표시 확인. 시험 비용: OpenAI TTS 1회(시험 계정 본인 키). 남은 것: P6 MP4·P7 SEO·발행·P8 공개.
- 2026-10-16 v1.06 — P6 브라우저 MP4(SQL `0014` 버전·`0015` 상세 페이지). 시험 계정 크롬: 54.5초 MP4 생성(1080×1920·30.2MB·138초), 소리 트랙 54.49초·인트로 소리 있음·음성 없는 카드 무음, 결과 화면 정상. 400px 검수에서 작업 화면 가로 넘침 발견·수정(6개 화면 확인). 비용 0원. 개선사항 `docs/IMPROVEMENTS.md`, 인수인계 `docs/IMPROVEMENT_HANDOFF_20261016.md`, 플랜 `docs/PLAN_P6_P8.md`.
- 2026-10-16 v1.07 — P7 업로드 문구·발행 계획·일괄 대본(SQL `0016` 버전·`0017` 상세 페이지, DB 구조 변경 없음 — 기존 `kind=plan` 사용). 시험 계정 크롬: 건강·운동+생활 꿀팁·3일×1편 계획(전략·주제 3개·추천 시각) → 3편 일괄 대본 성공(DB: 프로젝트 3개 같은 소유자·계획에 연결) → 첫 편 업로드 문구(제목 5·해시태그 8·태그 13, 당해 연도) 저장 DB 일치. 400px 계획·매뉴얼·음성 화면 넘침 없음. 시험 비용: Gemini 3.5 Flash-Lite 5회(계획 1·대본 3·SEO 1).
- 2026-10-16 v1.08 — 개선 3건(SQL `0018` 버전·`0019` 상세 페이지). 시험 계정 크롬: 14:27에 오늘 시작 계획(건강·운동 3일×2편) → 오늘 07:00이 15:30·19:00으로 자동 배치, 2번째 주제·시각 고치기(20:30)·마지막 항목 빼기 DB 일치, 1편 대본→배경(카드 5장 스톡)→음성 7개→MP4(89.6초·1080×1920·29.9MB·소리 있음) 일괄 완료·계획 `done` 기록 일치. 400px에서 일정 줄 버튼이 글자를 밀어내 가로 넘침(451px) → 줄바꿈 수정 후 넘침 없음. 시험 비용: Flash-Lite 3회(계획·대본·장면 설명), OpenAI TTS 7회, 스톡 무료. 일정 계산은 4개 시각(05:00·13:10·19:00·23:20) 단위 시험.
