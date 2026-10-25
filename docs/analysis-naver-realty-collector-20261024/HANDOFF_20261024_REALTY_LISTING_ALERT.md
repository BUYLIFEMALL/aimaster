# 인수인계 — AI 부동산 매물 알림 자동화 `realty-listing-alert` 신규 개발 (2026-10-24)

작성: Claude Code(윈도우) `claude-win-dotori` [역할: analysis-planning] — **분석·플랜·인수인계만 했고 코드·DB·배포는 하지 않았다.** 이 문서를 받은 구현 담당이 처음부터 끝까지 이어서 만들 수 있게 썼다.
대상 프로젝트: ① AIMaster 운영(DB ref `esgxyikcnnvmlhygjkth`). 새 폴더: `AIMaster/realty-listing-alert/`(아직 없음).
함께 읽을 것: [개발 플랜 3판](PLAN_20261024_LIVE_LISTINGS.md) · [원본 분석](REPORT.md) · 외부 개발분석표 EXT-RE-01·EXT-RE-02(`docs/EXTERNAL_PROGRAM_ANALYSIS_REGISTRY.md`).

---

## 0. 주인님 결정 — 절대 지시 (2026-10-24, 바꾸지 말 것)

| # | 결정 | 원문 요지 |
|---|---|---|
| D1 | 취지 | 「편하게 네이버에 올라오는 실시간 매물정보를 정리해서 받아보는 것」 |
| D2 | 무인 동작 | 「내가 접속하지 않고 특정 지역이나 키워드를 넣어놓으면 알아서 해당 페이지를 스크롤링해서 파일로 받아보거나 텔레그램이나 이메일로 정리된 자료를 실시간으로 받아보는 기능」 |
| D3 | **플랫폼만 제공** | 「우리는 플랫폼만 제공하고 실제 사용은 각 개개인 사용자의 로그인 정보를 사용하고, API도 각각 본인 것을 사용」 |
| D4 | **서버 트래픽 금지** | 「서버에서는 직접 네이버로 트래픽이 안 되고 각 개개인의 PC나 핸드폰에서 진행」 · 「우리 쪽에서 데이터가 조회되거나 스크롤링하면 안 된다」 |
| D5 | 구조 승인 | 1단계 크롬 확장 → 2단계 PC 프로그램, 휴대폰은 받기(텔레그램), 데이터는 회원 PC에만 |
| D6 | 별도 프로그램 | 별도 **기본 프로그램**, 이름 **「AI 부동산 매물 알림 자동화」**, slug `realty-listing-alert` |
| D7 | 회원이 정하는 값 | 수집 간격 **10분·20분·30분·40분·50분·1시간·2시간·3시간 … 24시간** 중 선택 · 감시 대상 **최대 10개 안에서** 회원이 정함 · **예약 켜기/끄기도 회원이** |
| D8 | 예약 참고 | 「부동산 기존에 만들어 놓은 것 보면 예약 기능 있어 그거 참고해」 → `real_estate_sales`의 모니터링 설정(§5-3) |

D3·D4를 어기는 구현(우리 서버가 네이버를 부름, 매물 데이터를 서버에 저장, 회원 쿠키·비밀번호를 서버로 받음)은 **어떤 이유로도 만들지 않는다.** 애매하면 멈추고 주인님께 여쭌다.

---

## 1. 한 장 요약

```
[회원 PC · 크롬]  확장 (1단계)          [회원 PC]  PC 프로그램 (2단계, 같은 엔진)
   ① 예약 타이머(chrome.alarms) — 회원이 켠 경우만, 회원이 고른 간격
   ② 네이버 부동산 화면을 회원 본인 브라우저로 열고 스크롤 → 페이지가 불러온 목록 응답을 읽음
   ③ 이전 결과(확장 안 저장소)와 비교 → 신규 · 가격 변동 · 사라짐
   ④ 엑셀(xlsx 또는 CSV) 만들기
   ⑤ 회원 본인 텔레그램 봇으로 요약 + 파일 전송 → 📱 휴대폰으로 받기
   ⑥ (선택) 이메일 · PC 폴더 저장
            ▲  설정(감시 대상·간격·켜기/끄기·전달 방법)과 「수집 규칙」만 받는다
            │  네이버 매물 데이터는 절대 보내지 않는다
[AIMaster 웹 realty-listing-alert.buylife.xyz]
   로그인·권한·핸드폰 확인 / 감시 대상·예약 설정 / 다운로드 센터·연결 상태 / 매뉴얼 / 수집 규칙 파일
```

---

## 2. 원본 분석에서 확인한 네이버 부동산 쪽 사실 (수집 엔진 설계 근거)

원본 2개를 실행하지 않고 정적 분석으로 확인(2026-10-24). **이 값들은 비공식이라 바뀔 수 있다 → 0단계 사전 검증에서 다시 확인하고 「수집 규칙」 파일로 관리한다.**

### 2-1. 매물 수집기 Ver1.3(EXT-RE-01)이 쓰던 주소·값
| 구분 | 값 |
|---|---|
| 단지 화면 | `https://new.land.naver.com/complexes/{complexNo}` |
| 단지 매물 목록 | `https://new.land.naver.com/api/articles/complex/{complexNo}?realEstateType=APT%3AABYG%3AJGC%3APRE&tradeType=&priceType=RETAIL&page={page}` (페이지마다) |
| 다음 페이지 여부 | 응답의 `isMoreData` |
| 매물 상세 | `https://new.land.naver.com/api/articles/{articleNo}?complexNo=` — **우리는 쓰지 않음**(개인 정보·요청 증가) |
| 인증 | 요청 머리글 `authorization: Bearer <토큰>` + 쿠키 — 원본은 회원이 복사한 cURL에서 정규식 `-H\s+'authorization:\s*Bearer\s+([^']+)'`로 뽑음 |
| 목록 응답 칸(원본이 읽은 것) | `articleList[]` 안: `articleNo` · `articleName` · `realEstateTypeName` · `tradeTypeName` · `buildingName`(동) · `floorInfo` · `areaName` · `direction` · `articleConfirmYmd` · `articleFeatureDesc` · `sameAddrMaxPrc` · `cpName` · `realtorName` |
| 상세에서만 | `realtorPhone`·`cellPhoneNo`·`realtorAddress`·`representativeName`·`moveInTypeName`·`moveInPossibleYmd` — **개인 정보는 저장·전송하지 않는다** |
| ↳ 변경(2026-10-25 주인님 결정) | **새·가격 변동 매물만** 상세를 읽어 `realtorPhone`(사무실)·`cellPhoneNo`(휴대폰)을 회원 PC 파일·회원 본인 알림에만 넣는다(없으면 빈칸, 서버로 보내지 않음 — §0 유지). 주소·대표자 이름은 여전히 넣지 않는다. 플랜 `realty-listing-alert/docs/PLAN_20261025_REALTOR_PHONE.md` |
| 가격 칸 | 원본 문자열 추출에서 확인 못 함(목록의 가격 칸 이름, 예상 후보는 거래가·보증금·월세 칸) → **0단계에서 확인 필수** |

### 2-2. 쿠키 추출기 Ver1.3(EXT-RE-02)에서 얻은 기법
- 원본은 `chrome.debugger` → `Network.enable` → `Network.requestWillBeSent`로 요청을 잡고, `chrome.cookies.getAll`로 쿠키를 붙여 cURL로 복사했다.
- **우리는 쿠키를 꺼내지 않는다.** 우리 확장은 회원 브라우저 안에서 동작하므로 페이지가 이미 인증된 상태로 목록을 불러온다.
- **채택 기법 = 「페이지가 스스로 불러온 응답 읽기」**: 확장이 단지 화면 매물 목록을 스크롤 → 페이지가 다음 페이지를 불러옴 → 확장이 그 응답 본문을 읽는다(디버거 `Network.responseReceived` + `Network.getResponseBody`, 또는 페이지 안 MAIN world에서 응답 복제). 별도 요청을 만들지 않아 회원이 손으로 볼 때와 같은 흐름.
- 2순위(0단계 비교 후 결정): 확장이 열린 탭 안에서 같은 목록 주소를 직접 부름(페이지 토큰 사용).

### 2-3. 지역·키워드 입력 처리
| 입력 | 처리 |
|---|---|
| 단지 | 회원이 네이버 부동산에서 단지 화면을 연 상태로 확장 팝업 「이 단지 감시 추가」 → 주소 `…/complexes/{complexNo}`에서 번호·이름 자동 저장 |
| 단지 주소 붙여 넣기 | 웹·확장에서 `new.land.naver.com/complexes/숫자` 형식 검사 |
| 지역(시·구·동) | 네이버 지역 화면의 지역 코드(원본에는 없음) — **0단계에서 지역 목록 화면의 응답 형식 확인** 뒤 지역 → 단지 목록 → 매물 순서 결정. 1차 출시는 단지 감시만, 지역은 0단계 결과에 따라 같은 단계 또는 다음 단계 |
| 키워드 | 네이버 부동산 검색 화면에서 결과 단지를 고르게 함(검색 결과를 자동으로 전부 감시하지 않음 — 요청 폭주 방지) |

---

## 3. 기능 명세

### 3-1. 회원 설정 (웹 + 확장 팝업 양쪽에서, 같은 값)
| 항목 | 값 | 비고 |
|---|---|---|
| 예약 켜기/끄기 | ON/OFF (기본 OFF) | D7. 전체 스위치 + 감시 대상별 스위치 |
| 수집 간격 | 10·20·30·40·50분, 1·2·3·4·5·6·7·8·9·10·11·12·13·14·15·16·17·18·19·20·21·22·23·24시간 | D7. 기본 3시간. **10~50분 선택 시 화면 경고**: 「짧은 간격은 네이버 확인 화면이 뜨거나 계정이 일시 제한될 수 있어요」 |
| 동작 시간대 | 시작~끝 시(자정 넘김 허용), 비우면 종일 | `real_estate_sales` 그대로(§5-3) |
| 감시 대상 수 | 1~10개(회원이 추가·삭제, 최대 10) | D7 |
| 감시 조건 | 거래 종류(매매·전세·월세), 가격 범위, 면적 범위, 층(저층 제외 등) | 목록 읽은 뒤 확장에서 거름 |
| 알림 기준 | 신규 / 가격 하락 / 가격 변동 전부 / 사라짐 — 체크 | 기본: 신규·가격 하락 |
| 전달 방법 | 텔레그램 요약 / 텔레그램 엑셀 첨부 / PC 폴더 저장 / 이메일 | 1단계: 텔레그램·파일 |
| 파일 형식 | xlsx(기본) / CSV | |

### 3-2. 수집 1회 흐름 (확장 background)
1. 예약 타이머가 울림(`chrome.alarms`, 1분마다 깨어나 `isCollectDue`·`isWithinActiveHours` 판정 — `real_estate_sales/src/lib/publicdata/schedule.ts` 함수 이식). 전체 OFF면 아무것도 안 함.
2. 감시 대상을 순서대로: 네이버 부동산 단지 탭을 **보이는 창의 새 탭**으로 열거나(회원 설정 「수집할 때 탭 열기」 허용 시) 이미 열린 탭을 씀. 몰래 숨긴 창을 만들지 않는다.
3. 디버거 붙임 → 매물 목록 영역을 사람처럼 스크롤(2~5초 무작위 간격, `docs/PLATFORM_PATTERNS.md` §20) → 응답 읽기 → `isMoreData`가 거짓이거나 페이지 상한(대상당 10페이지)이면 멈춤 → 디버거 뗌 → 탭 닫기(확장이 연 탭만).
4. 대상 사이 10~30초 쉼.
5. 비교: 확장 저장소(`chrome.storage.local` 또는 IndexedDB)의 지난 결과와 `articleNo`로 대조 → 신규·가격 변동(이력 누적)·사라짐(이번에 없음). 30일 지난 기록은 정리.
6. 엑셀 만들기(확장 안 라이브러리, 개인 정보 칸 없음).
7. 전달: 회원 텔레그램 봇 `sendMessage`(요약) + `sendDocument`(파일). 같은 매물은 한 번만 알림(알린 `articleNo` 기록).
8. 웹에 **상태만** 보고: 마지막 수집 시각·성공/실패·건수(숫자)·확장 버전 — 매물 내용은 보내지 않는다(D4).

### 3-3. 멈춤·오류 (필수)
| 상황 | 동작 |
|---|---|
| 로그인 필요·보안 문자·확인 화면·401/403/429 | 즉시 그 회차 중지, 텔레그램 「네이버 확인 화면 때문에 멈췄어요. 직접 한 번 열어 확인해 주세요」, **그날 자동 수집 중지**. 우회하지 않는다 |
| 응답 형식이 수집 규칙과 다름 | 중지 + 「수집 규칙 업데이트 필요」 표시, 웹에 오류 종류·확장 버전만 보고 |
| 크롬이 꺼져 있었음 | 다음에 켜질 때 한 번만 수집(밀린 횟수만큼 몰아서 하지 않음) |
| 텔레그램 실패 | 파일은 PC에 저장해 두고 다음 회차에 「지난 알림 실패」 표시. 같은 알림 자동 재발송 반복 없음 |

### 3-4. 결과 엑셀 칸
단지명 · 동 · 거래 종류 · 가격(매매가/보증금/월세) · 면적 · 층 · 방향 · 매물 특징 · 확인일 · 중개사 상호 · 상태(신규/가격 변동/유지/사라짐) · 이전 가격 · 첫 발견일 · 네이버 매물 주소. **전화번호·주소·대표자 이름 등 개인 정보 칸은 없음.**
(2단계 이후 선택) 같은 단지 과거 실거래 평균 — 우리 공공 데이터 `real_estate_listings`에서 단지명·지역으로 찾아 확장이 받아 기기에서 합침.

### 3-5. 웹 화면 (좌측 메뉴 순서)
| 메뉴 | 내용 |
|---|---|
| 🏠 대시보드 | 🖥 내 PC 연결 상태(확장 설치·버전·최신 버전 대조 배지) · 예약 ON/OFF · 마지막 수집·다음 수집 예정 · 감시 대상 수 · 원클릭 다운로드 센터 · 3단계 설치 안내 |
| 🎯 감시 대상 | 단지 추가(주소 붙여 넣기 / 확장으로 추가)·조건·대상별 ON/OFF·삭제(최대 10) |
| ⏰ 예약 설정 | 전체 ON/OFF · 간격 선택(D7 목록) · 동작 시간대 · 짧은 간격 경고 |
| 📨 받는 방법 | 텔레그램 연결(회원 본인 봇 토큰·chat id, 연결 시험 버튼) · 이메일 · 파일 형식 |
| 📖 연동 & 사용 매뉴얼 | `/guide` Step 1~4(확장 설치 → 텔레그램 봇 만들기 → 감시 대상 → 예약 켜기) + 💡팁·⚠️주의(약관·개인 참고용·짧은 간격) + FAQ |
| ⚙️ API키등록·플랫폼연동 | 표준 메뉴명(텔레그램·이메일·선택 AI 키) + 하단 📖 연동 매뉴얼 박스 |
- 웹에는 **매물 표가 없다**(데이터가 서버에 없으므로). 「최근 결과 보기」는 확장 팝업·확장 결과 페이지(확장 안 HTML)에서 본다.

---

## 4. 데이터 설계 (운영 DB — 회원 설정만, 승인 후 마이그레이션)

```sql
-- realty-listing-alert/supabase/migrations/<날짜>_realty_listing_alert_init.sql (초안, 담당이 다듬기)
create table if not exists realty_alert_targets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  complex_no text not null,              -- 네이버 단지 번호(공개 주소의 숫자, 매물 데이터 아님)
  complex_name text,
  trade_types text[] not null default '{A1,B1,B2}', -- 실제 코드값은 0단계에서 확정
  price_min bigint, price_max bigint, area_min numeric, area_max numeric,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  unique (user_id, complex_no)
);
create table if not exists realty_alert_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  schedule_enabled boolean not null default false,          -- D7 켜기/끄기
  interval_minutes integer not null default 180
    check (interval_minutes in (10,20,30,40,50) or (interval_minutes % 60 = 0 and interval_minutes between 60 and 1440)),
  active_hour_start smallint, active_hour_end smallint,
  notify_new boolean not null default true, notify_price_drop boolean not null default true,
  notify_price_change boolean not null default false, notify_gone boolean not null default false,
  deliver_telegram boolean not null default true, deliver_file boolean not null default true,
  deliver_email boolean not null default false, file_format text not null default 'xlsx',
  open_tab_when_collecting boolean not null default true,
  updated_at timestamptz not null default now()
);
create table if not exists realty_alert_device_status (   -- 숫자·상태만, 매물 내용 없음
  user_id uuid not null references auth.users(id) on delete cascade,
  device_id text not null,
  ext_version text, last_run_at timestamptz, last_result text, last_count integer, last_error text,
  updated_at timestamptz not null default now(),
  primary key (user_id, device_id)
);
-- 감시 대상 10개 상한: 서버 액션에서 개수 확인 + 트리거로 이중 확인
-- RLS: 세 표 모두 enable + owner-only(auth.uid() = user_id) select/insert/update/delete
-- 30일 정리: device_status는 updated_at 30일 지나면 삭제(설정·감시 대상은 회원 설정이라 보관)
```
- 텔레그램·이메일·AI 키는 **공용 연동 저장소**(`user_api_keys` / `member_platform_accounts`, `docs/MEMBER_INTEGRATIONS.md`)에 넣고 다른 프로그램과 재사용(§5-2). 이 프로그램 전용 키 표를 만들지 않는다.
- 운영 DB 쓰기는 주인님 승인 뒤, 크롬 SQL 편집기에 넣어 두고 Run은 주인님이 누른다(이 저장소 관례).

---

## 5. 기준 코드 — 새로 짜지 말고 가져다 쓸 것

### 5-1. 웹 뼈대·확장 배포 — 기준 `naver-blog-seo-studio`(v2.19)
웹 + 확장이 함께 있고 `lib/version.ts`·`lib/access.ts`(핸드폰 확인 포함)·`/guide`·767px ☰가 모두 있는 유일한 후보라 이것을 뼈대로 복사한다.

| 무엇 | 위치 | 비고 |
|---|---|---|
| 좌측 메뉴·매뉴얼·휴대폰 메뉴 | `components/studio/StudioSidebar.tsx`(70행 `/guide`, 95행 ☰), `app/globals.css` 430행 `@media (max-width: 767px)` | `docs/SIDEBAR_LAYOUT_STANDARD.md` |
| 캐시 두 줄 | `app/dashboard/layout.tsx` 3-4행, `app/dashboard/page.tsx` 9-10행 | 모든 레이아웃·API에 |
| 권한 판정 | `lib/access.ts` 27-90행: 로그인(401) → 정지(403) → **핸드폰**(관리자 외, FREE도 막음) → 활성 → 관리자/FREE → 구독 → 최소 등급 없음 → 등급+기간. `requireProgramAccess`는 401이면 `/login?redirect=/dashboard`, 그 외 메인 `/programs/<slug>` | slug만 바꿔 복사 |
| 버전 | `lib/version.ts` `APP_VERSION` | 새 프로그램 `v1.01` |
| 확장 ↔ 웹 연결 | 확장 content script `extension/web-bridge.js`(허용 출처 2곳, `postMessage`로 `ping`·`connect`), 웹 `lib/extensionBridge.ts` `askExtension`, 연결 화면 `app/extension-connect/page.tsx`·`app/settings/ExtensionConnectButton.tsx`·`ExtensionTokenManager.tsx` | |
| 확장 → 웹 API 인증 | **Bearer 토큰**: 확장 `chrome.storage.local`에 토큰, `Authorization: Bearer`(`extension/background.js` 65-68), 서버 `lib/extensionAuth.ts` 6-16행 sha256 `token_hash` 대조, 토큰 발급 `lib/tokenActions.ts` | §5-2 설계안 2의 `/api/extension/delivery`·`/api/extension/settings`·`/api/extension/status`도 이 인증 |
| 설치·버전 확인 API | `app/api/extension/whoami/route.ts` 11-17행(`latestVersion`·`downloadUrl`) | |
| 새 버전 알림(권장) | `naver-blog-agent`: 공개 `GET /api/extension/version` 6시간마다 → 아이콘 `NEW` 배지(`extension/background.js` 110-125·489행) | 연결 전에도 동작 |
| ZIP 빌드 | **`naver-blog-agent/scripts/build-extension-archive.mjs`(13-23행 version.ts→manifest 동기화 포함)**를 복사해 `prebuild`에 연결, `src/lib` 경로만 `lib`로. (SEO 스튜디오 스크립트는 동기화가 없음) → `public/downloads/realty-listing-alert-extension-latest.zip` | |
| 배포 규칙 | `docs/EXTENSION_RELEASE_RULES.md`: ① 같은 배포에서 manifest `version`(X.Y.0)·`version_name`(vX.YY)=`version.ts` ② 내용물 ZIP + 고정 `-latest.zip` ③ `programs.version`·`extension_version`·`extension_download_url` 한 SQL + 마이그레이션 파일 ④ `node scripts/check-extension-release.mjs realty-listing-alert` OK ⑤ 보고에 「ZIP 다시 받기 → 덮어쓰기 → chrome://extensions 새로고침」. **새 slug는 `check-extension-release.mjs`의 `EXTENSION_PROGRAMS`(13행)와 규칙 문서 §3 표에 추가** | |
| 디버거 붙였다 떼기 | `tistory-auto-blog/extension/tistory-adapter.js` 64-76행(붙이기 실패 시 떼고 다시, `finally`에서 떼기), `blog-content-maker/extension/background.js` 28행(`attached` 표시 + 이중 finally), `naver-blog-seo-studio/extension/sidepanel.js` 320-345행 | 수집 엔진은 tistory 방식 + `Network.enable`·`Network.getResponseBody` |
| 예약 타이머 | `chrome.alarms`: `naver-blog-agent/extension/background.js` 488-490행, `tistory-auto-blog/extension/background.js` 371-372행(0.5분 펌프) | §5-2 설계안 4 |
| 다운로드 센터·연결 배지 | 기준 `video-to-gif/components/LocalRendererHub.tsx`(상태 진단·버전 대조 배지 158-159행·다운로드 195·231행), `video-to-gif/components/layout/Sidebar.tsx` 212·283-318행(사이드바 카드·모달). 간단판 `naver-blog-seo-studio/app/settings/ExtensionDownloadCard.tsx` 19-20행(`askExtension("ping")`) | 디자인 최상위 원칙 0 |

### 5-2. 공용 부품·연동
| 무엇 | 위치(근거) | 쓰는 법 |
|---|---|---|
| 텔레그램(서버용) | 공용 `telegram-bot-client` 기준 `instagram-comment-reply/lib/telegram/client.ts`, 사본 10곳(`scripts/check-shared-modules.mjs:40-53`, 부동산은 `real_estate_sales/src/lib/telegram/client.ts`) — `findChatIdFromUpdates`·`sendTelegramMessage`·`sendTelegramMessageWithButtons` 등 | 웹의 「연결 시험」(chat id 찾기·시험 메시지)에 사본으로. `getUpdates`에는 `allowed_updates=["message"]` 필수, 봇 하나에 웹훅 하나(`docs/SHARED_FEATURE_MAP.md:129`). **`sendDocument`(파일 보내기)는 공용에 없음** |
| 텔레그램 연결 저장 | `user_telegram_links`(`user_id`·`chat_id`·`bot_token`·`bot_username`·`program_slug`, 고유 `(user_id, program_slug)`) — `real_estate_sales/supabase/migrations/20260810050751_…init.sql:121-134`, `…per_user_bot.sql`, `20260823120000_telegram_links_per_program.sql`. booking-reminder·crm-google-form·longtail·kakao·stepmail이 이미 사용, 연결 액션 `lib/actions/telegram.ts` `connectTelegramAction` | `program_slug='realty-listing-alert'` 행으로 저장(새 표 만들지 않음) |
| 공지 띠 | 공용 `program-notice-banner`(`docs/SHARED_FEATURE_MAP.md:113-125`) | 작업 화면 맨 위 |
| 회원 연동 공용 저장 | `docs/MEMBER_INTEGRATIONS.md` — `user_api_keys`(`resolveApiKey()`, 폴백 없음)·`member_platform_accounts`·`integration_catalog`(텔레그램 항목 없음)·`lib/memberIntegrations.ts` | 이메일 발송 키·AI 키는 `user_api_keys` |
| 30일 정리 | `cleanup-usage-log`(기준 `four-cut-comics/src/lib/cleanupUsageLog.ts`) | 서버에 매물 데이터가 없으므로 **`realty_alert_device_status`만** 대상, 필요 시 사본 |
| 사본 규칙 | 기준만 고침 → `node scripts/check-shared-modules.mjs --sync` → 사본 쓰는 프로그램 배포·버전 +0.01(급하지 않으면 다음 배포 때) | |
| 지역 코드 | `real_estate_sales/src/lib/publicdata/districts.ts`(34줄) — **서울 25개 구 시군구 5자리만**, 법정동·서울 밖 없음 | 지역 감시는 0단계에서 네이버 지역 코드 체계를 확인한 뒤 설계(우리 코드표로는 부족) |

#### 새로 정해야 했던 4가지 — 이 문서의 설계안(담당이 그대로 쓰면 됨)
1. **엑셀 파일 보내기**: 확장 안에서 텔레그램 `sendDocument`를 `FormData`(파일 첨부)로 직접 부른다. 공용 `telegram-bot-client`에 추가하지 않는다(서버 사본 10곳을 건드릴 이유가 없음 — 서버는 파일을 보내지 않음).
2. **텔레그램 토큰을 확장에 넘기는 방식**: 확장이 연결 토큰(Bearer, §5-1 `lib/extensionAuth.ts` 방식)으로 우리 API `GET /api/extension/delivery`(본인만, 토큰 확인 + 프로그램 권한 확인)를 불러 **본인의** `bot_token`·`chat_id`를 받아 `chrome.storage.local`(이 기기 안)에 보관 → 확장이 `api.telegram.org`로 직접 보냄. 서버가 대신 보내지 않는다(서버가 보내면 매물 내용이 서버를 지나감 — D4 위반). 회원이 연결을 끊으면 확장이 다음 시작 때 지움.
3. **지역 코드**: 1차 출시는 **단지 감시만**(단지 번호는 네이버 공개 주소의 숫자). 지역(시·구·동) 감시는 0단계 결과로 네이버 지역 코드 형식을 확인한 뒤 같은 단계 또는 다음 단계에 추가 — 우리 `districts.ts`(서울 구만)를 그대로 쓰지 않는다.
4. **확장 안 예약 규칙**: `docs/SCHEDULER_POLICY.md`는 서버 예약만 다룬다 → 이 프로그램이 첫 사례로 「확장 안 예약」 절을 그 문서에 추가(담당 몫): ⓐ `chrome.alarms` 1분 깨어남 + `isCollectDue`·`isWithinActiveHours` 판정 ⓑ 회원 ON/OFF·간격·시간대는 서버 설정을 시작 때·변경 때 받아 씀 ⓒ 크롬이 꺼져 있던 동안 밀린 회차는 한 번만 ⓓ 서버 `crons`·cron-job.org는 쓰지 않음.

### 5-3. 예약 — `real_estate_sales` 모니터링 설정 (D8)
| 무엇 | 위치 | 가져가는 법 |
|---|---|---|
| 간격·시간대 판정 | `real_estate_sales/src/lib/publicdata/schedule.ts` (`COLLECT_INTERVAL_OPTIONS`, `isWithinActiveHours`, `isCollectDue`, 한국 시간 `currentKstHour`) | 함수 3개를 확장·웹 공용 파일로 복사, 간격 목록만 D7로 바꿈(10~50분 + 1~24시간) |
| ON/OFF·주기·시간대 화면 | `real_estate_sales/src/components/districts/MonitoringSettings.tsx`(171줄: 「모니터링 ON/OFF」 버튼, 수집 주기 선택, 동작 시간대, 바꾸면 바로 저장) | 화면 모양·저장 흐름을 그대로 본뜨기 |
| 저장 액션 | `real_estate_sales/src/lib/actions/districts.ts` `updateMonitoringSettingsAction`(47행, `requireProgramAccess()`) | 같은 형식 |
| DB 칸 | `real_estate_sales/supabase/migrations/20260810130000_real_estate_watch_monitoring.sql` (`monitoring_enabled`, `collect_interval_minutes` check, `active_hour_start/end`) | §4 `realty_alert_settings`에 같은 의미로 |
| 차이 | 기존은 **서버(Vercel cron 5분)**가 판정·수집. 새 프로그램은 **확장 타이머**가 같은 판정을 하고, 서버는 설정만 보관(D4) | |

### 5-4. 2단계 PC 프로그램 — `naver-blog-auto-poster_app` 참고
| 무엇 | 위치 | 비고 |
|---|---|---|
| 앱 뼈대 | `src/main.js`(258줄), Electron 31 + `playwright-core`, `electron-builder --win portable` | ipc 예: `aimaster:getStatus/setToken/clearToken`, 토큰 확인 `checkAimasterToken`(64행) — 웹 로그인 연결 방식 재사용 |
| 실행 폴더 | `getRuntimeRoot()`(22-27행): 빌드 후 `userData/runtime`, 개발 중 `runtime/` | 루트 `.vercelignore`에 `realty-listing-alert/desktop/runtime` 추가 필수(EBUSY 사고) |
| 회원 로그인 브라우저 | `src/lib/naverSession.js` `profileDirFor()`(77-79) → `<runtime>/browser-profiles/<키>`, `chromium.launchPersistentContext(profileDir,{channel:"chrome",headless:false})`(98-100), `ensureNaverSession` | 회원이 이 창에서 직접 네이버 로그인(비밀번호 입력은 회원), 이후 같은 프로필 재사용 |
| 사람처럼 조작 | `src/lib/humanInput.js`(41줄) `sleep`·`randomDelay`·`humanType`·`clickAndType` | 스크롤용 함수는 새로 추가(같은 파일 방식) |
| 설정 | `src/lib/appConfig.js` → `<runtime>/config.json` | |
| **없는 것(새로 만듦)** | 작업 표시줄 아이콘(Tray)·윈도우 시작 자동 실행(`app.setLoginItemSettings`)·중복 실행 막기(`requestSingleInstanceLock`)·SMTP 발송(`nodemailer`) | 2단계 핵심 |
| 설치 파일 배포 | 같은 앱 방식: 루트 `public/downloads/<파일>.exe`(git 제외, 배포 PC에 있어야 함) | 맥용은 맥미니에서 빌드·실물 시험 |

---

## 6. 단계별 작업 (각 단계 끝에 커밋, 배포는 승인)

| 단계 | 할 일 | 완료 기준 |
|---|---|---|
| **0. 사전 검증** | 저장소 밖 임시 폴더에 작은 확장 하나(MV3, 네이버 부동산 주소 권한만) → 주인님 크롬에서 단지 1곳 화면 스크롤 → ①응답 읽기 ②직접 부르기 비교 · 가격 칸·거래 종류 코드·`isMoreData`·지역 화면 응답 확인 · 창 최소화 상태에서 `chrome.alarms` 동작 · 텔레그램 `sendDocument` 파일 보내기 | 결과를 이 폴더 `PREVALIDATION_YYYYMMDD.md`에 기록, 임시 확장 삭제. 요청은 단지 1곳·2~3페이지만 |
| 1. 등록·뼈대 | 폴더 생성(기준 뼈대 복사) · `lib/version.ts` v1.01 · 권한(`requireProgramAccess`/`checkProgramAccessApi` + 핸드폰 + FREE 순서) · 좌측 메뉴 표준·767px ☰ · `/guide` · `programs` 등록(slug·`app_url` `https://realty-listing-alert.buylife.xyz`·`version`·카테고리 「부동산」·기본 요금제 3단계·`short_desc`/`description`/`detail_sections` 표준) · Vercel 프로젝트 + `vercel domains add` · VIP 자동 부여 확인 · 썸네일 | 로그인·권한 없는 회원 차단, 휴대폰 폭 메뉴, `tsc`·`build` |
| 2. DB·설정 화면 | §4 표 3개 + RLS + 10개 상한 · 감시 대상·예약 설정·받는 방법 화면 · 텔레그램 연결 시험 | 다른 회원 설정 안 보임(시험 계정 2개), 상한 11번째 거절 |
| 3. 확장 | 팝업(상태·지금 수집·이 단지 추가·최근 결과) · 웹과 로그인 연결 · 예약 타이머 · 수집 엔진 · 비교 · 엑셀 · 텔레그램 · 상태 보고 · 멈춤 규칙 §3-3 · 새 버전 알림 · ZIP 빌드 | 모의 응답 단위 시험(비교·엑셀·멈춤), 시험 계정으로 실제 1단지 1회, 같은 매물 중복 알림 없음 |
| 4. 마무리 출시 | 다운로드 센터·연결 상태 배지 · 매뉴얼 완성 · 확장 ZIP·DB `extension_version`·`extension_download_url` · `check-extension-release.mjs` OK | 크롬 데스크톱·375px 검수, 인수인계 6종 문서 |
| 5. 이메일·실거래 비교 | 이메일(회원 본인 발송 키) · 실거래 평균 열 · (선택) AI 요약(회원 본인 키, 최저가 모델) | 실발송 1건 |
| 6. PC 프로그램 | 같은 엔진 + Electron(작업 표시줄·윈도우 시작 자동 실행·회원 로그인 프로필·SMTP 직접 발송) · 맥용은 맥미니 실물 시험 | 하루 무인 실행 기록 |

---

## 7. 검수 체크리스트 (출시 전 전부 ✅)
- [ ] 우리 서버 코드에 `land.naver.com` 호출 0건(`grep -rn "land.naver" app lib` 결과 0, 확장 폴더 제외)
- [ ] 서버 DB·로그에 매물 내용(가격·매물번호 목록) 0건 — 상태 보고는 숫자만
- [ ] 회원 쿠키·비밀번호를 받는 입력칸·API 없음
- [ ] 확장 권한: `new.land.naver.com`(필요 시 `m.land.naver.com`) + 우리 웹 주소 + `api.telegram.org`만, 모든 사이트 권한 없음
- [ ] 디버거는 수집 중에만 붙고 끝나면 뗌
- [ ] 예약 OFF면 타이머가 아무 요청도 안 함 / 간격·시간대 판정 시험(자정 넘김 포함)
- [ ] 10~50분 선택 시 경고 표시
- [ ] 차단·확인 화면 모의 시 즉시 멈춤 + 그날 중지
- [ ] 같은 매물 알림 1회만, 개인 정보 칸 없음
- [ ] 감시 대상 11번째 거절(화면·서버·DB 3중)
- [ ] 다른 회원 설정 안 보임(RLS)
- [ ] 버전 3곳 일치(`lib/version.ts`·`programs.version`·manifest `version_name`), ZIP 실물 검증 OK

---

## 8. 비용 (실행 전 주인님 승인)
| 항목 | 예상 |
|---|---|
| Vercel 빌드 | 1단계 1회 · 2~4단계 2~3회 · 5단계 1회 — 단계마다 사전 승인, 동시 빌드 금지 |
| 유료 AI | 없음(AI 요약은 5단계 선택, 시험 1~2회 최저가 모델·시험 계정 본인 키) |
| 운영자 인프라 | 없음(서버는 설정만) → 기본 프로그램 |
| 회원 부담 | 없음(텔레그램 무료, 이메일 본인 계정) |

## 9. 조사 근거 (2026-10-24)
- 원본 정적 분석: 매물 수집기 `llmm.pyc`(Python 3.10 `marshal`로 문자열·함수 이름), 쿠키 추출기 소스 5개 읽기 — 둘 다 실행 안 함.
- 저장소 조사(읽기만): 보조 작업자 2명 — ① 웹 뼈대·확장 배포·디버거·예약·다운로드 센터(§5-1) ② 공용 부품·연동 저장·지역 코드·등록 체크리스트·예약 지침·Electron(§5-2·§5-4·§6). 행 번호는 2026-10-24 기준이므로 고치기 전 다시 확인한다.
- 등록 체크리스트 근거: 루트 `CLAUDE.md` 「새 프로그램 체크리스트」, `docs/PROGRAM_DESCRIPTION_STANDARD.md`(한 줄 60자 안팎·상세 400~500자·`detail_sections`), `docs/DOMAIN_SSO_POLICY.md`(`vercel domains add realty-listing-alert.buylife.xyz <프로젝트> --scope buylife`, 쿠키 도메인 코드, `app_url`), 기본 요금제 3단계(monthly·bimonthly·quarterly 1만·2만·3만 원, `components/admin/ProgramForm.tsx` `DEFAULT_PLANS`), 썸네일 `docs/PLATFORM_PATTERNS.md` §13 + `node scripts/generate-program-thumbnail.mjs`, VIP 자동 부여(`grade_program_access` 체크, 가입일 + 1년), 핸드폰 필수 `docs/PHONE_REQUIRED_POLICY.md`.

## 10. 남은 결정·주의
- 남은 주인님 결정: 0단계 사전 검증 진행 승인(주인님 크롬 사용), 구현 담당 지정, (판매 전) 법률 확인 여부.
- 운영 DB `programs`에 `realty-listing-alert` slug가 없는지 등록 직전에 확인(문서·폴더에는 없음 확인, 2026-10-24).
- 네이버 화면 구조가 바뀌면 멈출 수 있다 — 수집 규칙(주소 형식·칸 이름·다음 페이지 판정)을 웹의 작은 JSON(`/api/collect-rules`, 로그인 필요)으로 내려보내고, 확장은 시작할 때 받아 캐시.
- 화면·매뉴얼 필수 문구: 「네이버 부동산 정보를 회원님 PC에서 회원님 계정으로 읽어 정리합니다. 개인 참고용으로만 쓰고 다시 배포하지 마세요. 짧은 간격은 계정 제한 위험이 있어요.」 처음 실행 때 동의 체크.

## 11. 다음 첫 단계
구현 담당은 ① 이 문서 §0을 읽고 ② `docs/ACTIVE_WORK.md`에 `realty-listing-alert/` 줄을 넣은 뒤 ③ 주인님께 0단계 사전 검증 승인을 받아 §6-0부터 시작한다.
