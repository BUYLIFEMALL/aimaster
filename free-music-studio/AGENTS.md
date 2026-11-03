# AI 무료음악 자동화 (`free-music-studio`) — 에이전트 작업 지침

> 상태: **1단계 웹 뼈대 v1.01 — 코드·로컬 검사 완료, 미배포**(Vercel 새 프로젝트·DB 마이그레이션·도메인은 주인님 승인 대기). 플랜: [`docs/PLAN_20261103_V1_01.md`](docs/PLAN_20261103_V1_01.md)
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
- v1.01(미배포, 2026-11-03): 1단계 웹 뼈대. 마이그레이션 `supabase/migrations/20261103_v1_01_init.sql`(곡 표 + 프로그램 등록 `coming` 배지 + 요금제 3단계).

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
