# AI 업무 워크스페이스

- 담당: Claude Code(윈도우) `claude-win-20261025-workspace` (2026-10-25 인계받음, 이전 `claude-win-20261024-workspace`)
- 맡은 폴더: `ai-work-workspace/`, `ai-task-planner/`(2026-10-26 주인님 결정으로 추가)
- 카테고리: 업무자동화
- 주력 업무: 새 프로그램 「AI 업무 워크스페이스 자동화」 단계별 개발(로드맵 U1~U14, `ai-work-workspace/docs/PLAN_20261024_EXPANSION_ROADMAP.md`). 디자인(U5)은 디자인 역할(agy)이 맡음
- 마지막 갱신: 2026-11-10 [역할: workspace] Claude Code(윈도우) — U11 v1.23 배포·운영 확인 완료, OpenAI 받아쓰기는 시험 계정 잔액 부족으로 미확인

## 지금 하는 일
| 프로그램 | 작업 | 시작 | 상태 |
|---|---|---|---|
| `ai-work-workspace` | U12 업무 비서 플랜 | 2026-11-10 | 플랜 작성 예정 |

## 대기 중 (주인님 승인·결정 대기 포함)
| 프로그램 | 작업 | 기다리는 것 | 근거 문서 |
|---|---|---|---|
| `ai-work-workspace` | OpenAI 받아쓰기 실제 결과 확인 | 시험 계정 OpenAI 키 잔액 충전(앱 경로·안내는 정상 확인) | `ai-work-workspace/docs/IMPROVEMENTS.md` 「U11 운영 확인」 |
| U10 2차 배포 | 6개 프로그램 「업무 워크스페이스로 보내기」 구현 완료. `blog-keyword`(v1.13) 운영 확인 통과(11-10)·`threads-content-ops` 「(광고)」 수정(v2.25) 배포됨·DB 버전 v2.25로 맞춤. 나머지 미배포(`ai-auto-blog`·`naver-blog-agent`·`competitor-analysis`·`web-crawler`·`blog-keyword` + 워크스페이스 이름표) | 주인님 결정(2026-11-09): 따로 배포하지 않고 각 프로그램을 다른 이유로 배포할 때 함께 — 배포하는 세션이 미배포 대기 표 줄을 보고 같이 내보냄 | `docs/PENDING_DEPLOYS.md` 2026-11-07 줄 |
| `ai-work-workspace` | U12 업무 비서 → U13 협업(주인님 2026-11-10 「진행해」·「협업해서 진행해」) | U11 운영 확인 뒤 차례로 플랜부터. U13은 「회원이 초대한 사람에게만 공유」를 데이터 격리 규칙 예외로 둘지 먼저 결정 | 로드맵 §U12·U13 |
| `ai-work-workspace` | 구글 캘린더 — 검토 문서만(U11 결정 5번). 권장: ICS 구독 주소 방식 별도 작은 단위 | 주인님 결정 | `ai-work-workspace/docs/REVIEW_20261110_GOOGLE_CALENDAR.md` |
| `ai-work-workspace` | 영수증·홈택스 세금계산서 플랜(analysis-planning 역할이 10-27 작성, 이 역할에 구현 배정 제안) | 주인님 결정(어디에 만들지·범위) | `ai-work-workspace/docs/PLAN_20261027_RECEIPT_TAX_INVOICE.md` |
| `ai-doc-chatbot`(다른 역할 폴더) | 문서 카드가 30일 예외 계정에도 「30일 뒤 자동 삭제」로 표시 — 실제 삭제 대상인지 확인 | 그 폴더 담당 또는 주인님 허락 | `ai-work-workspace/docs/IMPROVEMENTS.md` 「U9 확인 중 발견」 |

## 최근 완료 (최근 10개)
| 날짜 | 프로그램·버전 | 한 일 | 배포 |
|---|---|---|---|
| 2026-11-10 | `blog-keyword` v1.13 · `threads-content-ops` v2.25 | U10 2차 `blog-keyword` 버튼 운영 확인(보내기 → 받은 업무 → 페이지) 통과, Threads 운영 DB 버전 v2.23 → v2.25 맞춤, 미배포 표 정리 | 없음(DB 버전만) |
| 2026-11-10 | `ai-work-workspace` v1.23 | U11 배포: 운영 DB 표 `aww_member_scheduler` 적용, 이름표 `3c175bcce` 함께. ego 운영 확인 — 값 변경 자동화·정시 자동화(cron-job.org 실행 → 알림)·일시정지/재개·끄면 작업 꺼짐 통과. OpenAI 받아쓰기는 시험 계정 잔액 부족으로 결과 미확인 | 빌드 1회 |
| 2026-11-10 | `ai-work-workspace`(미배포, 배포 때 v1.23) | U11 자동화 구현: 자동화·버튼 저장 열기(웹훅·에이전트는 「준비 중」·서버 거절), 값 변경 자동화 `after()` 마무리, 회원 cron-job.org 1분 정시 실행(공용 `member-scheduler` 사본·회원 주소 `/api/cron/member`·운영 cron은 회원 작업 제외), 상태 줄·키 칸·매뉴얼, 실행 기록·알림 30일 정리. 시험 58/58·원본 523/523·공용 18/18·tsc·로컬 빌드. 커밋 `fc6a5df9a`(플랜)·`0d686f9b3` | 비용 없음 |
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
0. (완료) U11 v1.23 배포·운영 확인
1. U10 2차 남은 4개(`ai-auto-blog`·`naver-blog-agent`·`competitor-analysis`·`web-crawler`)는 각 프로그램 다음 배포 때 함께 나감 — 나간 프로그램은 시험 계정으로 보내기 → 받은 업무 → 페이지 확인
2. 유튜브 발행 기록(U10 범위 밖)은 video 역할과 저장 열 확인 뒤 다음 단위

## 주인님께 여쭐 것
- 구글 캘린더: ICS 구독 주소 방식(설정 3단계·키 없음)으로 별도 작은 단위 진행할지(`ai-work-workspace/docs/REVIEW_20261110_GOOGLE_CALENDAR.md`)
- 모델 교체 7개(`web-crawler`·`ghost-scraper`·`ai-webtoon-studio`·`ebook-studio`·`ai-prompt-studio`·`vinyl-lp-studio`·`personality-suite`) 배포 — 이 세션은 `deploy.mjs`가 분류기에 막혀 주인님이 `! node scripts/deploy.mjs <폴더> --go`를 한 줄씩 돌려 주시거나 배포 권한 규칙 추가. 인스타·쓰레드 U10 1차 2개도 맡을지 확인 부탁드립니다
