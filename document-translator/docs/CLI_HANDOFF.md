# AI 문서번역 자동화 — 재개 인수인계

2026-10-14, Codex. **운영 전체 범위 승인·연결·첫 배포 완료, v1.02 수정 배포 후 실제 UI 검수 진행 단계입니다.** 테이블3개·함수4개·Supabase 연결값3개·pg_cron 활성화/정리 작업1개를 승인 후 적용했습니다. 실제 회원 SSO·Cron 삭제·요금제/VIP·썸네일·도메인 확인입니다. 원래 전체 Zod JSON Schema를 공급사가 거부하는400을 발견해 지원되는 OpenAPI 직렬화로 수정했고 같은 회원 키의 실제 번역 성공·자동9개/빌드 성공입니다. [운영 검수](RELEASE_CHECKS.md), [승인 범위](OPERATING_CHANGES.md)를 먼저 읽으며 승인 질문을 다시 하지 않습니다.

## 먼저 읽을 문서

README.md → AGENTS.md → docs/REFERENCE_ANALYSIS.md → docs/DEVELOPMENT_PLAN.md. 루트 최신 HANDOFF·ERROR_LESSONS·본인 API 규칙·공식 자율 개발 워크플로우·사이드바·도메인/SSO·관리자 정책도 적용합니다.

## 확정된 조사 사실

- 원본 Google AI Studio 앱 ID `9596827a-a428-415c-aaae-8547cbe137ea`, 이름 번역의 정석.
- ZIP 파일19개77,015 bytes 전수 수집, 프리뷰 HTML·실행 JS1,684,474 bytes 확보·대조. 파일 해시는 evidence/reference/source-manifest.json.
- UI/소스:10개 언어, TXT/PDF/DOCX 입력, Gemini 번역+3종 분석, 용어 강조·목록 저장, 역번역, TXT/DOCX 출력.
- 실제 확인: 원문 입력·수동 번역문 입력·대상 언어 변경·원문 수정 시 번역 지움·DOCX 다운로드 XML의 서식 유실·375px 패널 압축·새로고침 초기화.
- 공급사 생성 호출0회. 실제 번역 품질·역번역·파일 구조화 성공은 검증하지 않았음. 수동 샘플을 AI 생성 결과로 보고하지 않음.
- Code UI의 파일 클릭이 변화를 만들지 않을 때, 공개 DOM의 해당 버튼 click 이벤트로 탐색·Export를 수행한 뒤 새 snapshot/Monaco 모델로 확인. 원본 코드를 편집하거나 Remix하지 않음.

## 적용한 결정과 남은 운영 작업

- 이름 AI 문서번역 자동화, slug/폴더 document-translator, 코드 v1.01을 적용했습니다. 예정 주소 document-translator.buylife.xyz, Vercel 프로젝트는 아직 만들지 않았습니다.
- 자체 CSS·AI kind4종 공통 라우트·번역 최대10구간·메타데이터24시간 중복 방지로 초기 플랜을 구체화했습니다. 실제 AI 결과를 서버 임시 캐시에 저장하지 않습니다.
- SQL2개와 비공개 카탈로그/요금제 등록 SQL을 준비했습니다. 적용 승인과 출시 전 운영 검수를 확인한 후 진행합니다.

## 보관한 증거와 재수집

- 공개 Git: 분석·계획·인수인계, 원본 파일 해시, 실제 화면3종과 원본에서 내려받은 직접 작성 샘플 DOCX·관찰 JSON.
- 로컬 원본: scratch/translation-reference-20261014. Aside 세션 C:/Users/Administrator/.aside/u/0/sessions/2026-10-14_4L1cEcbvmpcMdTJn/artifacts의 reference.zip·preview.html·runtime-main.js. 타 개발자의 소스 전체는 공개 Git에 싣지 않음.
- 다른 PC: 앱 링크 열기 → Continue to the app → Code → Export → Download as .zip file. 라이선스·공유 상태를 확인한 뒤 분석용으로만 읽으며 원본 브랜드/코드/프롬프트를 재배포하지 않음.

## 다음 작업

1. 운영 전체 범위 승인은 완료입니다. RELEASE_CHECKS.md의 실제 검수 진행 상태를 확인하고 이어갑니다.
2. git status/log/fetch를 확인합니다. 다른 CLI는 portrait-photo 등에서 작업 중이었고, codex-statusbar·root HANDOFF/ERROR_LESSONS에도 별도 변경이 있습니다. 스테이징을 덮어쓰거나 전체 git add를 하지 않습니다.
3. 승인 후 프로젝트 전용 .env.local과 Vercel에 기존 Supabase URL/공개키/서비스키 하나만 안전하게 복사합니다. Gemini 키를 환경변수나 클라이언트에 넣지 않습니다. migration2개 적용 후 테이블/RLS/RPC/Cron 실제 상태를 확인합니다.
4. 등록 SQL의 is_active=false 상태로 프로그램/요금제3종을 준비하고 표준 썸네일을 생성·검수합니다. 기존 VIP 등급 자동 부여 패턴과 도메인/SSO를 연결하고 실제 회원 검수 후 공개합니다. 기존 프로그램/회원 키를 변경하지 않습니다.
5. 실제 buylifemall@naver.com Chrome 세션으로 본인 키·소량 Gemini·저장/복원·권한을 검사합니다. 키 입력/비밀번호 입력을 대신 하지 않습니다. 모의 결과와 실제 생성 결과를 구분하고 버전/커밋/푸시/배포/라이브/남은 일 보고까지 이어갑니다.

`npm ci` → `npm test` → `npm run typecheck` → `npm run build`. `npm run test:browser`는 보이는 Chrome의 시험 fixture입니다. 운영 환경이 없는 빌드를4389포트에서 실행한 경우 `npm run test:runtime`으로 실패 차단을 검사합니다. 로컬 검수는 자동9개·화면14개·런타임8개 경계 통과입니다. 실제 회원/공급사/DB/Cron 검증은 아직입니다. evidence/implementation의 캡처·보고와 src/lib/version.ts v1.01을 확인합니다.
