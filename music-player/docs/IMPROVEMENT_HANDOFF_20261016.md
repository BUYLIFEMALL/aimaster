# music-player 한글 태그 복구·안정성 개선 인수인계 — v1.05

2026-10-16 Codex(Windows). Antigravity v1.04 디자인 완료 뒤 [개발 플랜](IMPROVEMENT_PLAN_20261016.md)을 먼저 제시하고 주인님 "진행해줘" 지시로 작업했습니다.

## 다음 CLI가 먼저 볼 것

루트 AGENTS/ACTIVE_WORK/HANDOFF → 이 문서 → [IMPROVEMENTS](IMPROVEMENTS.md). 관리자 `buylifemall@gmail.com`, 일반 시험 회원 `buylifemall@naver.com`. 화면 검수는 보이는 Microsoft Edge 전용입니다. 음악은 서버로 전송하지 않습니다.

## 바뀐 동작과 코드

- `src/lib/player/id3.ts`: 인코딩 번호 0의 구형 한국어 태그를 자동 감지. 엄격한 UTF-8 확인 후 유효한 한국어 후보·바이트 비율을 확인하고, 아니면 기존 서유럽 문자로 읽습니다. UTF-8/UTF-16 명시 태그는 유지합니다. ID3v2.2/2.3/2.4를 검사했습니다.
- `Player.tsx`: **곡 정보 인코딩**(자동/한국어 CP949/서유럽 Latin-1)과 **선택 N곡 정보 복구/전체 곡 정보 복구** 추가. 이미 저장된 원본 Blob에서 제목·가수·앨범만 다시 읽으므로 파일을 삭제하거나 다시 추가할 필요가 없습니다. 같은 선택은 새 파일 추가에도 적용됩니다.
- `storage.ts`: 기존 곡을 읽고 텍스트 필드만 갱신하는 트랜잭션. 음원·커버·곡 ID·추가 순서·길이·재생 위치·EQ 유지, 삭제된 곡을 되살리지 않음. 저장 실패 시 기존 화면/저장 정보를 유지하고 실패를 안내합니다. 처리 중 파일 추가·정보 복구·삭제 작업은 겹치지 않게 막습니다.
- `/guide`: 구형 MP3 복구 절차와 서유럽 문자 재시도 안내. 다크 테마를 유지하고 복구 도구의 작은 화면 배치를 확인했습니다.
- 앱 버전 **v1.05**, npm 메타데이터 **1.5.0**. 전용 클라우드 테이블·스키마·환경변수·API 키 변경 없음. 새로운 의존성 없음.

## 사용 방법

1. 페이지를 새로고침합니다.
2. 한글이 깨진 곡을 선택합니다. 선택하지 않으면 전체 목록을 확인합니다.
3. [곡 정보 인코딩]에서 **한국어 (CP949)**를 고르고 [선택 N곡 정보 복구]를 누릅니다.
4. 영문 곡의 악센트 문자가 잘못 읽혔다면 **서유럽 (Latin-1)**로 다시 복구합니다. 태그 없는 곡은 기존 파일명 표시를 유지합니다.

자동 감지는 바이트만으로 원래 인코딩을 완벽히 구분할 수 없습니다. 예를 들어 유효한 한국어 바이트와 우연히 같은 서유럽 문자 쌍이 존재합니다. 이 때문에 수동 선택을 유지하며 "모든 파일 100% 자동 복구"라고 보고하지 않습니다. 파일 자체의 깨진 태그를 재작성하는 기능은 아닙니다.

## 검수와 증거

| 검사 | 결과 |
|---|---|
| v1.04 오류 재현 → 수정 후 비교 | `³» ´«¿¡ º¸¿©` → `내 눈에 보여` |
| 자동 검사 | 20/20 |
| TypeScript + Next.js 빌드 | 통과(v1.05) |
| 실제 Player/저장소/오디오 Edge 검사 | 21/21 |
| 로컬 실제 Next.js + 일반 회원 인증/화면 | 11/11 |
| 운영 배포·코드/DB 버전·실제 회원 검사 | READY · 코드/DB v1.05 · 11/11 |

[회귀 재현](evidence/id3-regression.json), [로컬 Player 검사](evidence/browser-player.json), [실제 회원 로컬 검사](evidence/runtime-local.json), [검수 요약](evidence/verification.json).

합성 ID3 메타데이터와 합성 WAV를 사용했습니다. 실제 상용 음원을 업로드하거나 배포하지 않았습니다. 복구 전후 파일·커버의 SHA-256, ID·순서·길이·재생 상태 유지, 쓰기 실패 주입, 새로고침 복원, 회원별 분리, CP949 확장 한글, 모바일 넘침을 확인했습니다. 유료 AI/API 호출 0회입니다.

### 재현 명령

```powershell
cd music-player
npm test
node --import tsx tests/reproduce-id3.mjs
npm run build
npm run test:browser
# 실제 로그인 회원 검사: 로컬 Next 서버를 실행한 뒤
$env:MP_TEST_BASE='http://localhost:3021'
node tests/runtime.mjs
# 운영 검수는 MP_TEST_BASE를 https://music-player.buylife.xyz 로 설정
```

`tests/browser-entry.tsx`는 격리된 컴포넌트 검사이며 운영 인증 검수와 구분합니다. `tests/runtime.mjs`는 실제 일반 회원 세션과 실제 Next 로그인/이용 권한을 사용합니다. 비밀번호를 입력하거나 운영 코드에 인증 우회를 넣지 않습니다. 세션·키는 결과/로그에 남기지 않습니다.

## 함정·남은 개선

- 이 PC Node 24.20의 ICU `TextDecoder('euc-kr')`는 일부 CP949 확장 바이트를 Edge와 다르게 읽습니다. `똠방각하` 확장 사례는 실제 Edge에서 확인했고, Node 검사 결과만으로 지원 여부를 단정하지 않습니다. [Encoding 표준](https://encoding.spec.whatwg.org/#euc-kr-decoder), [Node 이슈](https://github.com/nodejs/node/issues/61041).
- 기존 Chrome 검사 기록은 과거 이력입니다. 이번 검사 도구는 `msedge`를 명시하고 다른 브라우저로 폴백하지 않습니다.
- `IMPROVEMENTS.md`의 8가지 신규 기능(드래그 정렬, 미디어 세션, 다중 목록, 크로스페이드, 파형, 가사, 저장소 정리, JSON 백업)은 후속 제안입니다. 이번에 구현했다고 오해하지 않습니다.
- 최초 CLI_HANDOFF의 v1.01·일반 회원 미검수 문구는 과거 기록이었습니다. 현재 진입 정보와 검수 결과를 v1.05로 갱신합니다.

## 릴리스 상태

소스 커밋 **4d4cb3de** 푸시·프로덕션 배포 완료. 배포 **dpl_FyVWQtyWAhHCEP9VNqKpesisYjBD** READY, [운영 플레이어](https://music-player.buylife.xyz/player)와 코드/DB 버전 **v1.05** 확인. 일반 회원 운영 Edge **11/11**, 페이지 오류·파일 전송 요청 0. 기존 환경변수와 실제 키는 유지했습니다.

[운영 배포 증거](evidence/deployment.json) · [운영 회원 검사](evidence/runtime-live.json) · [데스크톱 화면](evidence/live-desktop.png) · [375px 화면](evidence/live-mobile.png). 초기 앱 구현 4d4cb3de 뒤 문서/검수 증거만 추가한 최종 커밋은 Git 이력에서 이 문서의 최신 변경을 확인합니다.

이번 승인 범위인 오류 수정·기존 기능 안정성 검수의 남은 작업은 없습니다. 기능 제안 8건은 별도 후속 계획이며 먼저 개발 플랜을 제시한 뒤 진행합니다. 메인 문서 푸시 후에는 저장소의 기존 설치 파일 포함 운영 배포를 확인하는 `scripts/finalize-supabase-compat-main.cjs`로 홈·설치 파일·확장 ZIP 200을 확인합니다. 확인 현장 기록은 Git 제외 `.vercel/final-main-promotion.json`입니다.
