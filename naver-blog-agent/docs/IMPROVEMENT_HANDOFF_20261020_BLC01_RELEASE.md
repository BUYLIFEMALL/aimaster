# BLC-01 v2.01 최종 인수인계 — 비공개 사진 기반 운영 완료

2026-10-20 Codex(윈도우). 대상 **AIMaster 운영 ref `esgxyikcnnvmlhygjkth`**, Lab 아님. 코드 커밋 `fc72cf45` 원격 master 반영 확인. BLC-01 완료이며 사진 입력 UI/사진 글쓰기는 BLC-02~04 미구현입니다.

## 운영 반영

- 주인님의 구체 승인 후 비공개 버킷 `nba-private-photos`(4MB, JPEG/PNG/WebP)과 `nba_private_photos_server_only` 제한 정책을 적용했습니다. anon/authenticated 직접 접근 차단, RLS/버킷 속성 확인. 기존 버킷/회원 권한/키/환경변수 변경 없음.
- CLI `migration new`로 파일 생성 후 CLI 토큰이 없어 인증된 Supabase MCP `apply_migration`으로 적용했습니다. 로컬 이름을 **실제 원격 이력 20261020093222**에 맞췄습니다. [적용 SQL](../supabase/migrations/20261020093222_nba_private_photos.sql). 별도 CLI 로그인/토큰 등록 없음.
- 이번 릴리스 프로덕션 배포 **1회**, `dpl_URM1qZdXHmjjJSpdM19mrP4UpkGf`. [배포 주소](https://naver-blog-agent-9xj7p6jk3-buylife.vercel.app). `vercel inspect` Ready·공식 도메인 연결 확인.
- 운영 `programs` 해당 slug의 버전/확장 버전/다운로드 주소만 반영했습니다. 앱/DB/manifest/실제 다운로드 ZIP **v2.01 일치**, 확장 검사 실패 0·경고 0. [메타데이터 SQL](../supabase/migrations/20261020094141_nba_blc01_release_v201.sql) · [라이브 검사](evidence/blc01-private-photos/production-release.json).
- 기존 공용 OpenAI 요청 규칙 사본 미배포분과 모델 성격/상대 비용/추론 안내를 함께 배포했습니다. 공용 사본 자체 수정 없음. SHARED_MODULES/SHARED_FEATURE_MAP에서 이 프로그램만 배포 완료로 정리했습니다.

## 확인한 결과

| 검수 | 결과·증거 |
|---|---|
| 로컬 릴리스 | 회귀 **140개**, 확장 모의 **42개**, 브리지/발행 스크립트·타입 검사·Next 프로덕션 빌드 통과. [명령/해시](evidence/blc01-private-photos/release-checks.json) |
| 실제 Storage | 익명 SDK 업로드 403, 실제 정리 dry configured=true/expired=0/removed=0. 실제 사용자 사진 삭제 0. [증거](evidence/blc01-private-photos/storage-live.json) |
| 실제 회원 사진 API | Edge 로컬 시험 회원의 실제 쿠키로 작은 PNG 1장 업로드. 조회/다운로드/재발급·공개 차단·타 소유자 거부·6장 제한·원래 생성일+30일/최대 300초 주소 등 **9개 통과**. [결과](evidence/blc01-private-photos/member-photo-live.json) · [화면](evidence/blc01-private-photos/member-private-photo-live.png) |
| 운영 HTTP | 버전 API 200, 사진/확장 POST 4개·Cron GET 무인증 401. 임시 검수 HTML 운영 404. [결과](evidence/blc01-private-photos/production-release.json) |
| 운영 시험 회원 | 주인님이 `buylifemall@naver.com`으로 직접 로그인한 실제 운영 v2.01 화면 확인. 관리자 화면은 일반 회원 증거에 포함하지 않음. [캡처](evidence/blc01-private-photos/production-member-v201.png) |
| 실제 확장 준비 | Edge에 v2.01 설치, 회원이 발급한 코드로 연결. 실제 로컬 회원 API → 운영 DB → 배포된 운영 API → 실제 확장 → 실제 네이버 편집기. 제목/본문/비공개 시험 사진 1장 입력 후 DB **prepared, 6/6**. `published_at`/`post_url` null, 최종 발행 0. 원고 images는 정적 경로만 보관하고 URL 저장 없음. [결과](evidence/blc01-private-photos/extension-member-live.json) · [편집기 트리](evidence/blc01-private-photos/prepared-edge-tree.txt) |
| 모델 안내 | 로컬 일반 회원 화면에서 제공사 전환·설명 펼침·Luna 선택·상대 비용/지연 문구 검수. 저장 없이 GPT-4.1 복원. [화면](evidence/blc01-private-photos/member-model-hints-luna-20261020.png) |

## 발견한 제약과 보존한 상태

- 기존 등록 ID `buylifemall`은 `buylifeacademy`로 이동했습니다. 첫 시험 `3e629708-43c5-4260-8e57-48866e4339a6`은 존재하지 않는 게시물 안내·입력 0으로 실패 종료했습니다. 주인님이 실제 로그인해 연 `buylifeacademy` 글쓰기 화면을 확인한 뒤 **시험 확장/새 시험 원고만** 이 ID로 연결했습니다. 기존 계정 설정/기존 원고 변경 없음. 새 시험 `eafe5861-500a-442d-95e5-1c3d65a1f7a9`은 준비 완료입니다. **BLC-INS-05**에 ID 불일치 안내를 제안으로 기록했습니다. 자동 ID 치환 미구현.
- 준비된 네이버 원고와 Edge 창을 그대로 열어 두었습니다. 최종 발행 버튼을 누르지 않았습니다. 시험 원고 2건/작은 시험 이미지 1장은 본인 소유로 유지하며 원래 30일 정리 대상입니다. 새 서명 주소를 DB/문서에 보관하지 않습니다.
- 실제 준비 완료의 픽셀 캡처는 Orca `screenshot_failed`, Windows 기본 캡처 `The handle is invalid`로 실패했습니다. 실제 편집기 접근성 트리의 제목/문단/`blog_img_1.png`와 운영 DB 결과를 근거로 기능 완료를 판정했습니다. 픽셀 캡처까지 성공했다고 표시하지 않습니다. 운영 회원 화면/기존 로컬 검수 캡처는 보존했습니다.
- Edge 폴더 선택창은 본창과 다른 프로세스로 열렸습니다. 이름·프로세스·컨트롤 클래스·manifest를 확인한 뒤 열린 창의 Edit/Button만 Windows 기본 메시지로 처리해 실제 설치를 확인했습니다. 권한/ACL/프로필/Edge 재시작 없음. [진단](../../docs/EDGE_FOCUS_DIAGNOSIS_20261020.md).
- 임시 로컬 검수 HTML과 단기 연결 코드 파일은 검수 후 제거합니다. 숨김 브라우저/비밀번호 대리 입력/회원 권한 우회 없음. **유료 AI 0회, 최종 발행 0회**.
- Supabase 보안 점검의 기존 다른 표/함수/Auth INFO/WARN은 별도 기록만 했습니다. 이번 버킷/정책 관련 새 지적 없음, 무관한 운영 설정 미수정. [경고 종류/공식 링크](evidence/blc01-private-photos/security-advisors.json).

## 다음 첫 단계

BLC-01을 완료로 닫고 **BLC-02 사진 입력 UI 플랜**부터 제시합니다. 최대 6장·대표 선택·순서·캡션·삭제/취소와 AI 생성 장수 분리, 정적 ID/미리보기 분리, 업로드 중 취소/만료/재조회 설계를 검수 조건에 넣습니다. BLC-03 사진 글쓰기/BLC-04 편집·저장·검수 연결과 기존 도구 중단은 미실행입니다. 새 개발은 ACTIVE_WORK 재확인 후 순차 진행하며 같은 날 재배포 비용 규칙을 지킵니다.

개발=소유권/30일/실행 격리, 디자인=모델 선택 설명·사진 안내 기반, 신규 시스템=기존 원칙 구현으로 완전 신규 아님. 안정성=실제 Storage/회원 API/운영 확장 준비 통과, 현재 적용성=기존 에이전트 직접 적용, 편의=본인 사진 보호·주소 갱신으로 인한 누락/재검수 혼란 방지 기반. 공용 레퍼런스 정식 등록은 지원 범위/장기 검증 후 검토합니다.

https://naver-blog-agent.buylife.xyz
