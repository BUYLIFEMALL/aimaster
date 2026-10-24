# 인수인계 — 0·1단계 완료 (2026-10-24~25, [역할: realty] `claude-win-20261024-realty`)

## 완료
- 0단계 사전 검증: 응답 읽기 방식 채택, 가격 칸 `dealOrWarrantPrc`(글자), 거래 코드 A1 매매·B1 전세, `isMoreData`, 지역 `cortarNo`, 창 최소화 중 `chrome.alarms` 동작 — `docs/analysis-naver-realty-collector-20261024/PREVALIDATION_20261024.md`
- 1단계: 폴더·웹 뼈대·확장 v1.01·프로그램 내 ZIP, 운영 DB 등록(준비중·요금제 3단계, `supabase/migrations/20261024000100_…`), 시험 계정 30일 권한(`…000200_…`), Vercel 프로젝트·도메인, 표준 로그인, 화면 정리.

## 검수 증거
- tsc·eslint·로컬 build 통과 · `node scripts/check-extension-release.mjs realty-listing-alert` → OK(DB v1.01 / ext v1.01 / zip v1.01)
- 운영 주소(시험 계정): 로그인 200·표준 탭, 대시보드 「설치됨 · v1.01 (최신)」(확장 실제 응답), 「확장 연결 완료」 + 설정 목록에 연결 코드 표시, 권한 없을 때 메인 소개로 차단
- 375px(내 PC, 같은 페이지 375px 틀): 메뉴 숨김·☰·1열·가로 스크롤 없음
- 서버 코드(app·lib·components·proxy) `land.naver` 0건

## 커밋·배포
- 커밋: `realty-listing-alert/` 관련 다수(경로 지정), 공용 문서는 safe-commit. 푸시는 작업 단위 끝에 모아서.
- 배포: Vercel 빌드 3회(첫 배포 → `vercel.json` framework 수정 → 표준 로그인·화면 정리), 모두 Ready.
- 미배포 대기: 메뉴 링크 밑줄 제거 `fe323f5e9`(2단계 배포 때).

## 못 한 것·주의
- 크롬 제어 도구로 네이버 부동산은 열 수 없음(안전 제한) → 네이버 쪽 시험은 주인님이 확장 버튼을 눌러 진행.
- Claude 확장이 잡고 있는 탭에서는 우리 확장의 디버거가 붙지 않음 → 새 창 일반 탭에서 시험.
- 내 PC 확인 빌드는 `NEXT_PUBLIC_*` 값을 넣어 빌드해야 로그인됨(값 없이 빌드하면 「로그인 중…」에서 멈춤).

## 다음 첫 단계
2단계 플랜(DB 표 3개 SQL + 감시 대상·예약·받는 방법 화면)을 주인님께 보여 드리고 승인받기 — `docs/IMPROVEMENT_BACKLOG.md`.

---

# 인수인계 — 2단계 완료 v1.02 (2026-10-25, [역할: realty] `claude-win-20261024-realty`)

## 완료
- 운영 DB(① `esgxyikcnnvmlhygjkth`): 표 3개 `realty_alert_targets`·`realty_alert_settings`·`realty_alert_device_status`, RLS 본인만, 10개 상한 트리거 — `supabase/migrations/20261025000100_realty_alert_tables.sql`(주인님 Run)
- 화면: 🎯 `/targets`(주소에서 단지 번호 추출, 거래 종류·가격·면적 조건, 켜기/끄기·삭제) · ⏰ `/schedule`(간격 29개, 10~50분 경고, 동작 시간대 자정 넘김) · 📨 `/delivery`(본인 텔레그램 봇 연결 시험, 「기존 부동산 봇 가져오기」 = `real-estate-sales` 봇 복사, 알림 기준·파일 형식) · 대시보드 「내 설정」 실제 값
- 공용: `lib/telegram/client.ts`(공용 사본, `check-shared-modules.mjs` 등록), 알림 머리말 `ALERT_PREFIX`(`lib/delivery.ts`) — 3단계 확장이 붙인다
- 버전 v1.02: `lib/version.ts`·manifest 1.2.0/`v1.02`·DB `programs.version`/`extension_version`(`…000200_version_v1_02.sql`, 주인님 Run)

## 검수 증거
- `npm test` 5개·tsc·로컬 build 통과
- 내 PC 서버 + 운영 DB(시험 계정, 앞에 보이는 탭에서 클릭): 중복 거절, 11번째 대상이 화면·서버·DB(오류 23514) 3곳에서 막힘, 예약 값 새로고침 뒤 유지, 알림 「모두 끄기」 거절, 375px 3화면 정상
- 운영 배포 `realty-listing-alert-21s4msgob` Ready → `check-extension-release` OK(DB v1.02 / ext v1.02 / zip v1.02), `deploy.mjs --version-only` 일치 → 운영 주소에서 3화면 클릭 확인(메뉴 밑줄 없음)

## 못 한 것·주의
- 「기존 부동산 봇 가져오기」 실제 동작: 시험 계정에 `real-estate-sales` 봇이 없어 버튼이 숨겨진 것만 확인
- 두 번째 계정으로 남의 설정 안 보이는지(RLS): 계정 필요
- 저장 중 체크칸을 잠그면 빠른 연속 클릭이 무시됨 → 마지막 값 ref + 차례 저장 큐로 고침(`DeliveryClient.tsx`·`ScheduleClient.tsx`)

## 다음 첫 단계
3단계(확장 수집 엔진) 플랜을 주인님께 보여 드리고 승인받기 — `docs/IMPROVEMENT_BACKLOG.md` 3단계.
