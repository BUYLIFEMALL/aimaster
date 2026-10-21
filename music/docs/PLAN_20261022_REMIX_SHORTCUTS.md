# 개발 플랜 — 리믹스 카드 「가사 영상·플레이리스트」 바로가기 (대기)

> 2026-10-22 Claude Code(윈도우). **상태: 대기 — 주인님 지시로 「다음번 세 프로그램 중 하나를 다른 작업으로 빌드할 때 함께 빌드·시험」.**
> 따로 배포하지 않는다(빌드 비용 절약). 아래 세 프로그램 중 어느 것을 다음에 작업하든, 그 작업의 빌드·배포 때 해당 프로그램 몫을 함께 넣는다.
> 세 프로그램 몫이 모두 배포된 뒤에만 음악(SUNO)의 리믹스 카드 링크를 켠다(그 전에 켜면 「곡을 찾지 못했습니다」가 뜬다).

## 1. 왜 필요한가
- 음악(SUNO) 곡 카드에는 「🎬 가사 영상 만들기 →」(v1.22)·기획 화면에는 「🎞️ 플레이리스트 영상 만들기 →」(v1.26)가 있지만, **리믹스 결과(보컬 추가·반주 추가·매시업·스타일 커버) 카드에는 없다.**
- 링크만 붙이면 안 된다: 두 프로그램은 `?suno=<변주 id>`로 **`music_track_variants`만** 읽는다. 리믹스 결과는 **`music_track_remix_variants`**(리믹스 행은 `music_track_remixes`)에 있어 찾지 못한다.

## 2. 프로그램별 할 일
| 프로그램 | 파일 | 할 일 |
|---|---|---|
| AI 가사영상 자동화 `lyric-video-studio` | `src/lib/suno.ts`(`ownVariant`·`getSunoVariant`·`fetchSunoTimedLines`), `/source` 화면의 주소 읽기 | `?remix=<리믹스 변주 id>` 추가. `music_track_remix_variants`를 **회원 본인 것만**(`user_id` 조건, 관리자 클라이언트) 읽고, 제목=`music_track_remixes.source_title` + 방식 이름, 가사=`music_track_remixes.lyrics`(없으면 빈칸), 시간 가사=`music_track_remixes.task_id` + 변주 `suno_audio_id`(반주 추가·연주곡은 가사 없음 → 시간 가사 버튼 끔). 음악·커버는 기존처럼 서명 주소(`music-audio` 비공개). |
| 플레이리스트 채널 자동화 `playlist-channel-studio` | `src/lib/sunoTracks.ts`(`ownVariant`·`getSunoVariant`·목록), `/video` 주소 읽기 | `?remix=id1,id2…`(또는 `suno`와 섞어 쓰기) 추가. 같은 방식으로 본인 리믹스 결과 읽기. 곡 목록 화면에 「리믹스」 묶음을 보일지는 그때 결정(최소 범위는 주소로 받은 곡만). |
| 음악(SUNO) `music` | `components/remix/RemixCard.tsx` | 변주곡마다 「🎬 가사 영상 만들기 →」(`https://lyric-video-studio.buylife.xyz/source?remix=<id>`, 보컬이 있는 방식만 — 반주 추가 제외), 카드 아래 「🎞️ 플레이리스트 영상 만들기 →」(`https://playlist-channel-studio.buylife.xyz/video?remix=id1,id2`). 새 창. **두 프로그램 배포 뒤에 켠다.** |

참고 칸(2026-10-22 확인): `music_track_remix_variants` = id·remix_id·user_id·suno_audio_id·audio_url·image_url·duration_seconds·created_at / `music_track_remixes` = task_id·mode(cover·add_vocals·add_instrumental·mashup)·source_title·lyrics·instrumental.

## 3. 검수 (각 프로그램 빌드 때)
- tsc·테스트·build → 배포 → 버전 +0.01(코드 + DB `programs.version`).
- 크롬 **시험 계정**(`buylifemall@naver.com`)의 실제 리믹스 결과로 확인: 매시업 `74659a7c-471e-4288-86e5-9781e223b097`(곡 2개 177초), 보컬 추가 `c39dec92-a05b-4eab-9a31-2112fad22a8d`, 반주 추가 `d95f9ab7-a731-4c13-8d29-5eaf17dcb549`. 리믹스 변주 id는 `music_track_remix_variants`에서 `remix_id`로 조회.
  - 가사 영상: 음악·커버·제목 자동 채움, 보컬 추가 결과로 시간 가사 1회(회원 본인 Suno 키, 즉시 응답 — 승인 후).
  - 플레이리스트: 리믹스 2곡 미리 선택 → 「선택한 곡 추가」.
  - 다른 회원 리믹스 id를 넣으면 404(본인 것만).
- 비용: 각 프로그램 빌드는 「그때 하는 다른 작업」의 빌드에 포함(추가 빌드 없음). 시간 가사 시험만 Suno 조회 1회.

## 4. 남길 산출물
세 프로그램 `AGENTS.md` 버전 항목, 이 문서 상태 갱신, 각 `docs/IMPROVEMENTS.md` 항목 체크, 루트 `docs/HANDOFF.md`.
