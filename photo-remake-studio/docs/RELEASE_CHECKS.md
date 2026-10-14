# 검수·운영 현황 v1.01

2026-10-14 구현 시작(다른 CLI, 미커밋 상태로 중단) → 2026-10-15 Claude Code(보조 계정)가 이어받아 운영 출시. 완료한 검수만 기록합니다.

| 항목 | 결과 |
|---|---|
| 이름/별도 프로그램 | 주인님 확정(이름 2번) |
| 원본 전수 분석 | ZIP 20파일·화면·설정·프롬프트 조사 완료 (`docs/PHOTO_RESTORE_COMPOSE_ANALYSIS_2026-10-14.md`) |
| 단위 테스트 | `npm test` 17/17 통과(입력 위조 차단·실제 2배/4배 확대·8192px 상한·MIME/확장자·프롬프트 보존 지시·본인 키 헤더·폴백 없음) |
| 타입·빌드 | `tsc --noEmit` 통과, `next build` 통과(모든 화면·API 동적) |
| 권한 코드 | 레이아웃·API 4개 모두 `force-dynamic`+`force-no-store`+권한 확인, 판정 순서는 루트와 동일(정지→관리자→핸드폰→FREE→구독→등급+사용기간) |
| 환경변수 | 2026-10-15 주인님 승인 후 `scripts/configure-platform.mjs --approved`로 공용 연결 3종(Production·Development) 등록 |
| DB 등록 | `programs`(이미지 카테고리=바나나 캔버스와 같음, 최소 등급 일반, 배지 new, v1.01, 활성), 요금제 3종, VIP 접근 → 트리거로 VIP 회원 자동 부여 확인 |
| 썸네일 | 관리자 키 1회(gemini-3-pro-image-preview), `program-images/catalog/photo-remake-studio-thumbnail.jpg?v=…` |
| 프로덕션 | READY, `https://photo-remake-studio.buylife.xyz`(도메인 연결), `/login` 200, `/studio` 비로그인 307→로그인, `/api/remake` 비로그인 401 JSON, `X-Vercel-Cache: MISS`, 메인 상세 200 |
| **미완료** | 로그인한 일반 회원의 실제 화면·본인 Gemini 복원/합성 생성 검수 — 보조 계정용 엣지가 연결되지 않아 이번에 수행하지 못함(크롬은 메인 계정 전용이라 사용하지 않음). |
