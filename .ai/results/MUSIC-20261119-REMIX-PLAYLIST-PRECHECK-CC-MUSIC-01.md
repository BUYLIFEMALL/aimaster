# 리믹스 → 플레이리스트 연계 사전 검토 (소유권·전달 계약 중심, CC-MUSIC-01)

- 상태: **ready_review** (판정은 Master) — 배정 msg_ac69db543405
- 기준: HEAD 근처 `1df2c94ae` 이후 커밋들, 읽기만. 구현·유료 영상·빌드·운영 변경 0. 운영 DB는 표 구조·권한 규칙 조회 1회(읽기)
- SWEEP(`1df2c94ae`)과 겹치는 「무엇이 남았나」는 다시 쓰지 않고, 곡 소유권·전달 방식·호환·최소 범위만 적는다

## 1. 지금의 전달 계약 (사실)

| 단계 | 음악(SUNO) → 가사 영상 (있음) | 음악(SUNO) → 플레이리스트 (일반 곡만) |
|---|---|---|
| 보내는 쪽 | 곡 카드 `?suno=<변주 id>` · 리믹스 카드 `RemixCard.tsx:188-190` `/source?remix=<리믹스 변주 id>` | 기획 화면 `/video?suno=id1,id2…`(최대 20) — 리믹스 카드에는 링크 없음 |
| 받는 쪽 주소 읽기 | `SourceView.tsx:24-26` `suno ?? remix` 하나 | `SunoImportPanel.tsx:87` `suno`만, **미리 선택만** 하고 자동 추가 안 함(Suno 조회 비용 때문) |
| 실제로 곡을 넣는 조건 | 서버 `ownVariant`로 그 id 하나를 직접 조회 | `pickedHere = 목록 ∩ 선택` — 목록은 `listSunoTracks` = `music_tracks`의 최근 40곡 변주만(`sunoTracks.ts`). **목록에 없는 id는 선택돼도 버려짐** |
| 서버 곡 조회 | `lyric-video-studio/src/lib/suno.ts` `ownVariant`: `music_track_variants` → 없으면 `music_track_remix_variants`(+`music_track_remixes`) | `playlist-channel-studio/src/lib/sunoTracks.ts` `ownVariant`: `music_track_variants`만, 없으면 404 |
| 시간 가사 판정 | 리믹스는 `instrumental=false` 이고 `mode≠add_instrumental`일 때만 task_id·audio_id 사용, 모드 표시는 `"remix"` | `fetchSunoTimedLines`가 `music_tracks.mode === "vocal"`일 때만 허용 |

→ 결론: 플레이리스트는 **리믹스 id를 주소로 받아도 곡이 들어가지 않는다**(주소 읽기 + 목록 + 서버 조회 세 군데 모두 리믹스를 모름). 링크만 먼저 켜면 「아무 일도 안 일어남」이 된다.

## 2. 곡 소유권 (확인)

- 운영 DB 조회(읽기): `music_track_remix_variants`·`music_track_remixes` 모두 **RLS 켜짐**, 조회 정책 `auth.uid() = user_id`. 두 표 모두 `user_id` 칸 있음
- 두 프로그램 모두 서버에서 `createAdminClient()`(RLS 우회)로 읽으므로 **코드에서 `.eq("user_id", userId)`를 두 표 모두에 거는 것이 소유권의 유일한 방어선**. 가사 영상 `suno.ts`는 변주 표·리믹스 표 둘 다 user_id로 거름 → 같은 방식을 그대로 옮겨야 함(리믹스 행 조회에서 user_id 빠뜨리지 않기)
- 음악 파일은 비공개 저장소 `music-audio` → 두 프로그램 모두 1시간 서명 주소(`signed`)로만 넘김. 리믹스 변주의 `audio_url`도 같은 저장소 형식이면 같은 함수 그대로 씀
- 30일 정리: `music/app/api/cron/cleanup/route.ts:120-129`가 리믹스와 그 변주 파일을 지움 → 지워진 뒤 링크는 받는 쪽 410 「보관 기간이 지나 지워졌을 수 있습니다」(기존 문구 재사용)

## 3. 기존 연결과의 호환

- 기존 `?suno=` 흐름(기획 화면 → 플레이리스트 여러 곡)은 건드리지 않는다. 리믹스는 **별도 매개변수 `?remix=`**(가사 영상과 같은 이름)로 받아 같은 「선택」 목록에 합친다 — 섞어 쓰기(`?suno=a,b&remix=c`) 허용
- 가사 영상 쪽은 이미 완료, 수정 없음. 음악 카드의 가사 영상 링크도 그대로
- 플레이리스트의 `ams`·`fms` 경로(`api/ams/songs`, `api/fms/songs`)와 무관
- 공용 기준 코드 아님: `sunoTracks.ts`는 `SHARED_MODULES` 등록 대상이 아니고(공용은 `sunoAlign.ts` `suno-timed-lyrics`만), 가사 영상 `suno.ts`와는 「같은 규칙의 별도 파일」 → 공용 사본 동기화 영향 없음

## 4. 최소 편집 범위 (구현 배정 시)

| 프로그램 | 파일 | 할 일 |
|---|---|---|
| 플레이리스트 | `src/lib/sunoTracks.ts` | ① `ownVariant` 리믹스 대체 조회(가사 영상 `suno.ts` 54-80줄과 같은 규칙, 두 표 모두 user_id) — 반환 `mode`는 보컬 리믹스면 `"vocal"`, 아니면 `"instrumental"`로 맞춰 `fetchSunoTimedLines` 판정 재사용 ② `listSunoTracks`에 회원 본인 **완성 리믹스**(최근 N개, `music_track_remixes` + 변주) 묶음 추가 — 제목 「원곡 (방식)」, `canTime` 같은 규칙 |
| 플레이리스트 | `src/components/video/SunoImportPanel.tsx` | 87줄 주소 읽기에 `remix` 추가(같은 UUID 검사·MAX_PICK 20·미리 선택만, 자동 추가 없음 유지) |
| 플레이리스트 | `src/app/api/suno/tracks/route.ts` | 변경 없음 예상(같은 `getSunoVariant` 경유) |
| 음악(SUNO) | `components/remix/RemixCard.tsx` | 변주마다 「🎞️ 플레이리스트 →」 `https://playlist-channel-studio.buylife.xyz/video?remix=<id>` — **플레이리스트 배포 뒤에만 켬**(그 전엔 빈 동작) |
| 시험 | 플레이리스트 `tests/` | 순수 함수로 뺄 수 있는 부분(리믹스 행 → 곡 표시·`canTime` 판정)만 단위 시험. 남의 id 404는 서버 함수라 실기 확인 |

예상 크기: 플레이리스트 3파일 + 음악 1파일, 수십 줄.

## 5. 묶음 배포 조건

1. **순서 고정**: 플레이리스트 먼저 배포 → 운영에서 `?remix=<시험 계정 리믹스 id>` 동작 확인 → 그다음 음악 링크 배포. 반대로 하면 회원이 누르는 링크가 빈 동작
2. 빌드: 두 프로그램 각 1회 = 2회. 10-22 주인님 지시(「세 프로그램 중 하나를 다른 작업으로 빌드할 때 함께」)를 따르면 각자 다른 배포에 얹어 **추가 0회**도 가능 — 단 그 경우 1번 순서가 지켜지는지 확인 필요
3. 버전: 각 프로그램 배포 때 +0.01(코드·DB)
4. AI·Suno: 곡 넣기 자체는 0. 시간 가사를 켜고 넣으면 회원 본인 Suno 조회(곡당 1회) — 시험 1회는 승인 뒤

## 6. Mac 검수 방법 (생성 호출 없음)

- 시험 계정의 기존 리믹스 결과 사용(플랜 `music/docs/PLAN_20261022_REMIX_SHORTCUTS.md` §3: 매시업 `74659a7c-…`, 보컬 추가 `c39dec92-…`, 반주 추가 `d95f9ab7-…` — 30일 정리로 지워졌는지 먼저 확인)
- 맥 크롬: 음악 리믹스 카드 → 「플레이리스트」 → 곡 미리 선택됨 → 「선택한 곡 추가」 → 트랙 1개·재생 / 반주 추가는 시간 가사 칸이 비활성 / 다른 회원 리믹스 id 주소 → 목록에 안 뜨고 서버 404 / 기존 기획 화면 `?suno=` 여러 곡 그대로

## 7. 미검증·위험

- **리믹스 곡의 Suno 시간 가사**: 가사 영상 v1.12 기록에 「보컬 방식만 시간 가사」 규칙은 있으나, 리믹스 `task_id`로 `get-timestamped-lyrics`를 실제로 받아 본 결과 기록은 없음 → Suno 조회 1회로 확인 필요(회원 본인 키, 승인 뒤)
- 리믹스 변주 `audio_url`이 `music-audio` 비공개 저장소 형식인지 실제 행으로는 보지 않음(가사 영상 운영이 같은 `signed`로 동작하므로 같다고 추정)
- 목록 크기: 리믹스 묶음을 더하면 플레이리스트 곡 목록 조회가 1번 늘어남(최근 N개로 제한 권장)
