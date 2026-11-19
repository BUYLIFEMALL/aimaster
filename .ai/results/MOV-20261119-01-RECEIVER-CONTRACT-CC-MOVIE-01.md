# MOV-20261119-01-RECEIVER-CONTRACT 결과 — 상품영상 송수신 계약 **고정판 v2** — Claude(Movie) `claude-win-video` [역할: video]

| 항목 | 값 |
|---|---|
| 작업 / 시도 / 계획 / 배정 | MOV-20261119-01-RECEIVER-CONTRACT / **A2** / P6 / **2** (A1 = cfd969004 후보판) |
| CAT / ROLE / WORKSPACE | 영상(원스톱)↔이커머스(상세페이지) / CC-MOVIE-01 / 등록된 기존 AIMaster 세션(메인 윈도우 `D:\AIMaster`) |
| 허용 경로 | 이 계약 문서(수신 검토 B1~B6 병합)만 |
| 기준 / 선행 / 검수 | cfd969004 / CC-ECOM-01 수신측 조건부 검토 msg_fc63273e032e / CX-MASTER-01 |
| 반영한 지시 | Master msg_61f2f4de2d4e, 주인님 DB 표 추가 승인(msg_37ad72a6969d 전달, 2026-11-20 「DB 표 추가 승인할게 진행해」) |
| 제출 상태 | ready_review |

## 0. A1 → A2 바뀐 점
| 번호 | A1 후보 | A2 고정 | 출처 |
|---|---|---|---|
| B1 | READY는 받는 쪽도 출처 검사 | READY의 **받는 쪽(원스톱)** 이 `event.origin`·`event.source` 검사, 받는 창은 붙을 때마다 READY 1회, 원스톱은 창당 JOB 1회 | ECOM 1) |
| B2 | 받는 쪽도 jobId 대조 | 원스톱이 jobId를 **주소 `?job=` 쿼리**로 실음(# 아님 — 로그인 왕복 때 사라짐) | ECOM 2) |
| B3 | 서버 동작에서 소유 확인 | 서버 동작 재검사 + **insert RLS에 본인 상품 exists** → DB가 최종 거절, 회원 세션으로 기록 | ECOM 3) |
| B4 | 표 추천(jsonb도 가능) | **새 표만**(상품 표에 칸 금지), 본인 상품 화면에서만 표시, 내보내기·복사·마켓에 넣지 않음 | ECOM 5) |
| B5 | 30초 안에 SAVED 없으면 확인 필요 | **READY 대기(로그인 포함, 상한 10분)와 SAVED 대기(30초)를 나눔** | ECOM 7) |
| B6 | 서버 POST 뒤 창 열기 | **누르는 즉시 창부터 열고** POST는 나란히 | ECOM 7) |
| 중복 | 영향 0행이면 duplicate | 그대로 + **첫 배포는 기존 값 유지(갱신 없음)** | Master |
| RLS | 본인 행만 | **SELECT·INSERT·DELETE 3종, UPDATE 정책 없음** | Master·ECOM 대조 |
| 상한·떼기 | 없음 | **결정/후속 후보로 분리**(아래 7절) | Master |

## 1. 근거(경로 기준 SHA, 읽기만)
| 근거 | 파일 @SHA | 사실 |
|---|---|---|
| 기존 규격 | `shop-detail-page/lib/productPhotoHandoff.ts` @60860337b(기준 `banana-canvas/src/lib/productPhotoHandoff.ts`) | READY·JOB·SAVED, 출처 주소 정확 일치 + 같은 jobId, UUID 검사, 1회용 결과 번호 |
| 여는 방향 | `shop-detail-page/components/products/ShortsHandoffCard.tsx` @b1faa2606 | `rel="noopener noreferrer"` → 원스톱 창 `window.opener` 없음. 이 링크는 그대로 둠 |
| READY 보내는 법 | `shop-detail-page/components/products/GifInbox.tsx`(ECOM 인용 57-59줄) | 받는 창이 붙을 때 `window.opener.postMessage({type}, 송신 주소)` 1회, 받는 메시지는 origin만 검사 → 새 받는 창은 source도 검사 |
| 저장·소유 본보기 | `shop-detail-page/lib/actions/mainPhoto.ts` @0abd5aabd, `components/products/MainPhotoBatch.tsx` @60860337b | `requireProgramAccess()` + `.eq("id").eq("user_id")`, 차례 저장, 예외에도 실패 응답 |
| 로그인 왕복 | `shop-detail-page/lib/auth.ts`·`lib/actions/auth.ts`·`middleware.ts`(ECOM 인용) | `/login?redirect=<경로+쿼리>` 같은 창·같은 출처 → opener·쿼리 유지, # 은 사라짐. 권한 없음·정지·핸드폰 미등록은 `lib/access.ts`가 메인 사이트로 보냄 |
| 상품 표를 읽는 곳 | `coupang-ops/src/lib/shop.ts`, `elevenst-register/src/lib/shop.ts`, `esm-register/src/lib/data.ts`, `mall-builder/src/lib/store.ts`, `shop-detail-page/app/api/products/[id]/copy/route.ts`(select *) | 상품 표에 칸을 붙이면 공개 전 영상 정보가 딸려 감 → 새 표 |
| 보낼 내용 | `shorts-onestop-studio/src/app/api/work-inbox/route.ts` @ea85e9879, `src/lib/script.ts` @584ca0d4e | 본인 행 서버 재조회, `YoutubeUpload {videoId,url,title,privacy,publishAt,channel,uploadedAt}` |
| 송신 버튼 자리 | `shorts-onestop-studio/src/components/views/YoutubeUploadCard.tsx` @0807cf180 | 업로드 기록 줄마다 버튼 자리, 기본 공개 범위 private |

## 2. 고정 계약

### 2-1 흐름과 시간 단계
| 단계 | 원스톱(보내는 창) | 상세페이지(받는 창) | 대기 상한 | 끝났을 때 원스톱 표시 |
|---|---|---|---|---|
| 1 누름 | 누르는 **즉시** `jobId` 만들고 `window.open("https://shop-detail-page.buylife.xyz/products/video-inbox?from=onestop&job=<jobId>")`, 참조 보관. 동시에 `POST /api/product-return {id, videoId}` | — | — | 창이 안 열리면(팝업 차단) 「팝업을 허용해 주세요」, 보내지 않음 |
| 2 준비 | READY 기다림 + 보낼 내용 응답 기다림 | 로그인·권한 통과 → 주소의 `from`·`job` 확인 → `window.opener.postMessage({type:READY, jobId}, 원스톱 주소)` 1회 | **10분**(로그인 시간 포함). 창이 닫히면 바로 끝 | 상한 초과·창 닫힘·보낼 내용 오류 → 「보내지 않았습니다」(JOB 전이므로 다시 눌러도 안전) |
| 3 보냄 | READY와 보낼 내용이 둘 다 준비되면 JOB 1회 | JOB 검사 → 서버 동작 → SAVED | — | — |
| 4 확인 | SAVED 기다림 | — | **JOB 뒤 30초** | 무응답·창 닫힘·ID 불일치 → 「확인 필요 — 상품 화면에서 직접 확인해 주세요」, **자동 재전송 0** |

- 받는 창이 메인 사이트로 넘어가는 경우(권한 없음·정지·핸드폰 미등록)는 READY가 오지 않으므로 2단계 상한/창 닫힘으로 「보내지 않았습니다」.
- 받는 창은 새로고침·로그인 복귀 때 READY를 다시 보낼 수 있음 → 원스톱은 **두 번째 READY에 JOB을 다시 보내지 않음**(이미 보냈으면 그대로 4단계 대기, 끝나면 「확인 필요」).

### 2-2 창·이벤트 검증(양쪽 의무)
| 받는 메시지 | 받는 쪽 | 받아들이는 조건(모두 만족) | 아니면 |
|---|---|---|---|
| READY | 원스톱 | `event.origin === "https://shop-detail-page.buylife.xyz"` · `event.source === 내가 연 창 참조` · `data.type === READY` · `data.jobId === 내 jobId` · 이 창에 아직 JOB 안 보냄 | 조용히 무시 |
| JOB | 상세페이지 | `event.origin === "https://shorts-onestop-studio.buylife.xyz"` · `event.source === window.opener` · `data.jobId === 주소의 job` · 이 창에서 받은 첫 JOB | 조용히 무시(형식 오류만 SAVED ok:false) |
| SAVED | 원스톱 | origin=상세 · source=내 창 · `jobId`·`returnId`·`productId`·`videoId`가 보낸 값과 모두 같음 | 무시(4단계 상한이면 「확인 필요」) |

Lab·옛 `*.vercel.app` 주소는 양쪽 모두 받지 않음.

### 2-3 ID
| 값 | 형식 | 만드는 쪽 | 실리는 곳 |
|---|---|---|---|
| `jobId` | UUID | 원스톱(창 열 때마다) | 받는 창 주소 `?job=`, READY·JOB·SAVED |
| `returnId` | UUID | 원스톱(JOB마다) | JOB·SAVED |
| `productId` | UUID | 원스톱 서버(`data.product.id`) | JOB·SAVED |
| `videoId` | `^[A-Za-z0-9_-]{11}$` | 원스톱 서버(`data.youtube[n]`) | JOB·SAVED |
| `sourceItemId` | UUID | 원스톱 서버(`shorts_onestop_items.id`) | JOB(기록용, 받는 쪽은 신뢰하지 않음) |

jobId는 비밀이 아님(주소 노출 무방). SAVED는 받은 4개 ID를 그대로 되돌림.

### 2-4 메시지
| 종류 | 방향 | 본문 |
|---|---|---|
| `aimaster-product-video-ready` | 상세 → 원스톱 | `{type, jobId}` |
| `aimaster-product-video` | 원스톱 → 상세 | `{type, jobId, returnId, productId, sourceItemId, video:{videoId, title(≤100), privacy, publishAt|null, uploadedAt}}` — **주소(url)는 싣지 않음**, 받는 쪽이 `https://www.youtube.com/shorts/<videoId>`로 만듦 |
| `aimaster-product-video-saved` | 상세 → 원스톱 | `{type, jobId, returnId, productId, videoId, ok, duplicate, error(≤200)}` |

### 2-5 소유권 검사(원자적) — B3
1. 받는 창 페이지: `requireProgramAccess()`.
2. 서버 동작(로그인 **회원 세션** 클라이언트, 관리자 키 금지): 권한 재확인 → 브라우저 검사와 별개로 UUID·videoId 정규식·privacy 허용값·제목 길이·시각 형식·「예약 없는 private 거부」를 **다시** 검사 → `insert … on conflict do nothing returning id` **한 문장**.
3. DB insert 정책: `auth.uid() = user_id AND exists (select 1 from shop_products p where p.id = product_id and p.user_id = auth.uid())`. 서버 동작에 실수가 있어도 DB가 남의 상품 행을 거절. 확인과 저장이 한 문장이라 그 사이 소유가 바뀌는 틈 없음.
4. 거절 문구는 하나로 통일: 「본인 상품이 아닙니다.」(상품이 없는 것과 구분하지 않음, `setMainPhotoAction`과 같은 방식).

### 2-6 저장 표(주인님 승인 범위 그대로)
`shop_product_videos`: `id uuid pk`, `user_id uuid not null`, `product_id uuid not null → shop_products(id) on delete cascade`, `video_id text not null`, `title text`, `privacy text`(public·unlisted·private), `publish_at timestamptz`, `uploaded_at timestamptz`, `source_item_id uuid`, `source text default 'shorts-onestop-studio'`, `created_at timestamptz default now()`, `unique(user_id, product_id, video_id)`, `user_id` 색인.

**RLS 정책 3종(UPDATE 없음)**
| 정책 | 조건 |
|---|---|
| SELECT | `auth.uid() = user_id` |
| INSERT | `auth.uid() = user_id` AND 본인 `shop_products` exists(2-5의 3) |
| DELETE | `auth.uid() = user_id` (후속 「떼기」용으로 미리 둠 — 첫 배포 화면엔 버튼 없음) |
| UPDATE | **정책 만들지 않음 → 수정 불가** |

- ECOM 검토문의 「RLS 4종」 표기는 나열된 3종(select·insert·delete)과 수가 어긋남 → 이 고정판은 **3종**으로 확정, ECOM 구현 SQL을 이 표와 대조.
- 파일 저장 없음(글자 정보만), 상품이 30일 정리로 지워지면 cascade로 함께 삭제 → `cleanup-generated` 수정 불필요.
- `shop_products`에는 칸을 붙이지 않음(B4).

### 2-7 대상 영상과 노출 — B4
| 경우 | 원스톱 | 상세페이지 표시 |
|---|---|---|
| public·unlisted | 보냄 | 영상 링크 |
| private + `publishAt`(예약) | 보냄 | 예약 시각 **전**: 「○월 ○일 ○시 공개 예정(KST)」 글만, **링크 숨김**. 시각 **뒤**: 「예약 시각 지남 — 유튜브에서 확인」 + 링크(「공개됨」이라 단정하지 않음, 유튜브 호출 없음) |
| private(예약 없음) | 버튼에 「비공개 영상은 상품 화면에 붙일 수 없습니다」, 안 보냄 | — (서버도 거부) |
| 로컬 MP4 | 대상 아님 | — |

- 표시 위치는 **로그인한 본인 상품 화면뿐**. 내보내기(`export`·`export-html`·`export-zip`)·복사 문구(`copy`)·마켓 등록·다른 프로그램에는 넣지 않음.
- 안내 1줄: 「유튜브에서 예약을 바꾸거나 영상을 지워도 여기 기록은 바뀌지 않습니다.」

### 2-8 성공/실패/중복
| 결과 | SAVED | 원스톱 표시 |
|---|---|---|
| 새로 저장(1행) | `ok:true, duplicate:false` | 「상품 화면에 붙였습니다」 + 상품 화면 링크 |
| 같은 회원·상품·영상 이미 있음(0행) | `ok:true, duplicate:true` | 「이미 붙어 있습니다」 — **기존 값 유지, 제목·예약 시각 갱신 없음** |
| 소유 아님·형식 오류·권한 없음·저장 실패·예외 | `ok:false, error` | 빨간 이유 |

- 동시 2회(두 창·연타)도 DB unique가 1행만 남기고 한쪽은 duplicate. 받는 창의 `returnId` 기억은 보조(새로고침하면 사라짐), 최종 책임은 DB.
- 다시 보내기는 회원이 직접 누를 때만, 새 창·새 `jobId`·새 `returnId`.

## 3. 담당별 편집 범위(이번 작업 0)
| 담당 | 파일 | 내용 |
|---|---|---|
| CC-ECOM-01 | `shop-detail-page/supabase/migrations/<날짜>_product_videos.sql` | 2-6 표·RLS 3종·unique·색인(승인됨, 적용 시점은 Master 배정) |
| CC-ECOM-01 | `lib/productVideoHandoff.ts`(공용 사본) · `lib/actions/productVideos.ts` · `app/(dashboard)/products/video-inbox/page.tsx` · `components/products/VideoInbox.tsx` · `components/products/ProductVideos.tsx` · tests | 받는 창·서버 동작·목록 |
| CC-ECOM-01 | `app/(dashboard)/products/[id]/page.tsx`(목록 1줄) · `lib/version.ts` · 문서·`/guide` 1칸 | 최소 수정 |
| CC-ECOM-01 건드리지 않음 | `shop_products` 표, export 3종, copy, cleanup-generated, ShortsHandoffCard | — |
| CC-MOVIE-01 | `shorts-onestop-studio/src/lib/productVideoHandoff.ts`(공용 **기준**) · `src/lib/productReturn.ts` · `src/app/api/product-return/route.ts` · `src/components/views/YoutubeUploadCard.tsx` · tests | 메시지 검사·보낼 내용·창 열기·단계 표시 |
| Master | `docs/SHARED_MODULES.md` · `scripts/check-shared-modules.mjs` | 공용 모듈 `product-video-handoff` 등록 점유(기준 원스톱 — ECOM 동의) |

순서: ECOM 수신(표 적용 → 받는 창) 배포 먼저 → 원스톱 송신 배포. 배포 빌드 비용은 별도 승인.

## 4. 검수 기준(합격선)
| 묶음 | 담당 | 합격 조건 |
|---|---|---|
| 순수 함수(원스톱) | MOVIE | 상품 번호 없음/UUID 아님/다른 출처→보낼 내용 없음 · 예약 없는 private 거부 · videoId 지정/없으면 최신 · 본문 키 고정(url 없음) · READY 검사: 다른 origin·다른 source·다른 jobId·두 번째 READY → 무시 |
| 순수 함수(상세) | ECOM | JOB 검사: 다른 origin·source≠opener·주소 job과 다른 jobId → 무시 / productId·videoId·privacy·시각 형식 오류 거절 / 주소 재구성(본문 url 무시) |
| DB(격리 환경) | ECOM | 다른 회원 상품 → 0행·통일 문구 · 서버 동작을 건너뛴 직접 insert도 RLS 거절 · UPDATE 시도 0행 · 동시 2회 → 1행·한쪽 duplicate · 상품 삭제 → 영상 행 삭제 · 다른 회원 select 0행 · 정책 수 = 3 |
| 두 창 모의 | MOVIE+ECOM | READY 1회·JOB 1회 · 두 번째 READY 재전송 0 · 로그인 복귀 뒤 opener·job 유지 · JOB 전 창 닫힘 = 「보내지 않았습니다」 · READY 10분 상한 · JOB 뒤 30초 무응답 = 「확인 필요」·자동 재전송 0 · 서버 예외에도 SAVED ok:false |
| 노출 | ECOM | export-html·zip·copy 프롬프트·타 프로그램 상품 조회에 영상 정보 0건 · 예약 전 링크 숨김·글만 |
| 실화면(배포 뒤, ego, 시험 계정 `buylifemall@naver.com`) | QA 또는 MOVIE | 누르는 즉시 팝업 열림(차단 없음) · 로그아웃 상태에서 로그인 뒤 이어짐 · 기존 업로드 1건 붙이기 → 상품 화면 표시 · 다시 눌러 「이미 붙어 있습니다」 · 권한 없는 계정은 받는 창이 안 뜨고 「보내지 않았습니다」. 유튜브 새 업로드·AI 호출 0 |

## 5. 결정·후속 후보(이번 계약 밖)
| 항목 | 상태 | 비고 |
|---|---|---|
| 상품당 보관 상한 | 없음으로 진행(주인님 무응답 → 추천안) | 둔다면 개수 확인·저장 사이 경합으로 1건 초과 가능 → 「대략」 상한만 |
| 중복 시 갱신 | 첫 배포는 갱신 없음(기존 값 유지) | 바꾸려면 UPDATE 정책 신설 = 별도 승인 |
| 「떼기」 화면 | 후속 | DELETE 정책은 표에 미리 있음 |

## 6. 인수 조건별 판정
| 조건 | 판정 | 근거 절 |
|---|---|---|
| 양쪽 창·이벤트/ID 검증 | PASS(고정) | 2-2·2-3 |
| 로그인·타임아웃 단계 | PASS(고정) | 2-1 |
| 원자적 소유권 검사 | PASS(고정) | 2-5·2-6 |
| 중복 정책 | PASS(고정) | 2-8 |
| 예약 공개 전 노출 | PASS(고정) | 2-7 |
| 검수 기준 연결 | PASS | 4 |
| 구현·SQL 실행·배포·실화면 | NOT_RUN | 범위 밖 |

## 7. 실행·미실행·제약
- 실행: `orca orchestration inbox --full`(ECOM 검토·승인 전문 읽기, 종료코드 0), 파일 읽기·`git log -1 -- <경로>`만.
- 미실행: 제품 편집 0, SQL 실행 0, 빌드·배포 0, AI·유튜브 호출 0, 비용 0.
- 남은 제약: ECOM 검토문의 일부 SHA(GifInbox·auth·middleware)는 ECOM 인용을 그대로 둠(이번에 다시 대조하지 않음). 실화면 동작은 배포 뒤에만 확인 가능.
- 다음 역할: CX-MASTER-01 확정 → 공용 모듈 점유 → CC-ECOM-01 수신 구현 배정 → CC-MOVIE-01 송신 구현.
