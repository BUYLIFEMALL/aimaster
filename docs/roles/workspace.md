# AI 업무 워크스페이스

- 담당: Claude Code(윈도우) `claude-win-20261025-workspace` (2026-10-25 인계받음, 이전 `claude-win-20261024-workspace`)
- 맡은 폴더: `ai-work-workspace/`, `ai-task-planner/`(2026-10-26 주인님 결정으로 추가)
- 카테고리: 업무자동화
- 주력 업무: 새 프로그램 「AI 업무 워크스페이스 자동화」 단계별 개발(로드맵 U1~U14, `ai-work-workspace/docs/PLAN_20261024_EXPANSION_ROADMAP.md`). 디자인(U5)은 디자인 역할(agy)이 맡음
- 마지막 갱신: 2026-11-06 18:00 (claude-win-20261025-workspace — v1.22 Ready, 배포 기록 정리·OpenAI 확인·모델 교체 7개 배포 남음, 인수인계 `IMPROVEMENT_HANDOFF_20261106_STT_DEPLOY.md`)

## 지금 하는 일
| 프로그램 | 작업 | 시작 | 상태 |
|---|---|---|---|
| — | 없음(U10 1차 (가) 구현 완료: 워크스페이스 `cc4f4eabe`+`b98de2641` · 인스타 `b98de2641` · Threads `7caa31152`, 모두 미배포 — 빌드 승인 대기) | — | — |

## 대기 중 (주인님 승인·결정 대기 포함)
| 프로그램 | 작업 | 기다리는 것 | 근거 문서 |
|---|---|---|---|
| `ai-work-workspace` | 미배포 `376c55c7a`(왼쪽 메뉴 버전 v1.21 표시)·`a80274b4c`(보낸 마크다운 정리·빈 화면 문구)·`cc4f4eabe`+`b98de2641`(U10 콘텐츠 캘린더 템플릿·캘린더에 넣기·slug) | 다음 워크스페이스 배포 때 함께(v1.22) — 인스타·Threads보다 먼저 | `ai-work-workspace/docs/IMPROVEMENTS.md` |
| `insta_auto_poster` | 미배포 `b98de2641` U10 「업무 워크스페이스로 보내기」 | 워크스페이스 v1.22 뒤 v1.72 빌드 1회 승인 | `insta_auto_poster/docs/IMPROVEMENTS.md` 맨 위 |
| `threads-content-ops` | 미배포 `7caa31152` U10 「업무 워크스페이스로 보내기」 | 워크스페이스 v1.22 뒤 v2.23 빌드 1회 승인 | `threads-content-ops/docs/IMPROVEMENTS.md` 맨 위 |
| U10 2차 | 발행 2개(교육용 블로그·네이버 에이전트)·분석 3개·수집 1개 | 1차 운영 확인 뒤 주인님 「2차 진행」 | `ai-work-workspace/docs/PLAN_20261106_U10_CONTENT_CALENDAR.md` §4 |
| `ai-work-workspace` | 음성 받아쓰기 엔진 회원 선택 → v1.22 **Ready(17:47)**. 남음: 배포 기록 정리(미배포 표 3줄·IMPROVEMENTS·AGENTS) + OpenAI 실제 받아쓰기 확인(시험 WAV 준비됨) | 형제 세션과 겹치지 않게 git status 확인 뒤 | `ai-work-workspace/docs/IMPROVEMENT_HANDOFF_20261106_STT_DEPLOY.md` |
| `ai-doc-chatbot`(다른 역할 폴더) | 문서 카드가 30일 예외 계정에도 「30일 뒤 자동 삭제」로 표시 — 실제 삭제 대상인지 확인 | 그 폴더 담당 또는 주인님 허락 | `ai-work-workspace/docs/IMPROVEMENTS.md` 「U9 확인 중 발견」 |

## 최근 완료 (최근 10개)
| 날짜 | 프로그램·버전 | 한 일 | 배포 |
|---|---|---|---|
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
1. U10 플랜(`ai-work-workspace/docs/PLAN_20261106_U10_CONTENT_CALENDAR.md`) §8 결정이 오면 §4 순서로 보내는 프로그램(인스타·Threads → 블로그 2개 → 분석·수집 4개) 진행
2. 워크스페이스 v1.22 배포 때 미배포(메뉴 버전·보낸 마크다운·엔진 선택·U10 캘린더)를 함께 내보내고 운영 확인

## 주인님께 여쭐 것
- U10 1차 (가) 배포 승인 — 빌드 3회 순차: 워크스페이스 v1.22(받아쓰기 엔진 선택 포함, 다른 세션이 이미 여쭌 건과 같음) → INSTA v1.72 → Threads v2.23. 승인되면 순서대로 배포하고 시험 계정으로 인스타·Threads 글 1건씩 → 받은 업무 → 콘텐츠 캘린더까지 확인(AI 호출 없음)
- 모델 교체 7개(`web-crawler`·`ghost-scraper`·`ai-webtoon-studio`·`ebook-studio`·`ai-prompt-studio`·`vinyl-lp-studio`·`personality-suite`) 배포 — 이 세션은 `deploy.mjs`가 분류기에 막혀 주인님이 `! node scripts/deploy.mjs <폴더> --go`를 한 줄씩 돌려 주시거나 배포 권한 규칙 추가. 인스타·쓰레드 U10 1차 2개도 맡을지 확인 부탁드립니다
