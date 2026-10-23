# AIMaster 서브프로그램 좌측 메뉴 표준

모든 독립 서브프로그램은 브랜드 색상과 기능은 달라도, 사용자가 길을 잃지 않도록 같은 좌측 메뉴 정보 구조를 사용한다. 새 프로그램을 만들거나 기존 메뉴를 수정할 때 이 문서를 구현 기준으로 삼는다.

## 필수 순서

1. 프로그램명과 버전
2. `← 다른 프로그램 보기` — 항상 `https://www.buylife.xyz/programs`(전체 자동화 프로그램 목록 페이지)로 이동. 2026-10-06 주인님 결정: 기존 `/dashboard`에서 전체 프로그램 카탈로그 페이지인 `/programs`로 통일 변경.
3. `🏠 대시보드` — 여러 작업 화면이 있는 프로그램에서 최상단 진입점으로 제공
4. 번호가 붙은 핵심 작업 흐름 — `1 → 2 → 3` 순서를 원형 번호 배지와 세로 연결선으로 표시
5. 구분선
6. `🔑 API키등록·플랫폼연동` — API 키 또는 외부 계정 연동이 있는 프로그램은 반드시 표시
7. `📖 연동 & 사용 매뉴얼` (또는 `📚 사용 가이드`) — **필수 항목 (2026-10-16 주인님 지시)**: 작업 중 매뉴얼 메뉴가 없거나 가이드 페이지가 없는 프로그램을 발견하면 기본적으로 좌측 사이드바에 메뉴를 추가하고, 프로그램 사용법을 단계별(Step-by-Step, 4~5단계) 시각적 파이프라인 구조와 FAQ로 설명하는 사용 매뉴얼 페이지(`/guide` 또는 `?tab=guide`)를 전면 구축한다.
8. 사용 안내 등 마지막 메뉴 바로 아래에 밀착한 사용자 이메일과 로그아웃 (간격 8~16px)

단일 작업 화면만 있는 도구(예: 브라우저 안에서만 GIF를 변환하는 도구)는 대시보드와 작업 화면이 같은 주소일 수 있다. 이 경우 중복 메뉴를 만들지 않고 첫 번째 작업 흐름을 최상단 진입점으로 사용한다. API 키나 외부 계정을 전혀 사용하지 않는 도구는 연동 메뉴를 생략할 수 있다.

## 디자인 규칙

### 계정 이메일·로그아웃 위치 — 2026-10-12 주인님 확정

**모든 웹 서브프로그램에서 계정 이메일과 로그아웃은 마지막 메뉴 바로 아래로 바짝 붙인다.** 화면이 높아져도 메뉴와 계정 사이 간격은 늘어나지 않는다. 이 문서의 ‘하단’은 메뉴 묶음의 끝을 뜻하며 화면 맨 아래 고정을 뜻하지 않는다.

- 마지막 메뉴와 계정 구분선 간격은 8~16px, 구분선과 이메일 간격은 8~12px로 유지한다.
- 메뉴 영역을 `flex: 1`/`flex-grow: 1`로 늘리거나 계정에 `margin-top: auto`/`mt-auto`, 래퍼에 `justify-between`을 사용해 계정을 화면 맨 아래로 밀지 않는다.
- 화면 높이보다 메뉴가 길면 메뉴만 줄어들어 내부 스크롤되도록 `flex: 0 1 auto; min-height: 0; overflow-y: auto`를 사용한다. 계정 블록과 헤더는 `flex-shrink: 0`으로 유지한다. Tailwind 예시는 메뉴 `min-h-0 shrink overflow-y-auto`, 계정 `mt-2 shrink-0 border-t pt-3`이며 메뉴에 `flex-1`을 추가하지 않는다.
- 긴 본문, 큰 모니터, 낮은 화면, 모바일 펼침 메뉴에서 메뉴와 계정이 같은 순서로 이어지는지 확인한다.

- 데스크톱은 `md:w-60` 또는 `md:w-64`의 고정 좌측 바, 모바일은 상단 바와 펼침 메뉴를 사용한다.
- 배경·강조색은 각 프로그램 브랜드를 유지해도 되지만, 메뉴의 순서·여백·활성 상태·번호 배지 구조는 바꾸지 않는다.
- 활성 작업은 브랜드 강조색의 원형 번호와 옅은 배경 카드로 표시한다. 비활성 항목은 중립색, hover 시 충분한 대비를 준다.
- 작업명 아래에는 가능하면 한 줄 설명을 제공한다. 번호는 실제 사용 순서와 반드시 일치해야 한다.
- 메뉴 항목을 페이지 상단의 임의 위치에 흩어놓지 말고, 작업 흐름은 한 블록으로, 유틸리티는 구분선 아래 한 블록으로 둔다.
- 현재 화면은 URL prefix로 활성 상태를 판단한다. 새 페이지를 추가하면 해당 흐름 단계 또는 유틸리티에 함께 연결한다.

### 모바일 레이아웃 — 2026-10-14 주인님 지시

**모든 웹 서브프로그램은 휴대폰 폭(767px 이하)에서 좌측 메뉴를 숨기고 위쪽 접는 메뉴(☰)로 바꿔, 본문이 화면 전체 폭을 쓰게 한다.** 좌측 메뉴(약 244px)가 그대로 남으면 휴대폰에서 본문이 절반 이하로 눌려 사용할 수 없다.

- 사고 사례: 2026-10-14 `four-cut-comics` 모바일 검수에서 본문이 약 250px로 눌린 것을 발견했다. `Sidebar.tsx`에 위쪽 메뉴 마크업(`.mobile-sidebar`·`.mobile-header`·`.mobile-menu`)은 있었지만 `globals.css`에 `.mobile-sidebar{display:none}`만 있고 전환 규칙이 없었다. 이 뼈대를 복사한 10개 프로그램(ai-writing-editor·banana-canvas·blog-keyword·fashion-style·landing-architect·music-player·personality-suite·portrait-photo·reverse-prompt·thumbnail-master)도 같았고, 같은 날 모두 고쳐 각각 버전을 올려 배포했다.
- **마크업과 CSS는 한 세트다.** 위쪽 메뉴 마크업을 만들거나 복사하면 같은 작업에서 아래 셸 규칙을 반드시 함께 넣는다(기준 구현: `markdown-studio`·`four-cut-comics`의 `src/app/globals.css` 끝).

```css
@media(max-width:767px){
  .app-shell{display:block}
  .desktop-sidebar{display:none}
  .mobile-sidebar{display:block;position:sticky;top:0;z-index:30;background:#fff;border-bottom:1px solid var(--line)}
  .mobile-header{display:flex;justify-content:space-between;align-items:center;padding:11px 15px;font-size:13px}
  .mobile-header button{border:0;padding:4px}
  .mobile-menu{max-height:calc(100dvh - 60px);overflow:auto;display:flex;flex-direction:column}
  .mobile-menu .sidebar-brand{padding:15px}
  .mobile-menu .sidebar-nav{overflow:visible}
  .workspace-content{padding:23px 14px}
  .card{padding:18px}
}
```

- Tailwind로 만든 프로그램은 `hidden md:flex`(데스크톱 좌측 바) + `md:hidden`(모바일 상단 바)처럼 같은 효과를 내면 된다. 클래스 이름이 아니라 **767px 이하에서 좌측 바가 사라지고 본문이 전체 폭인지**가 기준이다.
- 위쪽 펼침 메뉴에도 데스크톱과 같은 항목·순서(프로그램명·버전·다른 프로그램 보기 → 작업 흐름 → API키등록·플랫폼연동 → 계정·로그아웃)를 둔다. 계정은 마지막 메뉴 바로 아래 규칙을 그대로 따른다.
- 본문 안의 여러 열 배치(카드 격자·편집기 좌우 분할 등)도 767px 이하에서 1~2열로 줄이고, 끌기 조절 점처럼 손가락으로 누르는 요소는 24px 이상으로 키운다(예: `four-cut-comics` 말풍선 편집기).
- **검수 방법(배포 후 필수)**:
  1. 실제 브라우저 창 폭을 줄여 확인한다(claude-in-chrome `resize_window`). 창이 최대화되어 있으면 크기가 바뀌지 않으므로 주인님께 최대화 해제를 요청한다. 엣지 창은 약 492px보다 좁아지지 않는다.
  2. 창이 숨김 상태라 캡처·크기 조절이 안 되면, 페이지 안에 `width:400px` iframe으로 같은 주소를 열고 iframe 안의 `getComputedStyle`로 `.desktop-sidebar`=none·`.mobile-sidebar`=block·본문 폭·가로 넘침 없음을 확인한다(미디어 쿼리는 iframe 폭 기준, 같은 도메인이라 로그인 유지). 보고에는 "화면으로 본 것"과 "스타일 값으로 확인한 것"을 구분해 적는다.
  3. 점검 명령(위쪽 메뉴 코드는 있는데 전환 규칙이 없는 프로그램만 출력, 2026-10-14 기준 0개):
     `for d in */; do p=${d%/}; grep -rqs 'className="mobile-sidebar"' $p/src --include=*.tsx && ! grep -q "mobile-sidebar{display:block" $p/src/app/globals.css && echo $p; done`
  4. **배포 전 점검(무료, 코드 읽기만, 2026-10-23~)**: `node scripts/check-mobile-account.mjs` — 좌측 메뉴가 있는 모든 프로그램에서 「휴대폰 전환(☰) 흔적 없음」·「데스크톱 전용 메뉴에만 로그아웃 1곳(펼침 메뉴에 계정 빠짐)」 후보를 보여 준다(`--all`은 전체 목록). 새 프로그램·뼈대 복사·좌측 메뉴 수정 뒤 후보에 내 폴더가 없어야 한다(2026-10-23 기준 0곳). 코드 판정이라 오판이 있을 수 있으니 후보는 위 1~2번으로 화면 확인. 세션 시작 점검(`node scripts/deploy.mjs --version-only --all`)에도 요약 한 줄이 나온다.

## 구현 골격

```tsx
const OVERVIEW_ITEM = { href: "/dashboard", icon: "🏠", label: "대시보드" };
const FLOW_STEPS = [
  { step: 1, href: "/source", icon: "🔎", label: "자료 준비", description: "..." },
  { step: 2, href: "/create", icon: "✨", label: "콘텐츠 만들기", description: "..." },
];
const UTILITY_ITEMS = [
  { href: "/settings", icon: "🔑", label: "API키등록·플랫폼연동" },
];
```

`FLOW_STEPS`는 원형 번호 배지와 연결선을 포함한 `map` 렌더링으로 구현한다. 각 앱은 독립 배포 프로젝트이므로 공용 컴포넌트를 억지로 외부 import하지 말고, 위 구조를 해당 앱의 `components/layout/Sidebar.tsx`에 유지한다.

## 새 프로그램 점검 목록

- [ ] 프로그램명·버전·다른 프로그램 보기 링크가 헤더에 있다.
- [ ] 다중 화면 앱은 `🏠 대시보드`와 실제 사용 순서의 번호 흐름을 가진다.
- [ ] API 키/외부 계정이 있으면 메뉴명은 정확히 `🔑 API키등록·플랫폼연동`이다.
- [ ] 사용자 이메일과 로그아웃은 마지막 메뉴 바로 아래 8~16px 간격으로 붙으며, 화면 높이가 늘어나도 사이에 빈 공간이 늘어나지 않는다.
- [ ] 낮은 화면에서 메뉴만 내부 스크롤되고 계정·로그아웃에 접근할 수 있다.
- [ ] 모바일 메뉴에서도 동일한 항목과 순서를 확인했다.
- [ ] 767px 이하에서 좌측 메뉴가 숨고 위쪽 접는 메뉴가 나오며 본문이 화면 전체 폭이다(전환 CSS 포함, 가로 넘침 없음 — 위 "모바일 레이아웃" 검수 방법으로 확인).
- [ ] 배포 전 `node scripts/check-mobile-account.mjs` 후보에 이 프로그램이 없다(휴대폰 ☰ 펼침 메뉴에 계정·로그아웃 포함).
- [ ] 링크 대상과 활성 상태를 브라우저에서 확인했다.

## 예외

2026-10-12 **Suno 음악기획 자동화 v1.05**는 주인님의 원본 SU-Note 메뉴·레이아웃 일치 지시에 따라 빌더 → 앨범 → 프리셋 → 검색 → 댄스 머신 → 가이드 → 저장됨을 사용합니다. 이는 해당 프로그램의 번호형 작업 메뉴에만 적용하는 명시적 예외입니다. 대시보드·다른 프로그램 보기·API키등록·플랫폼연동·회원 계정/로그아웃 규칙은 유지하고, 본문 위에 4단계 작업 안내를 제공합니다. 계정 블록은 마지막 메뉴 아래 8px이며 화면 아래로 밀지 않습니다. 흰색 작업 화면과 모바일 접근성을 유지합니다. 상세: [Suno v1.05 비교 기록](../suno-music-studio/docs/RELEASE_V1_05.md).

브라우저 WASM 단일 도구, 관리자 전용 화면처럼 구조상 예외가 필요하면 메뉴를 임의로 바꾸지 말고 이유를 해당 프로젝트 `AGENTS.md` 또는 README에 기록한다. 브랜드의 다크/라이트 테마 차이는 예외가 아니며, 위 정보 구조는 그대로 지킨다.
