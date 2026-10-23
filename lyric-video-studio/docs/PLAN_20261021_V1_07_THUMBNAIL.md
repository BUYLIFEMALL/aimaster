# 플랜 — v1.07 배경 그림을 유튜브 썸네일로 (2026-10-21, Claude Code 윈도우)

주인님 지시(2026-10-21): 「AI 가사영상의 유튜브 카드에도 같은 『배경 그림 → 썸네일 지정』」 — 플레이리스트 v1.23 방식을 그대로 옮긴다.

| 순서 | 내용 | 파일 |
|---|---|---|
| 1 | 썸네일 지정 서버 함수(`thumbnails.set`) — 플레이리스트 `src/lib/youtube/thumbnail.ts` 복사(공용 기준 코드는 고치지 않음) | `src/lib/youtube/thumbnail.ts` |
| 2 | `/api/youtube/thumbnail` — 기존 `guard`(권한·같은 출처·JSON 크기 제한)·`UserError`, 회원 본인 공용 유튜브 연결 토큰만(폴백 없음), JPG 2MB 이하 | `src/app/api/youtube/thumbnail/route.ts` |
| 3 | 카드: 배경 그림(`cover`)이 있고 가로 영상일 때 1280×720 JPG(가운데 잘라 맞춤) 미리보기·내려받기·「올릴 때 썸네일로 지정」(기본 켬). 업로드 끝나면 지정, 실패해도 업로드는 성공으로 두고 안내. 세로(쇼츠)는 지정하지 않음 | `src/components/studio/YoutubeUploadCard.tsx` |

검수: tsc·build, 배포 1회(Vercel 빌드 비용 1회), DB v1.07, 크롬(시험 계정 409 / 관리자 계정 미리보기 표시). AI·유료 호출 없음(유튜브 한도 50단위/회, 비용 없음).
