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
