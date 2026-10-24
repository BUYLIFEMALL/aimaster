# AI 업무 워크스페이스 자동화 — 작업 대기 목록

> 확장 로드맵(단위 U1~U14, 2026-10-24): [PLAN_20261024_EXPANSION_ROADMAP.md](PLAN_20261024_EXPANSION_ROADMAP.md) — 승인 대기

## 배포 대기
- [x] U1 + U2 배포 — v1.04(2026-10-24, `ai-work-workspace-9esamryua`)
- [x] 1단계 화면 보완 배포 — v1.03(2026-10-24, `ai-work-workspace-l322zllr7`)
- [x] 미배포 커밋 `5a9d5e564` 배포 — v1.02(2026-10-24)

## 1단계 보완
- [x] 이미 만든 「AI 회의록」 블록의 「받아쓰기 시작」 버튼 숨김(1단계 동안) — `2f0de2776`, v1.03 배포

## 확장 로드맵 U1~U14 (PLAN_20261024_EXPANSION_ROADMAP.md)
- [x] U1 이름 바꾸기(AI 이름·메뉴 이름) — `1771f446f`, v1.04 배포
- [x] U2 불필요한 기능 숨기기 — `04d6601b9`, v1.04 배포 (플랜 docs/PLAN_20261024_U2_TRIM.md)
- [x] U3 회원 본인 AI 키로 AI 열기 + 서버 문구·AI 지시문 「AI 비서」 정리 — v1.05(2026-10-24)
- [x] U4 Gemini 연결 + AI 채팅 기록 30일 자동 삭제 — v1.06(2026-10-24)
- [x] 로그인·회원가입 공식 표준 2탭 + 회원가입 링크 404 수정 — v1.07
- [x] U5 디자인 리뉴얼(디자인 역할 agy) — v1.10
- [x] 미배포 `59959ec28`(767px 메뉴·표준 메뉴 이름·「내 페이지」)·`404c1ee85`(모델 목록 회원 키별) 배포 — v1.11
- [x] U6-A AI 회의록(실시간 받아쓰기 + AI 요약) — v1.12
- [ ] U6-A 실제 시험(시험 계정·마이크 허용 → 받아쓰기·요약 3회)
- [ ] U6-B 음성 파일 받아쓰기(회원 Gemini 우선·OpenAI 보조) — A 운영 확인 뒤
- [ ] 회의록 서버 오류 문구 영어 → 한국어(`server/api/modules/meetings.ts`)
- [x] 시험 계정 Gemini 유료 시험 — 2회 통과(3.5 Flash-Lite, 질문·페이지 만들기)
- [x] 회원 OpenAI 키 모델 목록 채팅 모델만 — v1.13
- [x] Gemini 기본 모델 회귀 수정(2.5 Flash-Lite 새 사용자 차단) — v1.14
- [ ] AI 채팅 화면 원본 영어 문구 한국어화(디자인 역할과 조율)
- [x] 「자동」 기본 Gemini 모델을 Flash-Lite 계열로 — v1.11(주인님 결정)
- [ ] Gemini AI 웹 검색 지원 검토
- [ ] AI 화면 원본 영어 문구 한국어화(AI 블록 설정 창·채팅 첫 화면 등)
- [x] 슬래시 「AI 이미지」 숨김 배포(`768bf908d`) — v1.06

## 2단계 — AI (회원 본인 키)
- [x] RPC·AI 스트림 요청마다 회원 `user_api_keys`(openai/anthropic) 읽어 `withMemberAiKeys()` — v1.05
- [x] `AI_STAGE_OPEN=true`, `stagePolicy`의 `ai*` 열기(회의록은 U6), 키 없으면 등록 안내 + 「API키등록·플랫폼연동」 화면(연동 매뉴얼 상자) — v1.05
- [x] AI 채팅 기록 30일 자동 삭제(주인님 결정 §7-1) — `src/server/aiRetention.ts`, v1.06
- [ ] 유료 시험 호출은 시험 계정 본인 키·저가 모델 10~20회(사전 보고)

## 3단계 — 협업
- [ ] AIMaster 회원끼리 초대(이메일 → 회원 확인), 페이지 권한, 댓글·멘션 알림
- [ ] Supabase Realtime 방송으로 동시 편집(원본 `realtime.ts` 대체)
- [ ] 공개 페이지·사이트는 보안 검토 후 결정

## 4단계 — 자동화
- [ ] 맞춤 에이전트·데이터베이스 자동화·버튼(바깥 호출 포함) 열기
- [ ] 예약 실행은 회원 본인 cron-job.org(`docs/SCHEDULER_POLICY.md`)
- [ ] REST API·웹훅·MCP(회원 개인 토큰)

## 품질
- [x] 템플릿 예시 내용 한국어화(`content/catalog.ts`) — `df7a628d3`, v1.03 배포
- [x] 남은 영어 날짜 문구(`web/lib/format.ts` + 화면 16개 파일) — `db77b7a3b`, v1.03 배포
- [ ] 큰 파일 Storage 이전
