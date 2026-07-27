---
template: plan
version: 1.2
description: PDCA Plan phase document template with Architecture and Convention considerations
variables:
  - feature: platform-hub
  - date: 2026-07-22
  - author: buylifemall@gmail.com
  - project: ai-master
  - version: 0.1.0
---

# platform-hub Planning Document

> **Summary**: **AIMaster(쇼핑몰 사이트)를 모든 자동화 프로그램의 공통 플랫폼**으로 삼는다. 계정/구독/결제/등급/관리자 시스템은 AIMaster가 전담하고, 각 자동화 프로그램은 저장소 루트에 독립 폴더를 만들어 그 안에서 각자 관리(자체 Next.js 프로젝트, 자체 배포)한다. 단, Git 저장소는 프로그램별로 나누지 않고 AIMaster 하나로 통합해서 커밋하며, DB도 AIMaster와 동일한 Supabase 프로젝트를 공유한다.
>
> **Project**: ai-master
> **Version**: 0.1.0
> **Author**: buylifemall@gmail.com
> **Date**: 2026-07-22
> **Status**: Approved (2026-07-26)

---

## 1. Overview

### 1.1 Purpose

**AIMaster 쇼핑몰 사이트 자체가 앞으로 만들어질 모든 자동화 프로그램의 공통 플랫폼이다.**

- **공통 플랫폼(AIMaster가 전담)**: 계정(auth), 구독(subscriptions), 결제(payment_records), 등급(member_grades), 관리자(admin) — 신규 프로그램마다 이 체계를 새로 만들지 않고 그대로 재사용한다.
- **폴더별 독립 관리**: 자동화 프로그램(threads 등)마다 저장소 루트에 독립 폴더를 만들고, 그 폴더 안에서 각자 관리한다 — 각자 자체 `package.json`, 자체 Next.js 프로젝트, 자체 Vercel 배포를 가진다.
- **Git 저장소는 AIMaster 하나로 통합**: 프로그램마다 별도 Git 저장소(별도 `.git`/원격)를 만들지 않고, AIMaster 저장소에 그대로 커밋/푸시한다. 여러 PC에서 작업해도 `git pull` 한 번으로 전체가 동기화된다.
- **DB도 AIMaster와 동일한 Supabase 프로젝트 공유**: 프로그램마다 새 DB를 만들지 않고, `programs`/`user_program_access`/`grade_program_access`/`subscriptions` 테이블로 접근 권한을 판정한다.

> 이 구조가 확정되기까지의 결정 변경 이력은 문서 맨 아래 **Version History**를 참고. 첫 사례인 `threads/`(Threads 자동 포스팅)가 이 최종 규칙대로 구현·재통합되어 있다.

### 1.2 Background

- 이미 DB에 `programs`, `pricing_plans`, `grade_program_access`, `user_program_access`, `subscriptions` 등 "프로그램별 접근 권한"을 판정하는 스키마가 갖춰져 있음.
- 지금까지는 이 스키마가 "외부 프로그램에 대한 구매 권한 판정"용으로만 쓰였는데, 앞으로는 같은 스키마를 "aimaster 내부에 실제로 구현되는 AI 웹앱 기능 자체"에 대한 접근 제어로 확장해서 재사용한다.
- 신규 프로그램을 만들 때마다 인증/결제/등급 체계를 다시 만들지 않기 위해, 단일 Next.js 앱 안에 프로그램별 모듈을 추가하는 구조를 표준으로 정한다.

### 1.3 Related Documents

- Requirements: (없음 — 본 Plan이 최초 정의)
- References: `CLAUDE.md`, `docs/.pdca-status.json`(기존 programs/admin/payment 작업 이력)

---

## 2. Scope

### 2.1 In Scope

- [x] 여러 AI 웹프로그램을 저장소 루트에 **프로그램별 독립 폴더**로 추가하는 컨벤션 정의 (예: `threads/`, 차기 프로그램명/`) — 각 폴더는 자체 Next.js 프로젝트(own `package.json`, own 배포)
- [x] 신규 프로그램이 기존 `subscriptions` / `user_program_access` / `grade_program_access`를 통해 **접근 권한을 공유**하도록 하는 공통 가드(guard) **패턴** 설계 및 복제 (완전한 코드 공유는 불가하므로 동일 로직 패턴을 각 프로그램 `lib/access.ts`에 복제)
- [ ] 대시보드(aimaster 메인 앱)에서 **보유 중인 프로그램 목록을 동적으로 노출**하는 구조 (programs 테이블 기반) — 프로그램별 서비스 URL로 링크
- [ ] 관리자 화면에서 신규 프로그램(모듈) 등록/활성화 관리 방식 정의
- [ ] 프로그램 간 **공통 UI 스타일(다크 럭셔리 테마) 가이드** 문서화 (컴포넌트 코드 공유가 아닌, 톤앤매너 일치 목적)

### 2.2 Out of Scope

- 기존 결제(Payapp) 흐름 자체의 변경 — 그대로 재사용
- `app/(dashboard)/apps/[slug]/` 같은 단일 Next.js 코드베이스 내 라우트 통합 — **폐기**, 폴더 분리 + DB 공유 방식으로 확정
- 프로그램 간 npm 패키지/컴포넌트 코드 자체 공유 (workspaces 등) — 필요성이 커지면 추후 별도 검토
- 개별 AI 웹프로그램의 내부 기능 구현 (프로그램별 Plan/Design은 각 프로그램 feature로 별도 진행)

---

## 3. Requirements

### 3.1 Functional Requirements

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-01 | 신규 AI 웹프로그램은 저장소 루트에 독립 폴더(예: `threads/`)로, 자체 Next.js 프로젝트로 추가할 수 있어야 한다 | High | Done (threads) |
| FR-02 | 각 프로그램은 로그인 + 구독/권한(`user_program_access`, `grade_program_access`) 검증을 `requireProgramAccess()` 패턴으로 통과해야 접근 가능해야 한다 | High | Done (threads) |
| FR-03 | 대시보드(메인 aimaster 앱)에는 사용자가 접근 가능한 프로그램 목록이 `programs` 테이블 기준으로 동적으로 표시되고, 각 프로그램의 실제 서비스 URL로 연결되어야 한다 | High | Pending |
| FR-04 | 관리자는 `admin` 화면에서 새 프로그램(모듈) 등록/노출 여부를 관리할 수 있어야 한다 | Medium | Pending |
| FR-05 | 프로그램은 aimaster와 **동일한 Supabase 프로젝트(단일 DB)** 를 사용해야 한다 (별도 DB 생성 금지). 코드 자체는 프로그램별 독립 폴더에서 관리하되, 접근 가드/타입 등 핵심 로직은 aimaster의 패턴을 동일하게 복제한다 | Medium | Done (threads) |
| FR-06 | 프로그램별 사용량(예: AI API 호출)은 `usage_logs` 테이블에 service-role로 기록해야 한다 | Medium | Done (threads: AI 생성 시 기록) |

### 3.2 Non-Functional Requirements

| Category | Criteria | Measurement Method |
|----------|----------|-------------------|
| Consistency | 다크 럭셔리 테마(`#0a0a0f`, gold gradient) 유지 | 코드 리뷰 / 시각 확인 |
| Security | 프로그램 라우트는 미들웨어/서버 컴포넌트 단에서 접근 권한 미검증 시 403/redirect 처리 | 코드 리뷰 |
| Maintainability | 신규 프로그램 추가 시 기존 라우트/컴포넌트 수정 없이 폴더 추가만으로 확장 가능 | 구조 검토 |

---

## 4. Success Criteria

### 4.1 Definition of Done

- [ ] 프로그램 모듈 추가 컨벤션 문서화 완료 (Design 문서에 반영)
- [ ] 최소 1개의 샘플/실제 AI 웹프로그램 모듈이 컨벤션에 따라 대시보드에 통합됨
- [ ] 기존 판매/구독/결제 플로우에 회귀(regression) 없음

### 4.2 Quality Criteria

- [ ] 기존 lint 규칙 통과
- [ ] 빌드 성공 (`npm run build`)
- [ ] 접근 권한 없는 사용자가 프로그램 라우트 직접 접근 시 차단 확인

---

## 5. Risks and Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| 여러 AI 프로그램이 한 코드베이스에 쌓이면서 번들 크기/빌드 시간 증가 | Medium | Medium | 프로그램별 dynamic import, 필요시 추후 모노레포(workspaces) 분리 검토 |
| 프로그램마다 요구하는 외부 API/환경변수가 달라 `.env.local`이 비대해짐 | Medium | High | 프로그램별 env 네임스페이스 규칙 정의 (예: `PROGRAM_{SLUG}_*`) |
| 접근 권한 로직이 프로그램마다 다르게 구현되어 보안 구멍 발생 | High | Medium | 각 프로그램 폴더가 코드베이스는 분리되어 있으므로, `lib/access/checkProgramAccess.ts`의 로직 패턴(활성 구독 → 개별 부여 권한 → 등급 기반 접근 순서)을 그대로 복제해서 사용. 신규 프로그램 추가 시 이 Plan의 §6.3 예시를 그대로 따를 것 |
| 프로그램마다 코드가 분리되어 있어 공통 로직(접근 가드 등) 수정 시 각 폴더에 동일하게 반영해야 하는 반복 작업 발생 | Medium | Medium | 프로그램 수가 늘어나 반복 부담이 커지면 공유 npm 패키지(workspaces)로 추출하는 것을 추후 검토 (현재는 Out of Scope) |

---

## 6. Architecture Considerations

### 6.1 Project Level Selection

| Level | Characteristics | Recommended For | Selected |
|-------|-----------------|-----------------|:--------:|
| **Starter** | Simple structure (`components/`, `lib/`, `types/`) | Static sites, portfolios, landing pages | ☐ |
| **Dynamic** | Feature-based modules, BaaS integration (bkend.ai) | Web apps with backend, SaaS MVPs, fullstack apps | ☑ |
| **Enterprise** | Strict layer separation, DI, microservices | High-traffic systems, complex architectures | ☐ |

(기존 프로젝트가 이미 Dynamic 레벨 Next.js + Supabase 구조이므로 그대로 유지)

### 6.2 Key Architectural Decisions

| Decision | Options | Selected | Rationale |
|----------|---------|----------|-----------|
| 코드베이스 구조 | 단일 Next.js 코드베이스(라우트 통합) / **프로그램별 독립 폴더(멀티 프로젝트) + 단일 DB 공유** / 완전 멀티 레포 | **프로그램별 독립 폴더 + 단일 DB 공유** | 사용자 확정(2026-07-22): DB(계정/구독/결제)는 하나로 공유하되, 각 자동화 프로그램은 각자 폴더에서 독립적으로 개발/배포 |
| 저장소 구조 | aimaster 앱 내부 라우트 vs 저장소 루트의 형제(sibling) 폴더 | 저장소 루트 형제 폴더 (예: `threads/`, `{next-program}/`) | 프로그램마다 자체 배포 파이프라인/스택 버전을 독립적으로 가져갈 수 있음, 메인 aimaster 빌드에 영향 없음 |
| **Git 저장소 관리** | 프로그램별 독립 Git 저장소(별도 `.git`, 별도 원격) vs **aimaster 단일 저장소에 통합 커밋** | **aimaster 단일 저장소에 통합 커밋** | 사용자 확정(2026-07-26): 별도 레포로 나누면 여러 PC에서 작업 시 동기화가 번거로움. 폴더/배포는 분리하되 소스 버전 관리는 aimaster 하나로 합쳐서 `git pull` 한 번으로 전체 최신화 가능하게 함 |
| 접근 제어 | 프로그램별 개별 구현 vs 공통 가드 함수 | 공통 가드 **패턴** (동일 로직을 각 프로그램의 `lib/access.ts`에 복제) | 코드베이스가 분리되어 있어 완전한 함수 공유는 불가 → 패턴을 문서화하고 그대로 복제해 일관성 유지. aimaster 자체 라우트용은 `lib/access/checkProgramAccess.ts` 그대로 사용 |
| 프로그램 등록 방식 | 하드코딩 vs `programs` 테이블 기반 동적 등록 | `programs` 테이블 기반 | 이미 존재하는 스키마 재사용, 관리자 화면에서 온오프 가능 |
| Backend | 기존 Supabase 그대로 | Supabase (aimaster와 **동일 프로젝트**를 모든 프로그램이 공유) | 계정/구독/결제/사용량을 하나의 DB에서 일관되게 관리 |

### 6.3 Clean Architecture Approach

```
Selected Level: Dynamic

Folder Structure (실제 구현된 형태):

D:\Claude Code\AIMaster\             # aimaster 저장소 루트 = 판매/구독/결제/관리자 허브
  app/
    (dashboard)/
      dashboard/               # 보유 프로그램 목록 카드 (programs 테이블 기반, 각 프로그램 URL로 링크) — Pending
    admin/
      programs/                # 기존 programs 관리 + 모듈 등록/노출 여부 관리 확장 — Pending
  lib/
    access/
      checkProgramAccess.ts    # aimaster 자체 프로그램 라우트용 공통 접근 판정 함수 (완료)

  threads/                      # 프로그램 #1: Threads 자동 포스팅 — 독립 Next.js 프로젝트 (완료)
                                 # ⚠ 별도 .git/원격 없음 — aimaster 저장소에 그대로 커밋됨 (2026-07-26 통합)
    package.json                # 자체 의존성/빌드/배포 (Vercel 프로젝트는 프로그램별로 독립)
    src/
      lib/
        access.ts               # checkProgramAccess.ts와 동일 패턴 복제 + requireProgramAccess() + logProgramUsage()
        supabase/                # aimaster와 동일 Supabase 프로젝트에 연결 (.env.local의 NEXT_PUBLIC_SUPABASE_URL 동일)
      app/(dashboard)/           # threads 자체 대시보드/사이드바 (aimaster (dashboard)와 별개)

  {next-program}/                # 프로그램 #2 이후: 동일한 패턴으로 저장소 루트에 독립 폴더 추가
    package.json                 # 별도 .git 저장소를 새로 만들지 말 것 — aimaster 저장소에 바로 커밋
    src/lib/access.ts            # 동일 패턴 복제, THIS_PROGRAM_SLUG만 교체
```

---

## 7. Convention Prerequisites

### 7.1 Existing Project Conventions

- [x] `CLAUDE.md` has coding conventions section
- [ ] `docs/01-plan/conventions.md` exists (Phase 2 output) — 없음, 필요시 별도 작성
- [ ] `CONVENTIONS.md` exists at project root — 없음
- [x] ESLint configuration (`.eslintrc.*` / flat config via next lint)
- [ ] Prettier configuration — 없음
- [x] TypeScript configuration (`tsconfig.json`)

### 7.2 Conventions to Define/Verify

| Category | Current State | To Define | Priority |
|----------|---------------|-----------|:--------:|
| **프로그램 모듈 폴더 구조** | missing | `app/(dashboard)/apps/[slug]/` 표준 구조 | High |
| **접근 가드 재사용 규칙** | missing | `lib/access/checkProgramAccess.ts` 단일 진입점 강제 | High |
| **프로그램별 env 네임스페이스** | missing | `PROGRAM_{SLUG}_*` 접두사 규칙 | Medium |
| **프로그램 등록 관리자 UI** | missing (programs 테이블은 존재) | admin 화면에서 모듈 on/off 토글 | Medium |

### 7.3 Environment Variables Needed

| Variable | Purpose | Scope | To Be Created |
|----------|---------|-------|:-------------:|
| `PROGRAM_{SLUG}_API_KEY` | 프로그램별 외부 API 키(필요 시) | Server | ☐ |
| (기존 Supabase/Payapp 변수 재사용, 신규 공통 변수 없음) | - | - | - |

### 7.4 Pipeline Integration

| Phase | Status | Document Location | Command |
|-------|:------:|-------------------|---------|
| Phase 1 (Schema) | ☐ | 기존 스키마 재사용, 변경 없음 | - |
| Phase 2 (Convention) | ☐ | 본 Plan §7.2에서 초안 정의 | `/pdca design platform-hub` |

---

## 8. Next Steps

1. [x] 아키텍처 결정 승인 — 프로그램별 독립 폴더 + 단일 Supabase DB 공유 (2026-07-22)
2. [x] 프로그램 #1(`threads/`) 구현 완료: 인증/계정 연결/게시글 CRUD/AI 생성/예약게시/사용량 로깅, `programs` 테이블 등록, DB 마이그레이션 적용
3. [x] `programs.app_url` 컬럼 추가 (`supabase/add-program-app-url.sql`) — 실행형 프로그램의 실제 배포 URL 저장
4. [x] aimaster 메인 대시보드 "구독 중인 프로그램" 카드에 `app_url`이 있으면 "실행하기" 버튼 노출 (FR-03)
5. [x] admin 프로그램 폼(`ProgramForm.tsx`)에 "앱 실행 URL" 입력 필드 추가 + 프로그램 목록에 실행형 표시(🔗) (FR-04)
6. [x] `threads/`를 별도 Git 저장소(독립 `.git`)에서 aimaster 단일 저장소로 재통합 (2026-07-26) — `.gitignore`의 `/threads` 제외 규칙 삭제, 전체 소스 aimaster 저장소에 커밋
7. [ ] `auto-threads-posting` 프로그램의 `app_url` 실제 값 admin에서 입력 (Vercel 배포 URL: `https://threads-nu-dusky.vercel.app`)
8. [ ] threads Vercel 프로젝트의 Meta Threads API 앱에 프로덕션 리다이렉트 URI(`https://threads-nu-dusky.vercel.app/api/threads/callback`) 등록 확인 (Facebook 로그인 제품 설정 포함)

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-07-22 | Initial draft | buylifemall@gmail.com |
| 0.2 | 2026-07-22 | 아키텍처 결정: 단일 코드베이스(apps/[slug]) 방식 폐기 → 프로그램별 독립 폴더 + 단일 Supabase DB 공유로 확정. `threads/` 구현 완료 상태 반영 | buylifemall@gmail.com |
| 0.3 | 2026-07-22 | FR-03/FR-04 구현: `programs.app_url` 컬럼 추가, 대시보드 "실행하기" 버튼, admin 프로그램 폼 앱 URL 입력 필드 | buylifemall@gmail.com |
| 0.4 | 2026-07-26 | 아키텍처 결정 수정: 프로그램별 독립 Git 저장소 방식 폐기 → **aimaster 단일 Git 저장소로 통합 커밋**하는 것으로 확정 (폴더/배포 분리는 유지). `threads/`를 독립 저장소에서 재통합 완료 | buylifemall@gmail.com |
