# 디자인 인수인계 — AI 인플루언서 자동화 (ai-influencer-studio) · v1.10 · 2026-10-17 Claude Code(맥미니)

## 1. 템플릿
**크리에이티브 아틀리에 스타일 — 「핑크 화보 스튜디오」 변형 (다크 미드나잇)**. 기존 브랜드 핑크→로즈 그라데이션을 살리고, 화보 미리보기는 한 단계 더 어두운 캔버스로 사진을 돋보이게 함. 색은 Tailwind v4 `@theme`의 `if-*` 토큰 한곳에 정의(웹 크롤링 `mx-*`, 무한루프 `lv-*`와 같은 방식).

## 2. 색 토큰 (`src/app/globals.css`)
| 토큰 | 값 | 쓰임 |
|---|---|---|
| `if-bg` | `#0d0b12` | 전체 배경·매뉴얼 화면 |
| `if-canvas` | `#08070b` | 화보 미리보기 영역 |
| `if-surface` / `if-raised` | `#15121c` / `#1e1a28` | 카드·패널 / 입력칸·마우스 올림 |
| `if-border` | `#2c2638` | 선 |
| `if-text` / `if-muted` | `#f5f3f7` / `#a19bb0` | 본문 / 보조 글자 |
| `if-pink` / `if-rose` / `if-purple` | `#ec4899` / `#f43f5e` / `#a855f7` | 포인트·그라데이션 |
| `if-success` / `if-warn` | `#10b981` / `#f59e0b` | TIP / 주의 |

- 공용 클래스: `.if-card` `.if-gradient` `.if-gradient-text` `.if-chip` `.if-section-title`, 다크 스크롤바, `select option` 다크.
- 파스텔 색(pink/rose/amber/emerald/indigo/purple `-50/100` 배경, `-100~300` 테두리, `-700~900` 글자)은 각각 `-500/10`, `-500/40`, `-300`으로 치환해 다크에서도 읽히게 함.

## 3. 컴포넌트 구조
- `InfluencerStudio.tsx` — `showGuide` 상태. 매뉴얼을 열면 `GuideView`가 가운데·오른쪽 영역을 차지하고, `ControlPanel`·`ImageDisplay`는 **언마운트하지 않고 `hidden`**(입력값·업로드 사진 유지).
- `GuideView.tsx`(신규) — 예전 `HelpModal`(삭제) 내용을 옮겨 시각화: 히어로·말풍선·5단계 카드·기능 자세히 5개·TIP/주의·FAQ 4개. 광고 모드 설명은 실제 `AD_TYPES` 5가지(공동구매·단순 협찬·브랜디드 콘텐츠·앰배서더·내돈내산)로 바로잡음.
- `Sidebar.tsx` — 「📖 연동 & 사용 매뉴얼」(이전 「💡 사용 가이드」), `guideActive` 속성으로 선택 표시. 단계 메뉴 스크롤은 `setTimeout(…, 0)`(매뉴얼에서 돌아올 때 패널이 다시 보인 뒤 스크롤).
- `ImageDisplay.tsx` — 빈 화면 안내를 영어 「Configure & Generate」 → 한글 + 📸 캐릭터 + 단계 칩. 화보 수정 버튼 2개 핑크 그라데이션.

## 4. 모바일
- 기존 위쪽 바 + ☰ 유지. 매뉴얼 5단계 카드·기능 카드는 1열로 쌓임.

## 5. 주의사항
- `components/Header.tsx`는 원래부터 어디서도 쓰지 않는 파일(지우지 않음).
- 새 화면에 `slate-*`·`neutral-*`·`bg-white`를 쓰지 말고 `if-*` 토큰을 쓴다.
- 화면 검수 때 「이미지 생성」·「캡션 다시 만들기」는 회원 키로 요금이 나가므로 누르지 않는다.
