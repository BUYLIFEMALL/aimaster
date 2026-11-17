# FRONT-20261117-04 준비 — 어두운 테마 평면 단추 마우스 올림 한계 대조 (CC-B2B-FRONT-01, 분석만·코드 0)

- 지시: msg_b4b6f538712e. 코드·빌드·배포 0. 최근 주인님 직접 지시 없음, 내 경로 미커밋 0, 다른 수정 점유 없음.
- FRONT03 `5b02c3399`(QA022 PASS) 미배포 유지. 이 문서는 구현 배정 전 범위 제시용.

## 실제 사용처(어둡게에서 올림 바탕 변화 없음)
| 위치 | 요소 | 클래스 | 다른 동작 표시 |
|---|---|---|---|
| `(shop)/layout.tsx:146·187` | 가입 / 이 몰 가입하기 `<Link>` | `bg-blue-600 … text-white hover:bg-blue-700 transition-colors` | 링크 손가락 포인터만 |
| `(shop)/r/[code]/page.tsx:165·214` | 추천 링크 2곳 `<Link>` | `bg-blue-600 … text-white hover:bg-blue-700` | 포인터만 |
| `(shop)/shop-frame.tsx:55`(링크 49) | 로고 첫 글자 상자(로고 그림 없을 때) | `bg-blue-600 … text-white group-hover:bg-blue-700` | 포인터만, 상점 이름 글자 변화 없음 |
| `(shop)/design-edit-overlay.tsx:171` | 운영사 전용 편집 단추 | `bg-blue-700 … text-white hover:bg-blue-800` | 포인터만(운영사만 보임) |
- 분류: 모두 `<a>` 링크라 손가락 포인터로 누를 수 있음은 드러남. 색 대비·키보드 초점은 문제 없음 → **접근성 버그 아님, 밝게와의 피드백 일관성 개선(P3)**. 과장 분류 0.

## 왜 지금 변화가 없나(현재 층)
- `[data-mall-mode="dark"] :is(.bg-blue-600, .bg-blue-700).text-white`(층 밖, 0,3,0, acb858a77·f7120d185)가 Tailwind utilities 층의 `hover:`/`group-hover:`를 항상 이김.
- 이 규칙을 빼면 안 됨: 어둡게 `--color-blue-700/800`은 옅게 뒤집힌 단계라 Tailwind 원래 올림 색 흰 대비 1.58~2.46(12색 전부 미달).

## 최소 수정안(구현 배정 시)
`globals.css` acb 규칙 바로 아래, 층 밖 1규칙:
```css
@media (hover: hover) {
  [data-mall-mode="dark"] :is(.hover\:bg-blue-700:hover, .group:hover .group-hover\:bg-blue-700, .hover\:bg-blue-800:hover):is(.bg-blue-600, .bg-blue-700).text-white { background-color: var(--mall-primary-btn-hover, var(--mall-primary-700)); }
}
```
- 특이성 0,6,0(:is 최대 0,3,0) > acb 0,3,0, 층 밖이라 Tailwind 올림보다 앞섬. 새 변수 0(3색은 FRONT03 `--mall-primary-btn-hover`, 9색은 뒤집지 않는 `--mall-primary-700`).
- 불변: 밝게 전체(어둡게 표식 밖), 평상시 바탕 12색, 입체 단추(`bg-blue-*` 클래스 없음 — 자체 `:hover` 그대로), 관리자 화면(어둡게 표식 없음; 디자인 편집기 어둡게 미리보기는 상점과 같게 적용), 올림 클래스 없는 단추(주문·배지).

## 어둡게 12색 수치(흰 글자, 평상시 → 올림 후보)
| 색 | 평상시 | 올림 | ΔY |
|---|---|---|---|
| 기본 파랑 | 5.17 | 6.67 | 0.046 |
| 네이비 | 10.36 | 11.71 | 0.012 |
| 에메랄드 | 4.52 | 5.80 | 0.051 |
| 포레스트 | 7.13 | 8.53 | 0.024 |
| 레드 | 4.83 | 6.24 | 0.049 |
| 코랄 | 4.52 | 5.79 | 0.051 |
| 오렌지 | 4.51 | 5.72 | 0.049 |
| 머스터드 | 5.02 | 6.46 | 0.047 |
| 퍼플 | 5.70 | 7.34 | 0.041 |
| 핑크 | 4.60 | 6.01 | 0.054 |
| 차콜 | 10.35 | 11.63 | 0.011 |
| 브라운 | 7.30 | 8.82 | 0.025 |
- 12색 모두 올림 색이 더 진하고 대비 상승(최저 5.72). 네이비·차콜은 ΔY 0.011~0.012로 작음 — 밝게 Tailwind 600→700과 같은 간격(어두운 색일수록 휘도 차가 작음), 일관성 유지 범위로 판단.
- 계산: OKLCH → 선형 sRGB → Y → 1.05/(Y+0.05), theme.ts `themeStyle(mode: dark)` 실제 변수값 기준.

## 시험 범위(구현 시)
- `tests/dark-header.test.mjs`: 위 규칙 1개가 `@media (hover: hover)` 안·어둡게 표식으로 시작·값 `var(--mall-primary-btn-hover, var(--mall-primary-700))`; 어둡게 밖 `bg-blue` 덮어쓰기 0 기존 시험 유지.
- `tests/theme.test.mjs`(또는 dark-header): 12색 어둡게 올림 대비 ≥ 평상시·≥ 4.5.
- 실제 확인: `~/ego/front14` 컴파일+CDP :hover 하네스에 어둡게 3색·9색 표본·밝게·관리자 줄 추가 → 어둡게 올림만 바뀌고 나머지 전후 동일.
- 변경 파일 예정: `mall-builder/src/app/globals.css`(+3~4줄), `mall-builder/tests/dark-header.test.mjs`. theme.ts 변경 없음.

## 구현 결과 (msg_9b6678fabf2b — P3 피드백 일관성) — 코드 완료·미배포: QA031 PASS, Master 마감 msg_91e9c98c1252, 최종 후보 `7609748ad`(재동결 예정)
- 커밋 `7609748ad`(2 files +40 −2). 점유 `0f0d2d75c` → 해제 이 결과와 함께. 저작권 고지 점검 0건. theme.ts·빌드·배포·새 패키지 0.
- Lab 대기 출처 `5b02c3399`의 **후속** 변경 — Master 재동결 대기(그 전에는 Lab 묶음 출처 아님).
- SHA(작업폴더 = HEAD): globals.css `60043b90740c` · tests/dark-header.test.mjs `53838e96c792`.
- 변경: acb 어둡게 기본 규칙(제거 안 함) 바로 아래 `@media (hover: hover)` 1규칙 — 위 준비안 그대로.
- 시험 기대값: 「어둡게 밖 bg-blue 규칙 0」 2곳을 `l.trim()` 기준으로(새 규칙이 @media 안 들여쓰기라서, 범위 의미 같음). 새 시험 2개(규칙 위치·@media 안·한 번만 / 12색 올림 ≥ 평상시·≥ 4.5·원래 뒤집힌 올림 색 미달 확인).
- 시험: dark-header+theme+timesale-dark 24/24, 템플릿 5개 31/31. 수정 전 CSS로 fail 1 → 후 통과.

### 실제 확인(현재 하네스 `~/ego/front14`: 실제 Tailwind v4 컴파일 → ego 브라우저, CDP :hover 강제)
- 어둡게 12색 가입·추천·로고·편집 오버레이: 수정 전 전부 변화 없음 → 수정 후 전부 진해짐(흰 대비 평상시 → 올림): 기본 파랑 5.17→6.67, 네이비 10.36→11.75, 에메랄드 4.52→5.80, 포레스트 7.13→8.52, 레드 4.83→6.26, 코랄 4.52→5.79, 오렌지 4.51→5.72, 머스터드 5.02→6.46, 퍼플 5.70→7.35, 핑크 4.60→5.99, 차콜 10.35→11.67, 브라운 7.31→8.85(ΔY 0.011~0.053).
- 밝게(코랄·파랑·네이비)·관리자 모양·입체 단추·주문 단추(올림 클래스 없음): 수정 전후 측정값 완전히 같음(diff 0줄).
- 터치 흉내(CDP 터치 + `hover: none`, `matchMedia("(hover: hover)")` false 확인): 어둡게·밝게·관리자 올림 강제해도 바탕 변화 0.
- 미검수: 실제 Tab 초점·키보드 눌림(:active·ring은 규칙 대상 아님, 불변), 실기기 터치, 운영 상점 화면 — Lab Ready 뒤 Mac.
