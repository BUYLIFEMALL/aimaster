# 사전 개발 플랜 (PLAN_20261019_DESIGN_RENEWAL.md) — 68번 AI 글쓰기 에디터 자동화

> **프로그램명**: AI 글쓰기 에디터 자동화 (`ai-writing-editor`)  
> **공식 URL**: https://ai-writing-editor.buylife.xyz  
> **적용 버전**: `v1.07` ➔ `v1.10`  
> **적용 스타일**: **포커스 스튜디오 스타일 — 글쓰기 에디터 에디션 (Focus Studio Style — Writing Editor Edition)**  
> **작성 일자**: 2026-10-19  
> **담당 에이전트**: Antigravity CLI (agy, 윈도우)

---

## 1. 현재 상태 분석 및 리뉴얼 배경
1. **현재 상태**:
   - Tiptap 기반 리치 텍스트 에디터로 기본 마크다운/HTML 서식, 버블 툴바, 심층 교정 제안, 이미지 업로드, Gemini 연동 초안 생성 기능 완비.
   - 하지만 UI가 단순 기본 CSS 스타일로 다소 밋밋하고, 대시보드의 시각적 몰입감이 부족하며, 가이드북(`/guide`) 페이지의 비주얼 프로세스 맵 및 현대적인 카드 디자인이 미흡함.
2. **리뉴얼 목표**:
   - `markdown-studio`와 동일한 최고급 **포커스 스튜디오 스타일 (소프트 크림 `#fdfbf7`, 퓨어 화이트 `#ffffff`, 딥 인디고 `#4f46e5`, 로열 바이올렛 `#8b5cf6`)**을 이식.
   - 대시보드 웰컴 배너(`.studio-hero`), 최근 작업 문서 카드 그리드, 통계 요약 칩 신설.
   - 사이드바 네비게이션 고도화: `v1.10 FOCUS STUDIO` 브랜드 뱃지, `📖 연동 & 사용 매뉴얼` 앰버 골드 활성 배지 표준화.
   - 비주얼 가이드북(`/guide`) 전면 개편: 4단계 글쓰기 파이프라인 다이어그램, Tiptap 단축키 치트시트, 본인 API 키 연동 보안 원칙 배너, FAQ 5종 아코디언.
   - 기존의 Tiptap 에디터, ProseMirror 텍스트 치환, 이미지 업로드 버킷, 본인 Gemini 키 연동 로직은 100% 무결성 보존.

---

## 2. 디자인 토큰 스펙
- **기본 배경**: 소프트 페이퍼 크림 (`#fdfbf7`) & 클린 화이트 (`#ffffff`)
- **콘텐츠 서피스 / 카드**: 순백색 캔버스 (`#ffffff`), 소프트 섀도우 (`0 4px 20px -2px rgba(15, 23, 42, 0.05)`)
- **경계선 보더**: 소프트 슬레이트 라인 (`#e2e8f0` / `#e5e7eb`)
- **주 액센트**: 딥 인디고 (`#4f46e5`, `rgb(79, 70, 229)`)
- **보조 액센트**: 로열 바이올렛 (`#8b5cf6`, `rgb(139, 92, 246)`) & 앰버 골드 (`#f59e0b`)
- **타이포그래피**:
  - Headings: `font-extrabold text-slate-900 tracking-tight`
  - Body: `text-slate-700 text-sm leading-relaxed`
  - Secondary / Hints: `text-slate-500 text-xs`

---

## 3. 단계별 구현 순서
1. **1단계: 버전 3중 동기화 (`v1.10`)**:
   - `package.json` (`1.10.0`)
   - `src/lib/version.ts` (`v1.10`)
   - Supabase DB `programs` 메타데이터 업데이트 (`version: v1.10`)
2. **2단계: 포커스 스튜디오 디자인 토큰 및 스타일 고도화 (`globals.css`)**:
   - 크림 페이퍼 배경, 인디고/바이올렛 그라데이션 히어로, 툴바 및 에디터 캔버스 입체감 강화.
3. **3단계: 사이드바 컴포넌트 표준화 (`Sidebar.tsx`)**:
   - `v1.10 FOCUS STUDIO` 브랜드 뱃지 및 그라데이션 아이콘.
   - `📖 연동 & 사용 매뉴얼` (`/guide`) 메뉴 앰버 골드 활성 배지 표준화.
   - 1단계(새 글 · 분석), 2단계(내 문서), 유틸리티(API키, 매뉴얼) 시각화 강화.
4. **4단계: 대시보드 (`/dashboard`) 및 시작 패널(`StartPanel.tsx`) 리뉴얼**:
   - 딥 인디고 그라데이션 히어로 배너(`.studio-hero`), 퀵 시작 액션 버튼.
   - 탭 전환(초안 생성 vs 기존 글 분석) 및 인풋 폼의 포커스 스튜디오 디자인 토큰 적용.
   - 최근 작업 문서 카드 그리드 뷰 및 빈 상태(Empty State) 시각적 개선.
5. **5단계: 비주얼 에디토리얼 가이드북 (`/guide/page.tsx`) 전면 고도화**:
   - 4단계 핵심 워크플로우 비주얼 다이어그램(1. 주제 기획 ➔ 2. AI 초안 생성 ➔ 3. Tiptap 리치 서식 편집 ➔ 4. 심층 교정 & 마크다운/HTML 복사).
   - 단축키 치트시트 칩, 지원 포맷 쇼케이스, 회원 본인 Gemini API 키 연동 보안 배너, FAQ 5종 아코디언.
6. **6단계: 로컬 무결성 검증**:
   - `npm test`: 기존 단위 테스트 통과 확인.
   - `npx tsc --noEmit`: TypeScript 컴파일 에러 0건 확인.
   - `npm run build`: Next.js 16.4.0 프로덕션 빌드 성공 확인.
7. **7단계: Vercel 프로덕션 배포**:
   - `vercel --prod --yes`로 배포 후 배포 URL 및 도메인 확인 (`https://ai-writing-editor.buylife.xyz`).
8. **8단계: Microsoft Edge 최전면 포그라운드 실세션 검수 (headless: false)**:
   - 일반 회원 테스트 계정(`buylifemall@naver.com`) 로그인 세션 주입.
   - 데스크톱 대시보드, 에디터, 가이드북, 내 문서, 설정 화면 및 모바일 375px 반응형 뷰포트 순차 검수 및 6종 캡처 보존.
   - 검수 완료 후 데스크톱 가이드 화면을 최전면에 **10분간 지속 유지**.
9. **9단계: 규격 문서 6종 작성 및 마스터 현황판 동기화**:
   - `AGENTS.md` (7대 핵심 항목 정리 규격화)
   - `README.md` (동기화 생성)
   - `docs/DESIGN_HANDOFF.md`
   - `docs/IMPROVEMENTS.md` (3대 필수 항목 완비)
   - `docs/IMPROVEMENT_BACKLOG.md`
   - `DESIGN.md` (68번 ✅ 1차 작업완료 갱신, 통계 59개 완료 / 71.1% 달성)
   - `docs/ACTIVE_WORK.md` (작업 행 삭제)
   - `docs/HANDOFF.md` (최상단 완료 인수인계 등록)
10. **10단계: Git 커밋 & 푸시**:
    - `git commit -m "feat(ai-writing-editor): v1.10 포커스 스튜디오 스타일 테마 리뉴얼·/guide 비주얼 가이드북 고도화·Vercel 배포·Edge 최전면 포그라운드 실세션 검수 완료 (68번 ✅ 1차 작업완료)"`
    - `git push origin master`

---

## 4. 검수 방법 및 비용 정책
- **로컬 검증**: `npm test`, `npx tsc --noEmit`, `npm run build` (로컬은 무료).
- **실세션 검수**: Microsoft Edge 실제 창을 화면 최전면에 띄워 10분간 화면 유지 (`headless: false`).
- **테스트 비용**: 목업 세션 및 정적 렌더링 검수 위주로 진행하며 불필요한 유료 AI 생성 호출은 일절 하지 않음 (비용 0원).
