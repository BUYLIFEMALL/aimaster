# 0단계 사전 검증 결과 — 네이버 상가·건물·토지 매물 (2026-10-31)

작성: [역할: realty] Claude Code(윈도우) `claude-win-realty-docs`
방법: 주인님 크롬에서 `extension/` 사전 검증 메뉴로 기록(서울 강남구 역삼동, 2회, 화면 8개, 응답 60개). 페이지가 스스로 받은 응답만 읽었고 추가 요청은 없다. 개인 정보 칸은 값을 저장하지 않았다. 원본 파일은 이 문서로 옮긴 뒤 삭제했다. 에이전트 크롬 도구는 네이버 부동산을 열지 못한다.

## 결과
| 항목 | 결과 |
|---|---|
| 차단 | 없음. 본문을 읽은 응답은 모두 200 |
| 주소 | `new.land.naver.com/offices?ms=…&a=<유형>&e=RETAIL` |
| 유형 코드 | 상가 `SG`, 건물 `GM`, 토지 `TJ`. 여러 개는 `SG:TJ` |
| 거래 코드 | 매매 `A1`, 월세 `B2`. 토지 표본은 `A1`만 |
| 지도 묶음 | `/api/articles/clusters`: `markerId`, `count`, 범위 좌표. 질의에 `cortarNo`(법정동 10자리), 지도 범위, `zoom` |
| 목록 | `/api/articles`: 페이지당 20건, 다음 페이지는 `isMoreData`. 질의는 `cortarNo` 또는 `markerId` |
| 조건 칸 | `priceMin/Max`, `areaMin/Max`, `rentPriceMin/Max`, `tradeType`, `order`, `page` |
| 매물 번호 | `articleNo` |
| 가격 | `dealOrWarrantPrc`(글자, `43억`, `63억 3,000`), `rentPrc`(월세) |
| 변동 | `priceChangeState`(`SAME`, `INCREASE` 확인, 내림 값 미확인), `isPriceModification` |
| 같은 매물 | `sameAddrCnt`, `sameAddrMaxPrc`, `sameAddrMinPrc` |
| 그 밖 | `floorInfo`, `direction`, `latitude`, `longitude`, `articleConfirmYmd`, `verificationTypeCode` |
| 상세 | `/api/articles/{번호}`: `articleSpace`, `articlePrice`, `articleDetail`(`cortarNo`, `pnu`, `currentUsage`, `parkingCount`, 지하철 도보), 건물·상가는 `articleBuildingRegister`, 토지는 `articleGround` |

## 면적 기준 (상세와 대조)
| 유형 | `area1` | `area2` | 실거래와 비교할 값 |
|---|---|---|---|
| 건물 | 대지면적(253 ↔ `groundSpace` 253.3) | 연면적(676 ↔ `totalSpace` 676.76) | `area2` ↔ 일반 건물 `buildingAr`. 대지는 `area1` ↔ `plottageAr` |
| 상가 | 공급면적(163 ↔ `supplySpace` 163.78) | 전용면적(108 ↔ `exclusiveSpace` 108.81) | `area2` ↔ 집합 `buildingAr`. 국토부 값이 전유면적이라는 것은 추정, 1단계에서 표본 대조 |
| 토지 | 토지면적(3 ↔ `groundSpace` 3.3) | 0 | `area1` ↔ `dealArea`. 목록 값은 정수로 잘림 |

## 결정
1. 읽기는 `realty-listing-alert`처럼 **페이지가 받은 응답만** 읽는다. 직접 호출은 하지 않는다.
2. 감시 단위는 **동 + 유형 + 조건**이다. 넓으면 화면에서 경고한다. 역삼동 상가는 화면 어림으로 수천 건이라 페이지당 20건으로 상한 300페이지를 금방 쓴다.
3. 상세는 조건에 맞는 새 매물과 가격 변동 매물만, 회차당 상한을 두고 연다.
4. 시세 비교 동은 감시 대상의 `cortarNo` 또는 상세의 `cortarNo`로 잡는다. 코드 앞 5자리가 실거래 시군구, 뒤가 동이다. 실거래는 동 이름으로 저장돼 있어 이름 표를 붙인다.
5. 수익률: 월세 매물은 보증금·월세로 계산. 매매 매물에는 월세가 없어 같은 지역 월세 호가의 평당 월세를 참고값으로 쓴다(추정임을 표시).
6. 상세의 건축물대장(연면적, 사용승인, 용적률, 건폐율)은 후보 점수와 표시에 쓴다. 상세의 `pnu` 값은 저장하지 않아 형식 미확인이며, 공시지가 연결은 1단계 뒤 검토한다.

## 1단계에서 실물로 확인할 것
- `cortarNo` 목록이 정말 그 동으로 제한되는지, 지도 범위에 묶이는지
- 조건을 주소나 화면 필터로 지정하는 방법
- 스크롤로 다음 페이지가 오는지, 가격 내림의 `priceChangeState` 값
- 지역이 다른 곳(지방 토지)의 칸 차이

## 비용
없음.
