# PLAN-20261117-01 E2 7-3 결과 — 손님 포털 (CC-WORKSPACE-01)

- 근거: Master `msg_f0616e6ab766`(구현 배정)·`msg_ff74e723fba8`(정확 경로·권한 재사용 승인)
- 상태: **ready_review · 미배포 · 기능 꺼짐**(서버 `PORTAL_ENABLED`·화면 `PORTAL_UI` 둘 다 false). 운영 표 생성·외부 연결·실발송·빌드 0
- 커밋: ``

## 1. 파일
| 파일 | 내용 |
|---|---|
| `src/server/portal.ts`(새) | 회원 RPC `portalGet`·`portalSave`(켜기·속성/기간·`rotate` 새 주소)·`portalOff`, 손님 조회 `portalView`, 표 `aww_portals`(첫 사용 때 생성 — 스위치가 켜진 뒤에만) |
| `src/app/portal/[...path]/page.tsx`(새) | 손님 화면. `force-dynamic`·`force-no-store`·`revalidate 0`·`robots noindex/nofollow/nocache`·`referrer no-referrer`, 조건 안 맞으면 `notFound()`. 값은 React 글자 출력(HTML 해석 없음) |
| `src/litpage/web/features/database/chrome/PortalShareDialog.tsx`(새) | 설정 창: 허용 속성 고르기·기간(7~365일)·「이 주소를 가진 사람은 누구나 로그인 없이 볼 수 있습니다」 안내·주소는 만들 때 한 번만 표시·새 주소·끄기 |
| `RowMenu.tsx` | 「손님에게 진행 상황 공유」 1항목(`PORTAL_UI`일 때만) |
| `src/server/runtime.ts` | `...portalHandlers` 1줄(+import) — 회원 요청은 기존 `/api/rpc` 로그인·세션 경로 그대로, 토큰만으로 설정 변경 불가 |
| `i18n.literals.ko-KR.json` | 13줄 |

## 2. 권한·노출(재사용, 새로 안 짬)
- 만들기·바꾸기·끄기: `roleAtLeast(blockRole(행, 회원), 'editor')`(`litpage/server/authz.ts` 358 공유 변경 규칙과 같음) + `policyProblem(space, 'publish', 회원, { pageId })`(워크스페이스·팀 공개 게시 정책). 같은 space 회원만(역할 판정이 space 범위).
- 손님 조회 매 요청: 토큰 해시 일치·켬·만료 전·행 생존·**기록 space = 행 space**·만든 회원이 지금도 editor·공개 게시 정책·`tokenOwnerAllowed`(공개 폼·페이지와 같은 이용 기간 판정) — 하나라도 아니면 404. IP당 분당 30.
- 보이는 값: 허용 종류(제목·텍스트·숫자·선택·다중 선택·상태·날짜·체크박스)만. 제목·텍스트는 사람·페이지·날짜·수식·그룹 멘션을 통째로 빼고 링크 주소를 버린 평문(2000자). 원본 리치 텍스트·속성 id·회원 id는 응답에 없음. 속성이 지워지거나 금지 종류로 바뀌면 숨김.
- 토큰: 32바이트 난수, DB에는 SHA-256 해시만, 원문은 `portalSave` 응답 한 번. 우리 코드는 토큰을 로그에 쓰지 않음(**플랫폼 접속 기록에 주소가 남지 않는다고는 보장하지 않음** — Vercel 요청 로그 등).
- 정리: 끈·만료 포털 기록은 30일 뒤 `portalSave` 때 함께 삭제(새 예약 작업 없음).

## 3. 시험 `tests/integration/portal.test.ts` 8개(격리 시험 DB)
1. 스위치 꺼짐: 모듈을 불러와도 `aww_portals` 없음, `portalGet`·`portalSave`·`portalOff` 404, `portalView` null, 그 뒤에도 표 없음.
2. 켠 뒤: 고를 수 있는 속성 = 제목·메모·금액(사람·관계 제외), 금지 종류를 보내도 버려짐, DB 덤프에 토큰 원문 없음, 다시 저장 시 토큰 미반환.
3. 다른 워크스페이스 회원 상태 보기·만들기 거절(403 이상).
4. 손님 화면: 멘션 빠진 제목·메모, 링크 주소·회원 id·페이지 id 없음, 고르지 않은 속성 없음.
5. 메모 종류가 사람으로 바뀌면 숨김.
6. 이용 기간 끝·공개 게시 끔·만든 회원 권한 없음 → 닫힘, 되돌리면 열림.
7. 다른 space 기록 섞임·만료·새 주소(옛 주소 닫힘)·끄기·행 삭제 → 닫힘.
8. 같은 IP 30번 열림·31번째 닫힘·다른 IP 열림.
- 명령: `cd ai-work-workspace && npx vitest run --config tests/vitest.config.mjs integration/portal.test.ts`(8/8), 전체 **32파일 258/258**, `npx tsc --noEmit -p .` 0.

## 4. 한계·남은 것
- `tokenOwnerAllowed` 판정은 호출마다 하지만 그 공용 모듈 안의 캐시 동작은 바꾸지 않음(공개 폼·페이지와 같은 한계, 즉시 만료 보장 아님).
- 실제 브라우저 화면·설정 창 모양 미검수(스위치 꺼짐). 켜는 배포 = 「운영 워크스페이스 저장소 표 `aww_portals` 추가」 승인 항목.
- 여러 사람이 같은 행에 각자 포털을 만들 수는 없음(행당 1개, 마지막 저장 회원이 `created_by`).

## 비용
없음(빌드 0·AI 0·운영 DB 0·외부 호출 0).
