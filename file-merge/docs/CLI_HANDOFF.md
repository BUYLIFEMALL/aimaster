# AI 엑셀·텍스트 합치기 자동화 (`file-merge`) — 인수인계 (2026-10-15, v1.01)

## 1. 구조
| 위치 | 역할 |
|---|---|
| `src/lib/files/table.ts` | 순수: `toTable`(머리글 행 지정·빈 줄 제외·머리글 정리), `mergeByHeader`(**머리글 이름 기준 정렬** — 공백·대소문자 무시, 처음 나온 순서로 열 구성, 원본 파일·시트 열 선택), `splitByColumn`·`splitByRows`, `safeSheetName`(31자·금지문자·중복), `safeFileName` |
| `src/lib/files/text.ts` | 순수: `decodeText`(BOM → UTF-8 엄격 → **CP949** 자동), `joinTexts`, `sentences`, `splitByChars`(문단 → 줄 → 문장 → 띄어쓰기 경계, 이어 붙이면 원문), `splitIntoParts`, `splitBySentences`(고르게·빈 조각 없음) |
| `src/lib/files/sheetio.ts` | SheetJS 0.20.3로 엑셀·CSV 읽기(`cellDates`), `.xlsx`·CSV(UTF-8 BOM) 쓰기 |
| `src/lib/files/zip.ts` | 의존성 없는 ZIP(portrait-photo에서 복사), `download.ts` 브라우저 저장 |
| `src/components/files/*` | `Common`(끌어다 놓기·순서 변경 목록·미리보기 표·이름 입력), `ExcelMerge`·`ExcelSplit`·`TextMerge`·`TextSplit`(각 화면 ① 파일 ② 방식 ③ 미리보기 ④ 저장) |
| `src/app/(workspace)/excel-merge·excel-split·text-merge·text-split·guide` | 페이지(루트 `/` → `/excel-merge`) |
| `supabase/migrations/0001_register_program.sql`·`0002_thumbnail.sql` | 프로그램(카테고리 Tools, 배지 new, 최소 등급 일반)·요금제 3종·VIP 접근·썸네일 기록 |
| `scripts/add-file-merge-vercel-env.mjs`(루트) | Vercel 환경변수 4개 등록(공용 Supabase 3개 + 메인 주소) |

## 2. 검수 기록(v1.01)
- 단위 테스트 10/10(`npm test`) — 레퍼런스에서 실제로 재현한 결함(머리글 반복·열 어긋남·다른 시트 섞임, 텍스트 조각 불균등, CP949 깨짐)이 생기지 않는지 포함. `tsc`·`npm run build` 통과.
- 운영(엣지, 일반 회원 `buylifemall@naver.com`): 비로그인 → 로그인 화면(307). 엑셀 합치기 — 레퍼런스와 같은 시험 파일(열 순서 다른 2파일 + "메모" 시트) → "대구"가 지역 열, 머리글 1번, 원본 파일·시트 열, 메모는 별도 "비고" 열 / 메모 해제 후 저장 파일 다시 읽어 확인. 엑셀 나누기(열 값별 "지역") → ZIP 안 3파일(서울 2행·부산 1행·(빈 값) 1행, 각 머리글). 텍스트 합치기 — CP949 파일 자동 인식("한국어 ANSI") + 구분선 + [파일명] 줄. 텍스트 나누기 200자 → 197·179자, 띄어쓰기에서 자름, 이어 붙이면 원문과 동일. 400px iframe에서 3개 화면 좌측 메뉴 숨김·위쪽 메뉴·본문 385px·가로 넘침 없음. 메인 카탈로그 목록·상세에 이름·썸네일 표시.
- 다운로드는 엣지가 연속 자동 다운로드를 막아 `URL.createObjectURL`·`a.click`을 가로채 결과 파일을 다시 읽어 확인했다.
- 검수 함정: `navigate` 직후 바로 스크립트로 파일을 넣으면 React가 붙기 전이라 무시되고 저장 대기가 멈춤(45초 시간 초과) → 입력 요소·화면 반응을 기다린 뒤 실행.

## 2-1. v1.02 (2026-10-15) — 큰 파일 처리: 백그라운드(Web Worker)
- **실측(v1.01, 엣지·운영)**: 엑셀 2개(각 10만 행·12열, 16.3MB·15.6MB, 둘째는 열 순서 반대) 읽기+미리보기 4.5초(화면 멈춤 파일당 약 2초) → 합쳐 저장 7.3초(**내내 화면 멈춤·진행 표시 없음**), 결과 36.7MB·20만 행 정확. 텍스트 30.6MB(1,329만 자) 2,000자 분할 약 1초, 2만 자 667조각 ZIP 0.2초 — 텍스트는 충분히 빠름.
- **변경**: 엑셀 원본은 Worker 안 보관소(`src/lib/files/sheetStore.ts` `handle()`)에만 두고 화면은 시트 목록·미리보기 20행·행/열 수만 받는다. 합치기·모으기·나누기 계획·저장(ZIP 포함)도 Worker에서. `sheet.worker.ts` + `sheetClient.ts`(Worker를 못 만들면 같은 `handle()`을 화면에서 실행). 화면에 "읽는 중/파일을 만드는 중" 표시와 버튼 잠금.
- **찾아서 고친 결함**: `toTable`의 `Math.max(0, ...행 목록)`이 20만 행에서 Worker 안에서 "Maximum call stack size exceeded" → 반복문으로 교체, 30만 행 회귀 테스트 + `--stack-size=200` 확인.
- **실측(v1.02)**: 같은 파일 읽기+미리보기 5.5초·**화면 멈춤 0**, 저장 7.7초·**멈춤 0**(이전 7.3초 멈춤). 엑셀 나누기 10만 행 7.3MB 읽기 1.3초·지역별 5파일 ZIP 1.1초·멈춤 0. Worker 실제 실행은 네트워크 기록의 `turbopack-worker-*.js`로 확인(빌드 결과에 `sheet.worker.*.ts` 원본 파일도 함께 나오지만 실행은 Turbopack Worker 진입 파일이 담당).
- 단위 테스트 13/13(`tests/store.test.mjs` 추가). **FREE 배지는 주인님 결정으로 달지 않음(유료 유지)**.
- 버전 v1.01→v1.02(`version.ts`·`package.json` 1.0.2·DB, 기록 `supabase/migrations/0003_version_v1_02.sql`).

## 2-2. v1.03 (2026-10-15) — 엑셀 합치기 결과 다듬기 (D1, Claude Code 보조 계정)
- **남길 열·순서**: "머리글 기준으로 이어 붙이기" 2단계 아래 열 목록(체크 끄면 제외, ↑↓로 순서, 전체 선택·처음 상태로). 파일·머리글이 바뀌면 고른 순서·체크는 유지하고 새 열은 끝에 체크된 채로 붙음. 기본 상태면 `cols: null`로 보내 계산 생략.
- **같은 행 제거**: 남긴 열 기준으로 값이 모두 같으면 처음 행만 남김. 원본 파일·시트 열은 비교에서 제외, 글자 앞뒤 공백 무시, 날짜는 같은 시각이면 같음. 미리보기·저장 안내에 뺀 행 수 표시.
- 코드: `src/lib/files/table.ts` `pickColumns()`·`dedupeRows()`, `sheetStore.ts` `MergeShape`(미리보기·저장 공통 `shaped()` — 열 고르기 → 같은 행 제거 순서), `ExcelMerge.tsx`, `globals.css` `.fm-cols`·`.fm-col-list`(버튼 28px), 사용 안내 3단계 추가.
- **메모리**: Worker 보관소가 읽은 뒤 쓰지 않던 원본 파일 바이트를 더 이상 보관하지 않음(파일 크기만큼 절약). 수십만 행 × 여러 파일 실측은 아직.
- **엑셀 서식(색·테두리) 유지는 보류**: 지금 쓰는 SheetJS 무료판(0.20.3)은 셀 서식을 저장하지 못한다. 하려면 ExcelJS 등으로 쓰기 부분을 바꿔야 하고(번들 증가·큰 파일 속도 재측정 필요) 서식 기준(첫 파일 머리글 서식을 따를지 등)도 정해야 해서 별도 과제로 남김.
- 검수: 단위 16/16(열 고르기·같은 행 제거·보관소 미리보기/저장 일치 추가), tsc, 빌드, 운영 엣지 시험 계정에서 CSV 2개(열 순서 다름)로 메모 열 제외·매출 순서 이동·같은 행 제거 → 6행→4행·5열 미리보기 확인. 실제 저장(다운로드)은 브라우저 다운로드 허용(E2) 전이라 단위 시험(`mergeWrite` CSV 3행·2열·1개 제거)으로 대신 확인.

## 3. 남은 일
1. 실제 휴대폰으로 화면·파일 선택 확인.
2. (완료 v1.02) 큰 파일 실측·Worker 이전. 남은 관찰: 수십만 행 × 여러 파일에서 브라우저 메모리(현재 원본 바이트와 표를 Worker에 함께 보관).
3. FREE 배지: 2026-10-15 주인님 결정 — 달지 않음(유료 유지).
4. 후보: ~~시트 안 중복 행 제거, 열 선택·순서 변경~~(v1.03 완료). 남은 후보: 엑셀 서식(색·테두리) 유지 — SheetJS 무료판 한계로 ExcelJS 전환 필요(2-2 참고), 큰 파일 메모리 실측.
