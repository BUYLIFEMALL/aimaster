# 맥미니 재검수 요청 — 이웃 소통 v1.20 (2026-11-13, [역할: blog] `claude-win-blog` → 맥미니)

맥미니 인계 [`docs/HANDOFF_20261112_MACMINI_BLOG_REVIEW.md`](../../docs/HANDOFF_20261112_MACMINI_BLOG_REVIEW.md) 「Windows 1순위」에 대한 **윈도우 회신**이다.

## 배포 완료 (승인 대기 아님)

| 항목 | 값 |
|---|---|
| 버전 | **v1.20** — 웹·확장 ZIP·DB(`programs.version`·`extension_version`) 일치, `check-extension-release` OK |
| 배포 | 주인님 승인 빌드 1회 `blog-neighbor-care-4u1h4uflh` Ready (2026-11-13) |
| 고친 것 | 미리보기 409 원인 = 회원 PC 시계(`checkedAt`)와 DB 시계(`created_at`) 직접 비교. 확장이 서버 응답의 `serverNow`로 시각 차이를 재서 `checkedAt`·`attempted_at`·화면 허가 기한을 서버 시각 기준으로 보정. **C-3 수락도 같은 문제**(허가 시각보다 PC 시각이 앞서 거절)라 함께 고침 |
| 진단 | 409 응답에 거절 코드 `code`(`BNC_*`)가 함께 온다 |
| 그대로인 것 | DB 함수, nonce, 프로필 해시, 30초 신선도, 읽기·허가 기한 — 우회·삭제 없음 |
| 근거 | [`DIAG_20261113_PREVIEW409_CLOCK.md`](DIAG_20261113_PREVIEW409_CLOCK.md), 시험 `tests/server-clock.test.mjs`(맥 1.632초 늦음 재현) |

## 맥미니가 할 일 (순서)

1. https://blog-neighbor-care.buylife.xyz/downloads/blog-neighbor-care-extension-latest.zip 을 받아 기존 확장 폴더에 덮어쓰기 → 확장 관리 화면에서 새로고침 → 팝업 버전 **v1.20** 확인(ZIP 안에 `server-clock.mjs`가 있어야 함).
2. **맥 시계·NTP는 바꾸지 않는다** — 보정이 실제로 통하는지 보는 시험이다.
3. 관리자 계정·기기 `55c19089`로 이웃 미리보기 → 확인 저장 → 답방 글 번호(`returnPostId`) 확인.
4. 허용 시간 **09~22시**에 받은 신청 수락 1건 → 네이버 화면과 프로그램 결과 대조. 결과가 불확실하면 다시 수락하지 않는다.
5. 실패하면 409 응답의 `code` 값과 시각(맥 시각·화면 캡처)을 남긴다.
6. 카페 초대 1건·Haiku 1회는 이미 성공했으니 다시 하지 않는다.

## 통과하면

윈도우가 C-3 자동 수락·답방 공감 구현을 시작한다(C-3 실물 2건 통과 전에는 착수 조건 통과로 보지 않음).
