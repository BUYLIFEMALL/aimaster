# AI 바나나 캔버스 자동화 (`banana-canvas`) — 디자인 리뉴얼 개발 플랜 (2026-10-18, Antigravity 윈도우)

> **담당 에이전트**: Antigravity (윈도우)  
> **기준 버전**: `v1.07` ➔ `v1.08` 판올림  
> **공식 디자인 템플릿 명칭**: **크리에이티브 아틀리에 스타일 — 바나나 팝 차콜 변형 (Creative Atelier Style — Banana Pop Charcoal Edition)**  
> **공식 서비스 URL**: https://banana-canvas.buylife.xyz  
> **검수 브라우저**: Microsoft Edge (포그라운드 실세션 검수, 일반 회원 테스트 계정 `buylifemall@naver.com`)

---

## 1. 개요 및 목적
- **목적**: 기존의 화이트/남색 기본 뼈대 UI를 탈피하고, 인물사진(79번)·4컷 만화(81번)와 동일한 뼈대 원리를 활용하여, 바나나 옐로와 잎사귀 그린이 돋보이는 따뜻하고 감각적인 **크리에이티브 아틀리에 스타일 — 바나나 팝 차콜 변형**으로 전면 리뉴얼함.
- **핵심 전략**:
  - `portrait-photo`와 `four-cut-comics`에서 성공적으로 검증된 **맨 위 색 토큰 + 맨 끝 덮어쓰기 CSS** 방식을 적용하여 컴포넌트 로직 수정 없이 안전하고 신속하게 고품질 디자인 구축.
  - 전 화면(스튜디오 대시보드, 가이드북, 설정, 결과 기록, 로그인)의 배경색을 따뜻한 차콜(`#16140f`)로 100% 일체화.
  - 375px 모바일 뷰포트 가로 넘침(0px 방어) 및 터치 편의성 확보.
  - 비주얼 연동 & 사용 매뉴얼 (`/guide`) 비주얼 강화 (`DESIGN.md` 9번 원칙 충족).

---

## 2. 디자인 시스템 및 컬러 토큰

| 역할 | 토큰 변수명 | 색상 값 (HEX) | 설명 |
| :--- | :--- | :--- | :--- |
| **Main Background** | `--background` | `#16140f` | 따뜻한 딥 차콜 (바나나 노랑과 조화로운 바탕) |
| **Card Surface** | `--card` | `#201d16` | 차콜 카드 서피스 |
| **Nested Card** | `--card2` | `#2a261d` | 카드 내부 중첩 요소 / 드롭존 / 입력창 |
| **Stage & Preview** | `--stage` | `#1a1711` | 이미지 프리뷰 캔버스 / 줌 모달 |
| **Border Line** | `--line` | `#3a3427` | 소프트 브라운 경계선 |
| **Strong Border** | `--line-strong` | `#4f4736` | 포커스 및 호버 테두리 |
| **Text Primary** | `--foreground` | `#f3efe4` | 따뜻한 오프 화이트 |
| **Text Muted** | `--muted` | `#a8a08c` | 보조 캡션 및 플레이스홀더 |
| **Primary Brand** | `--brand` | `#ffd84d` | **바나나 옐로** (CTA 액션 버튼, 강조 뱃지) |
| **Brand Ink** | `--brand-ink` | `#1d1806` | 노란 버튼 위 고대비 글자색 |
| **Secondary Leaf** | `--leaf` | `#7ed38a` | **잎사귀 그린** (성공 상태, 부가 기능 하이라이트) |
| **Accent Orange** | `--warn` | `#ff8a5c` | 앰버/코랄 포인트 (레시피, 팁, 주의) |
| **Danger / Error** | `--danger` | `#f87171` | 오류 피드백 (대비 4.5:1 이상) |

---

## 3. 구현 세부 계획

1. **`globals.css` 테마 토큰 및 덮어쓰기 CSS 구축**:
   - 상단 `:root` 변수를 바나나 팝 차콜 토큰으로 교체.
   - 하단에 덮어쓰기 CSS 블록을 추가하여 사이드바, 버튼, 입력창, 드롭존, 3열 대시보드 카드, 결과 카드, 확대 모달, 매뉴얼 컴포넌트까지 완벽 테마화.
2. **사이드바 (`src/components/layout/Sidebar.tsx`) 정돈**:
   - 브랜드 배지를 바나나 테마로 정돈.
   - 메뉴명을 표준 규격인 `📖 연동 & 사용 매뉴얼`로 통일.
   - 모바일 햄버거 메뉴 및 헤더 연동 점검.
3. **비주얼 연동 & 사용 매뉴얼 (`/guide`) 고도화**:
   - 바나나 캐릭터 배지와 친근한 말풍선 히어로 배너 탑재.
   - 3단계 핵심 파이프라인 비주얼 카드 (1. 원본 업로드 ➔ 2. 도구 실행 ➔ 3. 결과 다운로드 & 계속 편집).
   - 4대 도구 그룹(만들기, 편집, 빠른 작업, 스페셜) 안내 카드.
   - 20종 스타일 프리셋 시각적 태그 칩 수록.
   - Gemini API 키 연동 보안 및 FAQ 6종 아코디언 제공.
4. **대시보드(`/studio`), 설정(`/settings`), 기록(`/history`), 로그인(`/login`) 테마 일체화**:
   - 모든 페이지의 배경 및 카드가 동일한 팝 차콜 테마로 동작하도록 점검.
5. **버전 판올림 (`v1.08`)**:
   - `src/lib/version.ts`: `v1.08`
   - `package.json`: `1.08.0`
   - Supabase DB `programs` 테이블 (`slug: banana-canvas`) `version: v1.08` 업데이트.

---

## 4. 검수 계획 및 완료 기준

1. **로컬 무결성 검증**:
   - `npx tsc --noEmit` ➔ 0 에러 통과.
   - `npm test` ➔ 기존 테스트 100% 통과.
   - `npm run build` ➔ Next.js 프로덕션 빌드 성공.
2. **Vercel 프로덕션 배포**:
   - `vercel --prod --scope buylife` 1회 실행 (오늘 10-18 배포 이력 없음 확인 완료).
3. **Microsoft Edge 포그라운드 실세션 검수 (`headless: false`)**:
   - 일반 회원 테스트 계정(`buylifemall@naver.com`)으로 실세션 로그인 및 Edge 실제 창 화면 유지.
   - 데스크톱 1440px 및 모바일 375px 반응형 뷰 캡처 6종 수집 및 저장.
4. **인수인계 문서 6종 완비 및 루트 마스터 현황판 동기화**:
   - `AGENTS.md`, `README.md`, `DESIGN_HANDOFF.md`, `IMPROVEMENTS.md`, `IMPROVEMENT_BACKLOG.md`, `PLAN_20261018_DESIGN_RENEWAL.md`.
   - `DESIGN.md` 80번 완료 갱신, `docs/ACTIVE_WORK.md` 행 삭제, `docs/HANDOFF.md` 상단 보고서 등록, Git 커밋/푸시.
