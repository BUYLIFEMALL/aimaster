# Threads 콘텐츠 운영 자동화 — 개선사항 인수인계서 (IMPROVEMENT_HANDOFF_20261016.md)

> **인수인계 일자**: 2026-10-16  
> **작성 에이전트**: Antigravity CLI (`agy`, Windows)  
> **인수인계 수신자**: Codex, Claude Code 등 다음 작업 투입 AI 코딩 에이전트  
> **대상 프로그램**: `threads-content-ops` (Threads 콘텐츠 운영 자동화)  
> **현재 버전**: `v1.95` ➔ 리뉴얼 시 `v1.96` 상향 예정  
> **프로덕션 URL**: [https://threads-content-ops.buylife.xyz](https://threads-content-ops.buylife.xyz)  
> **Vercel 프로젝트**: `threads-content-ops` (Team: `buylife`)  
> **공유 DB Project**: `esgxyikcnnvmlhygjkth`

---

## 1. 인수인계 개요 및 목적
주인님의 2026-10-16 지시에 따라, `threads-content-ops`의 기존 코드베이스, 화면 UI, 비즈니스 로직, 외부 연동 구조를 정밀 분석하고, **1) 디자인 리뉴얼 개발플랜 문서([`PLAN_20261016_DESIGN_RENEWAL.md`](PLAN_20261016_DESIGN_RENEWAL.md))**와 **2) 개선사항 백로그 문서([`IMPROVEMENTS.md`](IMPROVEMENTS.md))**를 수립하였습니다.

이 문서는 다음 작업을 이어받을 AI 코딩 에이전트(Codex, Claude Code 또는 Antigravity)가 프로그램의 맥락과 우선순위를 즉시 이해하고 단절 없이 개발에 착수할 수 있도록 핵심 사항을 정리한 인수인계서입니다.

---

## 2. 프로그램 아키텍처 및 현황 요약

### 2.1 독립 서브프로젝트 구조
- `threads-content-ops/` 폴더 내 자체 Next.js 14 앱으로 독립 구축되어 있습니다.
- 화면 엔트리: `app/threads-content-ops/page.tsx` (URL 쿼리 `?tab=` 기반 SPA 탭 구조).
- 메인 사이트 연동:
  - `www.buylife.xyz/threads-content-ops*` ➔ `https://threads-content-ops.buylife.xyz`로 리다이렉트.
  - `www.buylife.xyz/api/threads-content-ops/*` ➔ 새 앱으로 프록시(Rewrites) 연결.
  - Meta OAuth 콜백: `https://www.buylife.xyz/api/threads-content-ops/callback` 유지 (쿠키 도메인 `.buylife.xyz`).

### 2.2 핵심 컴포넌트 맵
| 탭 / 라우트 | 주력 컴포넌트 | 역할 및 핵심 기능 |
|---|---|---|
| `?tab=dashboard` | `OperationsDashboard.tsx` | 계정 연결 현황, 글감 수, 초안 수, 포스팅 완료 통계 및 최근 발행 이력 |
| `?tab=viral` | `ViralCollector.tsx` | URL 파싱, Perplexity 트렌드 리서치, 유튜브 쇼츠 분석 3대 글감 수집 |
| `?tab=create` | `AttentionComposer.tsx` | 6대 페르소나 화자 선택, 글감/상품 연동, 500자 맞춤 AI 글 생성 |
| `?tab=manage` | `DraftComposer.tsx` | 초안 보관함, 인라인 수정, 지금 발행, 예약 발행, 미디어 첨부 |
| `?tab=accounts` | `AccountOperations.tsx` | Threads 계정별 페르소나 설정, 운영 시간대, 금지어 지정 |
| `?tab=sources` | `SourceQueue.tsx` | 쿠팡 파트너스 수동 등록, 토스쇼핑 30선, 알리 제휴상품 관리 |
| `?tab=settings` | `WebSetup.tsx` | Meta App ID/Secret, OAuth 연동, LLM API 키(OpenAI/Gemini) 관리 |
| **`?tab=guide` (신설 예정)** | `UsageGuide.tsx` (신규) | 5단계 파이프라인 인포그래픽, 연동 가이드, 페르소나 팁, FAQ |

---

## 3. 발견된 핵심 결함 및 개선 우선순위

다음 작업 에이전트는 아래 순서대로 작업을 진행해야 합니다:

### [P0 - 즉시 구현] 가이드북 부재 및 모바일 반응형 결함
1. **사용 매뉴얼(`/guide`) 메뉴 및 페이지 구축**:
   - `UsageGuide.tsx` 컴포넌트 신설 (비주얼 파이프라인 다이어그램, Meta 연동 가이드, 페르소나 작성 노하우, FAQ 포함).
   - `ContentOpsSidebar.tsx`에 `📖 연동 & 사용 매뉴얼` 메뉴 추가 (`?tab=guide` 연결).
   - `page.tsx`에 `searchParams.tab === "guide"` 라우팅 분기 추가.
2. **모바일 반응형 햄버거 메뉴(`☰`) 구축**:
   - `page.tsx` 상단에 모바일 헤더(`md:hidden`) 추가.
   - 375~390px 스마트폰 화면에서 햄버거 버튼 터치 시 열리는 슬라이드 오버레이 메뉴 제공.
3. **스타일 덮어쓰기 충돌 해소**:
   - `.threads-content-ops-light` 및 잔여 `text-white` 하드코딩 제거 ➔ 표준 라이트 테마 토큰(`text-neutral-900`) 적용.

### [P1 - 단기 고도화] 디자인 템플릿 적용 및 5단계 파이프라인 시각화
1. **`스레드 바이럴 스튜디오 스타일` 전면 적용**:
   - 클린 화이트 베이스 + Threads 블랙 + 바이럴 파이어 앰버(`#f59e0b`) & 바이올렛(`#8b5cf6`) 포인트.
2. **오퍼레이션 대시보드 리뉴얼**:
   - 5단계 가로형 파이프라인 상태 카드 맵 신설.
   - KPI 통계 카드 시각적 승격.
3. **AI 글 생성 에디터 보강**:
   - 500자 제한 실시간 게이지 프로그레스 바.
   - 6종 페르소나 카드 선택 애니메이션.

---

## 4. 작업 시 절대 불변 규칙 및 주의사항

1. **최상위 불변 규칙 준수**:
   - 사용자는 본인의 계정과 본인 API 키/토큰을 직접 연동해서 사용합니다 (운영자 키 폴백 금지).
2. **단일 작업 순차 진행 원칙**:
   - 여러 작업을 섞지 않고 [플랜 ➔ 구현 ➔ 빌드 ➔ 배포 ➔ Edge 실세션 검수 ➔ 커밋/푸시] 순으로 완전히 끝낸 후 다음 작업 착수.
3. **버전 관리 원칙**:
   - 리뉴얼 구현 완료 시 코드 `lib/version.ts`의 `APP_VERSION`과 공유 DB `programs.version`을 **`v1.96`**으로 함께 상향 동기화.
4. **검수 브라우저 준수**:
   - **Antigravity / Codex**: **Microsoft Edge(`msedge.exe`) 전용** (Chrome은 Claude Code 전용).
   - 일반 회원 테스트 계정: `buylifemall@naver.com`으로 실제 로그인하여 검수.
5. **동시 작업 방지**:
   - 작업 시작 시 `docs/ACTIVE_WORK.md`에 등록, 작업 완료 후 인수인계서 갱신 및 등록 해제.

---

## 5. 다음 에이전트의 첫 착수 단계 (First Step)

```bash
# 1. 최신 코드 풀 및 작업 등록 확인
git pull --rebase
# docs/ACTIVE_WORK.md 확인

# 2. 신규 가이드북 컴포넌트 생성
# threads-content-ops/app/threads-content-ops/UsageGuide.tsx 생성

# 3. 사이드바 및 페이지 라우팅 연동
# threads-content-ops/app/threads-content-ops/ContentOpsSidebar.tsx 에 guide 링크 추가
# threads-content-ops/app/threads-content-ops/page.tsx 에 tab === "guide" 렌더링 분기 추가

# 4. 모바일 햄버거 헤더 추가
# page.tsx 최상단에 모바일 전용 헤더 및 드로어 추가

# 5. 로컬 빌드 및 Edge 브라우저 검수
npm run build --prefix threads-content-ops
```

---

## 6. 검수 및 배포 방법

- **로컬 빌드 검증**:
  `npm run build --prefix threads-content-ops` (타입/린트 에러 0건 확인)
- **Vercel 프로덕션 배포**:
  `vercel deploy --cwd D:/Antigravity/AIMaster/threads-content-ops --prod --yes --scope buylife`
- **Edge 브라우저 실세션 검수**:
  - `https://threads-content-ops.buylife.xyz/?tab=guide` 접속 (가이드북 5대 탭 확인)
  - 데스크톱(1440px) 및 모바일(375~390px, F12 반응형 모드) 햄버거 메뉴 동작 확인
  - `buylifemall@naver.com` 계정으로 7개 탭 정상 진입 확인
