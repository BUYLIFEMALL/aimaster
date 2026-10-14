# AI 문서번역 자동화 — 재개 인수인계

2026-10-14, Codex. **현재 분석·개발 플랜 완료, 구현 대기.** 주인님의 요청은 참고 앱 정밀 분석·프로그램명 추천·개발 플랜 작성입니다. 실제 앱 구현·새 운영 스키마·환경변수·프로덕션 배포를 진행한 기록은 없습니다.

## 먼저 읽을 문서

README.md → AGENTS.md → docs/REFERENCE_ANALYSIS.md → docs/DEVELOPMENT_PLAN.md. 루트 최신 HANDOFF·ERROR_LESSONS·본인 API 규칙·공식 자율 개발 워크플로우·사이드바·도메인/SSO·관리자 정책도 적용합니다.

## 확정된 조사 사실

- 원본 Google AI Studio 앱 ID `9596827a-a428-415c-aaae-8547cbe137ea`, 이름 번역의 정석.
- ZIP 파일19개77,015 bytes 전수 수집, 프리뷰 HTML·실행 JS1,684,474 bytes 확보·대조. 파일 해시는 evidence/reference/source-manifest.json.
- UI/소스:10개 언어, TXT/PDF/DOCX 입력, Gemini 번역+3종 분석, 용어 강조·목록 저장, 역번역, TXT/DOCX 출력.
- 실제 확인: 원문 입력·수동 번역문 입력·대상 언어 변경·원문 수정 시 번역 지움·DOCX 다운로드 XML의 서식 유실·375px 패널 압축·새로고침 초기화.
- 공급사 생성 호출0회. 실제 번역 품질·역번역·파일 구조화 성공은 검증하지 않았음. 수동 샘플을 AI 생성 결과로 보고하지 않음.
- Code UI의 파일 클릭이 변화를 만들지 않을 때, 공개 DOM의 해당 버튼 click 이벤트로 탐색·Export를 수행한 뒤 새 snapshot/Monaco 모델로 확인. 원본 코드를 편집하거나 Remix하지 않음.

## 아직 제안인 결정

- 이름: AI 문서번역 자동화(1순위), AI 번역검수 자동화, AI 다국어 번역 스튜디오.
- 후보 slug/폴더/Vercel 프로젝트: document-translator. 이름 확정 시 필요하면 이 계획 폴더를 조정하되 다른 프로그램과 충돌하지 않도록 확인.
- 후보 주소 document-translator.buylife.xyz, 최초 v1.01. 선점·등록·배포 미확인.
- 범위/파일 제한/기록 정책/DB3종/모델/가격·배지는 DEVELOPMENT_PLAN의 제안. 무료·권한 정책·운영 스키마/환경변수 실행은 별도 확정 필요.

## 보관한 증거와 재수집

- 공개 Git: 분석·계획·인수인계, 원본 파일 해시, 실제 화면3종과 원본에서 내려받은 직접 작성 샘플 DOCX·관찰 JSON.
- 로컬 원본: scratch/translation-reference-20261014. Aside 세션 C:/Users/Administrator/.aside/u/0/sessions/2026-10-14_4L1cEcbvmpcMdTJn/artifacts의 reference.zip·preview.html·runtime-main.js. 타 개발자의 소스 전체는 공개 Git에 싣지 않음.
- 다른 PC: 앱 링크 열기 → Continue to the app → Code → Export → Download as .zip file. 라이선스·공유 상태를 확인한 뒤 분석용으로만 읽으며 원본 브랜드/코드/프롬프트를 재배포하지 않음.

## 다음 작업

1. 주인님의 이름 확정·구현 지시를 확인합니다. 현재 계획만으로 구현 시작 승인을 추정하지 않습니다.
2. git status/log/fetch를 확인합니다. 다른 CLI는 portrait-photo 등에서 작업 중이었고, codex-statusbar·root HANDOFF/ERROR_LESSONS에도 별도 변경이 있습니다. 스테이징을 덮어쓰거나 전체 git add를 하지 않습니다.
3. P01부터 진행하고 적용할 스키마·환경변수 작업을 먼저 구체화합니다. 기존 규칙상 승인 필요한 작업은 그 범위를 설명하고 확인합니다.
4. 실제 회원 본인 키·권한·서버 호출을 설계합니다. 원본 API_KEY 브라우저 치환은 복사하지 않습니다.
5. 단계별 검사·화면 검수·운영 확인의 증거를 구분하고 완료 보고 절차까지 이어갑니다.

현재 build/test 명령을 실행할 package.json은 없습니다. 문서 검수와 원본 관찰은 앱 구현 테스트와 구분합니다.
