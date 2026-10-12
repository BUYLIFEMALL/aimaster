# Suno 음악기획 자동화 v1.02 — 좌측 계정 메뉴 밀착

2026-10-12 주인님 지시: 계정 이메일·로그아웃을 위쪽 마지막 메뉴 바로 아래로 바짝 붙이고, 모든 프로그램의 메인 레이아웃·좌측 메뉴 디자인 지침으로 인수인계합니다.

## 변경

`src/app/globals.css`의 메뉴 `flex: 1`이 남는 높이를 모두 채우며 계정을 맨 아래로 밀었습니다. 메뉴를 `flex: 0 1 auto; min-height: 0; overflow-y: auto`로 수정했습니다. 계정은 `flex-shrink: 0; margin-top: 8px; padding-top: 12px`이며 헤더와 다른 프로그램 링크도 축소되지 않게 했습니다. 높은 화면은 마지막 메뉴 아래 밀착, 낮은 화면은 메뉴 내부만 스크롤, 계정은 계속 접근 가능한 배치입니다. 로그인·로그아웃 처리 코드는 변경하지 않았습니다.

공통 지침은 루트 AGENTS.md·CLAUDE.md, `docs/SIDEBAR_LAYOUT_STANDARD.md`, `docs/PLATFORM_PATTERNS.md` §27에 반영합니다. 기존 ‘하단 고정’은 메뉴 묶음 끝을 뜻하도록 교정했고 `flex-1`/`mt-auto`/`justify-between`으로 계정을 아래로 미는 배치를 금지했습니다. 이번 구현 변경은 Suno에 적용하며 다른 프로그램의 실행 코드는 변경하지 않았습니다.

버전은 코드 APP_VERSION·package/lockfile·공용 DB `programs.version` 모두 v1.02로 맞춥니다. DB 기록은 `supabase/migrations/20261012071755_align_sidebar_account_v102.sql`이며 스키마·키·회원 권한·요금제·썸네일은 변경하지 않습니다. 확장은 없는 프로그램입니다.

## 로컬 검수

`npm run lint`와 `npm run build` 성공. 실제 `Sidebar` 컴포넌트를 Next pathname/search context와 함께 별도 정적 화면으로 렌더링하여 CSS 높이별 배치를 Headless Chrome에서 측정했습니다. 예시 이메일 `preview@example.invalid`는 이 격리된 배치 화면의 표시값이며 운영 로그인·권한 우회를 구현하거나 회원 세션을 복제한 것이 아닙니다. 로그인·로그아웃 기능 검수 결과로 간주하지 않습니다.

| 측정 뷰포트 | 메뉴 끝→계정 간격 | 계정 표시 | 메뉴 높이/내용 높이 |
|---|---:|---|---|
| 1424×1105 | 8px | 화면 안 | 508/508px |
| 1424×545 | 8px | 화면 안 | 318/508px (내부 스크롤) |
| 500×749 (모바일 펼침 CSS) | 8px | 화면 안 | 465/508px (내부 스크롤) |

화면 증거: [높은 화면](assets/sidebar-v102-desktop.png), [낮은 화면](assets/sidebar-v102-short.png), [모바일 펼침](assets/sidebar-v102-mobile.png). Chrome 헤드리스 창 크기와 측정 뷰포트는 브라우저 프레임 크기 제약으로 다릅니다. 좁은 화면 검수는 실제 측정값 500px을 기준으로 기록합니다.

## 운영 반영

로컬 검수·인수인계 반영 후 커밋→푸시→Suno 프로그램만 운영 배포→운영 CSS·버전·접속 결과 확인 순서로 처리합니다. 배포 완료 결과는 이 절에 후속 기록합니다.
