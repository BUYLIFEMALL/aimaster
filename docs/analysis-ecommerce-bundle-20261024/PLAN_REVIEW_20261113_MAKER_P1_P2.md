# 메이커 후속 — P1·P2 통합 플랜과 독립 검수표

2026-11-13 · F 검수 인수: Codex 맥미니 `codex-mac-20261107-test-analysis` · 역할 `review`.

운영 확인 대상: [바나나](https://banana-canvas.buylife.xyz) · [상세페이지](https://shop-detail-page.buylife.xyz) · [개발 결과함](https://www.buylife.xyz/admin/dev-docs/requests).

## 1. 현재 판정과 작업 경계

- **완료:** F 인수 확인, 기존 구현 경계 확인, 통합 플랜/계약 검토표/시험 시나리오 작성, 기존 배치 계산 6개 통과, 파일명 충돌 위험 순수 함수 재현.
- **후속 갱신:** A 상세안·C 정책·B 디자인·D 영상·E 몰 산출물을 수신/대조했다(§8). ACTIVE_WORK에 A 구현 착수와 추천안5건 승인 기록이 있으며, 상세 플랜 상단의 「결정 대기」보다 최신 활동 기록으로 구분한다. 계약 충돌/신규 구현 독립검수·디자인 채택·배포·실물 검수는 미완료다.
- 인계상의 `D:\AIMaster`는 Windows 경로다. 실제 이 세션은 macOS 공유 폴더 `/Volumes/gt1_mega/AIMaster`를 사용하며 별도 복제본을 만들지 않는다. Windows 검수 세션 이름을 사칭하거나 기존 담당 기록을 교체하지 않는다.
- P1은 바나나 기존 `/batch`의 **상품마다 다른 main/sub를 짝지어 결과 N개** 만드는 기능, P2는 결과를 **원래 상품·옵션·사진 역할로 반환**하는 기능이다. 현재 공용 로고 처리/단일 섹션 누끼 반환이 P1/P2 완성은 아니다.
- 현재는 상세 플랜/검수 인수 범위. 이 문서의 제안 필드는 구현·DB·비용·배포 승인으로 간주하지 않는다. 외부 소스/디자인/프롬프트 복제 없이 AIMaster 기존 엔진을 재사용한다. 진짜 메이커 신규 바이너리·구버전 차이·숏폼 실물은 별도 미검수 유지.
- 이 Mac 세션은 읽기·검수·문서만 수행. 설치/build/dev/배포/환경 변경/직접 운영 DB 쓰기·실마켓 등록을 수행하지 않는다. 유료 AI는 이번 범위 0회.

## 2. 단계와 담당 간 인수 조건

| 단계 | 책임·산출물 | 다음 단계 통과 조건 | 현재 |
|---|---|---|---|
| G0 기준 고정 | F: 대상 커밋/파일 해시/실행 장비/기존 시험 기록 | 검수할 동일 소스가 식별됨 | 기존 소스 기준선 확보, 신규 구현 없음 |
| G1 기능·정책 계약 | A 기능안+필드표, C 저장/회원/보관 검토, F 충돌 검토 | 상품/옵션/역할/원본·결과·revision/실패·취소/용량 경계 합의 | A/C 수신·충돌 검토, §8 조정 필요 |
| G2 화면안 | B: G1 기반 입력·짝 확인·진행·실패·반환 화면 | 기능별 표시/수정/중단 경로, 기존 규격 시안·관리자 선택 근거 | B 수신·자산 확인, 범위/담당 충돌 지적 |
| G3 범위 확정 | 관리자·A/C: 로컬 P1/서버 P2, 저장·비용·DB·배포 묶음 결정 | 선택된 범위·미포함 항목이 문서에 명시 | ACTIVE_WORK 추천안5건 승인/구현 착수 기록, 추가배포/운영DB 적용 별도 |
| G4 구현·자체시험 | A/B/C: 합의한 파일별 구현·단위/격리 검증 | 커밋·차이·시험 로그·미검수·보호고지/저장위젯 점검 전달 | A 작성 중 파일 스냅샷 단위9/9, 경계4유형 재현·정식인계 전 |
| G5 독립 검수 | F: 아래 시나리오·기존 회귀·지적 재검수 | 중대 오류 해소, 실패/미검수와 완료 분리 | 기준선 시험만 완료 |
| G6 배포·실물 | Windows 담당 배포, F/Mac 실물 확인 | 배포 ID·버전·실행 화면·생성/반환 결과 연결 | 미실행 |
| 후속 | D 영상/E 몰의 계약 호환성 검토, P3/P4 별도 플랜 | 기존 기능 재사용·추가 필드/비용/권한 범위 확정 | D/E 문서 수신·검토, 구현 결정/정책 미확정 |

A/B는 `banana-canvas` 수정 파일과 시간을 ACTIVE_WORK에 나눠 기록한다. F는 제품 소스를 고치지 않고 중앙 검수 문서와 `_workspace/` 시험 도구만 담당한다. 기존 미커밋 파일/다른 역할 현황은 덮어쓰지 않는다.

## 3. 재사용과 신규 범위

| 영역 | 기존 근거 | 재사용 | 이번 공백/검수 주의 |
|---|---|---|---|
| 배치 계산·그리기 | `banana-canvas/src/lib/batch/{layout,render}.ts` | 크기/비율·anchor·Canvas/EXIF 재인코딩·Blob | 상품별 배치 규칙/공용·개별 sub 구분 추가 필요 |
| 배치 화면·ZIP | `src/components/batch/BatchPhotoBoard.tsx` | 파일 입력·미리보기·다운로드·JSZip | 현재 50장/장당25MiB, 공용 logo 한 개. 상품/옵션 모델·행별 결과·중단/재개는 신규 계약 |
| 도구 간 임시 전달 | `src/lib/freeTools/toBatch.ts` | 기존 임시 전달 동작 참고 | 임시 만료/소비 후 삭제를 장기 재개 기능으로 소개하지 않음 |
| 누끼 왕복 | 기준 `src/lib/nukkiHandoff.ts`, 상세 `components/products/SectionImageGrid.tsx` | 정확한 origin·상대 window 확인, 섹션 새 버전 저장 | 25MiB 입력/10MiB 반환, section+Blob 계약. 상품별 작업 ID/revision·중복 방지·계정 변경 계약 추가 필요 |
| 상세 저장 | `shop-detail-page/lib/actions/{products,images}.ts` | 본인 상품 접근·기존 이미지 버전 경로 검토 | 대표사진/상세섹션 역할 분리. 단일 섹션 저장을 대표사진 반환으로 대체하지 않음 |
| 이미지 변환 | 기존 변환/ZIP·콜라주 | 필요 엔진만 재사용 | 변환의 300장 설명을 바나나의 지원량으로 옮기지 않음 |
| 마켓·영상·몰 | 기존 등록기·영상기·몰 빌더 | 기존 프로그램 유지 | 이미지 반환만으로 등록/발행/판매승인 변경 금지. D/E 후속 |

공용 모듈을 바꾸기로 결정하면 기준 파일→공식 동기화→사본 회귀 순서다. F가 사본을 직접 수정하지 않는다.

## 4. A/C가 합의할 데이터 계약(검토안)

| 묶음 | 필수 의미·제안 필드 | 수신 측 검증/결정할 것 |
|---|---|---|
| 작업 식별 | schemaVersion, batchId, itemId, requestId | 상품코드/배열 순번과 분리. 재전송/부분 재개 식별 수명·일회성 소비 위치 |
| 상품 대상 | sourceProgram, internalProductId, externalCode, optionId, targetRole, sectionKey | 내부ID를 주 식별자로 사용. 코드 중복/공백/옵션을 임의 병합하지 않음. main/sub/detail의 상품별 정의 |
| 회원·창 | 인증 주체, sender/receiver origin, request와 연결된 window | payload userId를 권한 근거로 쓰지 않음. 같은 origin의 다른 창/로그아웃·계정 교체도 거절 |
| 원본 | sourceRef, sourceRevision, inputDigest, sourceType | 원본·가공본 분리. 로컬 Blob/객체 URL을 영구 서버 참조로 취급하지 않음 |
| 설정·결과 | settingsVersion, main/sub 참조, outputRef, outputDigest, MIME, byteSize, dimensions | 파일명·출력 순번에만 의존하지 않는 결과 매핑. MIME 선언뿐 아니라 실제 decode 성공 검증 |
| 수명·보관 | createdAt, expiresAt, retentionPolicySource | 로컬 임시/상품 서버 보관·게시 이미지 URL 수명 분리. C가 중앙 정책 참조 시점을 확정 |
| 상태·오류 | state, stage, errorCode, attemptedAt, completedAt | queued/processing/succeeded/failed/cancelled/uncertain 구분. 성공불확실과 확정실패 재개 정책 분리 |
| 상품 저장 | expectedRevision, 반환 영수증/결과 ID | 삭제/수정·계정 변경 거절. 같은 requestId 중복 저장 차단, 두 창 동시 반환 충돌 처리를 서버 저장 시 원자적으로 보장 |

P1 로컬 처리에는 서버용 회원/저장 필드를 억지로 채우지 않는다. P2에서 권한·기한·revision을 검증할 위치는 C/A 합의가 필요하다. 원본 URL에 서명값/토큰이 있으면 CSV·장기 로그에 그대로 넣지 않는다.

현재 저장 기준은 `PLAN_20261111_MEMBER_STORAGE_QUOTA.md` **§10~11**과 실제 `member_storage_policy`다. 무료500MB/생성·발행30일, 구독/열외/유예는 C의 확정표를 따른다. 이번에 DB 실제 값을 조회한 것은 아니다. 11번가 대표사진의 마켓 복사와 상세의 우리 URL 참조는 이전 기록의 구분이며 새 P2 결과의 지속 노출을 보장하지 않는다.

## 5. 최소 표본과 검수표

모든 신규 기능 항목의 현재 판정은 **미실행**이다. 합성 이미지는 AI 없이 로컬 도형·색상·문자 표본을 만들고 A/B/C 세 상품의 ID·옵션과 기대 main/sub를 별도 정답표로 고정한다. 원본/결과 해시·파일수·크기·정답표를 증거로 남긴다.

| ID | 시험·재현 조건 | 통과 기준 | 담당·환경 |
|---|---|---|---|
| M01 | 서로 다른 상품3개, A/B/C main+개별sub | A에는A만, 상품별 결과3개·매핑 보존 | A/F 로컬/브라우저 |
| M02 | 공용sub→개별sub 전환, 빈sub/잘못된짝 | 명시된 fallback만 적용, 오류 행에서 실행 전 수정 가능 | A/B/F |
| M03 | 중복·누락코드, 공백/한글/쉼표/TSV빈셀 | 식별모호성 표시, 행 순서로 조용히 매칭하지 않음 | A/F |
| M04 | 같은 상품코드·다른 옵션/같은 파일명 | 옵션별 분리, 다른 결과 덮어쓰기0 | A/F |
| M05 | 대소문자·NFC/NFD·금지문자·긴 이름 | ZIP/결과표 식별 유지, Mac/Windows 압축해제 충돌 방지 | A/F 양쪽 실물 |
| M06 | 투명PNG/JPG·세로/가로·EXIF회전 | contain/cover·배경·투명도·회전이 선택/기대와 일치 | A/B/F 시각·픽셀 |
| M07 | sub 경계 밖·잘못된수치·큰해상도 | 제한/오류 명확, Canvas 실패로 전체 결과 유실 없음 | A/F |
| M08 | 0/1/49/50/51개, 장당25MiB 전후 | 현행 상한 경계·거절 안내, 확정 범위 밖 지원 약속 없음 | A/F |
| M09 | 300개 입력 후보·저메모리 | 바나나 미지원이면 안전 거절; 확장 승인 시에만 부하/중단 실측 | A/F |
| M10 | 처리 도중 전체 중단·탭 닫기·다시 열기 | 성공 결과 보존, 다음 항목 실행 중단, 재개 가능 범위/만료 명시 | A/B/F |
| M11 | B만 decode/Canvas/ZIP 실패 | A/C 결과·정확한 행별 상태 보존, 확정 실패만 선택 재개 | A/F |
| M12 | 같은 결과 반환2회·응답 유실 후 재개 | 중복 버전/저장0, 확인 전 자동 재저장0 | A/C/F 격리 |
| M13 | 다른 origin/같은 origin 다른 window·위조상품ID | 수신/서버 권한 경계에서 거절, 타상품 반영0 | A/C/F 격리 |
| M14 | 작업 도중 로그아웃·다른 회원 로그인 | 이전회원 결과가 새회원 상품에 저장되지 않음 | A/C/F 시험계정 |
| M15 | 작업 중 상품 삭제·revision 변경·동시2창 반환 | 묵은 결과 거절/명시적 재확인, 최신 수정 유실0 | A/C/F 격리 |
| M16 | 반환 용량10MiB 전후·MIME거짓·손상파일 | 한도·실제 decode 검증, 파일명 확장자만 믿지 않음 | A/C/F |
| M17 | 무료/구독/열외·용량한도전후·동시저장 | 정책에 따른 사전 검사·정확한 용량/만료, 기존 파일 강제 삭제0 | C/F 격리 |
| M18 | 원본삭제·서명URL만료·구독종료·게시이미지 | 표시/반환 실패 범위 명확, 보관정책과 발행표시 일치 | C/F 격리·기록 |
| M19 | 기존 공용로고·미리보기·1장/ZIP·누끼왕복 | 기존 기능 회귀 없음, API/AI호출0(무료 경로) | A/F |
| M20 | 자료선택→짝확인→일괄처리→원래상품반환 | 재입력/파일왕복 감소, 필수 설정≤5단계·반복2~3회·동의1회 목표 실측 | B/F 브라우저 |
| M21 | 선택 유료AI의 취소·타임아웃·응답유실 | 본인키·비용/상한 동의, uncertain 자동 재호출0 | 승인 시 A/C/F |
| M22 | P2 결과→기존 등록기 검토 | 상품/옵션/대표·상세역할 정확, 외부 등록은 별도 선택 전0 | A/F 승인 시험 |

P3(URL 수신)는 별도 범위에서 CORS/403/404/만료/리다이렉트/비이미지/내부망 주소를 시험한다. P4/E2는 제공 자료·허용 출처를 다시 확인한다. 둘을 P1/P2 출시 필수로 몰래 편입하지 않는다. 메이커 설치파일 실험은 정확한 별도 패키지 확보 후 Windows에서 계획한다.

## 6. 지금 실행한 기준선 검증과 지적

기준 소스: 바나나 package v1.45.0, 상세 기존 누끼 반환 코드. [근거 JSON](maker-review-baseline-20261113.json)의 파일별 SHA256로 고정. 운영 배포버전 조회·실화면 재시험은 하지 않았다.

| 항목 | 실행/판정 | 근거·한계 |
|---|---|---|
| 일반 tsx 실행 | 환경 차단 | `node --import tsx --test tests/batchLayout.test.mjs tests/nukkiHandoff.test.mjs`에서 Windows용 esbuild/darwin-x64 불일치. 뒤 경로 nukkiHandoff.test.mjs는 실제 없음도 후속 확인. 제품 기능 실패로 보고하지 않음 |
| 배치 계산 기존시험 | **6/6 통과** | banana-canvas에서 `node --test tests/batchLayout.test.mjs`, Node24 기본 TS 사용. 렌더·브라우저·타입검사/빌드 통과 의미 아님 |
| 파일명 경계 추가 probe | 충돌 위험 재현 | outputNames의 SKU/sku·한글NFC/NFD가 정규화 기준 충돌. 정확히 같은 이름에는 (2)가 붙음 |
| 기존 누끼 메시지 | 다른origin 무시 확인 | 순수 readNukkiResult probe. 실제 메시지전송/계정/DB 격리 통과 의미 아님 |
| MIME 거짓 표본 | parser에서 수락 관찰 | 타입 image/png의 비이미지 Blob 수락. 실제 decode/서버 저장 방어 미검수, 취약점으로 단정하지 않고 M16 추가 |

### 지적 F-01 — P2: 운영체제 간 파일명 충돌 위험

- 재현: `outputNames(['SKU.jpg','sku.png'],'','jpg')` → `SKU.jpg`, `sku.jpg`. `가.jpg`/분해형 한글 이름도 서로 다른 출력 문자열로 유지됨.
- 기대/실제: 저장 대상의 대소문자·Unicode 정규화 차이와 무관하게 구분되는 이름 필요 / 현재 Set은 정확한 문자열만 중복으로 처리.
- 영향: Windows·기본 Mac 파일시스템에서 같은 경로로 충돌할 가능성. ZIP 생성 자체의 파일 손실/실제 압축해제 덮어쓰기는 미검수이며 확정하지 않음.
- 원인·위치: `banana-canvas/src/lib/batch/layout.ts` outputNames의 `Set<string>`에 정규화된 충돌키 없음.
- 수정 방향(A): 표시명/원본코드를 보존하고 충돌 비교용 정규화 키 또는 itemId 기반 안전 접미사, 결과표의 원본→출력 매핑 유지. 새 P1/P2 구현에서 M05 회귀 포함.
- 상태: **재현됨·미수정·압축해제 실물 미검수**. F가 제품 코드에 손대지 않음.

### 계약 검토 보류(신규 기능 버그 판정 아님)

- F-02(A/C): 기존 section+Blob 메시지만으로 다상품 반환의 request/revision/중복제어를 충족하지 못함. 신규 계약 확정 전 구현 완료 승인 불가.
- F-03(A/B): 기존 download는 한 번의 ZIP 루프·전체 catch 구조. 항목별 중단/부분실패/재개를 재사용만으로 완료했다고 보고하지 말 것.
- F-04(C): 서버 이미지 URL/회원 보관/용량과 로컬 처리를 혼동하지 않음. 운영 파일 삭제로 만료 시험하지 않고 격리된 fixture·정책 단위시험 사용.

시험 도구·중간로그는 `_workspace/maker-review-20261113/`. 운영 데이터·API·키 접근 없음. 유료AI0·설치0·빌드0·배포0·커밋/푸시0.

## 7. 담당께 전달할 내용과 완료 판정

- **A 기능 담당께:** 신규 엔진보다 기존 batch 재사용을 전제로 변경파일·상품/옵션/role 매핑·부분실패/취소·재개 계약을 제출해 주세요. F-01 파일명 충돌과 F-02 반환 중복/revision을 상세안에 반영해 주세요.
- **C 정책 담당께:** 로컬 P1/서버 저장 P2 구분, 회원·창·상품 소유권/revision/일회성 반환, 중앙 보관/용량·게시 URL 만료 표를 부탁드립니다. 운영 변경 없이 문서·격리시험부터입니다.
- **B 디자인 담당께:** A/C 초안을 받은 뒤 M01~M20의 정상·오류·취소/충돌 상태가 드러나는 화면안을 준비해 주세요. 기존 선택 전 구현/배포 완료로 기록하지 않습니다.
- **D/E 후속께:** G1 계약이 오면 기존 영상/몰 기능과 입력 필드 호환성만 먼저 검토하고 유료생성·실상품 등록/판매승인 변경은 하지 않습니다.
- **Windows 실행 담당께:** 일반 tsx 시험은 플랫폼 의존성이 있으므로 공유 node_modules를 Mac용으로 다시 설치하지 않았습니다. 구현 결과를 보낼 때 Windows 단위/타입·필요 빌드 로그와 배포 전후 버전을 분리해 주세요.

담당 결과 수신 형식: 커밋/파일diff·작업 ID·대상 버전·변경 경로·입출력 계약·시험 명령/환경/로그·기대/실제·미검수·유료/DB/빌드/배포 횟수. F가 독립 재현하고 지적별 담당/우선순위/수정커밋/재검수 결과를 이 문서에 누적합니다.

**출시 판정:** 회원/상품 오반영·원본 유실·중복 과금·불확실 자동 재실행은 차단 사유. 그 밖의 미검수는 승인된 범위와 영향에 따라 명시적으로 남깁니다. 단위시험 통과·배포 Ready·실물 흐름 통과를 별도 상태로 기록하고, 미실행을 통과로 처리하지 않습니다.

결과함 기록: `9bbb5b31-f7d2-402a-9928-729d969e4c09`.

## 8. 담당 산출물 1차 독립 검토 — 2026-11-13 후속

### 8-1. 수신 증거와 현재 단계

| 담당 | 실제 확인한 산출물 | F 판정 |
|---|---|---|
| A | `banana-canvas/docs/PLAN_20261113_MAKER_PRODUCT_COMPOSITE.md`, ACTIVE_WORK 구현 줄(실제 작업 세션 claude-win-blog), 새 productJobs/composite·시험 | 상세안 수신·구현 중. 정식 결과 인계·완성본 아님 |
| C | [정책 검토](POLICY_REVIEW_20261113_MAKER.md) | 정책 의견 수신. A 문서 이전 기준이어서 새 대표사진 컬럼·경로·이력삭제 반영 재검토 필요 |
| B | [디자인 결과](HANDOFF_20261113_MAKER_AGY_DESIGN_RESULT.md), `banana-canvas/docs/IMPROVEMENT_HANDOFF_20261113_MAKER_BATCH.md` | 화면안 수신·자산 실재 확인. 계약 충돌/시안 구별 보완 후 채택 판단 |
| D | `shorts-onestop-studio/docs/IMPROVEMENT_HANDOFF_20261113_MAKER.md` | 기존 원스톱 재사용·상품사진/필드 확장 후속안 수신, 유료 실행 승인 아님 |
| E | `mall-builder/docs/IMPROVEMENT_HANDOFF_20261113_MAKER.md` | 몰/공급사/거울상품·사진 제안/적용 분리안 수신, 저장정책/DB 미결정 |

A 플랜 상단 「구현 안 함」과 ACTIVE_WORK 「추천안5건 승인·구현 중」이 공존한다. F가 구현 승인 재요청을 만들지 않고 최신 작업 기록을 인수했다. G1/G2의 정합성 지적은 승인 취소 요구가 아니라 구현/인계 전에 맞출 계약이다. 다른 담당 소스/문서는 수정하지 않았다.

### 8-2. 담당 간 계약 지적(코드 완성본 버그 판정과 구별)

| ID·우선순위 | 기대 / 실제·근거 | 담당·수정 방향·재검수 |
|---|---|---|
| C01 P1 | 원본 보존·상세 반환 / B result는 「58장 자동 덮어쓰기」·마켓 큐/쿠팡/몰 즉시 전송, A는 새 대표사진 칸·원본 불변이고 몰/직접전송 제외 | A/B: 상세 새 버전 저장/기존 등록기에서 재검토로 통일. 미구현 마켓/몰 동작 버튼을 현행 기능처럼 표시하지 않음. M12/M20/M22 재검수 |
| C02 P1 | 같은 파일 단일 담당·순서 / A는 기존 BatchPhotoBoard/layout/render 수정 안 함·새 ProductCompositeBoard를 A→B, B는 기존 BatchPhotoBoard를 B→A·기존엔진 수정 | A/B: ACTIVE_WORK의 신규파일 분담을 기준으로 수정경로/순서 재합의·B 인계 갱신. 겹치는 코드 수정 전 확인 |
| C03 P1 | P2 저장/보관 단일 계약 / A는 새 main_image_url(s)·최대10개이후오래된파일삭제·경로 `<uid>/<pid>/main-...`, C는 새DB불필요·기존 `<uid>/products/<pid>/` 이력 보존 | A/C: 승인된 새컬럼 안을 C가 재검토. 용량/정리/권한 경로, 원본·과거 대표사진 파일 수명, 등록/게시에서 참조 중인 이미지 삭제 위험 포함. 이번에 운영 삭제하지 않음 |
| C04 P1 | 로컬 계산과 서버저장 불확실 구별 / A §5 「유료호출 없어 불확실 상태 없음」·성공 ACK 받은 것만 재전송 방지 | A/C: DB저장 성공 후 ACK 유실을 uncertain으로 처리, status/영수증/원자적 expectedRevision·일회성 작업소비로 확인 후 재개. 무료라도 저장 불확실 존재. M12/M15 |
| C05 P2 | 최대50상품·sub0~3·기본프리셋 / B 시안64개 로드·60개 실행/58개 반환, 개별sub1칸·1000고정·WebP, A는50/3·크기선택·JPG/PNG | A/B: 승인된 실제 상한·서브 수·형식/프리셋으로 문구와 상태 재정렬. 미측정FPS/메모리/12.8초는 예시임을 명확히 |
| C06 P2 | 최초설정/반복조작/동의는 구현 후 실측 / B는 정적 시안으로 목표100%충족·즉시중단 구현완료 보고 | B/F: 화면안/목표와 동작 구현·실측 분리. A의 「현재1장 마치고 중단」 지연/ZIP·저장 중 중단도 화면에 표시 |
| C07 P2 | 완전히 다른 구조의3시안 / 확인한 68/104 작업표는 같은 표·버튼·배치에서 색만 다르고 12HTML 태그 구조도 화면별 동일 | B: 레이아웃/사용경험이 다른 안을 보완하거나 기존 단일안의 색상 변형으로 정확히 표시. 3개PNG 육안 확인, 전체12개 시각/인터랙션 완전검수 아님 |

C03/C04는 반환 액션이 아직 없던 시점의 계약 검토다. 원자성/중복방지의 실제 구현이 나오면 코드와 격리시험으로 다시 판정한다. 서버 권한/RLS가 이미 깨졌다는 주장으로 확대하지 않는다.

### 8-3. 새 순수 함수 스냅샷 시험·재현 지적

진행 중 파일이므로 제품 폴더를 수정하지 않고 `_workspace/maker-review-20261113/snapshot-2/`에 4개 파일을 복사했다. 복사 직후 원본 해시를 재확인했으며 검수 종료 대조 때 productJobs/composite/layout은 동일, 담당 시험 파일은 그동안 갱신됐다. 아래 판정은 근거 JSON의 해시에 한정한다.

- 자체시험: `node --import ./_workspace/maker-review-20261113/resolve-ts.mjs --test _workspace/maker-review-20261113/snapshot-2/banana-canvas/tests/batchProduct.test.mjs` → **9/9 통과**. 시험 전용 resolve hook은 확장자 없는 로컬 TS import만 해석하며 제품소스/의존성 설치를 바꾸지 않는다.
- 독립 경계 probe: 같은 snapshot 대상으로 [재현 JSON](maker-review-adversarial-20261113.json) 생성. 기존 단위9개에 빠진 입력 모호성·상한·배치·이름 틀을 확인했다.

| 지적·우선순위 | 재현·기대/실제 | 원인·수정 방향(A)·재검수 |
|---|---|---|
| F-05 P1 사진 선택이 입력 순서에 종속 | code=A/main=a.jpg, files=[a.jpg,A.JPG]면 A.JPG 선택, 역순이면 a.jpg 선택. 양쪽 ready·orphans=[] / 모호한 파일은 실행 전 거절 기대 | buildJobs의 소문자 Map에 마지막 값 덮어씀. 이름 정규화 충돌은 전부 표시/invalid 또는 명시적 파일ID 매칭. M01/M03/M04 재검수 |
| F-06 P2 서브 제한/중복 누락 | X_main+X_sub1~4 입력 → sub4장인 ready. X_sub1.jpg+X_sub1.png는 마지막 것만 남음 / 최대3·중복검사 기대 | rowsFromFileNames의 sub인덱스 할당 덮어씀, buildJobs 경로에 maxsubs 검사 없음. 모든 입력 경로에서 제한/중복검사. M02/M03/M08 |
| F-07 P1 기본3서브가 캔버스 밖 | subRects([1,1,1], DEFAULT_COMPOSITE) → 첫rect x=-32, width320 / 정상기본값에서 전체사진 보존 기대 | 3×320+2×24+양쪽여백이1000초과. 그룹 크기/여백 기준 축소·재배치 또는 실행전거절. 9앵커·가로세로·최대비율 검수. 실제 브라우저 렌더는 미검수 |
| F-08 P2 결과명 틀의 경로 문자 유지 | normalizeComposite({template:'../folder/{code}'})→그대로, compositeNames→../folder/ABC.jpg / 안전한 단일파일명 기대 | 값(safePart)만 정리하고 template리터럴 미검증. 최종base에도 금지문자·경로요소·예약이름/길이 정책 적용. ZIP생성/압축해제 경로이탈 실물은 실행하지 않음 |

**F-01 신규 경로 부분 해소 확인:** 새 compositeNames는 SKU/sku·한글NFC/NFD에 (2) 접미사를 붙여 정규화 기준 유일하다. 기존 layout.outputNames는 그대로라 전체 버그 해결로 닫지 않고 신규경로 통과/기존경로 미수정으로 분리한다.

### 8-4. 디자인 자산 확인·후속 범위

- `/Volumes/gt1_mega/Antigravity/Design/{68_creative_atelier_paper_pop,104_neo_b2b_enterprise_console,62_nano_neural_art_canvas_lab}/banana-canvas_batch/`에 각각 4HTML/4PNG/README/독립뷰어 존재. **12 PNG 모두1440×900**. [자산 해시/크기](maker-design-audit-20261113.json).
- 육안 확인: 68/01_table, 104/01_table, 62/04_result의 3장. 색상변형·50상한과 다른 수치·자동덮어쓰기/마켓몰직접버튼을 실제 캡처에서도 확인. localhost3800호스팅/버튼동작/모바일/라이트박스는 이번에 시험하지 않았다.
- D 후속: 1차 글자/회원파일, 2차 sourceRef를 P1/P2 출시 필수로 확대하지 않음. 영상 대본/AI영상·업로드는 별도 실행 범위. 사진참조 시 회원권한·원본삭제/만료·상품revision 유지 검수 추가.
- E 후속: store_id/slug/product/supplier와 거울상품 차단·사진제안→적용 분리를 유지. 공급사 적용은 기존 재승인 규칙이므로 「어떤 적용도 승인상태 불변」으로 왜곡하지 않음. 몰의 현재 저장경로/정리/용량 예외는 C의 별도 정책 결정 필요. B의 즉시몰동기화 버튼과 충돌.

### 8-5. Windows 담당에게 전달할 글

> A 구현 담당(현재 ACTIVE_WORK claude-win-blog)·B agy·C policy께: 이 검수표 §8을 먼저 확인해 주세요. 새 스냅샷 단위9/9는 통과했지만 F-05 사진이 입력순서에 따라 바뀜(P1), F-06 서브4장/중복번호 통과, F-07 기본3서브 x=-32 잘림(P1), F-08 ../이름틀 유지가 재현됐습니다. 근거 JSON의 소스해시와 현재파일부터 대조한 뒤 수정·회귀시험을 부탁드립니다. A/B 파일 소유권/작업순서와 원본보존·상세반환/직접마켓몰전송 범위를 맞추고, C는 승인된 새 대표사진컬럼 안의 경로·이력정리·용량/권한 계약을 재검토해 주세요. 무료 연산이어도 서버저장 ACK유실은 불확실 상태이므로 자동재저장 방지와 원자적 revision 확인이 필요합니다. 제품소스/시안은 F가 고치지 않았으며 빌드·운영DB 적용·배포·유료실행도 하지 않았습니다. 수정커밋·시험로그·미검수를 넘기면 같은 시나리오로 재검수하겠습니다.

이번 후속 검수 비용 $0·AI0·설치/빌드/배포/직접운영DB/커밋·푸시0. 공유파일을 읽는 동안 담당 구현은 계속 진행 중이므로 정식 결과 인수 후 새 해시를 고정해 재검수해야 한다.

후속 검수 결과함: `bb92fb41-caa5-4b57-ab68-31c0eba2ad90`.
## 9. 2026-11-14 최신 수정본 독립 재검수(맥미니)

- 기준 HEAD `df6d63255fc295943b430f0e4c73d8d8684aa69b`. 검수 대상 파일별 SHA256는 `maker-review-adversarial-20261113.json`의 `recheck20261114.snapshot`에 고정. 운영 실측 v1.47·시험계정. 공유 작업폴더의 미배포 agy 화면과 운영 화면은 구별했다.
- 실행: `_workspace/maker-review-20261114/snapshot/`에 계산·렌더·큐·메시지·ZIP 함수와 시험을 복사하고 전후 해시 대조. 기존 resolve-ts hook으로 batchLayout+batchProduct **22/22 통과**. 설치·빌드 없이 기존 의존성을 읽기 참조했다.
- **F-05 P1 미해결:** 현재 buildJobs에서도 a.jpg/A.JPG의 입력 순서에 따라 사진 선택이 바뀐다. 운영 v1.47에서도 폴더가 다른 `sku.png`(빨강)/`SKU.PNG`(파랑)을 함께 넣고 작업표 main=sku.png로 시험 → 입력 순서별 preview pixel 파랑[30,30,210]·빨강[240,30,30], 둘 다 준비1/고칠것0. 모호성 차단 필요.
- **F-06 P2 미해결:** 파일 이름 규칙 X_main+sub1~4 → ready·서브4장. sub1.jpg+sub1.png → 후자만 채택·전자 orphan. 세 장 제한/중복번호를 실행 전 오류로 표시해야 한다. 정상 51상품은 초과 invalid 표시로 방어됨.
- **F-07 P1 미해결·운영 렌더 재현:** 기본1000·서브32%·여백24에서 정사각 서브3장, br 첫rect x=-32. 9앵커 모두 하나 이상 바깥으로 나감. 운영 A 결과 JPG(1000×1000)의 x=0/y=800 픽셀이 청록[0,240,239]으로 가장자리 여백 소실, 캡처에서도 첫서브 왼쪽 잘림. 그룹 크기를 안쪽영역에 맞춰 축소/재배치 필요.
- **F-08 P2 미해결:** normalizeComposite/template '../folder/{code}' → 결과 '../folder/ABC.jpg'. 최종 파일명 전체의 경로/금지문자 정리가 필요. 실제 위험 ZIP 압축해제는 수행하지 않음.
- **F-01 분리 유지:** 신규 compositeNames의 대소문자/NFC 충돌 접미사 통과, 기존 outputNames SKU/sku 충돌은 남음.
- **운영 통과:** 서로 다른 A/B/C 메인색 유지·3결과1000×1000, D손상사진 실패1. ZIP=JPG3+CSV/JSON2, 결과표4행/실패원문 보존. 실패만다시1회 후 성공3/실패1 유지. 모바일390×844 innerWidth/doc/body=390, viewport복구. 오류문구 영어는 운영 상태이며 한국어 오류 코드가 작업폴더에만 있는 점은 담당 인계와 일치.
- **미배포 새 UI 통합 차단 사항(A/B, P1):** 현재 page.tsx→BatchWorkspace→ProductBatchBoard 경로. 새 ProductBatchBoard에는 상세 작업 수신/READY/SAVED 처리 없이, 반환을 {kind,count,items:[code,option,productId,fileName]}로 보내며 대상 origin은 바나나 주소다. 기존 수신은 상세 주소에서 {type,jobId,productId,file:Blob,...}를 요구하므로 호환되지 않는다. 저장 ACK 없이 '안전하게 반환' 안내도 표시한다. 기존 ProductCompositeBoard의 작업/창/결과/저장 약속을 유지해 UI를 입힌 뒤 회귀해야 한다. 이는 미커밋 소스 정적 확인이며 운영 v1.47 반환 실패로 보고하지 않는다.
- 새 UI는 ZIP/폴더 입력·25MB 검사도 기존 기능 화면과 다르고, 재실행 때 setResults([]) 및 모두 ready로 재생성하여 중단/실패 재개의 성공결과 보존이 보장되지 않는다. 미배포/작성중 범위로 담당에게 통합 검토 요청한다. 소스는 고치지 않음.
- 근거 도구/ZIP/캡처: `_workspace/maker-review-20261114/`의 probe-results.json·browser-composite-result.json·browser-case-collision.json·zip-audit.json·output-pixels.json·composite-partial-failure.png·mobile-390.png. PIL 없음은 검수환경 차이로 기록, 설치 없이 브라우저 Canvas로 출력 크기/픽셀 판독.
- 운영 P2 저장·다른회원/origin·동시성·보관/용량·스마트스토어 판매자센터는 이번에 실물 미실행. 기존 단위통과/작성자 실물통과를 F 독립검수 전체완료로 확대하지 않음. AI·빌드·배포·직접DB·실마켓0, 비용$0.
- 후속: 사용자 상품소싱 v1.39 실물 요청 접수. 위 결과 보존 후 해당 요청 준비로 전환, 메이커 전체검수는 미완료이며 수정커밋 인수 후 재검수한다.
## 10. 순차 진행 2번 — 새 UI 반환 수정본 재검수(2026-11-14)

- 최신 새 UI와 공용 메시지·계산·시험을 `_workspace/maker-review-20261114/recheck-2/`로 복사, 파일별 SHA256/HEAD를 metadata.json에 고정. batchLayout+batchProduct **23/23 통과**(M1 origin 검사 포함). 저자97/97 전체·타입/빌드 보고와 F가 실행한23개는 구분한다.
- **수정 확인:** 새 ProductBatchBoard가 from=shop-detail/mall별 origin을 선택, READY·작업 수신·SAVED 처리·type/jobId/productId/file/settingsVersion·senderOrigin 전송을 갖췄다. §9의 메시지 kind/자기origin/Blob누락 지적은 이 소스에서 수정됨. 운영배포/실물왕복 완료로 확대하지 않음.
- **F-09 P1 새 UI 연결작업 유실:** 빈 파일/표 상태에서 상세 또는 몰 작업1개 수신 → 메시지 effect가 setFilesMap(uuid#0 키)·setJobs(상품1) → filesMap 변경으로 파일모드 매칭 effect 실행 → uuid#0는 파일명 규칙에 맞지 않아 rows=[] → setJobs([]), 상품0. 두 from 모두 재현. 기준 `ProductBatchBoard.tsx` 약130~180/210~245. 이전 ProductCompositeBoard는 연결모드에서 fileJobs=null로 파일재분석을 막지만 새 UI에는 해당 가드 없음.
- 재현 방법: TypeScript AST로 실제 두 useEffect 문장을 그대로 추출, 순수 의존성·상태 setter·window를 주입한 격리 Node 시험. 다른창/다른origin 거절·READY주소도 확인. 실제 React DOM/운영 DB 호출 없음. harness의 최초 realm 객체 비교 오류는 테스트 수정 후 제거했고 제품실패로 세지 않음. 근거 `ui-effects-recheck.json`(수신1/재매칭0·orphan uuid#0).
- 수정 방향(A/B): 연결작업 상태를 독립 관리하고 linkedJobId/연결mode일 때 파일모드 effect를 건너뛸 것. 실제 상품 수신→다음 render→합성 가능 상품수/미리보기 유지 회귀시험 필요. 단순 메시지 parser 왕복시험만으로 UI 통합완료 판정 불가.
- **추가 소스 검토:** startBatchExecution에서 result를 비우고 전부ready로 다시만들며 수신ACK는 results에만 반영하므로 배치 진행중 빠른ACK가 빈 results에서 사라지고 마지막 finalResults(sending)로 덮일 가능성. 자동반환 후 수동반환도 saved/sending 구분 없이 재전송한다. 이는 정적검토/미실물이며 중단재개·조기ACK·중복저장 회귀시험 요청으로 남김.
- 이전 F05~08의 담당수정 인계는 아직 없음. 해당 계산/매칭파일 최신 해시와 이전재현 대상 일치 여부는 근거JSON에 저장, 해결로 닫지 않음.
- 운영P2/서버동시성·회원격리·용량·판매자센터 미검수 유지. 새UI는 미배포 기록이며 F-09를 운영 장애로 단정하지 않는다. AI/설치/build/dev/배포/운영DB쓰기0·비용$0.
- 순차3번 이웃: Windows 85eedc18b 진단 회신 수신(offer409 BNC_RETURN_POST_REQUIRED, 내글탭 읽음). 운영v1.20에서도 지정이웃글 전경을 확인해1회 재검수 가능, 별도 배포승인을 다시 요청하지 않음.

### 최신 커밋 추가 대조

검수 중 1060a8b22(수동반환 saved건 제외·jobId필수·전송/저장 문구 구분), 5d185e89c(v1.48 릴리스 준비) 커밋을 확인했다. 1060a8b22의 해당 보완은 소스에서 확인했고 이전 수동반환 지적을 부분 해소로 갱신한다(sending/조기ACK·서버 중복소비는 별도). 변경된 현재 ProductBatchBoard를 recheck-3으로 다시 고정해 동일 effect 격리시험 수행: 상세/몰 모두 수신1→파일매칭후0으로 F09 재현 유지. 최신 UI 파일해시/시험결과는 JSON latestWorkingCheck. 이번 운영 v1.48 배포화면/React DOM 왕복을 확인한 것은 아니다.
## 11. v1.48 배포 커밋 기준 재대조 — 2026-11-14 22:57 KST

- Windows 배포 인수: 5d185e89c를 포함한 커밋본, banana-canvas-eqexlh8xq Ready·DBv1.48·새UI확인 보고. F는 Git객체 `5d185e89c:<경로>`에서 직접 읽은 5파일을 `_workspace/maker-review-20261114/v148/`에 고정했다. 작업폴더의 후속수정을 배포코드와 혼동하지 않음.
- **배포커밋에서 재현 유지:** F05 a.jpg/A.JPG 입력순서선택, F06 파일명규칙sub4장ready/중복sub번호마지막선택, F07 기본3서브 br x=-32(9앵커넘침), F08 '../folder/{code}'최종경로문자유지. 인수의 「공용계산코드에검사가있음」은 CSV/일부경로의검사와구별해야하며지적4건해결근거가되지않는다.
- **F09 유지:** 배포커밋 실제2개effect문장격리시험에서도 상세/몰 둘다수신1→재매칭0, wrongwindow/origin거절·READY주소는정상. 브라우저React실물재현/운영서버쓰기없이수행한코드시험임을명시한다. 원인/수정방향은§10.
- **윈도우 ecommerce-image/agy 담당께:** 위5건을해결하기전메이커연계통합완료로닫지말고, 연결모드파일매칭가드+렌더후상품수유지·두창왕복/저장ACK·이전경계4건을회귀시험해수정커밋을인계해주십시오. 기존반환type/origin/Blob수정과1060a8b22 saved건제외는소스에서확인했으며다시미수정으로돌리지않는다.
- 근거 JSON의 releaseV148Recheck: releasecommit/파일해시/독립probe/effect시험. runtime v1.48 UI/저장은 별도미검수이며이시험만으로운영DB손상이나회원권한취약점을단정하지않음.
- 이어받은WP제목190f971dc/bedc6ed08은코드수정·미배포확인. 현재실화면제목이옛것인점은미배포와일치한다. 이웃웹은Nav·WP는login·티스토리는미설치로현재준비상태변경없음. 추가검색/읽기/수락/원고입력/AI/운영DB/빌드/배포0·비용$0.

