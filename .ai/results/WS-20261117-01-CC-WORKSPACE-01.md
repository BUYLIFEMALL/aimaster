# WS-20261117-01 결과 — 쇼핑제휴 2단계(`2d373c8ad`) 독립 읽기 검토 (CC-WORKSPACE-01)

- 담당: Claude(Workspace) `CC-WORKSPACE-01` · 지시: Master `msg_54fe67a8e085` · 추가자료 `msg_96a9b728af2b`(`.ai/results/TAP-20261117-01-CC-ECOM-01.md`)
- 상태: **ready_review** · 운영지침 v1.1 형식 · 제품 수정 0 · 확장 설치 0 · 실제 네이버 수집 0 · DB 조회/쓰기 0 · build/deploy 0 · AI 0
- 대상: `threads-affiliate-poster` 커밋 `2d373c8ad`(25파일, 미배포). 이후 해당 폴더 변경·미커밋 변경 0 확인.
- 방법: 정적 읽기 + `src/lib/naver/brandConnect.ts`만 저장소 밖으로 복사해 Node 26(`--experimental-strip-types`)으로 순수 함수 경계값 실행. 기존 시험 25개 재실행 안 함.

## 1. 결론
- 고지·회원 격리·30일 정리·버전/ZIP·키 노출: **기준 충족**(2절).
- **결함 2건(낮음~중간)·참고 4건**(3절). 운영 차단급 결함은 없음.
- 릴리스 선행 조건은 결함과 분리(4절).

## 2. 확인한 것(충족)

| 중점 | 근거 | 판정 |
|---|---|---|
| 웹↔확장 메시지 출처 | `extension/web-bridge.js`: `location.origin`이 운영 주소일 때만 동작, `event.source===window`·`event.origin===location.origin`·`source:'tap-app'`·type 2종·`requestId` 문자열 검사, 응답도 `location.origin`으로만. 웹 쪽 `NaverCollectPanel.tsx:28-36` 동일 검사 | 충족 |
| 확장 외부 접근면 | `manifest.json`에 `externally_connectable` 없음 → 서비스 워커 `onMessage`는 자기 확장 콘텐츠 스크립트(운영 주소 한 곳)만 수신 | 충족(3-3 심층방어 권장) |
| 시작 URL 제한 | `background.js:13-18` `isNaverMe`(https·naver.me·계정/포트 없음·경로) 아니면 탭 안 염 | 충족 |
| 리디렉션 도착 허용목록 | `background.js:28-51` 탭이 naver.me를 벗어나 `complete`가 되면 `productIdentity` 아니면 `PRODUCT_IDENTITY_MISMATCH`로 중단, 30초 제한. 확인→주입 사이 탭 이동 틈은 있으나 서버 `sanitizeCollected`가 페이지 안 `location.href`를 다시 검사(`brandConnect.ts:73-77`)해 거부되므로 완화됨 | 충족 |
| 호스트 권한 | 운영 주소 + naver.me + 네이버 상품 4호스트만. 새 창 없이 같은 창 백그라운드 탭 → `finally`로 닫음 | 충족 |
| 서버 재검증 | `sanitizeCollected`: 도착 주소 허용목록, 이미지 `pstatic.net`만·https 강제·중복 제거·10개, 후기 10~600자·평점 1~5만·8개, 정보 300자·30개, 제어문자 제거. 경계값: 가짜 접미 호스트·다른 호스트·http·쿼리 속 `/products/`·`..` 경로·`pstatic.net.evil.com`·`javascript:` 모두 거부 | 충족(포트·계정은 3-2) |
| 본인 큐 격리 | 서버 동작 5개 모두 `requireProgramAccess()` + `.eq("user_id", user.id)`(`naverCollect.ts`). 표 RLS `auth.uid()=user_id`(for all, using+with check). `ai.ts` 근거 조회도 `user_id`+`product_id` | 충족(실세션 미검수) |
| 입력 제한 | 링크 30개 상한·naver.me 아닌 줄 별도 반환(`parseNaverBrandLinks`, 31개→30 확인), 등록 30개 상한, 오류 문구 300자 자름, `registered`는 다시 덮지 않음 | 충족 |
| 30일·예외 회원 | `cleanup-media/route.ts`: 대기열을 `created_at < cutoff`로 삭제하고 기존 `exemptFilter`(retention_exempt) 적용, 예외 목록 못 읽으면 503으로 전체 정지, CRON_SECRET 확인. 상품 등록 뒤에도 근거는 대기열에만 | 충족(실행 미검수) |
| 고지 항상 유지 | `affiliateGenerator.ts:111-148` 고지를 글 맨 앞에 붙여 반환, 글자수 계산도 고지 먼저 확보. 네이버는 기본 쇼핑 문구(null 없음), 도착 주소가 `pkgtour`면 여행 문구 — 결정 4와 일치 | 충족 |
| 결정 3·6 범위 | 네이버 수집만(쿠팡 후기 수집 코드 없음), 새 표 `tap_collect_queue`(본인 RLS·30일·예외 제외) | 일치 |
| 이름·버전·ZIP | manifest 이름 「Threads 쇼핑제휴 자동화」 = AGENTS 공식명, `1.88.0`/`v1.88` = `lib/version.ts`. `-latest.zip`=`-v1.88.zip`(바이트 동일), ZIP 안 `manifest.json·background.js·web-bridge.js·NOTICE·icons` 모두 확장 폴더와 동일, 확장 `NOTICE` 포함 | 충족 |
| 키·토큰 노출 | 확장·브리지는 회원 정보·토큰을 다루지 않음, 새 코드에 키 문자열 없음 | 충족 |

## 3. 결함·참고

### 3-1. [결함·중간] 등록·대기열 추가가 원자적이지 않아 중복 생성 가능
- 경로: `src/lib/actions/naverCollect.ts:90-108`(등록), `:37-43`(링크 추가). 마이그레이션에 `(user_id, affiliate_url)` 고유 제약 없음.
- 재현(정적 추론, 미실행): 같은 「준비됨」 항목을 두 탭/두 번 클릭으로 동시에 등록 → 두 요청 모두 `status='ready'`를 읽고 `affiliate_products`를 각각 insert → 같은 링크 상품 2건, 큐 `product_id`는 나중 것만. 상품 insert 뒤 큐 update가 실패해도 큐가 `ready`로 남아 다음 등록에서 또 생성. 링크 추가도 「조회 후 insert」라 동시 제출 시 같은 링크 큐 행 2건.
- 영향: 회원 본인 데이터 중복(같은 상품 글 중복 생성 가능), 타 회원 영향 없음.
- 완료조건: 등록 전 `update ... set status='registering' where id=? and user_id=? and status='ready' returning`으로 선점한 행만 insert(실패 시 되돌림), 대기열에 `unique (user_id, affiliate_url)` + `on conflict do nothing`. 동시 2요청 시험에서 상품 1건.

### 3-2. [결함·낮음] 서버 도착 주소 검사가 포트·계정 정보를 허용
- 경로: `src/lib/naver/brandConnect.ts:33-44` `naverProductIdentity`(확장 `background.js:20-26` `productIdentity`도 동일).
- 재현(실행): `naverProductIdentity("https://smartstore.naver.com:8443/products/1")`, `("https://u:p@smartstore.naver.com/products/1")` → 둘 다 `SHOPPING`. 같은 파일의 `isNaverBrandAffiliateUrl`은 둘 다 거부함(일관성 불일치).
- 영향: 실제 네이버 리디렉션으로는 나오기 어려워 낮음. 다만 확장 결과를 믿지 않는다는 설계상 회원이 조작한 값이 `final_url`/`product_url`로 저장될 수 있음.
- 완료조건: `!url.port && !url.username && !url.password` 추가, 두 경계값 시험이 null.

### 3-3. [참고·낮음] 서비스 워커가 메시지 보낸 쪽을 검사하지 않음
- `background.js:155-165`. 지금은 외부 연결 설정이 없어 실해 없음. 심층방어로 `sender.id === chrome.runtime.id && sender.origin === 'https://threads-affiliate-poster.buylife.xyz'` 확인 권장.

### 3-4. [참고] 등록 단계에서 도착 주소 재검사 없음
- `naverCollect.ts:91`은 `status==='ready'`·값 있음만 봄. 큐 RLS가 본인 행 전체 쓰기를 허용하므로 회원이 브라우저 Supabase 연결로 `status/final_url/connect_kind`를 직접 바꾸면 검사 없이 등록됨. 단 `affiliate_products`도 원래 본인 insert/update 허용(`0001_...sql:80-83`)이라 새 권한은 아님 → 일관성 차원에서 `naverProductIdentity(r.final_url)` 재확인 권장. `connect_kind`를 조작해도 고지는 쇼핑/여행 중 하나로 항상 붙음.

### 3-5. [확인 필요] 후기 텍스트에 제3자 표시 정보가 섞일 가능성
- `background.js:102-113`이 `button/article/[class*=review]` 전체 글자를 600자까지 저장 → 스마트스토어 후기 칸에는 가린 아이디·작성일·옵션이 함께 있는 경우가 많음(실제 페이지 미확인 — 지시대로 실제 수집 안 함). 이 글은 회원 대기열에 30일(예외 회원은 무기한) 저장되고 AI 입력으로 감.
- 완료조건: 실제 상품 1건으로 저장된 `reviews` 확인 → 아이디·날짜 패턴이 있으면 저장 전 제거.

### 3-6. [참고] 근거 조회 `maybeSingle()`
- `ai.ts`가 `product_id`로 한 행만 기대하는데, 3-1 중복이나 직접 수정으로 2행이 되면 오류로 근거가 조용히 빠짐. `product_id` 고유 인덱스(where not null) 권장.

## 4. 릴리스 선행 조건(결함 아님)
- 현재 저장소 manifest·ZIP·`lib/version.ts`는 v1.88로 서로 일치(운영엔 아직 확장 ZIP 없음). 다음 배포 v1.89 때 `prebuild`가 manifest·`-v1.89.zip`·`-latest.zip`을 만들면 **그 결과를 같은 커밋에 포함**해야 저장소=운영.
- DB `programs.extension_version`·`extension_download_url` 두 칸이 비어 있다고 담당 보고 → 배포 SQL에서 `v1.89`·latest 주소로 채우고 `node scripts/check-extension-release.mjs threads-affiliate-poster` OK 확인(핵심 원칙 10).
- 배포 보고에 「ZIP 받기 → 압축 풀기 → chrome://extensions 새로고침」 안내 포함.

## 5. 검증 / 미검수
- 실제 검증: 정적 읽기 전부, `brandConnect.ts` 순수 함수 경계값 19건 실행, ZIP 내용 바이트 비교, 고지 조립 순서.
- 미검수(지시상 하지 않음): 다른 회원 세션으로 RLS 실측, 운영 스키마 실제 상태(담당 보고 `success`만), 30일 크론 실제 실행, 실제 확장 설치·naver.me 리디렉션·상품 페이지 선택자 동작, 동시 등록 실측(3-1은 정적 추론), 설치 키트(독립 모드) 주소에서 확장 미동작(허용 주소 고정 — 담당 보고와 동일).

## 6. 다음 단계
- Master 판정. 3-1·3-2 보완은 담당(ecommerce-image, `CC-ECOM-01`) 몫, v1.89 배포 묶음에 함께 넣으면 빌드 추가 없음.

## 비용
없음(빌드 0·AI 0·DB 0·외부 호출 0).
