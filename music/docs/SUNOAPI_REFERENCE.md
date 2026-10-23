# sunoapi.org API 레퍼런스 (2026-10-21 문서 기준)

> 2026-10-21 Claude Code(윈도우). 주인님 지시: 「https://docs.sunoapi.org/ api 관련 문서니 자세히 읽고 작업에 참고」, 「Suno 엔진이 6.0으로 업그레이드됨 — 엔드포인트·모델 호출·스키마를 최신으로, 6.0에서 추가·확장 가능한 기능도 참고」.
> 목차 원본 https://docs.sunoapi.org/llms.txt 의 56쪽을 읽고 `lib/ai/suno.ts`와 대조했다(읽기만, 실제 호출 없음). 실제 응답으로 확인하지 않은 항목은 §7에 표시.
> Suno 본사는 공개 API 키를 주지 않는다. 회원이 sunoapi.org에서 발급받은 **본인 키**로 sunoapi.org를 거쳐 Suno를 호출한다.

- 요청 주소 `https://api.sunoapi.org`(빠른 시작 문서 기준. 각 페이지 OpenAPI 블록에는 `https://apibox.erweima.ai`), 파일 업로드 주소 `https://sunoapiorg.redpandaai.co`
- 인증 `Authorization: Bearer <회원 본인 키>`, 응답 `{ code, msg, data }`(성공 `code: 200`)
- 비동기: 요청하면 `data.taskId` → 결과는 콜백 또는 `record-info` 조회

## 1. 모델 (https://docs.sunoapi.org/suno-api/generate-music)
| 모델 값 | 상태 | 설명 | 최대 길이 |
|---|---|---|---|
| `V6` | **현재·기본값(권장)** | 표현력, 자연스러운 보컬, 풍부한 디테일 | 문서에 없음 |
| `V6_WILD` | 현재 | 더 대담하고 실험적인 표현 | 문서에 없음 |
| `V6_MINI` | 현재 | 가볍고 빠름 | 문서에 없음 |
| `V5_5` | **지원 종료** | 개인 취향 맞춤 | — |
| `V5` | 지원 종료 | | — |
| `V4_5PLUS` · `V4_5ALL` · `V4_5` | 지원 종료 | | 8분 |
| `V4` | 지원 종료 | | 4분 |
- 지원 종료 = 「하위 호환용, 새 연동은 V6 계열」. 실제 차단 날짜는 문서에 없음.
- **곡 연장·업로드 연장은 원곡과 같은 모델**이어야 한다.

### 글자 수 (customMode: true)
| 모델 | prompt(가사) | lyrics | style | negativeTags | title |
|---|---|---|---|---|---|
| V4 | 3000 | — | 200 | 문서에 없음 | 80 |
| V4_5~V5_5 | 5000 | — | 1000 | 문서에 없음 | 80 |
| V6 계열 | (lyrics 대신) | 5000 | 1000 | 1000 | 80 |
- title: 생성 80자, 연장·업로드 연장 100자, 업로드 커버·매시업 80자. customMode false의 prompt는 3000자.
- `duration` 10~360초, 문서상 기본 **20초**, customMode true + V5_5·V6 계열에서만 동작.

## 2. POST /api/v1/generate — 곡 생성
필수: `customMode`, `instrumental`, `model`, `callBackUrl`.
| 항목 | 의미 |
|---|---|
| `prompt` | customMode true: 그대로 **가사**로 불림(lyrics가 있으면 lyrics 우선) / false: 곡 아이디어(가사 자동, 3000자) |
| `lyrics` | V6 계열 5000자, customMode true에서 가사로 최우선 |
| `style`, `title`(80), `negativeTags` | customMode true 전용(style·lyrics·negativeTags 중 하나는 필수) |
| `vocalGender` | `m`·`f`, 확률을 높일 뿐 보장 아님 |
| `styleWeight`·`weirdnessConstraint`·`audioWeight` | 0~1. audioWeight는 보컬 없으면 미지원 |
| **`variety`** | **새 항목** 정수 0~4(기본 1): 0 끔·1 보통·2 높음·3 대담·4 최대 |
| `personaId`·`personaModel` | `style_persona`(기본)·`voice_persona`(Suno Voice ID). V5·V5_5·V6 계열 |
| `duration` | 10~360초 |
| `imageUrls`·`videoUrls`·`audioUrls` | customMode false 전용 첨부(이미지 5장·영상 1개·오디오) |
- customMode false에서는 custom 전용 값을 보내면 안 됨. 한 요청에 보통 2곡. 생성 파일 **14일** 보관.

## 3. 콜백 (https://docs.sunoapi.org/suno-api/generate-music-callbacks)
- POST JSON, **15초 안에 200**을 돌려줘야 함(구간 교체 10초). 3번 연속 실패하면 전송 중단. **같은 taskId로 여러 번 올 수 있어 중복에 안전하게(idempotent)** 처리하라고 명시.
- `callbackType`: `text` → `first` → `complete`, 실패는 `error`. 바로 complete가 올 수도 있음.
- 성공 `data.data[]`: `id`(audioId), `audio_url`, `stream_audio_url`, `image_url`, `prompt`, `model_name`, `title`, `tags`, `duration` … (`source_audio_url`은 지원 종료, 만료 시 Recovery Audio)
- 콜백 코드: 200 성공 / 400 파라미터·내용 위반 / 451 파일 다운로드 실패 / 500 서버 오류
- **서명·검증 장치는 문서에 없음**(출처 확인 권고 문장만).

## 4. 상태 조회·오류 코드
- `GET /api/v1/generate/record-info?taskId=` → `status`: `PENDING`·`TEXT_SUCCESS`·`FIRST_SUCCESS`(진행) / `SUCCESS` / `CREATE_TASK_FAILED`·`GENERATE_AUDIO_FAILED`·`CALLBACK_EXCEPTION`·`SENSITIVE_WORD_ERROR`(실패). `response.sunoData[]` 항목은 문서상 **snake_case**(`audio_url` …).
- WAV `GET /api/v1/wav/record-info`(`successFlag`, `response.audioWavUrl`)
- **보컬·스템 분리 `GET /api/v1/vocal-removal/record-info` 이제 있음**(`successFlag`, `response.vocalUrl`·`instrumentalUrl`·`originData[]`)
- 요청 응답 코드: 200 / 400 파라미터 / 401 인증 / 404 경로 / **405 호출 한도** / 413 너무 김 / **429 크레딧 부족** / **430 빈도 과다** / 455 점검 / 500. (일부 페이지는 429를 호출 한도로 표기 — 문서끼리 엇갈림.) 커버·매시업 콜백 501 실패·531 실패(크레딧 환불).

## 5. 부가 기능 (V6 시대에 넓힐 수 있는 것)
| 기능 | 엔드포인트 | 핵심 |
|---|---|---|
| 곡 연장 | POST `/api/v1/generate/extend` | 필수 `audioId`·`model`·`callBackUrl`. `prompt`·`lyrics`는 **가사**, `continueAt`, title 100자, variety·가중치·persona, 원곡과 같은 모델 |
| 업로드 커버(리믹스) | POST `/api/v1/generate/upload-cover` | `uploadUrl` **또는** `taskId`+`audioId`(우리 저장소 복사본 없이 가능), 음원 8분 이하, `duration` 정수 |
| 업로드 연장 | POST `/api/v1/generate/upload-extend` | |
| 보컬 추가 / 반주 추가 | POST `/api/v1/generate/add-vocals` / `add-instrumental` | 반주에 AI 보컬 / 보컬에 반주 |
| 매시업 | POST `/api/v1/generate/mashup` | 두 곡 섞기 |
| 구간 교체 | POST `/api/v1/generate/replace-section` | 10초 이상·원곡 50% 이하 구간 다시 만들기 |
| 가사 생성 | POST `/api/v1/lyrics` | prompt 200자 |
| **타임스탬프 가사** | POST `/api/v1/generate/get-timestamped-lyrics` | `taskId`+`audioId`, 콜백 없이 즉시 `alignedWords[]`(word·startS·endS)·`waveformData[]` — 가사 영상·노래방 자막 |
| 보컬·스템 분리 | POST `/api/v1/vocal-removal/generate` | **`taskId`+`audioId` 둘 다 필수**(또는 `audioUrl` 20MB). `separate_vocal` 10크레딧 · `split_stem` 최대 12트랙 50크레딧 · `split_stem_advanced` 20크레딧. 다시 요청해도 매번 과금 |
| MIDI | POST `/api/v1/midi/generate` | 분리 결과로 MIDI |
| WAV | POST `/api/v1/wav/generate` | `taskId`+`audioId` |
| 커버 이미지 | POST `/api/v1/suno/cover/generate` | 곡 작업당 1회, 보통 2장 |
| 뮤직비디오 | POST `/api/v1/mp4/generate` | `taskId`+`audioId` |
| 페르소나 | POST `/api/v1/generate/generate-persona` | 곡의 목소리·스타일을 `personaId`로 저장해 재사용 |
| Suno Voice | `/api/v1/voice/*` | 회원 목소리 등록(`ko` 지원) → `voice_persona` |
| 스타일 부스트 | POST `/api/v1/style/generate` | 스타일 설명 다듬기 |
| 효과음·루프 | POST `/api/v1/generate/sounds` | |
| 오디오 링크 복구 | POST `/api/v1/suno/recovery` | 만료된 재생 링크 새로 받기 |
| 남은 크레딧 | GET `/api/v1/generate/credit` | |
- 크레딧 단가는 스템 분리 3종만 문서에 있음(나머지 https://sunoapi.org/billing). 요청 한도 숫자·V6 최대 길이는 문서에 없음.
- 보관 기간: 생성·업로드 연장·보컬/반주 추가·매시업·구간 교체·스템·MIDI·커버 14일 / 연장·업로드 커버·WAV·뮤직비디오·가사 15일 / 업로드 파일 3일 → **결과는 바로 자체 저장소로 복사**(현재 구현대로).

## 6. 현재 `lib/ai/suno.ts`와의 차이 (2026-10-21 조사 시점)
| 순위 | 위치 | 문제 | 조치 |
|---|---|---|---|
| 🔴1 | `DEFAULT_SUNO_MODEL = "V5_5"` | 지원 종료, 현재 기본 V6 | V6 전환 + 모델 선택. 연장은 원곡 모델 그대로(`tracks.ts`가 이미 그렇게 함) |
| 🔴2 | 연장 요청 | `defaultParamFlag`가 문서에 없음, `prompt`가 이제 **가사**인데 영어 지시문(`buildExtendDirection`)을 보냄 → 그대로 불릴 위험 | 실제 결과 확인 후 정리 |
| 🔴3 | MR 요청 | `taskId`+`audioId` 둘 다 필수인데 `audioId`만 보냄 | 원곡 `task_id` 함께 |
| 🔴4 | 웹훅 | 15초 안에 200을 못 줄 수 있음(커버 생성·파일 복사를 응답 전에 함) → 재시도로 중복 처리·회원 키 이중 과금 위험 | 즉시 200 + 뒤에서 처리, 처리 전 잠금 |
| 🟠5 | 상태 조회 | 문서는 snake_case, 코드는 camelCase만 읽음 | 두 표기 모두 |
| 🟠6 | 생성 요청 | `duration` 미지정 → 문서상 기본 20초 | 실제 길이 확인 |
| 🟠7 | 리믹스 | `customMode`는 스키마에 없음, `taskId`+`audioId` 지정 가능 | 정리 |
| 🟡8~11 | 형식·오류 안내·글자 수·빠진 파라미터(`variety` 등) | | 보완 |
| ✅ | WAV·크레딧·MR 콜백·Bearer·자체 저장 | 문서와 일치 | |
