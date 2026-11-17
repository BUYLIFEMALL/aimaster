# FRONT-20261117-01 결과 — Claude(B2BFront) · 코드 완료·11-17 Lab 반영(`7609748ad`, `dpl_CFgB5fC5NLdrye4K7esG1tWRktXQ`)·운영 몰 미배포, 이전 표기: ready_review

- 배정: Master msg_79d086d3d20d(MOV-10 P3 — 갤러리 색 단추 396개 Tab, 거르기 aria-pressed 없음). 저장·게시·DB·설치·빌드·배포 없음, 전체 450 반복 안 함. Backend 배포 분리 소스 `1aea…` 미포함, version·다른 CSS 파일 변경 없음. 공통지침 v1.4 소규모 미배포 묶음.

## 수정 — `admin/design/templates/template-gallery.tsx` 한 파일
- **색 고르기(role=radiogroup 유지)**: 카드마다 보이는 고른 색 1개만 `tabIndex=0`, 나머지 `-1`(단순 -1 일괄 아님 — 로빙 방식). 묶음 `onKeyDown`에서 ←→↑↓ 돌아가며 고르기, Home/End 처음·끝, 고른 단추로 초점 이동. `aria-checked`·클릭 고르기·`색: ○○` 표시·미리보기 주소(`&color=`) 그대로. 고른 색 기준을 실제로 보이는 색(`color.id`)으로 맞춰, 기본색이 목록에 없을 때도 Tab 진입이 사라지지 않게 함.
- 키 계산은 파일 안 작은 함수 `radioKeyIndex`(저장소에 공용 화살표 장치 없음 — 검색 확인).
- **업종 거르기**: `role="radio"`/`aria-checked` → 토글 단추 `aria-pressed`, 묶음은 `role="group"`·이름 「업종으로 거르기」. 단추 목록은 거르기와 상관없이 그대로라 거른 뒤 초점이 누른 단추에 남음.
- `tests/gallery-keyboard.test.mjs`(신규 4개): 로빙 tabIndex·aria-checked, 화살표·Home/End 계산(돌아가기 포함)과 preventDefault·초점 이동 연결, 클릭·미리보기 주소 보존, 거르기 aria-pressed·라디오 없음.

## 검증
- `tsc` 0, 새 시험 4/4.
- ego Lab 3210 실제 키(`/s/aimaster-b2b/admin/design/templates`, 저장·게시 없음, 공간 닫음):

| 항목 | 전(MOV-10) | 후 |
|---|---|---|
| 화면의 Tab 가능 요소 | 439 | **76** |
| Tab 가능한 색 단추 | 396 | **33**(카드 33 × 1) |
| 전체 보기에서 144 미리보기 링크까지 실제 Tab | 439번 | **76번** |

- 139 카드 색 묶음 실제 키: 코랄 → → 오렌지 → ↓ 머스터드 → ← 오렌지 → End 브라운 → → 기본 파랑(돌아감) → Home 기본 파랑 → ↑ 브라운(돌아감). 매번 `aria-checked`·초점·Tab 진입 단추·`색:` 글자·미리보기 주소 color가 같은 색으로 맞음. 마우스 클릭 「네이비」도 같음.
- 거르기: 「키즈」에 초점 → Enter → `aria-pressed=true` 키즈 하나, 초점 키즈에 유지, 카드 10개. Tab 2번이면 첫 카드 색 → 미리보기 링크.
- 캡처 `C:/Users/Administrator/ego/front13/gallery-after.png`.

## 미검수
- 화면 낭독기 실제 낭독, 휴대폰 폭 터치 크기(26px·24px 그대로 — 별도 후보), 다른 브라우저.
- 비용 없음.

## 후속(Master msg_ef19128ff3a8, MOV17-05 정적 P3) — 기본색이 목록에 없을 때 표시 어긋남 보완
- 원인: 선택 표시·Tab 진입은 보이는 색 `color.id` 기준인데, 테두리(`border-gray-900`)와 미리보기 주소 `&color=`는 고른 값 `colorId` 기준 → 기본색이 색 목록에 없으면(`colors[0]`로 대체) 테두리 없음·주소는 없는 색.
- 수정: `template-gallery.tsx` 테두리 판정과 주소를 `color.id`로(2곳) + 설명 주석 1줄. 다른 레이아웃·CSS·API 변경 없음. `colorId`는 고른 값 읽기와 색 찾기 두 곳에만 남음(시험 고정).
- 시험 `tests/gallery-keyboard.test.mjs` 3번째 항목에 테두리 기준·`colorId` 사용처 2곳·주소 `color.id` 검사 추가 → 4/4. `tsc` 0.
- 하네스(저장소 밖 `C:/Users/Administrator/ego/front13/fallback-harness.mjs` — 실제 파일을 typescript로 변환해 happy-dom·react-dom에 그림, 1회용):

| 사례 | 선택 표시 | Tab 진입 | 테두리 | 「색:」 글자 | 주소 color | 초점 |
|---|---|---|---|---|---|---|
| 기본색 `lavender`(목록에 없음) 처음 | 기본 파랑 | 기본 파랑 | 기본 파랑 | 기본 파랑 | blue | — |
| 같은 카드 초점 후 → | 네이비 | 네이비 | 네이비 | 네이비 | navy | 네이비 |
| 정상(기본 네이비) 처음 | 네이비 | 네이비 | 네이비 | 네이비 | navy | — |
| 정상 카드 「레드」 클릭 | 레드 | 레드 | 레드 | 레드 | red | (happy-dom 클릭은 초점을 옮기지 않음 — 실제 브라우저 클릭 초점은 앞 ego 확인에서 정상) |

- 빌드·배포·저장·게시 없음, 다음 묶음. v1.16 없음. 비용 없음.
