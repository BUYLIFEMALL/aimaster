# 🎨 디자인 개발완료 보고서 (DESIGN_HANDOFF.md)

> **프로그램**: 40번 네이버 카페 포스팅 자동화 (`naver-cafe-poster`)  
> **버전**: `v1.20`  
> **공식 서비스 URL**: [https://naver-cafe-poster.buylife.xyz](https://naver-cafe-poster.buylife.xyz)  
> **공식 가이드북**: [https://naver-cafe-poster.buylife.xyz/guide](https://naver-cafe-poster.buylife.xyz/guide)  
> **작업 일자**: 2026-10-19  
> **담당 에이전트**: Antigravity CLI (`agy`, 윈도우)

---

## 1. 적용 디자인 템플릿 공식 명칭

- **공식 템플릿**: **플로우 위저드 스타일 — 네이버 카페 그린 에디션 (Flow Wizard Style — Naver Cafe Green Edition)**
- **분류군**: `docs/DESIGN_TEMPLATE_CATALOG.md` 내 **[그룹 E] 플로우 위저드 & 단계별 파이프라인군**

---

## 2. 디자인 컬러 토큰 시스템 (Design Tokens)

`src/app/globals.css` 및 Tailwind v4에 정의된 공식 색상 스펙입니다:

```css
:root {
  --background: #f8fafc;        /* 클린 슬레이트 라이트 배경 */
  --foreground: #0f172a;        /* 진한 슬레이트 본문 텍스트 */
  --surface: #ffffff;           /* 퓨어 화이트 카드 서피스 */
  --surface-hover: #f1f5f9;     /* 카드 호버 서피스 */
  --border: #e2e8f0;            /* 기본 카드/구분선 보더 */
  --border-strong: #cbd5e1;     /* 강조 테두리 보더 */
  --brand: #03c75a;             /* 네이버 공식 카페 그린 메인 */
  --brand-hover: #02b150;       /* 네이버 그린 호버 */
  --brand-light: #e8f9f0;       /* 네이버 소프트 민트/그린 하이라이트 배경 */
  --brand-emerald: #10b981;     /* 보조 에메랄드 뱃지 */
  --brand-amber: #f59e0b;       /* 주의 및 가이드북 골드 엑센트 */
}
```

---

## 3. 핵심 컴포넌트 구조 및 레이아웃 특징

1. **사이드바 4단계 넘버링 스텝퍼 (`Sidebar.tsx`)**:
   - `1. 게시글 주제 수집` (`/candidates`)
   - `2. AI 자동 글쓰기(초안)` (`/drafts`)
   - `3. AI 자동 글쓰기(수동)` (`/write`)
   - `4. 게시글 관리` (`/posts`)
   - 스텝 번호 뱃지 활성화 시 `bg-[#03c75a]` 및 수직 연결선으로 시각적 진행 상태 전달.
   - 유틸리티 메뉴 영역에 **`📖 연동 & 사용 매뉴얼` (`/guide`)** 전용 골드 뱃지 메뉴 탑재.
2. **시그니처 히어로 배너 (`.studio-hero`)**:
   - 상단 그라데이션 및 네이버 그린 발광 테두리(`border: 1px solid #bbf7d0`).
   - 공식 프로그램 소개 문구 및 [📖 연동 & 사용 매뉴얼 보기] 퀵 버튼 탑재.
3. **3대 핵심 KPI 기능 카드 (`.stat-card`)**:
   - 1) 3대 소스 글감 자동 수집, 2) 카페 맞춤 AI 초안 생성, 3) 네이버 공식 API 안전 발행.
4. **상태별 게시글 통계 카드**:
   - 초안 저장, 발행 진행중, 발행 완료, 발행 실패 상태별 직관적인 지표 렌더링.
5. **독립 비주얼 가이드북 (`/guide`)**:
   - 4단계 파이프라인 프로세스 다이어그램.
   - 카페 `club_id` 및 게시판 `menu_id` 추출 비주얼 매트릭스.
   - 3대 글감 소스(URL, RSS NewsBlur, Perplexity) 비교표.
   - 100% BYOK 보안 배너 및 FAQ 5종 아코디언 인터랙션.

---

## 4. 모바일 반응형 뷰포트(375px~390px) 대응

- 모바일(767px 이하) 환경에서는 상단에 고정된 네이버 그린 브랜드 헤더와 햄버거 토글 버튼(`☰`)이 표시됩니다.
- 햄버거 버튼 클릭 시 좌측에서 부드럽게 슬라이드되는 오버레이 드로어 메뉴가 동작합니다.
- `overflow-x: hidden` 처리로 375px 좁은 화면에서도 가로 스크롤 넘침(horizontal overflow) 현상이 완전히 차단되었습니다.

---

## 5. 다른 CLI를 위한 작업 및 연동 주의사항

- **쿠키 및 인증**: 모든 *.buylife.xyz 프로그램과 동일한 공유 쿠키(`sb-esgxyikcnnvmlhygjkth-auth-token`)를 사용합니다.
- **네이버 공식 API 연동**: 본 프로그램은 네이버 개발자센터의 정식 Cafe API를 사용합니다. 카페 글 작성 시 `cafe_article_url` 필드에 발행된 글 URL이 저장됩니다.
- **코드 수정 시**: 사본 파일을 직접 변경하지 않고, 항상 본 가이드북 및 공용 모듈 지침을 준수하십시오.
