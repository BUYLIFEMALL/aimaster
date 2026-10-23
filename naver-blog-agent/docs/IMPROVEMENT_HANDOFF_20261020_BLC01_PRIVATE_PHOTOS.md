# 블로그 병합 BLC-01 — 비공개 사진 기반 인수인계

> **승인 후 최신 적용 결과:** [v2.01 릴리스 인수인계](IMPROVEMENT_HANDOFF_20261020_BLC01_RELEASE.md). 승인된 Storage/정책 적용, 익명 업로드 차단, 실제 시험 회원 사진 API 9개 통과. 릴리스 검사/ZIP 준비 완료, 배포·확장 실제 준비 검수는 진행 중입니다. 아래 승인 대기·v2.00·Storage 쓰기 0 기록은 이전 시점 이력입니다.

> **최신 재시험 결과:** Edge에서 매뉴얼 메뉴 클릭 → `/guide` 이동, FAQ 펼치기를 후속 화면/트리로 검증했습니다. 접근성 클릭/이동은 가능하며 키보드만 `window_not_focused`가 남았습니다. 현재 관리자 세션으로 일반 회원 검수는 아닙니다. [재시험 상세](IMPROVEMENT_HANDOFF_20261020_BLC01_RESUME.md). 운영 버킷/정책 추가 승인·배포·사진/확장 검수는 대기입니다.

> **2026-10-20 새 세션 재개:** [재개 검수·남은 승인/포커스 확인](IMPROVEMENT_HANDOFF_20261020_BLC01_RESUME.md). 이전 Orca 실행 정보 접근 거부는 재발하지 않았고 Edge 새 탭·주소 설정을 확인했습니다. 키보드 포커스/페이지 이동·회원 검수는 미확인입니다. 사진 소스 9개 해시 일치, 140개 시험·확장 42개·타입 검사 재통과. 운영 저장소/정책 미적용·v2.00 유지.

2026-10-20 Codex(윈도우). **블로그 병합 전체 담당은 Codex(주인님 지정)**. 대상 AIMaster 운영, DB ref **`esgxyikcnnvmlhygjkth`**, Lab 아님.

## 현재 상태

| 항목 | 상태·근거 |
|---|---|
| BLC-00 안전장치 | **운영 완료**. Claude `7320615a`의 [실회원 검수](BLC00_LIVE_CHECK_20261020.md)를 인수. 신규 prepare·기존 19건 보존·설정 변경/원복 통과, 최종 발행 0회 |
| BLC-01 비공개 사진 기반 | **로컬 구현/검수 통과, 운영 적용 미완료**. 저장소/정책 승인·실제 Storage·배포·Edge 회원/확장 검수 필요 |
| 운영 버전 | 기존 **v2.00** 유지. 코드·manifest·ZIP·DB 버전 변경 없음. 새 코드를 배포한 것으로 오해하지 않는다 |
| Git | 새 코드/시험/문서는 미커밋·미푸시. 현재 세션 `.git` 읽기 전용. 다른 CLI 스테이징/파일을 건드리지 않음 |
| 비용·외부 동작 | 이번 BLC-01 실제 Storage/DB 쓰기 0, 유료 AI 호출 0, 실제 블로그 발행 0. 모의/로컬만 수행 |

## 구현한 내용

| 파일 | 변경과 목적 |
|---|---|
| `src/lib/privatePhotos.ts` | 새 버킷 `nba-private-photos`의 비공개 여부 확인, 회원 UUID 경로 검사, JPEG/PNG/WebP 헤더+MIME·4MB, 무작위 신규 파일명·덮어쓰기 금지, 정적 식별자와 임시 URL 분리, 원래 `createdAt`+30일 만료, 최대 6장 주소 확인, 최대 300초 서명 |
| `src/app/api/photos/route.ts` | 인증/이용 권한 확인 후 사진 업로드. 파일 경로·MIME·크기만 반환. 원본 이름은 경로로 쓰지 않음 |
| `src/app/api/photos/resolve/route.ts` | 본인 경로 1~6장을 검증하고 임시 미리보기·원래 등록/만료 시각 반환. `Cache-Control: no-store` |
| `src/app/api/extension/task/route.ts` | 원고 검수 후·queued 선점 전에 사진 소유권/만료/서명 확인. 원고 사본만 변환. 실패하면 queued 유지. 사진 지원·실행 복구를 지원하는 새 확장에만 사진 작업 전달 |
| `src/lib/extensionBridge.ts` | 확장 사진 자산에 선택 필드 `storagePath` 추가. 기존 URL 자산 호환 유지 |
| `src/app/api/extension/photos/route.ts` | 다운로드 직전 갱신. 본인 회원·본인 원고·publishing 상태·동일 연결 토큰/실행 ID·유효한 실행 기한·원고 연결 사진을 전부 확인. 임의 경로 서명/옛 실행 갱신 금지 |
| `extension/background.js` | `supportsPrivatePhotos` 표기. 사진 자산만 다운로드 직전 `/api/extension/photos`로 갱신. 갱신 실패 때 옛 URL로 재시도하지 않음. 기존 이미지 자산 흐름 유지 |
| `src/app/api/cron/cleanup/route.ts` | 새 사진의 30일 정리 연결. 미연결 업로드 포함. 폴더/사진 전체 페이지 수집 후 Storage API로 100개씩 삭제, dry 실행 삭제 0. 새 버킷 장애가 기존 정리까지 막지 않으며 HTTP 503/오류 필드로 실패 표시 |
| `scripts/test-private-photos.cjs` | 실제 모듈·API·확장 다운로드 함수·Cron을 모의 DB/Storage로 검증하는 17개 시험 |
| `scripts/test-post-review.cjs`, `scripts/test-extension-bridge.cjs` | 새 서버 전용 모듈 로딩을 시험 환경에서 허용하는 mock 추가. 기존 테스트/기대값 삭제 없음 |

기존 `/api/upload-image`, 공개 공용 버킷, 다른 프로그램 폴더, API 키/환경변수/회원 권한/결제/실제 DB·Storage 정책은 변경하지 않았다. `storagePath`는 향후 사진 원고의 정적 식별자이며 **임시 URL을 DB 원고나 검수 지문에 저장하면 안 된다.** 조회 결과의 `preview`는 UI 전용이다.

## 검수 증거와 재현

[검수 명령·종료 코드·소스 SHA-256](evidence/blc01-private-photos/checks.json). 모든 명령 종료 코드 0.

| 검수 | 결과 |
|---|---|
| Node 테스트 9개 파일 | **140/140** 통과. 사진 17개 + 저장·검수·실행 복구·대기열·새 원고 준비·본문/랭킹·확장 결과/편집기 안전 회귀 |
| 확장 브라우저 수명주기 모의 | **42개 시나리오** 통과. 실제 Edge 검수가 아니라 모의 chrome API/DOM |
| 확장 브리지 / 발행 설정 | 별도 스크립트 2개 통과 |
| TypeScript | `tsc --noEmit --incremental false`, 오류 0 |
| 로컬 프로덕션 빌드 | Next 16.2.11 성공. `next build` 직접 실행해 릴리스용 ZIP을 다시 만들지 않음 |
| 빌드 실행 후 실제 로컬 HTTP | 사진 업로드/조회·확장 사진/작업·Cron 5경로 모두 무인증 **401**, 사진/확장 응답 `no-store`. [HTTP 증거](evidence/blc01-private-photos/http-unauthenticated.json) |
| 타 회원/위조/만료 | 모의 404/410/409, 공개 버킷/서명 실패 시 작업 선점 0, DB 원고 변경 없음 |
| 페이지·정리 | 모의 사진 1,001개와 회원 폴더 1,001개까지 검증, 6장 순서 보존. 실제 운영 사진 삭제 0 |
| 운영 DB·Storage·로그인 Edge | **미실행**. 아래 승인/세션 제한 확인 필요 |

재현(프로그램 폴더에서):

```powershell
node --test scripts/test-private-photos.cjs scripts/test-new-draft-mode.cjs scripts/test-post-review.cjs scripts/test-post-save.cjs scripts/test-queue-confirmation.cjs scripts/test-homefeed-schedule-links.cjs scripts/test-naver-ranking.cjs scripts/test-extension-results.cjs scripts/test-editor-safety.cjs
node scripts/test-extension-tabs.cjs
node scripts/test-extension-bridge.cjs
node scripts/test-naver-publishing.cjs
node node_modules/typescript/bin/tsc --noEmit --incremental false
node node_modules/next/dist/bin/next build
```

로그는 같은 증거 폴더의 `regression.txt`, `extension-lifecycle.txt`, `extension-bridge.txt`, `publishing.txt`, `typecheck.txt`, `build.txt`. 검수 실행 도구는 Git 제외 `.vercel/verify-blc01.cjs`, `.vercel/verify-blc01-http.cjs`에 있으며 다음 CLI가 이 도구를 못 보더라도 위 명령으로 재현 가능하다.

## 운영 적용 전 승인 대상

**[저장소·권한 변경안](BLC01_STORAGE_CHANGE_PROPOSAL.md)**: 운영 DB에 비공개 버킷 1개와 직접 Storage 접근을 막는 제한 정책 1개 추가. 새 콘텐츠 테이블·회원 권한·키·기존 버킷 변경 없음. 적용 SQL·사전 확인·검수·복구 절차를 문서에 준비했다. **지금은 적용하지 않았다.** 루트 AGENTS의 「환경변수/DB 스키마 변경 사전 승인」을 지키고 이 구체적 변경을 승인받은 뒤 실행한다. 일반적인 ‘병합 진행’ 승인을 스키마 승인으로 확대하지 않는다.

SQL은 문서 안 검토안이며 실제 DB SQL 구문 실행/RLS 보안 점검 증거는 아직 없다. 승인 후 CLI가 생성한 migration 이름을 쓰고 운영 ref를 재확인한다. 기존 버킷 ID/정책이 이미 있으면 덮어쓰지 말고 다른 CLI 변경을 비교한다.

## Edge 제어 문제 — 주인님 문의 후 재확인

`orca computer list-windows --app msedge --json` 2회 모두 **CreateFile 접근 거부 0x5 / runtime_unavailable**. 이 세션이 `C:\Users\Administrator\AppData\Roaming\orca\orca-runtime.json`을 읽지 못한다. 앱 창이 꺼졌다고 단정하지 않는다. [증거](evidence/blc01-private-photos/edge-control.json). 에이전트가 권한 상승·ACL 수정·Orca 재시작을 하지 않았다.

주인님 안내: Orca 설정 검색 **「새 채팅의 권한」→「전체 액세스」**, 같은 폴더에서 **새 Codex 채팅** 시작 후 엣지 제어 재검증. 설치된 Orca 번역/설정 코드에서 이 항목의 설명 **「새 채팅에만 적용됩니다」**를 확인했다. 따라서 현재 대화에서 같은 오류를 반복 시험하거나 엣지/Orca를 계속 재시작하지 않는다. 새 세션에서 제어 성공을 확인하기 전 해결 완료로 표시하지 않는다. Computer Use 설정도 별도이며 아직 비활성이면 활성화 필요. 비밀번호는 주인님 직접 입력.

설치 소스 확인 위치: `C:/Users/Administrator/AppData/Local/Programs/orca/resources/app.asar.unpacked/out/renderer/assets/ko-BXHScqrT.js`, `Settings-BBl01T-p.js`. 프로그램 설정을 에이전트가 수정한 것은 아니다.

## 발견·미작업·다음 첫 단계

- **BLC-INS-02**: 서명 주소 갱신을 원고 변경으로 취급하면 검수/저장 충돌이 생긴다. 정적 ID와 표시 주소 분리를 로컬 구현. 향후 BLC-04 저장 연결 시 저장 객체에서 `url`/`preview` 제거를 강제하고 지문/복구를 재검증한다.
- **BLC-INS-03**: 확장 `loadAsset`은 이미지 입력 순간 다운로드하므로 작업 수신 시 주소 발급만으로 긴 글을 보장할 수 없다. 현재 실행에 한정한 직전 갱신과 구형 확장 차단을 로컬 구현. 실제 Edge 시험은 남음.
- **BLC-INS-04 / P2**: 새 사진 정리는 전 페이지를 읽는다. 회원/사진이 매우 많아져 300초 제한에 가까워지면 서버 측 페이지 작업/진행 위치 설계를 검토한다. 현재 운영량/실행 시간 미측정, 이번에 추측으로 대형 작업 시스템을 만들지 않음.
- BLC-02(6장 업로드 UI·대표·순서·캡션·취소), BLC-03(사진/경험 기반 글쓰기), BLC-04(편집/저장/검수 연결)는 **미구현**. 나머지 BLC-05~15는 [공식 작업표](../../docs/BLOG_CONSOLIDATION_TASKS.md)에 남아 있음. 어느 기존 프로그램도 중단하지 않음.
- 새 사진의 원래 만료 이후에는 앱 조회 차단, 물리 파일 삭제는 다음 일일 Cron. 초 단위 삭제 시각과 일일 스케줄을 혼동하지 않는다. 기존 사진을 새 업로드로 복제해 수명을 연장하지 않는다.
- 공용 기준 모듈로 정식 등록하지 않았다. 운영 검수가 끝난 안정 기능만 레퍼런스 후보로 등록한다.

**다음 첫 단계:** 새 권한의 Codex 세션에서 루트 지침·ACTIVE_WORK·이 문서·Storage 변경안을 읽고 소스 SHA/다른 CLI 변경 확인 → Edge 창 목록 조회로 제어 재시험 → 구체적 저장소/정책 승인 여부 확인 → 승인된 저장소/정책 적용·검증 → 최신 버전 +0.01 및 앱/확장/ZIP/DB 동기화·한 번 배포 → 일반 회원 Edge/확장 **준비까지만** 검수 → BLC-01 운영 완료 기록 후 BLC-02 플랜. 지금 BLC-02로 건너뛰지 않는다.

기존 미커밋 0단계 guide/시험/문서도 함께 검토하며 다른 CLI 코드와 섞어 커밋하지 않는다. 이전 `naver-blog-agent/supabase/.temp/cli-latest`는 기존 CLI 캐시로 이번 파일이 아니다. 현재 로컬 확인 서버는 `http://127.0.0.1:4321`(세션 14474), 새 세션에서는 살아 있는지 확인하고 필요할 때만 다시 실행한다.

사용 스킬: `supabase:supabase`(공식 변경 이력/Storage/보안 문서·설치 SDK 대조), `computer-use`(기존 Orca 제어 경로 재시험, 제한 기록). 외부 스킬이 운영 DB 변경을 승인한 것으로 해석하지 않는다.

프로그램 운영 주소(새 사진 기능은 미배포):

https://naver-blog-agent.buylife.xyz
