# 2026-10-22 플랜 — 세로 문구 길이 안내 · 문구 바뀜 표시 (thumbnail-master v1.15)

주인님 승인: 「승인, AI 호출 없이」(빌드 1회).

| 항목 | 내용 |
|---|---|
| 조사 | 길이 경고는 메인 문구만(`mainWarning`, 6단어/28자). 이미지 기록(`ImageVersion`)에 어떤 문구로 만들었는지 저장 안 됨 |
| ① | `mainWarning(main, ratio)` 세로는 4단어·띄어쓰기 뺀 12자 초과 안내, `subWarning(sub, ratio)` 세로만 띄어쓰기 뺀 10자 초과 안내. 가로 기준 그대로 |
| ② | 생성 때 `ImageVersion.main/sub` 기록(AI 수정본은 원본 문구 이어받음, `cleanSet`이 80자까지 유지). `textChanged`로 결과 칸에 「문구가 바뀌었습니다 — [다시 생성]…」. 예전 이미지(기록 없음)는 표시 안 함. DB 칸 추가 없음(`images_a/b` JSON) |
| ③ 다음 작업 | 릴스 `cover_url` 공식 확인(JPEG·8MB·9:16 권장·공개 주소). 릴스 게시는 `shots`에만 있음(`createReelContainer`) → 별도 작업 플랜 |
