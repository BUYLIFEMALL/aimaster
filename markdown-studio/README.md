# 마크다운 문서 자동화

> 2026-10-13 / **v1.01 출시 후보 — 1단계 기본 구현·로컬 검수 완료, 운영 연결 대기**

참고 사이트: https://markdown-studio-mauve.vercel.app/

마크다운 문서를 폴더로 관리하고, 편집·미리보기·문서 변환·본인 Google Drive 저장을 연결하는 프로그램을 계획합니다. `마크다운 문서 자동화`, `markdown-studio`는 작업용 이름이며 공식 명칭·도메인·카탈로그 등록·FREE 여부는 아직 확정하거나 적용하지 않았습니다.

- [원본 기능·로직·옵션 분석](docs/REFERENCE_ANALYSIS.md)
- [개발 순서·설계·완료 기준](docs/DEVELOPMENT_PLAN.md)
- [브라우저 실험 결과](docs/evidence/review-results.json)
- [다음 에이전트 안내](AGENTS.md)

## 구현된 기능

- AIMaster 회원 로그인·프로그램 이용 권한 판정, 도메인별 SSO 쿠키. 설정이 없으면 작업 화면 대신 준비 안내, API는 JSON 오류를 반환합니다.
- 흰색 작업 화면과 번호형 공통 사이드바. 계정·로그아웃은 마지막 메뉴 바로 아래에 있습니다.
- 새 문서·폴더, 회의록/사용 설명서 템플릿, 이름 변경·이동·검색, 폴더 끌어 놓기, 휴지통·복원.
- 회원별 IndexedDB, 자동 저장·수동 저장·Ctrl+S, 최신 30개 수정 이력. 동시 수정 충돌을 막고 실패한 원고를 내려받을 수 있습니다.
- Markdown 원문과 정제된 GFM 미리보기, 표 정렬·체크리스트, 탐색기 접기·편집 너비 설정, 모바일 편집/미리보기 탭, 원문 `.md` 다운로드.

문서는 **이 브라우저·회원별 기기 저장소**에 보관합니다. 서버 문서 보관, 다른 기기 동기화, Google Drive 연결은 아직 제공하지 않습니다. 같은 운영체제의 브라우저 프로필을 사용하는 사람으로부터 파일을 암호화해 보호하는 구조는 아닙니다.

## 실행과 검수

```powershell
npm ci
npm run build
npm test
npm run test:browser
npm run test:runtime
```

`test:browser`는 독립 Chrome에서 실제 작업 컴포넌트를 검사하되 회원 세션 응답만 격리된 시험값으로 제공합니다. `test:runtime`은 실제 Next 프로덕션 빌드에서 **플랫폼 설정 미등록 시 차단**을 확인합니다. 두 검사는 실제 일반 회원 SSO 성공을 뜻하지 않습니다.

빌드 정상, 자동 검사 14/14, 화면 검사 11/11, 프로덕션 빌드 차단 검사 9/9, `npm audit` 취약점 0건. [검수 기록](docs/PHASE1_IMPLEMENTATION.md), [화면 결과](docs/evidence/phase1-browser-results.json), [차단 검사](docs/evidence/phase1-runtime-results.json).

## 운영 준비·남은 단계

Vercel `buylife/markdown-studio` 프로젝트 생성·연결까지 했습니다. **환경변수 등록·프로덕션 배포·카탈로그 등록·도메인 연결은 아직 하지 않았습니다.** [운영 설정안](docs/PROVISIONING_PLAN.md)의 AIMaster 인증 환경변수 3개는 루트 규칙에 따른 사전 승인이 필요합니다. DB 스키마는 1단계에서 변경하지 않습니다.

다음 순서는 2단계 편집 도구 20종·목록 3종·기호 32종·CodeMirror, 3단계 가져오기/백업/HTML·PDF·DOCX·ZIP, 4단계 본인 Drive, 5단계 일반 회원 운영 검수·등록·썸네일입니다. Suno의 보류된 검수는 별도 작업으로 유지합니다.
