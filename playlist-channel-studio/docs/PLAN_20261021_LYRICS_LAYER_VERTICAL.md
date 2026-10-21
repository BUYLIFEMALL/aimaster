# YOUTUBE 플레이리스트 자동화 — 영상 만들기에 가사 층 + 세로 9:16 (v1.17 플랜, 2026-10-21)

> 주인님 지시: AI 가사영상 자동화 완료 보고의 추가개선 3 「플레이리스트 영상에 가사를 얹는 기능 + 세로 대응」을 순서대로 진행.
> 상위 플랜: [`lyric-video-studio/docs/PLAN_20261021_V1_02_TO_V1_04.md`](../../lyric-video-studio/docs/PLAN_20261021_V1_02_TO_V1_04.md) 3-b. 대상 ① 운영. DB 구조 변경 없음(버전 값만).

## 범위
| 항목 | 내용 | 파일 |
|---|---|---|
| 곡별 가사 | 곡 목록 행마다 「가사」 버튼(.srt/.lrc/.txt) — 시간 있는 가사만 표시, 줄 수 배지·빼기. 곡을 넣을 때 같은 이름의 .srt/.lrc를 함께 고르면 자동 짝 | `components/video/MediaCenter.tsx`, `types/playlist.ts` |
| 가사 읽기 | **공용 기준 코드 `lyric-timing` 신규 등록** — 기준 `lyric-video-studio/src/lib/lyrics.ts`(형식 오류에 너그러운 .srt·.lrc, 시험 8개), 사본 `playlist-channel-studio/src/lib/lyrics.ts` | `scripts/check-shared-modules.mjs` |
| 가사 그리기 | 화면 아래쪽(위치 조절)에 지금 줄 + 다음 줄(흐리게), 강조 2종(색·노래방 채움), 크기·색 — 미리보기·MP4 같은 함수 | `lib/render/lyrics-layer.ts`, `EditorStudio.tsx` 오른쪽 패널 「가사 표시」 |
| 세로 9:16 | 내보내기 설정 「화면 모양」 가로 16:9 / 세로 9:16(1080×1920·720×1280). 세로는 배경을 잘라 맞춤(늘이지 않음), 미리보기 틀도 세로 | `ExportStudio.tsx`, `video-exporter.ts`, `EditorStudio.tsx`, `VideoStudio.tsx` |
- 하지 않는 것: 기존 가짜 스펙트럼 값(`dummyFreq`) 교체(개선 문서에 기록만), 가로 결과물 모양 변경(배경 늘이기 그대로).

## 확인·배포
`npm test`·tsc·build → 크롬(메인)에서 일반 회원으로 곡+가사 넣기 → 미리보기 가사 → 세로 MP4 만들기(짧은 시험 음원) → 결과 해상도·소리 확인 → v1.17(코드·package.json·DB) → 문서. 유료 호출 없음.
