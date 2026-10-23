# 플랜 2026-10-23 — v1.29 회원 입장 점검 급한 것 (Claude Code 맥미니, 주인님 승인 「진행해」)
근거: `docs/IMPROVEMENTS.md` 2026-10-23 회원 입장 점검 S-23-01·02·03·06·07.

| 번호 | 바꾼 곳 | 내용 |
|---|---|---|
| S-23-01 | `components/products/SectionImageGrid.tsx`, 새 `lib/generatePlan.ts` | 큰 버튼 = 「남은 섹션 N개 생성(약 $x)」(아직 이미지 없는 섹션만, 만든 섹션·직접 올린 사진·GIF 건너뜀), 다 끝나면 「모든 섹션 완료」로 꺼짐. 「전체 다시 생성」은 두 번 눌러야 시작(첫 누름 확인 문구, 5초 뒤 원래대로, 브라우저 확인 창 없음). 비용 안내에 남은 장수 금액 |
| S-23-02 | 같은 곳 | 모든 섹션이 끝났을 때만 `completed`, 실패·중단이면 `analyzed`(`statusAfterGenerate`) |
| S-23-03 | `app/(dashboard)/products/page.tsx` | 머리 → 상품 목록 → 소개·실전 매뉴얼(`<details>`, 상품 0개일 때만 펼침) |
| S-23-06 | `components/guide/CommerceUsageGuide.tsx` | 별표 2곳 → 굵은 글씨, 11 → 12개 항목, 버튼 이름 「Gemini AI로 상품 소구점 분석하기」 |
| S-23-07 | `components/products/ProductAnalyzeForm.tsx` | 모델 선택 아래 금액표(고른 규격 장수 기준), 분석 버튼 아래 「분석 1회 소액」 |

검수: 순수 함수 시험 7가지(스크래치), tsc 0, eslint 0. 배포 뒤 맥미니 크롬(AI 버튼은 누르지 않음): 텀블러 「남은 섹션 10개 생성(약 $1.01)」, 전체 다시 생성 첫 누름 → 확인 문구 → 5초 뒤 원래대로(두 번째 누름 안 함), 목록 맨 위·매뉴얼 접힘, 문구, 새 상품 비용 안내, 500px. 실패 시 상태는 생성을 해야 재현돼 함수 시험·코드 확인만.
비용: Vercel 빌드 1회, AI 0회.
