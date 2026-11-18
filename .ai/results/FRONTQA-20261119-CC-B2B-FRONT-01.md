# FRONTQA-20261119 — Mac 실검수 근거: 143 「4.15」 재현 위치 · S70 주문서 진입·택1 (CC-B2B-FRONT-01, 읽기만)

- 지시 msg_bc90cdca98d9(주인님 작업 분배). 코드·설치·게시·주문·Lab 쓰기·빌드·배포 0. 근거는 기존 문서·Git·당시 측정 파일만.

## 0. 어디에 무엇이 들어 있나
| 위치 | 포함 |
|---|---|
| 운영(v1.16) | `1aea8ec0f` 소스 + version.ts — 아래 프론트 수정 전부 **미포함** |
| Lab 배포 `dpl_CFgB5fC5NLdrye4K7esG1tWRktXQ`(dev-mall-builder.vercel.app) | `7609748ad`까지(템플릿 4차·어두운 머리글·갤러리 키보드·파란 단추 대비·3색 단추 전용 색·어두운 단추 올림) |
| Lab 배포 **미포함**(로컬 커밋만) | `77c50f27c` 탭 올림 7색 · `90248e5b1` 갤러리 색 단추 44px · `86e5ad1bf` 원래 가격 · `50d3e6162`+`ee35d6eb1` S70 주문서 · DB `0105`(`195f9ba43`, Lab·운영 미적용) |
| 내 PC 개발 서버 `http://localhost:3210` | 작업 폴더(HEAD) 코드를 그대로 띄움 → 위 미포함분도 보임. DB는 Lab |

## 1. 143 「4.15:1」 재현 근거
- 출처: `MOV-20261116-10-CC-MOVIE-01.md` §2다 「143 카테고리 탭 「생활용품」 등 14px 4.15:1」, 측정 원본 `C:/Users/Administrator/ego/mov10/measure2.json`.
- **실제 요소는 머리글 카테고리 탭이 아님** — measure2.json의 4.15 항목: 글자 「우디」·「시트러스」, 클래스 `-mb-px whitespace-nowrap border-b-2 px-1`, 글자색 `oklch(0.554 0.046 257.417)`(= slate-500), 바탕 `rgb(12,10,9)`(= 143 몰 바탕 `DARK_BG #0c0a09`), 14px·굵기 600.
- 소스: `mall-builder/src/app/s/[store]/home-blocks.tsx:197` 상품 탭 블록 「밑줄」 스킨의 **선택 안 된 탭** `border-transparent text-slate-500 hover:text-slate-800`(선택된 탭은 `text-slate-900`). 143 데이터 `src/lib/builder/templates-extra-4.ts:229~230`(플로럴·우디·시트러스 탭).
- 왜 6.57로 재현 안 됐나: FRONT-20261118-01에서 머리글 `shop-frame.tsx` `navCls`(slate-600)를 잰 것 — 다른 요소. 같은 원리 계산: 어둡게 `slate-500`은 뒤집어도 가운데 단계라 값 그대로 → `#0c0a09` 위 4.15(FRONT-20261119 원래 가격 실측의 「어둡게·몰 바탕·slate-500 = 4.15」와 일치).
- 상태: 이 197줄은 운영·Lab·HEAD 모두 그대로 → **현재도 미해결 P3**(이번 지시상 코드 0, 수정은 별도 배정 필요).
- 당시 환경: ego lite, 375×812 모바일 흉내 배율 1, `http://localhost:3210/s/aimaster-b2b/admin/design?template=perfume-noir`(편집기 미리보기 틀, 화면 폭 317px·틀 안 문서 390px, 측정은 틀 안 기준). 「초안 저장」「게시」 안 누름.
- **Mac 재검수 방법(둘 중 하나)**: ① 같은 편집기 경로 + 미리보기 틀 안에서 `[data-...]` 상품 탭 블록의 선택 안 된 탭 글자(「우디」) 계산색 vs 상위 바탕을 겹쳐 칠한 실제 바탕 → 기대 4.15 ② 게시된 어두운 샘플몰이 있으면 유저 화면에서 같은 블록. 비교용으로 선택된 탭(「플로럴」 등)은 대비 높음.
- 랜드마크: 미리보기 틀 안 본문의 상품 탭 블록(밑줄 탭 줄 아래 상품 카드 목록). 머리글(`header`)의 카테고리 줄과 혼동 금지.

## 2. S70 주문서 화면 정상 진입·택1 확인 (Lab 배포에는 없음 → 3210 로컬만)
- 코드: `src/app/s/[store]/(shop)/order/order-form.tsx`의 `[data-cash-receipt-request]` 칸(체크 `want_cash_receipt`, 받을 방법 `cr_kind`, 번호 `cr_value`), 세금계산서 칸 `[data-invoice-request]`.
- 칸이 보이는 4조건: ① 장바구니 주문 화면 `/s/aimaster-b2b/order`(견적 주문 `quotes/[id]`엔 없음) ② 몰 설정 `settings.cash_receipt.enabled = true`(관리자 「설정 › 현금영수증」 — **Lab에서 켜는 것은 쓰기라 이번엔 금지**, 꺼져 있으면 칸이 안 보이는 것이 정상) ③ 결제 방법 무통장(기본값) ④ 결제 금액 1원 이상(쿠폰·포인트로 0원이면 숨김).
- 진입 순서: 로그인 회원(시험 계정, 비밀번호는 사람) → 장바구니에 상품 1개 이상(이미 담긴 것 사용, 새로 담기는 Lab 쓰기) → 배송지 1개 이상 → `/s/aimaster-b2b/order`. **「주문하기」 누르지 않음**(주문 생성 = Lab 쓰기, 0105 미적용이라 접수는 고정 안내로 떨어짐).
- 택1 확인: 세금계산서 칸은 **승인 사업자 회원만** 보임. 승인 사업자 계정이면 「세금계산서 발행 요청」 체크 → 「현금영수증 신청」 체크가 풀림, 반대도 같음(같은 화면 안 체크만, 서버 전송 없음). 일반 회원이면 세금계산서 칸이 없어 택1은 화면으로 확인 불가 → 서버 거절은 단위 시험(`tests/cash-receipt-checkout.test.mjs`)으로만 확인됨.
- 숨김 확인: 결제 방법 「카드」·「외상」(보이는 몰·회원만)으로 바꾸면 칸이 사라짐, 무통장으로 되돌리면 다시 보임(체크 상태는 유지되나 숨겨지면 전송 안 됨).
- 막히는 지점: 몰 설정 꺼짐·장바구니 비어 있음·승인 사업자 계정 없음 → 각각 Master/Backend/사람 결정 필요.

## 3. 홈 상품 탭 블록 — 색(4.15)·키보드(Mac msg_f97fee71a875) 공통 구현 대조와 최소 계획 (msg_928a6980c452, 읽기·계획만)
### 공통 구현 확인
- 두 결과 모두 **같은 컴포넌트** `mall-builder/src/app/s/[store]/home-blocks.tsx:182` `TabsView`. 호출부는 `home-slots.tsx:86` 상품 탭 블록 1곳뿐(유저 화면·디자인 편집기 미리보기가 같은 코드). Lab `7609748ad`·운영 v1.16 모두 같은 코드(197줄 11-15 `6576abb46` 이후 변경 0).
- 현재 상태: 탭 단추 전부 기본 Tab 순서(그래서 tabIndex 0이 탭 수만큼), `onKeyDown` 없음(←/→/Home/End 무반응), `aria-selected`만 있고 `id`·`aria-controls`·`role="tabpanel"`·`aria-labelledby` 없음. 패널은 `panels[i]`를 그대로 렌더.
- 색: 밑줄 스킨(`skin:"line"`) 선택 안 된 탭 `text-slate-500` → 어둡게 `#0c0a09` 위 4.15(밝게 몰 바탕 4.37~4.59, 흰 바탕 4.76). 알약 스킨 선택 안 된 탭 `text-slate-600` on `bg-white`는 밝게 7.58·어둡게 6.57로 통과, 선택 탭 `bg-slate-900 text-white`는 어둡게 기존 규칙(globals `:is(.bg-slate-900…).text-white`)으로 통과.
- 갤러리(`template-gallery.tsx` radiogroup·`radioKeyIndex`)와는 **코드 공유 없음** — 이번 계획에서 갤러리는 건드리지 않음.
- 영향 범위: 템플릿 33종 중 탭 블록 29곳(templates 6·extra 3·extra-2 6·extra-3 8·extra-4 6), 밑줄 스킨은 extra-2·3·4 일부, 어두운 템플릿 6종. 운영사가 직접 만든 탭 블록도 같음.
- `[data-tabs]`를 겨냥한 CSS 0 → 패널 감싸개 추가해도 배치 영향 없음.

### 최소 수정안(배정 시, 파일 1개 + 새 시험 1개)
1. 색: 197줄 밑줄 스킨 선택 안 된 탭 `text-slate-500` → `text-slate-600`(같은 단계 실측: 밝게 6.95~7.58, 어둡게 6.57~7.51 — FRONT-20261119 원래 가격 측정과 같은 바탕). 선택 탭·알약 스킨·hover 그대로. 블록 바탕색을 운영사가 임의로 바꾼 경우는 범위 밖.
2. 키보드·패널(WAI-ARIA 탭, 자동 선택 — 패널이 이미 화면에 있어 고르면 바로 보여도 됨):
   - `useId()`로 `id={uid-t{j}}`·`aria-controls={uid-p}`, 단추 `tabIndex={i === j ? 0 : -1}`(로빙).
   - tablist `onKeyDown`: ArrowRight/ArrowLeft 순환, Home/End 처음·끝 → `preventDefault` → `setI` → 해당 단추 `.focus()`. 가로 탭이라 위/아래는 처리 안 함. 키 계산은 작은 순수 함수 `tabKeyIndex`(home-blocks 안, 갤러리 함수와 분리).
   - 패널: `<div role="tabpanel" id={uid-p} aria-labelledby={uid-t{i}} tabIndex={0}>{panels[i]}</div>`(클래스 없음).
   - `onClick`·`aria-selected`·클래스·`data-tabs`·`data-tabs-skin` 그대로.
3. 회귀 시험 `tests/home-tabs.test.mjs`(새): `tabKeyIndex` 순환·Home/End·무관 키 null, 소스 계약(로빙 tabIndex·aria-controls/labelledby·tabpanel·onKeyDown에 preventDefault+focus, 밑줄 선택 안 된 탭 slate-600·알약 클래스 불변·onClick 유지). 가능하면 TabsView만 happy-dom으로 그려 ←/→/Home/End 실제 이벤트(갤러리 하네스 방식, 저장소 밖 1회용은 증거로만).
- 수정 전 실패/후 통과 확인, tsc, 기존 block-skins·templates 시험 회귀.
- 실검수(Mac, Lab 배포 뒤): 실제 Tab이 탭 줄에서 1번만 멈추는지, ←/→/Home/End로 탭·초점 이동, Tab으로 패널(상품 목록) 진입, 낭독기 「탭 n/m 선택됨」, 어두운 143 밑줄 탭 대비.
- 제외: 갤러리, 다른 블록, 디자인 편집기 자체 UI, DB·운영·Lab·빌드·배포.
