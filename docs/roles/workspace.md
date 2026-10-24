# AI 업무 워크스페이스

- 담당: Claude Code(윈도우) `claude-win-20261024-workspace`
- 맡은 폴더: `ai-work-workspace/`
- 카테고리: 업무자동화
- 주력 업무: 새 프로그램 「AI 업무 워크스페이스 자동화」 단계별 개발(로드맵 U1~U14, `ai-work-workspace/docs/PLAN_20261024_EXPANSION_ROADMAP.md`). 디자인(U5)은 디자인 역할(agy)이 맡음
- 마지막 갱신: 2026-10-24 21:00 (담당 세션)

## 지금 하는 일
| 프로그램 | 작업 | 시작 | 상태 |
|---|---|---|---|
| — | 없음(시험 계정 로그인 대기) | — | — |

## 대기 중 (주인님 승인·결정 대기 포함)
| 프로그램 | 작업 | 기다리는 것 | 근거 문서 |
|---|---|---|---|
| `ai-work-workspace` | U4 Gemini 유료 시험(시험 계정 본인 키, `gemini-2.5-flash-lite` 10~20회, 수십 원 이하) | 크롬 시험 계정 로그인 | `ai-work-workspace/docs/PLAN_20261024_U4_GEMINI_RETENTION.md` §4 |
| `ai-work-workspace` | AI 화면 원본 영어 문구 한국어화(AI 블록 설정 창·채팅 첫 화면) | 디자인 역할과 조율 | `docs/roles/design.md` |
| `ai-work-workspace` | U6-A 실제 시험(시험 계정·마이크 허용 → 받아쓰기·요약 3회) | 크롬 시험 계정 로그인 | `ai-work-workspace/docs/PLAN_20261024_U6_MEETING_NOTES.md` §3 |
| `ai-work-workspace` | U6-B 음성 파일 받아쓰기(회원 Gemini 우선·OpenAI 보조) → v1.13 | U6-A 운영 확인 | 같은 플랜 §2 |
| `ai-work-workspace` | U7 업무 받은편지함(DB 변경 승인 필요) → U8~U12 연계·자동화 | U6 운영 확인 뒤 | 로드맵 §5 |

## 최근 완료 (최근 10개)
| 날짜 | 프로그램·버전 | 한 일 | 배포 |
|---|---|---|---|
| 2026-10-24 | `ai-work-workspace` v1.12 | U6-A AI 회의록 — 실시간 받아쓰기 + AI 요약(한국어 기본·당해 연도 기준), 음성 업로드는 U6-B까지 숨김 | 배포 |
| 2026-10-24 | `ai-work-workspace` v1.11 | Gemini 기본 Flash-Lite(주인님 결정) + 리뉴얼 검수 수정 3건(태블릿 메뉴 접기·표준 메뉴 이름·「내 페이지」) + 모델 목록 회원 키별 | 배포 |
| 2026-10-24 | `ai-work-workspace` v1.10 | 운영 DB 버전 v1.07 → v1.10 맞춤 + SQL 파일 | DB만 |
| 2026-10-24 | `ai-work-workspace` v1.07 | 로그인·회원가입 화면을 공식 표준 2탭으로 교체 + 회원가입 버튼 404 수정(`/signup` → `/register`) | 배포 |
| 2026-10-24 | `ai-work-workspace` v1.06 | U4 회원 본인 Gemini 키 연결(모델 목록·여러 회사 모델 함께 고르기) + AI 채팅 기록 30일 자동 삭제 + Gemini 새 키 형식 `AQ.` 허용 | 배포 |
| 2026-10-24 | `ai-work-workspace` v1.05 | U3 회원 본인 AI 키로 AI 비서 | 배포 |
| 2026-10-24 | `ai-work-workspace` v1.04 | U1 + U2 | 배포 |
| 2026-10-24 | `ai-work-workspace` v1.03 | 배포 | 배포 |
| 2026-10-24 | `ai-work-workspace` v1.02 | 미배포 대기분 | 배포 |

## 다음 첫 단계
1. 시험 계정으로 로그인되면 Gemini 유료 시험(기본이 `gemini-2.5-flash-lite`)
2. 시험 계정 로그인되면 U6-A 실제 시험(마이크 허용은 주인님) → 운영 확인 뒤 U6-B

## 주인님께 여쭐 것
- Gemini 유료 시험·U6-A 회의록 실제 시험을 하려면 크롬을 시험 계정(buylifemall@naver.com)으로 로그인하고, 회의록 받아쓰기 때 마이크 허용을 눌러 주세요.
- U6-B 음성 파일 받아쓰기 제공자를 Gemini 우선·OpenAI 보조(4MB 이하)로 할까요?(추천)
