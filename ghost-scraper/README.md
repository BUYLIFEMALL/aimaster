# Website Scraper — v1.12

공개 웹페이지의 구조·글목록·표·링크·이미지를 모으고 회원 본인 Gemini 키로 목록을 정리하는 AIMaster 서브프로그램입니다.

- 서비스: https://website-scraper.buylife.xyz
- 폴더: ghost-scraper / Vercel 프로젝트·DB slug: website-scraper
- Next.js 16.2.11 · React 19 · Tailwind v4 · Cheerio
- 디자인: 스마트 매트릭스 스타일. 모든 페이지는 같은 차콜 토큰을 사용합니다.

## 작업 전 필독

루트 AGENTS.md·docs/ACTIVE_WORK.md·docs/HANDOFF.md, 이 폴더 AGENTS.md, [디자인 인수인계](docs/DESIGN_HANDOFF.md), [개선 인수인계](docs/IMPROVEMENT_HANDOFF_20261016.md), [개선 원장](docs/IMPROVEMENTS.md)을 먼저 읽습니다. 같은 폴더를 다른 CLI가 작업 중이면 시작하지 않습니다.

## 실행·검수

의존성 설치: npm ci. 개발: npm run dev. 배포 전 타입·빌드: npm run build.

공유 DB 변수는 루트 데이터베이스 연동 지침을 따릅니다. 로컬 검수 실행기 npm run build:verify / node tests/local.mjs start는 기존 루트 .env.local의 DB 연결을 자식 프로세스에만 주입합니다. 변수 파일·운영 키를 변경하지 않습니다. 기본 검수 서버 포트는 3034입니다.

- npm test: 네트워크를 격리한 SSRF/DNS/리디렉트 회귀 검사 26개.
- npm run test:runtime: 보이는 Microsoft Edge, 실제 일반 시험 회원, 1440px/375px. 기존 루트 DB 운영 자격으로 시험 회원 magic link 세션을 발급하되 메일을 보내지 않고 비밀번호를 입력하지 않습니다. 서비스 권한은 실제 시험 회원으로 판정합니다.
- 운영 화면 검사: PowerShell에서 $env:WS_TEST_BASE='https://website-scraper.buylife.xyz' 설정 후 npm run test:runtime. 종료 후 환경변수를 제거합니다.
- 유료 AI는 호출하지 않고 키 저장 POST는 모의 처리합니다. 캡처·검사 결과는 docs/evidence에 기록하며 세션/키 값을 남기지 않습니다.

## 보안·권한

서버 API는 checkProgramAccessApi, 화면은 requireProgramAccess를 거칩니다. safeFetch의 공개 주소 검사·DNS 연결 고정·리디렉트 재검사를 재사용합니다. 외부 미리보기는 CSP sandbox allow-scripts와 iframe sandbox로 격리하며 allow-same-origin을 추가하지 않습니다. 이미지 프록시는 SVG 활성 콘텐츠도 격리합니다. 운영자 AI 키나 타 회원 계정으로 폴백하지 않습니다.

실제 DB 배지는 new이며 고정 FREE 표시는 개선 #16으로 남아 있습니다. 등급·이용기간은 DB의 실제 판정을 따릅니다.

## 최신 운영 결과

v1.12 production READY·DB 버전 일치. 소스 bd9a2388, 보안 26개 및 로컬/운영 실제 회원 Edge 각 15개 묶음 통과. [배포 증거](docs/evidence/deployment-v112.json)와 [검수·남은 일](docs/DESIGN_HANDOFF.md)을 다음 CLI가 먼저 확인합니다.
