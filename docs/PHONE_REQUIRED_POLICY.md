# 핸드폰 번호 필수 등록 정책 (2026-10-12 주인님 지시, 모든 CLI 공통)

## 1. 규칙 한 줄
**신규 가입은 이름·이메일·핸드폰 3개가 필수이고, 핸드폰 번호가 저장된 회원만 프로그램을 쓸 수 있다(관리자 제외).** 화면에는 "전화번호"가 아니라 **"핸드폰"**으로 표기하고, **핸드폰 번호(010·011·016·017·018·019)만 유효**하다(일반 전화 02·031 등은 허용하지 않음). `01024948400`처럼 하이픈 없이 쳐도 `010-2494-8400`으로 자동 표기한다(`formatPhoneNumber`).
배경: 기존에는 핸드폰이 필수가 아니어서 가입자 239명 중 19명만 등록돼 있었다(2026-10-12).

## 2. 동작
| 상황 | 동작 |
|---|---|
| 신규 가입 | 이름·핸드폰 입력이 없으면 화면에서 막고, 화면을 우회해도 DB 가입 트리거(`handle_new_user`)가 거절한다 |
| 기존 회원이 로그인(메인 사이트) | 번호가 없으면 **"핸드폰 번호를 입력 후 사용해주세요!"** 와 이름·핸드폰 입력 폼을 띄우고, 저장해야 다음 화면으로 이동 |
| 번호가 없는 회원이 프로그램 진입 | 각 프로그램의 `requireProgramAccess()`가 메인 사이트 `/settings?need_phone=1`(안내 문구 + 핸드폰 입력)로 보내고, API는 403 + 같은 문구를 돌려준다 |
| 메인 사이트 프로그램 상세 | 번호가 없으면 상단에 안내 배너 + 등록 링크 |
| 관리자 회원 목록·상세 | "핸드폰" 열(미등록은 빨간 표시), 번호로 검색, 상세에 "미등록 (프로그램 이용 불가)" |
| 관리자 계정 | 번호가 없어도 사용 가능(관리자 항상 허용 원칙) |

## 3. 구현 위치
- 공용 규칙: 루트 `lib/utils/phone.ts`(`isValidPhone`, `hasRegisteredPhone`, `PHONE_REQUIRED_MESSAGE`). **정규식 `^01[016789]\d{7,8}$`을 바꾸면 각 서브프로젝트 access 파일의 `hasMobilePhone`과 DB 마이그레이션도 같이 바꾼다.**
- 메인 사이트: `app/(auth)/register/RegisterForm.tsx`, `app/(auth)/login/LoginForm.tsx`, `app/(dashboard)/settings/page.tsx`, `app/api/user/profile/route.ts`(이름·핸드폰 필수 검증), `app/(main)/programs/[slug]/page.tsx`(배너), `components/admin/MembersTable.tsx`·`MemberDetail.tsx`, 판정 함수 `lib/access/checkProgramAccess.ts`(`phone_required`, 판정 순서: 정지 → 관리자 → **핸드폰** → FREE → …).
- DB: `supabase/migrations/0027_profile_phone_required.sql` — 가입 트리거가 메타데이터의 이름·핸드폰을 `profiles`에 저장(예전엔 핸드폰이 버려졌음)하고 없으면 가입 거절, `profiles_phone_mobile_chk` 제약(NOT VALID: 번호는 NULL·빈칸 또는 핸드폰 형식). **관리자가 Auth에서 계정을 직접 만들 때도 `user_metadata`에 `name`·`phone`을 넣어야 한다.**
- 서브프로젝트(45개): 각 `lib/access.ts`(또는 `programAccess.ts`/`checkProgramAccess.ts`)에 같은 조건을 추가했다. 공통 사본 계열은 `evaluateProgramAccess`에 `hasPhone` 입력과 `phone_required` 이유를 넣었고, 인라인 계열은 정지 검사 바로 뒤에 `hasMobilePhone(profile.phone)` 검사를 넣었다. 확장 프로그램 토큰 인증(`naver-blog-seo-studio/lib/extensionAuth.ts`)도 같다.
- **새 프로그램을 만들 때**: `requireProgramAccess()`/`checkProgramAccessApi()`에 이 조건을 처음부터 넣는다(정지 검사 다음, FREE 검사 앞). 템플릿으로는 `image-convert-studio/src/lib/{programAccess,access}.ts`를 복사한다.

## 4. 예약·자동 실행(cron) 작업과 대기 중인 항목
- **예약·자동 실행에도 적용했다(2026-10-12, 주인님 "아직 사용자 별로 없어 진행").** 번호가 없는 회원(관리자 제외)의 예약·자동 작업은 실행하지 않는다: `stepmail`(캠페인 발송), `youtube-auto-reply`·`instagram-comment-reply`·`threads-comment-reply`(댓글 동기화), `real_estate_sales`(자동 수집·분석·발송), `booking-reminder`·`crm-google-form`(리마인드·팔로업), `kakao_auto_poster`·`trending-product-finder`(보고서·알림), `naver-cafe-poster`(예약 포스팅), `threads`·`insta_auto_poster`·`threads-affiliate-poster`(예약 게시, 전체 회원 대상 호출일 때). `threads-content-ops`는 이미 `checkProgramAccess()`를 쓰므로 자동 적용된다. 새 cron을 만들 때도 `phoneRegisteredUserIds()` 패턴(해당 route 파일 참고)을 적용한다.
- **회원 이용 중단 영향**: 번호가 없는 회원의 예약 작업은 조용히 건너뛴다(실패 기록 없음). 번호를 등록하면 다음 실행부터 정상 처리된다.
- 점검 대상에서 뺀 cron: 연결 상태 점검(`check-connection`), 이미지·초안 정리(`cleanup*`, `draft-retention`), 구독 만료 메일(`subscription-expiry`) — 회원 작업이 아니라 시스템 관리·안내용이다.
- **대기 목록 — `suno-music-studio`(Codex 작업 중)**: 판정 파일(`src/lib/access.ts`, `src/lib/programAccess.ts`)에는 핸드폰 조건이 이미 들어가 있으나(커밋됨) **버전 +0.01·DB 버전·프로덕션 배포는 Codex 작업이 끝난 뒤** 진행한다. 그 전까지 이 프로그램만 번호 없는 회원도 쓸 수 있다. Codex 작업 완료 후 할 일: ① 그 작업을 커밋 ② `version.ts`·`package.json` v1.03 ③ `update programs set version='v1.03' where slug='suno-music-studio'` ④ 배포 ⑤ 번호 없는 계정으로 차단 확인(`docs/PHONE_REQUIRED_POLICY.md` 5번).
- 소셜 로그인은 이 플랫폼에 없다(이메일·비밀번호만) — 추가하면 콜백에서도 번호를 확인해야 한다.

## 5. 검수 방법
1. 번호가 없는 테스트 회원(또는 테스트 계정의 `profiles.phone`을 잠시 NULL로)으로 `https://www.buylife.xyz/programs/<slug>`에서 배너, `/settings?need_phone=1`에서 안내 문구·입력·저장을 확인하고 **반드시 원래 값으로 복원**한다.
2. 프로그램 직접 주소로 들어가 `/settings?need_phone=1`로 이동하는지 확인한다.
3. DB 제약: `update profiles set phone='0212345678' …`이 `profiles_phone_mobile_chk`로 거절되는지 확인한다.
