# 부분 통합 0단계 인수인계 — 신규 원고 준비 모드

> **최신 후속(2026-10-20)**: BLC-00은 Claude `7320615a`의 [운영 실검수](BLC00_LIVE_CHECK_20261020.md)를 Codex가 인수해 **완료** 처리했습니다. 아래 운영 미검수 문장은 당시 시도 이력입니다. 병합 담당은 주인님 지정으로 Codex. 다음 BLC-01 비공개 사진 기반을 로컬 구현·검증했고 운영 미적용 상태는 [최신 인수인계](IMPROVEMENT_HANDOFF_20261020_BLC01_PRIVATE_PHOTOS.md)를 봅니다.

> **후속 작업목록**: [블로그 기능 확장·부분 통합 BLC-00~15](../../docs/BLOG_CONSOLIDATION_TASKS.md). 2026-10-20 주인님이 순차 구현과 새 발견 상시 보고/인수인계를 요청해 등록했습니다. 현재 첫 항목은 이 문서의 운영 검수이며, 실제 기능 이관/중단은 미실행입니다.

작성: Codex(윈도우), 2026-10-20. 대상: AIMaster 운영, DB ref `esgxyikcnnvmlhygjkth`.

## 방향 승인과 이번 범위

주인님이 블로그 7개 비교 제안의 **부분 통합·독립 유지·순차 진행**을 승인했습니다. [실행 계획](PLAN_20261020_BLOG_CONSOLIDATION_STAGE0.md)에 순서와 조건을 남겼습니다. 이번은 사진 이관 전 안전장치 단계이며 사진 기능·다른 프로그램의 실제 통합/중단은 아직 하지 않았습니다.

## 코드에 반영한 것

- `src/lib/naverPublishing.ts`: `newNaverDraftSummary(blogId)`로 새로운 원고의 진행 방식을 `prepare`로 명시합니다.
- `src/app/api/generate/route.ts`: 생성 직후 서버에 저장할 때 준비 모드와 실제 AI 검수 지문을 함께 보존합니다.
- `src/lib/postSaveHandler.ts`: 생성 후 저장 실패를 복구하는 최초 POST에도 준비 모드를 저장합니다. 기존 원고 POST/PUT은 이전 설정을 그대로 유지합니다.
- 기존 `readNaverExecutionMode`의 옛 원고 처리와 회원의 명시적 publish 선택은 바꾸지 않았습니다. 기존 원고의 자동 발행은 여전히 가능하므로 BC-01 전체를 해결했다고 해석하지 않습니다.
- `/guide`에 새 원고 기본값·기존 설정 유지·회원의 변경 방법 안내 한 문단을 추가했습니다. **이 안내는 미커밋/미배포**입니다.

## 공동 작업 사고와 실제 반영 상태

작업 중 Claude Code가 폴더 전체를 스테이징하면서 위 런타임 3개 파일을 자신의 `9e3bb9ea`에 포함했습니다. Claude 기록 `d8f3ec1c`에 따르면 배포 `naver-blog-agent-z1v26l3j2` Ready, 코드/DB/확장 v2.00으로 운영 반영됐습니다. Codex가 배포하거나 DB를 수정한 것이 아닙니다.

Codex는 해당 커밋의 세 파일과 현재 소스가 같은 것을 `git show`/`git diff HEAD`로 확인했습니다. 새 원고만 prepare로 초기화하고 기존 설정은 보존하는 목적이 일치해 **되돌리지 않고 보존**했습니다. 이 사고를 이유로 다른 CLI의 본문 정리/근거 대조 개선도 되돌리지 않았습니다. 이후 소스 변경을 확대하지 않았습니다.

이번 세션의 `.git`은 읽기 전용입니다. 따라서 남은 테스트·문서·guide 변경의 커밋/푸시는 미실행입니다. 이번 코드 3개를 새 코드처럼 다시 커밋하거나 배포하지 않습니다. 안내 문구만으로 같은 날 다시 빌드/배포하지 말고 다음 배포 때 포함합니다. 그때 최신 버전을 확인하고 v2.01 이상으로 확장 manifest/ZIP/DB까지 맞춥니다.

## 실제 검수

| 항목 | 결과 | 한계 |
|---|---|---|
| 신규 원고 API·최초 저장 복구·재시도·기존 설정 보존 | 신규 6개 포함 관련 검사 82개 통과 | 메모리 DB·가짜 AI. 운영 데이터/유료 호출 없음 |
| 홈판형·원문 근거·랭킹 | 15개 통과 | 기존 다른 CLI 개선 회귀 검사. 네트워크 수집 시험 아님 |
| 기존 발행 설정 검사 / 확장 payload 검사 | 두 스크립트 모두 통과 | 실제 네이버 편집기/확장 실행 아님 |
| 타입 검사 | `tsc --noEmit --incremental false` 통과 | 실제 회원 검수 대체 아님 |
| 로컬 프로덕션 빌드 | `next build` 통과 | 배포하지 않아 archive 재생성/버전 상승은 하지 않음 |
| Edge 실제 로컬 서버 | /guide→로그인, 비로그인 /api/generate·/api/posts 각 401 | 일반 회원 로그인 없음. 안내 문구·설정 선택의 실세션 검수 미완료 |
| Edge 운영 접속 | `ERR_NETWORK_ACCESS_DENIED` | 현재 환경의 네트워크 제한. 사이트 장애라고 판정하지 않음 |

합계: **Node 등록 검사 97개 통과 + 독립 회귀 스크립트 2개 통과**. 실행 증거 [verification.json](evidence/consolidation-stage0/verification.json), [browser.json](evidence/consolidation-stage0/browser.json), [로그인 화면](evidence/consolidation-stage0/local-login.png). Edge는 보이는 전용 프로필로 열었고 창을 유지했습니다. 실제 회원 계정·키/비밀번호·쿠키를 가져오거나 위조하지 않았습니다.

시험 비용: 무료 로컬/모의 응답 / 유료 AI 0회 / 이미지 생성·실제 발행 0회 / 운영 데이터 쓰기·삭제 0회(Codex). 기존 일반 회원의 정보를 다른 회원과 공유하지 않았습니다.

재현 명령(이 폴더 기준):

```powershell
node --test scripts/test-new-draft-mode.cjs scripts/test-post-save.cjs scripts/test-post-review.cjs scripts/test-queue-confirmation.cjs
node --test scripts/test-homefeed-schedule-links.cjs scripts/test-naver-ranking.cjs
node scripts/test-naver-publishing.cjs
node scripts/test-extension-bridge.cjs
node node_modules/typescript/bin/tsc --noEmit --incremental false
node node_modules/next/dist/bin/next build
```

## 남은 것 / 다음 첫 단계

1. 최상위 지침·ACTIVE_WORK·루트 최신 HANDOFF를 확인합니다. 새로 시작하는 CLI는 현재 소스와 커밋을 먼저 비교합니다.
2. 네트워크가 가능한 환경에서 일반 회원 `buylifemall@naver.com`의 실제 로그인으로 **신규 원고 준비 기본값 / 기존 원고 저장 모드 보존 / 설정 변경**을 검수합니다. 비밀번호는 주인님이 직접 입력합니다. 가짜 회원 우회·실제 발행은 하지 않습니다.
3. 미커밋 파일은 이 단계의 계획/새 테스트/README·개선 원장/인수인계/guide 한 문단과 공통 문서의 우리 항목뿐입니다. 다른 CLI 캐시/미커밋/스테이징을 포함하지 않습니다. 커밋 직전 목록과 diff를 다시 확인합니다.
4. 운영 검수를 마친 뒤 **사진 후기 이관**의 세부 플랜을 제시합니다. 올인원 사진 최대 6장·대표/순서/캡션·회원 경험을 보존하되 안전하지 않은 입력기·로컬 키 저장·AI 추정 통계는 복사하지 않습니다.
5. 사진 저장 선행 과제: 에이전트 `/api/upload-image`도 기존 공유 버킷의 공개 URL을 반환합니다. 새 사진 기능에 그대로 재사용하지 않습니다. 비공개 저장·회원 소유자 검사·최초 생성일 기준 30일 정리·서명 갱신·대기열/확장 다운로드 호환을 한 설계로 검토합니다. 공용 버킷 전체를 일괄 비공개로 바꾸거나 새 DB를 만들지 않습니다.
6. BLOG·올인원·작업실의 기능 이관 검수가 끝날 때까지 기존 도구·이용권·데이터·도메인은 유지합니다. 아직 중단한 프로그램은 없습니다.

[네이버 블로그 에이전트](https://naver-blog-agent.buylife.xyz)

## 운영 확인 재개 시도 — 2026-10-20 Codex

주인님이 「새 원고 준비 기본값 → 기존 자동 발행 유지 → 회원 변경/저장」을 1번부터 확인하도록 다시 요청했습니다. 최신 ACTIVE_WORK/루트 HANDOFF와 이 문서를 확인하고 코드 수정 없이 실검수를 재개했습니다.

- `computer-use`의 현재 Orca 가이드를 읽고 기존 Edge를 확인했습니다. `orca computer list-apps --json`은 성공했고 msedge 실행 중인 상태를 반환했습니다.
- 그러나 `capabilities`와 `list-windows --app msedge`는 실행 정보 파일 `C:\Users\Administrator\AppData\Roaming\orca\orca-runtime.json`을 읽지 못해 `runtime_unavailable`, Windows `CreateFile` 접근 거부(`0x5`)로 실패했습니다. 현재 앱이 실행 중이라는 관측도 있어 앱 미실행으로 단정하거나 재시작하지 않았습니다.
- 운영 신규 원고 생성·기존 설정 열기·설정 변경/저장은 **모두 미실행/미확인**입니다. 최종 발행·유료 AI·운영 DB 쓰기/삭제·로그인 비밀번호 입력은 0회입니다. 이번은 사이트 결함 판정이 아닙니다.
- 이전 로컬 97개/타입/빌드 성공 기록은 그대로이며, 그것으로 이번 운영 검수를 완료 처리하지 않습니다. 앱 코드/버전/배포는 변경하지 않았습니다.
- 다음 첫 단계: 운영 네트워크와 실제 Edge 제어가 가능한 CLI 세션에서 일반 회원으로 위 세 항목을 확인합니다. 접속/제어 가능 여부를 먼저 확인하고, 로그인 화면이라면 주인님이 직접 로그인합니다. 기존 회원 원고의 모드는 먼저 읽어 기록하고 변경 시험은 시험용 신규 초안에서만 수행합니다. 발행 전송/최종 발행은 하지 않습니다.
- [이번 재개 시도 증거](evidence/consolidation-stage0/live-recheck-attempt.json). `.git` 읽기 전용으로 이번 문서/증거 커밋·푸시도 미실행입니다. 사진 기능 이관은 운영 검수 뒤 순서로 남습니다.

### 주인님 Edge 실행 확인 후 재시도 (같은 날 14:49 KST)

- 「다시 해봐 엣지 떠있어」 요청에 `orca computer list-windows --app msedge --json`을 다시 실행했습니다. 같은 `runtime_unavailable`·`CreateFile 0x5`로 실패했습니다. CLI 도움말만 읽어 확인했고 권한/설정/앱 실행 상태를 변경하지 않았습니다.
- 창 실행 여부와 별도로 현재 Codex 세션이 Orca 실행 정보에 접근하지 못합니다. 이 세션은 추가 권한 승인도 사용할 수 없으므로, 앱 재시작이나 비밀번호 입력을 요청하는 대신 실행 권한이 허용된 세션에서 이어받아야 합니다. 세 운영 검수 상태는 미확인, 실제 발행/운영 데이터 변경 0으로 유지합니다.

## 순차 작업목록 등록과 추가 발견 — 2026-10-20

- 작업을 작은 기능으로 나눠 BLC-00~15를 등록했습니다. 승인된 방향과 실제 구현/운영 완료를 구분하고, 작업마다 대상 프로그램 문서/공통 원장에 결과와 다음 단계를 남깁니다. 한 항목 사이클을 마친 뒤 다음으로 진행합니다.
- BLC-INS-01(사진 이관 설계, 미구현): 올인원 `src/lib/blog/pipeline.ts` 사진 입력은 최대 6장, 에이전트 `src/app/api/generate/route.ts`의 AI `imageCount`는 1~5입니다. 사진 수와 생성 수를 따로 다뤄야 6번째 원본·사진/캡션 연결이 사라지지 않습니다. 규격/검증(개발), 입력 설정 분리(디자인), 기존 기능 보완(신규 시스템 아님)으로 기록했습니다.
- 새 좋은 기능/개선점은 발견 근거·필요한 이유·우선순위·세 채택 기준·처리 상태와 함께 즉시 기록하고 사용자에게도 알립니다. 기존 아이디어 중복은 같은 ID 이력으로 보완합니다. 미구현 제안을 완료로 바꾸지 않습니다.
- 이번 등록은 문서 작업만이며 운영 코드/DB/키/버전/배포를 바꾸지 않았습니다. 문서 링크·표 구조를 점검하고 현재 환경에서 커밋/푸시는 미실행입니다. 다음 첫 단계는 계속 BLC-00 운영 실검수입니다.
