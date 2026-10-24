# AI 업무 워크스페이스

- 담당: Claude Code(윈도우) `claude-win-20261024-workspace`
- 맡은 폴더: `ai-work-workspace/`
- 카테고리: 업무자동화
- 주력 업무: 새 프로그램 「AI 업무 워크스페이스 자동화」 단계별 개발(로드맵 U1~U14, `ai-work-workspace/docs/PLAN_20261024_EXPANSION_ROADMAP.md`). 디자인(U5)은 디자인 역할(agy)이 맡음
- 마지막 갱신: 2026-10-24 17:30 (담당 세션 확인·수정 완료)

## 지금 하는 일
| 프로그램 | 작업 | 시작 | 상태 |
|---|---|---|---|
| — | 없음(주인님 지시 대기) | — | — |

## 대기 중 (주인님 승인·결정 대기 포함)
| 프로그램 | 작업 | 기다리는 것 | 근거 문서 |
|---|---|---|---|
| `ai-work-workspace` v1.10 | 버전 맞추기: 코드는 v1.10(디자인 리뉴얼 배포), 운영 DB `programs.version`은 v1.07, 버전 SQL 파일은 v1.07까지 — DB를 v1.10으로 올리고 SQL 파일 추가 추천 | 주인님 결정 | 루트 HANDOFF 2026-10-24 U4 항목 |
| `ai-work-workspace` | U4 Gemini 유료 시험(시험 계정 본인 키, 가장 싼 모델 10~20회) | 주인님 「진행해」 | `ai-work-workspace/docs/PLAN_20261024_U4_GEMINI_RETENTION.md` §4 |
| `ai-work-workspace` | 폴더 인수인계 문서(AGENTS·README·IMPROVEMENTS·BACKLOG)에 U4·로그인 표준화 반영 | 다음 작업 때(디자인 역할 작업이 끝나 손댈 수 있음) | 루트 HANDOFF |
| `ai-work-workspace` | OpenAI 모델 목록 캐시를 회원 키별로 나누기(원본은 모든 회원 공용 목록) | 다음 작업 때, 배포는 다음 배포 때 함께 | — |
| `ai-work-workspace` | 디자인 리뉴얼 v1.10 화면 검수(로그인·온보딩·사이드바·가이드·휴대폰 폭, 기능 깨짐 확인) | 다음 작업 때 | `ai-work-workspace/docs/DESIGN_HANDOFF.md` |
| `ai-work-workspace` | AI 화면 원본 영어 문구 한국어화(AI 블록 설정 창·채팅 첫 화면) | 디자인 역할과 조율 | `docs/roles/design.md` |
| `ai-work-workspace` | U6 AI 회의록 → U7 업무 받은편지함(DB 변경 승인 필요) → U8~U12 연계·자동화 | 앞 단계 운영 확인 뒤 | 로드맵 §5 |

## 최근 완료 (최근 10개)
| 날짜 | 프로그램·버전 | 한 일 | 배포 |
|---|---|---|---|
| 2026-10-24 | `ai-work-workspace` v1.07 | 로그인·회원가입 화면을 공식 표준 2탭으로 교체 + 회원가입 버튼 404 수정(`/signup` → `/register`) | 배포 |
| 2026-10-24 | `ai-work-workspace` v1.06 | U4 회원 본인 Gemini 키 연결(모델 목록·여러 회사 모델 함께 고르기) + AI 채팅 기록 30일 자동 삭제 + Gemini 새 키 형식 `AQ.` 허용 | 배포 |
| 2026-10-24 | `ai-work-workspace` v1.05 | U3 회원 본인 AI 키로 AI 비서 | 배포 |
| 2026-10-24 | `ai-work-workspace` v1.04 | U1 + U2 | 배포 |
| 2026-10-24 | `ai-work-workspace` v1.03 | 배포 | 배포 |
| 2026-10-24 | `ai-work-workspace` v1.02 | 미배포 대기분 | 배포 |
| 2026-10-24 | `ai-work-workspace` v1.01 | 1단계 신규 배포 | 배포 |

## 다음 첫 단계
1. 주인님 결정을 받아 운영 DB 버전을 v1.10으로 맞추고 SQL 파일 추가
2. Gemini 유료 시험 → 디자인 리뉴얼 화면 검수 → 폴더 인수인계 문서 정리

## 주인님께 여쭐 것
- 버전 맞추기: 운영 DB를 v1.10으로 올려도 될까요?(코드를 v1.08로 되돌리면 빌드 1회가 더 듭니다)
- Gemini 유료 시험(시험 계정 본인 키, 가장 싼 모델 10~20회, 수십 원 이하)을 지금 진행할까요?
