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
| **실제 회원 검수(2026-10-15, 엣지)** | 시험 계정 `buylifemall@naver.com`(VIP 자동 부여)으로 SSO 로그인 상태에서 진입. ① 복원: 흑백·긁힘 사진 300×394 → 손상 복원+컬러화+2배, 약 14초, 결과 **1792×2354 JPEG**(AI 896×1177의 실제 2배), 얼굴·인원 보존. 단 AI가 인물 쪽으로 확대해 원본 구도(왼쪽 빈 벽)는 그대로 유지되지 않음 → 개선 후보. ② JPEG/PNG 저장 파일명·확장자 일치, 보관함 저장. ③ 합성: 기본 사진 + 사물 2장 추가 → 1장 삭제(2→1), 사물별 지시, AI 합성 지시 제안 약 7초(텍스트 1회), 합성 약 14초, 빨간 모자가 딸에게만 씌워지고 다른 인물 유지. ④ 보관함: 페이지 이동 후 2건 유지, 원본 없이 결과만 저장(IndexedDB 회원 ID별 분리), JPEG 저장·삭제(확인창) 정상. ⑤ 400px: 좌측 메뉴 숨김·☰ 메뉴(항목·순서·계정 위치 동일), 카드 1열, 가로 스크롤 없음. ⑥ API키 화면: 본인 키 일부만 표시, 연동 매뉴얼 버튼. 본인 Gemini 사용: 이미지 2회 + 텍스트 1회. |
