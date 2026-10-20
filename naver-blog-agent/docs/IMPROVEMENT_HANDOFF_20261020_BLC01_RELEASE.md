# BLC-01 v2.01 릴리스 — 저장소 적용·회원 사진 검수 완료, 배포/확장 검수 진행

2026-10-20 Codex(윈도우). 대상 **AIMaster 운영 ref `esgxyikcnnvmlhygjkth`**. 주인님이 버킷 1개·제한 정책 1개 추가 요청에 「진행해줘」로 승인했습니다. 기존 키/환경변수/회원 권한/다른 버킷은 변경하지 않았습니다.

## 적용 및 검수

- `nba-private-photos`: 비공개, 4MB, JPEG/PNG/WebP. `nba_private_photos_server_only`: anon/authenticated 직접 접근을 막는 RESTRICTIVE ALL 정책, USING/WITH CHECK 모두 새 버킷을 제외. Storage RLS 활성 확인.
- CLI `migration new`로 파일을 만들었으나 CLI 토큰이 없어 SQL 실행은 인증된 Supabase MCP `apply_migration`으로 했습니다. CLI가 만든 로컬 파일은 **실제 원격 적용 이력 `20261020093222`**에 맞춰 이름을 정렬했습니다. [적용 SQL](../supabase/migrations/20261020093222_nba_private_photos.sql). 별도 CLI 로그인/키 등록 없음.
- 실제 SDK 익명 업로드 **403**, 저장소 속성 확인, 실제 사진 정리 dry 실행 **configured=true·expired=0·removed=0**. [증거](evidence/blc01-private-photos/storage-live.json). 회원 파일을 시험 삼아 삭제하지 않았습니다.
- 실제 Edge의 로컬 시험 회원(`buylifemall@naver.com`) 세션으로 시험 PNG 1장을 등록했습니다. 사진 API 9개 항목 통과: 업로드/조회/이미지 다운로드/재발급 200, 공개 경로 400, 다른 회원 경로 404, 7장 요청 400, 최초 등록일+30일과 주소 갱신 시 원래 만료 유지. **모의 인증/운영자 대행이 아닌 실제 회원 쿠키 요청**입니다. [회원 결과](evidence/blc01-private-photos/member-photo-live.json) · [Edge 화면](evidence/blc01-private-photos/member-private-photo-live.png).
- 시험 이미지는 본인 경로에 한 장이며 원래 생성일 기준 30일 보관 대상입니다. 저장된 원고/검수 지문에 임시 URL을 기록하지 않았습니다. 보관 약속대로 정리하며 이번 시험에서 사용자 사진 삭제 0.
- v2.01 릴리스 검사: 회귀 140개, 확장 42개 시나리오, 브리지·발행 설정, 타입 검사, 로컬 프로덕션 빌드 통과. [릴리스 검사/소스 해시](evidence/blc01-private-photos/release-checks.json). manifest `2.1.0`/`v2.01`, 최신 ZIP 생성. package/lock의 버전 메타데이터도 정렬했습니다(의존성 변경 없음).
- 기존 공용 OpenAI 요청 규칙 사본을 이번 배포에 포함하고, 명시된 동반 작업인 모델 성격/상대 비용/추론 지연 안내를 연결했습니다. [모델 안내 실제 회원 화면](evidence/blc01-private-photos/member-model-hints-luna-20261020.png). 공용 사본 자체는 수정하지 않았습니다.
- 임시 로컬 검수 HTML은 회원 인증 페이지 응답으로 시험 계정을 확인한 뒤 API를 호출했습니다. 브라우저/서버 비밀 키를 HTML에 넣지 않았으며 **검수 후 파일을 제거**했습니다. 배포 대상에는 포함하지 않습니다.
- Supabase 보안 점검은 기존 다른 표·함수·Auth 설정의 INFO/WARN을 반환했습니다. 새 버킷/정책을 지목한 경고 없음. 관련 없는 운영 설정을 고치지 않았습니다. [경고 종류/공식 해결 링크](evidence/blc01-private-photos/security-advisors.json).

## 현재 미완료와 다음 첫 단계

코드/버전은 v2.01 릴리스 준비, **아직 배포/DB 프로그램 버전 동기화/확장 실제 준비 검수 전**입니다. 다음 순서:

1. 본인 파일만 커밋/푸시 → 기존 `buylife/naver-blog-agent` 프로젝트 1회 배포 → Ready 확인.
2. [버전 메타데이터 SQL](../supabase/migrations/20261020094141_nba_blc01_release_v201.sql)을 적용하고 코드·DB·manifest·라이브 ZIP 일치를 확인.
3. Edge 운영 시험 회원 세션에서 운영 사진 API 확인 및 새 확장을 통한 **준비까지만** 검수. 유료 AI/최종 블로그 발행 없음. 운영 로그인 주소를 주인님께 안내한 상태입니다.
4. 실제 확장 시험까지 통과해야 BLC-01 운영 완료로 기록하고 BLC-02 플랜으로 넘어갑니다. 사진 UI/사진 후기 생성은 이번 릴리스가 아닙니다.

개발/유지보수: 회원 소유권·수명·실행 격리. 디자인: 모델 선택 안내의 실화면 검수. 신규 시스템: 기존 기능 안정화/이관 기반이며 신규 자동화 시스템으로 분류하지 않습니다. 세 기준 중 로컬·실제 Storage 안정성 확인, 현재 앱 적용성 확인, 회원 사진 보호 편의 목적 확인; 확장 운영 검수는 남았습니다.

배포/커밋 정보와 완료 상태는 후속 결과로 갱신합니다. 이전 [재개/환경 이력](IMPROVEMENT_HANDOFF_20261020_BLC01_RESUME.md)과 구분합니다.

https://naver-blog-agent.buylife.xyz
