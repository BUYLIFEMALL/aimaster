# 인수인계 — 무료음악 곡을 이미지 스토리 쇼츠(`shots/`) 배경음악으로 (백로그 D-6)

- 작성: 2026-11-09 [역할: music] `claude-win-20261024-music` (Claude Code 윈도우)
- 받는 사람: [역할: video] `claude-win-video` — 영상·쇼츠 담당
- 주인님 지시: 「영상 담당에게 맡길께, 인수인계 문서와 프롬프트 만들어줘」(2026-11-09)
- 함께 읽기: 같은 방식의 D-4 인수인계 `free-music-studio/docs/HANDOFF_20261109_SHORTS_BGM_FROM_FMS.md`(쇼츠 원스톱) — 2·3절 원칙과 신호 방식이 같다

## 1. 목표

YOUTUBE Shots(이미지 스토리) 자동화(`auto-shorts-posting`, 폴더 `shots/`, https://shots.buylife.xyz, 운영 v1.45)의 배경음악을, 지금의 **유료 생성(Suno V6·Lyria 3.5·ElevenLabs — 모두 회원 유료 키)** 대신 **회원이 무료음악에서 만든 곡**으로도 고를 수 있게 한다 → 회원 배경음악 비용 0원 경로.

## 2. 지금 `shots/` 배경음악 구조(코드 확인 2026-11-09)

- 화면: 대본(영상) 상세 `src/app/(dashboard)/scripts/[id]/page.tsx` 80줄 → `src/components/candidates/BgmSection.tsx`
- 서버 동작: `src/lib/actions/music.ts` — 생성 결과를 버킷 **`shots-bgm`**(공개 주소 사용) 경로 `<user_id>/<videoId>-<uuid>.mp3|wav`에 올리고, 표 **`shorts_bgm_tracks`**에 한 줄(`video_id`·`user_id`·`audio_url`(공개 주소)·`image_url`·`title`·`duration_seconds`) 넣은 뒤, `shorts_videos.bgm_selected_track_id`가 비어 있으면 그 곡으로 고르고 `bgm_status: "ready"`(같은 파일 100~130줄). 고르기 `selectBgmTrackAction`·지우기 `deleteBgmTrackAction` 있음
- **회원이 배경음악 파일을 직접 올리는 경로는 없다.**
- 30일 정리(`src/app/api/cron/cleanup-videos/route.ts`)는 보관 음성만 지우고 **배경음악 트랙 파일은 대상 아님**(15줄 주석)
- 모델 목록 `src/lib/bgmModels.ts`

## 3. 무료음악 쪽 원칙(D-4와 같음)

- 무료음악 음원은 회원 PC 엔진에만 있다. 서버가 가져올 수 없다 → **무료음악 창이 엔진에서 MP3 320k를 받아 `postMessage`로 건넨다.**
- 받는 창은 `e.origin`이 `https://free-music-studio.buylife.xyz`·`https://free-music-studio.vercel.app` 중 하나이고 `e.source === window.opener`일 때만 받는다(기준 코드 `lyric-video-studio/src/components/studio/FmsImportCard.tsx`).
- 제목이 필요하면 공용 DB `free_music_tracks`를 회원 `user_id`로 거른 **읽기만**(`lyric-video-studio/src/lib/fms.ts` `getFmsSong` 사본).

## 4. 추천 흐름(무료음악에서 시작 — 다른 네 곳과 같은 방식)

배경음악은 영상(대본)마다 고르는 구조라 「어느 영상에 넣을지」를 `shots` 쪽에서 고르게 한다.

1. 무료음악 「모든 음악」 곡 메뉴 → **「이미지 스토리 쇼츠 배경음악으로」** → 새 창 `https://shots.buylife.xyz/fms-bgm?fms=<trackId>`
2. `shots` 새 화면 `/fms-bgm`(로그인·권한 확인은 기존 대시보드와 같게): 주소의 `?fms=`를 먼저 읽고, 곡 제목을 보여 주고, **회원 본인 영상 목록**(`shorts_videos`, 최근 순)을 보여 준다. 영상이 없으면 「먼저 대본을 만들어 주세요」.
3. 화면이 뜨면 바로 `window.opener`에 **`{ type: "shots-ready", ids: [trackId] }`**를 보내 음원을 미리 받아 둔다(회원이 영상을 고르는 동안 받음 — 3분 안에 안 오면 「PC 엔진이 켜져 있는지 확인」 안내).
4. 받은 `{ type: "fms-audio", id, name, blob }`(MP3)을 메모리에 들고 있다가, 회원이 영상을 고르고 **[이 영상의 배경음악으로 넣기]**를 누르면:
   - 새 서버 동작(예: `attachFmsBgmAction(videoId, fileName, durationSec)`)이 소유자 확인 뒤 `shots-bgm`에 **일회용 업로드 주소**(`createSignedUploadUrl`, 경로 `<user_id>/<videoId>-<uuid>.mp3`)를 만들어 준다 → 브라우저가 올림 → 서버가 `shorts_bgm_tracks`에 한 줄(`title`: `<곡 제목> (무료음악)`, `duration_seconds`: 무료음악 곡 길이) 넣고 **그 곡을 고른 상태**(`bgm_selected_track_id`, `bgm_status: "ready"`)로 만든다.
   - 끝나면 「대본으로 가기」 링크(`/scripts/<videoId>`).
5. `BgmSection.tsx`에는 「🎵 AI 무료음악에서 가져오기 — 무료음악 「모든 음악」에서 곡 메뉴 → 「이미지 스토리 쇼츠 배경음악으로」」 안내 한 줄과 무료음악 링크(https://free-music-studio.buylife.xyz/library)를 둔다.

> 다른 방법(참고): `shots`에서 시작해 무료음악을 「고르기 모드」 창으로 여는 방식도 되지만, 무료음악 쪽에 고르기 모드를 새로 만들어야 해 작업이 커진다. 위 방식은 무료음악 쪽이 표에 한 줄만 더하면 된다.

## 5. 결정이 필요한 것

| 항목 | 사실 | 추천 |
|---|---|---|
| 버킷 크기·형식 | `shots-bgm` 버킷 설정(크기 상한·허용 형식)을 확인 못 함 | 영상 담당이 마이그레이션·대시보드에서 확인. MP3 320k 5분 ≈ 12MB가 들어가야 함 |
| 공개 주소 | 기존 트랙은 공개 주소(`getPublicUrl`) | 기존과 같게(렌더가 그 주소를 씀) |
| 보관 기간 | 배경음악 트랙은 지금 30일 정리 대상 아님 | 기존 생성 트랙과 같은 취급(바꾸지 않음) |
| 덤으로 「내 음악 파일 올리기」 | 직접 올리기 경로가 없음 | 같은 업로드 동작을 재사용하면 일반 파일 올리기도 거의 공짜로 생김 — 넣을지 주인님께 여쭘 |

## 6. 나눠 맡기

- **영상 담당(`shots/`)**: 4절 2~5번(새 화면 `/fms-bgm`, 업로드 서버 동작, 트랙 넣기·고르기, 안내 한 줄), 시험·tsc·버전 v1.46·배포·ego 운영 확인.
- **음악 담당(무료음악)**: `src/lib/videoHandoff.ts` `TARGETS`에 `shots: { origin: "https://shots.buylife.xyz", path: "/fms-bgm", readyType: "shots-ready" }` + MP3로 받기 + 「모든 음악」 곡 메뉴 한 줄. **영상 담당이 받는 쪽 주소·신호 이름을 확정해 알려 주면 붙인다**(D-4와 같은 시기에 함께 붙임).
- 경로·신호 이름을 바꾸면 이 문서 4절을 고치고 음악 담당에게 알린다.

## 7. 검수

1. ego 창, 시험 계정: 무료음악에서 곡 → 「이미지 스토리 쇼츠 배경음악으로」 → `/fms-bgm`에서 영상 고르기 → 넣기 → 대본 화면 배경음악에 「(무료음악)」 트랙이 골라져 있음 → 「브라우저에서 만들기」 MP4에 소리 들어감.
2. 다른 회원의 영상 번호로 넣기 시도 → 거절(소유자 확인).
3. 엔진이 꺼져 있을 때 안내.

## 8. 비용

- 개발 비용 없음(AI 호출 없음). Vercel 빌드: `shots` 1회 + 무료음악 1회(D-4와 묶으면 무료음악은 1회로 둘 다) — 배포 전 주인님 승인.
- 회원 비용: 무료(무료음악 곡). 기존 Suno·Lyria·ElevenLabs 생성은 그대로 선택 가능.
