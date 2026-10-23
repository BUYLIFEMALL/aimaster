# 개발 플랜 — Shots 유튜브 연결 찾기 쉽게(v1.29) / 업로드 기록 남기기(v1.30) (2026-10-21 Claude Code 윈도우, 부계정)

> 주인님 승인(2026-10-21): 「1·2번 모두 진행」(DB 칸 추가 포함). 대상 운영 ① AIMaster, DB ref `esgxyikcnnvmlhygjkth`.
> 계기: 주인님 「유투브 연동 버튼이 없어 어디서 하는거야」 — 연결 버튼이 설정에 없고 영상 화면의 작은 알약 모양이라 상태 표시처럼 보임.

## 1. 연결 찾기 쉽게 (v1.29, DB 변경 없음)
- 공용 화면 조각 `src/components/youtube/YoutubeConnectCard.tsx`: 상태 크게(연결됨·채널 이름 / 만료 / 미연결) + 상태별 버튼(채널 연결하기·다시 연결하기·연결 해제) + 「댓글 권한도 함께 받기」.
- 설정 「📺 YouTube 연동」 칸 맨 위에 넣음(돌아올 곳 `/settings`). 영상 화면 만료 안내 상자에 큰 「다시 연결하기」, 알약 버튼은 테두리 버튼으로.
- 검수: 크롬에서 두 화면 확인, 연결 버튼이 구글 연결 화면으로 가는지까지(허용은 누르지 않음).

## 2. 업로드 기록 (v1.30, DB 칸 추가 — 승인됨)
- `alter table public.shorts_videos add column if not exists youtube_uploads jsonb not null default '[]'::jsonb;`
- 올릴 때마다 {videoId, url, privacy, publishAt, at} 최근 10개 저장. 기존 `youtube_video_id`·`youtube_video_url`은 최근 업로드로 유지(호환).
- 화면: 올린 기록 목록 + 「한 번 더 올리기」(같은 영상이 하나 더 올라간다는 경고).
- SQL은 크롬 Supabase SQL 편집기에서 실행, 파일 `supabase/migrations/`에 남김. 실재업로드는 주인님 확인 후.
