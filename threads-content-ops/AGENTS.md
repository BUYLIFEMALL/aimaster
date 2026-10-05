# Threads 콘텐츠 운영 자동화 — 작업 인수인계

이 폴더는 AIMaster 전체 사이트 안에 등록되는 새 서브프로젝트 `threads-content-ops`의 전용 작업 공간이다. Windows 데스크톱 앱은 이 서브프로젝트의 클라이언트일 뿐이며, 회원·이용권한·결제·프로그램 카탈로그·API 키는 반드시 루트 AIMaster 공용 체계를 사용한다. 루트 `AGENTS.md`의 플랫폼 정책을 먼저 따르고, 이 문서는 이 프로그램의 추가 규칙을 정한다.

## 경계

- 이 프로그램에서 기존 `threads/`, `threads-comment-reply/`, `threads-affiliate-poster/`, `threads-easy-planner/` 파일을 수정하지 않는다.
- 재사용이 필요한 경우 기존 코드를 가져오지 말고, 해당 프로그램의 공개된 설계 원칙을 이 폴더 안에서 독립 구현한다.
- 원본 사본은 `desktop/` 안에만 둔다. 원본의 중첩 `.git` 디렉터리는 포함하지 않는다.

## AIMaster 필수 정책

- 프로그램 등록 시 slug는 `threads-content-ops`, 첫 버전은 `v1.01`이다. 코드 버전과 `programs.version`을 같은 작업에서 맞춘다.
- 로그인과 이용 권한은 AIMaster 공용 Supabase에서만 판정한다. 데스크톱 앱 자체 회원가입은 만들지 않는다.
- 회원별 API 키와 Threads 앱 자격증명만 사용한다. 운영자 키·공용 Meta 앱·환경변수 폴백은 금지한다.
- 서버 API는 개인 액세스 토큰 검증과 프로그램 이용 권한 검증을 모두 거친다. API route에는 `dynamic = 'force-dynamic'`, `fetchCache = 'force-no-store'`를 선언한다.
- 원격 게시·예약 자동화는 사용자가 명시적으로 켠 경우에만 실행하며, 재시작 시 기본 중지한다.
- 성과 데이터는 공식 API가 반환한 값만 표시한다. 추정치나 예시 수치를 실데이터처럼 표시하지 않는다.

## 소스 전환 규칙

`desktop/` 원본은 Electron, local SQLite, Chrome 확장, Native Messaging 호스트를 포함한다. AIMaster 편입 전 다음을 완료한다.

1. Codex CLI 로그인 기반 생성기를 회원별 서버 API 호출 방식으로 전환한다.
2. 제품명·아이콘·작성자 표기·테스트 문구를 AIMaster 브랜드로 교체한다.
3. 로컬 자격증명 저장은 OS 보안 저장소를 유지하되, AIMaster 개인 액세스 토큰과 사용자 데이터의 경계를 문서화한다.
4. Chrome 확장과 제휴·수집 기능은 별도 단계에서 권한·약관·제휴 고지·보안 심사를 거친 뒤에만 활성화한다.
5. 출시 전 원저작물의 이용·변경·재배포 권한을 확인하고 기록한다.

## 검증

- 의존성을 설치한 뒤 `desktop/`에서 `npm.cmd run check`, `npm.cmd test`, `npm.cmd run make` 순으로 검증한다.
- 2026-10-05 원본 기준선에서는 타입 검사·린트는 통과했지만 테스트 파일이 없고, `npm audit` 경고가 37건(critical 1건 포함)이다. 이를 해결하거나 위험을 명시적으로 평가하기 전에는 설치 파일을 배포하지 않는다.
- 실제 Threads 게시 테스트는 전용 테스트 계정에서만 하고, 게시 전 사용자 확인 절차를 둔다.
- 완료 작업마다 이 문서, `README.md`, 루트 `docs/HANDOFF.md`를 함께 갱신한다.
