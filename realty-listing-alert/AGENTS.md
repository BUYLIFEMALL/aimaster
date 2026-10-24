# AGENTS.md — AI 부동산 매물 알림 자동화 (`realty-listing-alert`)

- 주소: https://realty-listing-alert.buylife.xyz (Vercel 프로젝트 `realty-listing-alert`, 팀 `buylife`) · 운영 DB ① AIMaster `esgxyikcnnvmlhygjkth`
- 담당: [역할: realty] Claude Code(윈도우) `claude-win-20261024-realty` — 역할 파일 [`docs/roles/realty.md`](../docs/roles/realty.md)
- 기준 인수인계(설계·결정의 원본): [`docs/analysis-naver-realty-collector-20261024/HANDOFF_20261024_REALTY_LISTING_ALERT.md`](../docs/analysis-naver-realty-collector-20261024/HANDOFF_20261024_REALTY_LISTING_ALERT.md) · 0단계 결과 [`PREVALIDATION_20261024.md`](../docs/analysis-naver-realty-collector-20261024/PREVALIDATION_20261024.md)
- 지금 상태: **v1.02 2단계(DB 표 3개 + 감시 대상·예약·받는 방법 화면) 운영 배포 완료(2026-10-25), 「준비중」 배지, 공개 전.** 시험 계정 `buylifemall@naver.com`에만 개별 권한 30일(2026-10-24). **정식 공개는 테스트에서 정상 동작이 확인된 뒤 주인님이 정한다**(그때 배지 떼기 + VIP 자동 부여).
- 미배포 대기: 없음(메뉴 밑줄 제거 `fe323f5e9`는 v1.02에 함께 배포).

## 🚨 절대 원칙 (주인님 결정, 인수인계 §0 — 바꾸지 않는다)
1. 네이버 부동산 접속·조회·스크롤은 **100% 회원 PC에서 회원 본인 로그인**으로. 텔레그램·이메일·AI 키도 회원 본인 것.
2. **우리 서버는 네이버에 요청을 보내지 않고, 매물 데이터를 받지도 저장하지도 않는다.** 회원 쿠키·비밀번호도 받지 않는다. 서버는 설정·권한·매뉴얼·다운로드·수집 규칙 파일만.
3. 1단계 크롬 확장, 2단계 PC 프로그램(Electron). 휴대폰은 텔레그램으로 받기만.
4. 별도 기본 프로그램(프리미엄 아님). 수집 간격 10·20·30·40·50분, 1~24시간(10~50분은 계정 제한 경고). 감시 대상 최대 10개, 예약 켜기/끄기·동작 시간대는 회원이(참고 `real_estate_sales` 모니터링 설정).
5. 차단·보안 문자·확인 화면이 나오면 멈추고 알린다(우회 금지). 중개사 전화번호 등 개인 정보는 모으지 않는다(`realtorName`에 전화번호가 섞여 오는 경우가 있어 지우고 쓴다).
6. 확장은 이 폴더 `extension/`에만 만들고, 같은 작업에서 이 사이트 `public/downloads/realty-listing-alert-extension-latest.zip`으로 내려받게 한다(2026-10-24 주인님 지시 「항상 두 가지 동시에」, `docs/EXTENSION_RELEASE_RULES.md` §4).

## 1) 사용 목적 및 대상
관심 단지에 새 매물·가격 내림이 올라오면 회원 PC가 대신 찾아 텔레그램으로 알려 주는 알림 도구. 대상: 내 집 마련 실수요자, 여러 단지를 비교하는 투자자, 관심 단지를 챙기는 1인 중개 실무자.

## 2) 도구·기술 스택·기법
- 웹: Next.js 16(App Router) + 일반 CSS(`app/globals.css`, 스마트 매트릭스 라이트·네이버 그린) + Supabase(공용 DB, `@supabase/ssr`). 뼈대 출처 `naver-blog-seo-studio` v2.19.
- 권한: `lib/access.ts`(정지 → 핸드폰 → 관리자/FREE → 구독 → 등급+기간, 권한 표 조회는 서버 키 — 루트 원칙 6). 확장 인증 `lib/extensionAuth.ts`(공용 `personal_access_tokens`, `program_slug='realty-listing-alert'`, sha256).
- 확장: MV3, `debugger`(페이지가 불러온 응답 읽기)·`alarms`·`storage`, 권한은 `new/fin/m.land.naver.com`·`api.telegram.org`·이 사이트만. `web-bridge.js`(ping·connect).
- ZIP: `scripts/build-extension-archive.mjs`(출처 `naver-blog-agent`)가 `prebuild`에서 `lib/version.ts` → manifest 동기화 + ZIP.
- 배포: `vercel.json` `{"framework":"nextjs"}` 필수(프로젝트를 `vercel project add`로 만들어 Preset이 Other였음 → 404, `docs/ERROR_LESSONS.md` 1266행 사례).

## 3) 핵심 기능·구조·장단점
| 화면/API | 상태 |
|---|---|
| `/login` | ✅ DESIGN.md §5 표준 2탭(기준 `threads-comment-reply`) |
| `/dashboard` | ✅ 원클릭 다운로드 센터(설치 버전 실시간 대조)·내 설정 카드 |
| `/guide` | ✅ Step 1~4·팁·주의·FAQ |
| `/settings` | ✅ 확장 바로 연결·연결 코드 발급/폐기·다운로드 |
| `/targets` `/schedule` `/delivery` | ⚪ 「준비 중」 화면(2단계) |
| `/api/extension/whoami`(토큰) · `/api/extension/version`(공개) | ✅ |
| 확장 | 0단계 사전 검증 메뉴(①응답 읽기 ②직접 부르기 ③예약 타이머 ④텔레그램 파일)·웹 연결 — 3단계에서 수집 엔진으로 교체 |
- 장점: 서버 비용·법적 노출 최소(데이터가 서버를 지나지 않음), 회원 본인 계정 흐름 그대로. 단점: 회원 PC·크롬이 켜져 있어야 수집, 네이버 화면 구조 변경에 취약(수집 규칙 파일로 대응 예정).

## 4) 버전·이력
| 버전 | 날짜 | 내용 |
|---|---|---|
| v1.01 | 2026-10-24 | 등록(준비중)·뼈대·확장 v1.01·ZIP 다운로드·표준 로그인·0단계 사전 검증. 배포 3회(첫 배포, framework 수정, 로그인·화면 정리) |
| v1.02 | 2026-10-25 | 2단계: 표 3개(`realty_alert_targets`·`_settings`·`_device_status`, RLS 본인만, 10개 상한 트리거) · 🎯 감시 대상 · ⏰ 예약 설정(10~50분 경고, 자정 넘김 시간대) · 📨 받는 방법(본인 텔레그램 봇 연결 + 「기존 부동산 봇 가져오기」) · 대시보드 「내 설정」 실제 값 · 메뉴 밑줄 제거. 확장 manifest 1.2.0 / v1.02. 배포 1회 |

## 5) 남은 작업
[`docs/IMPROVEMENT_BACKLOG.md`](docs/IMPROVEMENT_BACKLOG.md) — 다음은 3단계(확장 수집 엔진 — 설정 받기·예약 타이머·수집·비교·텔레그램 보내기). 남은 2단계 시험: 기존 부동산 봇 가져오기 실제 동작, 두 번째 계정으로 남의 설정 안 보이는지(RLS).

## 6) 연계·병합 아이디어
- `real_estate_sales`의 공공 실거래가 평균을 엑셀 「실거래 평균」 열로(5단계, 회원 기기에서 합침).
- 텔레그램 연결은 공용 `user_telegram_links`(`program_slug`) 재사용, 서버용 텔레그램은 공용 `telegram-bot-client` 사본.

## 7) UI/UX 제안
- 2단계에서 대시보드 「내 설정」 카드에 실제 값(감시 대상 수·예약 상태·마지막 수집)을 연결.
- 확장 팝업을 실제 서비스용(상태·지금 수집·이 단지 추가·최근 결과)으로 바꾸고 글자 크기는 지금처럼 크게 유지(주인님 요청).
