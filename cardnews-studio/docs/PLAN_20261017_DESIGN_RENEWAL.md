# INSTA Cardnews 자동화 (cardnews-studio) 디자인 리뉴얼 및 가이드 신설 개발 플랜

> **작성 일자**: 2026-10-17  
> **대상 프로그램**: 24번 INSTA Cardnews 자동화 (`cardnews-studio`)  
> **현재 버전**: `v1.14` ➔ **목표 버전**: `v1.15`  
> **적용 디자인 템플릿**: **크리에이티브 아틀리에 스타일 — 인스타 카드뉴스 변형 (Creative Atelier - Insta Cardnews Style)**  
> **공식 서비스 URL**: https://cardnews-studio.buylife.xyz  
> **담당 CLI**: Antigravity (`agy`, 윈도우)

---

## 1. 배경 및 문제점 분석

1. **테마 일관성 결여 및 구형 라이트 테마**: 현재 흰색 바탕(`bg-gray-50/60`)의 단조로운 라이트 테마로 구성되어 있어, 이미지 캔버스 작업실 특유의 몰입감과 인스타그램의 트렌디한 비주얼 감성이 부족함.
2. **사용 매뉴얼(`/guide`) 완전 누락 (필수 해결 과제)**:
   - 좌측 사이드바 및 라우트에 사용 가이드북이 전혀 존재하지 않음 (지침 9번: 미구현 발견 시 필수 신규 구축 의무).
3. **모바일 반응형 헤더 및 드로어 미흡**: 375px 모바일 환경에서 상단 바의 펼침 방식이 다소 투박하여 트렌디한 슬라이드 오버레이 드로어와 고정 헤더로의 전환 필요.
4. **버전 및 인수인계 체계 미비**: 최근 강화된 6종 필수 인수인계 문서 및 7대 핵심 항목 규격화 필요.

---

## 2. 디자인 및 기능 리뉴얼 범위

### 1) 컬러 토큰 & 테마 스펙 (크리에이티브 아틀리에 — 인스타 변형)
- **메인 캔버스 배경**: 딥 미드나잇 블랙 (`#0d0f17`)
- **카드 & 서피스**: 다크 아틀리에 슬레이트 (`#161922` / `#1e2230`)
- **사이드바 배경**: 딥 다크 콘솔 (`#090b10`)
- **브랜드 액센트**: 인스타그램 시그니처 핑크/퍼플 그라디언트 (`#ec4899`, `#8b5cf6`) 및 앰버 골드 (`#f59e0b`)
- **텍스트 컬러**: 헤드라인 `#f8fafc`, 본문 `#cbd5e1`, 캡션 `#94a3b8`

### 2) 비주얼 사용 매뉴얼 (`/guide/page.tsx`) 완전 신설
- **사이드바 연동**: `📖 연동 & 사용 매뉴얼` 메뉴 신설
- **가이드북 구성**:
  1. 🤖 마스코트 안내 배너 및 `v1.15` 버전 칩
  2. **5단계 원스톱 카드뉴스 프로세스 카드** (1. 기획 ➔ 2. 문구 ➔ 3. 디자인 ➔ 4. 배경 생성 ➔ 5. 캡션 & PNG 내보내기)
  3. **인스타그램 알고리즘 & 카드뉴스 규격 가이드** (4:5 황금비율 1080×1350 vs 1:1 정방형 1080×1080 비교, 표지 첫 3초 시선 강탈 팁)
  4. **인스타 피드 캡션 & 25개 타겟 해시태그 패키징 활용법**
  5. **BYOK API 키 등록 가이드** (Gemini 나노바나나 & OpenAI/Claude)
  6. **자주 묻는 질문 (FAQ) 4종** 아코디언 및 하단 CTA

### 3) 대시보드 (`/dashboard/page.tsx`) 다크 스튜디오 정돈
- 환영 배너, 5단계 프로세스 가이드 카드, 내 프로젝트 그리드 카드 다크화, 빈 상태(Empty State) 비주얼 개선.

### 4) 사이드바 (`Sidebar.tsx`) 다크 아틀리에 최적화
- 375px 모바일 상단 고정 헤더(`h-14`), 인스타 그라디언트 로고 뱃지, 부드러운 슬라이드 햄버거 드로어, 5단계 파이프라인 넘버링 스텝 바 다크 테마 적용.

---

## 3. 구현 순서 및 세부 절차

```
1. [테마 토큰 정의] → cardnews-studio/src/app/globals.css 다크 토큰 설정
2. [레이아웃 다크화] → (dashboard)/layout.tsx 다크 캔버스 배경 적용
3. [사이드바 업그레이드] → Sidebar.tsx 모바일 헤더, 드로어, /guide 메뉴 연동
4. [가이드 신설] → (dashboard)/guide/page.tsx 비주얼 가이드북 완전 신규 구축
5. [대시보드 다크화] → (dashboard)/dashboard/page.tsx 다크 카드 및 프로젝트 그리드 정돈
6. [버전 동기화] → version.ts (v1.15), package.json (1.15.0), Supabase DB v1.15 갱신
7. [로컬 빌드 검증] → npm run build (Turbopack 컴파일 에러 0건 확인)
8. [Vercel 프로덕션 배포] → npx vercel --prod --yes
9. [Edge 포그라운드 실세션 검수] → Playwright 자동화 스크립트로 1440px / 375px 5종 캡처 검증
10. [인수인계 문서 6종 완성] → AGENTS.md, README.md, DESIGN_HANDOFF, IMPROVEMENTS, BACKLOG, PLAN
11. [현황판 갱신 및 Git 커밋/푸시] → DESIGN.md 24번 완료, ACTIVE_WORK 삭제, HANDOFF 기록 후 푸시
```

---

## 4. 검증 방법 및 제약 사항

- **검수 브라우저**: **Microsoft Edge (`msedge`) 전용 및 포그라운드 (`headless: false`) 필수**
- **검수 대상**: 일반 회원 테스트 계정(`buylifemall@naver.com`) 로그인 세션 주입 후 데스크톱(1440px) 및 모바일(375px) 화면 검증
- **비용**: 유료 API 호출 미수행 (테스트 비용 0원)
- **산출물 보존**: 스크린샷 아티팩트 5종

---

## 5. 인수인계 산출물 목록

1. `cardnews-studio/docs/PLAN_20261017_DESIGN_RENEWAL.md` (본 플랜)
2. `cardnews-studio/docs/DESIGN_HANDOFF.md` (디자인 개발완료 보고서)
3. `cardnews-studio/docs/IMPROVEMENTS.md` (개선 제안서: 3대 핵심 항목 + 타 프로그램 탐색)
4. `cardnews-studio/docs/IMPROVEMENT_BACKLOG.md` (작업 대기 백로그)
5. `cardnews-studio/AGENTS.md` (7대 핵심 항목 완벽 규격화)
6. `cardnews-studio/README.md` (7대 핵심 항목 동기화)
7. `DESIGN.md`, `docs/ACTIVE_WORK.md`, `docs/HANDOFF.md` 동기화
