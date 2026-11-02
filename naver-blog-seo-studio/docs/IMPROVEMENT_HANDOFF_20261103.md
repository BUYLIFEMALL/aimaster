# naver-blog-seo-studio — 2026-11-03 v2.25 배포 요청 (맥미니 → 윈도우)

작성: Claude Code(맥미니) `claude-mac-20261101-blog` [역할: mac-mini] · 2026-11-03
요청: 주인님 채팅 지시 「윈도우에 배포 요청해」(2026-11-03) — **Vercel 빌드 1회 승인으로 봄**. 범위를 넘으면(빌드 실패로 재배포 등) 주인님께 다시 여쭐 것.

## 이번 배포에 들어가는 커밋 (미배포, `docs/PENDING_DEPLOYS.md` SEO 줄)

| 구분 | 내용 | 커밋 |
|---|---|---|
| 확장 | 원고를 빨리 바꿔 고르면 앞 원고 불러오기 결과(대표·본문 이미지·미리보기·안내·늦은 실패)가 지금 원고를 덮어쓰던 문제 — 불러오기 순번으로 늦은 결과 버림, 입력 막기는 마지막 불러오기가 끝날 때만 해제 | `176004fa9` |

맥미니 검사: `node --test tests/*.test.mjs` 158 통과(새 시험 2개는 고치기 전 코드에서 실패 확인), `node --check extension/sidepanel.js` 통과. ego 실물 확인 완료(1장→6장, 6장→1장 원고로 빨리 바꿔도 마지막 원고의 장수·미리보기 유지).

웹 코드는 바뀌지 않았다(확장 수정만). 그래도 확장 ZIP을 사이트에서 내려주므로 버전·ZIP·DB를 함께 맞추는 배포가 필요하다.

## 윈도우 CLI 다음 첫 단계 (순서대로)

1. `git pull`로 `176004fa9`가 있는지 확인. 팀 `buylife`에 빌드 중·대기 중 배포가 없는지 확인, `docs/ACTIVE_WORK.md`에 내 줄 추가.
2. `lib/version.ts` `APP_VERSION`을 `v2.25`로.
3. **`extension/manifest.json`을 손으로 `"version": "2.25.0"`, `"version_name": "v2.25"`로 고친 뒤** `cd naver-blog-seo-studio && npm run extension:archive` (v2.24 때 확인: 빌드 스크립트가 manifest를 맞추지 않음).
4. `node --test tests/*.test.mjs` · `npx tsc --noEmit` · `npm run build` (로컬, 무료).
5. `vercel deploy --prod --yes` → Ready 확인.
6. DB(ref `esgxyikcnnvmlhygjkth`): `update programs set version='v2.25', extension_version='v2.25', updated_at=now() where slug='naver-blog-seo-studio';` (다운로드 주소는 기존 `-latest.zip` 그대로).
7. 루트에서 `node scripts/check-extension-release.mjs naver-blog-seo-studio` → `OK`.
8. 문서: `docs/PENDING_DEPLOYS.md` SEO 줄을 배포 기록으로, `AGENTS.md` 맨 위 v2.25 항목, `docs/BLOG_FEATURE_MATRIX.md` SEO 버전.
9. 맥미니에 알림: 확장 실물은 이미 확인했으므로 배포 뒤 맥미니는 ego에서 버전 v2.25만 확인한다.

## 회원 안내
확장 수정이므로 회원은 ZIP 다시 받기 → 기존 폴더에 덮어쓰기 → 확장 관리 화면에서 새로고침. 사이드패널 새 버전 알림이 v2.25를 안내한다.
