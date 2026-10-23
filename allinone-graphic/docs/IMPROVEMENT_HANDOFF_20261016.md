# AI 올인원 그래픽 자동화 (`allinone-graphic`) — 개선사항 인수인계서 (2026-10-16)

> **문서 목적**: 2026-10-16 기준 `allinone-graphic` 프로그램의 디자인 리뉴얼, 비주얼 가이드북 신설, 로직 개선 분석 및 인수인계 현황을 기록합니다.
> 어떤 CLI(Antigravity, Codex, Claude Code)가 이어받더라도 즉시 작업 맥락을 파악하고 작업을 연속할 수 있습니다.

---

## 1. 인수인계 기본 개요

- **프로그램명**: AI 올인원 그래픽 자동화 (`allinone-graphic`)
- **서비스 배포 URL**: `https://graphic.buylife.xyz`
- **인계 일자 / 작성 CLI**: 2026-10-16 / Antigravity CLI (`agy`)
- **현재 버전**: `v1.03` ➔ **목표 버전**: `v1.04`
- **적용 디자인 템플릿**: `✨ 크리에이티브 아틀리에 스타일` (Creative Atelier Style)
- **주요 테마 색상**:
  - 프라이머리 앰버 골드: `#f59e0b` (Amber-500)
  - 액센트 웜 골드 / 옐로우: `#fbbf24` (Amber-400), `#fef3c7` (Amber-100)
  - 배경 및 카드: `#0a0d14` (Deep Midnight Dark), `#121726` (Surface Card), `#1e2538` (Border)
  - 텍스트: `#f8fafc` (Slate-50), `#94a3b8` (Slate-400)

---

## 2. 작업 배경 및 인계 사유

1. **디자인 리뉴얼 메인 지침 준수**:
   - `DESIGN.md` §2 마스터 디자인 레지스트리 5번 프로그램에 해당하며, 크리에이티브 아틀리에 스타일의 디자인 고도화 필요.
2. **지침 제7항(미구현 매뉴얼 메뉴/가이드 페이지 필수 구축) 이행**:
   - 기존에는 사이드바 하단 `💡 사용 가이드` 클릭 시 모달 팝업(`GuideModal.tsx`)만 호출되어 123종 프리셋 및 Gemini Imagen 연동, 인페인팅 실전 팁을 상세히 학습하기 어려웠음.
   - 단독 라우트 `/guide` 전면 구축 및 사이드바 상단 네비게이션에 `📖 연동 & 사용 매뉴얼` 메뉴 추가 필수.

---

## 3. 세부 작업 진행 현황 및 파일 변경점

| 구분 | 파일/경로 | 작업 내용 | 진행 상태 |
|---|---|---|---|
| 플랜 수립 | `allinone-graphic/docs/PLAN_20261016_DESIGN_RENEWAL.md` | 기능 분석, 디자인 시스템, 구현 로드맵 수립 | **완료** |
| 개선 관리 | `allinone-graphic/docs/IMPROVEMENTS.md` | 발견 오류 및 편의성/기능 개선 대장 수립 | **완료** |
| 인수인계서 | `allinone-graphic/docs/IMPROVEMENT_HANDOFF_20261016.md` | 현황 보고 및 다음 CLI 인수인계 문서 | **완료** |
| 가이드북 구축 | `allinone-graphic/src/app/guide/page.tsx` | 5단계 파이프라인 인포그래픽, Gemini 연동, 123종 프리셋 맵, 인페인팅 팁, FAQ 4종 | **구현 예정** |
| 사이드바 표준화 | `allinone-graphic/src/components/layout/Sidebar.tsx` | `📖 연동 & 사용 매뉴얼` 메뉴 추가, 계정 블록 밀착(12px) | **구현 예정** |
| 스타일 고도화 | `allinone-graphic/src/app/globals.css` | 크리에이티브 아틀리에 골드 앰버 테마 토큰 및 스크롤바 미세조정 | **구현 예정** |
| 버전 동기화 | `src/lib/version.ts` 및 Supabase DB | `v1.03` ➔ `v1.04` 동기화 갱신 | **구현 예정** |

---

## 4. 남은 작업 및 다음 첫 단계 (Next Step)

1. **가이드북 신설 (`src/app/guide/page.tsx`)**:
   - 상단 히어로: "크리에이티브 아틀리에 앰버 골드" 비주얼 헤더
   - 5단계 그래픽 제작 파이프라인 인포그래픽 (직군/템플릿 ➔ AI 자동입력 ➔ 옵션 정밀조정 ➔ Gemini 렌더링 ➔ 매직 인페인팅)
   - Gemini API 키 연동 & 무료 발급 안내 카드
   - 19개 직군 123종 그래픽 프리셋 가이드 테이블
   - 부분 재수정(Inpainting) 실전 테크닉 가이드
   - 자주 묻는 질문(FAQ) 아코디언 4종
2. **사이드바 메뉴 보강 (`src/components/layout/Sidebar.tsx`)**:
   - `📖 연동 & 사용 매뉴얼` 메뉴 항목 추가 (`href: "/guide"`)
3. **로컬 빌드 검증**: `npm run build --prefix allinone-graphic`
4. **배포**: `vercel deploy --cwd D:/Antigravity/AIMaster/allinone-graphic --prod --yes --scope buylife`
5. **Microsoft Edge 브라우저 실세션 검수**: 데스크톱(1440px) 및 모바일(380px) 캡처 검증

---

## 5. 검수 방법 (Edge 브라우저 전용)

- 검수 URL: `https://graphic.buylife.xyz/guide` 및 `https://graphic.buylife.xyz/`
- 데스크톱 (1440px): 사이드바 `📖 연동 & 사용 매뉴얼` 메뉴 활성화 확인, 가이드북 5단계 카드 레이아웃 정렬 및 아코디언 인터랙션 검증.
- 모바일 (380px): 반응형 햄버거 메뉴 열림 시 매뉴얼 메뉴 표시 및 가이드북 본문 줄바꿈/여백 이상 유무 점검.
