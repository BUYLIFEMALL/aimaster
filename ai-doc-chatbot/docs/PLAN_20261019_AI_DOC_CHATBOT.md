# 개발 플랜 — AI 문서 챗봇 자동화 (2026-10-19, 주인님 승인 원본)

## 요청 원문 요지
강의 실습 과제 (2)「AIMaster Chat」: Upstage LLM 챗봇 + 최신 정보는 Tavily MCP 웹 검색, (3) RAG 고도화: Google 로그인(Supabase OAuth), 채팅 기록 저장, `dataset` 문서를 Upstage Embedding으로 임베딩해 Supabase 검색, 답변 아래 출처 표시. ((1) AIMaster Class 회사 웹사이트는 이번 범위에서 제외 — 주인님 선택)

## 운영 규칙에 맞춰 바뀐 점
| 원래 요청(강의 실습) | 운영 프로그램 |
|---|---|
| 별도 Google 로그인 | AIMaster 공용 로그인·권한 확인(별도 가입 화면 없음) |
| 키를 코드·환경변수에 | 회원이 「API키등록·플랫폼연동」에서 본인 Upstage·Tavily 키 등록(공용 `user_api_keys` 새 항목 → 다른 프로그램 재사용) |
| `dataset` 폴더 고정 문서 | 회원 본인 문서 업로드 → 회원별 임베딩·검색 |
| 대화 영구 저장 | 회원별 저장, 생성일 기준 30일 자동 삭제 |

## 만들 기능
1. 채팅 화면(ChatGPT형, 좌측 채팅방 목록, 질문·답변·시각 저장)
2. 답변 모델 Upstage Solar(본인 키)
3. 웹 검색: 최신 정보 질문이면 Tavily MCP 검색, 답변 아래 출처 링크
4. 내 문서 RAG: Upstage Embedding 임베딩 저장 → 질문 시 관련 문서 검색 → 참고 문서 이름 표시
5. 운영 공통: 좌측 메뉴, `/guide`, 키 등록 화면, `<이름>.buylife.xyz`, v1.01, 상세 소개, 인수인계 문서

## 이름 후보 (선택: ⭐1)
| 순위 | 이름 | slug | 강조점 |
|:---:|---|---|---|
| ⭐1 | AI 문서 챗봇 자동화 | `ai-doc-chatbot` | 내 문서와 웹 검색 근거 챗봇 |
| 2 | AIMaster Chat | `aimaster-chat` | 요청 이름 그대로 |
| 3 | AI 지식검색 챗봇 | `ai-knowledge-chat` | 검색 강조 |
| 4 | AI 리서치 챗봇 자동화 | `ai-research-chatbot` | 웹 검색 강조 |

## 비용
| 구분 | 내용 |
|---|---|
| 개발·시험 | Upstage 가입 무료 크레딧, Tavily 무료 월 1,000건. 시험은 주인님이 본인 키를 화면에서 직접 등록 후 최소 호출(에이전트는 키 입력 안 함) |
| 운영자 | Vercel 프로젝트 1개 + DB 저장 용량(30일 삭제로 계속 늘지 않음) |
| 회원 | 회원 본인 Upstage·Tavily 사용료 |

## 주인님 결정 (2026-10-19 05:06)
- 범위: **챗봇만 Tools에** (회사 웹사이트 제외)
- 이름: **AI 문서 챗봇 자동화**
- 운영 DB 변경 **승인**: ① `pgvector` 확장 ② 회원별 RLS 표 추가(결과적으로 `dcb_rooms`·`dcb_messages`·`dcb_documents`·`dcb_chunks` 4개) ③ 30일 자동 삭제 예약 작업

## 검수 방법
`npm test`(순수 로직·권한 판정) → `npm run build` → 배포 → 비로그인 401/로그인 화면 이동 확인 → 크롬 실제 화면(채팅·문서·매뉴얼·키 등록, 좁은 화면) → 본인 키 등록 후 문서 1개·질문 1~2회.
