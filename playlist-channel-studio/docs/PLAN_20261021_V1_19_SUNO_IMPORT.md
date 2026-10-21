# YOUTUBE 플레이리스트 자동화 v1.19 플랜 — 음악(SUNO) 자동화 곡 여러 개를 시간 가사와 함께 가져오기 (2026-10-21)

> 주인님 지시: 가사영상 v1.06 보고의 추가개선 3 「플레이리스트 자동화에도 같은 Suno 곡 가져오기를 넣으면, 여러 Suno 곡을 시간 가사와 함께 한 번에 플레이리스트 영상으로」.
> 대상 ① 운영(DB ref `esgxyikcnnvmlhygjkth`). DB 구조 변경 없음(음악 표 읽기 + 버전 값).

| 항목 | 내용 | 파일 |
|---|---|---|
| 곡 목록 | 회원 본인의 완성된 보컬·인스트루멘탈 곡(`music_tracks`, `user_id`로 거름) — 플레이리스트는 연주곡도 쓰므로 둘 다 | `src/lib/sunoTracks.ts`, `GET /api/suno/tracks` |
| 여러 곡 고르기 | 변주마다 체크 → 「선택한 곡 추가(N)」 → 순서대로 음악을 1시간 서명 주소로 받아 곡 목록 끝에 추가(최대 20곡/회) | `components/video/SunoImportPanel.tsx`, `MediaCenter.tsx` |
| 시간 가사 | 「Suno 시간 가사도 받기」 켜면 보컬 곡마다 회원 본인 Suno 키로 1번씩 조회 → 곡의 가사 층(v1.17)에 바로 연결. 이번 접속에서 받은 곡은 다시 부르지 않음. 실패·키 없음이면 가사 없이 곡만 추가하고 이유 표시 | `POST /api/suno/timed-lyrics` |
| 공용 기준 코드 | 단어 → 줄 변환을 **`suno-timed-lyrics`** 로 등록(기준 `lyric-video-studio/src/lib/sunoAlign.ts`, 사본 `playlist-channel-studio/src/lib/sunoAlign.ts`) | `scripts/check-shared-modules.mjs`, `docs/SHARED_MODULES.md`·`SHARED_FEATURE_MAP.md` |

비용: Vercel 빌드 1회, 검수 Suno 시간 가사 조회 1회(시험 계정 본인 키). 확인: tsc·시험·build → 배포 → 크롬 일반 회원으로 2곡 선택 추가(1곡 시간 가사) → 곡 목록·가사 배지·미리보기 가사.
