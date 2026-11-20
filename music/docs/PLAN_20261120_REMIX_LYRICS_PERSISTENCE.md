# 리믹스 가사 보존 설계 (REMIX-LYRICS-PERSISTENCE-DESIGN A1)

- 작성: 2026-11-20 Claud(Music) `CC-MUSIC-01` (`claude-win-20261024-music`)
- 배정: Codex Master `msg_f975d4e660ca`, 주인님 「진행해」(2026-11-20)
- 범위: **설계 문서만.** 새 유료 호출·실데이터 재조회·SQL 적용·제품 코드 변경 없음. 아래 SQL은 제안이며 파일로 만들지 않았다.
- 계기: `lyric-video-studio/docs/IMPROVEMENTS.md` 2026-11-20 항목 — 운영에서 「보컬 추가」 리믹스를 가사 영상으로 넘기자 Suno 시간 가사가 빈 값이고 가사 글도 0자였다(증거 `lyric-video-studio/docs/evidence/remix-timed-lyrics-live-20261120.png`).

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
| `provided` | Suno가 준 곡별 가사를 저장함 | 보컬 종류 + 응답 `prompt`가 비어 있지 않고 우리 지시문과 다름 | 가사 글로 채움 |
| `empty` | 보컬 종류인데 Suno가 가사를 안 주거나 빈 값·우리 지시문 그대로 | 저장 시 판정 | 회원 가사(`remix.lyrics`)가 있으면 그것, 없으면 「가사를 붙여 넣어 주세요」 |
| `not_applicable` | 가사가 원래 없는 종류(`add_instrumental`·연주곡 커버) | 저장 시 종류로 판정 | 지금처럼 가사·시간 가사 모두 받지 않음 |
| `unknown` | 이 변경 전에 저장된 기존 행 | 칸 기본값 | `remix.lyrics`(지금 동작 그대로) + 4절의 1회 보충 |

판정 규칙(순수 함수 하나로, 시험 가능하게):
```
classifyRemixLyrics(mode, instrumental, returnedPrompt, sentPrompt) →
  instrumental || mode === "add_instrumental"        → not_applicable
  returnedPrompt 공백 제거 후 빈 값                     → empty
  returnedPrompt === sentPrompt(공백·대소문자 정규화)   → empty   (지시문이 그대로 돌아온 경우)
  그 밖                                              → provided (5000자에서 자름)
```
`sentPrompt`는 요청 때 보낸 영어 지시문이다. 리믹스 행에 따로 저장하지 않아도 `buildDefaultRemixPrompt(lang, vocal_gender)`로 다시 만들 수 있다(두 값 모두 리믹스 행에 있음).

## 4. 기존 행 호환과 복구

- **스키마는 더하기만** 한다(널 허용 칸 + 기본값). 지금 배포된 코드는 새 칸을 모르고 넣지도 않으므로 그대로 동작하고, 그 행은 `unknown`이 된다. 배포 순서는 「DB 칸 추가 → 코드 배포」. 반대로 해도 깨지지 않게, 새 코드는 칸이 없을 때(조회 오류 42703) 예전 방식으로 내려간다.
- **연장 단계 작업 번호 보존**: 변주마다 자기를 만든 Suno 작업 번호(`suno_task_id`)를 저장한다. 시간 가사 요청은 `variant.suno_task_id ?? remix.task_id`. 기존 행은 비어 있으니 지금과 같다.
- **기존 행 가사 보충(선택, 회원 동작 때만)**: 회원이 가사 영상에서 `unknown` 리믹스 변주를 고를 때, 서버가 **그 회원 본인 Suno 키**로 `record-info?taskId=<remix.task_id>`를 1회 조회해 같은 `suno_audio_id`의 `prompt`를 찾으면 채운다. 생성이 아니라 상태 조회다.
  - 관리자가 회원 키로 한꺼번에 돌리는 일괄 보충은 하지 않는다(회원 본인 계정·키 최상위 규칙 — 회원이 하지 않은 호출).
  - 연장된 cover의 앞 단계 변주는 `remix.task_id`가 마지막 연장 작업이라 찾지 못할 수 있다 → 찾지 못하면 `empty`가 아니라 `unknown` 그대로 둔다(다시 시도하지 않음, 같은 접속 안에서는 기억).
  - Suno가 `record-info`를 얼마나 오래 보관하는지 모른다(미확인). 못 찾는 옛 리믹스는 회원이 가사를 붙여 넣는다.
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
    check (lyrics_status in ('provided','empty','not_applicable','unknown'));
```
- 새 정책 없음(기존 본인 읽기 정책이 행 전체에 적용). 인덱스 불필요(행 단위 조회만).
- 운영 DB 공용이라 Lab 시험 DB가 없다 → 적용은 승인 뒤 운영에 한 번, 적용 직후 칸 존재·기본값만 읽기 확인.

## 7. 코드 변경 범위(구현 단계 — 승인 뒤)

| 파일 | 변경 | 비고 |
|---|---|---|
| `music/lib/ai/suno.ts` | `SunoCallbackItem`에 `prompt?: string` 추가, `checkSunoGenerationStatus`가 `t.prompt` 읽기 | **공용 기준 코드 `suno-api-client`** → `check-shared-modules.mjs --sync`로 `ai-music-studio`·`shots` 사본 반영. 선택 칸 추가라 사본 쪽 동작 변화 없음 → 급하지 않은 변경, 다음 배포 때 함께 |
| `music/lib/remixSync.ts` | 변주 행에 `suno_task_id`(현재 `remix.task_id`), `lyrics`, `lyrics_status`(`classifyRemixLyrics`) 저장 | 판정 함수는 새 파일 `music/lib/remixLyrics.ts`(순수 함수) |
| `lyric-video-studio/src/lib/suno.ts` | `ownVariant` 리믹스 분기: 가사 글 = `provided`면 변주 가사, 아니면 `remix.lyrics` / 시간 가사 작업 번호 = `variant.suno_task_id ?? remix.task_id` / `unknown`이면 4절 1회 보충 | 가사 영상 버전 +0.01 |
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
