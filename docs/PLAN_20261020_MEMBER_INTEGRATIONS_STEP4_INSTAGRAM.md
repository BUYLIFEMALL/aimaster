# 개발 플랜 — 회원 연동 정보 공용 저장 ④단계: Instagram

- 작성: 2026-10-20 Claude Code(윈도우) · 대상: ① AIMaster 운영(DB ref `esgxyikcnnvmlhygjkth`)
- 근거: 루트 `CLAUDE.md` 「회원 연동 정보 공용 저장·재사용 규칙」, [`MEMBER_INTEGRATIONS.md`](MEMBER_INTEGRATIONS.md) §5 전환 절차, ③단계 완료 후 주인님 「진행해」
- 상태: ✅ 4-1~4-4 완료(2026-10-20, 주인님 「진행해」·백필 「진행해줘」) — 결과는 [`MEMBER_INTEGRATIONS.md`](MEMBER_INTEGRATIONS.md) §6. 인플루언서·웹툰 보류

## 1. 조사 결과 (코드 기준)
| 프로그램 | 버전 | 자기 표 | 로그인 방식 | 앱 키 | 요청 권한 | 토큰 갱신 |
|---|---|---|---|---|---|---|
| INSTA 포스팅(`insta_auto_poster`) | v1.29 | `insta_accounts`(회원당 1개, `auth_method`·`page_id`) | Facebook 로그인 **또는** Instagram 로그인 | `facebook_app_id` / `meta_app_id` | 게시 | 없음 |
| 인스타 댓글(`instagram-comment-reply`) | v1.16 | `ig_accounts` | Instagram 로그인 | `meta_app_id` | basic+manage_comments | 있음 |
| 인스타 DM(`instagram-dm-reply`) | v1.15 | `dm_accounts` | Instagram 로그인 | `meta_app_id` | basic+manage_messages | 있음 |
| 숏폼(`shots`) | v1.20 | `instagram_accounts`(`page_id`) | Facebook 로그인 | `meta_app_id` | 게시(facebook 계열) | 없음 |
| 카드뉴스(`cardnews-studio`) | v1.25 | 없음 — `insta_accounts` 직접 읽기 | INSTA 연결 재사용 | — | — | — |
| 인플루언서(`ai-influencer-studio`) | v1.14 | 없음 — `insta_accounts` 직접 읽기 | INSTA 연결 재사용 | — | — | — |
| 웹툰(`ai-webtoon-studio`) | v1.14 | Instagram 기능 아직 없음 | — | — | — | — |

**Threads와 다른 점**: Facebook 로그인 토큰(`graph.facebook.com`, 페이지 ID 필요)과 Instagram 로그인 토큰(`graph.instagram.com`)은 **서로 바꿔 쓸 수 없다**. 그래서 공용 계정을 쓸 때는 권한뿐 아니라 **로그인 방식도 맞아야** 한다.

## 2. 설계
1. 공용 표 `member_platform_accounts`(platform=`instagram`)에 `auth_method`(`facebook_login`/`instagram_login`)와 `extra.page_id`를 함께 기록한다. DB 표·칸 변경 없음.
2. 기준 코드 `lib/memberIntegrations.ts`의 `getMemberAccount`에 선택 조건 `authMethod`를 추가(없으면 지금과 같음 — 하위 호환). Threads 사본 4개에는 `--sync`로 반영만 하고 재배포하지 않는다(급하지 않은 변경, 다음 배포 때 함께).
3. 프로그램마다 `memberAccount.ts` 한 개: 공용 계정(로그인 방식 + 필요한 권한 + 재연결 필요 아님 + 댓글·DM은 계정 이름 있음) → 없으면 자기 표. Threads와 같은 이중 기록·해제 연동·토큰 갱신 시 공용 표 갱신.
4. 권한은 합치지 않는다(③단계 규칙 그대로) — 다른 권한으로 다시 연결하면 그 프로그램은 자기 표 토큰으로 돌아간다.

## 3. 순서 (한 프로그램씩 빌드 → 배포 → 크롬 확인)
| 순서 | 프로그램 | 내용 |
|---|---|---|
| 4-1 | INSTA v1.30 | 콜백 2개(Facebook·Instagram 로그인) 이중 기록, 읽는 곳 공용 우선, 해제 시 공용 행 삭제 + 백필 |
| 4-2 | 댓글 v1.17 → DM v1.16 | 이중 기록·공용 우선(Instagram 로그인 + 각자 권한)·토큰 갱신 공용 반영·해제 + 백필 |
| 4-3 | shots v1.21 | 이중 기록·공용 우선(Facebook 로그인 + 게시 권한 + 페이지 ID)·해제 + 백필 |
| 4-4 | 카드뉴스 v1.26 | `getMemberInstagramAccount`를 공용 우선 → `insta_accounts`로 |
| 보류 | 인플루언서 | **다른 세션이 오늘 예약 게시(v1.15) 작업 중**(미커밋 파일 있음) — 끝난 뒤 카드뉴스와 같은 수정 |
| 보류 | 웹툰 | Instagram 기능을 만들 때 처음부터 공용 계정으로 |

## 4. 검수
- 프로그램마다 `npx tsc --noEmit`·`npm run build`(테스트 있으면 실행), 사본 검사 `node scripts/check-shared-modules.mjs`.
- 운영 DB: 백필 전후 공용 Instagram 행 수, 회원당 중복 없음, 로그인 방식 분포(크롬 SQL Editor, 주인님 승인 후).
- 크롬(관리자 계정): 각 설정 화면 연결 표시, 메인 「내 연동 정보」에 Instagram 계정 표시. **실제 게시·댓글 답글·DM 발송·연결 해제·재연결은 하지 않는다**(회원 대신 외부 행동 금지).

## 5. 비용
- 유료 API 호출 없음. Vercel 빌드 5회(순차). DB 표 변경 없음, 운영 DB 쓰기는 백필 4번(승인 필요).

## 6. 위험과 대응
- 같은 계정이 로그인 방식에 따라 다른 ID로 잡힐 수 있음 → 고유 조건 `(회원, 플랫폼, 외부 ID)`로 행이 2개 생길 수 있고, `authMethod` 조건으로 맞는 행을 고른다.
- shots는 Facebook 로그인인데 앱 키 이름이 `meta_app_id`(INSTA는 Facebook 로그인에 `facebook_app_id`) — 기존 동작이라 이번에 바꾸지 않고 `app_ref`에 실제 쓴 값을 기록, 개선 목록에 남긴다.
