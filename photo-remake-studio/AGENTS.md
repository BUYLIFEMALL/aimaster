# AI 포토 리메이크 자동화 — 작업 지침

프로그램명: **AI 포토 리메이크 자동화**. slug/폴더: `photo-remake-studio`. 첫 버전: **v1.01**.

루트 AGENTS.md, docs/HANDOFF.md, docs/ERROR_LESSONS.md, docs/TOP_RULE_PERSONAL_ACCOUNT_API.md, docs/AI_AGENT_AUTONOMOUS_DEV_WORKFLOW.md를 먼저 읽습니다. 원본 조사: [상세 분석](../docs/PHOTO_RESTORE_COMPOSE_ANALYSIS_2026-10-14.md). 주인님이 이름 2번을 선택하고 별도 프로그램 구현을 지시했습니다.

- 인증·사용기간·핸드폰·정지 여부는 AIMaster 공유 DB와 공용 판정 코드로 확인합니다. API에서는 JSON 오류, 화면에서는 로그인/권한 안내로 이동합니다.
- Gemini는 로그인한 회원 본인 `user_api_keys` 행으로만 호출합니다. 키가 없으면 본인 키 등록 안내. 운영자 키·다른 회원 키 폴백 금지.
- 사진은 서버에 영구 보관하지 않습니다. 보관함은 회원 ID로 분리된 이 브라우저 IndexedDB에 결과만 저장합니다. 원본 사진·키는 보관하지 않습니다.
- 사용자 지시는 영어 번역 API 없이 직접 이미지 모델에 전달합니다. 복원 옵션 제안은 로컬 처리, 합성 AI 제안만 본인 텍스트 모델 1회입니다.
- 업스케일은 AI 선명화 후 서버 sharp 확대, 긴 변 최대 8192px. 실제 결과 크기·반환 MIME를 표시하고 다운로드 확장자를 맞춥니다.
- 얼굴·나이·사진 구도 보존, 모든 사물 포함·상품 원형 보존, 배경 유지/변경 선택을 프롬프트에서 구분합니다. 업로드 인물을 다른 민족으로 바꾸지 않습니다. 현재 연도·한국 날짜를 동적 주입합니다.
- UI는 흰색 바탕, 표준 사이드바, 767px 이하 위쪽 접는 메뉴. API키등록·플랫폼연동과 계정·로그아웃은 작업 메뉴 아래에 배치합니다.
- 새 환경변수 추가는 루트 특수 작업 사전 승인 대상입니다(공용 연결 3종은 2026-10-15 승인·등록 완료). 새 DB 테이블/스키마는 만들지 않습니다.
- 작업 기록: v1.02 (2026-10-15) — 복원 때 AI가 인물 쪽으로 확대해 원본 구도가 바뀌던 문제: 복원 지시에 자르기·확대·재배치 금지와 손상된 가장자리·빈 배경 제자리 복원을 명시(`src/lib/remake/prompts.ts` FRAMING, 테스트 18/18). 배포 READY, 운영 재확인 완료: v1.01 때 구도가 바뀐 같은 사진으로 복원 → 왼쪽 빈 벽과 인물 위치가 원본대로 유지(엣지, 시험 계정 본인 키 이미지 1회).
- 작업 기록: v1.01 (2026-10-15) — 이어받아 운영 출시(환경변수·DB 등록·썸네일·도메인·배포). 실제 회원 검수 2026-10-15 완료(RELEASE_CHECKS). 개선 후보: 복원 때 원본 구도 유지 강화.

진행/재개: [구현 계획](docs/IMPLEMENTATION_PLAN.md), [검수 및 운영 현황](docs/RELEASE_CHECKS.md). 변경 파일만 스테이징하고 다른 CLI의 미커밋 파일을 포함하지 않습니다.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->


## 2026-10-16 DB 연동 변수 호환 — v1.03 (photo-remake-studio)

작업 전 [최상위 데이터베이스 연동 지침](../docs/DATABASE_CONNECTION_POLICY.md)과 [전체 전환 인수인계](../docs/DATABASE_CONNECTION_HANDOFF.md)를 먼저 읽습니다. 공개 키는 새 PUBLISHABLE 이름 우선·기존 ANON 이름 호환, 서버 키는 새 SECRET 이름 우선·기존 SERVICE_ROLE 이름 호환입니다. 새 값 없음/공백일 때만 같은 종류의 기존 값을 사용하며, 인증 실패 후 다른 키로 재시도하지 않습니다. 기존 변수·실제 키·회원 권한·Cron은 유지합니다. 배포·회원 검수 결과는 전체 인수인계의 프로그램별 기록에서 확인합니다. 기존 변수 삭제와 실제 키 폐기는 별개이며 안정화 확인 전 삭제하지 않습니다.
