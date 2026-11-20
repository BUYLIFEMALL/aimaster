# 고객관리 v1.11 호환판 — C-1 롤백용 (2026-11-20, 준비만·미배포)

- 근거: `docs/PLAN_20261120_C1_LISTING_HANDOFF.md` §6-2 (가) 호환판. 주인님 채팅 승인(2026-11-20 「진행하고 MASTER에게 보고해」).
- 목적: 「후보」 행이 생긴 뒤 고객관리를 v1.12에서 v1.11로 되돌려야 할 때, 옛 화면의 상태 선택이 「후보」를 「광고 중」으로 바꿔 저장하지 않게 한다.

## 무엇을 바꾸나(패치 `v1.11-candidate-compat.patch`, 5개 파일 — 2026-11-20 Mac 검수 `msg_e76ff8708dd4` 반영판)

| 파일 | 변경 |
|---|---|
| `src/lib/desk/adRules.ts` | `LISTING_STATUSES`에 「후보」(값 검사용), `CANDIDATE_STATUS`, `statusOptions(current)` — **이미 후보인 줄만** 선택지에 「후보」, 그 밖의 줄은 기존 세 값 |
| `src/app/(dashboard)/listings/page.tsx` | 상태 선택지를 `statusOptions(l.status)`로, 표시 「후보 · 광고 전」 |
| `src/lib/actions/listings.ts` | `updateListingStatusAction`: 「후보」로 저장하는 요청은 `.eq("status", "후보")` 조건을 더해 **이미 후보인 행에만** 적용 → 화면을 우회한 일반 매물 → 후보 요청도 서버에서 바뀌는 행 0 |
| `tests/compatCandidate.test.mjs`(새) | 기존 후보 줄 선택값 「후보」 유지·다른 값으로 나가기 가능, 일반 줄에 「후보」 없음·첫 값 「광고 중」 유지, 서버 조건 존재, 새 후보 생성 경로 없음(4개) |
| `package.json` | 시험 목록에 위 파일 추가 |

- 새 후보를 **만드는** 경로는 없다(후보 등록 화면·서버 액션은 v1.11에 없음, 시험으로 고정). 발송·맞는 고객 수·대시보드 광고 수는 v1.11 그대로 「광고 중」만 다룬다.
- 기존 후보 행은 「광고 중·계약·내림」으로 바꿀 수 있다(광고 시작은 회원 조작).
- 서버 조건은 v1.11 액션이 결과를 돌려주지 않으므로 화면에 오류 문구 없이 「바뀌지 않음」으로 끝난다(우회 요청에만 해당 — 정상 화면에는 그 선택지가 없음).
- 기준 소스: v1.11 버전 커밋 `86955ace6`의 `realty-client-desk/` 트리.

## 검증(2026-11-20, 로컬·비용 0)

- 1차판(4파일, `fa0a59d4f`) → Mac 검수 지적으로 2차판(5파일)으로 교체. 2차판 패치 SHA-256 앞 16자 `c18dd683e60e1046`.
- `git archive 86955ace6 realty-client-desk`로 푼 **깨끗한 사본**에 `git apply -p0 --check` 통과 → 적용 → `npx tsc --noEmit` 오류 0, `npm test` **44/44**(v1.11 기존 40 + 호환 4). 시험 작성 중 1번 실패(원본 파일 줄바꿈 때문에 함수 본문을 잘못 자름) → 시험만 고쳐 패치를 다시 만들고 깨끗한 사본에서 처음부터 다시 재현한 결과.
- **한계**: `npm run build`는 `node_modules` 연결 환경 문제로 이 방식에서 돌지 않음(코드 결함 아님) — 실제 빌드는 배포 때(또는 사본에 `npm ci` 후). 실화면 미확인(배포 뒤 PLAN §6-3 R2: 후보 줄 상태 저장 → 후보 유지, 일반 줄에 「후보」 없음).

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
