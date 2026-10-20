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
| P8 공개 | `programs.badges` `coming`→`new`(카탈로그 NEW 표시), VIP(드림AI팀) 등급 표 체크 확인 → 트리거로 VIP 138명 전원 부여 확인. 일반·실버·골드는 주인님이 직접 부여(지시). 쓰지 않게 된 `StepPreparing` 화면 삭제 | **v1.09 공개 완료**(2026-10-16) |
| 개선 v1.10 | ① 목표 길이 30·45·60초(`narrationBudget`: (초−장면×0.75)×6.0자×0.88 → 장면당 글자 수, 대본·일괄 공통, 길이별 기본 카드 3·4·5) ② 스톡 내용 맞춤(`pickStock`/`stockScore`: 검색어 낱말×태그 일치 + 세로·아시아인 가산, 영상이 하나도 안 맞으면 사진도 검색 — 일괄·디자인 모두 채우기 공용, 스톡 결과에 `tags` 추가) ③ 계획 [+ 주제 추가] ④ MP4 속도: 프레임마다 seek(약 53ms) 대신 배경 영상 2배속 재생+목표 시각 대기(`syncVideo`), 배경 영상 로컬 blob 캐시 → 같은 54.5초 대본 138초→26초 ⑤ 버그: Pixabay 주소 갱신 정규식 `\d` 누락(갱신이 한 번도 안 됨)·해시태그/검색 태그 입력이 영문 s에서 잘림·입력 중 띄어쓰기/쉼표 지워짐 → 칸을 벗어날 때 저장. 완성 MP4는 서버 보관 안 함(처음 설계 유지) | **v1.10 배포·실화면 검수 완료**(2026-10-16) |
| 개선 v1.11 | ① 스톡 점수에 두 낱말 구절 일치 +1(`stockScore` — "living room" 태그 4점 vs 숲 2점) ② 자막 `captions.voiceOnly`(기본 켬): MP4(`renderFrame` `final`)에는 목소리가 있는 장면에만 자막, 미리보기는 스타일 확인용으로 항상 표시 ③ 목표 길이: 대본 API가 내레이션 합계가 예산의 1.2배를 넘으면 "더 짧게" 1회 재요청 후 목표에 가까운 쪽 사용 | **v1.11 배포·실화면 검수 완료**(2026-10-16) |
| 개선 v1.12 | 가이드북(/guide) 가독성 및 줄넘김 전면 개편: 12px 흐릿한 텍스트 5개 단락을 14px 표준 폰트 크기, 5대 독립 카드(디자인·배경, 음성·자막·음악, 발행 계획, 장면 편집, 내 지침), 알약 뱃지, 단계별 줄바꿈·볼드 키워드로 전면 리팩터링. Microsoft Edge 실세션 검수 완료 | **v1.12 배포·실화면 검수 완료**(2026-10-16) |
| 개선 v1.13 | 로그인/회원가입 표준 2탭 레이아웃(플로우 위저드 테마) 전면 개편: 24px 퍼플 모눈 격자, 쇼츠 필름 릴 심볼, 2탭 토글 바, 메일/자물쇠 아이콘(42px 패딩), 비밀번호 찾기, 풀 위드 로즈-퍼플 그라디언트 버튼, 통합 안내 박스 및 약관 푸터 완비. Microsoft Edge 실세션 검수 완료 | **v1.13 배포·실화면 검수 완료**(2026-10-17) |

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
- 2026-10-16 v1.09 — P8 정식 공개(SQL `0020`): 배지 `new`, VIP 자동 부여 확인(138/138, 트리거 `grade_program_access_sync`, 만료 = 부여 시점+365일). 주인님 지시 "프로그램이 완성되거나 업데이트되면 VIP 등급은 자동으로 사용권한 부여, 나머지 등급은 직접 수정·부여" → 관리자 정책 문서에 기록. 카탈로그 크롬 확인(NEW·v1.09).
- 2026-10-16 v1.10 — 개선(SQL `0021`). 시험 계정 크롬: MP4 54.5초 대본 129초(로컬 캐시만)→26초(2배속 재생 방식), 결과 54.5초·소리 54.49초·배경 영상 움직임 확인(1초 간격 화면 차이, 25fps 원본이라 30프레임 중 4프레임 중복). 계획에 주제 추가(10-19 19:00) → 30초 목표로 대본·배경·음성 일괄: 카드 3·내레이션 199자·음성 합계 32.2초(이전 89초) → 실측(6.2자/초, AI 16% 초과)으로 글자 수 식 보정(계산상 30초 목표 ≈ 29.5초, 보정 후 재시험은 안 함). 스톡 선택: 첫 결과 대신 태그가 맞는 2·6번째 결과 선택 확인. Pixabay 사진·영상 주소 갱신 응답 확인. 해시태그 입력·저장 DB 일치. 400px 3화면 넘침 없음. 시험 비용: Flash-Lite 2회·TTS 5회·스톡 무료.
- 2026-10-16 v1.11 — 개선 3건(SQL `0022`). 시험 계정 크롬: 인트로만 음성 있는 대본 MP4 → 5초(인트로) 자막 있음·22초(소리 없는 카드) 자막 없음. 목표 길이 실측(장면 여백 포함): 45초 → 46.6초(247자·카드 4), 60초 → 처음 71.9초(426자, AI가 47% 초과) → 재요청 로직 추가 후 56.1초(333자·카드 5). 30초는 v1.10에서 36초(보정 전). 시험 비용: Flash-Lite 3회·TTS 20회(45초 6·60초 7·60초 재시험 7).
- 2026-10-16 v1.12 — 가이드북(/guide) 가독성 및 줄넘김 전면 개편(SQL `0023` 버전 동기화). 주인님 제보 "텍스트가 너무 작고 줄넘김 처리가 안 되어 있음" 피드백 반영: 기존 12px 흐릿한 단락 5개를 14px 표준 폰트 및 5대 독립 카드 그리드(`sub-guide-grid`)로 리팩터링하여 모바일·데스크톱 시인성 극대화. Supabase 공유 DB `programs.version='v1.12'` 동기화, Vercel 프로덕션 배포 완료. Microsoft Edge 브라우저로 14px 확대 및 줄넘김 정상 표시 검수 완료. 산출물: `docs/PLAN_20261016_GUIDE_READABILITY_RENEWAL.md`, `docs/DESIGN_HANDOFF.md`, `docs/IMPROVEMENTS.md`(14번), `docs/IMPROVEMENT_HANDOFF_20261016.md`.

## v1.14 (2026-10-17) 이미지 모델 최신 교체 — Claude Code(윈도우)
- `src/lib/media.ts` `src/components/views/DesignView.tsx` : 구형(gemini-2.5-flash-image·gemini-3.1-flash-image·*-preview·Imagen) → 최신 정식(`gemini-nano-banana-2.1`·`gemini-3-pro-image`), 주소 v1beta (기준: ai-image-studio v1.11 `lib/providers/adapters/gemini.ts`).
- 실제 이미지 생성 시험은 하지 않았습니다 — 이미지 생성 오류가 나면 그때 테스트 검증합니다(주인님 지시).

## 2026-10-17 v1.15 — 이미지 생성 호출·모델 목록을 공용 기준 코드로 (4묶음 A 직접 호출형, Claude Code 윈도우)
- `src/lib/media.ts` `generateSceneImage()`가 공용 사본으로 위임 — 9:16·150초·`AiError` 문구·형식 검사 그대로, **재시도 없음**(함수 한도). `IMAGE_MODELS`는 공용 등급표 1K·2K 등급(값 동일).
- 공용 사본이 주는 것: 키 머리글 전송, 시간 제한, 응답의 모든 조각에서 **최종** 이미지 선택(gemini-3-pro-image의 중간 초안 `thought` 조각 제외), 안전 차단·한도·키 오류 구분, 키 가리기. 프롬프트·비율·화질은 그대로.
- 검수: tsc 0·기존 테스트 통과, Vercel 프로덕션 배포·DB 버전, 크롬 화면 버전 확인. 실제 이미지 생성 시험은 하지 않음 — 오류가 나면 그때 검증(주인님 지시).
- **주의(다음 CLI)**: `geminiImage.ts`·`nanoBananaModels.ts`는 공용 기준 코드 사본이다(기준: `ai-image-studio/lib/providers/`). 직접 고치지 않는다. 이 프로그램만 결과를 다르게 해야 하면 `getNanoBananaConfig()`/`NANO_BANANA_MODEL_CONFIGS` 결과를 호출하는 쪽에서 덮어써 보완한다. 지도: 루트 `docs/SHARED_FEATURE_MAP.md` §3.

## 2026-10-17 v1.16 — 이미지 생성 시간 초과 안내 문구 통일 (Claude Code 윈도우)
- 공용 기준 `gemini-image-client`(ai-image-studio)의 시간 초과 안내를 「이미지 생성이 N초 안에 끝나지 않았습니다. 이미지가 이미 만들어졌을 수 있으니 잠시 뒤 결과를 확인한 다음 다시 시도해 주세요.」로 바꿔 사본을 `--sync`로 다시 받음. 시간 초과여도 구글 쪽에서는 이미지가 만들어져 회원 키에 요금이 나갔을 수 있어, 바로 다시 눌러 이중 과금되는 일을 줄이려는 목적이다. 프롬프트·모델·화질·시간 제한 값은 그대로.
- 이 프로그램이 따로 덮어쓰던 시간 초과·연결 끊김 문구도 같은 뜻(「이미지 생성 응답을 받지 못했습니다. 이미지가 이미 만들어졌을 수 있으니 잠시 뒤 결과를 확인한 다음 …」)으로 고침: `src/lib/media.ts`.
- 검수: 기준 테스트 8개 통과(문구 확인 추가), `check-shared-modules` 전부 OK, Vercel 프로덕션 배포·DB 버전, 크롬 화면 버전. 실제 이미지 생성 시험은 하지 않음(비용).

## 2026-10-18 v1.17 — 이미지 시간 초과 자동 재시도 중단(이중 과금 방지) (Claude Code 윈도우)
- 공용 기준 `gemini-image-client`(ai-image-studio)이 **시간 초과(TIMEOUT)는 자동으로 다시 보내지 않도록** 바뀌어 사본을 `--sync`로 다시 받음. 시간 초과여도 구글 쪽에서는 이미지가 만들어져 회원 키에 요금이 나갔을 수 있어, 자동 재시도가 이중 과금의 원인이 될 수 있었다. 서버 오류·혼잡(429)·연결 실패는 그대로 1회 재시도. 프롬프트·모델·화질·시간 제한 값·안내 문구는 그대로이고, 시간 초과 안내가 재시도 대기 없이 더 빨리 뜬다.
- 이 프로그램은 이미 `retries: 0`이라 동작 변화 없음(버전만 맞춤).
- 검수: 기준 테스트 8개 통과(시간 초과 1회 요청·연결 실패 2회 요청 확인), `check-shared-modules` 전부 OK, Vercel 프로덕션 배포·DB 버전, 크롬 화면 버전. 실제 이미지 생성 시험은 하지 않음(비용).

## 2026-10-18 v1.18 — 이미지 시간 초과 안내를 「Google 사용량 확인」으로 정정 (Claude Code 윈도우)
- 공용 기준 `gemini-image-client`(ai-image-studio)의 시간 초과 안내를 정정해 사본을 `--sync`로 다시 받음: 「…결과를 받지 못했습니다. 구글 쪽에서는 이미 생성되어 요금이 나갔을 수 있으니, 바로 다시 누르기 전에 Google AI Studio 사용량(https://aistudio.google.com/usage)을 확인해 주세요.」 이전 문구 「잠시 뒤 결과를 확인」은 틀린 안내였다 — 시간 초과는 우리 서버가 요청을 끊는 것이라 이미지가 프로그램(보관함 등)에 저장되지 않고, 회원이 확인할 수 있는 것은 본인 Google 사용량(요금)뿐이다.
- 이 프로그램이 덮어쓰던 이미지 시간 초과·연결 끊김 문구도 같은 사용량 확인 안내로 고침: `src/lib/media.ts`.
- 검수: 기준 테스트 8개 통과(사용량 주소 포함 확인), `check-shared-modules` 전부 OK, Vercel 프로덕션 배포·DB 버전, 크롬 화면 버전. 실제 이미지 생성 시험은 하지 않음(비용).

<!-- DETAILED_PROGRAM_REVIEW_20261019 -->
## 2026-10-19 Codex — 프로그램별 상세 개선 분석(구현 아님)

[세부 개선안·필요 이유·근거·시험 조건](docs/DETAILED_REVIEW_20261019.md) · [전체 83개 분석](../docs/program-reviews-20261019/INDEX.md) · [공통 아이디어 표](../docs/PROGRAM_IDEA_BACKLOG.md). 이 프로그램 3개 검토 항목입니다. 코드·DB·환경변수·배포는 바꾸지 않았습니다. 작업 전 최신 개선 원장·ACTIVE_WORK와 대조하고 이미 해결된 기능은 보존합니다. 후속 작업 후 처리 ID·증거·미완료·새 인사이트·프로그램 링크를 기록합니다.
<!-- /DETAILED_PROGRAM_REVIEW_20261019 -->

## 2026-10-21 v1.19 — 유튜브에 바로 올리기(엔진 공유 1번) (Claude Code 윈도우)
- 유튜브 병합 분석 보류 F의 「엔진 공유」 1번(주인님 「진행해줘」). 플랜: [`docs/PLAN_20261021_YOUTUBE_UPLOAD.md`](docs/PLAN_20261021_YOUTUBE_UPLOAD.md).
- 렌더 화면 **⑥ 유튜브에 올리기**(`src/components/views/YoutubeUploadCard.tsx`): 연결 채널 표시·제목(문구 후보에서 고르기)·설명란+해시태그(#Shorts 자동)·검색 태그·공개 범위(비공개 기본·일부 공개·공개)·카테고리·예약 공개(15분 뒤 이후, 그때까지 비공개)·진행 막대·올린 기록(대본 `data.youtube`, 최근 10개, 같은 대본 다시 올리기 경고).
- 서버: `GET /api/youtube/status`(상태만, 토큰 안 보냄) · `POST /api/youtube/upload-session`(재개 가능 업로드 주소만 발급). **영상은 브라우저 → 유튜브 직접 PUT**(Vercel 4.5MB 한도·접근 토큰 비노출, 업로드 주소는 그 영상 한 개용). 요청 `Origin`을 세션 생성에 실어 구글이 이 화면 출처의 PUT을 허용.
- 유튜브 연결 화면은 두지 않음 — 공용 연결 계정(`member_platform_accounts` platform `youtube`, 사본 `src/lib/memberIntegrations.ts`)만. 권한은 `youtube.upload`·`youtube.force-ssl`·`youtube` 중 하나(구글 `videos.insert` 허용 권한 — 유튜브 댓글 자동화 연결도 그대로 됨), `app_ref` = 회원 `google_client_id`일 때만(갱신 토큰은 발급 앱 전용). 갱신 실패면 공용 표에 「다시 연결 필요」 표시. 상태별 안내: `src/lib/youtube/account.ts` `youtubeStateMessage`.
- 공용 기준 코드 `youtube-upload-client`: 기준 `shots/src/lib/youtube/client.ts`(+ `createYoutubeResumableSession`), 사본 `src/lib/youtube/client.ts` — 직접 고치지 말고 기준만 고친 뒤 `--sync`.
- 매뉴얼(/guide) 업로드 안내·FAQ 2개, 메인 상세 소개(🎙️·🔑 단락 끝 문장)·사용 순서 4단계·특징 4번 문구 갱신. SQL `supabase/migrations/0023_v1_19_youtube_upload.sql`(버전만, 구조 변경 없음).
- 검수: tsc·build·공용 점검 통과, 운영 배포 Ready, 크롬 시험 계정(연결 없음) ⑥ 안내·연결 버튼 확인. 관리자 계정 비공개 실업로드 완료(2026-10-21): 58.2초·16.8MB MP4 → 「공동구매 아카데미」 비공개, 영상 ID `hdPuSpoz1eY`, 진행률 표시·대본 기록 저장(DB 확인)·유튜브 「비공개 동영상」 확인. 서버가 세션 생성에 `Origin`을 실으면 브라우저 직접 PUT이 허용됨을 확정. 공용 연결 계정이 `youtube.force-ssl`만 있어도 업로드됨 확인. **시험 영상은 주인님이 유튜브 스튜디오에서 삭제.**
