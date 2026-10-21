# 플레이리스트 채널 제작 자동화 — 인수인계 (AGENTS.md)

> 다른 CLI가 대화 없이 이어서 작업할 수 있도록 쓴 문서입니다. 작업 전에 루트 `CLAUDE.md`, `docs/HANDOFF.md`, `docs/ERROR_LESSONS.md`를 먼저 읽습니다. 작업 기록은 아래 "작업 기록"에 **추가만** 합니다.

## 1. 한눈에 보기
| 항목 | 값 |
|---|---|
| 이름 / slug | 플레이리스트 채널 제작 자동화 / `playlist-channel-studio` |
| 현재 버전 | **v1.24** (`src/lib/version.ts` = `package.json` = DB `programs.version`) |
| 라이브 | https://playlist-maker.buylife.xyz (https://playlist-channel-studio.buylife.xyz 둘 다 지원) |
| Vercel | 팀 `buylife`, 프로젝트 `playlist-channel-studio` (CLI 업로드 배포) |
| 배지·카테고리 | FREE + new, 유튜브, 최소 등급 일반, 요금제 1·2·3개월 등록 |
| 스택 | Next.js 16 · React 19 · Tailwind 4 · Supabase(DB+Storage) · `@google/genai` · `sharp` |
| 비용 | **회원 본인 키**(Gemini / OpenAI / Anthropic Claude, `user_api_keys`의 provider `gemini`·`openai`·`anthropic`)로 서버 호출 → 운영자 AI 비용 없음. 저장소(썸네일)는 운영자 부담 → 사용자당 프로젝트 30개 + 1280x720 JPEG |
| 참고 원본 | ai-playlist-creator-bice.vercel.app (HTML·번들 전체 분석, 흐름·옵션 참고, 프롬프트·문구는 새로 작성, 제작자 크레딧 미복제) |

## 2. 무엇을 하는가
① 장르(기본 14개 + 추천 9개 = 카드 23개 + 직접 입력) → ② 제목 10개(`playlist 이모지 한국어 문장 | 영어키워드 & 영어키워드` 형식 검증·보정, 직접 쓰기 가능) → ③ 4개 탭
- **Suno 프롬프트**: 변형 3개, 각 900자 미만(서버가 쉼표 단위로 자름).
- **가사**: 언어 5종(ko/en/ja/es/fr), 이중 언어 비율 10~90%, 곡 1~20, 은유 4단계, 곡 구조 15종(자동=장르 BEST), 인트로/아웃트로 가사, 연주곡 모드, 주제 메모. 곡 계획을 먼저 뽑고 4곡씩 병렬로 작성(곡 겹침 방지, 최대 300초).
- **유튜브 메타데이터**: 설명글, 해시태그 5개(`#playlist` 맨 앞), 키워드 15개.
- **썸네일**: 스타일 7종 배경(글자 없이 생성) + 인물 참고 이미지(저장 안 함) + 글꼴 14종·크기·색·굵기·위치로 Canvas 합성, PNG/JPG 저장, 프롬프트 복사, 수정 요청 재생성(현재 썸네일을 참조 이미지로 사용).
- 모델 선택: 텍스트 Gemini 2.5 Flash/Flash-Lite · GPT-4o mini/4o · Claude Haiku 5.5/Sonnet 5.5, 이미지 나노바나나/프로 · gpt-image-1(Claude는 이미지 불가). 선택은 브라우저 localStorage(편의용).
- 사용량: 호출 응답의 토큰·시간으로 예상 비용을 이 브라우저 localStorage에 기록·표시(실제 청구액과 다를 수 있음).

## 3. 구조
```
src/lib/playlist/types.ts     상수(장르·언어·구조·스타일·글꼴·모델·한도)와 타입
src/lib/playlist/prompts.ts   프롬프트(연도 규칙·한국인 묘사 기본·JSON 응답)
src/lib/playlist/validate.ts  AI 응답 정리 순수 함수(제목 형식·900자·해시태그·옵션 보정·비용)
src/lib/llm.ts                Gemini(SDK)·OpenAI·Claude(REST) JSON 호출, 이미지(Gemini/OpenAI) 생성, 오류 한국어화, needKeyBody
src/lib/apiKeys.ts            공급사별 본인 키 조회·저장·삭제(폴백 없음)
src/lib/routeGuard.ts         requireAccess / requireAccessAndKey(provider)
src/lib/projects.ts           소유 확인, 비공개 버킷 업로드/서명 URL, sharp 정규화
src/app/api/projects          목록·생성(30개 제한)
src/app/api/projects/[id]     조회·PATCH(제목 선택·썸네일 글자 설정)·삭제(파일 포함)
src/app/api/projects/[id]/generate  kind = titles|suno|lyrics|meta|thumbnail (모델의 공급사 키를 확인)
src/app/api/user-key          공급사별 키 GET/POST/DELETE
src/components/studio/*       StudioWorkspace(흐름) · ContentTabs(Suno/가사/메타) · ThumbnailTab(Canvas) · useAi(모델·사용량·키 안내 모달) · common
```
- 접근 판정은 `image-convert-studio`와 같은 핸드폰 확인 포함 코드. 모든 API route에 `dynamic/fetchCache` 두 줄, 모든 쿼리에 `user_id` 필터.
- 제목을 바꾸면 Suno·가사·메타·썸네일(파일 포함)을 비운다(제목에 맞춘 결과이므로).

## 4. DB (공용 Supabase `esgxyikcnnvmlhygjkth`)
- `playlist_projects` (user_id, genre, title, titles jsonb, content jsonb{suno,lyrics,meta}, status[created|titled|content], thumb_path, thumb_settings, thumb_prompt) — RLS owner-only. 마이그레이션 `supabase/migrations/0001_playlist_tables.sql`(적용 완료), 등록 `0002_register_program.sql`.
- Storage 버킷 `playlist-thumbs`(비공개, 4MB): `<user_id>/<project_id>/thumb.jpg`.

## 5. 동작 메모 (원본과 다르게 한 점)
- 키: 원본은 브라우저 localStorage(base64)+직접 호출 → 서버 호출·회원 본인 키·공급사별 안내 모달.
- 결과: 원본은 새로고침하면 사라짐 → 프로젝트 저장, `?p=<id>` 이어보기.
- 썸네일: 이미지에는 글자를 넣지 않고 화면에서 합성(한글 깨짐 방지). 원본의 "LiteLLM Proxy Monitor" 가짜 이름·제작자 크레딧은 가져오지 않음.
- 화면 언어 전환(KR/EN)은 v1.02에서 구현하지 않음(한국어 고정).

## 6. 배포·운영 절차
1. `npm test` → `npm run build`. 2. 버전 +0.01(`src/lib/version.ts`의 `APP_VERSION` **줄만**) + `package.json` + DB `update programs set version=… where slug='playlist-channel-studio'` + 이 문서. 3. `cd playlist-channel-studio && vercel deploy --prod --yes --scope buylife`. 4. 경로를 지정해 커밋 후 `git push origin master`. 5. 라이브 새로고침해 사이드바 버전 확인.
- 환경변수 4개는 `scripts/add-playlist-channel-vercel-env.mjs`로 등록 완료. 카탈로그 썸네일은 `scratch/make_playlist_thumb.mjs`(운영자 본인 계정의 본인 Gemini 키 1회, 임시).

## 7. 알려진 한계·남은 일
- 검수(2026-10-13, 관리자 계정 본인 키 3종 등록 상태): 장르→제목 10개→선택→Suno 3종(900자 미만)→가사 3곡(이중 언어)→메타데이터→썸네일 생성·글자 합성(한국인 인물, 글꼴 적용)→Claude Haiku 5.5 텍스트 호출 200→키 미등록 안내 모달(fetch 모의)→모바일 폭 가로 넘침 없음→프로젝트 삭제(목록 0건). 시험 데이터는 삭제함.
- **미확인**: 일반 회원(`buylifemall@naver.com`) 계정 시험, 터치 기기, 시험은 모두 관리자 계정(본인 키 3종)에서만 했다.
- 화면 언어 KR/EN 전환 미구현. 원본의 곡 구조 15종·장르 10종·스타일 7종·글꼴 14종은 목록을 새로 구성함(원본과 이름이 다를 수 있음).
- 같은 폴더를 다른 CLI도 쓴다: 커밋은 경로를 지정(`git commit -- playlist-channel-studio …`).

## 8. 작업 기록 (추가만)
- **2026-10-13 v1.01** 신규 구축·테이블/버킷 마이그레이션 적용·첫 배포·도메인 연결·프로그램 등록(FREE+new, 유튜브).
- **2026-10-13 v1.05** 20곡 시험에서 재시도 후에도 4곡이 비는 현상 → 모델이 묶음 안에서 곡 번호를 다시 1부터 매기는 경우를 대비해 "번호가 이 묶음에 있으면 그대로, 아니면 순서로" 짝짓도록 보정.
- **2026-10-13 v1.04** 가사 20곡 시험에서 4곡이 누락되던 문제 수정: 실패하거나 빠진 곡은 한 번 더 시도(최대 2회). 실제 시험(관리자 본인 키): OpenAI GPT-4o mini 제목·GPT-4o 메타데이터 200, gpt-image-1 썸네일 22초·나노바나나 프로 썸네일 20초 성공, 가사 20곡 약 19초.
- **2026-10-13 v1.03** 장르 확장: 참고 사이트의 Pop·Study/Focus·Workout·Meditation 추가 + 추천 장르 9개(수면/앰비언트·카페 보사노바·드라이브 신스웨이브·클래식 피아노·힙합·록/밴드·트로트·캐럴/시즌·트로피컬/레게), 화면은 기본/추천 구역으로 나눔, 장르별 BEST 곡 구조 지정.
- **2026-10-13 v1.02** 모델 안내 문구 중복("Gemini·Gemini") 수정, 카탈로그 썸네일 등록, 인수인계·매뉴얼 문서 작성.


## B5 (2026-10-15) — 한국 시간 현재 월 기준 추가 (v1.06)

- 주 생성·분석 지침에 한국 시간 기준 현재 연·월을 반영하고, 계절·시기 표현은 현재 월에 맞추며 불필요한 계절·연도 표현을 덧붙이지 않도록 했습니다.


## 2026-10-16 DB 연동 변수 호환 — v1.07 (playlist-channel-studio)

작업 전 [최상위 데이터베이스 연동 지침](../docs/DATABASE_CONNECTION_POLICY.md)과 [전체 전환 인수인계](../docs/DATABASE_CONNECTION_HANDOFF.md)를 먼저 읽습니다. 공개 키는 새 PUBLISHABLE 이름 우선·기존 ANON 이름 호환, 서버 키는 새 SECRET 이름 우선·기존 SERVICE_ROLE 이름 호환입니다. 새 값 없음/공백일 때만 같은 종류의 기존 값을 사용하며, 인증 실패 후 다른 키로 재시도하지 않습니다. 기존 변수·실제 키·회원 권한·Cron은 유지합니다. 배포·회원 검수 결과는 전체 인수인계의 프로그램별 기록에서 확인합니다. 기존 변수 삭제와 실제 키 폐기는 별개이며 안정화 확인 전 삭제하지 않습니다.

## 2026-10-16 사이버 네온 다크 콘솔 디자인 리뉴얼 & 비주얼 가이드 신설 — v1.08 (playlist-channel-studio)
- **스타일 템플릿**: 사이버 네온 다크 콘솔 스타일 (`Cyber Neon Dark Console Style`)
- **라이브 도메인**: `https://playlist-maker.buylife.xyz/` (Vercel 공식 프로덕션 도메인 연결 완료)
- **사이드바 개선**: 유틸리티 최상단에 `📖 연동 & 사용 매뉴얼` (`/guide`) 메뉴 탑재 (사이언 네온 하이라이트 배지 적용), 하단 계정 블록 12px 밀착 정렬.
- **가이드북(`/guide`) 전면 신설**:
  - 5단계 스튜디오 파이프라인 비주얼 인포그래픽 (장르 기획 → 제목/가사 AI 생성 → Suno 프롬프트 연동 → 썸네일 합성 → 원클릭 유튜브 업로드)
  - 필수 AI API 키 연동 안내 카드 (OpenAI, Gemini, Claude, Groq 등 본인 키 등록)
  - 23종 추천 장르 맵 및 최적 BPM/보컬 스타일 프리셋 인터랙티브 탭 (K-Pop, Lo-Fi, 재즈, 시티팝 등)
  - 유튜브 알고리즘 떡상 노하우 카드 (썸네일/타이틀 A/B 테스팅, 태그 최적화, 챕터 타임스탬프)
  - 초보자 맞춤 FAQ 4종 (상업적 이용, 저작권, 음원 길이, 에러 대처)
- **실세션 검수**: Microsoft Edge (`msedge.exe`) 전용 데스크톱(1440px) 및 모바일(380px) 전면 검수 완료.
- **인수인계 문서**: `docs/PLAN_20261016_DESIGN_RENEWAL.md`, `docs/DESIGN_HANDOFF.md`, `docs/IMPROVEMENTS.md`, `docs/IMPROVEMENT_HANDOFF_20261016.md` 작성.

## 2026-10-16 전체 페이지 단일 배경색 및 일관된 테마 스타일 전면 통일 — v1.09 (playlist-channel-studio)
- **개선 내용**: 매뉴얼(`/guide`)만 다크 테마이고 스튜디오 및 프로젝트가 라이트/그레이로 불일치하던 현상을 해소하고, 전체 화면(`layout`, `Sidebar`, `/studio`, `/projects`, `/settings`, `common`)을 **사이버 네온 다크 콘솔 스타일(`bg-[#060911]`, `bg-[#0d1322]`, 네온 사이언 액센트)**로 전면 일치.
- **버전 동기화**: `src/lib/version.ts`, `package.json`, Supabase DB `programs.version = 'v1.09'` 동기화.
- **실세션 검수**: Microsoft Edge (`msedge.exe`) 전용 실세션 전 화면 캡처 대조 검수 완료 (`edge_playlist_studio_desktop_v109.png`, `edge_playlist_projects_desktop_v109.png`, `edge_playlist_settings_desktop_v109.png`, `edge_playlist_guide_desktop_v109.png`, `edge_playlist_studio_mobile_v109.png`).

## 2026-10-17 로그인/회원가입 표준 2탭 레이아웃 개편 — v1.10 (playlist-channel-studio)
- **개선 내용**:
  - 기존 구형 화이트 박스 로그인 화면으로 인한 테마 불일치를 해소하고 사이버 네온 다크 콘솔 스타일(`bg-[#060911]` 딥블랙 + 24px 사이안 모눈 격자, 카드 다크 글래스모피즘 `#0b1120`/90)로 전면 통일.
  - `threads-comment-reply` 표준 규격에 맞춘 `[로그인]` / `[회원가입]` 2탭 세그먼트 토글 컨트롤(네온 사이안-인디고 그라디언트 활성 탭) 탑재.
  - 헤더 안내의 잘못된 타 프로그램 복사 문구를 정정하고, 오래된 회원가입 URL을 `https://aimaster.buylife.xyz/signup`으로 최신화.
  - 메일/자물쇠 아이콘(42px 패딩), 우측 비밀번호 찾기 링크, 회원가입 모드 전환 시 단일 계정 안내 박스 및 혜택 3종 체크리스트, CTA 링크 버튼 배치.
- **버전 동기화**: `src/lib/version.ts`, `package.json`, Supabase DB `programs.version = 'v1.10'` 동기화 완료.
- **실세션 검수**: Microsoft Edge (`msedge.exe`) 전용 실세션 캡처 3종 검수 완료 (`edge_playlist_login_desktop_v110.png`, `edge_playlist_signup_desktop_v110.png`, `edge_playlist_login_mobile_v110.png`).



## v1.12 (2026-10-17) 이미지 모델 최신 교체 — Claude Code(윈도우)
- `src/lib/playlist/types.ts` : 구형(gemini-2.5-flash-image·gemini-3.1-flash-image·*-preview·Imagen) → 최신 정식(`gemini-nano-banana-2.1`·`gemini-3-pro-image`), 주소 v1beta (기준: ai-image-studio v1.11 `lib/providers/adapters/gemini.ts`).
- 실제 이미지 생성 시험은 하지 않았습니다 — 이미지 생성 오류가 나면 그때 테스트 검증합니다(주인님 지시).
- v1.13 (2026-10-17): 중복 실행으로 망가졌던 구형 저장값 변환표 복구 — `gemini-2.5-flash-image`→`gemini-3.1-flash-lite-image`, `gemini-3-pro-image-preview`→`gemini-3-pro-image`(예전에 저장된 프로젝트 설정도 새 모델로 호출). 테스트 20개 통과, 실제 이미지 생성 시험은 하지 않음.

## 2026-10-18 v1.14 — 이미지 생성 호출을 공용 기준 코드로 (이미지 4묶음 B · SDK 사용형, Claude Code 윈도우)
- **한 일**: `src/lib/llm.ts` `generateImage`의 Gemini 부분만 공용 호출로(OpenAI gpt-image 부분은 그대로). 생성 라우트 한도 300초 → 시간 제한 240초. 오류는 기존 `explainError` 문구로 연결, 시간 초과는 공용 안내.
- **왜**: ① SDK 호출에 시간 제한이 없어 Vercel 함수 한도에서 원인 모를 끊김(요금은 나갔을 수 있음) ② 응답의 첫 이미지만 꺼내 `gemini-3-pro-image`의 중간 초안(thought) 이미지를 결과로 쓸 위험 ③ 영어 오류 문장을 정규식으로 추측해 분류 — 공용 모듈은 시간 제한·최종 이미지 선택·상태 코드별 오류 구분·키 가리기·시간 초과 표준 안내(Google AI Studio 사용량 확인)를 갖췄다.
- **바꾸지 않은 것**: 프롬프트·모델 이름·비율·화질·화면·글 생성 호출(SDK 그대로). 유료 생성이라 재시도 0(이중 과금 방지).
- **검수**: tsc 0, 프로그램 테스트(20개 통과), `check-shared-modules` OK, Vercel 프로덕션 배포·DB 버전, 크롬 화면 버전. eslint는 이 폴더에 설정 파일이 없어(이전부터) 실행 안 됨. 실제 이미지 생성 시험은 하지 않음(비용) — 오류가 나면 그때 검증.
- **주의(다음 CLI)**: `src/lib/geminiImage.ts`·`nanoBananaModels.ts`는 공용 기준 코드 사본이다(기준: `ai-image-studio/lib/providers/`). 직접 고치지 않고 기준을 고친 뒤 `node scripts/check-shared-modules.mjs --sync`. 이 프로그램만 다르게 해야 하면 호출하는 쪽에서 덮어쓴다. 점검표: 루트 `docs/SHARED_MODULE_CHECKPOINTS.md`.

<!-- DETAILED_PROGRAM_REVIEW_20261019 -->
## 2026-10-19 Codex — 프로그램별 상세 개선 분석(구현 아님)

[세부 개선안·필요 이유·근거·시험 조건](docs/DETAILED_REVIEW_20261019.md) · [전체 83개 분석](../docs/program-reviews-20261019/INDEX.md) · [공통 아이디어 표](../docs/PROGRAM_IDEA_BACKLOG.md). 이 프로그램 3개 검토 항목입니다. 코드·DB·환경변수·배포는 바꾸지 않았습니다. 작업 전 최신 개선 원장·ACTIVE_WORK와 대조하고 이미 해결된 기능은 보존합니다. 후속 작업 후 처리 ID·증거·미완료·새 인사이트·프로그램 링크를 기록합니다.
<!-- /DETAILED_PROGRAM_REVIEW_20261019 -->

## 2026-10-20 병합 E 준비 — Youtube Playlist 자동화(yt-playlist-studio)의 영상 만들기를 이 앱 안으로 (Claude Code 윈도우, 플랜 확인 대기·코드 변경 없음)
- 플랜 겸 인수인계: [`docs/PLAN_20261020_MERGE_E_PLAYLIST_VIDEO.md`](docs/PLAN_20261020_MERGE_E_PLAYLIST_VIDEO.md) — 기준 앱을 보고서와 반대로 **이 앱**으로 정정(영상 앱은 브라우저 부품이라 새 화면 `/video`로 옮기기 쉬움), 권한 143명 동일·DB 이전 없음.

## 2026-10-20 v1.15 — 병합 E 1단계: 영상 만들기 이식 (Claude Code 윈도우)
- Youtube Playlist 자동화(yt-playlist-studio)의 영상 부품을 이 앱으로(스크립트 방식, 플랜 §3): `components/video/{MediaCenter,EditorStudio,ExportStudio,HelpModal,PlaylistGuideView,ReferenceNotePanel}.tsx`, `types/playlist.ts`, `data/presets.ts`, `lib/render/*`(브라우저 GPU MP4), `lib/referenceNote.ts`, API `/api/generate-bg`(키 함수만 `getUserApiKey(userId, "gemini")`로). 라이브러리 `mp4-muxer`·`gifenc`·`gifuct-js` 추가.
- 새 화면 `/video`(「영상 만들기」, `components/video/VideoStudio.tsx`): 영상 앱 `PlaylistStudioApp`에서 자체 사이드바·키 입력창을 빼고 위쪽 탭(① 음악·배경 → ② 편집·미리보기 → ③ MP4 내보내기 → 📖 사용법), 키는 [API키등록·플랫폼연동]. 좌측 메뉴 ① 새 플레이리스트 → ② 영상 만들기 → ③ 내 프로젝트. `.custom-scrollbar` CSS, 공지 띠(dark).
- 검수: tsc, build(`/video`·`/api/generate-bg`), 테스트 20개, 공용 코드 점검.

## 2026-10-20 v1.16 — 병합 E 2단계: 이름 「YOUTUBE 플레이리스트 자동화」·매뉴얼 (Claude Code 윈도우)
- 주인님 「YOUTUBE 플레이리스트 자동화 로 하자」 → `APP_NAME`(메뉴·로그인)·브라우저 제목·매뉴얼 하단 이름 변경, slug·주소(`playlist-maker.buylife.xyz`) 그대로.
- 매뉴얼 `/guide`: 단계 카드 「06 영상 만들기 — 스펙트럼·배경 → 1080p MP4」, FAQ Q1(영상 만들기 사용법)·Q2(옛 Youtube Playlist 회원) 추가, 기존 질문 Q3~Q6으로.
- 영상 부품의 「Viral Finder」 문구 → 「YOUTUBE 트렌드 분석」(병합 C 이름 변경 반영): `components/video/{ReferenceNotePanel,PlaylistGuideView}.tsx`, `lib/referenceNote.ts`.

## 2026-10-20 병합 E 3단계 완료 — 카탈로그 「YOUTUBE 플레이리스트 자동화」 (Claude Code 윈도우)
- DB 이름·소개 갱신, 옛 Youtube Playlist 자동화 노출 중지·옛 주소 이동/API 전달. 브라우저 MP4 렌더(`src/lib/render/`)의 기준 위치가 이제 이 앱. 상세 플랜 §8.

## 2026-10-21 v1.17 — 영상 만들기에 곡별 가사 층 + 세로 9:16 (Claude Code 윈도우)
- 플랜: [`docs/PLAN_20261021_LYRICS_LAYER_VERTICAL.md`](docs/PLAN_20261021_LYRICS_LAYER_VERTICAL.md)(AI 가사영상 자동화 추가개선 3-b).
- ① 곡 목록 행마다 「＋ 가사」(.srt/.lrc/.txt, 시간 있는 줄만) · 「가사 ✕」, 곡을 넣을 때 같은 이름의 .srt/.lrc를 함께 고르면 자동 짝(`MediaCenter.tsx`). ② 가사 그리기 `src/lib/render/lyrics-layer.ts`(지금 줄 + 다음 줄 흐리게, 색 강조/노래방 채움, 크기·세로 위치·색) — 미리보기(`EditorStudio.tsx`, 오른쪽 패널 「화면 모양 · 가사 표시」)와 MP4(`video-exporter.ts`, 반복 재생도 곡 순서대로 `locate`)가 같은 함수. ③ 세로 9:16(1080×1920 / 720×1280) — 내보내기 「화면 모양」·편집 패널, 세로는 배경 잘라 맞춤(가로는 기존처럼 늘이기 그대로).
- 가사 읽기는 **공용 기준 코드 `lyric-timing` 사본** `src/lib/lyrics.ts`(기준 `lyric-video-studio/src/lib/lyrics.ts`, 직접 고치지 말고 `--sync`).
- 검수: tsc·시험 20개·build, 로컬 임시 화면(커밋 전 삭제·로그인 예외 원복)에서 곡 2개+가사(자동 짝 .srt·버튼 .lrc) → 세로 미리보기 실제 재생 가사 표시 → 세로 MP4(저장 위치를 OPFS로 바꿔 끼워 시험) 1080×1920·12.01초·영상+소리, 1.5초·7.5초 장면에 곡별 가사 확인. 운영 화면 확인은 배포 후 아래.
- 발견(미처리): MP4 내보내기의 스펙트럼이 실제 소리가 아니라 계산한 가짜 값(`dummyFreq`) — `docs/IMPROVEMENTS.md` IMP-PLS-006.


## 2026-10-21 v1.18 — MP4 스펙트럼·저음 효과를 실제 소리로 (IMP-PLS-006, Claude Code 윈도우)
- 주인님 지시: 「플레이리스트 MP4의 스펙트럼이 실제 소리가 아니라 계산으로 만든 가짜 값입니다 … 수정 보완해줘」.
- 원인: `video-exporter.ts`가 sin/cos로 만든 `dummyFreq`를 그렸고, 만들어 두고 쓰지 않던 분석기(`offlineAnalyser`)만 있었다. 미리보기(`EditorStudio.tsx`)는 브라우저 분석기(AnalyserNode fftSize 256)로 실제 소리를 그려 **미리보기와 결과가 달랐다**.
- 수정: 새 `src/lib/render/audio-spectrum.ts` — 디코딩한 곡(반복 순서 그대로)에서 프레임 시각의 마지막 256샘플을 브라우저 분석기와 **같은 계산**(블랙만 창 → FFT ÷N → 시간 평활 → -100~-30dB를 0~255)으로 128칸 세기로 만든다. 미리보기는 약 60번/초 평활하므로 내보내기는 프레임 속도에 맞춰 평활 계수 0.8^(60/fps). 시험 3개(`tests/audio-spectrum.test.mjs`: 3kHz → 16번 칸, 무음 0, 저음 세기, 둘째 곡 읽기).
- 보완(미리보기에는 있고 결과에는 없던 것): **저음 반응 확대 맥동·흔들림·스트로브**, 배경 **밝기**, 필터의 저음 반응(고정값 120 → 실제 저음) — 미리보기와 같은 조건·순서. GIF 스티커는 결과에 아직 없음(IMP-PLS-008).
- 검수: 시험 23개·tsc·build, 배포 Ready, DB v1.18. 크롬 운영 화면(일반 회원)에서 6초 시험 소리(무음 2초 → 80Hz 2초 → 3kHz 2초)로 1080p MP4 생성(저장 위치를 브라우저 내부 저장소로 바꿔 끼움 — 회원 PC에 파일 안 남김, 끝난 뒤 삭제) → 1초 장면 바닥선만(밝은 점 512), 3초 왼쪽 끝 막대(평균 가로 59/640), 5초 16번 칸 근처 막대(180/640). 비용: Vercel 빌드 1회, AI 0회.

## 2026-10-21 v1.19 — 음악(SUNO) 자동화 곡 여러 개 + 시간 가사 가져오기 (Claude Code 윈도우)
- 플랜: [`docs/PLAN_20261021_V1_19_SUNO_IMPORT.md`](docs/PLAN_20261021_V1_19_SUNO_IMPORT.md)(가사영상 v1.06 추가개선 3).
- 미디어 센터 음악 드롭존 위 `components/video/SunoImportPanel.tsx`: 회원 본인의 완성된 곡(보컬·연주곡, 최근 40곡) 변주를 체크해 「선택한 곡 추가」(최대 20곡/회) → 비공개 저장소 1시간 서명 주소로 음악을 받아 곡 목록 끝에 추가. 「Suno 시간 가사도 받기」를 켜면 보컬 곡마다 본인 Suno 키로 1번씩 받아 곡의 가사 층(v1.17)에 바로 연결(이번 접속에서 받은 곡은 재조회 없음, 누르기 전에 조회 횟수 표시). 실패·키 없음이면 곡만 추가하고 이유·키 등록 링크.
- 서버: `src/lib/sunoTracks.ts` + `/api/suno/tracks`(목록·?variant=)·`/api/suno/timed-lyrics`(같은 출처만) — 모두 `requireAccess()`, 조회는 회원 `user_id`로만. 관계가 2개라 `music_track_variants!music_track_variants_track_id_fkey` 지정.
- **공용 기준 코드 `suno-timed-lyrics` 등록**: 사본 `src/lib/sunoAlign.ts`(기준 `lyric-video-studio/src/lib/sunoAlign.ts`, 직접 고치지 말고 `--sync`).
- 검수: tsc·시험 23개·build, 배포 Ready, DB v1.19. 크롬 운영(일반 회원): 패널에 「빗속의 다짐 · 보컬」 변주 2개 → 변주 1 시간 가사와 함께 추가(「곡 1개 … 시간 가사 1곡」, 목록 01 「가사 21줄」, 패널 「✓ 가사 받음」) → 시간 가사 끄고 변주 2 추가(목록 02 가사 없음). 편집 미리보기 가사 표시는 배경이 있어야 들어가 이번엔 생략(가사 형식은 v1.17과 같음). 비용: Suno 시간 가사 조회 1회(시험 계정 본인 키), Vercel 빌드 1회.

## 2026-10-21 v1.20 — Suno 커버 배경·한 번에 고르기·음악에서 넘겨받기 (Claude Code 윈도우)
- 플랜: [`docs/PLAN_20261021_V1_20_SUNO_COVER_SELECT.md`](docs/PLAN_20261021_V1_20_SUNO_COVER_SELECT.md)(v1.19 추가개선 1·2·3). 짝 작업: 음악(SUNO) 자동화 v1.26.
- ① 커버 배경: `/api/suno/tracks?variant=`가 커버 서명 주소도 돌려줌(`sunoTracks.ts`). 정사각 커버를 늘이면 찌그러지므로 브라우저에서 **흐린 확대 커버 + 가운데 원본 커버** 1920×1080 JPG를 만들어 배경으로(`coverBackdrop`). 「배경이 없으면 첫 곡 커버를 배경으로」(기본 켬) + 곡 줄마다 「🖼 배경으로」.
- ② 「전체 선택」「보컬만」「연주곡만」「선택 해제」(최대 20곡).
- ③ `/video?suno=id1,id2…`로 들어오면 패널을 펼치고 그 곡들을 **미리 선택만**(Suno 조회 비용 때문에 자동 추가 안 함), 주소에서 값 지움.
- 검수: tsc·시험 23개·build, 배포 Ready, DB v1.20. 크롬 운영(일반 회원): 음악 곡 화면 버튼 주소로 진입 → 안내·변주 1 미리 선택 → 선택 해제(0)·보컬만(2) → 시간 가사 끄고 추가 → 「배경은 「빗속의 다짐」 커버로 만들었습니다」, 배경 1920×1080 → 편집 스튜디오 입장, 미리보기에 커버 배경·스펙트럼. 비용: Vercel 빌드 1회, Suno·AI 0회.

## 2026-10-21 v1.21 — MP4 결과에 GIF 스티커 (IMP-PLS-008, Claude Code 윈도우)
- 플랜: [`docs/PLAN_20261021_V1_21_GIF_STICKER.md`](docs/PLAN_20261021_V1_21_GIF_STICKER.md). 원인: `gifUrl`이 미디어 센터·편집 미리보기에만 넘어가고 `ExportStudio`·`exportVideoMp4`에는 전달되지 않음.
- 수정: `VideoStudio` → `ExportStudio` → `exportVideoMp4(…, gifUrl)`(마지막 선택 인자). 새 `src/lib/render/gif-frames.ts` — `ImageDecoder`로 장면(최대 300)·표시 시간을 나눠 시각에 맞춰 반복, 없는 브라우저는 첫 장면 고정. 위치·크기(1080p 기준 150px×크기%)·투명도·그림자·가운데는 미리보기와 같고 720p는 비율로 줄임. 로고 다음, 확대·흔들림 안에서 그림.
- 검수: 시험 23개·tsc·build, 배포 Ready, DB v1.21. 크롬 운영(일반 회원): 0.5초마다 빨강↔초록인 2장면 GIF + 2초 무음으로 1080p MP4(저장 위치는 브라우저 내부 저장소, 끝난 뒤 삭제) → 0.25초 빨강 5,550점·0.75초 초록 5,550점·1.25초 빨강 5,550점(반복 확인).
- 같은 날 확인(코드 변경 없음): v1.19~v1.20의 Suno 시간 가사가 편집 미리보기에 실제로 표시됨 — 재생 약 15초에 「번진 불빛들을 세어 봤어」 강조 + 다음 줄 흐리게(Suno 시간 가사 조회 1회, 시험 계정 본인 키).
- 비용: Vercel 빌드 1회, Suno 조회 1회(가사 표시 확인), AI 0회.

## 2026-10-21 v1.22 — 앨범 커버 스타일 배경 + 유튜브 바로 올리기 (Claude Code 윈도우)
- 플랜: [`docs/PLAN_20261021_V1_22_ALBUM_YOUTUBE.md`](docs/PLAN_20261021_V1_22_ALBUM_YOUTUBE.md)(v1.20 추가개선 1·3, 2는 음악 폴더가 다른 세션 작업 중이라 뒤로).
- ① Suno 패널 「커버 배경 모양」: 흐린 커버+가운데 원본 / **앨범 커버**(커버를 위로, 아래 가운데에 제목(비우면 곡 제목)·채널명, 긴 글자 자동 축소, `Noto Sans KR` 계열).
- ③ 유튜브 바로 올리기: 공용 사본 `src/lib/youtube/client.ts`(youtube-upload-client, 기준 shots)·`src/lib/memberIntegrations.ts`(member-integrations, 기준 루트 lib) 등록 — 직접 고치지 말고 `--sync`. `youtube/account.ts`(가사영상 v1.04에서 복사), `/api/youtube/status`·`/api/youtube/upload-session`(같은 출처·`requireAccess`, 최대 8GB, 카테고리 음악·엔터·인물), 카드 `components/video/YoutubeUploadCard.tsx`(기본 비공개·예약 공개·카테고리, 제목 「[Playlist] 첫 곡 외 N곡」, 설명 = 곡별 시작 시각 챕터·해시태그, 세로는 #Shorts). 크롬은 MP4를 고른 위치에 바로 저장하므로 「저장한 MP4 고르기」, 결과 데이터가 있으면 바로 사용. 다른 유튜브 프로그램에서 연결한 공용 계정 + 회원 본인 Google 앱만.
- 검수: 시험 23개·tsc·build, 배포 Ready, DB v1.22. 크롬 운영(일반 회원): 앨범 커버 + 채널명 「@buylife_music」으로 배경 생성 → 커버 아래 「빗속의 다짐」·채널명 표시 확인. 내보내기 화면에 유튜브 카드(시험 계정 유튜브 미연결 → 안내·연결 프로그램 2개), 업로드 주소 요청 409. **실제 업로드는 미검수**(유튜브 연결된 회원 계정으로 비공개 1회 확인 필요). 비용: Vercel 빌드 1회, AI 0회.

## 2026-10-21 v1.22 유튜브 실제 업로드 확인 (코드 변경 없음, Claude Code 윈도우)
- 주인님 승인: 관리자 계정(`buylifemall@gmail.com`, 주인님이 크롬에서 직접 로그인)의 기본 채널 「BUYLIFE ACADEMY 쇼핑몰 공동구매중개 AI자동화」에 시험 영상 **비공개 1편**.
- 6초 시험음 + 「업로드 시험 (비공개)」 배경으로 1080p MP4(0.6MB, 저장 위치는 브라우저 내부 저장소, 끝난 뒤 삭제) → 「📁 저장한 MP4 고르기」 → 제목 「[시험] 플레이리스트 업로드 확인 (비공개)」·비공개·음악 → 「유튜브에 비공개로 올렸습니다」, 영상 https://youtu.be/mPwlsDllUgk . 설명란 챕터 `00:00 업로드 시험음` 확인.
- 비용: 없음(회원 Google 앱 유튜브 무료 한도 1,600단위). 시험 영상 삭제는 주인님이 유튜브 스튜디오에서(에이전트는 삭제하지 않음).
- 참고: 관리자 계정에 기본(is_default) 유튜브 채널이 2개라 가장 최근 갱신된 채널이 쓰인다(`getMemberAccount` 정렬). 채널을 고르는 화면은 아직 없음 — 개선 제안 IMP-PLS-013.

## 2026-10-21 v1.23 — 배경 그림으로 유튜브 썸네일 (Claude Code 윈도우)
- 플랜: [`docs/PLAN_20261021_V1_23_THUMBNAIL.md`](docs/PLAN_20261021_V1_23_THUMBNAIL.md). 주인님 선택: 「YOUTUBE 썸네일 자동화와 연결」을 플레이리스트 안에서 바로(AI 비용 없음).
- 유튜브 카드(가로 영상·배경이 그림일 때): 배경을 1280×720 JPG(2MB 이하, 가운데 잘라 맞춤)로 만들어 미리보기·「⬇ 썸네일 내려받기」, 「🖼 올릴 때 배경 그림을 썸네일로 지정」(기본 켬). 업로드가 끝나면 `/api/youtube/thumbnail`(같은 출처·`requireAccess`·`decodeImage` 2MB) → 이 앱 전용 `src/lib/youtube/thumbnail.ts`(`thumbnails.set`, 공용 기준 코드는 고치지 않음). 403이면 「맞춤 썸네일 사용 인증(전화 인증) 필요 — 내려받아 스튜디오에서 넣기」 안내. 세로(쇼츠)는 지정하지 않음.
- 검수: 시험 23개·tsc·build, 배포 Ready, DB v1.23. 크롬(시험 계정): `/api/youtube/thumbnail` 409(유튜브 미연결 — 다른 회원 채널로 대신하지 않음)·잘못된 영상 번호 400. 관리자 계정(주인님 로그인): 카드에 썸네일 미리보기 1280×720·38KB·지정 체크(기본 켬)·내려받기 표시, 같은 그림으로 비공개 시험 영상 mPwlsDllUgk에 `/api/youtube/thumbnail` → **200 ok**(실제 지정 확인, 유튜브 한도 50단위·비용 없음). 비용: Vercel 빌드 1회.

## 2026-10-21 v1.24 — 곡 끌어서 순서 바꾸기·올릴 채널 고르기 (Claude Code 윈도우)
- 플랜: [`docs/PLAN_20261021_V1_24_DRAG_CHANNEL.md`](docs/PLAN_20261021_V1_24_DRAG_CHANNEL.md).
- 곡 목록(`MediaCenter.tsx`): 줄마다 손잡이(⋮⋮)·`draggable`로 끌어서 순서 변경(넘겨받은 Suno 곡·올린 파일 모두). 파일 끌어놓기와 섞이지 않게 곡을 끄는 중일 때만 반응.
- 올릴 채널(IMP-PLS-013): `src/lib/youtube/account.ts`에 `listYoutubeChannels`(회원 본인 채널만, 기본 표시→**연결한 순서 `created_at`** — 토큰 갱신 때 바뀌는 `updated_at`으로 정렬하면 다시 열 때마다 기본 채널이 뒤바뀌어 배포 후 바로 고침)·`load(userId, accountId)`. `/api/youtube/status?account=`·업로드 주소·썸네일 API가 `accountId`를 받음(회원 본인 채널 안에서만 찾음, 공용 사본 `memberIntegrations.ts`는 그대로). 카드: 채널 2개 이상이면 「✅ 올릴 채널」 선택 칸, 바꾸면 상태 다시 확인, 업로드·썸네일 지정에 같은 채널.
- 검수: tsc, 배포 Ready 2회(정렬 수정 포함), DB v1.24. 크롬(관리자 계정): 곡 3개 넣고 셋째곡을 맨 위로 끌기 → 「셋째곡·첫째곡·둘째곡」. 내보내기 화면 선택 칸 2개(공동구매 아카데미 / BUYLIFE ACADEMY…) 전환 → 상태 ok, 다른 채널 조회 뒤에도 순서·기본 채널 그대로. 실제 업로드는 v1.22에서 확인해 이번엔 하지 않음. 비용: Vercel 빌드 2회.

