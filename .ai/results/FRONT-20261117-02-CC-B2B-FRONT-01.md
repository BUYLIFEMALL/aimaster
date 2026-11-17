# FRONT-20261117-02 결과 — 어두운 테마 파란 단추 대비 1규칙 (CC-B2B-FRONT-01, ready_review)

- 배정: msg_6e855d675ba4 (주인님 작업요청 취합 → Master 승인). 범위: 후보 1만. 후보 2~6·프리셋·코랄 색 변경 0.
- 커밋: `acb858a77` (2 files, +33). 점유 등록 `8feb7d614`, 해제는 이 결과 커밋과 함께.
- 빌드·전체 시험·전체 타입·실DOM·서버·DB 0 (지시대로).

## 정확 diff
`mall-builder/src/app/globals.css` — 기존 `bg-slate-*.text-white` 규칙 바로 아래 주석 1줄 + 규칙 1줄:
```css
[data-mall-mode="dark"] :is(.bg-blue-600, .bg-blue-700).text-white { background-color: var(--mall-primary-600); }
```
`mall-builder/tests/dark-header.test.mjs` — 시험 2개 추가(+31).

## SHA (작업폴더 = HEAD blob)
- globals.css `78485684814d`
- tests/dark-header.test.mjs `45e3e1e63342`

## 전후 값·계산식
- 원인: `theme.ts:148` 어둡게면 `--color-blue-{step}` = 팔레트 거꾸로 단계 → 600 자리에 400 단계. 단추 색 `--mall-primary-600` = `buildPalette(primary)[600]` = 고른 포인트색 그대로(뒤집지 않음).
- 계산: oklch → OKLab → 선형 sRGB(0~1 자름) → 상대휘도 Y = 0.2126R + 0.7152G + 0.0722B → 흰 글자 대비 = 1.05 / (Y + 0.05).

| 색 | 포인트색 | 전(어둡게) | 후 | 밝게(같은 값) | 4.5 |
|---|---|---|---|---|---|
| 기본 파랑 | #2563eb | 2.63 | 5.17 | 5.17 | 통과 |
| 네이비 | #1e3a8a | 4.05 | 10.36 | 10.36 | 통과 |
| 에메랄드 | #059669 | 2.22 | 3.77 | 3.77 | 미달 |
| 포레스트 | #166534 | 3.24 | 7.13 | 7.13 | 통과 |
| 레드 | #dc2626 | 2.56 | 4.83 | 4.83 | 통과 |
| 코랄 | #e5534b | 2.19 | 3.70 | 3.70 | 미달 |
| 오렌지 | #ea580c | 2.14 | 3.56 | 3.56 | 미달 |
| 머스터드 | #b45309 | 2.62 | 5.02 | 5.02 | 통과 |
| 퍼플 | #7c3aed | 2.78 | 5.70 | 5.70 | 통과 |
| 핑크 | #db2777 | 2.50 | 4.60 | 4.60 | 통과 |
| 차콜 | #334155 | 4.09 | 10.35 | 10.35 | 통과 |
| 브라운 | #7c4a2d | 3.28 | 7.30 | 7.31 | 통과 |

- 12색 모두 개선, 악화 0. 바탕은 고른 포인트색 그대로라 브랜드색 오류 없음(같은 계열, 밝은 테마 단추와 같음).
- 「모두 4.5 통과」는 아님: 에메랄드·코랄·오렌지 3색은 후에도 3.56~3.77(밝은 테마 단추와 같은 기존 미달, 이 작업으로 생긴 것 아님 — 프리셋 변경은 범위 밖).

## 선택자 누락·특이성
- 적용: shop-frame 「A」, (shop)/layout 가입 단추·숫자 배지, quick-bar·order-form·quick-form·r/[code]·home-slots의 `bg-blue-600|700 + text-white`.
- 밖(불변): 밝은 테마·관리자 화면(`data-mall-mode="dark"` 바깥), `selection:bg-blue-600`(::selection, 클래스 다름), 흰 글자 없는 `bg-blue-600` 장식 막대.
- 특이성: 0,3,0이고 층(@layer) 밖 규칙이라 Tailwind 유틸리티(층 안)보다 항상 이김. 그래서 어둡게에서 `hover:bg-blue-700`·`group-hover:bg-blue-700`·`hover:bg-blue-800`의 마우스 올림 색 변화가 사라짐(바탕 고정). 전에는 올림 색도 옅게 뒤집혀(300 단계) 더 안 보였으므로 악화는 아니나 올림 피드백이 없어짐 — 필요하면 후속 1줄(`:hover`에 `--mall-primary-700`).
- `bg-blue-700 + text-white` 1곳(`hover:bg-blue-800`)은 어둡게에서 600 단추 색이 됨(밝게보다 한 단계 밝음, 대비는 위 표 값 이상).
- 범위 밖 미확인: `bg-blue-500` 등 다른 단계 + 흰 글자.

## 경량 시험
- `node --test tests/dark-header.test.mjs tests/theme.test.mjs tests/timesale-dark.test.mjs` → 19/19 통과.
- 지우기 확인: 규칙 줄을 빼면 dark-header fail 1, 되돌리면 통과(작업폴더 복원 cmp 일치).

## 남은 것
- 실화면 검수(Lab Ready 뒤 Mac QA): 어둡게 템플릿(143 등) 머리글 「A」·가입 단추와 마우스 올림.
- 후보 2~6 미착수.
