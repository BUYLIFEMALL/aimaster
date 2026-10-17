# 디자인 인수인계 — 무한루프 영상자동화 (infinite-loop-video) · v1.05 · 2026-10-17 Claude Code(맥미니)

## 1. 템플릿
**크리에이티브 아틀리에 스타일 — 「네온 루프 시네마」 변형 (다크)**. 다크 차콜 위에 네온 핑크 → 시안 그라데이션으로 「끝과 처음이 이어지는 루프」를 표현. 색은 Tailwind v4 `@theme`의 `lv-*` 토큰 한곳에 정의(웹 크롤링 v1.07의 `mx-*` 방식과 같음).

## 2. 색 토큰 (`src/app/globals.css`)
| 토큰 | 값 | 쓰임 |
|---|---|---|
| `lv-bg` | `#0b0d12` | 전체 배경(로그인 포함, `body`) |
| `lv-surface` / `lv-raised` | `#13161e` / `#1b1f2a` | 카드 / 카드 안 칸·마우스 올림 |
| `lv-border` | `#262b38` | 선 |
| `lv-text` / `lv-muted` | `#f1f5f9` / `#94a3b8` | 본문 / 보조 글자 |
| `lv-pink` / `lv-cyan` | `#ec4899` / `#22d3ee` | 포인트·선택·링크 |
| `lv-success` / `lv-danger` / `lv-warn` | `#10b981` / `#f43f5e` / `#f59e0b` | 점수 좋음 / 오류 / 주의 |

공용 클래스: `.lv-card` `.lv-gradient`(버튼·진행 막대·선택 칸) `.lv-gradient-text` `.lv-btn-primary` `.lv-chip` `.lv-section-title`, 슬라이더 `accent-color` 핑크.

## 3. 컴포넌트 구조
- `components/layout/Sidebar.tsx` — 색만 교체, 매뉴얼 메뉴 이름 「연동 & 사용 매뉴얼」(책 아이콘), 휴대폰 ☰ 기존 그대로.
- `components/ui/LoopModeDiagram.tsx`(신규) — 루프 방식 3가지 막대 도식(스마트 루프·강제 오버랩·바운스). 루프 만들기·매뉴얼 공용, 설명용 그림(처리 로직과 무관).
- `/studio` — 히어로(그라데이션 제목, 「영상이 서버로 가지 않아요」·「API 키 필요 없음」·형식 칩) → 루프 방식 도식 → `LoopTool`(기존 3단계 카드, 색만 교체).
- `/guide` — 히어로·캐릭터 말풍선·4단계 카드·루프 방식 비교·잘 되는/어려운 영상 예시·FAQ 4개.
- 로그인 — 바깥 배경은 `body` 다크, 버튼은 빨강 → 그라데이션으로 통일.

## 4. 모바일
- 767px 이하 기존 위쪽 바 + ☰ 유지. 도식·단계 카드는 1열로 쌓임.

## 5. 주의사항
- `LoopTool.tsx`의 분석·변환 로직은 바꾸지 않았다(클래스만 일괄 치환).
- 새 화면에 `neutral-*`·`gray-*`·`bg-white`를 쓰지 말고 `lv-*` 토큰을 쓴다.
