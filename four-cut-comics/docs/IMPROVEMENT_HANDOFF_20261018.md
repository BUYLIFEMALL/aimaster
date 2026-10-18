# 인수인계 — 2026-10-18 디자인 리뉴얼 v1.12 (Claude Code 윈도우)

## 한 일
- 플랜 `docs/PLAN_20261018_DESIGN_RENEWAL.md` 주인님 승인 후 구현.
- `src/app/globals.css`: 맨 위 `:root` 코믹 파스텔 토큰, 배경 변수화, 끝에 v1.12 덮어쓰기 블록(클래스 이름 그대로) + 매뉴얼 비주얼 클래스.
- `src/components/layout/Sidebar.tsx`: 매뉴얼 메뉴 `📖 연동 & 사용 매뉴얼`(BookOpen 아이콘 제거), 1번 흐름 설명 문구.
- `src/components/studio/Studio.tsx`: 단계 칩 라벨 4개만 교체(로직 무변경).
- `src/app/(workspace)/guide/page.tsx`: 비주얼 매뉴얼로 재구성(마스코트 말풍선·5단계 흐름·옵션 비교·접기 3개·FAQ 이모티콘). 옵션 목록은 `src/lib/comic/options.ts`에서 불러옴. 개인정보 문구를 "[서버 보관함에 저장]을 누르기 전에는 서버에 저장되지 않고"로 정정(v1.05부터 서버 보관함이 있어 예전 문구가 사실과 달랐음).
- `src/lib/version.ts` v1.12. **DB `programs.version`은 아직 v1.11** — 배포할 때 함께 올린다.

## 검수
- tsc 통과, 테스트 실패 0(26개), `npm run build` 성공(CSS `scroll-margin-top` 한 줄은 빌드 뒤 추가 — 배포 전 빌드에서 다시 확인).
- 크롬 로컬 확인: 데스크톱·390px(방법과 한계는 `docs/DESIGN_HANDOFF.md` 5절).
- 못 한 것: 운영 배포, 로그인 실화면, 실제 휴대폰, 이미지 생성(비용).

## 다음 첫 단계 (2026-10-19)
1. `docs/ACTIVE_WORK.md` 확인 → `cd four-cut-comics && npx tsc --noEmit && npm test && npm run build`
2. `vercel deploy --prod --yes` (이 폴더) → `update programs set version='v1.12', updated_at=now() where slug='four-cut-comics';`
3. 크롬(시험 계정 `buylifemall@naver.com`)으로 `/studio`·`/works`·`/settings`·`/guide` 데스크톱·390px 확인 → `docs/DESIGN_HANDOFF.md` 6절 체크
4. `DESIGN.md` 81번 ✅ 1차 작업완료(`v1.12`, 크리에이티브 아틀리에 — 코믹 파스텔 변형), `docs/ACTIVE_WORK.md` 줄 삭제, `docs/PROGRAM_CAPABILITY_MAP.md` 버전, 루트 `docs/HANDOFF.md`

https://four-cut-comics.buylife.xyz
