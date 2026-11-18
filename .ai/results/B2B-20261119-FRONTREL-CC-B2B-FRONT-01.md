# B2B-20261119-FRONTREL — 독립 수락 UI 2건 배포 준비 대조 (CC-B2B-FRONT-01, 읽기·임시 사본만)

- 지시 msg_9084bc8e87cb. 파일 수정·빌드·배포·푸시·공용 Lab 변경 0. 대조는 저장소 밖 임시 사본(`scratchpad/frontrel`, `git show 1aea8ec0f:<경로>` + `git apply --check`/임시 저장소 적용)에서만.

## 1. 실제 운영 기준 SHA 증명
- 운영 = **v1.16, 소스 `1aea8ec0f`의 `mall-builder/` + `src/lib/version.ts` v1.16만**. 근거: `.ai/results/B2B-20261117-v116-release-CC-B2B-BACK-01.md`(빌드 1회 `mall-builder-58mmx0v2e` Ready 11-17 01:22:35, 별칭 mall-builder.buylife.xyz·aimaster-b2b.buylife.xyz, 운영 DB 0100), 저장소 커밋 `5c229f968`(version.ts v1.16, 메시지에 split source 1aea8ec0f 명시). 그 뒤 mall-builder 운영 배포 기록 없음(`version.ts` 마지막 변경 = 5c229f968; 「v1.17」 기록은 crm-google-form 것).
- 따라서 운영에는 Lab `7609748ad` 묶음(템플릿 4차·갤러리 키보드·대비 수정들)도 **없음**.

## 2. 두 변경만 적용 가능한가
| 커밋 | 운영 기준에 단독 적용 | 이유 |
|---|---|---|
| `86e5ad1bf` 원래 가격 | **소스 2파일 가능** | `product-card.tsx:78`·`p/[id]/product-detail.tsx:196` className 한 단어(`text-slate-400`→`text-slate-600`), 두 파일 운영 기준 이후 다른 변경 0. 시험 파일 `tests/dark-header.test.mjs`는 운영 기준에 없음(FRONT-10 `59e7e7843`에서 생김) → 시험 부분은 단독 적용 불가(빌드에는 불필요) |
| `90248e5b1` 갤러리 색 단추 | **불가** | 운영 기준 이후 같은 파일에 `13049d0bd`·`7c8ee3a81`·`e4ba29947`. 최소 의존 = **`7c8ee3a81` → `e4ba29947` → `90248e5b1`**(갤러리 파일만, `13049d0bd` 불필요) 순서면 적용됨. `7c8ee3a81`만+`90248e5b1`은 실패(150행). 시험 `gallery-keyboard.test.mjs`도 `7c8ee3a81`에서 생김 |
- 즉 「두 변경만」은 **원래 가격 1건만 그대로 가능**. 갤러리는 FRONT-17-01 두 커밋(Mac 독립 수락·Lab 포함, 이번 승인 목록에는 없음)을 함께 넣거나, 이번 묶음에서 빼야 함 → Master 결정.

## 3. 승인 파일·의존성·diff
- 안 A(원래 가격만): `mall-builder/src/app/s/[store]/(shop)/product-card.tsx`, `.../p/[id]/product-detail.tsx`. diff:
  - `product-card.tsx`: `flex items-center gap-1.5 text-xs text-slate-400 line-through mt-0.5` → `…text-slate-600…`
  - `product-detail.tsx`: `mt-1.5 flex items-center gap-2 text-sm text-slate-400 line-through` → `…text-slate-600…`
  - 의존: 없음(Tailwind 기본 클래스, 새 import·DB 0).
- 안 B(+갤러리): 위 + `mall-builder/src/app/s/[store]/admin/design/templates/template-gallery.tsx`를 `7c8ee3a81`·`e4ba29947`·`90248e5b1` 순서로(운영 기준 대비 누적 +39 −8, 이 1파일만; 새 import·DB 0. 내용: 색 radio roving tabindex·화살표/Home/End, 업종 거르기 aria-pressed, 테두리·주소 color.id 기준, 44px 누름 영역).
- 공통 제외: S70·미승인 로컬 변경·운영 SQL·`77c50f27c`(탭 올림)·Lab 묶음 나머지.

## 4. 검증 화면
- 안 A: 운영 상점 상품 목록 `/s/aimaster-b2b`(정가·회원가 있는 카드의 줄 그은 가격), 상품 상세 `/s/aimaster-b2b/p/<할인 상품 id>` — 밝게/어두운 템플릿 각 1. 기대 대비 밝게 7.58(흰 카드)·6.95~7.31(몰 바탕), 어둡게 6.57~7.51(Lab 실측 근거 `86e5ad1bf` 결과).
- 안 B 추가: 관리자 `/s/aimaster-b2b/admin/design/templates`(운영사 로그인 필요 — 사람 몫) 색 단추 44px·화살표 고르기·「내 상품으로 미리보기」 주소 color.
- 저장·게시 누르지 않음.

## 5. 복구 기준
- 직전 운영 배포 `mall-builder-58mmx0v2e`(소스 `1aea8ec0f`+v1.16)로 Vercel 이전 배포 되돌리기(즉시 별칭 전환, 새 빌드 0). DB 변경 0이라 DB 복구 불필요. 버전을 올렸다면 `programs.version`만 원래 값으로.

## 6. 범위 충돌·순번
- Backend 미배포 다음 묶음(0101 메시지 `5e750cdcf`·`0d3c7eb7b`, 전체 폭 수정 — v1.16 결과 문서)과 파일 겹침 확인 필요: 안 A 2파일·안 B 1파일은 그 묶음 커밋이 건드리지 않는지 Master/Backend 대조 요망(이 문서는 Front 커밋 기준만 확인).
- `.ai/RESOURCE_QUEUE.md`: B2B 운영 빌드 DEC-002 「여전히 승인 대기」 — 순번·담당은 Master.

## 한계
- 운영 기준 전체 트리로 tsc·빌드는 하지 않음(지시상 빌드 0). 안 A는 className 문자열 1단어라 타입 영향 없음, 안 B는 HEAD에서 tsc 오류 0·시험 통과(작성자 자체)였으나 운영 기준 트리 위 재확인은 배포 담당 몫.
