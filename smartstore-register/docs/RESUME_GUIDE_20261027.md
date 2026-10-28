# 재개 안내서 — AI 스마트스토어 상품 자동등록기 (`smartstore-register`)

> **다음에 이 프로그램을 이어서 작업하는 세션은 이 문서부터 읽는다.** 작성 2026-10-27 저녁, Claude Code 윈도우 `claude-win-sdp`, 역할 `ecommerce-image`.
> 운영 https://smartstore-register.buylife.xyz · 운영 DB ref `esgxyikcnnvmlhygjkth` · 운영 버전 **v1.17**(2026-10-28 갱신) · 미배포 대기 **없음**
> **2026-10-28 갱신 요약**: 남은 기능 1~8을 v1.14에 넣고, 테스트 계정(`buylifemall@naver.com`) 실제 「입력만」 시험으로 v1.15~v1.17 보정 → **실패 칸 0**(태그 1개 거절은 스마트스토어 규칙). 버전별 상세는 [`../AGENTS.md`](../AGENTS.md) v1.14~v1.17.
> 더 자세한 기록: 시험 경과·에러 원인 [`IMPROVEMENT_HANDOFF_20261027.md`](IMPROVEMENT_HANDOFF_20261027.md)(§1~§8 오전, §9~§12 오후) · 버전별 요약 [`../AGENTS.md`](../AGENTS.md) · 마켓 등록기 공통 레퍼런스 [`../../docs/MARKETPLACE_REGISTER_ANALYSIS_GUIDE.md`](../../docs/MARKETPLACE_REGISTER_ANALYSIS_GUIDE.md)

---

## 0. 다음 세션 첫 단계 체크리스트 (이 순서대로)
1. `node scripts/dev-requests.mjs list --role ecommerce-image` — 관리자 지시가 있으면 그것부터(절대 지시).
2. `docs/ACTIVE_WORK.md`에서 `smartstore-register/`·`shop-detail-page/`를 다른 세션이 잡고 있지 않은지 확인 → 내 줄 추가(안전 커밋 도우미).
3. `git status --porcelain -- smartstore-register` — 남의 미커밋 변경이 없는지.
4. 이 문서 §6 「남은 일」에서 주인님이 고른 항목을 플랜으로 보여 드린다(비용: Vercel 빌드 횟수 먼저 승인).
5. 시험은 주인님 PC에서(§4). 판매자센터는 Claude 크롬 도구로 열 수 없다.

## 1. 지금 무엇이 되나 (2026-10-27 기준, 모두 판매자센터 실제 화면에서 확인)

| 기능 | 상태 | 확인 방법 |
|---|---|---|
| 등록 방식 「입력만 / 임시저장까지 / 바로 등록」 | ✅ | 바로 등록 실제 상품번호 `13834442721`(전시중지) |
| 카테고리·상품명·판매가·즉시할인·재고 | ✅ | 작업 기록 + 화면 |
| 대표 이미지 + **추가 이미지**(참고 실물 사진 최대 9장) | ✅ v1.10 | 「추가이미지 2/9」 캡처 |
| 상세설명(스마트 에디터 ONE에 섹션 이미지 순서대로) | ✅ | 캡처 |
| 원산지·어린이제품인증 「인증대상 아님」 | ✅ | |
| 상품정보제공고시(상품군 + 「상품상세 참조」 + 고시 A/S 전화번호) | ✅ | |
| 배송: **배송비 템플릿 고르기**(「바이라이프」) 또는 직접 입력(택배사·무료/조건부/유료·기본 배송비·무료 조건) | ✅ | 템플릿 기본 배송비 4,000원 확인 |
| A/S 전화·안내, 판매자 코드 `AIM-…` | ✅ | |
| **옵션**(엑셀 일괄등록, 단독/조합, 옵션명 3개, 조합별 옵션가·재고) | ✅ v1.12 | 옵션목록 「총 2개」 캡처 |
| 「상품속성 미입력 확인」 창 자동 넘기기, 완료 창에서 상품번호 읽기 | ✅ v1.07 | |
| 오래 열어 둔 탭이 만든 작업 막기 | ✅ v1.11 | 「오래된 화면」 실패로 막힌 것 확인 |
| 같은 상품 「바로 등록」 중복 막기(한 번 더 체크해야 보냄) | ✅ v1.05 | |
| 이커머스 한 흐름(상세페이지 검토 완료 → 「스마트스토어에 등록하기」 → 결과·상품번호 표시) | ✅ | `shop-detail-page` v1.39 |
| **(v1.14~v1.17)** 카테고리 재시도(검색어 → 마지막 낱말 → 상세페이지 경로, 경로와 겹치는 줄 우선) | ✅ | 「노트북 백팩」 실패 → 「백팩」으로 「패션잡화>남성가방>백팩」 |
| 검색 태그(거절 창 닫고 거절 단어 기록) | ✅ | 여행백팩·출장가방 들어감, 노트북가방 거절 |
| 브랜드·제조사(숨은 칸 `vm.bindModel`) | ✅ | 모델명은 「찾기」(카탈로그) 전용이라 자동 입력 안 함 |
| 직접입력형 옵션, 추가상품 | ✅ | 패션 카테고리는 선택형을 먼저 끔(옵션 없는 작업) |
| 구매/리뷰 혜택(구매 포인트·리뷰 포인트·복수구매할인) | ✅ | 캡처 |
| 배송 직접 입력 확장·반품 택배사·옵션 관리코드 | ✅ 코드 | 템플릿 쓰는 계정이라 직접 입력은 실물 미시험 |
| 상품속성·예약구매 | ⚪ 미시험 | 예약구매 달력은 가장 불확실 |
| 여러 상품 연속 보내기·판매가 직접 입력·연결 계정 표시 | ✅ 배포 / 연속·판매가 칸은 실물 미시험 | 연결 계정 이메일 표시는 캡처 확인 |

## 2. 구조 지도 (파일 → 하는 일)

**웹(Next.js 16, `src/`)**
| 파일 | 하는 일 |
|---|---|
| `lib/smartstore/fields.ts` | **핵심.** 상품 + 스토어 기본값 + 옵션 → 확장이 실행할 단계 목록(`buildFillSteps`). 동작별 최소 확장 버전 `ACTION_MIN_EXT`, 「만든 세대」 `STEP_BUILDER`(지금 2)·`withBuilderMark`·`isCurrentBuild`·`withoutBuilderMark`, 추가 이미지 `EXTRA_IMAGES_MAX`=9 |
| `lib/smartstore/options.ts` | 옵션 검사(`normalizeOptions`: 25자·10원 단위·0원 조합), 양식 모양 행(`optionSheetRows`), 줄 수(`optionRowCount`) |
| `lib/data.ts` | 회원 세션으로 상품·섹션 이미지·기본값·작업 기록 읽기, 참고 사진 본인 폴더만(`ownExtraPaths`), 마지막 옵션(`getLastOptions`) |
| `lib/actions/register.ts` | 「보내기」: 권한 → 옵션 검사 → 단계 만들기 → 중복·진행 중 확인 → 작업 저장(세대 표시 붙임) |
| `app/api/extension/task/route.ts` | 확장이 작업을 받는 곳(항상 최신 배포). 세대 확인 → 확장 버전 확인 → 「입력 중」으로 바꾼 뒤 이미지 15분 서명 주소·옵션 엑셀(.xls, `xlsx` biff8) 붙여 넘김 |
| `app/api/extension/finish`·`auth`·`version` | 결과 기록 / 확장 연결 토큰(해시 저장) / 최신 버전 알림 |
| `components/RegisterForm.tsx` + `OptionEditor.tsx` | 상품 화면 오른쪽: 카테고리 검색어·옵션·등록 방식·보내기 |
| `components/DefaultsForm.tsx` | 「스토어 기본값」(재고·고시 상품군·원산지·배송 템플릿 이름 또는 직접 입력·A/S·어린이인증·바로 등록 전시) |
| `app/(dashboard)/products/[id]/page.tsx` | 칸 미리보기(18칸 등)·보내기·이 상품의 작업 기록, 검토 전 안내 |
| `lib/shopFlow.ts`·`components/ShopFlowBar.tsx` | **공용 기준 코드 사본**(기준 `shop-order-report`) — 직접 고치지 말고 기준 수정 후 `node scripts/check-shared-modules.mjs --sync` |

**확장(`extension/background.js`, Manifest V3)**: 30초마다 작업 받기 → 판매자센터 탭(기존 탭을 닫고 같은 자리에 새 탭) → 단계를 위에서부터 실행 → 결과 보고.
- 페이지 명령(`pageCommand`): `ready expand type radio check choose select deliveryTemplate pick mainImage extraImages openEditor editorReady editorImage editorDone submit`
- 페이지 안(MAIN) 함수: `ngTypeMain`(AngularJS 모델에 직접 값), `editorImageMain`(에디터 사진, 파일 칸 click 가로채기), `optionsMain`(옵션 엑셀 일괄등록, 같은 가로채기)
- ZIP은 `npm run build` 앞에 `scripts/build-extension-archive.mjs`가 만든다(manifest 버전도 자동).

**DB(공용 운영 DB)**: `smartstore_register_defaults`(회원 1행 jsonb) · `smartstore_register_jobs`(작업·단계 jsonb·결과·상품번호) · `smartstore_register_ext_tokens`(확장 토큰 해시) · 상세페이지 `shop_products.reviewed_at`(검토 완료). 마이그레이션 `supabase/migrations/`.

## 3. 동작 원리에서 꼭 알아야 할 것 (함정)
1. **칸 입력 = AngularJS 모델에 직접**: 화면 글자만 바꾸면 판매가 등이 저장 때 비어 거절된다 → `ngTypeMain`, 모델 값으로 확인.
2. **저장 성공 판정**: 누르기 전 글을 빼고 새로 나타난 글만 본다. 「완료」면 성공, 「필수…」면 실패, 불분명하면 `ng-invalid` 칸 이름을 기록. 결과가 불확실하면 자동으로 다시 등록하지 않는다.
3. **selectize 고르기**(택배사·배송비 종류): 숨은 select가 아니라 화면 목록을 열고 글자가 정확히 같은 보기를 누른다.
4. **같은 버튼 여러 개**: 대표/추가 이미지 「이미지 등록」은 `data-nclicks-code="image.repre"`/`"image.add"`로 구분. 「내 사진」 한 번 총 20MB → 18MB 묶음.
5. **파일 고르는 창**: 에디터 사진·옵션 엑셀은 페이지 안에서 `HTMLInputElement.prototype.click`을 잠깐 가로채 파일을 넣는다(창이 뜨지 않게).
6. **오래 열어 둔 탭 = 옛 코드**: Vercel은 탭을 연 시점 배포로 「보내기」를 처리 → 칸 구성을 바꾸면 **`STEP_BUILDER`를 올린다**(올리면 옛 탭 작업은 「오래된 화면」으로 막힘).
7. **새 동작 = 최소 확장 버전**: `ACTION_MIN_EXT`에 넣으면 옛 확장에는 작업을 넘기지 않는다(`updateRequired`).
8. **배송 칸은 「상품별 배송비」 값에 따라 칸이 생기고 사라진다**(무료/조건부/유료/수량별/구간별) → 직접 입력을 넓힐 땐 종류부터 고르고 나타난 칸만 채운다. 템플릿을 쓰면 판매자센터가 한꺼번에 채운다(권장).
9. **옵션 엑셀**: 2행 안내 줄 없이 1행 머리글 + 데이터. 조합형은 「선택1~」 대신 실제 옵션명, 0원 조합 필수. 올린 뒤 입력방식이 「직접 입력하기」로 돌아가 보이는 건 정상.
10. **창·탭**: 새 창을 띄우지 않는다(루트 `CLAUDE.md` 포그라운드 ⑥). 판매자센터는 Claude 크롬 도구가 열 수 없어 주인님 캡처로 확인.
11. **(2026-10-28) 카테고리를 바꾸면 판매자센터가 늦게 화면을 다시 그린다**: 바로 뒤에 넣은 판매가 등이 지워지고, **옛 칸이 보이지 않은 채 문서에 남아** 같은 id가 둘이 된다 → 고른 뒤 3초 대기, 끝에 판매가·즉시할인·재고·옵션·직접입력형 다시 확인, 옵션·직접입력형·추가상품은 **보이는 칸만**(`vid`). 대표이미지는 카테고리 없으면 「먼저 카테고리를 선택해 주세요」라 카테고리 실패 시 바로 멈춘다.
12. **(2026-10-28) 패션 카테고리 기본값**: 상품등록을 열면 「선택형: 설정함 + 색상/사이즈 간편 입력」 → 추가상품 막힘·직접입력형 안 켜짐 → 보낼 옵션이 없으면 선택형 「설정안함」(`optionOffMain`). 줄 이름 옆 도움말 아이콘 때문에 「선택형」으로 **시작하는** 짧은 글자로 찾는다.
13. **(2026-10-28) 확장 코드를 고치는 방법**: bash heredoc 안 템플릿 문자열의 `\\s`는 역슬래시가 빠져 `/s+/`가 된다, `String.replace` 바꿀 글의 `$$`는 `$`가 된다 → Write로 스크립트 파일 + `split/join`, 고친 뒤 `grep`으로 정규식 확인.
14. **진단 먼저**: 화면을 볼 수 없으니 추측으로 여러 번 고치지 말고, 결과 기록에 읽기 전용 진단(`optionDiagMain` 방식)을 남겨 한 번에 원인을 잡는다. 시험 결과가 이상하면 작업 `steps`(그 단계가 있었는지)부터 본다 — 「옵션이 지워진다」로 오판한 사례(실제로는 옵션 단계가 없었음).

## 4. 시험하는 법 (주인님 PC)
1. 코드를 고친 뒤 확장만 바뀌었으면 **배포 없이** 주인님께 `chrome://extensions` → 「AI 스마트스토어 상품 자동등록기」 새로고침(↻)을 부탁(저장소 폴더를 바로 불러옴).
2. 웹(서버)이 바뀌었으면 배포가 먼저 필요(빌드 승인).
3. 시험 상품: **스위스톤 확장형 여행백팩** `44a9cfc4-0ef0-4c64-9ecd-ba506e5e9ea3`(관리자 gmail 계정, 참고 사진 2장, 섹션 12장, 검토 완료 표시). 주소 https://smartstore-register.buylife.xyz/products/44a9cfc4-0ef0-4c64-9ecd-ba506e5e9ea3
   - **2026-10-28부터 주인님은 테스트 계정 `buylifemall@naver.com`으로 시험**: 같은 이름 상품 `bfa7ed41-dcc4-4216-9ba5-01350b814e48`(가격은 DB에 직접 넣음 — 상세페이지 자동화엔 기존 상품 가격 수정 화면이 없음, 등록기 보내기 칸 「판매가」로 바꿀 수 있음), 회원 id `4a82ff77-97f7-474d-866e-8e9431858ed3`. 확장은 한 번에 한 계정과만 연결 — 상태 창·「확장 연결」 화면의 이메일로 확인.
4. 등록 방식은 처음엔 **「입력만」**. 「바로 등록」은 실제 상품이 생기므로 꼭 필요할 때만, **보내기 클릭은 주인님이 직접**(자동 안전 검사가 막고, 막혔다고 해도 실제로 들어갔을 수 있으니 다시 부탁하기 전에 기록부터 확인).
5. 결과 확인: ① DB 작업 기록(아래 명령) ② 주인님 판매자센터 캡처. 「입력만」 화면은 저장하지 말고 「취소」.
```bash
node --input-type=module -e 'import { rest } from "./scripts/program-info.mjs"; const r = await rest("smartstore_register_jobs?product_id=eq.44a9cfc4-0ef0-4c64-9ecd-ba506e5e9ea3&select=created_at,mode,status,failed_step,error,steps&order=created_at.desc&limit=1"); const j=r[0]; console.log(j.created_at,j.status,j.failed_step,j.error, (j.steps||[]).map(s=>s.key).join(","));'
```
6. 시험 결과가 이상하면 먼저 **그 작업의 단계 목록이 지금 코드 결과와 같은지** 대조(오래된 탭 사고 교훈).
7. **(2026-10-28) ego lite로 판매자센터 직접 확인**: Claude 크롬 확장은 판매자센터를 못 열지만 **ego lite(Claude Code 전용 두 번째 브라우저)는 연다** — `ego-browser nodejs`로 `https://sell.smartstore.naver.com/#/products/create`를 열어 칸을 읽고 캡처(첫 시험: `buylifemall` 로그인, 섹션 21개 읽기·캡처 성공). 실행 파일 `C:\Program Files\Citro Labs\ego lite\Application\<버전>\ego-browser.exe`, 스크립트는 `C:/Users/Administrator/ego/<목표-날짜>/round-NN.mjs`. **캡처는 ego 창이 맨 앞이어야 됨**(가려져 있으면 `Page.captureScreenshot` 시간 초과 → PowerShell `SetForegroundWindow`). 로그인은 주인님(`task.handOff()` → 끝나면 `takeOverTaskSpace(id)`). 「이전에 작성하던 내용」 창 등은 읽기 시험에선 누르지 않는다. ego lite에도 우리 확장이 깔려 있어, ego에서 확장 연결 후 입력 → 같은 창에서 결과 확인도 가능(미시험).

## 5. 배포 절차 (한 번에 하나, 비용 승인 먼저)
1. `npm test`(지금 13개) · `npx tsc --noEmit` · `src/lib/version.ts` 버전 +0.01 · `npm run build`(확장 manifest·ZIP 자동)
2. 경로 지정 커밋(`git add -- <새 ZIP>` + `git rm --cached -- <옛 ZIP>`, `git commit -- <경로>`), 공용 문서는 `node scripts/safe-commit.mjs`
3. 빌드 중 배포 확인: `MSYS_NO_PATHCONV=1 npx vercel api "/v6/deployments?state=BUILDING,QUEUED,INITIALIZING&limit=5" --scope buylife`
4. `node scripts/deploy.mjs smartstore-register --go --owner <세션> --set-version` (DB `programs.version` 자동)
5. DB 확장 버전: `scripts/program-info.mjs`의 `rest`로 `programs.extension_version` PATCH → `node scripts/check-extension-release.mjs smartstore-register` OK 확인
6. 문서: `docs/PENDING_DEPLOYS.md` 내보낸 기록, 비교표(배포 도우미가 미리 바꾼 것은 `git show HEAD:… >` 로 되돌린 뒤 `--begin`), 역할 파일, 루트 `docs/HANDOFF.md`, 이 폴더 `AGENTS.md`
7. 회원 안내: 확장이 바뀐 배포는 「ZIP 다시 받기 → 덮어쓰기 → 새로고침」.

## 6-0. 남은 일 (2026-10-28 갱신 — 아래 6의 2~9번은 v1.14~v1.17에서 구현됨)
| 순위 | 일 | 메모 |
|---|---|---|
| 1 | 실물 시험: 「임시저장까지」 → 옵션 있는 상품(패션 카테고리) → 상품속성 → 판매가 직접 입력 칸 → 연속 보내기 2개 → 예약구매 → 「바로 등록」 | 테스트 계정, 확장만 바뀌면 배포 없이 새로고침 |
| 2 | 결정 대기(주인님): 상품 화면 「혜택은 스토어 기본값에서」 안내 넣기, 모델명(카탈로그 「찾기」) 자동화 여부. **일반 등급 2주는 「가입일 + 14일」 유지로 확정(2026-10-28 주인님: 「가입일부터로 해」) — 코드 변경 없음** | |
| 3 | 주인님 정리: 판매자센터 시험 임시저장본·시험 상품 삭제 | 삭제는 주인님이 |
| 4 | 쿠팡 → 11번가 → G마켓 → 옥션 등록기 | 레퍼런스 §6 |

## 6. 남은 일 (2026-10-27 원본 — 우선순위 순, 주인님이 쓰면서 고를 것 — 「하면서 수정해 나갈꺼야」)
| 순위 | 일 | 메모 |
|---|---|---|
| 1 | 주인님 정리: 시험 상품 `13834442721`·임시저장본 삭제, **「스토어 기본값」 A/S 전화번호 시험값 `02-0000-0000` → 실제 번호** | 실제 등록 전 필수 |
| 2 | 배송 직접 입력 확장: 결제방식·제주/도서산간(2·3권역)·묶음배송·수량별/구간별·별도 설치비 | 칸 지도 HANDOFF §10-4. 템플릿 쓰면 이미 됨 |
| 3 | 검색설정 태그(최대 10개) | 상세페이지 분석 결과 활용 가능 |
| 4 | 상품 주요정보: 브랜드·제조사·모델명·상품 상태 | 검색 품질 |
| 5 | 카테고리별 상품속성(지금 「다음에 할래요」로 넘김), 카테고리별 필수 칸 대비 | 실패 기록의 칸 이름 보고 추가 |
| 6 | 반품/교환 배송비·반품지 실제 입력 점검 | 기본값 칸은 있음 |
| 7 | 옵션 추가: 직접입력형, 옵션별 관리코드, 다른상품 옵션 불러오기 | HANDOFF §10-5 |
| 8 | 추가상품·구매/리뷰 혜택·예약구매 | 회원 선택 기능 |
| 9 | 여러 상품 연속 등록 | 중복 막기·실패 시 멈춤 유지 |
| 10 | **쿠팡 → 11번가 → G마켓 → 옥션 등록기** | 레퍼런스 §6 점검표, 마켓 목록 `shop-detail-page/lib/markets.ts`에 한 줄 추가로 상세페이지 버튼 생김 |
- 새 칸 더하는 순서: 판매자센터 저장본(`D:\PDS\Program_dev\smartstore_create\`)·주인님 캡처로 칸 속성 확인 → `fields.ts` 단계(+`ACTION_MIN_EXT`) → 확장 명령 → `STEP_BUILDER` 올리기 → 「입력만」 시험(확장 새로고침) → 배포 1회.
- 결정 대기(주인님): 일반 등급 2주 사용기간 기준 — 지금 「가입일 + 14일」(2026-10-19 주인님 지시, `supabase/migrations/0038_normal_grade_signup_14days.sql`). 「승급한 날 + 14일」로 바꿀지.
- 미배포 대기(다른 프로그램): 흐름 띠 「마켓 등록」 단계 — 상품소싱·주문 리포트·셀러 라벨 사본(각 프로그램 다음 배포 때).

## 7. 오늘(2026-10-27) 배포 이력
| 버전 | 한 일 | 배포 |
|---|---|---|
| v1.03~v1.06 | 실제 시험 보정(접힌 섹션·에디터·배송 selectize·저장 결과 판정·AngularJS 입력·고시 전화·어린이인증), 「바로 등록」 첫 성공 | 오전 기록 HANDOFF §1~§8 |
| v1.07 | 상품속성 창 넘기기·상품번호 기록 | `7iiza23u6` |
| v1.08 | 검토 상태 배지·정렬·안내, 흐름 띠 | — |
| v1.09 | 이름 「AI 스마트스토어 상품 자동등록기」·썸네일 | `c59rnifm2` |
| v1.10 | 추가 이미지 | `48tdzwzos` |
| v1.11 | 오래된 탭 작업 막기, 상태 창 제목 | `m22lvumg4` |
| v1.12 | 옵션(엑셀 일괄등록) | `7blp17f02` |
| v1.13 | 옵션 입력 칸 배치 | `gefdo1s9o` |
| v1.14 | 남은 기능 1~8(배송 직접 입력 확장·태그·주요정보·상품속성·반품 택배사·옵션 관리코드/직접입력형·추가상품/혜택/예약구매·연속 보내기) | 10-27 |
| v1.15 | 첫 시험 보정: 브랜드 숨은 칸, 모델명 제외, 태그 Enter 키 번호, 리뷰 포인트 규칙, 기본값 고르기 상자 `key` | `bs7to8zwe` |
| v1.16 | 연결 계정 이메일 표시(`/api/extension/me`), 판매가 직접 입력 | `nagye6qvl` |
| v1.17 | 테스트 계정 시험 보정(카테고리 재시도·경로, 태그 거절 창, 마지막 재입력, 보이는 칸만, 패션 선택형 끄기) — 실패 칸 0 | `mg32gys5r` (10-28) |
- 함께: `shop-detail-page` v1.39(검토 완료·마켓 등록·결과 표시), DB `shop_products.reviewed_at`.
- 비용(10-27 밤~10-28): Vercel 빌드 v1.14·v1.15·v1.16·v1.17 각 1회(모두 승인), 테스트 계정 상품 2개 가격 DB 직접 입력(승인).
- 비용(오늘 이 프로그램 오후분): Vercel 빌드 v1.08·v1.09·v1.10·v1.11·v1.12·v1.13 각 1회(모두 승인), 썸네일 이미지 1회(관리자 키), AI 글 호출 0.
