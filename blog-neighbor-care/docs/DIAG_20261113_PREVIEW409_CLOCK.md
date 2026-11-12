# 이웃 v1.19 미리보기 409 진단 (2026-11-13, [역할: blog] `claude-win-blog`)

맥미니 인계: [`docs/HANDOFF_20261112_MACMINI_BLOG_REVIEW.md`](../../docs/HANDOFF_20261112_MACMINI_BLOG_REVIEW.md) 「Windows 1순위」.

## 결론 — 원인: 회원 PC 시계와 DB 시계를 직접 비교하는 조건 (사실상 확정)

| 확인 | 결과 |
|---|---|
| 거절 조건 | `supabase/migrations/20261030094500_bnc_extension_context_reads.sql` 100행 `observed<r.created_at` — `observed`=확장 `checkedAt`(회원 PC `Date.now()`), `created_at`=DB `clock_timestamp()` |
| 확장 흐름 | `extension/context-bridge.mjs` `preview()` — `offer` 응답을 받자마자 사람 조작 없이 `inspect()`로 읽음 → 생성 후 보통 1초 안에 `checkedAt` 찍힘 |
| 측정 시계 차이 | 맥이 DB보다 최소 1.63초 늦음(맥미니 측정) → `checkedAt`가 `created_at`보다 앞서 `BNC_READ_CONTEXT` |
| 운영 기록(읽기 전용) | `bnc_extension_context_reads` 전체 2건(11-12 14:12·14:46, 기기 55c19089) 모두 `preview_at=null`·cancelled, 성공 0건 — 매번 실패와 일치 |
| API 표시 | `src/lib/neighbors/contextApi.ts` 43행이 RPC 오류를 모두 같은 409 문구로 묶어 코드가 남지 않음(Vercel 로그 조회는 403) |

모의 시험 [`evidence/preview409-clock-sim-20261113.mjs`](evidence/preview409-clock-sim-20261113.mjs)(100행 조건 그대로):

| 시계 차이 | 읽기 간격 | 현재 | 서버 시각 보정 | DB 허용오차 5초 |
|---|---|---|---|---|
| 0 | 0.3초 | 통과 | 통과 | 통과 |
| 맥 1.63초 늦음 | 0.3·1.5초 | **거절** | 통과 | 통과 |
| 맥 1.63초 빠름 | 0.3초 | **거절** | 통과 | 통과 |
| ±4초 | 0.3초 | **거절** | 통과 | 통과 |
| 맥 12초 늦음 | 0.3초 | **거절** | 통과 | 거절 |
| 31초 지난 결과 | — | 거절 | 거절 | 거절 |

## 구현 (2026-11-13 주인님 「진행해」 → 추천안 1 + 3, **v1.20 배포 완료** `blog-neighbor-care-4u1h4uflh`)

- `extension/server-clock.mjs`(새 컴포넌트): 서버 응답 `serverNow`로 시각 차이를 재고 `checkedAt`·`attempted_at`·화면에 넘기는 허가 기한을 서버 시각 기준으로 맞춘다.
- `extension/context-bridge.mjs`: offer 응답으로 차이를 재 `pending.offset`에 저장(서비스 워커가 잠들어도 확인 단계에서 같은 값 사용).
- `extension/accept-bridge.mjs`: 모든 응답마다 다시 재고, 수락 시도·결과 시각과 화면 기한을 보정. **수락도 같은 문제가 있었다** — 허가 기한이 「허가 시각+30초」라 맥이 늦으면 화면 기한 확인에서 막히고(클릭 전), 화면을 통과했더라면 서버가 `attempted_at<허가 시각`으로 결과 저장을 거절했을 것.
- `src/lib/neighbors/contextApi.ts`·`acceptApi.ts`: 성공 응답에 `serverNow`, RPC 거절 409에 `code`(`BNC_*` 형식만).
- DB 함수·nonce·30초 신선도·기한 검사는 그대로. 시험 `tests/server-clock.test.mjs` 4개(맥 1.632초 늦음 재현) + 전체 382개·`tsc` 통과.
- 다음: v1.20으로 웹 배포 + 확장 ZIP → 맥미니 재설치 → 미리보기·확인저장·C-3 수락 1건 재검수.

## 고칠 방법 (검토한 안)

1. **추천 — 서버 시각 보정**: `offer` 응답에 `serverNow`를 넣고 확장이 `offset=serverNow-응답받은시각`으로 `checkedAt`을 보정해 보낸다. DB 함수·nonce·프로필 해시·30초 신선도·읽기 기한은 그대로. 시계 차이 크기와 상관없이 통과. 필요: 웹 1회 배포 + 확장 v1.20 ZIP(맥미니 재설치). 같은 보정을 수락·실행 결과의 `attempted_at`에도 적용 검토.
2. 대안 — DB 허용오차: 100행을 `observed<r.created_at-interval '5 seconds'`, `observed>t+interval '5 seconds'`로. 확장 재설치 없음, 운영 DB 마이그레이션 필요. 5초 넘게 어긋난 PC는 여전히 실패.
3. 함께 — `contextApi.ts`가 RPC 오류코드(`BNC_*`)를 응답에 `code`로 돌려주게 해 다음 진단을 쉽게(문구는 그대로).

맥 시계/NTP·운영 SQL·운영 코드는 바꾸지 않았다. 비용 없음(DB 읽기만).
