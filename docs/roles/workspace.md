# AI 업무 워크스페이스

- 담당: Claude Code(윈도우) `claude-win-20261024-workspace`
- 맡은 폴더: `ai-work-workspace/`
- 카테고리: 업무자동화
- 주력 업무: 새 프로그램 「AI 업무 워크스페이스 자동화」 단계별 개발(로드맵 U1~U14, `ai-work-workspace/docs/PLAN_20261024_EXPANSION_ROADMAP.md`). 디자인(U5)은 디자인 역할(agy)이 맡음
- 마지막 갱신: 2026-10-24 18:50 (담당 세션)

## 지금 하는 일
| 프로그램 | 작업 | 시작 | 상태 |
|---|---|---|---|
| — | 없음(시험 계정 로그인·주인님 결정 대기) | — | — |

## 대기 중 (주인님 승인·결정 대기 포함)
| 프로그램 | 작업 | 기다리는 것 | 근거 문서 |
|---|---|---|---|
| `ai-work-workspace` | 미배포 `59959ec28`(767px 메뉴 접기·표준 메뉴 이름·「내 페이지」)·`404c1ee85`(모델 목록 회원 키별) 배포 → v1.11 | 다음 배포 때 함께(또는 주인님 승인 시 바로, 빌드 1회) | `docs/PENDING_DEPLOYS.md` |
| `ai-work-workspace` | U4 Gemini 유료 시험(시험 계정 본인 키, `gemini-2.5-flash-lite` 10~20회, 수십 원 이하) | 크롬 시험 계정 로그인 | `ai-work-workspace/docs/PLAN_20261024_U4_GEMINI_RETENTION.md` §4 |
| `ai-work-workspace` | 「자동」 기본 Gemini 모델을 최신 Flash(`gemini-3.8-flash`, 비쌈)에서 Flash-Lite 계열로 낮출지 | 주인님 결정 | `ai-work-workspace/docs/IMPROVEMENTS.md` U4·v1.10 메모 |
| `ai-work-workspace` | AI 화면 원본 영어 문구 한국어화(AI 블록 설정 창·채팅 첫 화면) | 디자인 역할과 조율 | `docs/roles/design.md` |
| `ai-work-workspace` | U6 AI 회의록 → U7 업무 받은편지함(DB 변경 승인 필요) → U8~U12 연계·자동화 | 앞 단계 운영 확인 뒤 | 로드맵 §5 |

## 최근 완료 (최근 10개)
| 날짜 | 프로그램·버전 | 한 일 | 배포 |
|---|---|---|---|
| 2026-10-24 | `ai-work-workspace` v1.10 | 리뉴얼 검수(390px·가이드 정상) + 발견 3건 수정, 모델 목록 회원 키별 수정 | 미배포 대기 |
| 2026-10-24 | `ai-work-workspace` v1.10 | 운영 DB 버전 v1.07 → v1.10 맞춤 + SQL 파일 | DB만 |
| 2026-10-24 | `ai-work-workspace` v1.07 | 로그인·회원가입 화면을 공식 표준 2탭으로 교체 + 회원가입 버튼 404 수정(`/signup` → `/register`) | 배포 |
| 2026-10-24 | `ai-work-workspace` v1.06 | U4 회원 본인 Gemini 키 연결(모델 목록·여러 회사 모델 함께 고르기) + AI 채팅 기록 30일 자동 삭제 + Gemini 새 키 형식 `AQ.` 허용 | 배포 |
| 2026-10-24 | `ai-work-workspace` v1.05 | U3 회원 본인 AI 키로 AI 비서 | 배포 |
| 2026-10-24 | `ai-work-workspace` v1.04 | U1 + U2 | 배포 |
| 2026-10-24 | `ai-work-workspace` v1.03 | 배포 | 배포 |
| 2026-10-24 | `ai-work-workspace` v1.02 | 미배포 대기분 | 배포 |
| 2026-10-24 | `ai-work-workspace` v1.01 | 1단계 신규 배포 | 배포 |

## 다음 첫 단계
1. 시험 계정으로 로그인되면 Gemini 유료 시험(`gemini-2.5-flash-lite` 직접 선택)
2. 주인님 결정에 따라 미배포 2건 배포(v1.11) 또는 다음 배포 때 함께

## 주인님께 여쭐 것
- Gemini 유료 시험을 하려면 크롬을 시험 계정(buylifemall@naver.com)으로 로그인해 주세요(지금 관리자 계정).
- 미배포 2건(태블릿 메뉴·표준 메뉴 이름·모델 목록 회원별)을 지금 배포할까요?(빌드 1회) 아니면 다음 배포 때 함께?
- 「자동」 기본 Gemini 모델을 최신 Flash(입력 $0.75·출력 $3.75)에서 2.5 Flash-Lite($0.10·$0.40) 계열로 낮출까요?(회원 사용료 절감)
