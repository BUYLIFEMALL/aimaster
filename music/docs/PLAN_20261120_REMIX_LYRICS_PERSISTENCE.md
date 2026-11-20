# 리믹스 가사 보존 설계 (REMIX-LYRICS-PERSISTENCE-DESIGN A1)

- 작성: 2026-11-20 Claud(Music) `CC-MUSIC-01` (`claude-win-20261024-music`)
- 배정: Codex Master `msg_f975d4e660ca`, 주인님 「진행해」(2026-11-20)
- 범위: **설계 문서만.** 새 유료 호출·실데이터 재조회·SQL 적용·제품 코드 변경 없음. 아래 SQL은 제안이며 파일로 만들지 않았다.
- 계기: `lyric-video-studio/docs/IMPROVEMENTS.md` 2026-11-20 항목 — 운영에서 「보컬 추가」 리믹스를 가사 영상으로 넘기자 Suno 시간 가사가 빈 값이고 가사 글도 0자였다(증거 `lyric-video-studio/docs/evidence/remix-timed-lyrics-live-20261120.png`).

## 0. 통일 계약 (A3, 2026-11-20 Master `msg_503e2239aa81` — **이 절이 아래 본문·부록보다 우선**)

아래 1~10절과 부록 A1·A2는 작업 순서대로 쌓인 기록이다. 서로 다른 말이 있으면 이 절을 따른다(어긋났던 줄은 그 자리에 「→ 0절」로 표시).

### 0-1. 관측 범위(정정)
- 우리 저장소에는 Suno 응답의 **가사 칸이 있는지 없는지 관측한 기록이 없다.** `music/scripts/fix-stuck-track.mjs`는 `record-info` `sunoData[]`에서 `id`·`audioUrl`·`streamAudioUrl`·`imageUrl`·`duration`만 **읽었을** 뿐이라, 다른 칸(가사 포함)의 있고 없음을 보여 주지 않는다. 앞선 「가사 칸이 없는 모양만 관측됨」 표현은 틀렸다.
- 가사 칸은 문서(콜백 `data.data[].prompt`)에만 있다. `record-info`의 가사 칸은 **미관측**.

### 0-2. 가사 상태와 판정
| 상태 | 정하는 조건 |
|---|---|
| `provided_unverified` | 보컬 종류 + 문서 칸 `prompt`가 비어 있지 않음 + 보낸 지시문과 다름(부록 A1 2절 정규화). **실측 전 Suno 가사의 유일한 「있음」 상태** |
| `provided` | 실측 1회로 `record-info` 가사 칸 이름이 확정된 뒤에만 쓰는 상태(그 전 구현은 이 값을 쓰지 않음) |
| `empty` | 보컬 종류 + `prompt`가 빈 값·공백 또는 보낸 지시문과 **정규화 뒤 전문이 같음**(접두·일부·가사 혼합은 `provided_unverified`, PHASE1-PURE A2) |
| `not_applicable` | `add_instrumental`·연주곡 커버 |
| `unknown` | `prompt` 칸 자체가 없음, 추측 칸(`lyrics`·`lyric` 등)만 있음, 이 변경 전 기존 행, 보충 출처를 검증할 수 없음 |
- 추측 칸의 문자열은 저장하지 않는다(진단 표시만). `prompt` 외 이름을 가사로 쓰지 않는다.
- 정규화(명시): NFC → **허용 구간 표시만** 제거(고정 목록 `SECTION_TAGS`: intro·verse·pre-chorus·chorus·post-chorus·bridge·hook·refrain·interlude·break·instrumental·outro·end, 대소문자 무시·번호 1~2자리 허용) → 문장부호·기호 제거(그 밖 대괄호는 기호만 빠지고 **안의 글은 남음**) → 모든 공백을 하나로 → 앞뒤 공백 제거 → 소문자. 목록 밖 표시([Verse 1: 여자]·[Rap]·[Chorus x2])는 애매하므로 지우지 않아 미검증 후보로 남는다(PHASE1-PURE A3).
- 5,000 상한은 **유니코드 코드 포인트** 기준(서로게이트 쌍을 가르지 않음).
- 같은 오디오 번호가 여러 번 오면 **자르기 전 원문**과 상태가 모두 같을 때만 하나로, 다르면(5,000 뒤에서만 달라도) `unknown` + 충돌.

### 0-3. 생성 동기화(웹훅·수동 공통)
1. **같은 작업·단계**: 처리 시작 때 읽은 `task_id`(= 처리할 taskId)와 `extend_hop_count`(= hop)를 끝까지 들고 다닌다.
2. **잠금 소유권**: 잠금은 지금의 고정 표시(`__syncing__`) 대신 **처리마다 새 토큰**(예: `__syncing__:<무작위>`)으로 잡는다. 잠금 조건 = `id` + `task_id = taskId` + `extend_hop_count = hop` + `status = generating` + (잠금 비어 있음 또는 5분 지남). 5분 지난 잠금을 다른 처리가 **교체**하면, 옛 소유자의 이후 모든 쓰기는 토큰이 달라 **0행**이 된다.
3. **원자적 반영**: 변주 행 넣기와 리믹스 상태 바꾸기(완료·연장 전환·잠금 해제)를 **한 DB 함수(트랜잭션)**로 한다. 조건 = 위 잠금 조건 + 잠금 토큰 일치. 중간 상태(변주는 있는데 리믹스가 `generating`인 채 잠금 없음, 또는 `completed`인데 변주 0개)를 남기지 않는다. 같은 리믹스에 같은 `suno_audio_id`가 이미 있으면 그 항목은 넣지 않는다.
4. **외부 연장 중복 방지**: 연장 요청(유료 외부 호출)을 보내기 **전에** 같은 조건으로 「연장 예약」(예: `extend_hop_count = hop + 1`, `task_id = null`, 상태 `generating`, 예약 시각 기록)을 먼저 원자적으로 걸고, 예약에 성공한 처리만 요청을 보낸다. 요청 성공 → 새 `task_id`를 예약과 같은 조건으로 기록. 
5. **결과 불확실 시 재호출 금지**: 연장 요청이 시간 초과·연결 끊김처럼 **보냈는지 모르는** 상태로 끝나면 자동으로 다시 보내지 않는다(최상위 「결과가 불확실하면 자동 재실행 금지」). 그때까지 저장한 변주로 리믹스를 `completed` 처리하고 「연장 결과 불확실」을 기록한다. ~~분명히 거절된 요청(4xx 응답)만~~ → 0-7: **분명한 거절 근거**가 있을 때만 「연장 실패 → 현재 결과로 완료」, 4xx라도 근거가 없으면 불확실. 재시도는 회원이 직접 누를 때만.
6. **실패 표시**도 같은 조건·토큰. 늦게 온 옛 작업의 실패는 0행.

### 0-4. 보충(생성과 별개)
- 대상: **완료된(`completed`) 리믹스의 본인 변주**이고 상태가 `unknown`인 것만. 회원이 가사 영상에서 그 변주를 고를 때 1회, 회원 본인 Suno 키. 관리자 일괄 보충 없음.
- **검증된 출처**가 있을 때만 조회:
  - 변주에 `suno_task_id`가 있으면 그 작업 번호(저장 때 기록한 출처).
  - `suno_task_id`가 없는 옛 행은 리믹스의 `extend_hop_count = 0`일 때만 `remix.task_id`를 출처로 인정(연장이 없었으니 작업 번호가 바뀐 적 없음).
  - **`suno_task_id`가 없고 `extend_hop_count > 0`인 옛 연장 행은 조회하지 않고 `unknown` 유지** — 응답에 같은 오디오 번호가 있더라도 출처를 검증할 수 없으므로 채우지 않는다.
- 조회 결과에서 **같은 `suno_audio_id`** 항목의 `prompt`만, **그 한 행만** 바꾼다(조건: `id` + `user_id` + `lyrics_status = unknown`). 이미 다른 상태면 0행.
- 조회 안 함(키 없음·출처 미검증·14일 지남 추정·이번 접속에서 이미 시도) → 호출 0, 변경 0행.

### 0-7. 연장 예약 상태 전이 (A4, Master `msg_9de01ca0ee9b`)
리믹스 행에 `extend_gen`(세대, 정수)·`extend_owner`(예약한 처리의 토큰)·`extend_expires_at`(만료, 예: 예약 + 10분)·`extend_state`(`none`·`reserved`·`sent`·`uncertain`·`failed`)를 둔다.

| 지금 상태 | 사건 | 다음 상태 | 쓰기 조건 |
|---|---|---|---|
| `generating`(T0, hop 0, 잠금 tok) | 저장 + 연장 필요 | `reserved`: hop 1, `task_id` null, gen+1, owner tok, 만료 시각, 잠금 해제 | 변주 넣기와 **한 함수**, 잠금 조건(0-3) |
| `reserved` | 전송 전 종료 | 그대로 → 만료 뒤 정리: `completed` + `uncertain` | 정리 조건: `extend_state=reserved and now ≥ 만료 and gen = 읽은 gen` |
| `reserved` | 전송 중 시간 초과·연결 끊김 | `completed` + `uncertain` | gen·owner 일치 |
| `reserved` | 응답에 taskId T1 | `sent`, `task_id` T1 | **확정 조건**: gen·owner 일치 + `task_id is null` + 만료 전. 0행이면(이미 정리·다른 세대) T1은 기록에만 남기고 상태는 건드리지 않음 |
| `reserved` | 분명한 거절(아래) | `completed` + `failed` | gen·owner 일치 |
| `reserved` | 그 밖 응답 | `completed` + `uncertain` | gen·owner 일치 |
| `sent`(T1) | T1 결과(콜백 또는 조회) | 0-3 저장 흐름 | 0-3 잠금 조건(task T1, hop 1) |

- **빠른 콜백**: 확정 전에 T1 콜백이 오면 웹훅은 `task_id=T1` 행을 못 찾아 무시한다. 확정 뒤 수동 동기화·화면 진입의 `record-info(T1)` 조회로 회복한다(콜백만 믿지 않는 v1.37 구조 그대로).
- **작업 번호를 잃음**(전송 뒤 응답 전 종료): 만료 뒤 `completed` + `uncertain`. **자동 재발송 0** — 잃은 T1은 회원 크레딧이 쓰였을 수 있다는 안내만.
- **분명한 거절**: HTTP 응답을 받았고, 본문 JSON을 해석했고, 본문 `code`가 400·401·404·413 중 하나이면서 HTTP 상태와 같고, 본문에 `taskId`가 없을 때만. 405·429·430·455는 문서끼리 뜻이 엇갈려(`SUNOAPI_REFERENCE.md` 59줄 단서) 불확실로 둔다. 본문 해석 불가·5xx·`taskId` 없는 200 성공도 불확실.

### 0-8. 보충 UPDATE 직전 재확인 (A4)
조회가 끝난 뒤 쓰기는 **한 문장의 UPDATE**로 하고, WHERE에 모두 넣는다 — 하나라도 어긋나면 0행:
변주 `id`·`user_id`(본인)·`remix_id` 일치 / `lyrics_status = 'unknown'` / 리믹스 `user_id` 본인·`status = 'completed'`·**회원 원문 `lyrics` 비어 있음** / 출처 = (변주 `suno_task_id` = 조회한 taskId) 또는 (변주 `suno_task_id is null` and 리믹스 `extend_hop_count = 0` and 리믹스 `task_id` = 조회한 taskId) / 변주 `suno_audio_id` = 응답 항목 `id`.
회원 원문이 이미 있으면 조회 자체를 하지 않는다(호출 0). 표본 FILL-09~14.

### 0-9. 두 위험이 필요한 이유와 1차 분리 가능성 (A4 비교)
| 항목 | 왜 막아야 하나 | 가사 보존과의 관계 |
|---|---|---|
| 연장 경합·예약 | 같은 결과 중복 저장, **유료 연장 이중 호출**, 결과 고아(회원 크레딧 손실) | 가사 저장이 없어도 **지금 있는 결함**(코드 관찰). 가사를 넣으면 중복 행에 가사도 중복될 뿐, 결함의 종류는 같다 |
| 보충 | 다른 곡·다른 회원 가사를 잘못 채우거나 회원 원문을 덮을 위험(개인정보·정확성) | 기존 리믹스에만 필요. 14일 보관 때문에 지금 있는 리믹스에는 효과가 거의 없음 |

**1차 후보에서 분리 가능** — 1차 = 「저장 때 가사 넣기만」: `SunoCallbackItem.prompt` 읽기 + `classifyRemixLyrics` + 변주 행에 `suno_task_id`·`lyrics`·`lyrics_status` 3칸을 **지금의 insert에 더하기**, 가사 영상은 회원 원문 우선·`provided_unverified` 안내·`suno_task_id` 우선 사용. 자동 연장 흐름·잠금·보충은 손대지 않는다.
- 장점: 스키마 칸 3개만, 경합 코드 변경 없음, 시험 범위 작음(표본 PAIR·ABSENT·GUESS·ECHO·EMPTY·NA·CASE·LEN·PRIO).
- 남는 위험: 기존 경합으로 중복 행이 생기면 가사도 중복 저장(새로 생기는 위험 아님). 보충이 없으니 옛 리믹스는 지금처럼 붙여 넣기.
- 권장 순서: 1차 저장 때 가사 → 2차 연장 경합·예약(0-3·0-7, DB 함수 필요, 가사와 무관한 기존 결함 수정) → 3차 보충(0-4·0-8, 필요할 때만).

### 0-5. 소비처 계약
회원 원문(`remix.lyrics`) > `provided`/`provided_unverified`(확인 안내) > 빈 가사(붙여 넣기 안내). 시간 가사 작업 번호 = `variant.suno_task_id`, 없으면 0-4와 같은 출처 규칙(옛 연장 행은 `remix.task_id`도 믿지 않고 시간 가사 요청 안 함 — 「이 곡은 시간 가사를 받을 수 없습니다」).

### 0-6. 스키마 보정(제안, 적용 안 함)
6절 제안에 더해 `music_track_remixes`에 `extend_reserved_at timestamptz`, 잠금 토큰은 기존 `error_message` 칸을 그대로 쓰거나 `sync_lock text` 칸 추가 중 구현 때 택1. 원자적 반영용 DB 함수 1개(`save_remix_result(...)`, `security definer`, 위 조건 검사). 모두 승인 뒤.

## 1. 지금 구조(코드 근거)

| 단계 | 위치 | 하는 일 | 가사 처리 |
|---|---|---|---|
| 요청 | `music/lib/actions/remix.ts` 91·254·280~311줄 | 종류 4개(`cover`·`add_vocals`·`add_instrumental`·`mashup`) | 회원이 넣은 가사만 `music_track_remixes.lyrics`에 저장. 안 넣으면 `null` |
| Suno 요청 본문 | `music/lib/ai/suno.ts` 487~523줄 `requestSunoRemixMode`, 커버는 `requestSunoRemix` | `lyrics`가 있으면 그것, 없으면 `prompt`에 영어 지시문(`buildDefaultRemixPrompt`, remix.ts 37줄) | 회원 가사가 없으면 가사는 Suno가 지음 |
| 결과 받기 | `music/app/api/webhooks/suno/route.ts` 102~136줄 | 콜백 본문은 쓰지 않고 `verifiedResult` → `checkSunoGenerationStatus`(`record-info`)로 다시 조회 | — |
| 결과 읽기 | `music/lib/ai/suno.ts` 806~832줄 | `sunoData[]`에서 id·오디오·커버·제목·길이만 꺼냄 | **곡별 가사(`prompt`)를 읽지 않음**(타입 `SunoCallbackItem` 758줄에도 칸 없음) |
| 저장 | `music/lib/remixSync.ts` 70~77줄 | 변주 행에 `suno_audio_id`·`audio_url`·`image_url`·`duration_seconds` | 가사 저장 없음(`music_track_remix_variants`에 칸 없음, 마이그레이션 `0010_track_remix.sql` 30~38줄) |
| 자동 연장 | `remixSync.ts` 95~151줄 | 목표 길이 90% 미만이면 `/generate/extend`, **같은 리믹스 행의 `task_id`를 새 작업 번호로 덮어씀** | 연장 단계 변주는 원래 작업 번호를 잃음 |
| 가사 영상 | `lyric-video-studio/src/lib/suno.ts` 62~80·99~120줄 | 리믹스 변주를 읽어 가사 글 = `remix.lyrics`, 시간 가사 = `remix.task_id` + 변주 `suno_audio_id` | 회원 가사가 없으면 0줄 |

Suno 문서 근거(`music/docs/SUNOAPI_REFERENCE.md`): 51줄 「성공 `data.data[]`: id, audio_url, …, **prompt**, …」, 37줄 「customMode true에서 `prompt`는 그대로 **가사**로 불림」, 90줄 「연장 요청에 영어 지시문을 `prompt`로 보내면 그대로 불릴 위험」.

## 2. 리믹스 종류별 제공값

| 종류 | 회원 가사 | 우리가 보내는 것 | Suno가 돌려줄 수 있는 곡별 가사 | 자동 연장 | 시간 가사 대상 |
|---|---|---|---|---|---|
| `cover` 보컬 | 선택 | 가사 있으면 그 가사(혼성이면 듀엣 지시 한 줄 덧붙임), 없으면 영어 지시문 | 있음(문서상 `prompt`) — 실제 값은 미확인 | **함** (`target_duration_seconds`는 cover만, remix.ts 263줄) | 예 |
| `cover` 연주곡(`instrumental`) | 없음 | 가사·prompt 없음 | 없음 | 함 | 아니오 |
| `add_vocals` | 선택 | 가사 있으면 `lyrics`, 없으면 영어 지시문 `prompt` | 있음(문서상) — 실제 값 미확인 | 안 함 | 예 |
| `add_instrumental` | 없음(254줄에서 강제 `null`) | `tags`만 | 원곡 보컬의 가사일 수 있음 — 미확인 | 안 함 | 아니오(가사 영상이 이미 막음, suno.ts 73줄) |
| `mashup` | 선택 | 가사 있으면 `lyrics`, 없으면 영어 지시문 | 있음(문서상) — 미확인 | 안 함 | 예 |

**미확인 위험 두 가지**(실제 응답으로만 판정 가능):
1. 회원 가사 없이 보낸 영어 지시문(「Sing this song in …」)을 Suno가 가사로 불렀을 수 있다. 그러면 돌려받는 `prompt`가 우리 지시문과 같다 → 아래 3절에서 「가사 아님」으로 분류한다.
2. 연장 결과의 `prompt`가 전체 가사인지 이어 붙인 부분만인지 모른다.

## 3. 가사 상태 구분 — 「없음」과 「미제공」을 나눈다

변주 행마다 상태 하나를 둔다.

| 상태 | 뜻 | 정하는 때 | 가사 영상에서 |
|---|---|---|---|
| ~~`provided`~~ → 0절: 실측 전에는 `provided_unverified` | Suno가 준 곡별 가사를 저장함 | 보컬 종류 + 응답 `prompt`가 비어 있지 않고 우리 지시문과 다름 | 가사 글로 채움(회원 원문이 있으면 회원 원문 — 0-5) |
| `empty` | 보컬 종류인데 Suno가 가사를 안 주거나 빈 값·우리 지시문 그대로 | 저장 시 판정 | 회원 가사(`remix.lyrics`)가 있으면 그것, 없으면 「가사를 붙여 넣어 주세요」 |
| `not_applicable` | 가사가 원래 없는 종류(`add_instrumental`·연주곡 커버) | 저장 시 종류로 판정 | 지금처럼 가사·시간 가사 모두 받지 않음 |
| `unknown` | 이 변경 전 기존 행, `prompt` 칸 없음, 추측 칸만(→ 0-2) | 칸 기본값 | `remix.lyrics`(지금 동작 그대로) + 0-4 조건을 만족할 때만 1회 보충 |

판정 규칙(순수 함수 하나로, 시험 가능하게):
```
classifyRemixLyrics(mode, instrumental, returnedPrompt, sentPrompt) →
  instrumental || mode === "add_instrumental"        → not_applicable
  returnedPrompt 공백 제거 후 빈 값                     → empty
  returnedPrompt === sentPrompt(공백·대소문자 정규화)   → empty   (지시문이 그대로 돌아온 경우)
  prompt 칸 자체가 없음(추측 칸만 있어도)              → unknown  (→ 0-2)
  그 밖                                              → provided_unverified (5000자에서 자름, → 0-2)
```
`sentPrompt`는 요청 때 보낸 영어 지시문이다. 리믹스 행에 따로 저장하지 않아도 `buildDefaultRemixPrompt(lang, vocal_gender)`로 다시 만들 수 있다(두 값 모두 리믹스 행에 있음).

## 4. 기존 행 호환과 복구

- **스키마는 더하기만** 한다(널 허용 칸 + 기본값). 지금 배포된 코드는 새 칸을 모르고 넣지도 않으므로 그대로 동작하고, 그 행은 `unknown`이 된다. 배포 순서는 「DB 칸 추가 → 코드 배포」. 반대로 해도 깨지지 않게, 새 코드는 칸이 없을 때(조회 오류 42703) 예전 방식으로 내려간다.
- **연장 단계 작업 번호 보존**: 변주마다 자기를 만든 Suno 작업 번호(`suno_task_id`)를 저장한다. 시간 가사 요청은 `variant.suno_task_id ?? remix.task_id`. 기존 행은 비어 있으니 지금과 같다.
- **기존 행 가사 보충(선택, 회원 동작 때만)**: 회원이 가사 영상에서 `unknown` 리믹스 변주를 고를 때, 서버가 **그 회원 본인 Suno 키**로 **0-4의 검증된 출처**(변주 `suno_task_id`, 없으면 연장 없던 리믹스의 `remix.task_id`만)를 1회 조회해 같은 `suno_audio_id`의 `prompt`를 찾으면 채운다. 생성이 아니라 상태 조회다.
  - 관리자가 회원 키로 한꺼번에 돌리는 일괄 보충은 하지 않는다(회원 본인 계정·키 최상위 규칙 — 회원이 하지 않은 호출).
  - ~~연장된 cover의 앞 단계 변주는 `remix.task_id`로 조회~~ → 0-4: `suno_task_id` 없는 옛 연장 행은 **조회하지 않고** `unknown` 유지(오디오 번호가 겹쳐도 채우지 않음).
  - Suno 결과 보관은 **14일**로 기록돼 있다(`music/docs/PLAN_20261021_ADD_VOCALS_MASHUP.md` 11줄 「결과 14일 보관」, 원출처 sunoapi.org 문서 요약 — 우리 실측은 아님). 그래서 보충은 만든 지 14일 이내 리믹스에만 의미가 있고, 2026-10-21~22에 만든 기존 리믹스 6+건은 대상이 아니다(부록 A1 1-3). 못 찾는 옛 리믹스는 회원이 가사를 붙여 넣는다.
- **되돌리기**: 코드만 되돌리면 새 칸은 쓰이지 않을 뿐 남아 있어도 해가 없다. 칸 삭제는 필요하지 않다.

## 5. 가사 노출과 소유권

- 가사는 **변주 행 안**에 둔다 → 같은 행의 기존 정책(`music_track_remix_variants_owner_select`, `auth.uid() = user_id`)으로 본인만 읽는다. 새 공개 경로를 만들지 않는다.
- 변주 표에는 본인 `update` 정책이 없다(0010 56~58줄). 저장·보충은 서버 관리자 연결에서 **`user_id`를 직접 조건으로 걸어** 한다(지금 웹훅·가사 영상과 같은 방식). 회원 화면이 가사를 직접 고치는 기능은 이번 범위가 아니다.
- 보관: 리믹스 행이 30일 정리(`music/app/api/cron/cleanup/route.ts` 119~125줄)로 지워지면 변주가 함께 지워져(`on delete cascade`) 가사도 사라진다. 보관 열외 회원(`retention_exempt`) 규칙도 그대로 따라간다. 별도 정리 코드가 필요 없다.
- 기록: 가사 원문을 로그·오류 메시지·요청함에 남기지 않는다(길이·상태만).
- 다른 프로그램: 가사 영상은 자기 회원 행만 읽는다(`ownVariant`의 `.eq("user_id", userId)`). 플레이리스트(`playlist-channel-studio/src/lib/remixTracks.ts`)는 가사를 쓰지 않으므로 바꿀 것 없음. 메인 「내 자료함」 트리거는 리믹스 표를 읽지 않는다(트리거 대상은 `free_music_tracks`·`ams_generations`·`music_track_variants`).

## 6. 필요한 스키마(제안, 적용하지 않음)

```sql
-- 제안: music/supabase/migrations/00xx_remix_variant_lyrics.sql (승인 뒤에만 파일 생성·적용)
alter table public.music_track_remix_variants
  add column suno_task_id text,                 -- 이 변주를 만든 Suno 작업 번호(자동 연장 단계별)
  add column lyrics text,                        -- Suno가 돌려준 곡별 가사(5000자 이내)
  add column lyrics_status text not null default 'unknown'
    check (lyrics_status in ('provided','provided_unverified','empty','not_applicable','unknown'));
-- provided_unverified: 문서상 칸(prompt)에서 받았지만 record-info 칸 이름이 실측으로 확인되기 전(부록 표본 계획 참고)
```
- 새 정책 없음(기존 본인 읽기 정책이 행 전체에 적용). 인덱스 불필요(행 단위 조회만).
- 운영 DB 공용이라 Lab 시험 DB가 없다 → 적용은 승인 뒤 운영에 한 번, 적용 직후 칸 존재·기본값만 읽기 확인.

## 7. 코드 변경 범위(구현 단계 — 승인 뒤)

| 파일 | 변경 | 비고 |
|---|---|---|
| `music/lib/ai/suno.ts` | `SunoCallbackItem`에 `prompt?: string` 추가, `checkSunoGenerationStatus`가 `t.prompt` 읽기 | **공용 기준 코드 `suno-api-client`** → `check-shared-modules.mjs --sync`로 `ai-music-studio`·`shots` 사본 반영. 선택 칸 추가라 사본 쪽 동작 변화 없음 → 급하지 않은 변경, 다음 배포 때 함께 |
| `music/lib/remixSync.ts` | 변주 행에 `suno_task_id`(현재 `remix.task_id`), `lyrics`, `lyrics_status`(`classifyRemixLyrics`) 저장 | 판정 함수는 새 파일 `music/lib/remixLyrics.ts`(순수 함수) |
| `lyric-video-studio/src/lib/suno.ts` | `ownVariant` 리믹스 분기: 가사 글·시간 가사 작업 번호·보충은 **0-4·0-5 계약대로**(회원 원문 우선, `provided_unverified` 확인 안내, 옛 연장 행은 `remix.task_id`도 쓰지 않음) | 가사 영상 버전 +0.01 |
| `music/components/remix/RemixCard.tsx` | (선택) 가사가 있는 변주에 「가사 보기」 접기 | 범위 확대라 별도 판단 |

## 8. 합성 검증 계획(유료 호출 0)

모두 가짜 응답으로 하는 자동 시험이다.
1. `classifyRemixLyrics` 표 시험: 종류 4개 × 연주곡 여부 × 응답 가사(있음·빈 값·공백만·우리 지시문과 같음·5000자 초과) → 기대 상태와 저장 값.
2. `checkSunoGenerationStatus` 파싱 시험: `record-info` 가짜 응답 — 낙타 표기·밑줄 표기, `prompt` 있음·없음 → `tracks[].prompt`.
3. `saveSunoRemixResult` 시험: 가짜 Supabase로 넣는 행 모양 확인(새 칸 3개), 자동 연장 단계에서 단계마다 `suno_task_id`가 그 단계 작업 번호인지.
4. 가사 영상 `ownVariant`·`fetchSunoTimedLines` 시험: 상태별 가사 글 우선순위, 작업 번호 선택(`suno_task_id` 우선), 칸이 없는 옛 DB(오류 42703)에서 예전 동작으로 내려가는지, 다른 회원 행을 못 읽는지.
5. 보충 경로 시험: `unknown` → 조회 결과에 같은 오디오 번호가 있을 때만 채움, 없으면 `unknown` 유지·재호출 없음, 키 없으면 호출 안 함.
6. 기존 시험 회귀: `music` 리믹스·웹훅 시험, `lyric-video-studio` 전체, `playlist-channel-studio` `remix-tracks.test.mjs`(88개), 공용 사본 일치 검사.

**실제 확인(별도 승인 필요, 지금 하지 않음)**: 배포 뒤 시험 계정으로 「보컬 추가」 리믹스 1회(Suno 크레딧) 또는 기존 리믹스 `record-info` 조회 1회(상태 조회)로, 응답 `prompt`가 실제 가사인지·우리 지시문인지 확인. 2절의 미확인 위험 두 가지가 여기서 판정된다.

## 9. 결정 항목(Master·주인님)

1. 6절 스키마 적용(운영 DB, 더하기만) — 승인 필요.
2. 4절 「회원 동작 때 1회 보충」을 넣을지(넣지 않으면 기존 리믹스는 지금처럼 회원이 가사를 붙여 넣음).
3. 2절 위험 1이 사실로 확인되면, 회원 가사 없는 보컬 리믹스에 영어 지시문 대신 무엇을 보낼지(예: `prompt`를 비우고 Suno 자동 가사 모드로) — 별도 플랜.
4. 실제 확인 1회의 방식(새 리믹스 생성 vs 기존 리믹스 상태 조회).

## 10. 비용

- 이 설계: 없음(문서만).
- 구현 단계 예상: 빌드 2회(music, lyric-video-studio; 공용 사본은 다음 배포 합류), 실제 확인 Suno 1회(승인 뒤). 회원 쪽은 보충 조회가 상태 조회라 생성 크레딧이 들지 않을 것으로 보지만 미확인.

## 부록 A1 확인 (REMIX-LYRICS-A1-READBACK, 2026-11-20, Master `msg_94dff54477b5`)

범위: 저장소에 이미 있는 자료만 읽음. 새 API 호출·제품 코드·SQL·운영 변경 없음.

### 1. 곡별 `prompt`의 실제 근거 — 「문서 근거만 있고 실측 원문은 없음」

| 번호 | 자료 | 알 수 있는 것 | 한계 |
|---|---|---|---|
| 1-1 | `music/docs/SUNOAPI_REFERENCE.md` 51줄 | 콜백 성공 `data.data[]`에 `prompt`가 있다고 적힘(sunoapi.org 문서 요약) | 콜백 형식 설명이다. 우리는 콜백 본문을 쓰지 않고(v1.37, `music/AGENTS.md` 372줄~) `record-info`로 재조회한다. **`record-info`의 `sunoData[]`에도 `prompt`가 있는지는 문서에도 우리 기록에도 없음** |
| 1-2 | `music/scripts/fix-stuck-track.mjs` 68~104줄 | 실제 `record-info` 응답을 다룬 스크립트 — `sunoData[]` 항목이 낙타 표기(`audioUrl`·`streamAudioUrl`·`imageUrl`·`id`·`duration`) | `prompt`는 읽지 않아 존재 여부 관찰 없음 |
| 1-3 | `music/docs/PLAN_20261021_ADD_VOCALS_MASHUP.md` 11줄 | 결과 14일 보관 | 실측 아님. 지금(11-20) 남은 시험 계정 리믹스는 모두 10-21~22 생성 → 보관 기간 지남 |
| 1-4 | `music/AGENTS.md` 364줄(10-22 실호출 3회) | 보컬 추가(MR 반주·여성)·반주 추가·매시업 각각 2곡씩 저장됨 | 무엇이 불렸는지(가사·지시문) 기록 없음. 보컬 추가는 회원 가사 없이 영어 지시문 `prompt`로 보냈음(운영 `lyrics` 0자, 11-20 읽기) |
| 1-5 | 타입 `music/lib/ai/suno.ts` 806~817줄 | 우리가 기대하는 `sunoData` 칸 목록 | 우리 코드가 정한 모양일 뿐, Suno가 실제로 주는 칸의 전부가 아님 |

결론: **`prompt`가 `record-info`에 있다는 것은 미확인**이다. ~~구현은 `prompt`·`lyric`·`lyrics` 어느 이름이든 읽고~~ → 0-2: 가사 후보는 `prompt` 하나만, 추측 칸 문자열은 저장하지 않으며, `prompt` 칸이 없으면 `unknown`.

### 2. 영어 생성 지시문 구분의 한계

설계 3절은 「돌려받은 가사 = 보낸 지시문(정규화 비교)」이면 `empty`로 본다. 이 규칙이 놓치는 경우:

| 경우 | 결과 | 대응 |
|---|---|---|
| Suno가 지시문을 그대로 불렀지만 응답 가사에 `[Verse]` 같은 구간 표시를 붙이거나 줄을 나눠 돌려줌 | 같음 비교 실패 → 잘못 `provided` | 비교 전 구간 표시 `[...]`·줄바꿈·문장부호 제거 후 비교. ~~「지시문 첫 문장으로 시작」도 같은 취급~~ → PHASE1-PURE A2: 접두 일치는 지시문으로 보지 않음(미검증 후보 유지) |
| 혼성 듀엣 지시가 붙은 변형(`buildDefaultRemixPrompt` 혼성 분기) | 기본 문장만 비교하면 실패 | `lang`·`vocal_gender`로 두 형태 모두 만들어 비교 |
| 회원이 넣은 가사 + 듀엣 지시 한 줄(`buildRemixPrompt` 49줄) | 가사이므로 `provided`가 맞음 | 회원 가사가 있으면 지시문 비교를 하지 않음 |
| Suno가 지시문을 「주제」로 읽고 새 가사를 지어 줌 | 다르므로 `provided` — 맞음 | — |
| 지시문을 번역·요약해 불렀거나 일부만 섞음 | 구분 불가 | 한계로 인정. `lang`이 한국어인데 가사가 영어뿐이면 「의심」 표시만(상태는 `provided`, 가사 영상에서 「가사를 확인해 주세요」 안내) — 자동 판정하지 않음 |
| `lang`이 영어인 리믹스 | 영어 여부로 의심 판단 불가 | 의심 표시 규칙을 적용하지 않음 |
| 연장 단계 `buildExtendContinuationPrompt`(remixSync 37~43줄, cover만) | 연장 결과의 가사가 그 지시문일 수 있음 | 연장 단계 비교 대상에 연장 지시문도 넣음 |

이 판정은 「가사 영상에 보여 줄지」만 정하고, 회원 곡 자체는 바꾸지 않는다. 근본 해결(지시문을 가사 칸으로 보내지 않기)은 설계 9절 결정 3번.

### 3. 합성 시험 입력표

#### 3-1. 자동 연장 전후 작업 번호(cover만)

| 시험 | 입력 | 기대 |
|---|---|---|
| E1 | 리믹스 `task_id=T0`, hop 0 응답 2곡(id A1·A2, 60초) → 목표 180초 → 연장 요청 성공 `T1` | A1·A2 행 `suno_task_id=T0`, 리믹스 `task_id=T1`·`extend_hop_count=1`·`generating` |
| E2 | E1 다음 hop 1 응답 2곡(B1·B2, 170초) | B1·B2 `suno_task_id=T1`, A1·A2는 그대로 T0, 리믹스 `completed` |
| E3 | 연장 요청 실패(예외) | A1·A2 `T0`, 리믹스 `completed`, 작업 번호 그대로 T0 |
| E4 | hop 3(상한)에서 또 짧음 | 연장 안 함, 상한 도달 행도 자기 hop 작업 번호 |
| E5 | 가사 영상 시간 가사: A1 고름 | 요청 `taskId=T0, audioId=A1`(지금 코드는 T1을 씀 → 시험이 고친 뒤 통과해야 함) |
| E6 | 옛 행(`suno_task_id` 없음) 고름 | `remix.task_id` 사용(지금 동작 유지) |
| E7 | `add_vocals`(연장 없음) | 행 `suno_task_id = remix.task_id` |

#### 3-2. 다곡 응답에서 가사가 섞이지 않음

| 시험 | `sunoData` 입력 | 기대 |
|---|---|---|
| M1 | `[{id:A, prompt:"가사 가"}, {id:B, prompt:"가사 나"}]` | A행 「가사 가」, B행 「가사 나」 |
| M2 | 순서 뒤바뀜 `[{id:B,…나}, {id:A,…가}]` | 위와 같음 — 저장 짝은 배열 순서가 아니라 `id` 기준 |
| M3 | A만 `prompt`, B는 칸 없음 | A `provided_unverified`, B `unknown`(→ 0-2) |
| M4 | B `prompt:""`·공백만 | B `empty` |
| M5 | A 오디오 주소 없음(건너뜀), B 정상 | B행만 저장되고 가사도 B 것 — 건너뛴 A의 가사가 B로 밀리지 않음(지금 코드는 `i` 인덱스로 파일 이름을 만들므로 주의) |
| M6 | 두 항목 `id` 같음(비정상) | 두 번째 저장 거절 또는 경고 기록, 가사 덮어쓰기 없음 |
| M7 | `id` 없음 | `suno_audio_id` null 행, 가사 저장은 하되 보충 조회 대상에서 제외 |
| M8 | 매시업 2곡이 서로 다른 가사 | M1과 같음 |
| M9 | 낙타·밑줄 표기 섞임(`audioUrl`/`audio_url`, `prompt`/`lyrics`) | 둘 다 읽음, 가사 칸 이름 우선순위 `prompt` → `lyrics` → `lyric` |
| M10 | 5,001자 가사 | 5,000자에서 자름, 다른 곡에 영향 없음 |
| M11 | 연장 hop 응답(T1)의 항목이 hop 0 오디오 id(A1)와 같음 | 새 행 추가 안 함 또는 별도 처리 — 같은 오디오의 가사가 두 단계 사이에서 덮어써지지 않음 |
| M12 | 보충 조회: `record-info(T0)` 응답에 A1·A2 있고 B1 고름 | B1 일치 없음 → `unknown` 유지, A1 가사를 B1에 넣지 않음 |

각 시험은 가짜 Supabase(넣은 행 기록)와 가짜 `fetch`(정해진 `record-info` 본문)로 돌리고, 행마다 `(suno_audio_id, suno_task_id, lyrics_status, lyrics 길이)`만 비교한다(가사 원문을 시험 출력에 찍지 않음).

## 부록 표본 계획 (REMIX-LYRICS-FIXTURE-PLAN A1, 2026-11-20, Master `msg_5002f80c1247`)

합성 표본: [`music/docs/fixtures/remix-lyrics-fixtures-20261120.json`](fixtures/remix-lyrics-fixtures-20261120.json) — 사례 22개(P0 15·P1 4·P2 3). 시험 코드·제품에 연결하지 않은 설계 자료이고, 가사 문자열은 모두 지어낸 짧은 표본이다.

### 근거 등급(표본마다 표시)
| 등급 | 뜻 | 예 |
|---|---|---|
| OBS | 저장소에서 실제 응답으로 관찰된 형태 | `record-info` `sunoData[]` 낙타 표기 `id`·`audioUrl`·`imageUrl`·`duration`(`music/scripts/fix-stuck-track.mjs`) |
| CODE | 우리 코드 동작으로 정해지는 기대값 | 웹훅 `task_id` 조회(`route.ts` 107줄)·잠금(117줄)·오디오 없는 항목 건너뜀(`remixSync.ts` 59줄) |
| DOC | 문서에만 있음 | 콜백 `data.data[].prompt` |
| ASSUME | 근거 없는 가정 | `lyrics`·`lyric` 같은 다른 칸 이름, 지시문 변형 형태 |

### 안전 규칙(설계 3절 보정)
1. 가사 후보 칸은 문서에 있는 `prompt` 하나만. 실측으로 칸 이름이 확인되기 전에는 `provided`가 아니라 **`provided_unverified`**로 저장한다(가사 영상은 채우되 「Suno가 준 가사입니다 — 확인해 주세요」 안내).
2. `lyrics`·`lyric` 등 추측 칸의 문자열은 저장하지 않고 `unknown` + 진단 표시만(부록 A1 1절의 「여러 이름 읽기」를 이 규칙으로 좁힘).
3. 가사 칸이 아예 없으면 `unknown`(실측 모양 그대로 — 표본 P0-ABSENT-01).
4. 짝은 배열 순서가 아니라 항목 `id`.
5. 시험 비교는 (오디오 번호, 작업 번호, 상태, 가사 길이)만, 원문 미출력.

### 우선순위
| 순위 | 막아야 할 것 | 표본 |
|---|---|---|
| P0 | ID 짝·순서 변경·건너뛴 항목 뒤 밀림·보충 불일치 | PAIR-01~04 |
| P0 | 미제공(칸 없음)을 empty로 오인 | ABSENT-01 |
| P0 | 추측 칸 문자열을 가사로 확정 | GUESS-01·02 |
| P0 | 지시문 오인(그대로·구간 표시·혼성) / 회원 가사를 지시문으로 오인 | ECHO-01~04 |
| P0 | 연장 경합(단계별 작업 번호, 늦은 이전 단계 콜백, 같은 단계 중복 콜백, 가사 영상 작업 번호) | EXT-01~04 |
| P1 | 빈 값·가사 없는 종류·중복 id·id 없음 | EMPTY-01, NA-01, DUP-01, NOID-01 |
| P2 | 표기 섞임·길이 제한·언어 의심 | CASE-01, LEN-01, SUSPECT-01 |

### 구현 전제(표본이 드러낸 것)
- 웹훅이 리믹스를 읽을 때(`route.ts` 104~106줄) 지금 `mode`·`lyrics`·`task_id`를 가져오지 않는다 → 저장 단계에서 종류·지시문 판정을 하려면 이 세 칸을 함께 읽어야 한다. 수동 동기화 경로(`remix.ts` 400줄 부근)도 같다.
- EXT-04는 현재 가사 영상 코드(`lyric-video-studio/src/lib/suno.ts` 77줄 `remix.task_id`)로는 실패하는 것이 정상이다(고친 뒤 통과해야 하는 시험).

## 부록 A2 보완 (REMIX-LYRICS-FIXTURE-PLAN A2, 2026-11-20, Master `msg_003c577436c1`, 검수 CX-QA-01)

표본 파일을 36개로 늘렸다(P0 29·P1 4·P2 3). 문서·합성 JSON만, 제품·API·DB·키·실호출 없음.

### 1. 경합 — 코드로 확인한 결함(미실측)
`music/lib/syncLock.ts` 14~25줄 `claimSyncLock`은 `id`·`status=generating`·잠금 표시만 조건으로 건다. 작업 번호·연장 단계를 보지 않는다. 그래서:
- **RACE-01(웹훅)·RACE-02(수동)**: T0 기준으로 리믹스를 먼저 읽은 처리가, 그사이 다른 처리가 T0를 저장하고 연장으로 `task_id=T1`·hop 1로 바꾸고 잠금을 푼 뒤에 잠금을 잡을 수 있다 → 같은 변주를 h0로 다시 저장하고, 읽어 둔 hop 0 기준으로 연장을 또 요청해 `task_id`가 T2로 덮이면 T1 결과가 고아가 된다.
- **RACE-03**: `markRemixFailed`(`remixSync.ts` 마지막 함수)도 `id`만 조건이라, 늦은 T0 실패 결과가 진행 중 T1을 실패로 덮는다.
- **RACE-05**: 완료 표시(`remixSync.ts` 87줄)도 `id`만 조건.
- 웹훅 쪽 늦은 T0 콜백이 **조회 단계**에서 들어오면 `route.ts` 107줄 `.eq("task_id", T0)`가 행을 못 찾아 무시된다(EXT-02) — 결함은 「조회 뒤·잠금 전」 사이에 전환이 끼는 경우다.

### 2. 인수 조건(구현이 통과해야 할 것)
| 단계 | 조건 |
|---|---|
| 조회 | 처리할 `taskId`로 행을 찾고 그때의 `extend_hop_count`(= hop)를 함께 기억 |
| 잠금 | `id` + `task_id = taskId` + `extend_hop_count = hop` + `status = generating` + 잠금 비어 있음(또는 5분 지남) — 하나라도 다르면 잠금 실패 → 무시 |
| 저장 | 변주 행마다 `suno_task_id = taskId`, 가사·상태는 `id` 짝으로만. 같은 리믹스에 같은 `suno_audio_id`가 이미 있으면 새 행·가사 덮어쓰기 없음(EXT-07) |
| 완료·실패·연장 갱신 | 잠금과 같은 (`id`, `task_id`, hop, generating) 조건. 바뀐 행이 0이면 아무것도 하지 않고 기록만 |
| 연장 | 새 작업 번호로 바꾸는 갱신도 같은 조건 + `extend_hop_count = hop + 1`을 한 번에 |
| 보충 | → 0-4: 완료 리믹스의 `unknown` 변주만, 출처 = `suno_task_id`, 없으면 연장 없던(hop 0) 리믹스의 `task_id`만, 옛 연장 행은 조회 안 함. 같은 `suno_audio_id`의 `prompt`만, 그 한 행만(`lyrics_status = unknown` 조건) (FILL-01~06) |
| 비교 | 모든 기대값은 (오디오 번호, 작업 번호, hop, 상태, 길이, 가사 해시) — 해시 = NFC 정규화 sha256 앞 16자, 원문 미출력 |

### 3. 가사 계약 — 소비처별 같은 규칙
| 상태 / 소비처 | 가사 영상 본문 | 가사 영상 시간 가사 | 보충 | 음악 리믹스 카드 |
|---|---|---|---|---|
| 회원 원문 있음(`remix.lyrics`) | **회원 원문**(Suno 가사가 있어도 덮지 않음, PRIO-01) | `suno_task_id ?? remix.task_id` + 오디오 번호 | 안 함 | 지금과 같음 |
| `provided_unverified` | 변주 가사 + 「Suno가 준 가사입니다 — 확인해 주세요」(PRIO-02) | 위와 같음 | 안 함 | (선택) 가사 보기 접기 |
| `provided` | 변주 가사(실측으로 칸 이름 확정 뒤에만 쓰는 상태) | 위와 같음 | 안 함 | 같음 |
| `unknown` | 빈 가사 + 「가사를 붙여 넣어 주세요」 | 위와 같음 | **1회**(같은 접속에서 다시 안 함) | 표시 없음 |
| `empty` | 빈 가사 + 같은 안내 | 위와 같음 | 안 함 | 표시 없음 |
| `not_applicable` | 가사 없음(지금처럼) | 받지 않음 | 안 함 | 표시 없음 |

### 4. 관측과 가정의 구분(표본 `basis`)
- 실측(OBS): `record-info` `sunoData[]` 낙타 표기 칸(`id`·`audioUrl`·`streamAudioUrl`·`imageUrl`·`duration`)을 **읽은 기록**만 있음. ~~가사 칸이 없는 모양만 관측됨~~ → 0-1: 가사 칸은 있고 없음 모두 **미관측**.
- 코드(CODE): 경합·조건·건너뜀·우선순위.
- 문서(DOC): 콜백 `prompt`. `record-info`에 있다는 것은 가정 → 그래서 `provided_unverified`.
- 가정(ASSUME)·합성(SYNTH): `lyrics`·`lyric` 칸, 같은 오디오 번호가 다른 hop에 다시 오는 경우 등 — 이 칸의 문자열은 가사로 확정하지 않는다.

## 부록 A3 보완 기록 (2026-11-20, Master `msg_503e2239aa81`, 검수 CX-QA-01)

- 통일 계약은 **0절**로 옮겼다(본문·부록과 다르면 0절 우선). 어긋났던 본문 3·4·7절, 부록 A1 결론·M3, A2 보충·관측 표현 10곳에 「→ 0절」 표시·취소선.
- 관측 표현 정정(0-1): 가사 칸은 있고 없음 모두 **미관측**. 표본 P0-ABSENT-01 근거를 SYNTH로 바꿈.
- 표본 49개(P0 42·P1 4·P2 3). 새 사례: LOCK-01(5분 뒤 잠금 교체 → 옛 소유자 쓰기 0행), LOCK-02(옛 T0 요청의 잠금·저장·완료·실패·연장 예약·외부 호출 모두 0), ATOM-01(원자 반영 중간 실패 → 전부 되돌림), ATOM-02(단계별 리믹스 스냅숏과 금지 상태 점검), EXTDUP-01(연장 예약 하나만 → 외부 호출 1회), EXTUNC-01(결과 불확실 → 재호출 0, 완료+기록), EXTREJ-01(4xx 거절), FILL-04(생성 중은 보충 0), FILL-05(연장 없던 옛 행은 `remix.task_id` 출처 인정), FILL-06(옛 연장 행은 오디오 id가 겹쳐도 조회 0·`unknown`), FILL-07(다른 창이 먼저 채움 → 0행), FILL-08(키 없음·이미 시도 → 0), TIMED-01(옛 연장 행 시간 가사 요청 0). 기존 FILL-01·02·03·PAIR-04는 대상 변주(`variantId`)·hop·리믹스 상태를 명시하는 형식으로 바꿈(FILL-02는 「조회 0회」로 정정).
- 점검(스크립트): `provided_unverified` 기대값 전부 해시 있음, 오디오 번호가 있는 기대 행 전부 hop 있음, 기대값에 `provided` 0개(실측 전 사용 금지), 금지 상태 목록 `_forbiddenStates` 4개.

## 부록 A4 보완 기록 (2026-11-20, Master `msg_9de01ca0ee9b`, 검수 CX-QA-01)
- 0절에 0-7(연장 예약 세대·소유·만료·확정과 전송 전/중/응답 뒤·빠른 콜백·작업 번호 잃음, 자동 재발송 0), 0-8(보충 UPDATE 직전 재확인 WHERE), 0-9(두 위험의 이유와 1차 분리 비교) 추가. 0-3 5번의 「4xx = 거절」을 정정.
- 표본 70개(P0 63). 새 사례: REJ-01~08(분명한 거절 판정 — 401만 분명, 429·본문 해석 불가·본문 code 불일치·taskId 있는 400·taskId 없는 200·502·200+413은 불확실), RES-01~07(예약 정상 확정, 전송 전 종료, 전송 중 시간 초과, 확정 전 만료, 다른 세대 확정, 빠른 콜백, 작업 번호 잃음), FILL-09~14(회원 원문 있으면 호출 0, 조회 뒤 상태·회원 원문·변주 출처 변경, 다른 회원 변주, 응답 id 불일치). EXTREJ-01은 「400·본문 code 400·taskId 없음」으로 구체화.
- 점검(스크립트): 사례 번호 중복 0, 재발송을 기대하는 표본 0.

## 부록 PHASE1-PURE A2 (2026-11-20, Master `msg_c0d595790bfa`, 맥미니 검수 `msg_baee60b9f06e` 경계 4건)
- 구현: `music/lib/remixLyrics.ts`, 시험 `music/tests/remixLyrics.test.mjs`(15개), 증거 `music/docs/evidence/remix-lyrics-phase1-tests-20261120.txt`.
- 정정 3가지: 지시문은 정규화 뒤 **전문 일치만** `empty`(다섯 단어 접두·단어 부분 일치·가사 혼합은 `provided_unverified`), 5,000 상한은 **코드 포인트**(이모지 경계에서 고립 서로게이트 없음), 같은 번호 충돌은 **자르기 전 원문**으로 판정.
- 전후: 옛 `b110a6d34` 함수에 같은 시험 → 15개 중 4개 실패(지시문 2·상한 1·충돌 1), 현재 함수 → 15/15. music 전체 92/92, tsc·eslint 0. 표본 ECHO-02 기대값을 `provided_unverified`로 정정.

## 부록 PHASE1-PURE A3 (2026-11-20, Master `msg_8fec5e88b623`, 맥미니 검수 `msg_89092dac336b`)
- 문제: 정규화가 모든 `[...]`를 지워, 지시문 전문 + 대괄호 안 실제 가사가 지시문으로 오판(가사 손실).
- 정정: 고정 목록 `SECTION_TAGS`의 구간 표시만 제거, 그 밖 대괄호는 안의 글을 비교에 보존. 애매하면 미검증 후보.
- 전후: 직전 `60fb2d390` 함수에 같은 시험 → 16개 중 1개 실패(대괄호 반례), 현재 16/16. A1 네 반례(`b110a6d34` 기준 실패)도 계속 통과. music 전체 93/93, tsc·eslint 0.

## 1차 연결 준비 인계표 (2026-11-20, Master `msg_e425c3cc0c30`, 검수 Master)

읽기·설계만. 제품 연결·DB·실호출·키·스키마 적용 없음. 기준: 저장소 HEAD `fb67e669a`, 순수 모듈 `c0db0c035`(`music/lib/remixLyrics.ts`). 줄 번호는 아래 「파일 기준 커밋」 시점. 규칙은 다시 쓰지 않고 [0-2 상태](#0-2-가사-상태와-판정)·[0-5 소비처 계약](#0-5-소비처-계약)·[6 스키마](#6-필요한-스키마제안-적용하지-않음)·부록 PHASE1-PURE A1~A3를 따른다.

| 번호 | 경로 | 위치(파일:줄 @기준 커밋) | 지금 | 1차 변경 | 본인 확인 | 구형 DB(새 칸 없음) 회귀 | 표본·시험 |
|---|---|---|---|---|---|---|---|
| A1 | 결과 읽기 | `music/lib/ai/suno.ts:758` `SunoCallbackItem`, `:825` `sunoData.map` @`237741cc3` | `prompt`를 읽지 않음 | 선택 칸 `prompt?: string` 추가, 문자열일 때만 전달. **공용 기준 코드** → `check-shared-modules.mjs --sync`로 `ai-music-studio`·`shots` 사본(동작 변화 없음, 급하지 않은 변경) | 해당 없음 | 해당 없음 | ABSENT·GUESS·CASE |
| A2 | 리믹스 조회 | 웹훅 `music/app/api/webhooks/suno/route.ts:105`(select), `:107` `.eq("task_id", taskId)` / 수동 `music/lib/actions/remix.ts:408` @`237741cc3` | 웹훅 select에 `task_id`·`mode`·`lyrics` 없음, 수동은 `mode`·`lyrics` 없음 | 두 select에 `mode`·`lyrics`(·웹훅은 `task_id`) 추가 — 판정 맥락(`RemixLyricsContext`)용 | 웹훅: 관리자 연결 + `task_id` 일치 행의 `user_id` 그대로(현행) / 수동: `requireProgramAccess` + `.eq("user_id", user.id)`(현행) | 기존 칸이라 영향 없음 | ECHO·NA |
| A3 | 새 변주 저장 | `music/lib/remixSync.ts:71~83` `variants.push`·`insert(variants)` @`237741cc3` | 오디오·커버·길이만 | 저장할 항목의 오디오 번호 목록으로 `matchRemixLyricsByAudioId` 1회 → 행마다 `suno_task_id`(= 지금 처리하는 `taskId`), `lyrics`, `lyrics_status` 추가. 오디오 없는 항목은 기존처럼 건너뜀(59줄) | 행의 `user_id: remix.user_id`(현행 72줄) | insert가 「칸 없음」(42703·PGRST204)으로 실패하면 **새 3칸을 뺀 같은 insert를 1회** 다시(외부 호출 아님, 첫 insert는 전부 실패라 중복 없음) → 오늘과 같은 결과 | PAIR·DUP·NOID·LEN·EXT-07 |
| B1 | 가사 영상 변주 읽기 | `lyric-video-studio/src/lib/suno.ts:54~80` `ownVariant` @`fa3799a63` | 변주 `id·remix_id·suno_audio_id·audio_url·image_url`, 리믹스 `task_id·mode·source_title·lyrics·instrumental` | 변주 select에 `suno_task_id·lyrics·lyrics_status`, 리믹스 select에 `extend_hop_count` 추가 | `.eq("user_id", userId)` 두 번(현행 65·70줄) + 라우트 `guard(request)`(`src/app/api/suno/tracks/route.ts:14`, `timed-lyrics/route.ts`) @`237741cc3` | select가 42703이면 **지금 select로 1회 다시** → 오늘과 같은 결과(가사 글 = 회원 원문, 시간 가사 = `remix.task_id`) | PRIO-01~03 |
| B2 | 가사 글·안내 | `lyric-video-studio/src/lib/suno.ts:85~92` `getSunoVariant` | `lyrics = music_tracks.prompt_text`(리믹스는 회원 원문 또는 빈 값) | `pickRemixLyricText(remix.lyrics, variant)` — 회원 원문 > Suno 미검증(「Suno가 준 가사입니다 — 확인해 주세요」) > 붙여 넣기 안내. 응답에 `lyricsNotice` 한 칸 추가, 카드(`SunoImportCard.tsx` 75줄 안내 자리)에 그대로 표시. 순수 모듈은 **공용 기준 코드로 등록**(기준 `music/lib/remixLyrics.ts`, 사본 `lyric-video-studio/src/lib/remixLyrics.ts`) | B1과 같음 | 새 칸이 없으면 `lyrics_status`를 `unknown`으로 보고 회원 원문만(오늘과 같음) | PRIO·SUSPECT |
| B3 | 시간 가사 | `lyric-video-studio/src/lib/suno.ts:45`(목록 `canTime`)·`:91`·`:96~98` `fetchSunoTimedLines` | 작업 번호 = `remix.task_id` | 작업 번호 = `variant.suno_task_id`, 없으면 `extend_hop_count = 0`일 때만 `remix.task_id`, 그 밖(옛 연장 행)은 요청 안 함 + 「이 곡은 시간 가사를 받을 수 없습니다」(0-5) | B1과 같음 | 새 칸이 없으면 지금처럼 `remix.task_id` | EXT-04·TIMED-01 |

**범위 밖(명시)**
- **보충 0**: 1차는 `record-info` 보충 조회를 하지 않는다. 출처를 모르는 옛 행(새 칸이 없거나 `suno_task_id`가 비어 있는 행)은 `unknown` 그대로, 가사 영상은 회원 원문 또는 붙여 넣기 안내(0-4·0-8은 3차).
- **자동 연장은 지금 동작 그대로**: 연장 때 `task_id` 덮어쓰기·잠금 경합(0-3·0-7, 부록 A2 RACE)은 1차에서 고치지 않는다. 1차에서는 저장 시점의 `taskId`를 변주별 `suno_task_id`로 남겨 **앞 단계 변주의 작업 번호를 잃지 않게만** 한다. 경합으로 중복 행이 생기면 가사도 중복 저장될 수 있다(새로 생기는 결함 아님). 연장 예약 경계(맥미니 `msg_75ff01a68199`)는 후속.
- **스키마·순번**: 6절 칸 3개(`suno_task_id`·`lyrics`·`lyrics_status`, `provided`는 실측 전 미사용)만 필요. 마이그레이션 번호와 적용은 별도 확정·승인.
- **배포 영향(실행 아님)**: music·lyric-video-studio 빌드 각 1회 + 공용 사본 2곳(`ai-music-studio`·`shots`)은 다음 배포 때 합류.

## 부록 PHASE1-COMPAT-MOCK A1 (2026-11-20, Master `msg_3981bfcb17a1`, 검수 CX-QA-01)
- 표본: [`music/docs/fixtures/remix-lyrics-compat-mock-20261120.json`](fixtures/remix-lyrics-compat-mock-20261120.json) — 22개(insert 0회 1·1회 14·2회 7, 최대 2회). 인계표 A3 「구형 DB 회귀」의 시험 설계만, 코드·DB 연결 없음.
- 재시도 조건: 응답을 받았고 + `42703`(실측 형식 「column "칸" does not exist」) 또는 `PGRST204`(문서 형식, 저장소 실측 없음) + 문구에서 뽑은 칸 이름이 이번 3칸 중 하나와 **전체 일치** + 표 이름이 있으면 `music_track_remix_variants` → 3칸을 뺀 같은 insert **1회**. 그 밖(다른 칸·부분 문자열·다른 표·권한·RLS·중복·표 없음·코드 없음·응답 없음)과 첫 성공은 재실행 0. 재시도 뒤 실패·응답 없음도 세 번째 없음.
- 응답 없음(시간 초과·연결 끊김)은 이미 저장됐을 수 있어 「불확실」로 끝내고 재실행하지 않는다.
- 새로 찾은 기존 동작: 지금 `remixSync.ts` 83줄은 insert 결과를 확인하지 않아 저장 실패가 조용히 넘어간다. 1차 구현은 오류를 호출부에 돌려주되, 그때 리믹스를 어떻게 표시할지는 별도 확정(표본 `_undecided`).
- 미확정으로 분리: 공용 Suno 클라이언트 사본 동기화 결정, Suno `prompt`의 실제 의미.

## 부록 PHASE1-COMPAT-MOCK A2 (2026-11-20, Master `msg_588297d118e7`, 검수 CX-QA-01)
- 미연결 순수 모듈 `music/lib/remixVariantInsert.ts`(넘겨받은 insert 함수만 사용): `parseMissingColumnError`(형식 3가지만 — 42703 따옴표·따옴표+표·「표.칸」, PGRST204 schema cache; 코드와 형식 불일치·앞뒤 다른 글은 판정 불가), `isMissingLyricsColumnError`(새 3칸 전체 일치 + 표 이름 있으면 변주 표), `stripLyricsColumns`, `insertRemixVariantsWithFallback`(최대 2회, 결과 7종 ok·ok_without_lyrics_columns·error·uncertain·retry_failed·retry_uncertain·skipped, 결과에는 코드·뽑은 칸·표만).
- 시험 `music/tests/remixVariantInsert.test.mjs` 27개(표본 25 + 형식·복사 2), 증거 `music/docs/evidence/remix-lyrics-compat-mock-tests-20261120.txt`. 표본: C19·C20 결과를 `retry_failed`·`retry_uncertain`으로 구분, C23~C25(「표.칸」 형식 2, 자유 문구 1) 추가.

## 부록 PHASE1-COMPAT-MOCK A3 (2026-11-20, Master `msg_cfe322ab3108`, 맥미니 검수 `msg_b57bcee04130`)
- 전송 결과 불확실: SDK(PostgREST 클라이언트)는 연결이 끊기면 예외 대신 `status: 0`과 빈 code를 돌려준다 → `status === 0` 또는 어댑터 `transportLost: true`만 첫·둘째 각각 `uncertain`·`retry_uncertain`. 빈 code만으로는 추정하지 않음(status 500 + 빈 code = `error`).
- 근거 충돌: message·details가 둘 다 형식대로 해석되는데 칸이 다르거나 둘 다 적힌 표가 다르면 판정 불가 → 재시도 0.
- 결과 라벨 제한: `error.code`는 42703·PGRST204·42501·23505·42P01·other·none, `column`은 이번 3칸 또는 null, `table`은 변주 표 또는 null — 밖의 식별자·비정규 코드·SDK 문구는 결과에 남지 않음.
- 표본 34개(C26~C34 추가), 시험 36개. 전후: `9863cca32` 함수 → 15 실패(동작 6·라벨 9), 현재 36/36. music 전체 129/129, tsc·eslint 0. 증거 `music/docs/evidence/remix-lyrics-compat-mock-tests-20261120.txt`.

## 1차 연결 인수 항목 — B1~B3 검수 고정 (2026-11-20, Master `msg_effc05d71532`, 맥미니 검수 `msg_7f1832f718cc`)
1차 구현 승인 전까지 기록만. 구현 때 아래를 시험으로 고정한다(인계표 B1~B3 보정).
| 번호 | 항목 | 내용 | 확인 방법 |
|---|---|---|---|
| K1 | 구형 DB에서도 부모 hop 유지 | 가사 영상 `ownVariant`의 리믹스 조회는 새 칸이 없는 구형 DB로 내려갈 때도 `extend_hop_count`를 계속 읽는다(이 칸은 마이그레이션 `0011_remix_auto_extend.sql` 이후 항상 있음) | 구형 select 모의에서 `extend_hop_count` 포함 단언 |
| K2 | hop 0만 부모 작업 번호 | 시간 가사 작업 번호 = 변주 `suno_task_id`, 없으면 **리믹스 `extend_hop_count = 0`일 때만** `remix.task_id`. 그 밖(연장된 리믹스의 옛 행, 구형 DB 포함)은 Suno 호출 **전에** 차단하고 「이 곡은 시간 가사를 받을 수 없습니다」. 목록의 `canTime`도 같은 규칙 | 연장 리믹스 + 구형 DB 모의에서 외부 호출 0 단언. 지금(`remix.task_id` 사용)과 달라지는 점을 배포 메모에 명시 |
| K3 | 조회 fallback 근거 제한 | 구형 select로 내려가는 것은 **이번 칸(`suno_task_id`·`lyrics`·`lyrics_status`, 리믹스 쪽은 `extend_hop_count` 아님)이 변주 표에 없다는 근거**가 있을 때만 — `parseMissingColumnError`와 같은 형식·칸·표 판정. 그 밖 오류는 그대로 오류. 내려간 조회도 `.eq("user_id", userId)` 두 조건을 그대로 유지 | 다른 칸·다른 표·권한 오류 모의에서 fallback 0, fallback 조회의 소유자 조건 단언 |
| K4 | 미검증 안내는 실제로 채운 경우만 | 「Suno가 준 가사입니다 — 확인해 주세요」는 `pickRemixLyricText`가 `suno_unverified`로 **가사 글을 실제로 채운 일반 텍스트 경로**에서만. 회원 원문·빈 가사·가사 없는 종류·시간 가사만 받은 경우에는 표시 안 함 | 경로별 안내 유무 회귀 시험 |

## 저장 호출부 인수 기준 — 결과 7종 분리와 「불확실」 상태 보존 경로 (2026-11-20, Master `msg_4dd25e54ff9f`, 맥미니 `msg_8d3dcca7c516`)
승인 전 연결 없음. 근거는 `237741cc3` 시점 코드 읽기.

### 지금 코드 근거
| 근거 | 위치 | 뜻 |
|---|---|---|
| 재처리 차단 조건은 「생성 중이 아님」 하나 | 잠금 `music/lib/syncLock.ts:20` `.eq("status","generating")`, 수동 `music/lib/actions/remix.ts:414` | 리믹스가 `completed`·`failed`면 웹훅·수동 모두 다시 저장하지 않음 |
| 저장 중 예외 → 잠금만 풀고 「생성 중」 유지 | 웹훅 `route.ts:134~136`, 수동 `remix.ts:433~436` | Suno 재알림·수동 새로고침이 **같은 결과를 다시 저장**할 수 있음 → 지금은 「불확실 = 재저장 0」이 보장되지 않음 |
| 저장 0개 → 실패 하나로 | 웹훅 `route.ts:130~132`, 수동 `remix.ts:439~443` 「Suno가 오디오 URL을 반환하지 않았습니다」 | 건너뜀·확정 실패·불확실이 「오디오 없음」으로 합쳐짐 |
| 유료 연장은 저장 직후 | `remixSync.ts:85` `maybeAutoExtendRemix` | 저장 결과와 무관하게 연장 판단이 이어짐(지금 insert 결과를 안 봄, 83줄) |
| 상태 값 3개뿐 | `0010_track_remix.sql:19~20` | 새 상태 없이 기존 값으로 처리해야 스키마 변경이 없음 |
| 실패 문구 표시 | `components/remix/RemixCard.tsx:146~150` | `failed`일 때만 `error_message`가 화면에 보임 |

### 결과 7종 → 호출부 전이(두 호출부 같게)
| `insertRemixVariantsWithFallback` 결과 | 리믹스 전이 | 유료 연장 | 자동 재저장 | 화면 문구 |
|---|---|---|---|---|
| `ok`·`ok_without_lyrics_columns` | 지금과 같은 성공 경로(연장 판단 → `completed`) — **성공 전이는 이 둘만** | 지금 규칙대로 | — | — |
| `skipped`(오디오 있는 항목 0) | `failed` | 0 | 0 | 「Suno가 오디오 URL을 반환하지 않았습니다.」(지금 문구) |
| `error`·`retry_failed`(확정 실패, 저장 안 됨) | `failed` | 0 | 0 | 「곡을 저장하지 못했습니다. 다시 만들거나 문의해 주세요.」 |
| `uncertain`·`retry_uncertain` | `failed`(끝 상태로 고정, 「생성 중」으로 되돌리지 않음) | **0** | **0** | 「곡 저장 결과를 확인하지 못했습니다. 아래에 곡이 보이면 정상 저장된 것입니다.」 |

- 「불확실」을 끝 상태(`failed`)로 두는 이유: 위 근거대로 「생성 중이 아님」이 유일한 재처리 차단 조건이라, 새 상태·칸 없이 웹훅·수동 재저장과 유료 연장을 모두 0으로 **지속**시킬 수 있다. 곡이 실제로 저장됐다면 카드는 곡 목록을 그대로 보여 준다(목록은 변주 행에서 읽음).
- 전이 갱신 조건: `id` + `task_id = 처리한 taskId` + `status = 'generating'`(0-3의 잠금 토큰은 2차). 0행이면 아무것도 하지 않음.
- **예외 위치 구분**: insert를 **보내기 전** 예외(파일 복사 실패 등)는 아무것도 쓰지 않았으므로 지금처럼 잠금 해제(재처리 허용). insert를 **보낸 뒤** 예외는 「불확실」과 같게 끝 상태. 이를 위해 `saveSunoRemixResult`가 「insert 전/후」를 결과에 담아 호출부에 돌려준다.
- 결과 문자열은 7종을 그대로 호출부까지 전달하고, 호출부는 「저장 0개」 하나로 뭉치지 않는다(지금 `savedCount === 0` 분기 대체).

### 열린 결정(Master)
1. 「불확실」 직후 읽기 확인 1회(같은 `remix_id`·`suno_audio_id`·`user_id`로 변주 select — 쓰기·유료 아님)로 실제 저장 여부를 가려 `completed`로 바꿀지. 바꾸더라도 유료 연장은 0 유지 제안.
2. 「확정 실패」에서 회원이 같은 결과를 다시 받아 저장하는 수동 버튼을 둘지(지금 `failed`는 새로고침 버튼이 없음).

**범위 변화**: 위 전이는 가사 1차 인계표(A3·B1~B3)보다 넓다 — 두 호출부(`route.ts`·`remix.ts`)와 `saveSunoRemixResult` 반환 형식이 바뀐다. 구현을 열기 전에 이 범위로 Master 확인을 받는다.
