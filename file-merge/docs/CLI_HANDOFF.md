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

## 3. 남은 일
1. 실제 휴대폰으로 화면·파일 선택 확인.
2. 아주 큰 파일(수십 MB)에서 처리 시간·메모리 실측(현재 메인 스레드 처리 — 느리면 Web Worker로 옮기기 검토).
3. FREE 배지 여부는 주인님 결정(운영 비용 없음) — 관리자 프로그램 편집 화면에서 배지만 켜면 된다.
4. 후보: 엑셀 서식(색·테두리) 유지, 시트 안 중복 행 제거, 열 선택·순서 변경.
