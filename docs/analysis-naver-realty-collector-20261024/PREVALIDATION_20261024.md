# 0단계 사전 검증 결과 — AI 부동산 매물 알림 자동화 `realty-listing-alert` (2026-10-24)

작성: Claude Code(윈도우) `claude-win-20261024-realty` [역할: realty]
기준: [인수인계](HANDOFF_20261024_REALTY_LISTING_ALERT.md) §6-0 · 결과 원본: 확장 「결과 보기」 JSON(주인님 크롬, 22:31~22:49 KST, 개인 정보 칸 제외)

## 0. 어떻게 했나
- 주인님 지시(「프로그램 폴더부터 만들어 그 안에 확장 넣고」)로 저장소 밖이 아니라 **`realty-listing-alert/extension/`(v1.01)의 사전 검증 메뉴**로 시험했다. 3단계에서 수집 엔진으로 바꾸므로 따로 지울 임시 확장은 없다.
- Claude 크롬 제어 도구는 `new.land.naver.com`·`fin.land.naver.com`을 안전 제한으로 열지 못해(우회하지 않음) **주인님이 크롬에서 직접 버튼을 눌러** 진행했다.
- 대상: 경기 고양시 일산동구 백석동 「백송건영」(`complexNo` 10981, 152세대). 요청은 이 단지 목록 1페이지(+직접 부르기 2페이지)뿐. 매물 상세는 열지 않았다.

## 1. 결과 요약

| 확인 항목 | 결과 | 근거 |
|---|---|---|
| 주소 체계 | ✅ 여전히 `new.land.naver.com`(fin.land로 넘어가지 않음) | 단지 화면 `…/complexes/10981?ms=…&a=APT:ABYG:JGC&e=RETAIL` |
| 매물 목록 API | ✅ `GET /api/articles/complex/{complexNo}?realEstateType=APT:ABYG:JGC&tradeType=&priceType=RETAIL&order=rank&page={n}&type=list` 외 필터 칸(가격·면적 0~900000000 등) | 페이지가 스스로 부른 요청 |
| 응답 최상위 | ✅ `articleList[]` · `isMoreData` · `mapExposedCount` · `nonMapExposedIncluded` | |
| 다음 페이지 판정 | ✅ `isMoreData` — 13건이라 1페이지에서 `false`, 2페이지를 직접 부르면 `articleList` 0건 | ① · ② |
| **가격 칸 이름** | ✅ **`dealOrWarrantPrc`**(매매가 또는 보증금, **글자** 예 「3억 9,800」) + `sameAddrMaxPrc`·`sameAddrMinPrc`(같은 매물 묶음 최고·최저) · 변동 표시 `priceChangeState`(예 `SAME`)·`isPriceModification` | priceSamples 5건 |
| 월세 칸 | ⚠ 미확인 — 이 단지에 월세 매물이 없었다. 월세 금액 칸(예상 `rentPrc`)은 3단계 첫 실제 시험에서 월세가 있는 단지로 확인 | |
| **거래 종류 코드** | ✅ `A1`=매매 · `B1`=전세 (월세 `B2` 예상, 미확인) | tradeTypes |
| 매물 칸 | ✅ `articleNo`·`articleName`·`buildingName`(동)·`floorInfo`(예 4/4)·`areaName`·`area1`/`area2`(공급/전용㎡)·`direction`·`articleConfirmYmd`(YYYYMMDD)·`articleFeatureDesc`·`tagList`·`cpName`·`realtorName`·`verificationTypeCode`·`articleStatus`·`latitude`/`longitude` | itemKeys 50개 |
| **방법 ① 응답 읽기** | ✅ 동작 — 디버거로 페이지 자신의 응답 본문을 읽음(추가 요청 0). 스크롤 대상은 `div.item_list--article` | 22:39·22:44 두 번 모두 목록 1개 수신 |
| **방법 ② 직접 부르기** | ⚠ 인증 머리글 없이 **401**, 페이지가 쓴 `authorization` 머리글을 붙이면 **200**(같은 13건) | ② 결과 |
| 지역 화면 응답 | ✅ `GET /api/cortars?centerLat&centerLon&zoom` → `cortarNo`(백석동 **4128510600**, 법정동 10자리)·`cityNo`·`divisionNo`·`sectorNo`·이름 / `GET /api/complexes/single-markers/2.0?cortarNo=…&realEstateType=…&zoom=…&좌표` → 그 지역 단지 목록(`markerId`=단지 번호, `complexName`, `dealCount`·`leaseCount`·`rentCount`·`totalArticleCount`, 최저·최고가) | 지역 선택 목록 API(`/api/regions/list`)는 이번에 안 눌러 미확인 |
| 창 최소화 + `chrome.alarms` | ✅ 창이 `minimized`인 상태에서 1분 타이머가 울림(1회 확인 뒤 저장해 5회까지는 못 봄) | alarm.fires |
| 차단·보안 문자 | ✅ 없음(`blocked:false`, 4xx 0건 — 직접 부르기 무인증 401 제외) | |
| 텔레그램 `sendDocument` | ⏭ 건너뜀(주인님 선택) — 3단계 첫 실제 시험에서 확인 | |

## 2. 결정 (3단계 수집 엔진)
1. **기본 방법 = ① 페이지가 불러온 응답 읽기.** 네이버에 우리가 만드는 요청이 0건이고 회원이 손으로 볼 때와 같다. 인증 토큰을 다룰 필요도 없다.
2. **② 직접 부르기는 쓰지 않는다(예비).** 페이지 인증 머리글을 확장이 잡아 다시 써야 해서(쿠키 추출기와 비슷한 방식) 인수인계 §2-2 원칙과 거리가 있다. 1페이지 넘는 단지에서 스크롤로 다음 페이지가 안 오면 그때만 주인님께 여쭙고 검토한다.
3. **매물 1건 = `articleNo`**, 가격 비교는 `dealOrWarrantPrc` 글자를 만 원 단위 숫자로 바꿔서 한다(「3억 9,800」→ 39800). 네이버 `priceChangeState`도 함께 기록.
4. **거래 종류 저장값**: DB `realty_alert_targets.trade_types` 기본 `{A1,B1,B2}` 그대로(B2는 첫 실제 시험에서 확인).
5. **지역 감시는 가능** — 지역 `cortarNo` → `single-markers` 단지 목록 → 단지별 매물 목록. 다만 단지마다 화면을 열어야 해 요청이 늘어나므로 **1차 출시는 단지 감시만**(인수인계 결정 그대로), 지역은 다음 단계.
6. **개인 정보 주의(새로 발견)**: `realtorName`(중개사 상호)에 **전화번호가 섞여 오는 경우가 있다**(예: 「…중개사사무소031)917-…」). 엑셀·텔레그램에 넣기 전에 숫자 전화 모양을 지운다. `detailAddress`·`realtorId`·좌표는 쓰지 않는다.
7. 매물 주소(엑셀 「네이버 매물 주소」): `https://new.land.naver.com/complexes/{complexNo}?articleNo={articleNo}` — 3단계에서 실제로 열리는지 확인.

## 3. 남은 확인 (3단계 첫 실제 시험에서)
- 월세 금액 칸 이름·`B2` 코드, `priceChangeState`의 다른 값(오름·내림)
- 20건 넘는 단지에서 스크롤로 2페이지가 오는지(페이지 크기)
- 텔레그램 `sendDocument` 파일 전송
- `chrome.alarms` 여러 번(5회) 연속, 크롬 재시작 뒤 밀린 회차 1회만

## 4. 비용
없음(무료 — 로컬, 주인님 크롬, 유료 API 호출 0).
