# 2026-10-22 플랜 — 릴스 표지 이미지(cover_url) (shots v1.35)

주인님 승인: 「승인, 둘 다 차례로」(썸네일 v1.16 → shots v1.35, 빌드 2회, AI 0회, 실제 릴스 게시 안 함).

| 항목 | 내용 |
|---|---|
| 근거 | Meta 공식 IG User Media: 릴스 `cover_url` — JPEG, 8MB 이하, 9:16 권장(다른 비율은 가운데 9:16), 공개 주소, `thumb_offset`보다 우선 |
| 조사 | 게시 `postToInstagramAction` → `publishInstagramReel` → `createReelContainer`(영상 공개 주소·캡션만). `shots-videos` 버킷은 `video/mp4`만 허용(50MB) → JPG 불가. `shorts-images`(장면 이미지)는 공개·형식 제한 없음 |
| 저장 | `shorts-images/<회원 id>/covers/<영상 id>.jpg` 덮어쓰기. DB 칸·버킷 설정 변경 없음. 게시 때 목록에서 찾아 JPG·8MB 이하면 공개 주소 + `?v=updated_at` |
| 올리기 | 브라우저가 서버가 만든 일회용 주소(`createSignedUploadUrl(path, { upsert: true })`)로 바로 올림(영상 올리기와 같은 방식) |
| 정리 | `/api/cron/cleanup-videos`가 표지도 마지막으로 올린 지 30일 지나면 삭제 |
| 화면 | 인스타 칸(연동중) 캡션 아래 「표지 이미지 (JPG, 선택)」: 올리기·바꾸기·빼기·미리보기, 9:16 아니면 안내 |
