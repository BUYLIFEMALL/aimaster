# 인수인계 — Claude Code 세션 2026-10-12 3부 (핸드폰 필수 정책 · 등급/프리미엄 과금 정책)

앞부분: 1부 `HANDOFF_CLAUDE_SESSION_2026-10-12.md`, 2부 `HANDOFF_CLAUDE_SESSION_2026-10-12_PART2.md`(이미지 변환·웹툰·카드뉴스·뮤직비디오). 이 문서는 그 뒤의 **플랫폼 정책 작업 3건**을 한곳에 모았습니다. 코드·DB는 모두 커밋·푸시·배포까지 끝났고, 남은 것은 아래 "대기·미확인"입니다.

## 1. 한눈에
| # | 작업 | 상태 | 핵심 문서 |
|---|---|---|---|
| A | **핸드폰 번호 필수 등록 정책** (메인 사이트 + 서브프로그램 45개 + cron 13개) | 완료·배포 | `docs/PHONE_REQUIRED_POLICY.md`, 루트 `CLAUDE.md` 원칙 15번 |
| B | **회원 등급·프로그램 과금 정책 매뉴얼** | 완료(문서) | `docs/GRADE_AND_BILLING_POLICY.md`, 원칙 16번 |
| C | **프리미엄 뱃지 + 권한 강제** (DB 트리거) | 완료·검증, **실제 프로그램엔 미적용(결제 연동 전)** | 위 B 문서, `supabase/migrations/0030`, `0031` |
| D | 프로그램명 변경 "뮤직비디오 스튜디오"→"뮤직비디오 자동화"(v1.02) 및 썸네일 | 완료 | `music-video-studio/README.md` |

## 2. A. 핸드폰 번호 필수 정책 (2026-10-12 주인님 지시)
**규칙**: 신규 가입은 이름·이메일·핸드폰 필수. 핸드폰 번호가 저장된 회원만 프로그램 이용(관리자 제외). **핸드폰만 유효**(010·011·016·017·018·019, 일반 전화 불가, 정규식 `^01[016789]\d{7,8}$`), 화면 표기는 "핸드폰", `01024948400`→`010-2494-8400` 자동 표기. 번호 없는 회원은 로그인 때 "**핸드폰 번호를 입력 후 사용해주세요!**" + 이름·핸드폰 입력 폼을 보고, 저장해야 이동.
- **메인 사이트**(커밋 `88f2dff1`): `lib/utils/phone.ts`(공용 규칙·문구), 가입 `RegisterForm`, 로그인 `LoginForm`(입력 폼), 설정 `settings/page.tsx`(`/settings?need_phone=1`), `app/api/user/profile/route.ts`(이름·핸드폰 필수 검증), 프로그램 상세 배너(`programs/[slug]/page.tsx`), 관리자 회원 목록·상세(핸드폰 열·미등록 표시·검색), 판정 함수 `lib/access/checkProgramAccess.ts`(`phone_required`, 순서: 정지→관리자→**핸드폰**→FREE→…).
- **DB**(`0027_profile_phone_required.sql`): 가입 트리거 `handle_new_user()`가 name·phone 메타데이터를 `profiles`에 저장하고 없으면 가입 거절(예전엔 트리거가 이름만 넣은 프로필을 먼저 만들어 화면의 핸드폰이 버려졌다 — `ERROR_LESSONS.md`), 형식 CHECK 제약 `profiles_phone_mobile_chk`(NOT VALID: NULL·빈칸 또는 핸드폰 형식). **관리자가 Auth에서 계정을 직접 만들 때도 user_metadata에 name·phone 필요.**
- **서브프로그램**: 판정 파일 일괄 수정(공통 사본 계열은 `hasPhone` 입력 + `phone_required` 이유, 인라인 계열은 정지 검사 직후 `hasMobilePhone` 검사) — 44개 버전 +0.01·재배포·DB 버전 반영(`0028_phone_policy_version_bumps.sql`), 확장 4개(`naver-blog-agent`·`ai-auto-blog`·`naver-blog-seo-studio`·`tistory-auto-blog`)는 확장 버전·ZIP까지 동기화하고 `check-extension-release` 통과. 확장 토큰 인증 `naver-blog-seo-studio/lib/extensionAuth.ts`에도 적용.
- **예약·자동 실행(cron) 13개**(커밋 `7900dd61`, `0029`): 번호 없는 회원(관리자 제외)의 작업은 조용히 건너뜀 — stepmail, 댓글자동화 3종, real_estate_sales, booking-reminder, crm-google-form, kakao_auto_poster, trending-product-finder, naver-cafe-poster, threads/insta/affiliate 예약 게시(전체 회원 대상 호출일 때). `threads-content-ops`는 `checkProgramAccess` 사용으로 자동 적용. 헬퍼 `phoneRegisteredUserIds()`는 각 route 파일 안에 있다.
- **영향**: 2026-10-12 기준 회원 237명 중 핸드폰 보유 19명 → **약 218명은 다음 로그인 때 번호를 등록해야 프로그램을 쓸 수 있다**(공지 권장).
- **검증**: 번호를 비운 테스트 계정(buylifemall@naver.com)으로 배너·`/settings?need_phone=1`·배포된 프로그램 직접 접속(`image-convert-studio`, `shots`)의 차단과 저장 후 정상 진입, 일반 전화 거부, 자동 하이픈, DB 제약 거절을 확인(끝나면 원래 번호로 **복원함** — 이 계정을 다시 시험할 때도 반드시 복원). 타입 검사 통과.
- **알려진 한계/주의**: ① 신규 가입 실제 화면 실행은 계정 생성 불가라 미확인(배포 번들·DB 규칙으로만 확인) ② 관리자 회원 목록·상세 화면은 관리자 계정이 아니라 미확인 ③ `suno-music-studio`는 **Codex 작업 중이라 판정 파일만 커밋, 버전·배포 보류(작업 대기)** — 그 사이 이 프로그램만 번호 없는 회원도 사용 가능 ④ 소셜 로그인은 현재 없음(추가 시 콜백에서도 확인).
- **suno 대기 목록(Codex 완료 후)**: 그 작업 커밋 → `version.ts`·`package.json` v1.03 → `update programs set version='v1.03' where slug='suno-music-studio'` → 배포 → 번호 없는 계정으로 차단 확인.

## 3. B. 등급·프로그램 과금 정책 (2026-10-12 주인님 설명)
등급 4종(DB `member_grades`): **일반**(일반 이상이어야 사용 자격, 쓸 프로그램은 관리자가 사용자별로 권한·기간 부여) / **실버**(차후 여러 세트 구매 유료 사용자용, 미확정·구현 금지, 0명) / **골드(드림팀)**(이커머스 수강생, 기본 6개월, 프로그램·기간 제한 예정) / **VIP(드림AI팀)**(AI 수업 수강생, 기본 1년 전체 예정). 현황: 237명 = 일반 127·골드 24·VIP 86, `user_program_access` 약 8,947행 수동 부여. 판정은 "등급 ≥ 최소 등급 AND 사용기간 부여"라 등급만으로는 안 열린다.
- **최상위 규칙(본인 계정·본인 API 키)은 이 정책보다 위이며 불변.**
- **프리미엄 프로그램**: 운영자에게 실비가 나가는 프로그램(고정 IP·자체 서버·검색엔진/키워드 도구·큰 서버 용량/트래픽)은 **골드·VIP도 월결제로 별도 사용**. 결정(주인님 답변): 목록=**나중에 결제 연동 후 직접 지정**, 유예=**없음(뱃지 다는 즉시)**, 금액=**미정(연동 후 결정, 기본 `monthly` 요금제 출발)**, 결제=**매달 결제(자동 갱신 아님)**, 등급 할인·골드 제한 기준·실버 정의는 미확정(임의 구현 금지).
- 후보와 근거(코드 확인): `threads-affiliate-poster`·`threads-content-ops`(Fixie 고정 IP), `web-crawler-saas`(자체 크롤링 서버), `competitor-analysis`·`longtail-keyword-expander`(검색엔진·키워드 도구/운영자 한도), 그 외 확인 필요 항목(website-scraper, real-estate-sales, shots, cardnews-studio·emotion-writer(저장소), music-video-studio(영상 중계), stepmail·booking-reminder)는 `GRADE_AND_BILLING_POLICY.md` 3번.
- 원칙 16번은 루트 `CLAUDE.md`에 있고, 새 프로그램 기획 시 운영자 비용이 나가는지 판단해 프리미엄 후보로 기록하는 규칙이다.

## 4. C. 프리미엄 뱃지 + 권한 강제 (구현·검증 완료, 실사용은 결제 연동 후)
- **지정 방법**: 관리자 프로그램 편집(또는 목록 일괄 뱃지)에서 **"💎 프리미엄"** 뱃지 → `programs.badges`에 `premium`(DB 제약 `0030_premium_badge.sql`). UI 파일: `components/ui/Badge.tsx`·`admin/ProgramForm.tsx`(프리미엄 선택 시 FREE 자동 해제)·`ProgramsAdminBoard.tsx`·`programs/ProgramCard.tsx`·`types/database.types.ts`.
- **소개 페이지 안내**: 뱃지가 있으면 "서버·트래픽 비용으로 드림팀·드림AI팀도 월 단위 소정의 사용료 결제" 문구가 자동 표시, 뱃지를 떼면 사라짐. 문구는 `lib/programs/premium.ts`. 실화면 확인함(임시로 달았다 뗌).
- **권한 강제**(`0031_premium_enforcement.sql`, DB 적용·검증 완료): 뱃지를 다는 순간 그 프로그램의 기존 무료 권한(`user_program_access`)이 무효(만료일을 과거로, 원래 값은 `premium_prev_expires_at`, `premium_suspended=true`), 이후 부여·만료일 수정도 무효, 달 때 FREE 자동 제거·등급 미지정이면 일반 등급 채움, **뱃지를 떼면 마지막으로 의도한 만료일로 복원**. 결제 구독·관리자 영향 없음, 유예 없음, 서브프로젝트 코드 수정 없음. 트리거 `programs_premium_badge`(programs), `user_program_access_premium_guard`(user_program_access), 내부 표식 `app.premium_internal`.
- **검증**: 임시 프로그램(`zz-premium-test`, 삭제함)으로 달기→무효·FREE 제거·등급 채움 / 무효 상태에서 재부여→계속 무효 / 떼기→복원 확인. 현재 프리미엄 뱃지 프로그램 **0개**, 정지된 권한 0건, 권한 8,947건 그대로.
- **주의**: 뱃지를 달면 해당 프로그램의 골드·VIP 회원이 즉시 못 쓰게 되므로 **달기 전에 회원 공지**. 뱃지를 단 프로그램의 관리자 권한 부여 화면에서는 만료일이 과거로 보인다(정상). 결제(구독) 연동은 아직 없다 — 구독이 생기면 판정(`subscriptions` active)으로 열린다.
- **도구 권한 메모**: 이 DB 변경(권한 일괄 수정 함수)은 처음 도구 권한 검사에서 거부되어 주인님 승인 뒤 적용했다. 비슷한 변경은 미리 승인받는다.

## 5. D. 그 밖에
- `music-video-studio` 이름 변경(v1.02)과 카탈로그 썸네일(`0002_thumbnail.sql`), 이전 항목은 2부 문서. 뮤직비디오↔Suno 음악기획 연계는 **나중 고도화로 확정**(2부 3번).

## 6. 대기·미확인 (다음 사람이 할 일)
1. `suno-music-studio` 핸드폰 정책 버전·배포(Codex 완료 후, 위 2번 절차).
2. 신규 가입 화면 실행 확인, 관리자 회원 목록·상세·프로그램 편집(프리미엄 뱃지 선택·저장·FREE 해제) 화면 확인(관리자 계정으로).
3. 번호 없는 회원 약 218명에게 공지(로그인 시 번호 등록 필요).
4. 결제 연동 후: 프리미엄 프로그램 목록·월 금액 확정 → 뱃지 부착(공지 선행) → 구독 결제 흐름 검증. 등급 할인·골드 제한 기준·실버 정의는 주인님 확정 후.
5. 이월: 올인원 실생성 점검, 도메인 SSO 확대, Supabase Pro 결정(2026-10-20 이전) 등은 1부 문서.

## 7. 커밋 참고
`88f2dff1`(핸드폰 정책 메인+44개) · `415c995c`(0028) · `7900dd61`·`4452fa83`(cron 13개, 0029) · `96b7d604`~`6b9cea7e`(등급·과금 매뉴얼) · `6439c7b8`(프리미엄 뱃지, 0030) · `75b8f54c`~`66bb2adc`(0031 작성·결정 반영) · `5f9b5e9b`(0031 완료 반영).
