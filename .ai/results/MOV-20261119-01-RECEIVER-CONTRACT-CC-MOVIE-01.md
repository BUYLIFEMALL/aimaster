# MOV-20261119-01-RECEIVER-CONTRACT 결과 — 상품영상 연결 계약 **A3(COOP 보존·창 연결 없음)** — Claude(Movie) `claude-win-video` [역할: video]

| 항목 | 값 |
|---|---|
| 작업 / 시도 / 계획 / 배정 | MOV-20261119-01-RECEIVER-CONTRACT / **A3** / **P8** / **3** |
| CAT / ROLE / WORKSPACE | 영상(원스톱)↔이커머스(상세페이지) / CC-MOVIE-01 / 등록된 기존 AIMaster 세션(메인 윈도우 `D:\AIMaster`) |
| 허용 경로 | COOP와 기존 음성 기능을 보존하는 상품영상 연결 계약 설계(이 문서만) |
| 기준 / 선행 / 검수 | e5b5a4168 / 맥미니 FAIL msg_1329379e5e0d(`.ai/results/MOV-20261119-01-VIDEO-CONTRACT-CX-QA-01.md`) / CX-MASTER-01 |
| 제출 상태 | ready_review |

## 0. 이전 시도 판정
| 시도 | 커밋 | 판정 | 이유 |
|---|---|---|---|
| A1 후보 | cfd969004 | 대체됨 | 수신 검토 B1~B6 반영 전 |
| **A2 팝업 고정판** | e5b5a4168 | **중지 — FAIL(맥미니 P1·P2 인정)** | P1: 원스톱 `next.config.ts` @989c7bc1c 의 `Cross-Origin-Opener-Policy: same-origin`이 `/fms-bgm`을 뺀 모든 화면에 붙어, 원스톱이 연 교차 출처 창과의 `window.open` 참조·`window.opener`가 끊김 → READY·JOB·SAVED 메시지 경로 자체가 동작 불가. P2: DELETE 정책 선부여는 이번 최소 권한(SELECT·INSERT) 범위 밖 |
| **A3** | 이 문서 | 제출 | 아래 |

## 1. 근거(경로 기준 SHA, 읽기만)
| 근거 | 파일 @SHA | 사실 |
|---|---|---|
| COOP 적용 경로 | `shorts-onestop-studio/next.config.ts` @989c7bc1c | `source: "/:path((?!fms-bgm).*)"` → COOP `same-origin` + COEP `credentialless`. 주석: v1.42 무료 음성 여러 줄 계산(교차 출처 격리), v1.46 `/fms-bgm`만 opener 유지를 위해 제외 |
| 격리를 쓰는 음성 기능 | `shorts-onestop-studio/src/lib/freeTts/engine.ts` @fa77fc06e | `self.crossOriginIsolated`일 때만 최대 8줄 계산, 아니면 1줄 → 헤더를 빼면 무료 음성이 느려짐(회귀) |
| 원스톱 DB 접속 | `shorts-onestop-studio/src/lib/store.ts`·`src/lib/route.ts` @584ca0d4e | 원스톱 서버는 **관리자 키(RLS 우회)** 로 `user_id` 조건을 붙여 읽고 씀 → 원스톱이 상세페이지 표에 직접 쓰면 DB 본인 규칙이 작동하지 않음 |
| 원스톱 표 읽기 규칙 | `shorts-onestop-studio/supabase/migrations/0002_shorts_onestop_items.sql` @237741cc3 | `shorts_onestop_items_select_own`: `auth.uid() = user_id` → **다른 앱도 회원 세션이면 그 회원 행만 읽을 수 있음**(운영 DB 실제 정책은 이번에 조회하지 않음 — 검수 항목) |
| 영상·상품 기록 형식 | `shorts-onestop-studio/src/lib/script.ts` @584ca0d4e | `data.youtube[] {videoId,url,title,privacy,publishAt,channel,uploadedAt}`, `data.product {id, from, …}` |
| 송신 버튼 자리 | `shorts-onestop-studio/src/components/views/YoutubeUploadCard.tsx` @0807cf180 | 업로드 기록 줄마다 버튼 자리 |
| 상품 소유·저장 본보기 | `shop-detail-page/lib/actions/mainPhoto.ts` @0abd5aabd | `requireProgramAccess()` + `.eq("id").eq("user_id")` |
| 상품 표를 읽는 다른 곳 | ECOM 검토 msg_fc63273e032e 5) | 상품 표에 칸을 붙이면 공개 전 영상이 딸려 감 → 새 표 유지 |

## 2. 연결안 선택
| 안 | 내용 | 판정 |
|---|---|---|
| 가. 팝업 메시지(A2) | `window.open` + postMessage | **불가** — COOP로 참조 끊김 |
| 나. 송신 화면만 COOP 빼기 | `/fms-bgm`처럼 예외 경로 추가 | **제외** — 헤더 임의 완화 금지(Master), 그 화면에선 무료 음성 1줄로 떨어짐 |
| 다. 원스톱 서버가 상세 표에 직접 쓰기 | 관리자 키 insert | **제외** — RLS 우회라 본인 상품 검사를 앱 코드에만 의존 |
| 라. 단기 서명 토큰 | 원스톱이 서명한 10분 토큰을 주소에 → 상세가 검증 | **예비안** — 두 Vercel 프로젝트에 같은 비밀값(환경변수 변경·주인님 입력) 필요, 만료·재사용 관리 필요 |
| **마. 공용 DB 본인 행 재조회(서버 중계)** | 원스톱은 **일반 링크**(항목 번호·영상 번호만)로 상세페이지 확인 화면을 열고, 상세페이지 서버가 **회원 세션**으로 원스톱 본인 행을 다시 읽어 검사한 뒤 새 표에 저장 | **추천** — 창 참조·메시지 없음(COOP 무관), 비밀값·새 환경변수 없음, 권한 판단은 전부 RLS(같은 `auth.uid()`) |

## 3. 계약(추천안 마)

### 3-1 흐름
1. 원스톱 업로드 기록 줄에 「🛍 상품 화면에 붙이기 ↗」 **일반 링크**(`<a target="_blank" rel="noopener noreferrer">`, 서버 호출 없음):
   `https://shop-detail-page.buylife.xyz/products/video-inbox?item=<shorts_onestop_items.id>&video=<videoId>`
   - 버튼은 화면 조건이 맞을 때만 보임(3-4). 원스톱은 저장 결과를 받지 않고 「상세페이지 탭에서 결과를 확인하세요」만 표시.
2. 상세페이지 확인 화면(서버 컴포넌트, `requireProgramAccess()`): 로그인이 풀려 있으면 기존 `/login?redirect=<경로+쿼리>`로 왕복(쿼리 유지 — ECOM 6)). 주소 값 형식만 검사하고, **회원 세션 클라이언트**로 원스톱 행과 상품을 읽어 「이 영상을 「상품명」에 붙일까요?」 카드를 보여 줌. **이 단계에서는 저장하지 않음**(GET 화면·미리 불러오기로 저장되는 일 방지).
3. 회원이 「붙이기」를 누르면 서버 동작(POST)이 3-2 검사를 **처음부터 다시** 한 뒤 저장 → 같은 화면에 결과.

### 3-2 서버 검사(상세페이지 서버 동작, 회원 세션, 관리자 키 금지)
| 순서 | 검사 | 실패 시 문구 |
|---|---|---|
| 1 | `requireProgramAccess()` | 기존 권한 안내(메인 사이트로) |
| 2 | `item` UUID, `video` `^[A-Za-z0-9_-]{11}$` | 「주소가 올바르지 않습니다.」 |
| 3 | `select data from shorts_onestop_items where id = item and kind = 'project'`(RLS가 본인 행만 돌려줌) | 「영상을 찾을 수 없습니다.」(남의 항목·없는 항목·지운 항목 구분 안 함) |
| 4 | `data.youtube[]`에서 `videoId === video`인 항목 | 같은 문구 |
| 5 | `data.product.from === "AI 상세페이지 자동화"` 그리고 `data.product.id` UUID | 「상세페이지에서 만든 쇼츠가 아닙니다.」 |
| 6 | 공개 범위: public·unlisted 허용 / private은 `publishAt`이 있을 때만 / 그 밖 거부. 제목 ≤100자, 시각 ISO 형식 | 「비공개 영상은 상품 화면에 붙일 수 없습니다.」 등 |
| 7 | `insert into shop_product_videos (…) values (…) on conflict (user_id, product_id, video_id) do nothing returning id` — `user_id = auth.uid()`, 값은 **3·4에서 다시 읽은 행**에서만(주소·폼 값 사용 금지), 주소는 `https://www.youtube.com/shorts/<videoId>`로 만듦 | RLS 거절(남의 상품)도 「본인 상품이 아닙니다.」 한 문구 |

- 소유 결속: 원스톱 행(SELECT RLS)과 상품(INSERT RLS exists)을 **같은 로그인 회원의 `auth.uid()`** 하나로 묶음 → 남에게 받은 링크를 눌러도 3번에서 끝남. 확인과 저장이 insert 한 문장 안이라 틈 없음.

### 3-3 권한 — SELECT·INSERT만
| 대상 | 정책 | 비고 |
|---|---|---|
| `shop_product_videos` SELECT | `auth.uid() = user_id` | 신설 |
| `shop_product_videos` INSERT | `auth.uid() = user_id` AND `exists (select 1 from shop_products p where p.id = product_id and p.user_id = auth.uid())` | 신설 |
| `shop_product_videos` UPDATE·DELETE | **만들지 않음** | 「떼기」는 후속(그때 DELETE 별도 승인). 상품 삭제 cascade는 정책이 아니라 FK로 동작 |
| `shorts_onestop_items` SELECT | 기존 `shorts_onestop_items_select_own` 그대로 | **새 권한 없음** |

표 구조는 주인님 승인 범위 그대로(A2 2-6 칸·`unique(user_id, product_id, video_id)`·`product_id … on delete cascade`·`user_id` 색인), **정책 수 = 2**. `shop_products`에 칸 추가 없음.

### 3-4 원스톱 버튼 조건(보조 장치 — 신뢰 근거는 3-2)
`data.product.from === "AI 상세페이지 자동화"` · `data.product.id` UUID · 그 업로드가 public/unlisted 또는 예약 공개 → 버튼 보임. 예약 없는 private → 「비공개 영상은 상품 화면에 붙일 수 없습니다」 글만. 로컬 MP4 → 대상 아님.

### 3-5 중복·재사용·만료
| 경우 | 결과 |
|---|---|
| 처음 붙이기 | 1행 저장, 「상품 화면에 붙였습니다」 + 상품 화면 링크 |
| 같은 링크 다시·연타·두 탭 동시 | unique로 1행만, 나머지 「이미 붙어 있습니다」(**기존 값 유지, 갱신 없음**) |
| 만료 | 링크에는 권한이 없어(항목·영상 번호뿐) **만료 시각이 필요 없음**. 유효성은 「붙이기」를 누르는 순간 3-2로 다시 판정 — 그사이 원스톱 프로젝트·업로드 기록·상품이 지워졌거나 공개 범위가 바뀌었으면 그때 거절 |
| 오래된 링크 | 위와 같음. 별도 만료가 필요하면 예비안 라(토큰) 채택 시에만 10분 |

### 3-6 노출(A2 2-7 유지)
본인 상품 화면에서만. 예약 시각 전 「○월 ○일 ○시 공개 예정(KST)」 글만·링크 숨김, 시각 뒤 「예약 시각 지남 — 유튜브에서 확인」. export 3종·copy·마켓 등록·다른 프로그램 0. 안내 1줄 「유튜브에서 예약을 바꾸거나 영상을 지워도 여기 기록은 바뀌지 않습니다.」

### 3-7 공유 형식 계약
상세페이지가 원스톱의 `data.youtube[]`·`data.product` 모양을 읽으므로, 이 두 형식을 읽는 순수 함수 하나를 공용 기준 코드로 둠: `product-video-handoff`(기준 `shorts-onestop-studio/src/lib/productVideoHandoff.ts`, 사본 `shop-detail-page/lib/productVideoHandoff.ts`) — 링크 만들기·주소 값 검사·원스톱 행에서 붙일 값 꺼내기·공개 범위 판정. 원스톱이 `script.ts`의 두 형식을 바꾸면 이 기준 함수와 시험이 먼저 깨지게 함.

## 4. 담당별 편집 범위(이번 작업 0)
| 담당 | 파일 | 내용 |
|---|---|---|
| CC-ECOM-01 | `shop-detail-page/supabase/migrations/<날짜>_product_videos.sql` | 표 + **정책 2개(SELECT·INSERT)** + unique·색인 |
| CC-ECOM-01 | `app/(dashboard)/products/video-inbox/page.tsx` · `lib/actions/productVideos.ts`(붙이기만) · `components/products/ProductVideos.tsx` · `lib/productVideoHandoff.ts`(사본) · tests | 확인 화면·서버 동작·목록 |
| CC-ECOM-01 최소 수정 | `app/(dashboard)/products/[id]/page.tsx` 목록 1줄, `lib/version.ts`, 문서·`/guide` 1칸 | — |
| CC-MOVIE-01 | `shorts-onestop-studio/src/lib/productVideoHandoff.ts`(기준) · `src/components/views/YoutubeUploadCard.tsx`(링크 1개) · tests | **`next.config.ts` 수정 없음**, A2의 `api/product-return` 경로는 만들지 않음 |
| Master | `docs/SHARED_MODULES.md` · `scripts/check-shared-modules.mjs` | 공용 모듈 등록 점유 |

순서: ECOM 표·확인 화면 배포 → 원스톱 링크 배포.

## 5. 검수 기준
| 묶음 | 담당 | 합격 조건 |
|---|---|---|
| 순수 함수 | MOVIE·ECOM | 링크에 item·video만(제목·상품 번호 없음) · 잘못된 UUID/11자 아님 거부 · youtube[]에 없는 videoId 거부 · from 다름·product.id UUID 아님 거부 · 예약 없는 private 거부/예약 private 허용 · 주소는 videoId로 재구성 |
| 권한(격리 DB) | ECOM | 다른 회원 item → 3단계에서 「영상을 찾을 수 없습니다」 · 서버 동작을 건너뛴 직접 insert(남의 상품) RLS 거절 · UPDATE·DELETE 시도 0행(정책 없음) · 다른 회원 select 0행 · **정책 수 = 2** · 운영 `shorts_onestop_items_select_own` 존재 확인(`pg_policies` 읽기) |
| 중복 | ECOM | 같은 링크 동시 2회 → 1행·한쪽 「이미 붙어 있습니다」 · 값 갱신 0 |
| 만료·변경 | ECOM | 확인 화면을 띄운 뒤 원스톱에서 프로젝트 삭제·업로드 기록 없음·상품 삭제·공개 범위 private 변경 → 「붙이기」 때 거절, 저장 0 · GET 화면 열기만으로 저장 0 |
| 노출 | ECOM | export-html·zip·copy·타 프로그램 상품 조회에 영상 0건 · 예약 전 링크 숨김 |
| **음성 회귀(COOP 보존)** | MOVIE | `next.config.ts` 변경 0줄 · 배포 뒤 `/`·`/design`·`/topic` 응답 헤더에 COOP `same-origin`·COEP `credentialless` 그대로, `/fms-bgm`은 없음 그대로 · 원스톱 화면에서 `self.crossOriginIsolated === true` · 무료 음성 여러 줄(`freeTtsThreads() > 1`) 그대로 · 무료음악 창 연결(`/fms-bgm`) 회귀 없음 |
| 실화면(배포 뒤, ego, 시험 계정) | QA 또는 MOVIE | 링크 → 새 탭 확인 카드 → 붙이기 → 상품 화면 표시 · 다시 → 「이미 붙어 있습니다」 · 로그아웃 상태 링크 → 로그인 뒤 같은 카드 · 권한 없는 계정 → 메인 사이트 안내, 저장 0. 유튜브 새 업로드·AI 호출 0 |

## 6. 결정·후속 후보
| 항목 | 상태 |
|---|---|
| 「떼기」 + DELETE 정책 | 후속(별도 승인) |
| 중복 시 갱신 | 없음(UPDATE 정책 없음) |
| 상품당 상한 | 없음 |
| 원스톱이 붙임 결과 표시 | 후속 후보(원스톱이 관리자 키로 남의 표를 읽는 일이 생겨 이번엔 제외) |
| 예비안 라(서명 토큰) | 운영 DB에서 `shorts_onestop_items_select_own`이 없거나 교차 앱 읽기를 막기로 결정되면 전환 — 공유 비밀값 환경변수 2곳(주인님 입력)·10분 만료·1회용 번호 필요 |

## 7. 인수 조건별 판정
| 조건 | 판정 | 근거 절 |
|---|---|---|
| COOP 환경에서 opener에 의존하지 않는 흐름 | PASS(계약) | 2·3-1 |
| 권한 검증(SELECT·INSERT만) | PASS(계약) | 3-2·3-3 |
| 중복 | PASS(계약) | 3-5 |
| 만료 | PASS(계약) | 3-5(만료 불필요 이유와 누르는 순간 재판정) |
| 기존 음성 회귀 검수 | PASS(기준 명시) | 5 음성 회귀 |
| A2 판정 기록 | PASS | 0 |
| 구현·SQL 실행·배포·실화면 | NOT_RUN | 범위 밖 |

## 8. 실행·미실행·제약
- 실행: `orca orchestration inbox --full`(맥미니 FAIL 원문 읽기), `git grep`·`git log -1 -- <경로>`·파일 읽기(종료코드 0).
- 미실행: 제품 편집 0, 운영 데이터 변경·SQL 실행 0(운영 `pg_policies`도 조회하지 않음), 빌드·배포 0, AI 호출 0, 비용 0.
- 제약: 운영 DB의 `shorts_onestop_items` 읽기 정책은 마이그레이션 근거뿐 — ECOM 구현 전 읽기 조회로 확인 필요. 상세페이지 서버가 원스톱 표를 읽는 교차 앱 읽기를 Master가 허용해야 함(쓰기 없음).
- 다음 역할: CX-MASTER-01 확정(교차 앱 읽기 허용 포함) → 공용 모듈 점유 → CC-ECOM-01 수신 구현 → CC-MOVIE-01 링크 구현 → CX-QA-01 재검수.
