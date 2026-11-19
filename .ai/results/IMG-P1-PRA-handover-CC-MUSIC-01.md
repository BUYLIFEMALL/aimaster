# IMG-P1 PR-A 엔진 격리 — 음악 담당 중간 작업 인계 (CC-MUSIC-01 → ECOM)

- 상태: **중단·인계** — Master msg_edef1e834612·msg_bc241410bf7f(주인님 지시 msg_f7a7a5d44dd0)로 구현 담당이 ECOM으로 바뀜. 이전 배정 msg_a2d69f45e9f5 철회
- 엔진 소스는 **커밋하지 않고 작업 파일 그대로** 둠(되돌리기·이어 고치기 없음). 공유 인덱스·`desktop/build/icon.png` 건드리지 않음
- 기준: 다섯 파일의 마지막 커밋 `bc946e04c`(엔진 0.8.5), 작업 시점 HEAD `4a337ead6`
- 변경분 패치: `.ai/results/IMG-P1-PRA-handover-CC-MUSIC-01.patch` — `git diff`(5파일, +326/−33, 644줄) · sha256 `9c153d772541497983e0913ccc945fa7f4e8b806f2bd72f3201ed7c42e55d7f6`
- 작업 중 표 예약 `b64f48b94`(이 세션 줄) — 점유 이전은 Master가 함

## 바꾼 것 (작업 파일 = 패치)

| 파일 | 내용 |
|---|---|
| `engine/src/queue.mjs` | `failClosed` 옵션(파일이 있는데 못 읽으면 원본 보존·쓰기 금지·목록/넣기/실행 거절, `broken`), `QueueConflictError`(409)·`QueueClosedError`(503), `add`에 `site`·`scope`·`clientRequestId`·`digest` 기록과 같은 범위·같은 접수 ID 중복 처리(확인→push 사이 await 없음), `list(keep)` 거르기, `running()`·`headQueuedAt()`, 두 대기열 차례 함수 `sharedTurn(job, other)`. 옵션을 안 주면 기존 동작 그대로 |
| `engine/src/imageArt.mjs` | `IMAGE_SIZES`(1024×1024·1280×720·720×1280)·`isImageSize`·`imageRenderSize(task)`(없거나 목록 밖이면 1024×1024), 실행 인자 `-W/-H`와 기록 문구가 그 값을 씀, `paths().resultsScoped`(`results-scoped`), `resultFile(id, scoped)`, `job.site`가 있으면 결과를 `results-scoped`에·`sweep(dir)` |
| `engine/src/security.mjs` | `SCOPED_SITE_ORIGINS = []`(운영 등록 없음), `isAllowedOrigin(origin, extra)`·`corsHeaders(origin, extra)`, `createScopedTokens({file})` — `paired-scoped.json`(형식 `{version:1,tokens:[{token,origin,scope,createdAt}]}`), 깨지면 닫힘, `scopeOf(token, origin)`, `issue({origin, prevToken})`(같은 출처의 유효한 이전 토큰이면 범위 승계·이전 토큰 폐기를 tmp→rename 한 번에, 동시 발급은 한 줄로 직렬화) |
| `engine/src/gateway.mjs` | `ctx.scoped {origins, tokens, queue}`가 있을 때만 새 범위 갈래: 출처 판정에 extra, `/pair`에서 새 범위 출처는 코드 확인 뒤 `scoped.tokens.issue`(prevToken 승계, 닫힘이면 503), 토큰 판정(새 범위 출처는 새 범위 토큰만·기존 출처는 기존 토큰만), 그림 전용 주소 제한, `handleScopedArt`(자기 범위 작업만, `results-scoped`), `handleScopedQueue`(목록 자기 범위만·접수 `art`만·`clientRequestId` `/^[A-Za-z0-9-]{8,64}$/` 필수·크기 허용 목록·시드 0~2147483647·내용 요약 sha256(variantId, prompt, width, height, seed)·남의 작업 cancel/DELETE는 404·닫힘이면 503), 그림 모델 지우기 409 판단에 새 대기열 포함 |
| `engine/src/main.mjs` | `paired-scoped.json` 토큰 저장소 불러오기, `queue-scoped.json` 두 번째 대기열(`failClosed`, 그림 실행만), 두 대기열 `canRun`에 `sharedTurn`·`onFinished`에서 상대 `pump()`, `allJobs()`로 「작업 중」 합산(isWorking·activeJobs·모델 옮기기 409·그림 폴더 busy·YuE2 뒤 ACE 재개 판단), 엔진 준비 뒤 두 대기열 `pump`, 손상 시 엔진 기록 안내, 연결 문 ctx에 `scoped` |

## 확인한 것 (자체)

- `node --check` 5파일 통과
- 엔진 기존 시험 **131/131 통과**(`npm test` = `node --test tests/`, 변경 후)
- 대기열·그림 기존 시험 35/35(중간 확인)

## 아직 안 한 것 (인계받는 쪽 몫)

1. **V1~V10 새 시험 파일 미작성** — 계획: `tests/scopedImage.test.mjs`에서 `createGateway(ctx)`를 포트 0으로 띄우고 node `http`로 `Origin` 머리글을 붙여 요청(가짜 `run`·가짜 `imageArt{resultFile,state}`, 시험용 `scoped.origins` 주입). 기존 시험에는 연결 문을 띄우는 시험이 없음
   - 참고 값: 곡 번호는 UUID 형식(`library.mjs` `ID`), 접수 종류 `art`, 그림 설명은 영어 3단어 이상(`cleanArtPrompt`)
   - V2(0.8.5 내리기)는 `git show bc946e04c:free-music-studio/engine/src/queue.mjs`로 옛 코드를 임시 파일에 꺼내 기존 `queue.json`을 읽혀 확인하는 방식 제안
2. 실제 엔진 실행 확인 없음(`main.mjs`는 시작 부작용이 커서 단위 시험 안 됨) — 엔진을 한 번 켜서 0.8.5 자료 폴더로 기동·기존 두 사이트 연결 회귀 확인 필요(Tester)
3. 버전(`main.mjs VERSION`·`desktop/package.json`) 올리지 않음, 운영 출처 등록 없음(PR-B)

## 설계 메모·주의

- 출처 목록이 비어 있으면(`SCOPED_SITE_ORIGINS`) 새 범위 갈래는 절대 열리지 않음 → 운영 영향은 `queue-scoped.json`·`paired-scoped.json` 빈 파일/미생성 정도
  - `scopedQueue.load()`는 파일이 없으면 빈 대기열로 저장하므로 첫 기동 때 `queue-scoped.json`이 생김. 원치 않으면 「작업이 없으면 저장 생략」으로 조정 가능
- 기존 `queue.json`·`paired.json` 동작·형식은 바뀌지 않음. 단 V1 「바이트 동일」은 「새 범위 동작만 했을 때」로 한정(기존 사이트가 새로 짝지으면 원래 바뀌는 파일)
- 차례 규칙은 「상대가 만드는 중이 아님 + 내 맨 앞 작업이 상대 맨 앞 대기보다 먼저(같거나 이른) 접수」. 기존 대기열 맨 앞 ACE 작업이 엔진 준비를 기다리면 그보다 늦게 들어온 새 범위 그림도 기다림(한 대기열이던 때와 같은 접수 순 의미)
- 기존 이미지 스튜디오 출처(`IMAGE_SITE`)의 기존 빈틈(목록 전체·cancel/DELETE 종류 확인 없음)은 「기존 두 사이트 지금 동작 그대로」 조건 때문에 이번 범위에서 고치지 않음(MUS 검토 msg_0962d9630d0e 2번)
- 새 범위 `clientRequestId`는 필수로 둠(없으면 400) — 제안서에는 「없으면 매번 새 작업」이 기존 사이트 기준이라, 새 사이트는 필수가 안전하다고 판단
