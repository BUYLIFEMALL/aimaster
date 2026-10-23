# Suno 음악기획 자동화 — 디자인 리뉴얼 개발 플랜 (v1.10)

> **문서 상태**: 개발 착수 전 사전 플랜 제시  
> **작성 일자**: 2026-10-16  
> **담당 CLI**: Antigravity (Windows)  
> **대상 프로그램**: `suno-music-studio` (Suno 음악기획 자동화, https://suno-music-studio.buylife.xyz)  
> **적용 템플릿**: **사이버 수노 다크 스튜디오 스타일 (Cyber Suno Dark Studio Style)**

---

## 1. 문제 정의 및 개발 배경
1. **Suno Create 오리지널 감성 부재**:
   - 현재 `suno-music-studio`는 화이트(Light) 배경 기반으로 구현되어 있어, 사용자가 실제 병행 이용하는 Suno 공식 사이트(`https://suno.com/create`)의 시그니처 다크 차콜/블랙 테마 및 네온 앰버 악센트와 톤앤매너 차이가 존재함.
   - 주인님 지시: "suno 싸이트 인데 수노 싸이트 느낌을 살려서 블랙배경으로 작업을 해보자".
2. **연동 & 사용 매뉴얼(/guide)의 단순 줄글 형태**:
   - 기존 `UsageGuide.tsx`가 단순 텍스트 번호 목록으로 작성되어 있어, 시각적 직관성이 낮음.
   - 주인님 지시: "디자인 작업할때 연동/사용매뉴얼도 프로그램 사용을 쉽고 직관적으로 이해할수 있도록 이미지,사진,캐릭터,이모티콘,다이어그램 등을 사용해서 작업하도록 해", "https://markdown-studio.buylife.xyz/guide 이버전으로 다시 작업해봐".
3. **디자인 작업 템플릿화 및 고유 명칭 의무 (루트 DESIGN.md 연계)**:
   - 작업 내용을 "사이버 수노 다크 스튜디오 스타일"로 공식 명명하고 카탈로그에 등재.

---

## 2. 작업 범위 (Scope)
1. **디자인 시스템 및 CSS 전면 개편 (`globals.css`)**:
   - 배경: 퓨어 딥 블랙 (`#0a0a0e`) & 다크 옵시디언 서페이스 (`#13131a`, `#1b1b24`).
   - 악센트: Suno의 시그니처 컬러인 앰버 골드/오렌지 (`#f97316`) 및 일렉트릭 바이올렛 (`#8b5cf6`).
   - 글래스모피즘 다크 카드, 반투명 보더 (`rgba(255, 255, 255, 0.08)`), 부드러운 네온 글로우.
2. **연동 & 사용 매뉴얼 전면 비주얼화 (`UsageGuide.tsx`)**:
   - 4단계 음악 기획 워크플로우 다이어그램 (컨셉/의도 ➔ AI 작사/작곡 기획 ➔ Suno Create 복사 ➔ 음원 완성).
   - 장르/무드/보컬 매트릭스 카드, 한국인 프로듀서 실사 비주얼 및 친근한 AI 캐릭터, 단축키 칩.
3. **작업 공간 및 사이드바 정돈 (`Sidebar.tsx`, `Workspace.tsx`, 컨트롤 패널들)**:
   - 사이드바 네온 발광 효과, Suno Create 바로가기 버튼 하이라이트.
   - 모바일(375px~390px) 햄버거 메뉴 및 카드 가로 넘침 방지 반응형 완성.
4. **버전 및 인수인계 문서화**:
   - 버전: `v1.09` ➔ `v1.10` (`src/lib/version.ts`, DB `programs.version`).
   - 산출물: `docs/DESIGN_HANDOFF.md`, `docs/IMPROVEMENTS.md`, `AGENTS.md`, 루트 `DESIGN.md`.

---

## 3. 구현 순서 (Implementation Sequence)
1. **Phase 1: 디자인 시스템 및 다크 테마 구축 (`globals.css`)**
   - CSS 변수 및 컴포넌트 클래스(`card`, `button`, `sidebar`, `nav-item`, `badge` 등)를 사이버 수노 다크 스튜디오 스타일로 전면 리팩토링.
2. **Phase 2: 비주얼 가이드북 리뉴얼 (`UsageGuide.tsx`)**
   - 시각적 다이어그램, 4단계 파이프라인, 프롬프트 구조 설명 카드, 이모티콘/아이콘 배치.
3. **Phase 3: 서브 컴포넌트 다크 콘솔 정돈**
   - `Sidebar.tsx`, `BriefControls.tsx`, `TrackEditor.tsx`, `AlbumPanel.tsx`, `StylePalette.tsx`의 다크 대비 점검.
4. **Phase 4: 자동 검증 및 빌드 테스트**
   - `npm test` (53개 테스트 통과 보장) 및 `npm run build` 검증.
5. **Phase 5: Microsoft Edge(엣지) 브라우저 실화면 검수**
   - 데스크톱(1440px) 및 모바일(375px) 화면 대조, 메뉴 및 동작 검수.
6. **Phase 6: DB 버전 갱신, Vercel 배포 및 최종 인수인계 문서 작성**
   - DB `programs.version` v1.10 반영, 프로덕션 배포, 인수인계 문서 작성 후 커밋/푸시.

---

## 4. 검수 방법 (Edge 전용)
- **도구**: Microsoft Edge (`msedge`) 전용 사용 (Chrome 사용 금지).
- **검수 계정**: 일반 회원 테스트 계정 (`buylifemall@naver.com`) 세션.
- **체크포인트**:
  1. 데스크톱 1440px에서 블랙/차콜 배경 및 앰버/바이올렛 네온 톤 정상 렌더링 확인.
  2. 모바일 375px 반응형에서 가로 스크롤 없음 및 햄버거 메뉴 정상 작동 확인.
  3. 사용 매뉴얼(/guide)의 다이어그램 및 시각적 안내 카드 정상 표시 확인.
  4. 'Suno 열기' 외부 링크 연동 확인.

---

## 5. 비용 및 모델 정책
- UI/UX 디자인 및 프론트엔드 스타일링 작업으로 **유료 API 호출 0회 (비용 0원)**.

---

## 6. 인수인계 산출물
- `suno-music-studio/docs/DESIGN_PLAN_V1_10.md` (본 플랜 문서)
- `suno-music-studio/docs/DESIGN_HANDOFF.md` (디자인 개발완료 보고서)
- `suno-music-studio/docs/IMPROVEMENTS.md` (기능/편의성 개선점)
- `suno-music-studio/AGENTS.md` (v1.10 릴리스 기록)
- `docs/ACTIVE_WORK.md` 및 `docs/HANDOFF.md` 갱신
- 루트 `DESIGN.md` 레지스트리 🟢 완료 반영
