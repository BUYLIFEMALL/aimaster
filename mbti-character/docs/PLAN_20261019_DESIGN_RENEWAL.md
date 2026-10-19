# 🎨 캐릭코드(MBTI) 측정기 (`mbti-character`) v1.20 리뉴얼 플랜

## 1. 개요 및 배경
- **프로그램명**: 캐릭코드(MBTI) 측정기 (`mbti-character`)
- **서비스 URL**: `https://mbti-character.buylife.xyz`
- **배정 스타일**: **크리에이티브 아틀리에 스타일 — 파스텔 크림 캐릭터 에디션 (Creative Atelier Pastel Cream Character Edition)** (`DESIGN.md` 지정 권장 스타일)
- **현재 버전**: v1.14 ➔ **목표 버전: v1.20**
- **작업 목적**:
  - `DESIGN.md` 9번 필수 원칙에 따른 독립 비주얼 가이드북(`📖 연동 & 사용 매뉴얼`, `/guide`) 신설 및 사이드바/헤더 핵심 메뉴 배치.
  - 감각적이고 따뜻한 파스텔 크림 캐릭터 아틀리에 테마 적용(소프트 크림 `#fefcf9`, 코랄 로즈 `#f43f5e`, 라벤더 바이올렛 `#8b5cf6`, 파스텔 에메랄드 `#10b981`, 소프트 차콜 `#1f2937`).
  - 3대 핵심 KPI 통계 카드 및 4단계 파이프라인 가이드 바 탑재.
  - 16대 자체 제작 오리지널 캐릭터 매트릭스 및 7대 황금 수칙, FAQ 5종 아코디언 구축.
  - Next.js 14 로컬 빌드 검증, Vercel 프로덕션 배포, Microsoft Edge 포그라운드 10분 세션 실세션 검수, 인수인계 문서 완비 및 Git 푸시.

---

## 2. 디자인 시스템 및 테마 스펙

| 토큰명 | 색상 코드 | 용도 |
|---|---|---|
| **Base Atelier** | `#fefcf9` / `#faf6f0` | 아틀리에 소프트 파스텔 캔버스 배경 |
| **Card Surface** | `#ffffff` / `#fffdfa` | 부드러운 카드 서피스 (미세 파스텔 보더 `#f1ebe1`) |
| **Primary Rose** | `#f43f5e` / `#fb7185` | 활력 넘치는 코랄 로즈 프라이머리 액센트 |
| **Secondary Violet** | `#8b5cf6` / `#a78bfa` | 신비롭고 창의적인 라벤더 바이올렛 서브 액센트 |
| **Accent Emerald** | `#10b981` / `#34d399` | 싱그러운 감성의 파스텔 에메랄드 포인트 |
| **Text Charcoal** | `#1f2937` / `#374151` | 가독성 높은 차콜 잉크 본문/헤드라인 텍스트 |
| **Text Muted** | `#6b7280` / `#9ca3af` | 보조 설명 및 메타 정보 텍스트 |

---

## 3. 핵심 구현 계획

### ① 메인 랜딩 페이지 (`app/page.tsx`) 고도화
- **아틀리에 프리미엄 히어로 배너**:
  - `🎭 16대 오리지널 캐릭터 & MBTI 성격 진단 아틀리에` 헤드라인 배너.
  - 파스텔 소프트 그라데이션 및 감각적인 마이크로 배지 (`v1.20`, `20문항 정밀진단`, `AI 캐릭터 생성`).
- **3대 핵심 KPI 통계 카드**:
  1. **16대 오리지널 캐릭터 매칭 풀**: 융 심리유형론 기반 자체 제작 독립 캐릭터 16인 보유.
  2. **20문항 4차원 지표 정밀분석**: E/I, S/N, T/F, J/P 4개 이분지표의 균형점 실시간 측정.
  3. **AI 화풍 일러스트 생성 지원**: Gemini 2.5 Flash 기반의 맞춤형 오리지널 캐릭터 생성 지원.
- **4단계 인터랙티브 파이프라인 가이드 바**:
  - `1단계 20문항 성격검사` ➔ `2단계 4대 지표 정밀분석` ➔ `3단계 오리지널 캐릭터 매칭` ➔ `4단계 AI 화풍 일러스트 생성 & SNS 공유`.
- **API키 등록 폼 & 화풍 선호 셀렉터 카드 비주얼 강화**:
  - 코랄/라벤더 보더와 부드러운 섀도우를 적용한 프리미엄 아틀리에 카드 룩으로 정돈.

### ② 헤더 및 레이아웃 개선 (`app/layout.tsx`)
- **`📖 연동 & 사용 매뉴얼` (`/guide`) 메뉴 신설**: 상단 내비게이션 바에 직접 노출.
- **`v1.20` 배지**: 파스텔 바이올렛 톤의 고급스러운 둥근 배지 탑재.
- **모바일 반응형 UX**: 56px 터치 친화적 헤더, 햄버거 토글 드로어 메뉴 지원.

### ③ 독립 가이드북 신설 (`app/guide/page.tsx`)
- **4단계 캐릭터 매칭 프로세스 다이어그램**: 직관적인 시각화 플로우.
- **16대 MBTI 오리지널 캐릭터 매트릭스 표**:
  - 유형 코드 (INTJ, INTP, ... ESFP)
  - 캐릭터명 (카이런, 노아, 레오나, 하루토, ...)
  - 고유 역할 및 직업 설정
  - 대표 시그니처 대사
  - 추천 AI 아트워크 화풍 스타일
- **나만의 캐릭터 생성 극대화 7대 황금 수칙**:
  1. 솔직하고 즉각적인 직관 응답
  2. 극단적 선택보다 평소 자연스러운 모습 반영
  3. API 키 사전 등록으로 AI 일러스트 즉시 생성
  4. 화풍 선호도 설정을 통한 나만의 캐릭터 일러스트 맞춤 튜닝
  5. 유형별 시그니처 대사 음미 및 성향 일치도 비교
  6. 카카오톡 및 인스타그램 카드 즉시 공유
  7. 주기적인 재검사를 통한 심리 상태 변화 추적
- **실무 FAQ 5종 아코디언**:
  1. 16명의 캐릭터는 공식 애니메이션 캐릭터인가요? (100% 자체 제작 오리지널 캐릭터 정책 설명)
  2. AI 캐릭터 이미지 생성을 위해 어떤 API 키가 필요한가요? (회원 본인 Gemini API 키 연동 안내)
  3. 결과 이미지 및 동적 OG 카드는 어떻게 공유하나요? (카카오톡 SDK 및 링크 공유 지원 안내)
  4. 검사 결과가 다른 사용자에게 노출되거나 저장되나요? (회원 본인 단독 소유 및 RLS 보안 원칙 설명)
  5. 중간에 검사를 중단하면 이어할 수 있나요? (클라이언트 상태 기반 진행 안내)

### ④ 글로벌 스타일 보강 (`app/globals.css`)
- 아틀리에 파스텔 테마 전용 컴포넌트 클래스 추가 (`.atelier-hero`, `.stat-card-pastel`, `.pipeline-bar-pastel`, `.atelier-matrix-table`, `.rule-card-atelier`, `.faq-atelier`).

---

## 4. 버전 3중 동기화 계획 (`v1.20`)
1. `mbti-character/package.json`: `"1.20.0"`
2. `mbti-character/lib/version.ts`: `"v1.20"`
3. Supabase DB `programs` 테이블 (`id: d3967492-0099-4966-9a05-4c39d7bd528b`): `version = 'v1.20'`

---

## 5. 검증 및 배포 프로세스
1. **로컬 빌드 검증**: `npm run build` (Turbopack/Next.js 빌드 오류 사전 검증).
2. **Vercel 프로덕션 배포**: `vercel --prod` ➔ `https://mbti-character.buylife.xyz`.
3. **Microsoft Edge 포그라운드(headless: false) 실세션 검수**:
   - `scripts/verify_edge_mbti_character_v120.cjs` 작성 및 실행.
   - 7종 캡처 수집 (데스크톱 메인, KPI 카드, 파이프라인 바, 가이드북 상단, 캐릭터 매트릭스 표, 모바일 메인, 모바일 가이드북).
   - 아티팩트(`.md`) 7종 등록.
   - 사용자 실시간 육안 확인을 위한 **10분간(600초) 포그라운드 화면 유지**.
4. **인수인계 문서 6종 작성**:
   - `mbti-character/docs/PLAN_20261019_DESIGN_RENEWAL.md`
   - `mbti-character/docs/DESIGN_HANDOFF.md`
   - `mbti-character/docs/IMPROVEMENTS.md`
   - `mbti-character/docs/IMPROVEMENT_HANDOFF_20261019.md`
   - `mbti-character/AGENTS.md`
   - `mbti-character/README.md`
5. **루트 현황판 동기화**: `DESIGN.md`, `docs/ACTIVE_WORK.md`, `docs/DESIGN_TEMPLATE_CATALOG.md`, `docs/HANDOFF.md`.
6. **Git 커밋 및 푸시**: 변경 파일 선별 커밋 및 `origin/master` 푸시.
