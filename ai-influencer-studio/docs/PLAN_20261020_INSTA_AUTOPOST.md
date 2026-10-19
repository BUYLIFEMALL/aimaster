# 개발 플랜 — 인스타 자동 포스팅 (2026-10-20, Claude Code 윈도우)

> 대상 ① AIMaster 운영. 주인님 지시 「모든 인스타 자동화 프로그램은 자동 포스팅까지 — 기존 프로그램 로직 참고해 추가」. 순서 검토 결과 인플루언서(1) → 웹툰(2) → 4컷(3).

## 1차 v1.14 — 즉시 게시 (완료)
| 항목 | 내용 |
|---|---|
| 기준 | `cardnews-studio` v1.18 즉시 게시. 공용 게시 코드 `instagram-publish` 사본(`src/lib/instagram/publish.ts`, `--sync`로만 갱신), 연결값 읽기 `memberAccount.ts`(카드뉴스 사본 — 공용 `insta_accounts`, 새로 등록 안 함) |
| 화면 | 결과 아래 「📤 인스타그램에 게시」(`components/InstagramPublishPanel.tsx`): 연결 상태 → 사진 고르기(지금 사진 + 이전 기록, 최대 10장, 누른 순서 = 캐러셀 순서) → 캡션(선택한 캡션 탭, 2200자) → 공개 게시 확인 → 게시 |
| 사진 | 브라우저에서 JPEG(최대 1440px), 피드 비율 4:5~1.91:1 밖이면 가운데 기준 자르기(`feedImage.ts` `feedCrop`) |
| 서버 | `GET /api/instagram`(상태, 토큰 미포함), `POST /api/instagram/upload`(서명 업로드 주소), `POST /api/instagram/publish`(경로 검사 → 게시 → 임시 사진 삭제) — 모두 이용 권한 확인·`dynamic`·`fetchCache` |
| 저장소 | DB 변경 없이 INSTA 게시용 공개 저장소 `insta-post-images`의 `{회원}/influencer-insta/` — 게시 직후 삭제 |
| 비용 | 없음(실제 게시 시험 안 함) |

## 2차 — 예약 게시 (대기)
- 기준: `cardnews-studio` v1.19(예약·게시 기록·조건부 잠금) + v1.24(회원 선택 Vercel/본인 cron-job.org, 루트 `docs/SCHEDULER_POLICY.md`). 게시 기록·예약 표가 필요해 **운영 DB 표 추가(사전 승인)** 가 따른다. 예약 사진은 예약 시각까지 회원 폴더에 보관.
