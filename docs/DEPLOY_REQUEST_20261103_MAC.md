# 배포 요청 — 2026-11-03 맥미니 → 윈도우 (7개 프로그램)

작성: Claude Code(맥미니) `claude-mac-20261101-blog` [역할: mac-mini]
요청: 주인님 채팅 지시 「윈도우에 배포 요청해」(2026-11-03) — **Vercel 빌드 7회(프로그램당 1회) 승인으로 봄.** 빌드 실패로 재배포가 필요하면 주인님께 다시 여쭐 것.
규칙: **한 번에 하나씩 순차 배포**(앞 배포 Ready 확인 뒤 다음), 팀 `buylife`에 빌드 중·대기 중 배포가 없는지 먼저 확인, `docs/ACTIVE_WORK.md`에 「연속 배포 중(7개)」.

## 묶음 1 — 수수료 공식 대조 (`0a9870e16`)
맥에서는 시험 실행 불가(윈도우용 `esbuild`만 설치) → **배포 전에 반드시 시험 먼저.**

| 순서 | 프로그램 | 현재 → 새 버전 | 시험 | 확장 |
|---|---|---|---|---|
| 1 | `shop-order-report` | v1.05 → v1.06 | `npm test` | 없음 |
| 2 | `trending-product-finder` | v1.30 → v1.31 | `npm run test:trend` | 있음 — manifest·ZIP(`prebuild`)·DB `extension_version` 함께 |

⚠ **상품소싱 주의**: `docs/PENDING_DEPLOYS.md`에 같은 프로그램의 미배포 작업 「쿠팡 리뷰 결과 회원별 사이트 저장」(`claude-win-sdp`, 표 2개 운영 DB 적용 완료, 계획상 쿠팡 실물 시험 뒤 v1.31로 배포)이 있다. 상품소싱을 배포하면 이것도 함께 나간다. **`claude-win-sdp` 세션(이커머스 담당)에 먼저 확인**하고, 함께 나가도 되면 진행, 안 되면 상품소싱은 건너뛰고 주인님께 알릴 것(이 경우 빌드 6회).

배포 뒤 확인: `/fees`에서 쿠팡·11번가 「✅ 공식 표 확인 · 2026-11-03」, 11번가 카테고리 표(21줄)와 「7~15%」, 마진 계산기 쿠팡 선택 시 대표 10.9%. 주문 리포트 설정 화면 쿠팡·11번가 ✅.

## 묶음 2 — 블로그 작은 수정 5건

| 순서 | 프로그램 | 현재 → 새 버전 | 대기 내용 | 확장 |
|---|---|---|---|---|
| 3 | `naver-blog-agent` | v2.25 → v2.26 | 좌측 메뉴 제목 옆 「FREE」 삭제 `2a37dabc4` | 있음 |
| 4 | `ai-auto-blog` | v1.85 → v1.86 | 30일 정리 예외 회원 제외 `204080c43` | 있음 |
| 5 | `tistory-auto-blog` | v1.94 → v1.95 | 30일 정리 예외 회원 제외 `204080c43` | 있음 |
| 6 | `blog-keyword` | v1.10 → v1.11 | 사용법 배지 「PRO v1.09」 → 실제 버전 `c0af2aed9` | 없음 |
| 7 | `naver-blog-allinone` | v1.58 → v1.59 | 쓰이지 않던 권한 함수 보완 `21022a363` | 있음 |

## 프로그램마다 할 일
1. `lib/version.ts`(또는 `src/lib/version.ts`) 버전 +0.01.
2. 확장이 있으면 `extension/manifest.json` `version`/`version_name`이 새 버전인지 확인(자동으로 안 맞는 프로그램은 손으로) → ZIP 재생성.
3. 시험·`npx tsc --noEmit`·`npm run build`(로컬).
4. `vercel deploy --prod --yes` → Ready 확인(시간 초과로 보이면 `vercel inspect`).
5. DB(ref `esgxyikcnnvmlhygjkth`): `update programs set version='<새 버전>'[, extension_version='<새 버전>'], updated_at=now() where slug='<slug>';`
6. 확장 있으면 루트에서 `node scripts/check-extension-release.mjs <slug>` → `OK`.
7. `docs/PENDING_DEPLOYS.md` 해당 줄을 배포 기록으로 옮김, 프로그램 `AGENTS.md`에 버전 기록.

## 끝나면
맥미니에 「7개 배포 완료(버전 목록)」를 알려 주면 맥미니가 운영 화면(`/fees`, 블로그 좌측 메뉴·사용법 배지)을 확인하고 요청함 항목을 닫는다. 회원 안내: 확장 프로그램 4개는 ZIP 다시 받기 → 덮어쓰기 → 새로고침.

## 추가 (2026-11-03 오후) — 12월 모델 교체가 같이 실림
`ai-auto-blog`(`142cb45ec`)·`tistory-auto-blog`(`7eb961fbd`)·`blog-keyword`(`fb1d16075`)에 종료 모델 교체 커밋이 더 들어갔다(`gpt-5`·`gemini-2.5` 삭제 + 옛 저장값 → 대체 모델). 별도 빌드 없이 이 배포에 함께 나간다. 배포 뒤 `docs/PENDING_DEPLOYS.md`의 「12월 모델 교체」 두 줄에서 이 세 프로그램을 지운다. 상세: `docs/PLAN_20261103_MODEL_MIGRATION_DEC.md`.
