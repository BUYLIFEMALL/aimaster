# 관리자 정책 지침 (ADMIN_POLICY_GUIDELINES.md) — 메인 지침 / 인수인계

> 2026-10-12~13 주인님과 진행한 **관리자 페이지의 회원·등급·권한·사용기간·핸드폰·프리미엄 정책**을 한 곳에 모은 문서입니다.
> 루트 `CLAUDE.md` 핵심 원칙 17번이 이 문서를 가리킵니다. 등급·권한·사용기간·핸드폰·프리미엄·관리자 회원/권한 화면을 건드리는 작업은 **반드시 이 문서를 먼저 읽습니다**.
> 세부 이력은 `docs/GRADE_AND_BILLING_POLICY.md`(등급·과금), `docs/PHONE_REQUIRED_POLICY.md`(핸드폰), `docs/HANDOFF.md`(작업 현황판)에 있습니다. 이 문서는 **추가만** 합니다(기존 내용 삭제 금지).
> 최상위 규칙(회원은 본인 계정·본인 API 키)은 이 문서보다 위에 있습니다 — `docs/TOP_RULE_PERSONAL_ACCOUNT_API.md`.

## 1. 회원 등급 (4종)
| 등급 | 의미 | 프로그램 권한 방식 |
|---|---|---|
| 일반 | 일반 이상이어야 사용 자격. 쓸 프로그램은 관리자가 사용자별로 권한·기간 부여 | **수동 부여** (등급 표의 체크는 실제 권한이 아님) |
| 실버 | 차후 여러 세트 구매 유료 사용자용. **미확정, 구현 금지**(현재 0명) | 수동 부여 |
| 골드(드림팀) | 이커머스 수강생, 기본 **180일(6개월)** | **자동 부여**(`auto_grant`) |
| VIP(드림AI팀) | AI 수업 수강생, 기본 **365일(1년)** | **자동 부여** |

## 2. 접근 판정 순서 (모든 판정 코드 공통, 변경 금지)
정지 → 관리자 → **핸드폰 등록**(없으면 차단, 관리자 제외) → **FREE 배지** → 결제 구독 → (최소 등급 미지정 시 허용) → 등급 ≥ 최소 등급 **그리고** `user_program_access` 사용기간 → 그 외 차단.
- 등급만으로는 열리지 않는다. 권한 판정은 `user_program_access`(회원별 부여)가 기준이다.
- 위치: 루트 `lib/access/checkProgramAccess.ts`, 각 서브프로젝트 `lib/access.ts`(`requireProgramAccess`/`checkProgramAccessApi`). **판정 코드는 이번 작업들로 바꾸지 않았다**(아래 모든 기능은 DB·관리자 화면에서 처리).

## 3. 핸드폰 정책 (마이그레이션 0027·0034, 상세 `PHONE_REQUIRED_POLICY.md`)
- 신규 가입 필수: 이름·이메일·핸드폰. 핸드폰이 없는 회원은 프로그램 사용 불가, 로그인 때 "핸드폰 번호를 입력 후 사용해주세요!" + 입력 폼.
- **핸드폰 번호(010·011·016·017·018·019)만 유효**(일반 전화 불가). 화면 표기는 "전화번호"가 아니라 **"핸드폰"**.
- **표기 통일**: 11자리 `010-1234-5678`, 10자리 `011-123-4567`. `lib/utils/format.ts`의 `formatPhoneNumber` + **DB 트리거 `profiles_phone_format`**(어떤 경로로 저장해도 자동 변환, 유효하지 않은 값은 그대로).
- 점검: `select email, phone from profiles where phone is not null and phone <> '' and phone !~ '^01[016789]-\d{3,4}-\d{4}$';` 가 비어 있어야 한다.
- 2026-10-13 기준 번호 등록 31명 / 미등록 약 209명. `sleh0716@gmail.com`은 원래 입력 `010-4876-079`(자리수 오타 가능) → `010-487-6079`로 변환됨, **본인 재확인 필요**.

## 4. 등급별 프로그램 자동 부여 (마이그레이션 0032)
- 관리자 > **접근 권한 관리**(`/admin/access-matrix`): 위 "등급별 자동 부여 · 사용기간" 패널 + 아래 **등급×프로그램 표**.
  - 표에서 프로그램을 체크하면, `auto_grant`가 켜진 등급(골드·VIP)의 회원 전원에게 `user_program_access` 행이 자동 생성된다(DB 트리거 `grade_program_access_sync`).
  - 체크를 풀면 **자동 부여분만 회수**(`grant_source='grade'`), 관리자가 직접 준 권한은 유지.
  - 회원의 등급을 바꾸면(`profiles.grade_id`) 이전 등급 자동분 회수 + 새 등급 프로그램 자동 부여(트리거 `profiles_grade_change_sync`).
  - 표 각 등급 줄에 **전체 선택/해제 체크박스**(확인창 후 한 번에, `set_programs` 사용).
- 패널: 등급별 자동 부여 on/off, **기본 기간(일)**, **"지금 등급 회원 전원에 적용"**(`apply_grade_programs`, 이미 있는 부여는 두고 없는 것만 추가), **일괄 연장**(+N일 / 특정 날짜로 전원 지정, `extend_grade_access`; 무기한·프리미엄 정지분 제외, 수동 부여도 연장됨).
- 자동 부여 만료일 = **부여한 날 + 기본 기간(회원마다 따로 계산)**. 이미 있는 부여는 덮어쓰지 않는다(ON CONFLICT DO NOTHING).
- 도입 시점(2026-10-13) 기존 수동 부여 약 9천 건은 **건드리지 않았다**(자동 부여분 0건에서 시작).

## 5. 사용기간 — 일괄 + 사람별 (마이그레이션 0033)
- 등급 지정일: `profiles.grade_assigned_at`(등급이 바뀔 때 DB가 자동 기록). 기존 골드·VIP는 "현재 만료일 − 기본 기간"으로 보정 → **전원 2026-10-12**(실제 승급일과 다를 수 있음, 필요 시 회원별 실제 승급일을 받아 반영).
- 회원 관리 > 회원 선택 > **"사용만료기간 설정" 팝업**(`SetExpiryModal`, API `POST /api/admin/user-access`의 `mode`):
  1. `set` — 만료일 직접 지정(선택한 모두 같은 날짜) / 무제한(평생) / 빠른 설정(1·2·3·6개월·1년·평생)
  2. `extend` — **각자의 현재 만료일에서 N일 연장**(사람마다 각자 기준, 음수는 단축, 무기한은 그대로, 이미 만료된 건 오늘부터) = **개별 추가 연장**
  3. `anchor` — **각자의 등급 지정일 + 등급 기본 기간**(사람마다 다른 만료일)
- 팝업을 열면 그 회원이 **지금 사용 가능한 프로그램이 미리 체크**된다(`GET /api/admin/user-access?user_ids=`): 유효한 부여 + 자동 부여 등급이면 등급 프로그램. 일반·실버는 실제 부여만. 여러 명을 선택하면 공통으로 가진 프로그램만. 프로그램 목록 위에 **"선택 N / 전체 M"** 표시.
- 주의: 미리 체크된 프로그램을 그대로 두고 저장하면 그 프로그램들의 만료일이 새 값으로 바뀐다 — 기간만 바꿀 프로그램만 체크 상태로 둔다.

## 6. 프리미엄 프로그램 (마이그레이션 0030·0031, 상세 `GRADE_AND_BILLING_POLICY.md`)
- 운영자에게 실비(고정 IP·자체 서버·검색엔진/키워드 도구·큰 용량/트래픽)가 나가는 프로그램은 골드·VIP도 **별도 월결제**. 관리자가 프로그램에 **"💎 프리미엄" 뱃지**를 다는 순간 FREE 뱃지 자동 제거, 최소 등급 "일반" 채움, 기존 부여는 만료일을 과거로 만들어 효력 정지(원래 만료일은 `premium_prev_expires_at`에 보관, 뱃지를 떼면 복원), 이후 신규 부여도 같은 방식으로 정지(DB 트리거). 소개 페이지에 안내 문구 자동 표시/제거.
- **결제 연동 전이라 실제 프로그램에는 아직 프리미엄 뱃지를 달지 않았다**(연동 후 주인님이 직접 지정, 유예 없음·매달 결제·금액 미정). 후보: threads-affiliate-poster, threads-content-ops, web-crawler-saas, competitor-analysis, longtail-keyword-expander 등. 미확정: 등급 할인, 골드 제한 기준, 실버 정의.
- 새 프로그램을 기획할 때 운영자 비용이 나가는지 판단해 프리미엄 후보로 기록한다.

## 7. 집계·표시 규칙 (관리자 화면)
- **비공개(`programs.is_active=false`) 프로그램은 사용 가능 권한의 개수·목록·미리 체크에서 제외**한다(DB 부여는 그대로, 공개로 바꾸면 되살아남). 프로그램 선택 목록·접근 권한 표는 공개 프로그램만 보여준다(2026-10-13 기준 공개 50개 / 전체 52개).
- 회원 목록의 "사용만료기간 (N개)"은 **프로그램 단위**로 센다 — 같은 프로그램에 구독과 부여가 같이 있으면 1개, 더 늦게 끝나는 쪽(평생 우선)이 실제 만료일. 목록 만료일 = 개수 계산에 쓰인 프로그램 중 가장 이른 만료일(평생만 있으면 "평생").
- 결제 연동 전: 활성 구독은 **0건**이 정상이다. 출시 전 무료(PRELAUNCH_FREE, 0원) 구독 1건(`phk043051@gmail.com`, Threads 콘텐츠 운영 자동화)은 2026-10-13 `cancelled`로 정리했다(기록은 삭제하지 않음).

## 8. 관리자 화면 구성 (2026-10-13 확정)
- 왼쪽 메뉴 순서: …회원 관리(사용권한/기간) → **접근 권한 관리** → **등급 관리** → 쿠폰 관리 … (`components/layout/adminNavItems.ts` 한 곳을 관리자 사이드바와 메인 헤더의 관리자 팝업 메뉴가 같이 쓴다).
- 회원 관리 화면 오른쪽 위 버튼 **"프로그램 접근권한관리"** — 전체·일반·실버·골드·VIP·미배정 **어느 탭에서나** 보이고 접근 권한 관리 화면으로 이동한다. 특정 등급 탭에서는 그 옆에 "[등급] 카테고리에 회원 추가/이동"이 함께 보인다.
- 등급 탭 안의 "사용 프로그램 설정" 팝업은 **만들었다가 주인님 지시로 삭제**했다(접근 권한 관리 화면 한 곳으로 일원화) — 다시 만들지 않는다.
- 접근 권한 표·사용기간 패널의 글자는 줄바꿈 없이 한 줄(`whitespace-nowrap`), 날짜 입력·결과 메시지는 같은 줄에 둔다.
- 이 화면들은 다크 관리자 테마이며(웹 서브프로그램의 흰색 베이스 규칙과 별개), 시험은 `buylifemall@gmail.com`(관리자)으로 실제 Chrome에서 한다. 운영 회원 데이터를 바꾸는 버튼은 시험으로 누르지 말고 팝업은 열기만 하거나 롤백 가능한 DB 시험(트랜잭션 후 예외로 되돌리기)을 쓴다.

## 9. 코드·DB 위치 (한눈에)
- 마이그레이션: `0027`(핸드폰 필수·가입 트리거) `0028·0029`(핸드폰 정책 버전) `0030`(프리미엄 뱃지) `0031`(프리미엄 강제) `0032`(등급 자동 부여: `member_grades.auto_grant/default_access_days`, `user_program_access.grant_source/granted_grade_id`, 함수 `apply_grade_programs`·`extend_grade_access`, 트리거 `grade_program_access_sync`·`profiles_grade_change_sync`) `0033`(`profiles.grade_assigned_at`) `0034`(핸드폰 표기 `format_mobile_phone`·트리거).
- API: `app/api/admin/grade-access`(GET 등급 프로그램, POST `policy`·`apply`·`extend`·`set_programs`·`preview`), `app/api/admin/user-access`(GET 사용 가능 프로그램, POST 부여/기간 `mode`, DELETE), `app/api/admin/access-matrix`(표 개별 체크 토글).
- 화면: `app/admin/access-matrix/page.tsx`, `components/admin/{AccessMatrixManager,GradeAccessPolicy,SetExpiryModal,MembersTable}.tsx`, `app/admin/members/page.tsx`(집계), `app/admin/members/[id]/page.tsx`.
- 경고: 같은 저장소를 여러 CLI가 동시에 쓴다. 커밋은 **경로를 지정**(`git commit -- <경로>`)하고, 남의 변경을 스테이징하지 않는다. 다른 CLI가 내 작업 폴더 변경을 자기 커밋에 함께 올리는 일이 실제로 있었다(메뉴 순서 변경이 `e6d021f6`에 포함됨).

## 10. 점검 쿼리 (Supabase `esgxyikcnnvmlhygjkth`)
```sql
-- 등급별 체크 수와 자동 부여 건수
select g.name, g.auto_grant, g.default_access_days,
       count(*) filter (where a.can_access) checked,
       (select count(*) from user_program_access u where u.granted_grade_id=g.id and u.grant_source='grade') auto_rows
from member_grades g left join grade_program_access a on a.grade_id=g.id
group by g.id order by g.sort_order;
-- 활성 구독(결제 연동 전에는 0이 정상)
select count(*) from subscriptions where status='active';
-- 핸드폰 표기 이상
select email, phone from profiles where phone is not null and phone<>'' and phone !~ '^01[016789]-\d{3,4}-\d{4}$';
```

## 11. 2026-10-13 시점 운영 데이터 현황 / 남은 일
- 회원 239명(일반 125·실버 0·골드 25·VIP 89). 일반·실버·VIP 등급 표가 **공개 프로그램 50개 전체 체크** 상태이고(주인님이 "전체 선택"으로 지정), VIP는 자동 부여가 켜져 있어 신규 280건이 이미 부여됨(365일). 골드는 19개 체크, 자동 부여 0건.
- **골드 25명**: 체크된 프로그램 중 미부여 권한이 남아 있을 수 있음 → 목록 확정 후 "지금 등급 회원 전원에 적용" 실행(주인님 확인 후).
- 실제 승급일 확보 후 `grade_assigned_at` 보정, `sleh0716@gmail.com` 핸드폰 재확인, 번호 미등록 약 209명 안내, 결제 연동 후 프리미엄 지정·금액 결정, 회원 상세 화면(`MemberDetail`)에도 "선택 N / 전체 M"·미리 체크가 필요한지 결정.
- 미완료 검증: 사람별 `extend`/`anchor` 모드로 **실제 저장**해 사람마다 다른 만료일이 들어가는지 확인(운영 데이터라 시험하지 않았음 — 테스트 회원으로 확인할 것), 접근 권한 표 전체 선택/해제 체크박스 실제 클릭 시험.

## 2026-10-13 추가 — 골드 회원별 사용 가능 프로그램 수가 다른 이유와 조치
- **원인 1(조치함)**: 골드 22명 중 5명(yourownworld2·korvia001·heony.cmc·dmsrhb13·ohj8724)은 등급 프로그램 21개 중 1개(`web-crawler-saas` 4명, `booking-reminder` 1명)가 빠져 있었다. 등급 표에 체크는 돼 있었으나 이 회원들에게는 적용되지 않은 상태("지금 등급 회원 전원에 적용" 대기분). 같은 회원의 기존 등급 부여분과 같은 만료일(2027-04-10)·`grant_source='grade'`로 5행을 추가했다. 이후 골드·VIP에서 누락 0건 확인.
- **원인 2(그대로 둠)**: 등급 부여분 외에 **자동 부여 정책 이전에 수동으로 넣은 개별 부여(`grant_source` 비어 있음)** 가 회원마다 6~19개씩 달라 총 개수(26~40)가 다르다. 정책상 수동 부여는 유지하므로 삭제하지 않았다. 골드 회원을 모두 같은 21개로 맞추려면 수동 부여 정리 여부를 주인님이 정해야 한다(삭제성 작업이라 미실행).
- 점검 쿼리: 등급 프로그램 중 회원에게 유효한 부여가 없는 건수 = `profiles ⨝ grade_program_access`에서 `user_program_access` 없는 행 (일반 등급은 수동 부여 방식이라 대상 아님).

## 2026-10-13 추가 — 골드·VIP 수동 부여 삭제, 등급 프로그램만 부여 (주인님 지시)
- **골드(드림팀)·VIP(드림AI팀) 회원의 수동 개별 부여(`grant_source`가 `grade`가 아닌 행)를 모두 삭제**하고 등급 프로그램만 남겼다. 삭제 전 백업 테이블 `backup_gold_manual_grants_20261013`(816행·22명), `backup_vip_manual_grants_20261013`(4,382행·92명)에 보관(복구가 필요하면 이 표에서 되살린다. RLS 켬, 서비스 롤 전용).
- 결과: 골드 22명 전원 정확히 21개, VIP 92명 전원 정확히 57개(=공개 프로그램 전부). VIP는 "모든 프로그램 사용 가능 등급"이므로 `grade_program_access`에 빠져 있던 공개 프로그램 2개(`allinone-graphic`, `playlist-channel-studio`)를 추가했다(등급 자동 부여 트리거가 회원에게 즉시 반영). **새 공개 프로그램을 만들면 VIP 등급 표에 체크하는 것을 잊지 않는다.**
- 일반·실버는 기존대로 수동 부여 방식이며 이번에 건드리지 않았다. 관리자 화면의 개별 부여·기간 설정 기능도 그대로다(기능 제거 아님).
- **프리미엄 우선 원칙(주인님 재확인)**: 나중에 프리미엄 뱃지를 다는 프로그램은 골드·VIP 등급 표에 체크돼 있어도 **프리미엄(유료결제)이 우선**한다. 이미 DB 트리거(`programs_premium_badge`, `user_program_access_premium_guard`, `grade_program_access_sync`)로 구현돼 있어, 뱃지를 다는 순간 기존 부여는 효력 정지(만료일을 과거로, 원래 값은 `premium_prev_expires_at`에 보관)되고 이후 등급 자동 부여분도 같은 방식으로 정지된다. 뱃지를 떼면 복원된다. 별도 코드 수정은 필요 없다.
