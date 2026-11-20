# 원스톱 상품 넘겨받기 「긴 주소」 격리 검수표 — Claude(Movie) `claude-win-video` [역할: video]

| 항목 | 값 |
|---|---|
| 지시 | Master msg_0b651fce03d9 — 고정 Git에서 송수신 경로·길이 제한·누락/절단 오류 계약·기존 합성 검증 읽기 대조, 실행 가능한 격리 검수표 |
| 고정 기준 | HEAD `20a31f463`(착수 시점). 대상 파일 이 시점 그대로 |
| 방법 | 코드 읽기 + 기존 시험 실행 + 저장소 밖 임시 측정 스크립트(실제 함수 불러 계산만). 코드 수정·브라우저·실자료·유료·설치·빌드·배포 0 |
| 제출 상태 | ready_review |

## 1. 경로(고정 Git 기준)
| 단계 | 위치 | 동작 |
|---|---|---|
| 송신 | `shop-detail-page/lib/shortsLink.ts` `shortsProductUrl()` (화면 `components/products/ShortsHandoffCard.tsx`) | `https://shorts-onestop-studio.buylife.xyz/topic#product-name=…&product-point=…(≤3)&product-offer=…&product-from=AI 상세페이지 자동화&product-id=…` — 원스톱 코드를 불러오지 않고 형식만 복제 |
| 송신(참조 구현) | `shorts-onestop-studio/src/lib/productShorts.ts` `productHandoffHash()`·`productExtraHash()` | 같은 형식. 추가 필드 `product-option·url·desc·rights·rev`는 원스톱 쪽 함수에만 있고 **상세페이지는 보내지 않음** |
| 비로그인 접속 | `src/lib/auth.ts:16` | 서버가 `/login?redirect=<경로>`로 보냄 → `#` 뒷부분은 서버로 가지 않고 브라우저가 이동 뒤 주소에 붙여 유지(브라우저 동작, 이번 미확인) |
| 로그인 화면 보관 | `src/components/auth/LoginForm.tsx:13-18` → `src/lib/refHandoff.ts` `stashProductHandoff()` | `#` 전체를 `sessionStorage["onestop-product-handoff"]`에 그대로 저장 후 주소에서 `#` 제거. 로그인 성공 시 보관분이 있으면 `/topic`, 없으면 `/dashboard`(`?redirect`는 쓰지 않음) |
| 주제 화면 수신 | `src/components/views/TopicView.tsx:152-160` → `takeProductHandoff()` | 주소 `#` 먼저, 없으면 보관분. 꺼낸 보관분은 즉시 삭제. 상품명·장점·혜택·보낸 곳 + 추가 필드를 칸에 채우고 `#` 제거 |
| 해석 | `readProductHandoff()`·`readProductExtra()` | `#product-name=`으로 시작해야 상품 넘기기. `&`로 나눠 `decodeURIComponent`, 같은 이름은 첫 값, 깨진 조각은 건너뜀, 그 뒤 길이로 자름 |

## 2. 길이 제한과 실측 최대 길이
제한(송·수신 같음): 상품명 100 · 장점 3개×60 · 혜택 80 · 보낸 곳 40 · 상품ID 64(`[A-Za-z0-9_-]`) · 옵션 60 · 주소 300(https만) · 확정 설명 300 · 판번호 32.

| 경우 | `#` 부분 길이 | 왕복 결과 |
|---|---|---|
| 상세페이지가 만들 수 있는 최대(한글 가득, 장점 3개, 혜택, ID) | **2,868자**(전체 주소 2,915) | 상품명 100·장점 60/60/60·혜택 26·ID 64 그대로 |
| 상품명 짧음 + 확정 설명 300자(백로그 「약 2,700자」) | **2,840자** | 설명 300 그대로 |
| 받는 쪽 형식 이론상 최대(추가 필드 전부 한글 가득) | **9,662자** | 설명 300·옵션 60·주소 298·권리·판번호 그대로 |

- 백로그의 「설명 300자」 경우는 **지금 송신 앱이 `product-desc`를 보내지 않아** 실제 흐름에서는 생기지 않음. 합성 주소로만 시험 가능.
- 혜택은 상세페이지가 가격으로 만들어 최대 26자 안팎(80 제한에 닿지 않음).

## 3. 오류 계약(누락·절단·깨짐) — 읽기·측정 결과
| 입력 | 결과 | 화면 |
|---|---|---|
| `#`가 `product-name=`으로 시작하지 않음 / 상품명 없음 | `null` — 상품 넘기기 아님 | 아무 안내 없이 일반 주제 화면 |
| 상품명 조각이 `%`에서 잘림(`%EB%AC%BC%EB`) | `null`(상품명 디코딩 실패 → 이름 없음) | 안내 없이 무시 |
| 장점 등 다른 조각만 깨짐 | 그 조각만 건너뛰고 나머지 받음(기존 시험 있음) | 채워진 값만 표시 |
| 같은 이름 두 번 | 첫 값 사용(상품명·추가 필드 모두) | — |
| 긴 값 | 받은 뒤 제한 길이로 자름 | — |
| `sessionStorage` 사용 불가 | 보관 실패를 삼킴 → 로그인 뒤 상품 정보 없음 | 안내 없음 |
| **이모지가 제한 경계에 걸림(송신)** | **`URIError: URI malformed`로 멈춤** — 원스톱 `productHandoffHash`, 상세페이지 `shortsProductUrl`(상품명 경계·장점 경계 모두) | 상세페이지 「쇼츠로 만들기」 카드 그리기 중 오류 가능(미확인) |
| 이모지가 제한 경계에 걸림(수신) | 멈추지 않음. 끝에 반쪽 글자(`U+D83D`) 1개가 남음 | 상품명 끝에 깨진 글자 |

원인: 두 쪽 모두 `slice(0, max)`로 UTF-16 단위로 자른 뒤 `encodeURIComponent`를 불러, 서로게이트 쌍이 반으로 잘리면 예외. 받는 쪽은 디코딩 뒤 자르므로 예외 대신 반쪽 글자가 남음.

## 4. 기존 합성 검증(실행 결과)
| 시험 | 결과 | 덮는 범위 |
|---|---|---|
| `shorts-onestop-studio` `node --test tests/productShorts.test.ts` | 15/15 | 한글·`&`·`=` 왕복, 길이·개수 자르기, 깨진 조각 건너뛰기, 이름 없으면 null, 추가 필드 하위 호환·형식 검사 |
| `shop-detail-page` `node --test tests/shortsLink.test.mjs` | 3/3 | 받는 쪽 그대로 읽기, 혜택 생성 조건, 이름 없으면 버튼 숨김 |
| 빠진 것 | — | 최대 길이 주소 왕복, 로그인 경유 보관·꺼내기(`refHandoff`) 시험 없음, 이모지 경계, 중복 키, 상품명 절단 |

## 5. 격리 검수표(실행 가능, 브라우저 없이 → 마지막 B만 화면)
| # | 확인 | 입력 | 기대 | 지금 |
|---|---|---|---|---|
| H1 | 최대 송신 주소 왕복 | `shortsProductUrl`(한글 가득·장점 4줄·할인가·ID 64) | `#` 2,868자, 이름 100·장점 60×3·ID 64 그대로 | PASS(측정) |
| H2 | 설명 300자 합성 왕복 | `productHandoffHash`+`productExtraHash({desc:300자})` | 2,840자, 설명 300 | PASS(측정) |
| H3 | 형식 최대 왕복 | 추가 필드 전부 가득 | 9,662자, 모든 필드 제한 길이 | PASS(측정) |
| H4 | 상품명 절단 | `#product-name=%EB%AC%BC%EB` | null, 예외 없음 | PASS(측정) |
| H5 | 중복 키 | 같은 이름 2번 | 첫 값 | PASS(측정) |
| H6 | 보관·꺼내기 | `stashProductHandoff(긴 #)` → `takeProductHandoff("")` | 같은 값, 꺼낸 뒤 보관분 삭제 | **시험 없음**(`sessionStorage` 흉내로 시험 가능) |
| H7 | 로그인 뒤 이동 | 보관분 있으면 `/topic` | `hasStashedRefHandoff()` true | **시험 없음** |
| H8 | 이모지 경계 송신 | 99자+이모지 | 예외 없이 이모지 통째로 빼거나 넣기 | **FAIL — URIError**(원스톱·상세페이지) |
| H9 | 이모지 경계 수신 | 디코딩 뒤 101자 | 반쪽 글자 없음 | **부분 FAIL** — 예외는 없으나 `U+D83D` 남음 |
| B1 | 화면(나중) | 시험 계정·시험 상품, 비로그인 상태에서 H1 주소 열기 → 로그인 → 주제 화면 | 칸이 모두 채워지고 주소에서 `#` 사라짐 | 미실행(이번 범위 밖) |

## 6. 고칠 후보(이번에는 수정 안 함, 승인 필요)
1. **이모지 경계 예외(H8)** — 원스톱 `productShorts.ts`의 `clean()`에서 자른 끝이 반쪽 글자면 빼기(`/[\uD800-\uDBFF]$/`). 같은 고침을 상세페이지 `shortsLink.ts`에도(이커머스 담당 몫 — 형식 복제 파일이라 둘이 같이 바뀌어야 함). 수신 쪽도 같은 `clean`이라 H9가 함께 해결됨.
2. **H6·H7 시험 추가** — `refHandoff.ts` 보관·꺼내기·로그인 이동 판정(가짜 `sessionStorage`).
3. 깨진 넘기기 안내 — 지금은 조용히 무시. 상품명이 깨졌을 때 「넘겨받은 상품 정보를 읽지 못했습니다」 한 줄 검토(제안).
4. 범위 메모: 상세페이지가 `product-desc` 등 추가 필드를 보내지 않음 — 메이커 계약(`docs/IMPROVEMENT_HANDOFF_20261113_MAKER.md` §3) 진행 때 함께.

## 7. 비용
없음(읽기·로컬 계산만).
