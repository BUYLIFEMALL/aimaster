# Threads 콘텐츠 운영 자동화 — 개선사항 인수인계서 (IMPROVEMENT_HANDOFF_20261016.md)

> **인수인계 일자**: 2026-10-16  
> **작성 에이전트**: Antigravity CLI (`agy`, Windows)  
> **인수인계 수신자**: Codex, Claude Code 등 다음 작업 투입 AI 코딩 에이전트  
> **대상 프로그램**: `threads-content-ops` (Threads 콘텐츠 운영 자동화)  
> **현재 버전**: `v1.96` (코드 `lib/version.ts` 및 공유 DB `programs.version` 동기화 완료)  
> **프로덕션 URL**: [https://threads-content-ops.buylife.xyz](https://threads-content-ops.buylife.xyz)  
> **가이드북 URL**: [https://threads-content-ops.buylife.xyz/?tab=guide](https://threads-content-ops.buylife.xyz/?tab=guide)  
> **Vercel 프로젝트**: `threads-content-ops` (Team: `buylife`)  
> **공유 DB Project**: `esgxyikcnnvmlhygjkth`

---

## 1. 인수인계 개요 및 목적
주인님의 2026-10-16 지시에 따라, `threads-content-ops`의 기존 코드베이스, 화면 UI, 비즈니스 로직, 외부 연동 구조를 정밀 분석하고, **1) 디자인 리뉴얼 개발플랜 문서([`PLAN_20261016_DESIGN_RENEWAL.md`](PLAN_20261016_DESIGN_RENEWAL.md))**와 **2) 개선사항 백로그 문서([`IMPROVEMENTS.md`](IMPROVEMENTS.md))**를 수립하였습니다.

이어 P0 최우선 과제였던 **좌측 사용 매뉴얼 메뉴 신설, 단계별 가이드북(`UsageGuide.tsx`) 구축, 모바일 반응형 햄버거 헤더(`MobileNav.tsx`) 구현, Microsoft Edge 실세션 검증 및 Vercel 프로덕션 배포(v1.96)**를 성공적으로 완수하였습니다.

이 문서는 다음 작업을 이어받을 AI 코딩 에이전트(Codex, Claude Code 또는 Antigravity)가 프로그램의 맥락과 완료 현황, 남은 P1/P2 개선 과제를 즉시 이해하고 단절 없이 개발에 착수할 수 있도록 핵심 사항을 정리한 인수인계서입니다.

---

## 2. v1.96 구현 완료 내역 (Done)

| 작업 영역 | 파일 위치 | 구현 내용 및 성과 |
|---|---|---|
| **가이드북 신설** | `app/threads-content-ops/UsageGuide.tsx` | 5대 인터랙티브 탭 구축: 1) 5단계 올인원 파이프라인, 2) Meta & API 연동 매뉴얼, 3) 6대 바이럴 페르소나 비법, 4) 쇼핑제휴 머니타이징, 5) FAQ 아코디언. 콜백 URL 원클릭 복사 UI 및 실사 예시 포함. |
| **사이드바 메뉴 개편** | `app/threads-content-ops/ContentOpsSidebar.tsx` | `📖 연동 & 사용 매뉴얼` (`?tab=guide`) 메뉴 추가, 계정 정보 및 로그아웃 버튼을 유틸리티 메뉴 바로 아래(8~16px 간격)로 바짝 밀착 배치, 버전 배지 `v1.96` 적용. |
| **모바일 반응형 구축** | `app/threads-content-ops/MobileNav.tsx` | 모바일(375~390px) 전용 고정 상단 헤더(`@ Threads 운영 v1.96 ☰`) 및 슬라이드 오버레이 네비게이션 드로어 신설. 모바일에서도 8개 전체 탭 즉시 이동 지원. |
| **페이지 라우팅 연동** | `app/threads-content-ops/page.tsx` | `tab === "guide"` 렌더링 분기 추가, 모바일 헤더 연동, 모바일 상단 겹침 방지 여백 패딩 보정(`pt-20 md:pt-8`). |
| **버전 및 DB 동기화** | `lib/version.ts`, Supabase DB | 코드 `APP_VERSION = "v1.96"` 및 Supabase `programs.version = 'v1.96'` 동기화 완료. |
| **디자인 인수인계 문서** | `docs/DESIGN_HANDOFF.md` | 적용 템플릿(`스레드 바이럴 스튜디오 스타일`), 컬러 시스템, 컴포넌트 구조, 모바일 대응점 공식 기록. |

---

## 3. 프로그램 아키텍처 및 현황 요약

### 3.1 독립 서브프로젝트 구조
- `threads-content-ops/` 폴더 내 자체 Next.js 14 앱으로 독립 구축되어 있습니다.
- 화면 엔트리: `app/threads-content-ops/page.tsx` (URL 쿼리 `?tab=` 기반 SPA 탭 구조).
- 메인 사이트 연동:
  - `www.buylife.xyz/threads-content-ops*` ➔ `https://threads-content-ops.buylife.xyz`로 리다이렉트.
  - `www.buylife.xyz/api/threads-content-ops/*` ➔ 새 앱으로 프록시(Rewrites) 연결.
  - Meta OAuth 콜백: `https://www.buylife.xyz/api/threads-content-ops/callback` 유지 (쿠키 도메인 `.buylife.xyz`).

### 3.2 핵심 컴포넌트 맵
| 탭 / 라우트 | 주력 컴포넌트 | 역할 및 핵심 기능 |
|---|---|---|
| `?tab=dashboard` | `OperationsDashboard.tsx` | 계정 연결 현황, 글감 수, 초안 수, 포스팅 완료 통계 및 최근 발행 이력 |
| `?tab=viral` | `ViralCollector.tsx` | URL 파싱, Perplexity 트렌드 리서치, 유튜브 쇼츠 분석 3대 글감 수집 |
| `?tab=create` | `AttentionComposer.tsx` | 6대 페르소나 화자 선택, 글감/상품 연동, 500자 맞춤 AI 글 생성 |
| `?tab=manage` | `DraftComposer.tsx` | 초안 보관함, 인라인 수정, 지금 발행, 예약 발행, 미디어 첨부 |
| `?tab=accounts` | `AccountOperations.tsx` | Threads 계정별 페르소나 설정, 운영 시간대, 금지어 지정 |
| `?tab=sources` | `SourceQueue.tsx` | 쿠팡 파트너스 수동 등록, 토스쇼핑 30선, 알리 제휴상품 관리 |
| `?tab=settings` | `WebSetup.tsx` | Meta App ID/Secret, OAuth 연동, LLM API 키(OpenAI/Gemini) 관리 |
| **`?tab=guide` (v1.96 신설)** | `UsageGuide.tsx` | 5단계 파이프라인 인포그래픽, Meta 연동 가이드, 페르소나 팁, FAQ |

---

## 4. 차기 개선 과제 백로그 (Next Backlog)

다음 작업 에이전트는 [`docs/IMPROVEMENTS.md`](IMPROVEMENTS.md)에 상세 명세된 아래 과제를 순서대로 진행할 수 있습니다:

### [P1 - 단기 과제] 오퍼레이션 대시보드 리뉴얼 및 500자 게이지 프로그레스 바
1. **대시보드 상단 5단계 파이프라인 컨트롤 맵 신설 (IMP-04)**:
   - `OperationsDashboard.tsx` 상단에 [1. 글감 수집 ➔ 2. AI 초안 생성 ➔ 3. 검토/수정 ➔ 4. 예약/발행 ➔ 5. 성과 분석] 가로형 단계 카드 배치.
   - 각 단계 카드 클릭 시 해당 탭(`?tab=viral`, `?tab=create` 등)으로 원클릭 딥링크 연결.
2. **500자 실시간 게이지 프로그레스 바 UI 도입 (IMP-05)**:
   - `AttentionComposer.tsx` 및 `DraftComposer.tsx`에 Threads 500자 글자수 제한 원형/바 프로그레스 바 추가.
   - 450자 초과 시 주황색 경고, 500자 초과 시 붉은색 에러 및 발행 버튼 비활성화.
3. **6종 페르소나 카드 갤러리 비주얼 업그레이드 (IMP-06)**:
   - 페르소나별 시그니처 뱃지 및 캐릭터 일러스트/아이콘 보강, 선택 시 부드러운 스케일 애니메이션 적용.

### [P2 - 중기 고도화] 쿠팡 수동 등록 및 글감 수집 UX 고도화
1. **쿠팡 파트너스 수동 등록 시 즉시 미리보기 보강 (IMP-07)**:
   - 태그 파싱 즉시 상품 썸네일과 원본 링크를 카드로 렌더링.
2. **글감 수집(URL/쇼츠/Perplexity) 탭 인터페이스 통합 (IMP-08)**:
   - 분산된 수집 탭을 단일 뷰포트 아코디언 또는 세그먼트 컨트롤로 정돈.

---

## 5. 다음 에이전트의 첫 착수 단계 (First Step)

다음 CLI가 작업을 시작할 때는 다음 순서로 착수합니다:

```bash
# 1. 최신 코드 풀 및 작업 등록 확인
git pull --rebase
# docs/ACTIVE_WORK.md 확인 후 내 줄 등록

# 2. 관련 문서 숙지
# threads-content-ops/docs/DESIGN_HANDOFF.md (디자인 토큰 및 컴포넌트)
# threads-content-ops/docs/IMPROVEMENTS.md (개선 과제 상세 명세)

# 3. 작업 진행 (예: IMP-04 대시보드 파이프라인 컨트롤 맵 작업)
# threads-content-ops/app/threads-content-ops/OperationsDashboard.tsx 수정

# 4. 로컬 빌드 및 테스트 검증
npm run build --prefix threads-content-ops
node --test threads-content-ops/tests/coupang-manual.test.cjs threads-content-ops/tests/draft-actions.test.cjs

# 5. 프로덕션 배포 및 Microsoft Edge 검수
vercel deploy --cwd D:/Antigravity/AIMaster/threads-content-ops --prod --yes --scope buylife
```

---

## 6. 검수 및 배포 방법

- **로컬 빌드 검증**:
  `npm run build --prefix threads-content-ops` (타입/린트 에러 0건 확인)
- **단위 테스트**:
  `node --test threads-content-ops/tests/coupang-manual.test.cjs threads-content-ops/tests/draft-actions.test.cjs` (28개 테스트 100% 통과)
- **Vercel 프로덕션 배포**:
  `vercel deploy --cwd D:/Antigravity/AIMaster/threads-content-ops --prod --yes --scope buylife`
- **Edge 브라우저 실세션 검수**:
  - `https://threads-content-ops.buylife.xyz/?tab=guide` 접속 (가이드북 5대 탭 확인)
  - 데스크톱(1440px) 및 모바일(375~390px, F12 반응형 모드) 햄버거 메뉴 동작 확인
  - `buylifemall@naver.com` 계정으로 8개 탭 정상 진입 확인
