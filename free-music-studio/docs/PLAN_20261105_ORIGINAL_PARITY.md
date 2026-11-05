# 플랜 — 원본(boks-music) 기능 옮기기 묶음 (2026-11-05)

주인님 지시(2026-11-05): 원본 소개 영상 화면을 함께 보며 「기능적인 부분은 참고」, 「원래 프로그램 소스 안에 기능 다 구현되어 있어」, 「다시 소스 자세하게 분석한 후에 필요한 기능 참고해서 구현해봐」.

- 원본: https://github.com/boksajang/boks-music — 로컬 사본 `D:/PDS/Program_dev/free-music-src/repo`(읽기만, 실행하지 않음). 2026-11-05 `7bedda7`(0.1.0-beta.5)로 맞춤.
- beta.3 이후 바뀐 것: beta.4 앨범 그림 다시 만들면 새 그림이 바로 보이게(주소에 파일 이름), beta.5 음악 가져오기 여러 파일 한 번에(이름순·숫자 크기순, 못 읽는 파일은 건너뛰고 알림, 플레이리스트에서 가져오면 순서대로).
- 화면은 똑같이 따라 하지 않는다. 기능과 동작 규칙만 가져온다.

## 1. 원본 기능 전체 대조 (electron/main.mjs 명령 67개)

| 분류 | 명령 | 우리 처리 |
|---|---|---|
| 이미 있음 | generate, lyrics, planInstrumentals, savePreset, albumArt, deleteTrack, exportTrack, revealTrack, moveTracks, create/rename/deleteProject, create/rename/deletePlaylist, addToPlaylist, removeFromPlaylist, reorderPlaylist, cancelJob, installModel, refreshSystem, pickProjectFolder, copyText | 그대로 |
| 묶음 1 | (cover 흐름: App.tsx `cover()`) | **완료(미배포)** 아래 2절 |
| 묶음 2 환경설정 | installRecommended, cacheUsage, clearCaches, refreshModels | 엔진 0.6.9 |
| 묶음 3 화면 | updateTrackText, exportAlbumArt(+앨범 그림 올리기), trackWaveform, saveDraft, dismissJob, discardLyricsResult | 홈·2단·곡 상세·「…」 메뉴 |
| 묶음 4 휴지통 | trashTracks, restoreTracks, purgeTracks (`trash.mjs`) | 엔진 + 사이트 |
| 묶음 6 Stem | stems, exportStems, stemWaveform (`prepare_stems.py`·`multi_stems.py`) | 모델 이용 조건 확인 뒤 |
| 묶음 5 CLI 작사 | chooseAgent, refreshCodex, installImageModel (`claude.mjs`·`codex.mjs`·`cli-billing.mjs`) | 약관 확인 뒤 |
| 로드맵 6~8 | mastering, alignLyrics, saveLyricTiming, applyLyricTimingFile, exportLyricTiming, dismissLyricConfirmation, renderPlaylistVideo, resumeVideo, deleteVideo, revealVideo, exportVideoSubtitles, getVideoTemplates, selectVideoBackground, videoDestination, getVideoPreflight, saveVideoPresets | 각 단계 |
| 하지 않음 | extractYoutube, finalizeYoutube, discardYoutube | 남의 음원 내려받기 — 저작권·약관 위험(11-03 결정 유지) |

## 2. 묶음 1 — 내 곡에서 바로 커버 (2026-11-05 구현, 미배포 대기)

원본 `App.tsx` `cover(track)`: 원곡의 제목 + 「 · Cover」, 가사·스타일·프리셋·연주곡 여부를 채우고 `parentId`를 기록. 원곡 파일은 보관함 것을 그대로 씀.

- 「모든 음악」 곡 줄 「커버 →」(보관함에 음원이 있는 곡, 비상업용 곡은 숨김) → `/import?from=<id>` + sessionStorage `fms.coverSource`.
- 「가져온 음악」: 엔진 `GET /library/<id>`로 원곡을 받아 그대로 커버 작업에 넘김(서버로 안 감, 엔진 변경 없음). 「원곡의 멜로디에서 시작 — 제목 ×」, 제목 「제목 · Cover」, 스타일·가사 자동, 이 프로그램으로 만든 곡은 권리 확인 자동 체크.
- 곡 기록 `free_music_tracks.parent_id`(원곡 지워지면 연결만 비움) — 마이그레이션 `supabase/migrations/20261105_tracks_parent.sql`. **배포 전에 운영 DB에 먼저 적용해야 함**(목록 API가 이 칸을 읽음).
- 대기열로 만든 커버도 엔진이 곡 정보를 그대로 돌려줘 `parent_id`가 기록됨(`QueueTrack.parent_id`).
- 원본은 커버에 원곡 앨범 그림을 복사한다(main.mjs 466). 우리는 엔진 표지 복사가 필요해 묶음 3에서 함께 처리.

## 3. 다음 묶음 순서

1. 묶음 2 — 환경설정(엔진 0.6.9): 추천 구성 전체 카드(음악·커버·Stem·가사 정렬·영상), 한 번에 받기, 필요 공간 합계, 엔진·정밀도 고르기 한 곳, 시스템 정보 표, 기본 생성 개수·금지어·「음악 만든 뒤 앨범 그림 자동」 계정 저장, 캐시 사용량·비우기, 엔진 시작 때 30일 지난 작업 기록 정리.
2. 묶음 3 — 홈·곡 만들기 2단·프로젝트 화면(이름 변경·삭제·음악 가져오기 여러 파일)·곡 카드(원곡/커버/연주곡·원곡 표시·「…」 메뉴 컴포넌트, 곡 상태에 따라 항목)·곡 상세 패널·제목/가사 수정·앨범 그림 올리기·AI 가사 결과 창(최근 20개, 계정 저장, 30일)·AI 작곡 기획 한 줄 창→바로 대기열·플레이리스트 추가 창(새로 만들어 추가)·대기열/재생 목록 오른쪽 패널(단계·경과·남은 시간)·좌측 메뉴 접기·상단 엔진 상태·재생바 음량.
3. 묶음 4 — 휴지통(`trash.mjs` 규칙: 넣은 시각만 표시, 되살리면 원래 프로젝트, 프로젝트 지우면 곡은 휴지통, 완전 삭제 때 링크 폴더·보관함 밖·모델 폴더는 절대 안 지움).
4. 묶음 6 — Stem 추출(2개 BS-RoFormer `model_bs_roformer_ep_317_sdr_12.9755.ckpt` / 6개 `FractalSurfer/BS-RoFormer-SW-6stem`) — **상업 이용 조건 먼저 확인**.
5. 묶음 5 — Claude Code·Codex 작사(구독 로그인만 허용, API 키 환경변수 제거, 도구 끔) — **약관 먼저 확인**.
6. 로드맵 6 마스터링 → 7 가사 시간(한 줄씩 / 전체 들으며, 확인 필요 줄만, 고칠 때마다 저장, LRC/SRT 불러오기 확인 창, `lyric-video-studio` 코드 재사용) → 8 영상(장면 37종·스펙트럼 16종·색 3, 곡 하나씩 그려 엔진 ffmpeg로 잇기, 반복은 다시 그리지 않음, 탭 닫힘 대비 이어 만들기).

## 4. 비용
- 묶음 1: AI 호출 0회, 빌드 0회(미배포 대기). 운영 DB 칸 추가 1건(승인 필요).
- 묶음 2·3: 배포 때 빌드 각 1회 — 그때 승인받음. 설치 파일은 이 PC에서 만들어 무료.

## 5. 처음 설정·매일 조작
- 묶음 1: 처음 설정 0단계 추가, 커버 만들기 조작 「파일 고르기」 1번 줄어듦, 동의 0번.
