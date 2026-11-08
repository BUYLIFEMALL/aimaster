# AI 업무 워크스페이스

- 담당: Claude Code(윈도우) `claude-win-20261025-workspace` (2026-10-25 인계받음, 이전 `claude-win-20261024-workspace`)
- 맡은 폴더: `ai-work-workspace/`, `ai-task-planner/`(2026-10-26 주인님 결정으로 추가)
- 카테고리: 업무자동화
- 주력 업무: 새 프로그램 「AI 업무 워크스페이스 자동화」 단계별 개발(로드맵 U1~U14, `ai-work-workspace/docs/PLAN_20261024_EXPANSION_ROADMAP.md`). 디자인(U5)은 디자인 역할(agy)이 맡음
- 마지막 갱신: 2026-11-07 [역할: workspace] Claude Code(윈도우) `claude-win-20261025-workspace` — U10 2차 구현 완료(미배포)

## 지금 하는 일
| 프로그램 | 작업 | 시작 | 상태 |
|---|---|---|---|
| — | 없음 | — | — |

## 대기 중 (주인님 승인·결정 대기 포함)
| 프로그램 | 작업 | 기다리는 것 | 근거 문서 |
|---|---|---|---|
| `threads-content-ops` | 미배포 `fcf2dc894` 받은 업무 제목에서 「(광고)」 줄 건너뛰기(U10 운영 확인에서 발견) | 다음 Threads 배포 때(v2.24) | `threads-content-ops/docs/IMPROVEMENTS.md` 맨 위 |
| U10 2차 배포 | 6개 프로그램 「업무 워크스페이스로 보내기」 구현 완료·미배포(`ai-auto-blog`·`naver-blog-agent`·`competitor-analysis`·`web-crawler`·`blog-keyword` + 워크스페이스 이름표) | 주인님 결정(2026-11-09): 따로 배포하지 않고 각 프로그램을 다른 이유로 배포할 때 함께 — 배포하는 세션이 미배포 대기 표 줄을 보고 같이 내보냄 | `docs/PENDING_DEPLOYS.md` 2026-11-07 줄 |
| `ai-work-workspace` | 음성 받아쓰기 엔진 회원 선택 — v1.22 배포됨. 남음: OpenAI 실제 받아쓰기 확인(시험 WAV 준비됨), IMPROVEMENTS·AGENTS 기록(미배포 표는 U10 세션이 「내보낸 기록」으로 옮김) | 형제 세션과 겹치지 않게 git status 확인 뒤 | `ai-work-workspace/docs/IMPROVEMENT_HANDOFF_20261106_STT_DEPLOY.md` |
| `ai-doc-chatbot`(다른 역할 폴더) | 문서 카드가 30일 예외 계정에도 「30일 뒤 자동 삭제」로 표시 — 실제 삭제 대상인지 확인 | 그 폴더 담당 또는 주인님 허락 | `ai-work-workspace/docs/IMPROVEMENTS.md` 「U9 확인 중 발견」 |

## 최근 완료 (최근 10개)
| 날짜 | 프로그램·버전 | 한 일 | 배포 |
|---|---|---|---|
| 2026-11-07 | U10 2차 6개 프로그램 | 보내기 버튼·라우트 구현, 시험·tsc 통과, 커밋 `c44499682`·`18cfb01d5`·`82c25c802`·`34ed724a1`·`21ba04b80`·`acb6e98d7`·`3c175bcce`(모두 미배포) | 비용 없음 |
| 2026-11-06 | `ai-work-workspace` v1.22 · `insta_auto_poster` v1.72 · `threads-content-ops` v2.23 | U10 1차: 「📅 콘텐츠 캘린더」 템플릿 + 받은 업무 「캘린더에 넣기」 + INSTA·Threads 「업무 워크스페이스로 보내기」. ego 운영 확인 — INSTA 예약 글·Threads 발행 글이 캘린더 행으로 정상 | 배포 3회 |
| 2026-11-06 | `ai-work-workspace` v1.22 | 요청함 `c234b28c` 주인님 「진행해」 → 음성 파일 받아쓰기 엔진 회원 선택(설정 메뉴, 자동/OpenAI) 구현. 시험 7+49 통과·타입 검사·로컬 빌드 | Ready 17:47(빌드는 형제 세션/주인님) |
| 2026-11-06 | `ai-work-workspace` v1.21 외 4개 | U9 연계: 워크스페이스 → 슬라이드·번역·문서 챗봇 보내기, 음성 분석 → 회의록 페이지. ego 운영 확인 통과(챗봇 색인 1회·음성 분석 1회) | 배포 5회 |
| 2026-11-03 | `ai-work-workspace` v1.20 | U6-B 음성 파일 받아쓰기(Gemini Google 직접 업로드 100MB·OpenAI 4MB) + 30일 예외 회원 제외 + 요약 중 자동 갱신 등 미배포 5건. 운영 크롬: Gemini 받아쓰기(시각 포함 4문장)·새로고침 없는 요약 통과 | 배포 1회 |
| 2026-10-31 | `ai-work-workspace` v1.19 | U6-A 운영 확인(받아쓰기→요약 생성). 단 정지 뒤 새로고침해야 요약이 보이는 버그 발견 | 없음 |
| 2026-10-26 | 역할 | 주인님 결정 2건 반영: 할 일 플래너를 맡은 폴더에 추가, 미배포 `94719d8da`는 다음 워크스페이스 배포 때 묶어서 내보냄 | 없음 |
| 2026-10-25 | `ai-work-workspace` v1.19 · `ai-task-planner` v1.12 | U8-B 워크스페이스 페이지 할 일 → 플래너 「📥 받은 할 일」(공용 표 받는 곳 열 추가) | 배포 2회 |
| 2026-10-25 | `ai-task-planner` v1.11 | U8-A 할 일·오늘 성과를 워크스페이스 「📨 받은 업무」로 보내기(공용 기준 코드 `work-inbox-client` 첫 사본) | 배포 |
| 2026-10-25 | `ai-work-workspace` v1.18 | U7 업무 받은편지함 — 공용 표 `public.work_inbox` + 「📨 받은 업무」 화면(페이지로 만들기·표에 행으로 넣기) | 배포 |
| 2026-10-24 | `ai-work-workspace` v1.15~v1.17 | 화면 전체 한국어화(약 2,000종)·회의록 정지 시 문장 손실 수정·짧은 녹취 「요약 만들기」·3D 버튼·매뉴얼(화면 구성·회의록·마이크) | 배포 3회 |
| 2026-10-24 | `ai-work-workspace` v1.14 | Gemini 유료 시험 통과(2회) + 기본 모델 회귀 수정(2.5 Flash-Lite 새 사용자 차단 → 최신 Flash-Lite) | 배포 |
| 2026-10-24 | `ai-work-workspace` v1.13 | 회원 OpenAI 키 모델 목록 채팅 모델만(100개 넘던 비채팅 모델 정리) | 배포 |
| 2026-10-24 | `ai-work-workspace` v1.12 | U6-A AI 회의록 — 실시간 받아쓰기 + AI 요약(한국어 기본·당해 연도 기준), 음성 업로드는 U6-B까지 숨김 | 배포 |
| 2026-10-24 | `ai-work-workspace` v1.11 | Gemini 기본 Flash-Lite(주인님 결정) + 리뉴얼 검수 수정 3건(태블릿 메뉴 접기·표준 메뉴 이름·「내 페이지」) + 모델 목록 회원 키별 | 배포 |
| 2026-10-24 | `ai-work-workspace` v1.10 | 운영 DB 버전 v1.07 → v1.10 맞춤 + SQL 파일 | DB만 |
| 2026-10-24 | `ai-work-workspace` v1.07 | 로그인·회원가입 화면을 공식 표준 2탭으로 교체 + 회원가입 버튼 404 수정(`/signup` → `/register`) | 배포 |

## 다음 첫 단계
1. U10 2차는 각 프로그램 다음 배포 때 함께 나감(주인님 2026-11-09 결정) — 나간 프로그램은 시험 계정으로 버튼 → 받은 업무 → 캘린더/페이지/표 행 확인 후 미배포 표를 「내보낸 기록」으로
2. 유튜브 발행 기록(U10 범위 밖)은 video 역할과 저장 열 확인 뒤 다음 단위

## 주인님께 여쭐 것
- 모델 교체 7개(`web-crawler`·`ghost-scraper`·`ai-webtoon-studio`·`ebook-studio`·`ai-prompt-studio`·`vinyl-lp-studio`·`personality-suite`) 배포 — 이 세션은 `deploy.mjs`가 분류기에 막혀 주인님이 `! node scripts/deploy.mjs <폴더> --go`를 한 줄씩 돌려 주시거나 배포 권한 규칙 추가. 인스타·쓰레드 U10 1차 2개도 맡을지 확인 부탁드립니다
