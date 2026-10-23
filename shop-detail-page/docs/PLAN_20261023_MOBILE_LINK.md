# 개발 플랜 — 휴대폰·연계 묶음 (v1.30, 2026-10-23)

주인님 승인: 「진행해」(③ 묶음 플랜). 회원 입장 점검(`docs/IMPROVEMENTS.md` S-23-04·05·08·09) + GIF G-23-06.

| 순서 | 번호 | 문제 | 고칠 것 | 파일 |
|---|---|---|---|---|
| 1 | S-23-04 | 휴대폰에서 하단 고정 내보내기 버튼 2개가 두 줄로 화면 높이 24%를 가림 | 휴대폰 폭은 한 줄 작은 버튼(「📥 롱 이미지 병합 받기」·「📦 섹션별 ZIP」), 넓은 화면은 기존 문구 | `components/products/SectionImageGrid.tsx` |
| 2 | S-23-05 | 문구 고치기 창 위로 하단 「섹션별 ZIP」이 뜸 | 편집 창을 `createPortal`로 `document.body`에 | `components/products/ImageTextEditor.tsx` |
| 3 | S-23-08 | 새 상품 화면에서 저장에 무엇이 필요한지 모름(대표이미지 「필수」는 있었지만 저장 버튼이 꺼진 이유가 안 보이고 상품명이 비어도 저장됨) | 상품명 칸 `*`, 저장 때 상품명·관리용 상품명이 모두 비면 안내, 대표이미지가 없을 때 버튼 아래 「저장하려면 대표이미지와 상품명이 필요」 | `components/products/ProductAnalyzeForm.tsx` |
| 4 | S-23-09 | 상세페이지 쪽에서 GIF 자동화로 가는 길이 없음 | 사이드바 「🎞 영상→GIF 만들기 ↗」(새 탭), 섹션 목록 아래 안내 한 줄 + 링크 | `components/layout/Sidebar.tsx`, `SectionImageGrid.tsx` |
| (GIF) | G-23-06 | 미리보기 창이 Esc로 안 닫힘 | Esc 닫기 — **미배포 대기**(주인님 선택: 모아 두기) | `video-to-gif/components/ConverterWorkspace.tsx` |

- 검수: tsc·eslint(무료), 배포 뒤 맥미니 크롬(AI 생성 버튼은 누르지 않음): 500px 하단 버튼 높이, 편집 창이 버튼 위(저장하지 않음), 새 상품 화면 안내, 링크 2곳.
- 비용: Vercel 빌드 1회(상세페이지), GIF 0회, AI 0회.
- 버전: v1.29 → v1.30(`lib/version.ts`, SQL `supabase/migrations/20261023_mobile_link_v1_30.sql` — 버전만).
