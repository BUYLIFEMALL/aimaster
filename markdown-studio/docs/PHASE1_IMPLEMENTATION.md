# 1단계 구현·검수 기록

2026-10-13 / `v1.01` 출시 후보. 참고 분석 이후 사용자의 “작업 진행해” 지시에 따라 공통 틀·문서 모델부터 순차 구현했습니다.

## 구현 범위와 구조

| 영역 | 구현 | 제한·후속 |
|---|---|---|
| 인증 | Supabase 서버 사용자 확인, 공통 프로그램 권한, no-store, 조건부 SSO 쿠키 | 실제 일반 회원 SSO는 환경변수 등록 후 확인 |
| 공통 틀 | 대시보드, 준비/편집/내보내기/보관함 4단계, 설정·매뉴얼, 회원 메뉴 바로 아래 8px 계정 영역 | 원본의 독립 브랜딩/다크 UI를 복사하지 않음 |
| 문서 모델 | 회원별 IndexedDB, UUID, parentId, revision, 100만 자 제한, 중복·순환 방지 | 서버 문서 테이블/암호화/다른 기기 동기화 없음 |
| 저장 | 750ms 자동 저장, Ctrl+S·수동 저장, 원자적 변경, 최신 30개 이력 | 충돌은 자동 덮어쓰기 대신 원고 보존·최신 불러오기 |
| 탐색 | 생성/이름 변경/이동/폴더 드래그/문자열 검색/휴지통·배치 복원 | 폴더 접힘 상태 영속화·고급 검색 후속 |
| 편집 | textarea, 정제 GFM 미리보기, 표 좌우 정렬·완료 표시, 분할 너비·탐색기 표시 기억 | 20개 도구/CodeMirror/찾기·바꾸기 후속 |
| 내려받기 | 입력 중 원문까지 `.md` 저장 | HTML/PDF/DOCX/JSON/ZIP 후속 |
| Drive | 아직 연결하지 않음, 화면에도 완료로 표시하지 않음 | 회원 본인 OAuth·읽기/쓰기/충돌 후속 |

저장·설정 작업 전 서버 세션/권한을 확인하며 재집중·60초 간격에도 확인합니다. 세션 계정 불일치/권한 상실 시 이전 작업 화면을 비웁니다. 네트워크/저장 실패에는 원고와 다운로드를 유지합니다. 설정 변경은 순서대로 처리하여 빠르게 너비를 바꿔도 이전 응답이 최종 값을 덮어쓰지 않게 했습니다.

미리보기는 `Marked` 후 `DOMPurify`로 처리합니다. script/이벤트 속성/폼·iframe/style를 제거하되 원문 저장은 변경하지 않습니다. GFM 체크리스트는 안전한 정적 표시로 만들고 표 align을 CSS에서 유지합니다.

## 검사 증거

| 검사 | 결과 | 실제 확인한 범위 |
|---|---|---|
| `npm run build` | 통과 | Next 프로덕션 빌드·TypeScript, 인증 라우트 동적 처리 |
| `npm test` | 14/14 | 권한 판정 우선순위/루트 사본 일치, 회원 DB 분리, 이름·검색, 폴더 순환, 동시 수정, 복원, 이력 30개, 용량 오류 원자성 |
| `npm run test:browser` | 11/11 | 실제 Chrome·실제 컴포넌트, 생성·저장·새로고침·GFM·XSS, 다운로드 원문 일치, 두 탭 충돌, 503 보존·재시도, 390px 모바일·계정 간격 8px, 이력·휴지통·계정 전환·401 |
| `npm run test:runtime` | 9/9 | 실제 Next 프로덕션 서버에서 설정 미등록 시 6개 페이지 307, 세션 503/no-store, 타 출처 로그아웃 403, Chrome 준비 화면·편집 화면 없음 |
| `npm audit` | 취약점 0 | 개발 의존성 포함 현재 고정 버전 전체 |

Chrome UI 검사는 **세션 응답만 격리된 시험값**으로 제공했습니다. 실제 로그인 성공·운영 Supabase 데이터 처리·Google 연동 성공 증거는 아닙니다. 프로덕션 차단 검사는 가짜 세션 없이 실행했습니다. 첫 실행의 준비 화면 제목 선택자가 실제 제목과 달라 시험 대기가 만료되어 선택자를 수정하고 재실행해 통과했습니다.

React 점검: 독립 컴포넌트, 사용자 ID로 Provider 재생성, 안정적인 effect 의존성·정리, 문서 저장 직렬화·트랜잭션, 독립 초기 읽기 병렬화, `useDeferredValue`/정제 결과 메모화, 입력 label과 상태 알림, 비밀 값 server-only를 확인했습니다.

- [화면 검사 JSON](evidence/phase1-browser-results.json)
- [프로덕션 차단 JSON](evidence/phase1-runtime-results.json)
- 스크린샷: 로컬 `test-artifacts/desktop.png`, `mobile.png`, `setup.png` 및 `D:/PDS/markdown-review-20261013/phase1/` 보관. 시험용 문서·시험용 계정 표시이며 사용자 원고/비밀번호가 아닙니다.

## 운영 상태

Vercel 프로젝트 생성·연결 완료, 환경변수 등록/DB 쓰기/카탈로그/프로덕션 배포 미실행. `vercel link`의 자동 OIDC 파일은 삭제했고 비밀 값은 출력·커밋하지 않았습니다. [설정안](PROVISIONING_PLAN.md)을 승인받아 실제 회원 흐름을 확인해야 운영 완료입니다.

버전 선택은 기존 앱의 오래된 의존성을 그대로 복사하지 않고 현재 공식 릴리스와 패키지 취약점 검사 결과를 확인하여 고정했습니다. [Next 16.4.0](https://github.com/vercel/next.js/releases/tag/v16.4.0), [PostCSS 8.5.29](https://github.com/postcss/postcss/releases/tag/8.5.29), [Supabase SSR 설정](https://supabase.com/docs/guides/auth/server-side/creating-a-client).
