# MOV-20261119-01-RECEIVER-CONTRACT 결과 — Claude(Movie) `claude-win-video` [역할: video]

| 항목 | 값 |
|---|---|
| 작업 / 시도 / 계획 / 배정 | MOV-20261119-01-RECEIVER-CONTRACT / A1 / P6 / 1 |
| CAT / ROLE / WORKSPACE | 영상(원스톱)↔이커머스(상세페이지) / CC-MOVIE-01 / 등록된 기존 AIMaster 세션(메인 윈도우 `D:\AIMaster`) |
| 허용 경로 | 원스톱 영상 반환·상세페이지 수신 경계 **읽기** + 계약 정리(이 파일) |
| 기준 / 선행 / 검수 | 3feb2bd85 / CC-ECOM-01 수신측 대조 msg_22edc6ba9f09 / CX-MASTER-01 |
| 제출 상태 | ready_review |

## 판정 요약
**확정 후보 1개를 제출합니다: 「원스톱이 상세페이지 받는 창을 열고 → 작업 번호(jobId)로 보내고 → 상세페이지가 본인 상품인지 서버에서 확인해 저장한 뒤 → 저장 확인(SAVED)을 돌려주는」 단일 창 경로.** Master가 지정한 기존 jobId·SAVED 형식(`product-photo-handoff`)을 그대로 따르되, **여는 방향만 반대**입니다(아래 1-2의 새 사실 때문).

## 1. 근거(경로 기준 SHA, 모두 읽기만)
| 근거 | 파일 @SHA | 사실 |
|---|---|---|
| 1-1 기존 규격 | `shop-detail-page/lib/productPhotoHandoff.ts` @60860337b(기준 `banana-canvas/src/lib/productPhotoHandoff.ts`) | 메시지 4종(READY·JOB·RESULT·SAVED), 출처 주소 정확 일치 + 같은 jobId일 때만 받음, 상품 번호 UUID 검사, 결과마다 1회용 `resultId`(ECOM-17), 알 수 없는 응답은 「확인 필요」 |
| 1-2 **새 사실** | `shop-detail-page/components/products/ShortsHandoffCard.tsx` @b1faa2606 | 「🎬 쇼츠로 만들기」가 `<a target="_blank" rel="noopener noreferrer">` → 원스톱 창의 `window.opener`가 비어 있음. 게다가 영상 주소는 유튜브 업로드 뒤(수 분~수 시간 뒤)에야 생겨 그때 상세페이지 창이 열려 있다는 보장이 없음 → **상세페이지가 연 창이 되돌려 주는 방향은 쓸 수 없음** |
| 1-3 수신측 저장·소유 확인 본보기 | `shop-detail-page/components/products/MainPhotoBatch.tsx` @60860337b | 결과를 한 개씩 차례로 저장(`chain`), 서버 동작이 실패·예외여도 반드시 SAVED(ok:false) 응답 |
| 1-4 송신 내용 만드는 법 | `shorts-onestop-studio/src/app/api/work-inbox/route.ts` @ea85e9879 | 브라우저 값 대신 `getItem(userId, id)`로 **회원 본인 행을 서버가 다시 읽어** `data.youtube[]` 중 지정 videoId(없으면 최신) 1건을 꺼냄 |
| 1-5 영상 기록 형식 | `shorts-onestop-studio/src/lib/script.ts` @584ca0d4e | `YoutubeUpload {videoId,url,title,privacy,publishAt,channel,uploadedAt}`, `product?: ProductRecord`(`id`·`from`) |
| 1-6 송신 버튼 자리 | `shorts-onestop-studio/src/components/views/YoutubeUploadCard.tsx` @0807cf180 | 업로드 기록 줄마다 `SendToWorkspaceButton`이 있음 → 같은 줄에 버튼 하나 추가. 기본 공개 범위가 `private`, 예약 공개는 그때까지 private |
| 1-7 상품 번호 | `shorts-onestop-studio/src/lib/productShorts.ts` @3904d0abc | `product-id`는 `[A-Za-z0-9_-]` 64자 검사만, 누구 상품인지 검사 없음(주소 # 값이라 위조 가능) |
| 1-8 수신측 현재 상태 | msg_22edc6ba9f09(CC-ECOM-01) | 상세페이지에 영상 수신 API·저장 칸 없음 |

## 2. 연결 계약(확정 후보)

### 2-1 흐름
1. 원스톱 업로드 기록 줄 「🛍 상품 화면에 붙이기」 → 원스톱 서버 `POST /api/product-return {id, videoId}`가 본인 행을 다시 읽어 보낼 내용을 만듦(1-4 방식). 조건이 안 맞으면 버튼 대신 이유 표시.
2. 원스톱이 `window.open("https://shop-detail-page.buylife.xyz/products/video-inbox?from=onestop")`로 받는 창을 **열고 참조를 쥠**(noopener 아님).
3. 받는 창이 로그인·프로그램 권한 확인 뒤 `READY`를 `https://shorts-onestop-studio.buylife.xyz`로만 보냄.
4. 원스톱이 `JOB`을 받는 창 주소로만 보냄(창 하나에 1회).
5. 받는 창이 형식 검사 → 서버 동작으로 **소유 확인 + 저장** → `SAVED` 응답.
6. 원스톱 줄에 「붙였습니다 / 이미 붙어 있습니다 / 실패(이유) / 확인 필요」 표시.

### 2-2 송수신 ID
| 값 | 형식 | 만드는 쪽 | 쓰임 |
|---|---|---|---|
| `jobId` | UUID v4 | 원스톱(창 열 때마다 새로) | 창·메시지 묶음 확인(기존 규격과 같음) |
| `returnId` | UUID v4 | 원스톱(보낼 때마다 새로) | SAVED가 어느 보내기의 응답인지 정확히 대조(ECOM-17 `resultId`와 같은 역할) |
| `productId` | UUID(`isUuid`) | 원스톱 서버가 `data.product.id`에서 | 받는 쪽이 `shop_products.id`로 조회. UUID가 아니면 보내지 않음 |
| `videoId` | `^[A-Za-z0-9_-]{11}$` | 원스톱 서버가 `data.youtube[n]`에서 | 중복 막기 키 |
| `sourceItemId` | UUID | 원스톱 서버(`shorts_onestop_items.id`) | 기록·되짚기용(받는 쪽은 신뢰하지 않음) |

### 2-3 메시지(이름은 기존 규칙 `aimaster-product-*`를 따름)
| 종류 | 보내는 쪽 → 받는 쪽 | 본문 |
|---|---|---|
| `aimaster-product-video-ready` | 상세 → 원스톱 | `{type}` |
| `aimaster-product-video` | 원스톱 → 상세 | `{type, jobId, returnId, productId, sourceItemId, video:{videoId, title(≤100), privacy, publishAt|null, uploadedAt(ISO)}}` — **주소(url)는 보내지 않고 받는 쪽이 `https://www.youtube.com/shorts/<videoId>`로 다시 만듦**(다른 주소가 끼어들 여지 제거) |
| `aimaster-product-video-saved` | 상세 → 원스톱 | `{type, jobId, returnId, productId, videoId, ok, duplicate, error(≤200)}` |

양쪽 모두 `event.origin`이 정확히 상대 운영 주소이고, `event.source`가 내가 연/나를 연 창이며, `jobId`가 같을 때만 받음. 그 밖은 조용히 무시(기존 `readProductJob`과 같음). Lab·옛 vercel.app 주소는 받지 않음.

### 2-4 상품 소유자 검증(받는 쪽, 필수)
- 받는 창 페이지: `requireProgramAccess()`(로그인 + `shop-detail-page` 권한). 서버 동작: 다시 권한 확인 → `shop_products`에서 `id = productId AND user_id = 로그인 회원`을 **서버에서** 조회 → 없으면 `ok:false, error:"본인 상품이 아닙니다."`(있는지 없는지 구분해 알려 주지 않음).
- 원스톱 회원과 상세페이지 로그인 회원이 달라도(`.buylife.xyz` 로그인 공유라 보통 같음) 위 조건으로 저장이 막힘 → 별도 신원 교환 불필요.
- 원스톱 쪽도 보내기 전 `data.product.from === "AI 상세페이지 자동화"`이고 `id`가 UUID인 경우만 버튼을 보임(보조 장치일 뿐, 신뢰 근거는 받는 쪽 서버 검사).

### 2-5 보낼 수 있는 영상
| 경우 | 처리 |
|---|---|
| `public`·`unlisted` | 보냄 |
| `private` + `publishAt`(예약 공개) | 보냄, 받는 쪽은 「○월 ○일 공개 예정」으로 표시 |
| `private`(예약 없음) | 원스톱 버튼에 「비공개 영상은 상품 화면에 붙일 수 없습니다」, 보내지 않음 |
| 로컬 MP4(업로드 안 함) | 대상 아님(Master 지시대로 별도) |

### 2-6 성공 / 실패 / 중복
| 결과 | SAVED | 원스톱 표시 |
|---|---|---|
| 새로 저장 | `ok:true, duplicate:false` | 「상품 화면에 붙였습니다」 + 상품 화면 링크 |
| 이미 같은 상품·같은 영상 | `ok:true, duplicate:true` | 「이미 붙어 있습니다」 |
| 소유 아님·형식 오류·권한 없음·저장 실패·예외 | `ok:false, error` | 빨간 이유 |
| 30초 안에 SAVED 없음, 받는 창 닫힘, `returnId` 불일치 | — | 「확인 필요 — 상품 화면에서 직접 확인해 주세요」 |

- **중복 막기는 받는 쪽 DB가 최종 책임**: `unique(user_id, product_id, video_id)` + `insert … on conflict do nothing` → 영향 0행이면 `duplicate:true`. 그래서 회원이 다시 눌러도 두 번 저장되지 않음.
- 원스톱은 SAVED 전·「확인 필요」 상태에서 **자동 재전송 금지**(MOV-20261116-02·ECOM16 교훈). 다시 보내기는 회원이 직접 누를 때만, 새 `returnId`로.
- 받는 창은 한 번에 1건만 처리(`chain`), 같은 `returnId`를 두 번 받으면 두 번째는 저장 없이 직전 결과를 다시 응답.

### 2-7 저장 칸 후보(받는 쪽 결정·승인 대상)
새 표 `shop_product_videos`(`id uuid pk`, `user_id`, `product_id → shop_products on delete cascade`, `video_id`, `title`, `privacy`, `publish_at`, `uploaded_at`, `source_item_id`, `source text default 'shorts-onestop-studio'`, `created_at`) + `unique(user_id, product_id, video_id)` + RLS 본인 행만. 상품이 지워지면 함께 지워져 기존 30일 정리(`cleanup-generated`)를 따로 고칠 필요 없음. `shop_products`에 jsonb 칸을 붙이는 방식도 가능하나 중복 막기 제약을 걸기 어려워 표 방식을 추천합니다.

## 3. 담당별 편집 범위(이번 작업에서는 아무것도 고치지 않음)
| 담당 | 파일(예정) | 내용 |
|---|---|---|
| CC-ECOM-01 | `shop-detail-page/supabase/migrations/<날짜>_product_videos.sql` | 2-7 표·RLS·unique (**DB 승인 필요**) |
| CC-ECOM-01 | `shop-detail-page/app/(dashboard)/products/video-inbox/page.tsx` + 컴포넌트 | 받는 창: READY·JOB 검사·SAVED |
| CC-ECOM-01 | `shop-detail-page/lib/actions/productVideos.ts` | 권한 + 소유 조회 + insert on conflict |
| CC-ECOM-01 | `shop-detail-page/app/(dashboard)/products/[id]/page.tsx` | 「만든 쇼츠」 목록 표시 |
| CC-MOVIE-01 | `shorts-onestop-studio/src/lib/productReturn.ts` | 보낼 내용 만드는 순수 함수(2-2·2-5 규칙) |
| CC-MOVIE-01 | `shorts-onestop-studio/src/app/api/product-return/route.ts` | 본인 행 재조회(1-4 방식) |
| CC-MOVIE-01 | `shorts-onestop-studio/src/components/views/YoutubeUploadCard.tsx` | 줄마다 버튼·창 열기·SAVED 대기·상태 표시 |
| **Master 결정** | 메시지 검사 함수 모듈 위치 | 추천: 공용 기준 코드 1개(`product-video-handoff`, 기준 원스톱 `src/lib/productVideoHandoff.ts`, 사본 `shop-detail-page/lib/productVideoHandoff.ts`). 등록은 공용 파일 `docs/SHARED_MODULES.md`·`scripts/check-shared-modules.mjs` 수정이라 점유 조정 필요 |

**순서**: ECOM 저장 칸·받는 창 배포가 먼저, 원스톱 버튼은 그 뒤 배포(받는 쪽 없이 송신을 먼저 보이지 않음 — 이번 지시 그대로). 그 사이 원스톱 코드는 미배포 대기로 둘 수 있음.

## 4. 최소 검수
| 단계 | 담당 | 무엇 |
|---|---|---|
| 순수 함수 시험 | MOVIE | 상품 번호 없음/UUID 아님→보내지 않음, 다른 출처→보내지 않음, 예약 없는 private→거부, videoId 지정/없으면 최신, 본문 키 고정(url 없음) |
| 순수 함수 시험 | ECOM | JOB 검사: 다른 출처·다른 jobId 무시, 잘못된 videoId·productId 오류, 주소 재구성 |
| DB 시험 | ECOM | 다른 회원 상품 → 저장 0·「본인 상품이 아닙니다」, 같은 영상 두 번 → 1행·duplicate:true, 상품 삭제 → 영상 행 삭제 |
| 두 창 모의 시험 | MOVIE+ECOM | 가짜 창 2개로 READY→JOB→SAVED, 30초 무응답→「확인 필요」·자동 재전송 0회, 받는 창 닫힘 |
| 실제 왕복(배포 뒤) | QA 또는 MOVIE | ego, 시험 계정 `buylifemall@naver.com`, 기존 업로드 기록 1건으로 붙이기 → 상품 화면 표시 → 한 번 더 눌러 「이미 붙어 있습니다」. 유튜브 새 업로드·AI 호출 0 |

## 5. 인수 조건별 판정
| 조건 | 판정 | 근거 |
|---|---|---|
| 송수신 ID 계약을 소스 경로와 함께 | PASS(후보) | 2-2·2-3, 근거 1-1·1-5·1-7 |
| 상품 소유자 검증 | PASS(후보) | 2-4, 근거 1-3·1-7 |
| 성공/실패 계약 | PASS(후보) | 2-6 |
| 중복 요청 계약 | PASS(후보) | 2-6(DB unique + 자동 재전송 금지 + returnId) |
| 담당별 편집 범위 | PASS | 3 |
| 최소 검수 | PASS | 4 |
| 실제 구현·실행 시험 | NOT_RUN | 이번 범위 밖(제품 편집·DB·배포 금지) |

## 6. 실행·미실행·제약
- 실행: `git log -1 --format=%h -- <파일>`(SHA 확인, 종료코드 0), `git grep`·파일 읽기만. 정적 검수 재실행 안 함(지시대로).
- 미실행: 제품 편집 0, DB 마이그레이션 0, 빌드·배포 0, AI·유튜브 호출 0, 비용 0.
- 제약·결정 필요: 저장 칸 신설(DB 승인), 공용 모듈 등록 위치(Master), 받는 창 주소 이름(ECOM이 바꿔도 됨 — 바꾸면 원스톱 상수만 맞춤).
- 다음 역할: Master 검토 → CC-ECOM-01 수신측 확정·DB 승인 요청 → 확정 뒤 CC-MOVIE-01 송신 구현.
