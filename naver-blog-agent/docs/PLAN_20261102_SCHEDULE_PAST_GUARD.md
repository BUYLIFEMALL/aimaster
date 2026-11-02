# 2026-11-02 예약 시각 지난 원고 차단 플랜 (v2.25 예정)

작성: Claude Code(맥미니) `claude-mac-20261101-blog` [역할: mac-mini] · 주인님 승인(2026-11-02, 빌드 1회)

## 배경
첫 실제 예약 포스팅 시험(원고 `a47d1395`, 예약 03:10)에서 확장이 03:26에 원고를 가져가 03:32에 발행(예약)을 눌렀다.
네이버는 발행 창에 「현재 시간 이후로 설정해주세요.」를 띄우고 글을 올리지 않았고(주인님 「글 저장」 목록으로 확인),
확장은 새 탭의 예약 목록에서 글을 찾지 못해 `[PUBLISH_UNCERTAIN] 예약 목록을 불러오는 중입니다.`로 끝났다.
원고 저장 때만 예약 시각을 검사하고(`validateReservation`, 20분), 확장이 가져갈 때·발행 직전에는 다시 보지 않았다.

## 바꾼 것
| 위치 | 내용 |
|---|---|
| `src/lib/scheduleSlots.ts` | `reservationTooLate(row, now)` · `CLAIM_LEAD_MINUTES = 10` · 안내 문구. 10분 올림 예약 시각이 지금+10분 안쪽이거나 지났거나 읽을 수 없으면 true |
| `src/app/api/extension/task/route.ts` | 예약 원고가 늦었으면 가져가지 않고 `queued`일 때만 `failed` + 「예약 시각을 다시 정해 주세요」(빈 본문 처리와 같은 방식). 옛 확장도 서버만으로 보호 |
| `extension/background.js` | 발행 버튼 직전 같은 기준(2분)으로 다시 확인 → `RESERVATION_TOO_LATE`로 멈춤(`final_publish` 전이라 불확실 아님). 클릭 뒤 2초간 거부 경고를 보면 `RESERVATION_REJECTED`(발행 안 됨 확실)로 기록, 그 외는 기존 예약 목록 확인 |
| `extension/editor.js` | `reserveRejected` 명령: 보이는 「현재 시간 이후로 설정해」 경고 확인 |
| 시험 | `scripts/test-private-photos.cjs` 3개 추가(지난 예약 차단·충분한 예약/경계값·확장 기준), `test-extension-bridge.cjs`에 모듈 연결 |

하지 않은 것: 지난 시각을 자동으로 미래로 옮기기(회원이 고르지 않은 시각 발행 금지), 예약 목록 로딩 대기 시간 조정(이번 원인 아님, 후보로 유지).

## 검수
- 맥미니: 시험 `test-private-photos` 24개, `test-extension-results` 16, `test-editor-safety` 10, `test-publish-choice` 3, `test-prepared-publish` 5, `test-homefeed-schedule-links` 11, `test-post-review`+`queue-confirmation` 59, `test-extension-bridge`·`test-naver-publishing` 통과, `tsc --noEmit` 통과.
- 배포 뒤(맥미니): 같은 원고를 「지금+30분 이후」로 다시 예약 → ego lite 확장 v2.25로 실제 예약 → 보관함 「예약됨」 + 네이버 예약 글 확인 → 예약 취소.

## 배포(윈도우 세션 몫)
- v2.24 → **v2.25**: `src/lib/version.ts`, 확장 manifest(`2.25.0`/`v2.25`)·ZIP, DB `programs.version`/`extension_version`/`extension_download_url`, `check-extension-release.mjs` OK.
- 함께 내보낼 대기: 30일 삭제 예외 `6c8e0eb63`(첫 삭제 추정 11-07 전 필수).
- 비용: Vercel 빌드 1회(주인님 승인).
