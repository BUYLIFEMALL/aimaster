# AI 무료음악 자동화 (`free-music-studio`) — 에이전트 작업 지침

> 상태: **v1.02 배포 완료(2026-11-03) — 3단계 웹 ↔ 내 PC 엔진 연결** — https://free-music-studio.buylife.xyz , 프로그램 등록 `new·coming` 배지(설치 파일 공개 전). 엔진 0.1(`engine/`)은 미니PC·마스터PC(5080) 모두 처음부터 설치 성공. 다음: 엔진 0.2 설치 파일(exe·dmg). 플랜: [`docs/PLAN_20261103_V1_01.md`](docs/PLAN_20261103_V1_01.md)
> 담당: [역할: music] Claude Code(윈도우(미니PC)). 작업 전 루트 `CLAUDE.md`·`AGENTS.md`, `docs/roles/music.md`, 이 플랜을 읽는다.

## 꼭 지킬 것
- **원작자 정보를 어디에도 쓰지 않는다.** 원본은 공개 MIT 저장소이고, 원저작자와 협의해 이름·저작권 표시·라이선스 파일까지 지우고 AIMaster 내용으로 채우기로 했다(주인님 확인 2026-11-03). 원본 이름·계정·앱 ID·환경 변수 접두어·아이콘을 코드·문서·커밋 메시지에 넣지 않는다. 라이선스 고지가 빠졌다고 되돌리지 않는다.
- **음악 모델은 ACE-Step 1.5(MIT)**. 원본의 YuE2·SheetSage2·경음악 LoRA는 CC BY-NC 4.0(비상업)이라 쓰지 않는다. 새 모델을 넣을 때 이용 조건(상업 이용)을 먼저 확인해 플랜 표에 적는다.
- **YouTube 음원 가져오기(`yt-dlp`)는 만들지 않는다.** 커버는 원곡 「내 곡·사용 권한 있음」 체크 뒤에만.
- 구조: 웹(이 폴더, Next.js) + 내 PC 엔진 앱(로컬 HTTP). 음원 파일은 회원 PC에 두고 서버에 올리지 않는다.
- AI 작사·앨범아트는 회원 본인 키만(기본 Claude). 음악 생성은 키 없이 회원 PC에서.
- 원본 분석 위치(저장소 밖, 실행하지 않고 읽기만): `D:/PDS/Program_dev/free-music-src/repo`.

## 1. 사용 목적·대상
SUNO 같은 유료 음악 서비스 없이, 회원 PC에서 공개 모델로 노래를 계속 만들고 싶은 크리에이터(쇼츠·플레이리스트·가사 영상 제작자). 웹에서 가사·스타일을 정리하고 내 PC 엔진이 생성한다.

## 2. 기술
Next.js 16(App Router)·React 19·Tailwind 4·Supabase(공용 DB)·`@anthropic-ai/sdk`(AI 작사, 회원 키, 재시도 0, `json_schema` 응답). 뼈대는 `music-video-studio`에서 공통 파일(로그인·권한·설정·메뉴·767px 접는 메뉴)만 가져왔다(2026-11-03).

## 3. 기능·구조
| 화면 | 주소 | 내용 |
|---|---|---|
| 곡 만들기 | `/songs` | 곡 제목·길이(30초~4분)·스타일·가사 저장(표 `free_music_songs`, 회원별 RLS), AI 작사(Claude 3등급 선택, 기본 Sonnet 5.5) |
| 내 PC 엔진 | `/engine` | 엔진 상태(지금 「준비 중」)·다운로드 센터·3단계 설치·PC별 속도표(사전 검증 결과) |
| API키등록·플랫폼연동 | `/settings` | `user_api_keys` provider `anthropic` |
| 연동 & 사용 매뉴얼 | `/guide` | 4단계 카드·팁·주의·FAQ(기본판, 8단계에서 완성) |
- API: `/api/songs`(GET·POST), `/api/songs/[id]`(PATCH·DELETE, `user_id` 조건), `/api/lyrics`(POST), `/api/cron/cleanup`(매일 03:40 KST, 30일·`retention_exempt` 제외).
- 입력 규칙 한 곳: `src/lib/songs.ts`(시험 `tests/songs.test.mjs`), 모델 목록 `src/lib/lyricModels.ts`.
- 장점: 생성 비용 0, 음원이 서버에 안 남음. 단점(지금): 엔진 앱 전이라 실제 노래 생성은 아직 안 됨.

## 4. 버전
- v1.02(배포 2026-11-03, `free-music-studio-an8afxai3`, 커밋 `1b6a3c2df`): 3단계 웹 연결 — `src/lib/engine.ts`(엔진 호출·요청 본문·결과 해석), `components/engine/useEngine.ts`(5초마다 상태), `GeneratePanel.tsx`(곡 만들기 아래 생성·걸린 시간·재생·MP3 내려받기, 음원은 서버 안 거침), 내 PC 엔진 화면 상태 배지·연결 코드 6자리 입력·연결 끊기. 표현 「짝짓기」→「연결 코드」·「PC 연결」(엔진 창 문구 포함, 엔진 zip 다시 만듦). 요청: batch_size 1·MP3·한글 가사면 vocal_language ko·그래픽카드면 thinking 켬. 함께 내보낸 미배포 대기 `96f04aee3` 3건. 시험 웹 19·엔진 5.
- v1.01(배포 2026-11-03, `free-music-studio-m2cntvbs4`): 1단계 웹 뼈대. Vercel 새 프로젝트 `free-music-studio`(환경변수 5개), 도메인 `free-music-studio.buylife.xyz`, 운영 DB 마이그레이션 실행(등록 시 등급 자동 부여로 3개 계정에 1년 이용기간 생김). 마이그레이션 `supabase/migrations/20261103_v1_01_init.sql`(곡 표 + 프로그램 등록 `coming` 배지 + 요금제 3단계).

## 5. 대기
플랜 §4 2~8단계. 다음: 1단계 배포(승인 필요) → 2단계 엔진 앱 0.1. 사전 검증 맥미니 결과 대기(`docs/MAC_REQUEST_20261103_PREVALIDATION.md`).

## 6. 연계 아이디어
만든 곡 → `lyric-video-studio`(가사 영상)·`playlist-channel-studio`(플레이리스트)·`music-video-studio`로 넘기기(음원은 회원 PC 파일 선택 방식).

## 7. UI
에메랄드·틸 계열 어두운 화면(`music-video-studio` 네온 덱 구조 그대로, 색만 교체). 8단계에서 디자인 문서 작성.

## 작업 기록
- 2026-11-03 기획: 원본 분석, 이름·구조·모델 결정, 플랜 작성. 외부 분석표 `EXT-MUS-08`.
- 2026-11-03 0단계: 윈도우(미니PC) CPU·마스터PC(RTX 5080) 생성 성공, 음질 「SUNO보단 못하지만 들을만함」(주인님).
- 2026-11-03 1단계 코드: 위 화면·API·마이그레이션, `tsc`·시험 14개·`npm run build` 통과. 로그인 뒤 기본 이동 경로를 `/songs`로(기준 프로그램의 `/convert` 남은 값은 `music-video-studio/docs/IMPROVEMENTS.md`에 기록).
- 2026-11-03 v1.02 운영 검수(ego lite, 관리자 계정, 미니PC 엔진 CPU 모드): 내 PC 엔진 화면 「연결 코드 입력 필요」 → 엔진 창 코드 6자리 입력 → 「연결됨 · CPU 모드」 → 곡 만들기에서 30초 곡 [노래 만들기] → 걸린 시간 표시 → 완성 후 재생기·[MP3 내려받기](MP3 30초·470KB, 파일 이름 = 곡 제목). 마스터PC(5080)는 엔진 처음부터 설치까지 확인(고품질 cuda), 사이트 생성은 미확인. 주의: ego 창 하나를 여러 세션이 함께 써서 앞에 다른 세션 탭이 있으면 시험 탭이 가려짐.
- 2026-11-03 1단계 배포·검수(크롬, 시험 계정 `buylifemall@naver.com`): 곡 만들기 열림 → AI 작사 1회 성공(균형 Sonnet 5.5, 제목 「쉬어 가도 괜찮아」·스타일·구간 가사) → 저장·목록 반영 → 엔진·설정(「연동 완료」)·매뉴얼 화면 정상. 390px 틀(창이 최대화라 실제 창 축소는 못 함)에서 좌측 메뉴 숨김·☰ 표시·가로 넘침 없음. 비로그인 `/api/songs`·비밀값 없는 `/api/cron/cleanup` 401. 발견: 키·목록을 불러오는 1~3초 동안 「미등록」·「0개」가 잠깐 보임 → 설정 화면은 「확인 중」으로 고침(미배포 대기).
- 2026-11-03 맥미니가 Intel(i7-8700B)로 확인돼 맥미니 시험 취소 — 시험 장비는 마스터PC(RTX 5080)·윈도우(미니PC). Apple Silicon 엔진은 미검증.
- 2026-11-03 2단계 엔진 0.1(`engine/`, README 참고): 연결 문 `127.0.0.1:47821`(허용 사이트만·CORS·6자리 짝짓기→토큰·5회 실패 1분 잠금) → 내부 ACE-Step `127.0.0.1:47822`(실행마다 새 키). 장치: NVIDIA→cuda·언어 모델 켬 / 그 외 윈도우→cpu·끔 / Apple Silicon→mps / Intel 맥 미지원. 설치: 고정 버전 `ca1e85f` 압축 파일 → `uv sync`. 시험 5개 통과. **실물(윈도우(미니PC), 이미 설치된 ACE-Step 사용)**: 배포 사이트 ego lite 탭에서 토큰 없음 401·틀린 코드 401·짝짓기 200·생성 접수·30초 곡 176초·MP3 470KB 받기 성공. **미검증**: 처음부터 설치(압축 받기 + `uv sync`) — 마스터PC(5080)에서 시험 예정. 시험 중 셸 실행 경고 → 셸 없이 실행으로 고침.
