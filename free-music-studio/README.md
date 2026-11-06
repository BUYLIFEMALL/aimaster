# AI 무료음악 자동화 (`free-music-studio`)

https://free-music-studio.buylife.xyz · 현재 **v1.27 · 내 PC 엔진 0.7.0**(2026-11-06) · 담당 [역할: music] · 에이전트 지침은 [`AGENTS.md`](AGENTS.md), 개선 제안 [`docs/IMPROVEMENTS.md`](docs/IMPROVEMENTS.md), 백로그 [`docs/IMPROVEMENT_BACKLOG.md`](docs/IMPROVEMENT_BACKLOG.md), 디자인 [`docs/DESIGN_HANDOFF.md`](docs/DESIGN_HANDOFF.md).

## 1. 사용 목적·대상
SUNO 같은 유료 음악 서비스 없이 **회원 PC에서 공개 모델로 노래·연주곡·효과음을 계속 만들고 싶은 크리에이터**(쇼츠·플레이리스트·가사 영상 제작자). 웹에서 가사·스타일을 정리하고, 회원 PC에 설치한 엔진이 키 없이 음악을 만든다. 음원·그림·영상 파일은 회원 PC에만 남고 서버에 올라가지 않는다.

## 2. 기술
- 웹: Next.js 16(App Router)·React 19·Tailwind 4·Supabase 공용 DB(회원별 RLS). 회원 본인 API 키만(`user_api_keys`: OpenAI·Claude·Gemini·Replicate·Hugging Face 토큰, 기본 Claude, 재시도 0).
- 내 PC 엔진(`engine/`, Node 26, 설치 파일 `desktop/` Electron+NSIS): ACE-Step 1.5(기본, MIT)·HeartMuLa·Stable Audio 3·MiniMax Music 3(24GB↑)·YuE2(비상업) 음악 엔진, uv 파이썬 실행 환경, ffmpeg, 작업 대기열, 보관함, 마스터링, Stem 분리(audio-separator, BS-RoFormer), 가사 자동 맞추기(Qwen3-ForcedAligner·ASR, Apache-2.0), 플레이리스트 영상(브라우저 WebCodecs → ffmpeg), 내 PC 앨범 그림(stable-diffusion.cpp + Z-Image Turbo·FLUX.2 klein 4B, Apache-2.0).
- 원본: boks-music(MIT, 원작자 협의로 이름 없이) — 쓸 수 있는 기능은 2026-11-06까지 전부 이식(`docs/PLAN_20261106_ORIGINAL_PORT_ALL.md`).

## 3. 핵심 기능·구조
| 화면 | 주소 | 내용 |
|---|---|---|
| 홈 | `/home` | 프로젝트 카드(곡 수)·최근 음악 바로 재생 |
| 곡 만들기 | `/songs` | 노래 / 연주곡 / 효과음, 스타일 프리셋 85개, AI 작사·다듬기·금지어, AI 작곡 기획(20곡씩 최대 40곡), 한국어 → 영어 설명, 앨범 그림(Gemini·GPT Image·FLUX 2·**내 PC 무료**), 생성 개수, 프로젝트 안에서 만들기, 자동 저장 |
| 내 PC 엔진 | `/engine` | 연결 코드, 원클릭 다운로드 센터(새 버전 알림), PC 검사·추천 구성, 음악 모델 구성 고르기, 저장 폴더, 모델 저장 공간(지우기·다른 드라이브), 내 PC 앨범 그림 모델 |
| 작업 대기열 | `/queue` | 곡·커버·부분 수정·마스터링·Stem·가사 시간·내 PC 그림 작업 — 진행 막대·걸린 시간·취소·다시 하기·완료 자동 기록 |
| 모든 음악 | `/library` | 필터·정렬·표지·재생, 「…」 메뉴(커버·마스터링·Stem 분리·휴지통), 곡 상세(파형·표지 바꾸기·제목/가사 수정·가사 시간 LRC/SRT·자동 맞추기), 플레이리스트(여러 곡 고르기·순서), 휴지통(30일) |
| 가져온 음악 | `/import` | 내 음원으로 커버(세기)·부분 수정(구간), 권리 확인 |
| 영상 만들기 | `/video` | 플레이리스트 영상 템플릿 37개·실시간 미리보기·가사 영상·반복·챕터, 만든 영상 목록 |
| API키등록·플랫폼연동 | `/settings` | 회원 본인 키 등록, 연동 매뉴얼 팝업 |
| 연동 & 사용 매뉴얼 | `/guide` | 단계 카드·팁·주의·FAQ |

- 웹 API: `/api/songs`·`/api/presets`·`/api/tracks`(+`/trash`)·`/api/collections`·`/api/lyrics`·`/api/plan`·`/api/sound-prompt`·`/api/album-art`(+`/prompt`)·`/api/settings/*`·`/api/cron/cleanup`(30일, 관리자·시험 계정 제외). 모두 `checkProgramAccessApi()` + `user_id` 조건.
- 엔진 API(127.0.0.1:47821, 연결 토큰): `/library`·`/queue`·`/system`·`/quality`·`/storage`·`/videos`·`/image-models`·`/image-art` 등 — `engine/src/gateway.mjs`.
- 장점: 생성 비용 0, 음원이 서버에 안 남음, 상업용/비상업용 엔진을 구분해 표시. 한계: 윈도우 NVIDIA 중심(Stem·정렬·그림은 윈도우), 큰 모델 받기(5~35GB), 설치 파일 미서명(SmartScreen 안내).

## 4. 버전
v1.01(2026-11-03) → v1.27(2026-11-06). 변경 이력 전체는 `AGENTS.md` 4절. 배포 기록은 루트 `docs/PENDING_DEPLOYS.md` 「내보낸 기록」.

## 5. 대기·백로그
[`docs/IMPROVEMENT_BACKLOG.md`](docs/IMPROVEMENT_BACKLOG.md) — 주인님 확인(마스터PC 실물)·공용 권한 코드 속도·디자인 리뉴얼·연계.

## 6. 연계·아이디어
만든 곡과 LRC를 가사 영상·플레이리스트·뮤직비디오 프로그램으로 넘기기(음원은 회원 PC 파일 선택). 이미지 자동화 기준 프로그램의 모델 변경은 연동 이름만 따라감.

## 7. UI·디자인 제안
지금은 기능 구현 모습(에메랄드 네온 덱, 임시). 리뉴얼은 디자인 세션 몫 — 현재 토큰·구조·주의점은 [`docs/DESIGN_HANDOFF.md`](docs/DESIGN_HANDOFF.md).

## 개발
```bash
npm install && npm run dev        # 웹(3000)
npm test && npx tsc --noEmit      # 시험·타입
cd engine && node --test tests/   # 엔진 시험(윈도우는 PowerShell에서 — Git Bash tar는 zip을 못 만들어 1개 실패로 보임)
cd desktop && npm run dist        # 설치 파일(release/, 빌드 뒤 public/downloads와 engine-latest.json 교체)
```
