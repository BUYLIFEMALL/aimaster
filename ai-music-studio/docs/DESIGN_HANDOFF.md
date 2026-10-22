# AI 음악 스튜디오 — 디자인 인수인계 (v1.01, 2026-10-23)

- **스타일 템플릿**: 「AI 이미지 스튜디오 다크 스튜디오 스타일 — 바이올렛 변형」(주인님 지시 「ai-image-studio처럼」 — 사이드바·레이아웃·카드 구조를 그대로 쓰고 강조색만 바꿈). 정식 리뉴얼은 agy 담당.
- **색**: 배경 `#09090b`, 카드 `zinc-900/60` + `zinc-800` 테두리, 강조 `violet-500 #8b5cf6`(hover `#7c3aed`), 성공 emerald, 실패 red, 경고 amber.
- **구조**: 좌측 사이드바(음악 작업 3 + 도움말·설정 2, 계정은 마지막 메뉴 바로 아래, 「← 다른 프로그램 보기」 → https://www.buylife.xyz/programs), 본문 `max-w-7xl`. 모든 화면 같은 배경.
- **컴포넌트**: `components/studio/CreateStudio.tsx`(모델 카드 그리드·입력·결과), `GenerationCard.tsx`(상태 배지·재생기·내려받기·가사·2단계 삭제), `LibraryView.tsx`, `components/settings/KeySettings.tsx`, `components/layout/Sidebar.tsx`.
- **모바일(767px 이하)**: 사이드바 숨김 → 위쪽 ☰ 메뉴(`md:hidden`/`hidden md:flex`), 모델 카드 1열, 버튼 글자 `whitespace-nowrap`. 2026-10-23 390px 미리보기 틀로 확인(가로 넘침 없음, 문서 폭 380px) — 실제 창 크기 변경 검수는 아님.
- **주의**: 삭제는 브라우저 확인창 대신 「정말 삭제/취소」 2단계 버튼(자동 검수 중 확인창이 브라우저를 멈추지 않게).
