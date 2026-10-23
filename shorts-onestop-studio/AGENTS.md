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

## 2026-10-21 v1.20 — MP4 인코더 공용화(엔진 공유 2번 1~3단계) (Claude Code 윈도우, 부계정)
- `src/lib/render/export.ts`가 소리 섞기·코덱 선택·프레임 인코딩·파일 묶기를 공용 기준 코드 **`browser-mp4-encoder`**(기준 `src/lib/render/mp4Encoder.ts`, 사본 `shots/src/lib/render/mp4Encoder.ts`)에 맡김. 배경 영상 받기·맞추기(`localVideos`·`syncVideo`·`seekVideo`)와 미리보기 재생 되돌리기는 export.ts에 남김. 진행률(1→3→4→5~97→98%)·문구 같음.
- **mp4Encoder.ts는 공용 기준 파일** — 고치면 `node scripts/check-shared-modules.mjs --sync`로 Shots 사본에 반영하고 두 프로그램을 함께 시험.
- 검수: tsc·build·공용 점검 통과, 운영 배포 Ready. 크롬 관리자 계정 대본 「2026 다이소 꿀템 TOP 4」(음성 0/6 상태) 다시 만들기 → **58.20초·1080×1920·16.8MB로 v1.19 기준과 같음**, 15초 장면 카드 1 정상. 음성이 있는 대본의 소리 섞기는 옮기기만 한 같은 코드라 이번엔 따로 시험하지 않음(Shots 브라우저 만들기 시험 때 함께 확인). SQL `supabase/migrations/0024_version_v1_20.sql`(버전만).

## 2026-10-21 v1.21 — 발행 계획 일정으로 예약 공개 채우기 + 일괄 제작 유튜브 예약 (Claude Code 윈도우, 부계정)
- 플랜(주인님 승인): [`docs/PLAN_20261021_PLAN_SCHEDULE_UPLOAD.md`](docs/PLAN_20261021_PLAN_SCHEDULE_UPLOAD.md).
- 업로드 공용 함수 `src/lib/youtube/browserUpload.ts`(`uploadToYoutube`·`uploadDefaults`·`planSlotIso`(KST 일정 → ISO, 15분 안·지난 시각은 null)·`DAILY_UPLOAD_LIMIT`=6). 렌더 ⑥ 카드와 일괄 제작이 함께 씀.
- ① 렌더 ⑥: `/api/items?kind=plan`에서 이 대본(`projectId`) 일정을 찾아 예약 공개를 켜고 날짜·시각을 채움 + 「📅 발행 계획 …」 안내(지났으면 안내만).
- ② 발행 계획 ③ 일괄 제작 칩 「📤 유튜브 예약」(🎬 MP4가 켜져야 켜짐). 편마다 MP4 → 일정 시각 비공개 예약 업로드(지난 일정은 예약 없이 비공개) → 대본 `youtube` 기록 + 일정 `done.yt`(영상 ID, 📤 배지 링크). MP4만 만들어 둔 편도 올릴 차례면 MP4를 다시 만들어 올림. 시작 전 연결 확인, 6편 초과 선택 시 확인 창, 한도 오류면 남은 편은 올리지 않고 안내. 제목·설명 = SEO 있으면 그것, 없으면 대본 제목 + #Shorts(AI 호출 없음).
- 이 배포에 미배포 공용 사본 함께 나감: `browser-mp4-encoder` `videoBitrate`, `youtube-upload-client` `publishAt`(원스톱 동작 같음).
- 검수: tsc·build, 운영 Ready, DB v1.21. 크롬 관리자: 시험 계획(일정 2027-03-20 19:00 → 대본 「2026 다이소 꿀템 TOP 4」)으로 ① 렌더 ⑥ 자동 채움·안내 확인 ② 일괄 1편(MP4+유튜브 예약) 30초 완료 → 영상 `KFxAhTxQ9sI`, 유튜브 스튜디오 「공개로 예약 2027.3.20 오후 7:00 · 게시 때까지 비공개」 확인. 시험 계획은 삭제, 영상은 주인님 삭제 필요 https://studio.youtube.com/video/KFxAhTxQ9sI/edit . AI 비용 0원.

## 2026-10-21 v1.22 — 사용 기록 `usage_logs` (보류 F 재판단용) (Claude Code 윈도우, 부계정)
- 서버 도우미 `src/lib/usage.ts` `recordUsage`(관리자 키, 실패해도 계속, 허용 이름 `script_created`·`mp4_made`·`youtube_uploaded`). AI 대본은 `/api/ai/script` 성공 때 서버가, 브라우저 동작은 `POST /api/usage`(guard: 권한·같은 출처·4KB, 동작 이름 허용 목록)로 기록 — 렌더 MP4·일괄 MP4(`batch`)·유튜브 업로드(`uploadToYoutube` 안, 영상 ID). 메타데이터는 ID·숫자만.
- 검수: tsc·build, 운영 Ready, DB v1.22. 크롬 관리자 렌더 MP4 1회(16.8MB) → `mp4_made` 1행, 허용 안 된 이름 400, 다른 사이트 요청 401. 비용 0원.

## 2026-10-22 v1.23 — AI 동영상 장면(기본 Gemini, 선택 fal·Replicate) (Claude Code 윈도우)
- 출처: 외부 무료배포 `shorts-auto` 비교 분석(`docs/analysis-shorts-auto-20261022/REPORT.md`) 묶음 ①, 주인님 지시 「기본값 gemini 키, replicate·fal 선택」·「모델 선택 옆에 생성 단가 표시」. 원본은 라이선스가 없어 코드·프롬프트 미사용.
- 배경 화면 장면마다 [AI 영상 $단가] 버튼: 사진 배경(AI 이미지·스톡 사진)을 첫 화면으로 5초 영상. 「다음 장면과 이어지게」를 켜면 다음 장면 사진을 끝 화면으로(이어 붙이기). ↺ 버튼으로 처음 사진 복귀.
- 모델·단가(`src/lib/videoModels.ts`, 2026-10-22 공식 가격표): Gemini Omni Flash `gemini-omni-1.1-flash`(기본, 초당 $0.10, 결제 연결 키 필요) · Replicate Seedance 1 Lite($0.036)·Kling v2.1($0.05, 이어 붙이면 pro $0.09) · fal Seedance 1.5 Pro($0.05)·Kling O3 Standard($0.14). 선택칸·버튼·안내에 장면 1개 예상 금액(달러·원) 표시.
- Veo 3.1 미리보기 모델은 Gemini API에서 2026-10-22 종료 → Google 안내대로 Omni Flash(Interactions API `POST /v1beta/interactions`, `background: true`·`store: true`, `GET /v1beta/interactions/{id}`로 확인). 백그라운드 거절 시 한 번에 기다리는 방식(270초)으로 다시 보냄.
- 서버 `src/lib/videoGen.ts`(제출·상태 확인·결과 저장, 자동 재시도 없음, 키를 보내는 주소는 공식 호스트만), `src/lib/videoParse.ts`(응답 해석·주소 검사 순수 함수), API `/api/ai/video`(action submit|check). 작업 번호를 대본 배경 `videoJob`에 저장 → 화면이 15초마다 확인, 새로고침 뒤에도 이어서. 만드는 중인 장면은 배경 변경·AI 이미지·삭제·스톡 채우기 잠금.
- 저장: 비공개 버킷 `<user_id>/video/*.mp4`(버킷에 video/mp4 추가, 파일당 30MB). 30일 자동 삭제 `/api/cron/cleanup-videos`(vercel.json 매일 03:30 KST, `CRON_SECRET` 새로 추가). 사용 기록 `video_made`.
- 키: `fal`·`replicate`를 설정 화면에 추가(연결 확인은 요금 없는 조회), 매뉴얼 Replicate(기존 게시글)·fal(새 게시글 `f5f46fea…`) 팝업. 매뉴얼 /guide·자주 묻는 질문 갱신.
- 검수: tsc·`npm test`(node --test 8개)·build, 운영 배포 3회(본 배포 + 로딩 중 첫 화면 표시·만드는 중 잠금·단가 자릿수 + 휴대폰 입력칸 폭), DB v1.23, 크롬 시험 회원으로 Pixabay 사진 2장 → 인트로 Gemini 영상(이어 붙이기) 제출→약 1분 뒤 완성→저장(720×1280, 5.0초, 2.8MB)→미리보기·장면 편집 재생 확인, 390px 확인, Replicate 연결 확인 거절 안내 확인.
- 비용: Gemini 영상 2회(약 $1.0, 시험 회원 본인 키) — 1회 승인이었으나 첫 영상 완성 뒤 화면에서 인트로 사진이 바뀌고 다시 눌려 2회째가 생김(이후 잠금으로 보완). Vercel 빌드 3회.
- 못 한 것: fal·Replicate 실제 생성(시험 회원 Replicate 토큰 거절 401·fal 키 없음), MP4 만들기에 AI 영상 포함 실측, 기존 AI 이미지·음성 30일 정리(IMPROVEMENTS #16).

## 2026-10-22 v1.24 — 회원 생성 파일 30일 자동 삭제 확대(AI 이미지·내레이션 음성) (Claude Code 윈도우)
- 정리 작업 `/api/cron/cleanup-videos` → `/api/cron/cleanup-media`(vercel.json 매일 03:30 KST): `<user_id>/` 바로 아래 AI 배경 이미지, `voice/` 내레이션, `video/` AI 영상 중 생성 30일 지난 파일 삭제. 오래된 순으로 받아 한 묶음이 모두 대상이면 처음부터 다시 받음(지우며 넘기다 건너뛰는 문제 방지). **제외**: `bgm/`(회원이 올린 음악), 대본 행.
- 화면: `useMedia`·`useAudio`가 서명 요청에 주소가 오지 않은 파일을 `gone`으로 기억(서명 API 한 번 60개 이하일 때만 판단). 음성 화면 「🗑️ 30일 지나 삭제됨」 + [음성 없는 장면 모두 만들기]가 다시 만듦, 배경 화면 「만든 지 30일이 지나 파일이 삭제되었습니다 — 다시 만들거나 골라 주세요」. 매뉴얼 자주 묻는 질문 추가.
- 검수: tsc·node --test 8개·build, 배포 Ready, DB v1.24, 새 주소 401·옛 주소 404, Supabase 서명 API가 없는 파일에 `signedURL: null` 확인, 크롬 시험 회원 대본 카드 3에 없는 경로를 잠시 넣어 두 화면 표시 확인 후 백업으로 복원. 비용: Vercel 빌드 1회, AI 0원.
- 미확인: 실제 삭제는 첫 파일이 30일 되는 2026-11-15 무렵부터(프로그램 시작 10-16) — 그 뒤 Vercel 로그에서 `removed` 숫자 확인.

## 2026-10-22 v1.25 — AI 영상 길이 선택 + 「모두 영상으로 만들면 약 $X」 합계 (Claude Code 윈도우)
- `videoModels.ts`: 모델별 허용 길이 `durations`(Gemini Omni·Seedance·Kling O3 5·8·10초, Kling v2.1 5·10초), `pickSeconds`(「장면 길이에 맞춤」= 장면보다 길거나 같은 가장 짧은 길이, 넘으면 최대 / 고정 길이는 가장 가까운 허용 값), `sceneCost(m, withEnd, seconds)`. 서버는 `seconds`가 허용 값인지 검사 후 업체에 전달(Gemini는 지시문 「About N seconds」, fal `duration` 문자열, Replicate 숫자), 작업·사용 기록에 `seconds`.
- 배경 화면: ⏱️ 영상 길이(장면에 맞춤 기본·5·8·10초 고정, 모델을 바꿔 못 받는 길이면 맞춤으로), 장면 버튼 「AI 영상 8초 $0.80」(이어 붙임 여부는 마우스 올림 안내), ② 위 「사진 배경 장면 N개를 모두 ○○로 영상으로 만들면 약 $X(원)」. 일괄 생성 버튼은 비용 때문에 만들지 않음.
- 검수: tsc·node --test 9개·build, 배포 Ready, DB v1.25, 크롬(좁은 폭) 시험 회원 대본에서 맞춤 8초 $0.80·5초 고정 $0.50·합계 변화 확인. 비용: 빌드 1회, AI 0원.
- 미확인: Gemini Omni가 「About N seconds」 지시대로 8·10초를 만드는지(v1.23 시험의 5초 요청은 5.0초) — Omni는 출력 길이만큼 청구되므로 금액은 실제 길이 기준.

## 2026-10-22 v1.26 — 본인 목소리 복제(ElevenLabs) (Claude Code 윈도우)
- 음성 모델에 ElevenLabs 다국어 v2(`eleven_multilingual_v2`)·Flash v2.5 추가(`src/lib/voice.ts`, 목소리 번호는 회원 계정에서 불러와 고정 목록 없음, 빠르기 0.7~1.2). 합성 `src/lib/tts.ts`(`POST /v1/text-to-speech/{voice_id}`, `xi-api-key`, mp3).
- `/api/voice/elevenlabs`: GET 회원 계정 목소리 목록(복제한 목소리 앞, 🎙️ 표시), POST 복제(`/v1/voices/add`, 이름·샘플 4MB 이하·동의 `consent=yes` 필수, 샘플은 우리 서버에 보관하지 않음). 음성 화면에 「🎙️ 내 목소리 복제하기」 칸.
- 키: `elevenlabs`를 설정 화면·연결 확인(`/v1/models`, 무료)·매뉴얼(메인 사이트 기존 게시글 9457687a) 연결.
- **운영 DB 수정(주인님 승인)**: `user_api_keys_provider_check`에 `fal`·`elevenlabs`가 없어 v1.23부터 fal 키 저장이 실패하던 상태 → 크롬 SQL 편집기로 두 이름만 추가(`supabase/migrations/0030_v1_26_elevenlabs_voice.sql`에 실행 SQL 기록). 확인 중 운영 DB가 `Prefer: tx=rollback`을 지원하지 않아 생긴 가짜 키 2건은 즉시 삭제.
- 검수: tsc·node --test 10개·build, 배포 Ready, DB v1.26, 로그인 없이 401. 크롬 시험 회원(주인님이 새 Replicate·fal·ElevenLabs 키 등록): **v1.23 Replicate Seedance 1 Lite 5초 실생성**(5.04초 11.3MB, 약 1분) · **fal Seedance 1.5 Pro 5초 실생성**(5.04초 5.2MB, 약 1분) · **ElevenLabs 복제**(대본의 AI 내레이션 4개를 이은 27초 샘플 → 「시험용 AI 목소리」 생성·자동 선택) → 인트로 내레이션 재생성 5.7초(48자). 시험 대본 음성 설정은 저장하지 않음.
- 비용: Vercel 빌드 1회, Replicate 약 $0.18, fal 약 $0.25, ElevenLabs 48자(Starter 크레딧 안).

## 2026-10-22 v1.27 — 단어 단위 자막(말하는 순간에 맞춤) (Claude Code 윈도우)
- 장면 음성 `Voice.words` = 대본 낱말(공백 기준)마다 음성 속 시작 시각(초). 자막 그리기(`scene.ts drawCaption`)는 words가 있고 내레이션이 같으면 조각 첫 낱말 시각에 표시, 없으면 기존 글자 수 비율 근사(이전 음성 그대로 동작).
- 시각 얻기: ElevenLabs는 `/with-timestamps`(글자 시각, 추가 요금 없음) → `startsFromChars`, OpenAI·Gemini 음성은 회원 OpenAI 키가 있으면 Whisper(`whisper-1`, 낱말 시각, 1분 약 $0.006) → `startsFromWords`(받아쓴 글자는 버리고 글자 수 비율로 대본 낱말에 맞춤 — 자막 글자는 항상 대본 그대로). Whisper 실패·키 없음이면 생략(음성 만들기는 성공). 자막 끄면 Whisper 안 부름.
- 순수 함수 `src/lib/voice.ts`(`tokensOf`·`startsFromChars`·`startsFromWords`·`timedCaptionChunks`) 시험 3개 추가(총 13개).
- 검수: tsc·node --test 13개·build, 배포 Ready, DB v1.27, 크롬 시험 회원: ElevenLabs(복제 목소리) 인트로 → words 12개(0~4.52초/5.29초), OpenAI 인트로 → Whisper words 12개(0~5.84초/6.86초), 저장 후 대본 음성 설정을 원래(OpenAI·코랄·1.05배)로 복원.
- 비용: Vercel 빌드 1회(승인 4회 중 4회째), OpenAI 음성+Whisper 약 $0.01, ElevenLabs 약 50자(크레딧).
- 미확인: 미리보기·MP4에서 자막 전환 순간을 눈으로 대조하지는 않음(데이터·함수 시험으로 확인).

## 2026-10-22 — AI 영상 호출을 공용 기준 코드로 전환(코드만, 미배포) (Claude Code 윈도우)
- `src/lib/videoModels.ts`·`videoParse.ts`·`videoProviders.ts`(신규)는 이제 공용 `ai-video-*` 사본(기준 `ai-image-studio/lib/video/`) — 직접 고치지 말 것. `src/lib/videoGen.ts`는 공용 `submitVideoJob`·`checkVideoJob`을 부르고 `VideoGenError`를 원스톱 `AiError`/`UserError`로 바꾼 뒤 회원 폴더에 저장하는 얇은 연결 코드. 장면 사진 주소 검사가 공개 버킷 주소도 받도록 넓어짐(원스톱 동작 영향 없음).
- 검수: tsc·`npm test` 13개·build 통과, 동작 같음 → **다음 원스톱 배포 때 함께**(버전 +0.01도 그때). 주인님 결정(빌드 1회 — Shots만).

## 2026-10-22 v1.28 — 공용 영상 코드 사본 배포 + Seedance 1 Lite 이어 붙이기 끔 (Claude Code 윈도우)
- 저장소에만 있던 공용 기준 코드 `ai-video-*` 사본 전환(`videoGen.ts` → 공용 `videoProviders`, 동작 같음)과 Shots v1.33에서 E006이 재현된 Seedance 1 Lite `endFrame: false`를 배포. 화면 목록에 「가장 저렴 · 720p · 이어 붙이기 없음」, 「이어 붙이기」를 켜도 이 모델은 첫 화면만 보내고 단가도 기본 단가로 계산.
- 검수: tsc·`npm test` 13개·build, 배포 Ready(`shorts-onestop-studio-1vmxo3g1j`, 빌드 1회 — 주인님 승인), DB v1.28, 크롬 시험 회원 대시보드 v1.28·디자인 화면 영상 모델 목록 확인(유료 생성 없음).

## 2026-10-22 v1.29 — 🎬 레퍼런스 쇼츠에서 대본 따기 (Claude Code 윈도우)
- 주인님 승인(빌드 1회·Whisper 1회·대본 1회). 주제 화면 「참고 자료」 옆 「🎬 레퍼런스 쇼츠에서 대본 따기」: 회원이 저장한 쇼츠(mp4·mov·webm)를 고르면 **브라우저 안에서** 소리만 뽑고(공용 기준 코드 `browser-video-extract` 사본 `src/lib/reelsMedia.ts`, 기준 `insta_auto_poster/src/lib/cardnews/reelsMedia.ts` — 직접 고치지 말 것, 최대 3분·WAV 3MB 이하) → 새 API `POST /api/ai/transcribe`(`guard` 3.2MB, audio/wav·base64 검사, 회원 본인 OpenAI 키 `whisper-1`·`language=ko`, 없으면 needKey 안내) → 「[레퍼런스 쇼츠 대본 — 「파일명」에서 실제로 말한 내용, 그대로 베끼지 말고 구성·후킹만 참고]」로 참고 자료 칸에 붙임(12000자). 기존 대본 생성(`reference`)이 그대로 씀. 영상·소리 저장 없음, DB 변경 없음. 매뉴얼 1단계 문장에 안내 추가.
- 검수: tsc, `npm test` 13개, build, 공용 점검 일치, 배포 `shorts-onestop-studio-qnf1vk8a4` Ready, DB v1.29. 크롬(시험 회원, 새 탭): Shots 46초 내레이션 영상 → 받아쓰기 7초(「예전엔 도서관에서 책 하나 찾겠다고… ISBN 번호만 기억하면 돼요…」) → 자기계발·주제 「도서관에서 10초 만에 책 찾는 법」 대본 6초, 6장(후킹·ISBN 반영 + 청구기호·촬영 팁 새 내용). 대본은 저장하지 않음.
- 관찰: 1장 문장이 레퍼런스 말투에 꽤 가까움 → `docs/IMPROVEMENTS.md`.
- 비용: 빌드 1회, Whisper 46초 약 $0.005, 대본 생성 1회 약 $0.01~0.02(시험 회원 본인 키, 승인 범위).

## 2026-10-22 v1.30 — 레퍼런스 쇼츠 문장 베끼기 방지 (Claude Code 윈도우)
- 주인님 승인(빌드 1회·대본 1~2회). `src/lib/reference.ts`(순수): `referenceBlocks`(참고 자료에서 「[레퍼런스 쇼츠 대본…」 블록 본문만), `words`(문장 부호 제거 어절), `copiedPhrases`(연속 `COPY_WORDS`=6어절 이상 같은 구간을 이어 붙여 최대 10개).
- `prompts.ts` `scriptPrompt`: 레퍼런스 블록이 있으면 「구성·후킹·심리만 참고, 문장은 새로, 연속 6어절 이상 같은 표현 금지(숫자·고유명사 사실은 허용), 첫 문장은 다른 상황·다른 말로」 규칙.
- `api/ai/script`: 기존 길이 재요청 뒤 레퍼런스와 겹침 검사(인트로 제목·내레이션·카드 제목·내레이션·아웃트로) → 겹치면 「이 구절은 쓰지 말 것」 목록으로 **1회만** 재요청 → 덜 겹치는 쪽 사용, 응답에 `copied`(남은 구절). 화면은 남으면 「③ 대본 다듬기에서 다른 표현으로」 안내(구절 3개까지 표시). 레퍼런스 블록이 없으면 동작 같음.
- 검수: tsc, `npm test` 16개(`tests/reference.test.ts` 3개 추가 — package.json 시험 명령에 포함), build, 배포 `shorts-onestop-studio-i0kj8q319` Ready, DB v1.30. 크롬(시험 회원): v1.29 받아쓰기 글을 참고 자료에 붙여 같은 주제 대본 6초 — 겹침 안내 없음, 1장이 「원하는 책을 찾으려고 서가 사이를 몇 시간씩 돌아다닌 적 있으신가요?」로 원문(「예전엔 도서관에서 책 하나 찾겠다고 몇 시간씩 헤매기…」)과 다른 표현, 이후 장도 새 구성(도서관 앱 → 검색). 재요청 경로는 이번 시험에서 발생하지 않아 시험 코드로만 확인. 대본 저장 안 함.
- 비용: 빌드 1회, 대본 생성 1회 약 $0.01~0.02(시험 회원 본인 키, 승인 범위).

## 2026-10-22 v1.31 — 「📋 참고 자료 전체도 베끼기 검사」 · 겹침 장면 노란 테두리 (Claude Code 윈도우)
- 주인님 승인(플랜 A). `reference.ts`: `guardText(reference, all)`(기본 레퍼런스 블록만, all이면 표시 줄만 빼고 참고 자료 전체), `hasCopy(text, ref)`.
- 주제 화면: 참고 자료가 있으면 「📋 참고 자료 전체도 베끼기 검사」 체크칸(기본 꺼짐) → `guardAll` 전송 → `scriptPrompt`에 「참고 자료 사용 규칙」(사실은 근거로, 문장은 새로, 6어절 이상 금지), API 겹침 검사·1회 재요청 대상도 `guardText`.
- 「③ 대본 다듬기」: 대본 생성 때 검사 대상 글을 기억(`guardRef`)하고 인트로(제목+내레이션)·카드(제목+내레이션)·아웃트로(내레이션)마다 브라우저에서 다시 검사 → 겹치면 노란 테두리(`#f5c542`)·「⚠ 겹침」, 고치면 바로 사라짐. 「내 대본」·불러온 대본은 검사 대상 비움.
- 검수: tsc, `npm test` 18개(2개 추가), build, 배포 `shorts-onestop-studio-ejdlf5ph1` Ready, DB v1.31. 크롬(시험 회원, 새 탭): 기사형 참고 자료 + 체크 → 대본 8초, 겹침 0 → 1번 카드에 기사 문장 붙이기 → 노란 테두리·「⚠ 겹침」(화면 캡처) → 원래대로 → 사라짐. 대본 저장 안 함.
- 비용: 빌드 1회, 대본 생성 1회 약 $0.01~0.02(시험 회원 본인 키, 승인 범위).

## 2026-10-22 v1.32 — INSTA 받아쓰기 받는 입구 (Claude Code 윈도우)
- 플랜 `../insta_auto_poster/docs/PLAN_20261022_COPY_GUARD_CARDS_HANDOFF.md`. 주제 화면(`/topic`)이 열릴 때 주소 `#ref-transcript=` 대사가 있으면 참고 자료에 「[레퍼런스 쇼츠 대본 — 「인스타 릴스」에서 실제로 말한 내용…]」 블록으로 넣고(v1.30 6어절 규칙·재요청·v1.31 노란 테두리 그대로), 「AI가 직접 대본」 모드·초록 안내, `history.replaceState`로 `#` 지움. 저장은 하지 않음(화면 상태).
- 공용 기준 `src/lib/reference.ts`에 `REF_HASH`·`REF_HANDOFF_MAX`(12000)·`refHandoffHash`·`readRefHandoff`(깨진 값·다른 `#`은 빈 값) — INSTA 사본 동기화(`--sync`).
- 검수: tsc, `npm test` 19개(1개 추가), build, 배포 `shorts-onestop-studio-hzu3893ld` Ready, DB v1.32, 크롬(시험 회원)에서 INSTA 버튼 주소로 열어 블록·안내 확인(대본 생성은 안 함).
- 미확인: 로그인하지 않은 상태로 넘기기 주소를 열면 로그인 화면을 거치며 `#` 부분이 사라질 수 있음(`docs/IMPROVEMENTS.md`).
- 비용: 빌드 1회, AI 호출 없음.

## 2026-10-22 v1.33 — 로그인 화면을 거쳐도 넘겨받은 대사 유지 (Claude Code 윈도우)
- 플랜 `../shorts-viral-studio/docs/PLAN_20261022_TRANSCRIPT_HANDOFF.md`(주인님 승인). 확인: 로그인하지 않고 `/topic#ref-transcript=…`을 열면 `/login?redirect=%2Ftopic`(307), 로그인 양식은 항상 `/dashboard`로 가서 대사가 사라졌음.
- 새 `src/lib/refHandoff.ts`: `stashRefHandoff`(로그인 화면이 주소 `#` 대사를 `sessionStorage` `onestop-ref-handoff`에 보관하고 `#` 지움), `hasStashedRefHandoff`(로그인 뒤 보관분이 있으면 `/topic`, 없으면 그대로 `/dashboard`), `takeRefHandoff`(주제 화면: 주소 `#` 먼저, 없으면 보관분 — 꺼내면 바로 지움). `LoginForm`·`TopicView` 연결.
- 받은 블록 이름 「넘겨받은 레퍼런스 쇼츠」, 안내 「다른 프로그램에서 넘긴 쇼츠 대사…」(INSTA·쇼츠 바이럴 공용).
- 검수: tsc, `npm test` 19개, build, 배포 `shorts-onestop-studio-nhc5nvw5i` Ready, DB v1.33. 크롬(시험 회원): 같은 탭 저장소에 대사를 넣고 `/topic` → 참고 자료 블록·안내, 저장소 비워짐. 쇼츠 바이럴 v1.13 버튼 주소로도 확인.
- 미확인: 실제 로그아웃 상태에서 로그인까지 이어지는 전체 흐름(주인님 크롬 로그인을 풀어야 해서 하지 않음) — `docs/IMPROVEMENTS.md` 2026-10-22 항목 갱신.
- 비용: 빌드 1회, AI 호출 없음.

## 2026-10-22 (배포됨 v1.34) — 공용 기준 `reference.ts`: 겹친 구절을 원문 글자 그대로 (Claude Code 윈도우)
- `copiedPhrases`가 어절의 원래 위치(`wordSpans`)로 원문을 잘라 돌려줌(「S P500」 → 「S&P500」, 쉼표 등 유지). 판정 규칙은 그대로. 시험 1개 추가(20개 통과). 사본 3곳 `--sync`(INSTA·쇼츠 바이럴·유튜브 바이럴 — 유튜브 바이럴만 v1.23에 배포). **다음에 이 프로그램을 배포하는 CLI는 버전 +0.01하고 이 항목을 「배포됨(버전)」으로 바꿀 것.** 플랜 `../youtube-viral-studio/docs/PLAN_20261022_SUMMARY_TRANSCRIPT.md`.

## 2026-10-22 v1.34 — 넘겨받은 대사에 보낸 프로그램 이름 표시 (Claude Code 윈도우)
- 플랜 `docs/PLAN_20261022_HANDOFF_SOURCE_NAME.md`(주인님 승인).
- 공용 기준 `src/lib/reference.ts`: `refHandoffHash(대사, from?)`가 `&ref-from=이름`(40자, 대괄호·낫표·줄바꿈 정리)을 덧붙이고 `readRefHandoffFrom`으로 읽음. 대사는 `encodeURIComponent`라 `&`가 섞이지 않음. 이름 없는 옛 주소도 대사는 그대로. 사본 3곳 `--sync`.
- `src/lib/refHandoff.ts`: 로그인 보관을 `{text, from}` JSON으로(예전 글자 그대로 보관분도 읽음), `takeRefHandoff`가 `{text, from}`을 돌려줌. `TopicView.tsx`: 블록 머리말 「○○에서 넘겨받은 레퍼런스 쇼츠」, 안내 「「○○」에서 넘긴 쇼츠 대사를…」(이름이 없으면 예전 문구).
- 보내는 쪽: INSTA v1.61(`APP_NAME`), 쇼츠 바이럴 v1.14(「쇼츠 떡상 분석·대본 자동화」), 유튜브 바이럴 v1.24(대본 분석·영상 요약 2곳, `APP_NAME`).
- 검수: tsc, `npm test` 21개(시험 1개 추가), 배포 `shorts-onestop-studio-qd6h9vsgu` Ready, DB v1.34. 크롬: 이름 실은 주소 → 안내 「「INSTA 포스팅 자동화」에서 넘긴…」·머리말 확인, 이름 없는 옛 주소 → 예전 문구 그대로, 주소 `#` 지워짐. 보내는 버튼 주소에 이름이 붙는 것은 코드·tsc로 확인(실제 버튼 클릭은 AI 결과가 필요해 이번엔 안 함).
- 비용: 빌드 4회(원스톱·INSTA·쇼츠 바이럴·유튜브 바이럴 순차, 승인 범위), AI 호출 없음.

## 2026-10-22 v1.35 — 레퍼런스 머리말 「출처: ○○」 · 참고 자료 출처 띠 (Claude Code 윈도우)
- 플랜 `docs/PLAN_20261022_REF_SOURCE_CHIPS.md`(주인님 승인).
- `src/lib/refBlocks.ts`(새, 다른 파일을 가져오지 않는 순수 함수): `refBlockHeader(출처)`, `refBlocks(참고 자료)`(블록별 출처·대사 글자 수, 예전 머리말도 읽음), `removeRefBlock(참고 자료, n)`. `REF_MARK`를 같은 값으로 두고 시험이 `reference.ts`와 같은지 확인(node --test가 확장자 없는 상대 가져오기를 못 찾아서).
- `TopicView.tsx`: 넘겨받은 대사·영상 파일 대본 블록 머리말을 `refBlockHeader`로(「출처: INSTA 포스팅 자동화」, 이름 없으면 「출처: 다른 프로그램」). 참고 자료 라벨 아래 블록마다 띠 「🎬 출처 ○○ · 대사 n자 ✕ 빼기」.
- 검수: tsc, `npm test` 25개(`tests/refBlocks.test.ts` 4개 추가), 배포 `shorts-onestop-studio-cno750dn9` Ready, DB v1.35. 크롬(메인 크롬): 이름 실은 주소 → 띠 「🎬 출처 INSTA 포스팅 자동화 · 대사 15자 ✕ 빼기」(넘침 없음)·머리말 「출처:」, 칸 맨 앞에 메모 입력 후 「빼기」 → 블록·띠만 사라지고 메모 「내 메모입니다」 유지.
- 못 한 것: 휴대폰 폭 화면 확인(띠가 `nowrap`이라 아주 긴 파일 이름이면 좁은 화면에서 넘칠 수 있음 — `docs/IMPROVEMENTS.md`).
- 비용: 빌드 1회(승인 범위), AI 호출 없음.

## 2026-10-22 v1.36 — 출처 띠 보완(긴 이름·위치 이동) · 완성 대본 → AI 썸네일·SEO 자동화 (Claude Code 윈도우)
- 플랜 `docs/PLAN_20261022_SCRIPT_TO_THUMBNAIL.md`(주인님 승인).
- `src/lib/refBlocks.ts`: `refBlocks()`가 블록 시작 위치 `start`도 돌려줌, `shortSource(이름, 20)`. `TopicView.tsx`: 띠 이름 버튼(누르면 `jumpToRef` — 칸에 초점·커서를 머리말로·줄 높이로 스크롤), 이름 20자 「…」(전체는 title), 줄바꿈 허용, 「✕ 빼기」만 `nowrap`.
- `RenderView.tsx` ⑤ 업로드 문구 아래 「📤 이 대본으로 썸네일 만들기」: 주제+장면 제목·내레이션(`scriptPlain`)을 공용 `refHandoffHash(대본, APP_NAME)`로 `https://thumbnail-master.buylife.xyz/seo`에(새 탭, 주소 `#` 뒤라 서버로 안 감, 12000자).
- 검수: tsc, `npm test` 27개(2개 추가), 배포 `shorts-onestop-studio-mteeg9izb` Ready, DB v1.36. 크롬(메인 크롬): 25자 이름 → 「…」·title 전체, 칸 앞 메모+빈 줄 20개 뒤 이름 클릭 → 커서 24(머리말 첫 글자)·scrollTop 9→392·머리말 보임. 375px 틀: 띠 294px·넘침 0·페이지 가로 넘침 0(3줄로 꺾여 높이 92px). 저장된 대본 「물 마시는 습관…」 `/render` → 링크(대본 453자·이름) 클릭 → 새 탭 썸네일 v1.10 대본 칸 453자·안내 확인.
- 비용: 빌드 2회(원스톱·썸네일, 승인 범위), AI 호출 없음.

## 2026-10-22 (미배포 — 다음 배포 때 함께, v1.37) — 출처 띠 모양 (Claude Code 윈도우)
- `TopicView.tsx` 띠: `display: inline-flex`·`border-radius: 10px`·「✕ 빼기」 `margin-left: auto`(좁은 화면에서 여러 줄일 때 알약 모양 대신 둥근 사각, 빼기는 오른쪽 끝). tsc 통과. **다음에 원스톱을 배포하는 CLI는 버전 +0.01, 휴대폰 폭에서 모양 확인 후 이 항목을 「배포됨(버전)」으로.**

## 2026-10-23 v1.37 — 30일 정리 기록(`usage_logs` cleanup_expired) + 대기 중이던 출처 띠 모양 배포 (Claude Code 윈도우)
- `src/app/api/cron/cleanup-media/route.ts`: 회원 폴더별 지운 개수(`images`·`voices`·`videos`)를 세어 회원별 `usage_logs` `cleanup_expired` 1건(`docs/PLATFORM_PATTERNS.md` §35, 메인 관리자 「30일 자동 정리」 표에 합산). 응답에 `loggedOwners`.
- 함께 배포: 출처 띠 모서리 10px·「✕ 빼기」 오른쪽 끝(`f055d6b70`, 미배포 대기 해제).
- 검수: tsc·시험 27개·build, 커밋 `9bdcef674`, 배포 `shorts-onestop-studio-9qojmdj84` Ready, DB v1.37, 정리 경로 비밀값 없이 401. 크롬(관리자) 375px 프레임 `/topic#ref-transcript=…&ref-from=<긴 이름>`: 띠 모서리 10px·2줄(52px)·「✕ 빼기」 오른쪽 끝(가장자리 9px)·가로 넘침 없음 → 시험 대본은 「✕ 빼기」로 지움.
- 비용: 빌드 1회, AI 0회.

## 2026-10-23 v1.38 — 배경음악: AI 음악 스튜디오 내 곡에서 고르기 (Claude Code 윈도우)
- 플랜 루트 `docs/analysis-music-studio-20261023/BGM_SHARED_PLAN.md` 2단계(주인님 승인). `src/lib/amsSongs.ts`(목록·복사, 공용 `ams_generations` 읽기만·본인 `user_id`), `/api/ams/songs`(GET)·`/api/ams/import`(POST, 같은 출처), `RenderView` 「🎵 ③ 배경음악」 고르기 목록. 복사본 `<회원>/ams/<uuid>.mp3|wav`(15MB까지) → 기존 `bgm` 모양 그대로라 미리보기·MP4 섞기 코드 변경 없음. 30일 정리 `SUBFOLDERS`에 `ams`(기록 이름 `tracks`).
- 검수: tsc·시험 27개·build, 배포 Ready·DB v1.38, 크롬 시험 회원 목록 14곡·고르기·복사본 재생 확인. 비용: 빌드 1회.
- 미배포 대기: 고른 곡 이름 번호 유지 `b48814471`.
