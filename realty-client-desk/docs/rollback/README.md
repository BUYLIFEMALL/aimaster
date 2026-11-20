# 고객관리 v1.11 호환판 — C-1 롤백용 (2026-11-20, 준비만·미배포)

- 근거: `docs/PLAN_20261120_C1_LISTING_HANDOFF.md` §6-2 (가) 호환판. 주인님 채팅 승인(2026-11-20 「진행하고 MASTER에게 보고해」).
- 목적: 「후보」 행이 생긴 뒤 고객관리를 v1.12에서 v1.11로 되돌려야 할 때, 옛 화면의 상태 선택이 「후보」를 「광고 중」으로 바꿔 저장하지 않게 한다.

## 무엇을 바꾸나(패치 `v1.11-candidate-compat.patch`, 4개 파일)

| 파일 | 변경 |
|---|---|
| `src/lib/desk/adRules.ts` | `LISTING_STATUSES`에 「후보」 추가 → 후보 줄의 상태 선택이 「후보」로 보이고, 그대로 저장해도 후보 유지 |
| `src/app/(dashboard)/listings/page.tsx` | 상태 표시 「후보 · 광고 전」 |
| `tests/compatCandidate.test.mjs`(새) | 후보 줄 선택값 = 「후보」, 기존 세 상태·첫 값 유지 |
| `package.json` | 시험 목록에 위 파일 추가 |

- 새 후보를 **만드는** 경로는 없다(후보 등록 화면·서버 액션은 v1.11에 없음). 발송·맞는 고객 수·대시보드 광고 수는 v1.11 그대로 「광고 중」만 다룬다.
- 기준 소스: v1.11 버전 커밋 `86955ace6`의 `realty-client-desk/` 트리.

## 검증(2026-11-20, 로컬·비용 0)

- `git archive 86955ace6 realty-client-desk`로 푼 깨끗한 사본에 `git apply -p0 --check` 통과 → 적용.
- 그 사본에서 `npx tsc --noEmit` 오류 0, `npm test` **42/42**(v1.11 기존 40 + 호환 2).
- **한계**: `npm run build`는 사본의 `node_modules`를 현재 폴더에 연결(junction)해서 돌려 「Could not find the Next.js package」로 실패 — 빌드 도구가 바깥 연결 폴더를 따라가지 않는 환경 문제로 코드 결함은 아님. 실제 빌드는 배포 때(또는 사본에 `npm ci` 후) 확인해야 한다.
- 실화면 미확인(배포 뒤 PLAN §6-3 R2: 후보 줄에서 상태 저장 → 후보 유지).

## 쓰는 법(롤백이 결정되고 빌드가 승인된 때만)

```bash
mkdir /tmp/desk-compat && cd /tmp/desk-compat
git -C D:/AIMaster archive 86955ace6 realty-client-desk | tar -x
git apply -p0 D:/AIMaster/realty-client-desk/docs/rollback/v1.11-candidate-compat.patch
cd realty-client-desk && npm ci && npx tsc --noEmit && npm test && npm run build
# 버전: 롤백 배포도 새 배포이므로 그때 src/lib/version.ts를 새 번호로(예: v1.13) + DB programs.version
# .vercel/project.json을 원래 폴더에서 복사한 뒤 vercel deploy --prod (빌드 1회, 주인님 승인)
```

- 순서는 PLAN §6-2를 따른다: 매물 알림 먼저 되돌림 → 호환판 배포(Ready·별칭 확인) → R2 실화면. 넓힌 DB 제약(4개 값)은 그대로 둔다.
