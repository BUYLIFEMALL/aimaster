# 회원 본인 cron-job.org 예약 실행 — 전체 프로그램 검토 (2026-10-19, Claude Code 윈도우)

> 확정 지침·적용 현황: [`SCHEDULER_POLICY.md`](SCHEDULER_POLICY.md) (이 문서의 §6 공통 설계는 지침으로 대체됨)

> 주인님 지시(2026-10-19): **예약 기능을 쓰려면 회원 각자 본인 cron-job.org API 키를 등록한 뒤 사용**한다(최상단 규칙 「본인 키·본인 계정」, AIMaster 구축 자원은 관리자가 지정한 프로그램만). 운영자 Vercel(Pro) 예약 호출(`vercel.json` `crons`)에 회원 기능이 기대는 곳을 전수 조사했다. **검토만 — 코드 미변경.**
> 방법: 저장소 전체 `vercel.json`의 `crons`(labs·node_modules 제외) 21개 프로그램 + 각 호출 경로 `route.ts` 설명 확인.

## 1. 결과 요약
| 분류 | 프로그램 수 | 판단 |
|---|---|---|
| A. 회원 예약 **게시·발행** | 7 | **반영 대상(1순위)** |
| B. 회원 정기 자동 작업(알림·발송·감시) | 6 | **반영 대상(2순위)** — 주인님 확인 필요 항목 있음 |
| C. 운영 정리 작업(30일 자동 삭제 등) | 10곳 | 반영 안 함(운영 정책 작업, 회원 기능 아님) |
| D. 예약 호출 없음(웹훅 방식) | 3 | 해당 없음 |

## 2. A — 회원 예약 게시·발행 (1순위)
| 프로그램 | 호출 | 하는 일 |
|---|---|---|
| `threads-content-ops` (Threads 운영 자동화) | 1분 `/api/threads-content-ops/dispatch-scheduled` | 예약 글 발행 — **플랜 작성됨** `threads-content-ops/docs/PLAN_20261019_MEMBER_CRONJOB.md` |
| `threads-affiliate-poster` (쓰레드 쇼핑제휴) | 1분 `/api/posts/dispatch-scheduled` | 예약 게시 |
| `threads` (쓰레드 자동포스팅) | 5분 `/api/posts/dispatch-scheduled` | 예약 게시(코드 주석에 cron-job.org POST 호출 지원 이미 있음) |
| `insta_auto_poster` (INSTA 포스팅) | 5분 `/api/posts/dispatch-scheduled` | 예약 게시(POST 외부 스케줄러 지원 주석) |
| `cardnews-studio` (카드뉴스) | 5분 `/api/cardnews/instagram/dispatch` | 인스타 예약 게시 |
| `naver-cafe-poster` (네이버 카페) | 5분 `/api/cron/generate-and-post` | 주기별 자동 생성+게시 |
| `kakao_auto_poster` (카카오 뉴스레터) | 5분 `/api/cron/generate-reports` | 주제별 주기(1시간~매주) 자동 생성 |

## 3. B — 회원 정기 자동 작업 (2순위)
| 프로그램 | 호출 | 하는 일 | 메모 |
|---|---|---|---|
| `stepmail` | 매시 `/api/cron/dispatch` | 단계별 메일 자동 발송 | 회원 기능 |
| `booking-reminder` | 15분 `/api/cron/reminder` | 예약 리마인더 발송 | 회원 기능 |
| `crm-google-form` | 매일 `/api/cron/followup` | 후속 연락 | 회원 기능 |
| `youtube-auto-reply` | 5분 `/api/cron/sync-comments` | 회원별 주기로 댓글 수집·자동 답글 | 회원 기능 (`check-connection` 매일 점검은 C 성격) |
| `trending-product-finder` | 5분 소싱·가격 알림, 매일 리포트 | 회원별 관심 키워드·찜 상품 알림 | 회원 기능 |
| `real_estate_sales` | 5분 `/api/collect/dispatch` | 관심 지역 실거래가 수집 → 회원별 매칭 | **확인 필요**: 수집은 운영자 무료 공공 키(최상위 규칙 예외 §8)로 지역 단위 공용 수집 → 운영자 유지가 맞을 수 있음 |

## 4. C — 반영 안 함 (운영 정리 작업)
`ai-auto-blog`·`tistory-auto-blog` cleanup-images, `naver-blog-agent` cleanup, `naver-blog-seo-studio` draft-retention, `web-crawler` purge-expired, `threads-content-ops`·`threads-affiliate-poster` cleanup-media, `trending-product-finder` cleanup-generated, `real_estate_sales` cleanup-sentiment, `youtube-auto-reply` cleanup-comments·check-connection, 메인 사이트(`vercel.json`) 구독 만료·메일 지연 점검.
→ 「생성 데이터 30일 후 자동 삭제」 등 **운영 정책을 지키는 작업**이라 회원 키에 맡기면 안 됨(회원이 연결을 안 하면 삭제가 안 되는 문제).

## 5. D — 해당 없음
`instagram-comment-reply`, `instagram-dm-reply`, `threads-comment-reply` — `crons` 비어 있음(웹훅 방식).

## 6. 공통 설계 제안 (한 번 만들어 전 프로그램 재사용)
1. **공용 연동값**: cron-job.org 키는 `user_api_keys` provider `cronjob_org_api_key`로 **한 번 등록 → 모든 프로그램이 재사용**(회원 연동 정보 공용 저장 규칙). 운영 DB 허용 목록에 값 추가 필요(DB 변경, 승인 사항).
2. **공용 기준 코드**(SHARED_FEATURE_MAP 등록): `cronJobOrg.ts`(작업 생성·조회·삭제 — 키트 `labs/kit-threads/lib/cronJobOrg.ts` 기반) + **회원 전용 실행 토큰**(무작위, DB엔 해시만) + 회원별 실행 주소(그 회원 작업만 처리). 다회원 사이트라 사이트 비밀값 `CRON_SECRET`을 회원 cron-job.org에 넣지 않는다.
3. 프로그램마다: 설정 화면 「⏰ 예약 실행 연결」(키가 이미 있으면 「연결하기」 한 번), 예약 버튼에서 미연결 시 안내, 운영자 Vercel 호출은 **관리자 지정 프로그램만** 회원 글을 처리(지정 해제 시 미연결 회원 글은 발행 안 함 + 안내).
4. 회원 cron-job.org 계정에는 프로그램마다 작업 1개(같은 키). API 하루 100회는 연결·상태 확인에만 쓰여 충분.

## 7. 주의·비용
- 회원 cron-job.org가 부르는 주소도 **운영자 Vercel 함수**에서 실행된다 → 함수 실행 비용은 그대로 운영자 몫이고, 회원 수만큼 호출이 늘어난다(지금은 1분 1회로 전원 처리). 이 변경의 효과는 비용 절감이 아니라 「회원 본인 계정으로 돌린다」는 규칙 준수다.
- 전환 시 이미 예약해 둔 글이 있는 회원은 연결 전까지 발행이 멈출 수 있음 → 공지·유예 기간 필요(현재 `threads-content-ops`는 예약 글 0건 확인).
- cron-job.org 무료 계정의 작업 수·실행 간격 제한은 공식 문서로 추가 확인 필요(미검증).

## 8. 추천 진행 순서
1. 공용 기준 코드 + 운영 DB 허용 목록 → `threads-content-ops`(플랜 완료) 1차 적용·검수
2. A의 나머지 6개 순차 적용(한 번에 하나씩 배포)
3. B는 주인님 확인(특히 `real_estate_sales`) 후 진행
