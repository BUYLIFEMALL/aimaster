# 플랜 — 카카오 바로 연결 + 표·보관·매뉴얼 개선 (v1.17, 2026-10-25)

주인님 지시: 「진행해」(남은 작업 ① 카카오 바로 연결), 「이전 가격 오르면 파란 ▲, 내리면 빨간 ▼, 그대로면 변동 없음」, 「통계 누적데이터 기간 늘려야」「기본 1년」「중개사 번호 지우지 말고 유지」, 「이메일 설정 부분에 숙지할 내용 명시」「우측에 Resend 가입 버튼」, 「카카오톡 본인 계정 등록·연동 방법을 쉽고 단계별로 매뉴얼에」.

## 1. 카카오 바로 연결
- 문제: 카톡 받기는 「카카오 자동화」 프로그램에서만 연결할 수 있었다(그 프로그램 권한이 없는 회원은 못 씀).
- 구현: 받는 방법 카드에서 ① 회원 본인 카카오 앱 REST API 키·Client Secret 저장(공용 `user_api_keys` `kakao_rest_api_key`/`kakao_client_secret` — 카카오 자동화와 같은 이름) ② 돌아올 주소 복사 안내 ③ 「💬 카카오 연결하기」 → 카카오 동의 → `app/api/kakao/callback/route.ts`가 로그인·state(쿠키 대조)·이용 권한 확인 후 토큰 교환, 공용 연결 계정 `member_platform_accounts`(kakao, `talk_message`, app_ref = REST 키)에 저장 → 두 프로그램이 함께 씀.
- 회원이 할 일: 카카오 개발자 → 내 앱 → 카카오 로그인 → Redirect URI에 `https://realty-listing-alert.buylife.xyz/api/kakao/callback` 추가.
- 원칙: 회원 본인 앱·키·계정만(운영자 공용 앱 없음), 토큰은 서버에만, DB 표 변경 없음.

## 2. 그 밖의 묶음
- 가격 변동 칸(`app/results/PriceChange.tsx`): 오름 파란 ▲ · 내림 빨간 ▼ · 그대로 ➖ 변동 없음 · 🆕 · 👋 — 결과 표·변동 기록 표.
- 보관(관리자 지정, `docs/TOP_RULE_PERSONAL_ACCOUNT_API.md` §8): 통계 요약·변동 기록 1년(중개사 번호 포함), `unlimitedStorage`, 기간 선택 1개월/3개월/6개월/1년.
- 이메일 카드 안내 상자(무료 한도·받는 주소·스팸함·보내는 때·보안) + Resend 가입 버튼, 매뉴얼 「💬 카카오톡으로 알림 받기」 6단계·막혔을 때.

## 3. 검수·비용
- 시험 41개(카카오 3 추가)·tsc·eslint·build → 배포 → DB v1.17·`check-extension-release` → 크롬 화면 확인. 실물 카카오 연결은 주인님 Redirect URI 추가 뒤.
- 비용: 빌드 1회(승인 3회 중 마지막). AI 호출 없음.
