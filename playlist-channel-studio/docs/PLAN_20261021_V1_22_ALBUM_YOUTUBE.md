# 플레이리스트 v1.22 플랜 — 앨범 커버 스타일 배경 + 유튜브 바로 올리기 (2026-10-21)

> 주인님 지시: v1.20 보고 추가개선 1·2·3 「진행해」. 1·3은 이 프로그램(v1.22), 2(음악 기획 목록에서 여러 기획 곡 넘기기)는 음악 폴더를 다른 세션이 작업 중이라 끝난 뒤 별도. 대상 ① 운영, DB 구조 변경 없음.

| # | 항목 | 내용 | 파일 |
|---|---|---|---|
| 1 | 앨범 커버 스타일 | Suno 패널 「커버 배경 모양」: 흐린 커버+가운데 원본(기존) / 앨범 커버 — 커버를 위로 올리고 아래 가운데에 제목(비우면 곡 제목)·채널명 글자(긴 글자는 자동 축소) | `SunoImportPanel.tsx` |
| 3 | 유튜브 바로 올리기 | 가사영상 v1.04 업로드 카드를 옮김: 공용 사본 `youtube/client.ts`(youtube-upload-client)·`memberIntegrations.ts`(member-integrations) 등록, `youtube/account.ts`·`/api/youtube/status`·`/api/youtube/upload-session`(최대 8GB), 카드 `YoutubeUploadCard.tsx`(기본 비공개·예약 공개, 제목 「[Playlist] 첫 곡 외 N곡」, 설명 = 곡별 시작 시각 챕터). 크롬은 MP4를 파일로 바로 저장하므로 「저장한 MP4 고르기」, 결과 데이터가 있으면 바로 사용 | `ExportStudio.tsx` 외 |

비용: Vercel 빌드 1회, AI 0회. 실제 업로드는 시험 계정 유튜브 미연결이라 연결 안내·거절(409)까지 확인.
