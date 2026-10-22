# 개발 플랜 — 쇼핑제휴·콘텐츠 운영 상품 연동 코드를 공용 기준 코드로 (2026-10-23 Claude Code 윈도우)

> 주인님 결정: 쓰레드 분석 §5-3 「공용코드로」. 근거: [`../../docs/analysis-threads-consolidation-20261023/REPORT.md`](../../docs/analysis-threads-consolidation-20261023/REPORT.md).
> 대상: ① 운영 AIMaster. DB 변경 없음. 화면·회원 사용 방식 변경 없음(안쪽 코드만).

## 1. 문제
`threads-content-ops`가 쇼핑제휴의 쿠팡·알리·토스 연동 코드를 손으로 복사한 뒤 각자 고쳐 써서, 같은 일을 하는 파일이 두 벌이다. 한쪽만 고치면 다른 쪽에 버그가 남는다.

| 연동 | 쇼핑제휴(`src/lib/…`) | 운영 앱(`lib/…`) | 차이 |
|---|---|---|---|
| 쿠팡 API | `coupang/client.ts` 128줄 `searchProducts` | `coupang.ts` 187줄 `searchCoupangProducts`, 딥링크 `createCoupangDeeplink`, 상세 주소·단축 주소 검사 | 운영 앱이 기능 더 많음 |
| 쿠팡 링크 판정 | `coupang/links.ts` 129줄(위젯 이동 주소 해석 포함) | `coupangLinks.ts` 83줄(`readCoupangShare`, 이미지 주소 판정) | 서로 일부씩 더 있음 |
| 쿠팡 배너 사진 자르기 | `coupang/widget.ts` 45줄 | `coupangBanner.ts` 35줄 | 거의 같음 |
| 알리익스프레스 | `aliexpress/client.ts` 257줄(상품 상세 조회 포함) | `aliexpress.ts` 157줄(이미지 찾기 포함) | 서로 일부씩 더 있음 |
| 토스쇼핑 | `toss/client.ts` 233줄 | `toss.ts` 137줄(고정 IP 미설정 안내) | 함수 이름 다름 |

## 2. 방법
1. **기준 = 쇼핑제휴**(사용 기록 최다·BEST). 새 폴더 `threads-affiliate-poster/src/lib/affiliate-clients/`에 5개 파일(쿠팡 API·쿠팡 링크·쿠팡 배너·알리·토스)을 만들어 **두 앱의 함수를 모두 담는다**(합집합). 파일끼리는 상대 경로(`./…`)로만 불러 사본이 글자까지 같게 한다.
2. 같은 일을 하는 함수가 두 벌이면, 두 구현을 비교해 더 안전한 쪽 하나로 정하고 이름은 하나로 맞춘다(예: 토스 상품 목록·공유 링크, 쿠팡 검색). 동작이 달라지는 곳은 시험으로 고정한다.
3. 사본 = `threads-content-ops/lib/affiliate-clients/`. `scripts/check-shared-modules.mjs`와 `docs/SHARED_MODULES.md`·`SHARED_FEATURE_MAP.md`에 `affiliate-clients` 등록.
4. 두 앱의 호출 위치를 새 경로·새 이름으로 바꾼다(쇼핑제휴 5파일, 운영 앱 4파일). 옛 파일은 지운다(이 저장소 git 이력에 남음).
5. `labs/kit-threads`(Lab 사본)는 건드리지 않는다.

## 3. 검수
- 새 시험(외부 호출은 가짜): 쿠팡 서명(HMAC) 머리글·검색 주소, 쿠팡 링크 판정(정상·일반 상품 주소·위젯 주소·배너), 알리 서명·제휴 링크 응답 해석, 토스 프록시 미설정 안내·응답 해석.
- 두 앱 tsc·기존 시험(운영 앱 36개, 쇼핑제휴 1개)·build, `node scripts/check-shared-modules.mjs` 일치.
- 실제 외부 호출(쿠팡·알리·토스 실키)은 하지 않음 — 배포 때 크롬에서 상품 등록 화면이 열리는지만 확인.

## 4. 배포·비용
- 화면 변화 없는 안쪽 정리라 **배포 규칙상 「미배포 대기」**(작은 소스 수정은 모았다가 다음 배포 때). 커밋·푸시하고 `docs/PENDING_DEPLOYS.md`에 두 앱 등록 → 다음에 각 앱을 배포할 때 함께 나가고 그때 버전 +0.01.
- 비용: 지금은 **없음**(빌드 0회). 바로 배포를 원하시면 빌드 2회.
