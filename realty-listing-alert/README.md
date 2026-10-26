# 부동산 실시간 매물 알림 (`realty-listing-alert`)

> **v1.30 운영 배포(「준비중」 배지, 공개 전)** — 2026-10-25 기준. 주소 https://realty-listing-alert.buylife.xyz · 담당 [역할: realty] Claude Code(윈도우) `claude-win-20261024-realty`.
> 기준 설계 문서: [`HANDOFF_20261024_REALTY_LISTING_ALERT.md`](../docs/analysis-naver-realty-collector-20261024/HANDOFF_20261024_REALTY_LISTING_ALERT.md) · 상세·7대 항목·버전 이력: [`AGENTS.md`](AGENTS.md) · 남은 일: [`docs/IMPROVEMENT_BACKLOG.md`](docs/IMPROVEMENT_BACKLOG.md)

## 무엇을 하는 프로그램인가
관심 단지(또는 동 단위 지역)의 **네이버 부동산 새 매물·가격 변동을 회원 PC의 크롬 확장이 회원 본인 계정으로 찾아**, 회원 본인 텔레그램·이메일·카카오톡으로 알려 준다. 공공 실거래가(`real_estate_sales`)가 아니라 **지금 올라온 매물(호가)**을 다룬다.

## 지금 들어 있는 것 (v1.26)
| 메뉴 | 내용 |
|---|---|
| 대시보드 | 🚀 시작하기 5단계(자동 판정) · 원클릭 다운로드 센터(설치 버전 대조) · 내 설정 · 최근 수집 결과 |
| 1 감시 대상 | 단지 주소 붙여 넣기 · 🏙 지역(시·도→시·군·구→읍·면·동) 상위 3·5·10단지 · 거래 종류·가격·면적 조건 · 최대 10개 |
| 2 예약 설정 | 1~24시간 간격·동작 시간대·예상 수집량 · 안전 상한(한 회차 20곳·하루 300페이지·시각 ±10%) |
| 3 받는 방법 | 📬 받는 곳(텔레그램→이메일→카카오톡) 켜기·테스트 발송 · 어떤 때 알릴지 |
| 4 수집 결과 | 결과 표(확장이 PC 안에서 직접 전달, 서버 미경유) · 📊 통계·추이(1년 보관, 관리자 지정) · 변동 기록 |
| API키등록·플랫폼연동 | 네 구역 같은 표 — ① 크롬 확장 ② 알림 받을 곳 ③ 🤖 AI 시세 요약 엔진(OpenAI·Claude·Gemini, 엔진마다 하는 일·키 끝 4자리·모델) ④ 실거래가 비교(공공데이터) |
| 매뉴얼 | 단계별 연동·사용 안내 + FAQ(카카오는 맨 뒤 「(선택)」) |

- **확장(`extension/`)**: 예약 타이머(`chrome.alarms`) → 감시 대상 수집(페이지가 불러온 응답 읽기) → 지난 결과와 비교(신규·가격 내림/오름·사라짐) → 엑셀 → 텔레그램·메일·카톡 발송. 중개사 번호(회차당 20건), 실거래 대비 %, 🔥 급매 표시(같은 단지·면적 중간값보다 10%↓), 하루 1번 AI 시세 요약(통계 숫자만 전송). 차단·확인 화면이면 그날 멈춤.
- **다운로드**: `npm run build`의 `prebuild`(`scripts/build-extension-archive.mjs`)가 `lib/version.ts` → manifest 버전을 맞추고 `public/downloads/realty-listing-alert-extension-latest.zip`을 만든다.
- **운영 상태**: DB `programs`(준비중) · Vercel `realty-listing-alert` · `check-extension-release` OK(v1.30) · 시험 계정에 개별 권한.
- **미배포 대기**: [`docs/IMPROVEMENTS.md`](docs/IMPROVEMENTS.md) 「미배포 대기」 표.

## 절대 원칙 (주인님 결정, 인수인계 §0)
- 네이버 접속·조회·스크롤은 회원 PC에서 회원 본인 로그인으로만. 우리 서버는 네이버에 요청하지 않고 매물 데이터를 받거나 저장하지 않는다.
- 회원 쿠키·비밀번호를 받지 않는다. 차단·보안 문자·확인 화면이 나오면 멈추고 알린다(우회 금지).
- 알림·AI 키는 회원 본인 것(공용 `user_api_keys`). 공공데이터 키만 없으면 운영자 공용 키 예외(최상위 규칙 문서 §8).
