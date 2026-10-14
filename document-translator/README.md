# AI 문서번역 자동화 — v1.03

2026-10-14. 주인님이 운영 연결·배포·실제 검수 전체 범위를 승인했습니다. DB·환경변수·Cron·요금제·VIP·도메인·첫 배포 완료, 실제 회원 SSO 확인입니다. v1.02 공급사 스키마 수정은 운영 배포 완료입니다. v1.03은 이중 이스케이프된 번역문 줄바꿈을 정규화하며 코드의 리터럴 이스케이프는 보존합니다. 자동 검사10개·프로덕션 빌드·운영 HTTP 검사10개 통과, v1.03 프로덕션 배포 및 카탈로그 버전 동기화 완료입니다. 실제 회원 화면의 전체 흐름 검수는 Chrome 로그인 창 준비 대기입니다. 현재 증거와 남은 일은 [운영 검수 기록](docs/RELEASE_CHECKS.md)을 확인합니다.

- 프로그램명: **AI 문서번역 자동화**, 코드 **v1.03**.
- 폴더·slug·예정 배포 프로젝트: `document-translator`.
- 제품 목표: 문서·텍스트를 번역하고 원문과 비교하며 문맥·전문 용어·문체를 검수하는 작업 공간.
- 원본: [번역의 정석](https://aistudio.google.com/apps/9596827a-a428-415c-aaae-8547cbe137ea?fullscreenApplet=true&showAssistant=true&showPreview=true).
- [원본 정밀 분석](docs/REFERENCE_ANALYSIS.md): 소스19개, 실행 HTML·JS, 실제 화면·DOCX 관찰.
- [개발 플랜](docs/DEVELOPMENT_PLAN.md): 범위, 화면, API·데이터 설계, 단계별 완료 기준.
- [CLI 인수인계](docs/CLI_HANDOFF.md): 확인한 사실, 미검증 항목, 재개 절차.

회원은 본인 AIMaster 계정으로 로그인하고 본인 Gemini 키만 사용합니다. 별도 회원가입·공용 API 키·Meta OAuth 앱은 만들지 않습니다. 원본의 코드·브랜드·문구를 복제하지 않고 기능 구조를 참고해 새로 구현합니다.

## 실행·검수

```powershell
npm ci
npm run dev
npm test
npm run typecheck
npm run build
```

`predev/prebuild`가 PDF.js 정적 자산과 문서 가져오기 작업자를 생성합니다. 생성 파일·비밀 설정·시험 산출물은 Git에서 제외합니다. 운영 연결값이 없으면 작업 화면은 `/setup`, API는503으로 닫힙니다. 실제 보이는 Chrome 모의 검사 명령은 `npm run test:browser`입니다. 시험 전용 진입점은 tests 안에만 있으며 운영 Next.js 라우트가 아닙니다. 환경변수 없는 프로덕션 빌드를4389포트에서 실행하면 `npm run test:runtime`으로 차단을 검사할 수 있습니다.

TXT·텍스트 PDF·Word 가져오기,10개 언어 번역, 문단별 수정·수정본 재검수·역번역·용어집·TXT/MD/서식 DOCX 다운로드·JSON 백업·선택 저장 보관함을 구현했습니다. 파일5MiB·PDF50페이지·원문20,000 Unicode 문자, 번역 최대4,000자씩10요청입니다. 파일 선택만으로 AI를 호출하지 않습니다.

자동 검사10개·기존 Chrome 모의 화면14개·실제 Next 설정 실패 시 접근 차단8개 경계 검사를 통과했습니다. 실제 번역 품질·운영 회원 검수와 구분합니다. [구현 기록](docs/IMPLEMENTATION_STATUS.md), [운영 변경과 승인 범위](docs/OPERATING_CHANGES.md)를 확인해주세요.

운영 주소: `https://document-translator.buylife.xyz`. 운영 등록 및 출시 SQL은 supabase/에 보관했습니다. FREE 배지를 넣지 않고 기존 일반 이상+사용기간/결제 구독·VIP 자동 부여 정책을 따릅니다. 스캔 PDF·HWP·PPTX·XLSX·완전한 원본 배치 재현은 후속 범위입니다.
