# 인수인계 — 스마트스토어 상품등록 자동화 EC-W8 실제 시험·에러 해결 기록 (2026-10-26 ~ 10-27)

> 작성: Claude Code 윈도우 세션 `claude-win-sdp` · 역할 `ecommerce-image`
> 대상: `smartstore-register/` (운영 https://smartstore-register.buylife.xyz , 운영 DB ref `esgxyikcnnvmlhygjkth`)
> 결론: **v1.01 뼈대 → v1.06까지 배포, 「입력만」·「임시저장까지」·「바로 등록」 세 방식 모두 실제 판매자센터에서 성공 확인.** 실제 등록 상품번호 `13834442721`(2026-10-27 14:03, 전시중지).
> 함께 읽을 문서: [`../AGENTS.md`](../AGENTS.md)(버전별 요약) · [`IMPROVEMENTS.md`](IMPROVEMENTS.md)(미배포 대기) · [`IMPROVEMENT_BACKLOG.md`](IMPROVEMENT_BACKLOG.md) · 마켓 등록기 공통 레퍼런스 [`../../docs/MARKETPLACE_REGISTER_ANALYSIS_GUIDE.md`](../../docs/MARKETPLACE_REGISTER_ANALYSIS_GUIDE.md) · 화면 분석 [`../../trending-product-finder/docs/EC_W8_SMARTSTORE_FORM_ANALYSIS_20261026.md`](../../trending-product-finder/docs/EC_W8_SMARTSTORE_FORM_ANALYSIS_20261026.md) · 배송 플랜 [`PLAN_20261027_DELIVERY_TEMPLATE.md`](PLAN_20261027_DELIVERY_TEMPLATE.md)

---

## 1. 한눈에 보는 현재 상태

| 항목 | 상태 |
|---|---|
| 운영 버전 | **v1.06** (배포 `smartstore-register-mcvppashp`, DB `programs.version`·`extension_version` v1.06, `check-extension-release` OK) |
| 미배포 대기(→ v1.07) | ① 「상품속성 미입력 확인」 창 자동 「다음에 할래요」 ② 완료 창 「스마트스토어 상품보기」 링크에서 상품번호 읽기 — `extension/background.js`만 바뀜, 커밋 `1f72bd341`·`e241b2627` |
| 주인님 PC 확장 | **저장소 폴더 `D:\Antigravity\AIMaster\smartstore-register\extension`을 직접 로드**(압축 해제 확장) → 코드 수정 후 `chrome://extensions` 새로고침만 하면 배포 없이 바로 시험 가능. 다른 회원은 운영 ZIP을 받으므로 배포가 필요 |
| 시험 계정 기본값 | 템플릿 이름 비움, 택배사 CJ대한통운, 조건부 무료 3,000원·30,000원 이상 무료, A/S `02-0000-0000`(시험값), **어린이제품인증 = 인증대상 아님** |
| 실제 등록된 시험 상품 | 상품번호 `13834442721` 「스위스톤 확장형 여행백팩 (ST4D18)」 판매중·**전시중지** — 주인님이 지울 예정 |
| 판매자센터 임시저장본 | 1건(10:45, 같은 상품) — 주인님이 지울 예정 |
| 등록 기록 정정 | 확인 없이 성공 처리됐던 기록 2건을 실제 결과대로 정정(10:50 registered→failed, 10:43 filled→temp_saved, 14:03 filled→registered + 상품번호) |

## 2. 구조 요약 (처음 보는 CLI용)
1. 웹(Next.js 16): 회원이 「스토어 기본값」을 정하고 「등록할 상품」에서 상품을 골라 방식(입력만/임시저장까지/바로 등록)을 정해 **작업**을 만든다 → 표 `smartstore_register_jobs`(`steps` = 확장이 실행할 칸 목록, `src/lib/smartstore/fields.ts`의 `buildFillSteps`).
2. 크롬 확장(MV3, `extension/background.js`): 30초마다 `/api/extension/task`로 작업 1건을 받는다(서버가 queued→running으로 먼저 바꾼 것만) → 판매자센터 「상품 등록」 탭을 열고 `steps`를 위에서부터 실행 → `/api/extension/finish`로 결과(`filled`/`temp_saved`/`registered`/`failed`, 멈춘 칸, 상품번호) 보고.
3. 안전장치: 칸 하나라도 실패하면 저장 버튼을 누르지 않음 / 확장이 작업 중 꺼지면 그 작업은 실패 처리(재실행 안 함) / 옛 확장에 새 동작이 든 작업을 넘기지 않음(`X-Ext-Version` + `ACTION_MIN_EXT`) / 같은 상품 「바로 등록」은 「등록 완료」 기록이 있으면 「한 번 더 등록합니다」 체크 필요.

## 3. 시험 경과표 (등록 기록 그대로, 한국 시각)

| 시각 | 방식 | 결과 | 멈춘 칸·원인 | 이어진 수정 |
|---|---|---|---|---|
| 10-27 00:14 | 입력만 | filled | 상세설명 「에디터 사진 올리기 칸을 찾지 못함」, 배송 템플릿(수동) | 접힌 섹션 펼치기·「이전 작성 내용」 창 처리 |
| 00:40 | 입력만 | filled | 「스마트 에디터 화면을 찾지 못함」(팝업 차단) | 주인님이 `https://sell.smartstore.naver.com` 팝업 허용 |
| 00:50 | 입력만 | filled | 에디터 사진 칸 못 찾음(드롭·DOM 칸 모두 실패) | **MAIN에서 `HTMLInputElement.prototype.click` 가로채기** |
| 00:55 | 입력만 | filled | 배송 템플릿만 수동 | v1.03 배포 |
| 01:34 | 입력만 | filled | 택배사·배송비 「고른 값이 반영되지 않음」 | 배송 칸은 selectize → 화면 목록 열어 정확히 같은 글자 보기 클릭 |
| 01:41 | 입력만 | filled(멈춘 칸 0) | — | — |
| 01:46 | 임시저장까지 | failed | 「저장 버튼을 찾지 못함」 | PC 임시저장 버튼은 `progress-button` 속성(ng-click 버튼은 휴대폰용 `visible-xs`) |
| 01:53 | 임시저장까지 | filled | 「에디터가 닫히지 않음」(20초 초과) | 사진 업로드 끝 대기 + 닫힘 45초·재클릭 |
| 10:39 | 임시저장까지 | failed | 「상품 등록 화면이 열리지 않음 — 로그인 확인」(로그인은 정상이었음) | 15초에 등록 주소로 재이동, 실패 시 실제 화면 주소·제목 기록 |
| 10:43 | 임시저장까지 | **temp_saved** | — (임시저장본 1건 실제 생성, 나중에 확인) | — |
| 10:50 | 바로 등록 | (기록상 registered) → **실제 미등록** → failed로 정정 | 확장이 저장 버튼을 누르기만 하고 성공 처리 | **저장 결과 확인 기능** |
| 11:00 | 바로 등록 | canceled | 중복 작업(아래 5-3) — 확장 실행 전 취소 | 중복 등록 막기 |
| 11:58 | 바로 등록 | failed | 「필수 정보입니다」 다수(판매가·할인 금액이 실제로는 비어 있었음) | **AngularJS 모델에 직접 입력** |
| 12:06 / 12:10 | 입력만 | filled | 모든 글자 칸 「에디터에서 실행하지 못했습니다」(문구도 잘못) / 12:10은 확장 미새로고침 | 운영 모드라 `scope()`가 비어 오류 → `injector().get('$rootScope')`, MAIN 오류를 그대로 기록 |
| 12:16 | 입력만 | filled | 판매자 관리 코드만 「값이 들어가지 않음」 | `$commitViewValue()` 뒤 확인 |
| 12:36 | 입력만 | filled(멈춘 칸 0) | 주인님 화면으로 판매가 99,000·할인 43,000·배송·A/S·판매자 코드 남아 있음 확인 | — |
| 12:42 | 바로 등록 | failed | 「A/S 책임자 소비자 상담 관련 전화번호 — 필수」 | 고시 전화번호 단계 추가 |
| 12:52 / 12:55 | 바로 등록 | filled(결과 미확인) | 숨은 같은 이름 칸에 넣어 「성공」으로 보였지만 화면 칸은 빔 + 「상품속성」 창 | 라벨 글자로 찾기, 라벨 뒤 칸만 |
| 13:23 | 바로 등록 | failed | 「선택 — 필수 정보입니다」= **어린이제품인증 → 인증선택** | 기본값 「어린이제품인증」 + `choose` 동작 → v1.06 배포 |
| **14:03** | 바로 등록 | **registered `13834442721`** | 저장 뒤 「상품속성 미입력 확인」 창 → 주인님이 「다음에 할래요」 → 「상품저장이 완료되었습니다」 | 「다음에 할래요」 자동 클릭(미배포) |

## 4. 에러별 원인과 해결 (다른 마켓에서도 먼저 의심할 것)

### 4-1. 칸 입력이 「성공」인데 판매자센터에는 빈칸 — 가장 중요
- **증상**: 확장 기록은 통과, 화면에도 잠깐 값이 보였지만 저장하면 판매가·할인 금액 「필수 정보입니다」. 캡처로 보니 칸이 비어 있었다.
- **원인**: 판매가·할인·배송비 금액·전화번호 칸은 `ncp-number-format` 지시어가 붙은 AngularJS 칸. 화면 글자만 바꾸고 `input`/`change`/`blur`를 보내도 내부 모델(`ngModel`)이 갱신되지 않고, 커서가 빠질 때 빈 모델 값으로 다시 그려져 지워진다. 「입력만」 시험은 저장 검사를 받지 않아 오랫동안 드러나지 않았다.
- **해결**: `extension/background.js`의 `ngTypeMain` — 페이지 쪽(`world: 'MAIN'`)에서 `angular.element(el).controller('ngModel')`로 `$setViewValue(v)`·`$render()`를 `$rootScope.$apply` 안에서 실행, `$commitViewValue()`로 미뤄 둔 값을 반영한 뒤 `$modelValue`가 비어 있지 않은지 확인. 비면 그 칸을 실패로 기록.
- **함정**: 판매자센터는 운영 모드(`debugInfoEnabled(false)`)라 `element.scope()`가 `undefined` → `ng.element(document.body).injector().get('$rootScope')`로 얻는다. 이걸 몰라 12:06에 모든 칸이 실패했고, 그때 `runMain`이 「에디터에서 실행하지 못했습니다」라는 엉뚱한 문구를 내서 원인 파악이 늦었다 → 지금은 실제 오류 메시지를 기록.

### 4-2. 저장 버튼만 누르고 성공으로 기록
- **증상**: 10:50 「등록 완료」인데 판매자센터 상품 목록(98개)에 없음(주인님 캡처).
- **해결(`submit` 명령)**: 누르기 전 화면의 안내 글을 저장해 두고(검색 SEO 안내·「달력보기」 같은 상시 글 제외) 누른 뒤 **새로 나타난 글만** 판정 — 「상품 등록」 주소를 벗어남 또는 「…저장/등록이 완료」=성공, 「필수·입력해 주세요·오류」=실패(칸 이름 붙여 기록), 15초 동안 둘 다 없으면 화면 전체 `ng-invalid` 칸 이름을 모아 실패로 기록, 그것도 없으면 「결과를 확인하지 못했습니다」(filled, 회원 확인).
- **교훈**: 실제 시험의 성공 판정은 **마켓의 상품 목록**으로 한다. 확장 기록만 믿고 보고했다가 정정했다.

### 4-3. 배송 택배사·배송비가 안 바뀜 (selectize)
- 진짜 `select`는 `class="selectized"`로 화면 밖에 숨고 위에 selectize 목록이 덮여 있어, 숨은 `select.value`를 바꾸면 selectize가 되돌린다 → 화면 목록(`.selectize-input`)을 열어 **글자가 정확히 같은** 보기를 누르고 `.selectize-input .item` 글자로 확인. 택배사 목록에 「CJ대한통운(새벽배송)」과 「CJ대한통운」이 함께 있어 「포함」 비교는 위험.
- 예전 코드가 노리던 `vm.savedTemplate['DELIVERY']`는 템플릿 고르는 칸이 아니라 **「템플릿 추가」(새 템플릿 저장) 체크 상자**였다(저장본 분석). 템플릿 고르기는 「배송비 템플릿」 버튼 → 목록 창(표: 템플릿명·선택·삭제)의 「선택」만 누름. 주인님 판매자센터에 템플릿이 0개라 이 경로는 아직 실제 시험 전.

### 4-4. 스마트 에디터 ONE 사진
- 「HTML 작성」 대신 스마트 에디터 ONE에 섹션 이미지를 순서대로 넣는다. 에디터는 `window.open` 팝업 → 확장 클릭은 사람 동작이 아니라 크롬이 막음 → 회원이 팝업 허용 1회(「확장 연결」 화면에 안내).
- 사진 버튼은 화면에 붙이지 않은 `input[type=file]`을 만들어 `click()` → MAIN에서 `HTMLInputElement.prototype.click`을 잠깐 바꿔 그 칸을 받아 `DataTransfer`로 파일 넣고 `change`(`editorImageMain`). 드롭·DOM 검색은 실패했다.
- 사진 12장이면 「등록」 뒤 닫힘이 20초를 넘긴다 → 올리는 중 표시가 사라질 때까지 기다리고, 45초까지 대기·15초에 한 번 더 클릭.

### 4-5. 판매자센터 화면 고유의 함정
| 증상 | 원인 | 해결 |
|---|---|---|
| 여러 칸 「칸을 찾지 못함」 | 접힌 섹션은 칸이 DOM에 없음 | `div.title-line`(ncp-click `vm.openMenuToggle()`) 먼저 클릭 |
| 「이전에 작성하던 내용」 확인 창 | 에디터 임시본 | 「취소」 |
| 「임시저장 된 내용(N건)을 불러오시겠습니까?」 | 임시저장본이 있으면 등록 화면 위에 뜸(노란 줄 + 목록 창) | 창이면 취소/닫기, 노란 줄은 무시 |
| PC 임시저장 버튼 못 찾음 | PC는 `button[progress-button="vm.createTempSave()"]`, `ng-click` 버튼은 휴대폰용 `visible-xs` | 두 모양 모두 찾고 보이는 쪽 |
| 전시 상태 라디오 못 찾음 | 실제 이름 `vm.singleChannelProductMap[channelServiceType].channelProductDisplayStatusType` | 전체 이름 사용 + 끝부분 일치 예비 찾기 |
| 고시 A/S 전화번호 빈칸 | 「상품상세 참조로 전체 입력」으로도 안 채워짐. 상품군마다 칸 이름이 다르고(저장본은 「식품」 화면이라 `vm.content.customerServicePhoneNumber`), 숨은 같은 이름 칸이 있어 오판 | `notice_phone` 단계 + **라벨 「A/S 책임자 또는 소비자 상담」 뒤의 가장 가까운 보이는 칸**(위쪽 「제조자(사)」 selectize 칸 제외) |
| 「선택 — 필수 정보입니다」 | 카테고리(예: 백팩)에 따라 나오는 「어린이제품인증」, 기본 「인증대상」이라 「인증선택」이 필수 | 기본값 `childCert`(회원이 「인증대상 아님」 선택 — 법적 책임 항목이라 자동 판단 금지) + `choose` 동작(줄 이름으로 줄 찾고 같은 글자 버튼 클릭, 줄 없으면 건너뜀) |
| 모든 칸 통과했는데 등록 안 됨 | 저장 뒤 「상품속성 미입력 확인」 창이 기다림 | 「다음에 할래요」 자동 클릭(미배포) |
| 등록 완료 | 「상품저장이 완료되었습니다」 창(스마트스토어 상품보기 / 상품관리), 주소는 그대로 `#/products/create` | 문구로 성공 판정, 「상품보기」 링크에서 상품번호(미배포) |

### 4-6. 창·탭과 포그라운드 (주인님 지시 → 루트 `CLAUDE.md` 포그라운드 ⑥)
- 처음엔 확장이 탭을 Claude 작업 창(뒤쪽)에 열어 안 보였고 → 매번 맨 앞 새 창으로 바꿨더니 → 창이 쌓여 「어디서 작업하는지 알 수 없다」 → **기존 판매자센터 탭이 있으면 닫고 같은 자리에 새 탭, 없으면 지금 창(`getLastFocused`)에 새 탭**(새 창 금지).
- 기존 탭을 `tabs.update`로 옮기면 「상세설명을 작성했습니다… 나가면 유실됩니다」 **브라우저 기본 확인 창**이 떠 확장이 멈춘다 → 옮기지 말고 `tabs.remove` 후 새 탭(제거는 확인 창이 안 뜸).
- Claude 크롬 도구는 `sell.smartstore.naver.com`을 열거나 그 탭을 닫을 수 없다(안전 제한, 우회 금지) → 판매자센터 화면은 **주인님 캡처**로 확인. Claude 쪽 작업 탭이 가려지면 PowerShell `SetForegroundWindow`로 창을 올릴 수 있지만, 같은 창의 다른 탭이 앞이면 창 제목이 그 탭 이름이라 찾기 어렵다 → 탭 이름을 알려 드리는 게 빠름.

## 5. 사고 직전 기록과 재발 방지
1. **확인 없이 성공 보고**: 확장 기록의 「등록 완료」만 보고 「세 방식 통과」라고 보고 → 주인님 캡처로 미등록 확인 → 정정. 이후 성공은 판매자센터 목록·완료 창으로만 판정.
2. **도구 「거부」 안내 뒤 중복 작업**: 「바로 등록」 보내기 클릭이 자동 실행 안전 검사로 거부됐다는 안내를 받았지만 클릭은 이미 들어가 작업(10:50)이 생겼다. 이를 모르고 주인님께 다시 눌러 달라고 해 11:00 작업이 하나 더 생김 → 확장이 가져가기 전 「취소」. **도구가 막혔다고 해도 다시 부탁하기 전에 기록부터 확인.** 서버에 같은 상품 재등록 막기 추가.
3. **실제 등록 버튼은 회원이 누른다**: 자동 실행 안전 검사가 「바로 등록」 보내기 클릭을 막는 것은 정상 — 주인님이 직접 누르게 안내.
4. **확장 새로고침 누락**: 12:10 시험은 옛 코드로 돌았다(지운 오류 문구가 다시 나와서 알아챔). 시험 전 「`chrome://extensions` 새로고침 → 카드 버전 확인」을 꼭 안내.

## 6. 시험하는 법 (다음 CLI용 체크리스트)
1. 주인님 크롬: 판매자센터 로그인, `https://sell.smartstore.naver.com` 팝업 허용, 확장 저장소 폴더 로드·새로고침(버전 확인).
2. 판매자센터 탭은 하나만, 저장하지 않은 등록 화면이 있으면 닫기.
3. Claude 작업 탭(「스마트스토어 상품등록 자동화 | AIMaster」)에서 상품 → 방식 고르기 → 「입력만」은 Claude가 보내도 됨, **「임시저장까지」·「바로 등록」은 주인님이 직접 보내기**.
4. 진행은 판매자센터 탭에서 주인님이 보고, Claude는 「등록 기록」 또는 DB(`node --input-type=module` + `scripts/program-info.mjs`의 `rest`)로 결과 확인. 10초씩 짧게 나눠 기다림(한 번에 길게 기다리면 도구 시간 초과).
5. 「바로 등록」 성공 판정은 **판매자센터 상품 목록**(전체 개수·상품번호·판매자 상품코드 `AIM-…`·전시중지)으로.
6. 실패하면 기록의 칸 이름 → 그 부분 캡처 요청 → 저장본/라벨로 칸 정체 확인 → 확장 수정 → 새로고침 → 재시험.

## 7. 바뀐 파일과 커밋 (2026-10-26 22:07 ~ 10-27 14:17)
- 웹: `src/lib/smartstore/fields.ts`(배송 두 갈래·`DELIVERY_FEE_LABEL`·`notice_phone`·`child_cert`·`ACTION_MIN_EXT`·`extMinVersion`·`extCanRun`·전시 상태 전체 이름), `src/app/api/extension/task/route.ts`(확장 버전 확인), `src/components/DefaultsForm.tsx`(배송 칸 4개·어린이제품인증), `src/components/RegisterForm.tsx`(「한 번 더 등록합니다」), `src/lib/actions/register.ts`(같은 상품 재등록 막기), `tests/fields.test.mjs`(10개).
- 확장: `extension/background.js` — `ngTypeMain`, `editorImageMain`, `pageCommand`(`select`·`deliveryTemplate`·`choose`·`submit` 결과 확인·`ready` 임시저장 창·`expand`), `openCreateTab`(탭 재사용), `runJob`(고시 전화번호 대체, 결과 보고).
- DB 마이그레이션 기록: `supabase/migrations/20261027_v1_04.sql`·`_v1_05.sql`·`_v1_06.sql`(버전·확장 버전·다운로드 주소).
- 주요 커밋: v1.03 `6286785f2` · v1.04 `8b06715f9` · v1.05 `23b84e9fc` · 저장 결과 확인 `35e40f237`·`864c14393`·`d2a2cbce7` · AngularJS 입력 `9cb863651`·`b8b10bb13` · 탭 재사용 `0012e2d0c`·`1242dbcf6` · 고시 전화번호 `e7fc9e713`·`38c08bf32`·`78a35e91d` · 어린이제품인증 `26b1b7f0d` · v1.06 `bb4bac0e1` · 상품속성 창 `1f72bd341` · 상품번호 `e241b2627`.
- 지침: 루트 `CLAUDE.md` 포그라운드 ⑥(새 창 금지) · 레퍼런스 `docs/MARKETPLACE_REGISTER_ANALYSIS_GUIDE.md` §0·§2-4.

## 8. 남은 일과 다음 첫 단계
1. **v1.07 배포**(빌드 1회, 주인님 승인 필요): 상품속성 창 자동 넘기기·상품번호 읽기 → 다른 회원도 끝까지 자동 등록. 배포 후 「바로 등록」 1회로 상품번호가 「등록 기록」에 자동으로 남는지 확인.
2. 배송 템플릿 고르기 실제 시험(판매자센터에 템플릿 1개 만든 뒤).
3. 시험값 정리: A/S 전화번호 `02-0000-0000`은 시험값 — 실제 회원 값으로 안내.
4. 「입력만」 미리보기 표(웹)는 서버가 만든 단계만 보여 줌 — 확장이 대신 넣는 고시 전화번호는 v1.06 서버부터 표에 나옴(OK).
5. 추가 이미지·옵션, 쿠팡용 등록기(레퍼런스 §6 점검표대로).
6. 대기 목록: [`IMPROVEMENT_BACKLOG.md`](IMPROVEMENT_BACKLOG.md).

링크
- 등록 기록: https://smartstore-register.buylife.xyz/history
- 스토어 기본값: https://smartstore-register.buylife.xyz/defaults
- 확장 연결: https://smartstore-register.buylife.xyz/extension
