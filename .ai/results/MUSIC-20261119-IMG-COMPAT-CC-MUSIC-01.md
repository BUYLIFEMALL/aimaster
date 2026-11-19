# MUSIC-20261119-IMG-COMPAT — IMG-P1 PR-A 엔진 변경의 음악 기존 기능 읽기 호환 검토 (CC-MUSIC-01)

- 상태: **ready_review** (판정은 Master)
- 범위: 고정 `bc946e04c`(엔진 0.8.5) → `2131089b7` — 커밋 `f247a4c83`(PR-A 격리, 이 세션 인계분을 ECOM이 커밋) + `2131089b7`(검토 P1/P2 보완). 파일 `engine/src/{queue,gateway,security,imageArt,main}.mjs`, `engine/tests/scopedImage.test.mjs`
- 하지 않은 것: 제품 수정·GPU·실생성·빌드·배포. 점유는 ECOM(Master msg_74befa8a2aa1), `desktop/build/icon.png` 보존
- 참고: `f247a4c83`의 소스 지문은 이 세션 인계 패치와 다름(ECOM이 커밋 전에 조정) — 검토는 커밋된 내용 기준
- 검토자 주의: `f247a4c83`의 대부분은 이 세션이 쓴 코드라 그 부분은 **작성자 자기 검토**에 가깝다. 독립 판정은 `2131089b7` 보완분과 실행 결과 중심으로 본다

## 실행 확인 (이 세션 독립 실행)

- 작업 파일 = `2131089b7`(`git diff --quiet 2131089b7 -- src tests`)
- `npm test`(= `node --test tests/`) **146/146 통과** — 기존 131 + 새 `scopedImage.test.mjs` 15
- `node --test tests/scopedImage.test.mjs` 15/15

## 음악 기존 흐름 5가지 대조

| # | 흐름 | 판정 | 근거 |
|---|---|---|---|
| 1 | 앨범 그림(무료음악)·이미지 자동화 「내 PC 그림」 — 크기·결과 위치 | **유지** | 기존 접수(`handleQueue` art)는 `task {prompt, variantId}`만 넣어 `width/height`가 없음 → `imageRenderSize` 1024×1024, 기록 문구도 「1024×1024」. `job.site`가 없어 결과는 기존 `results/`·`resultFile(id)` 기본값 그대로, `sweep()` 기본 폴더 그대로 |
| 2 | 기존 `queue.json`·`paired.json` | **유지** | 기존 대기열은 `failClosed` 없이 생성 → 읽기 실패·깨짐은 예전처럼 빈 대기열(`validJob` 검사는 `failClosed`에만). 기존 접수는 `site`·`scope`·`clientRequestId`를 넘기지 않아 항목 모양 그대로. 짝짓기는 새 범위 출처가 아닐 때 기존 코드 경로(`ctx.tokens`·`saveTokens`) 그대로. 운영 `SCOPED_SITE_ORIGINS = []`라 출처·CORS 판정도 예전과 같음 |
| 3 | 그림·YuE2 등 단독 실행 뒤 ACE-Step 다시 켜기 순서 | **유지(새 범위 비었을 때 동일)** | `next`가 「기존 대기열 배열 첫 대기」 → 「두 대기열 대기 중 접수 시각이 가장 이른 것」으로 바뀜. 기존 대기열만 있으면 배열 순서 = 접수 순서라 결과 같음(예외: PC 시계가 뒤로 바뀐 경우만 이론상 차이) |
| 4 | 모델 폴더 옮기기·저장 공간 정리의 「작업 중」 409 | **동작 소폭 변경(안전 방향)** | `queue.running()`이 「상태가 running」 → 「실행 함수가 실제로 끝나 정리를 마칠 때까지(`executing`)」로 넓어짐(`2131089b7`). 영향: 만드는 중인 곡을 **취소한 직후**, 음악 엔진이 실제로 멈출 때까지 `moveModels`가 409 「곡을 만드는 중입니다」, 저장 공간 보고 `working: true`. 예전에는 취소 즉시 허용되어 쓰는 중인 파일을 옮길 수 있었음 → 막는 쪽이 맞다고 판단. 화면에 몇 초 409가 더 보일 수 있음(회원 안내 문구 변경은 불필요 판단) |
| 5 | 기존 대기열 차례(FIFO)·ACE 준비 대기·YuE2 일시정지 재개 | **유지(새 범위 비었을 때 동일)** | 기존 `canRun` 앞에 `sharedTurn(job, scopedQueue)` — 새 대기열이 비면 `running()=false`·`headQueuedAt()=Infinity`라 항상 통과, 그다음 기존 판정(ACE 준비·`yue2Pausing` 재개) 그대로. `onFinished`·`onQueuedCancel`에서 새 대기열 `pump()`를 부르지만 비어 있으면 아무 일 없음 |

## 그 밖에 본 것

- 기동 안전: 새 범위 대기열 읽기는 `.catch`로 감싸 실패해도 기존 엔진이 켜짐(`2131089b7`), 토큰 저장소 `load`는 내부에서 예외를 잡음
- 첫 기동 때 `queue-scoped.json`이 빈 대기열로 생성됨(작업 없음). 0.8.5로 내려도 이 파일을 읽지 않아 영향 없음
- 기존 이미지 자동화 출처(`IMAGE_SITE`)의 예전 빈틈(목록 전체·cancel/DELETE 종류 미확인)은 「기존 두 사이트 그대로」 조건대로 바뀌지 않음(별건, MUS 검토 msg_0962d9630d0e)
- 그림 모델 지우기 409가 새 대기열 그림 작업도 봄 — 새 범위가 비면 예전과 같음

## 미검증 (이 검토의 한계)

- 실제 엔진 기동(`main.mjs`는 단위 시험 없음) — 0.8.5 자료 폴더로 켜서 무료음악 곡 만들기·앨범 그림 1장·이미지 자동화 1장 회귀는 Tester(Admin PC) 몫
- 4번의 실제 체감(취소 뒤 409가 몇 초 보이는지)은 실기 미확인
- 새 범위 출처가 실제로 열렸을 때 두 대기열이 섞여 도는 실기(PR-B 뒤)

## 결론

음악 기존 5개 흐름 중 4개는 새 범위가 비어 있는 운영 상태에서 **동작이 같고**, 1개(취소 직후 「작업 중」 판정)는 **더 안전한 쪽으로 소폭 바뀜**. 회귀로 볼 결함은 찾지 못함.
