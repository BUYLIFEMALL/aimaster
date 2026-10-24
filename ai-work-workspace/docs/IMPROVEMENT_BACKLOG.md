# AI 업무 워크스페이스 자동화 — 작업 대기 목록

> 확장 로드맵(단위 U1~U14, 2026-10-24): [PLAN_20261024_EXPANSION_ROADMAP.md](PLAN_20261024_EXPANSION_ROADMAP.md) — 승인 대기

## 배포 대기
- [x] 1단계 화면 보완 배포 — v1.03(2026-10-24, `ai-work-workspace-l322zllr7`)
- [x] 미배포 커밋 `5a9d5e564` 배포 — v1.02(2026-10-24)

## 1단계 보완
- [x] 이미 만든 「AI 회의록」 블록의 「받아쓰기 시작」 버튼 숨김(1단계 동안) — `2f0de2776`, v1.03 배포

## 2단계 — AI (회원 본인 키)
- [ ] RPC·AI 스트림 요청마다 회원 `user_api_keys`(openai/anthropic) 읽어 `withMemberAiKeys()`
- [ ] `AI_STAGE_OPEN=true`, `stagePolicy`의 `ai*`·회의록 줄 열기, 키 없으면 등록 안내 팝업 + 「API키등록·플랫폼연동」 설정 화면(연동 매뉴얼 상자)
- [ ] AI 채팅 기록 30일 자동 삭제(주인님 결정 §7-1) — `ai_threads`·`ai_messages` 정리 작업
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
