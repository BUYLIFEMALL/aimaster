# 🤖 네이버 블로그 에이전트 (naver-blog-agent) — CLI 인수인계 & 작업 가이드 (CONTINUATION.md)

> **최종 갱신**: 2026-10-08 | **현재 버전**: `v1.28` | **라이브 URL**: https://naver-blog-agent.vercel.app  
> Claude Code, Codex, Gemini 등 **어떤 AI 에이전트가 이어서 작업하더라도 즉시 파악하고 안전하게 작업할 수 있도록 정리한 기술 인수인계 문서**입니다.

---

## 📌 0. 작업 시작 전 필수 점검 사항 (Checklist)

1. **로컬 Git 상태 및 동기화 확인**:
   ```bash
   git status
   git log --oneline -5
   ```
   - 다른 CLI(Codex 등)가 동시에 작업 중인 파일(예: `threads-content-ops/` 등)이 작업 트리에 있을 수 있으므로, **`git add -A`나 `git commit -a`를 절대 사용하지 말고 `naver-blog-agent/` 및 관련 문서만 명시적으로 스테이징**할 것!
2. **배포 시 Vercel 스코프 필수**:
   - `naver-blog-agent` 배포 시 반드시:
     ```bash
     cd naver-blog-agent
     vercel deploy --prod --yes --scope buylife
     ```
3. **버전 관리 불변칙 (Rule 5)**:
   - 프로그램을 수정해 배포할 때마다 마이너 버전 +0.01 (`v1.28 ➔ v1.29`).
   - 변경 대상 5곳:
     1) `src/lib/version.ts`: `APP_VERSION = "v1.29"`
     2) `package.json`: `"version": "1.29.0"`
     3) `extension/manifest.json`: `"version": "1.29.0"`
     4) Supabase DB `programs.version` (slug: `naver-blog-agent` ➔ REST PATCH)
     5) 마이그레이션 SQL: `supabase/migrations/00XX_bump_version_v1_XX.sql`
   - `npm run build` 시 `prebuild` 스크립트(`scripts/build-extension-archive.mjs`)가 실행되어 자동으로 최신 크롬 확장 ZIP 번들(`public/downloads/naver-blog-agent-extension-vX.XX.zip` 및 `latest.zip`)을 패키징함.
4. **2026년 당해 연도 기준 3중 방어막 (Rule 9)**:
   - LLM 사전학습 컷오프로 인해 2023, 2024년으로 퇴행하는 오류를 원천 차단하기 위해 **입력단 정제 + 프롬프트 당해 연도 절대 제약 + 출력단 정규식 교정** 유지.

---

## 🏗️ 1. 전체 시스템 아키텍처 및 핵심 파일 구조

```
naver-blog-agent/
├── extension/                     # 🌐 크롬 브라우저 확장 프로그램 (Manifest V3)
│   ├── manifest.json             # 확장 메타데이터 및 권한 설정 (v1.28.0)
│   ├── background.js             # 백그라운드 서비스 워커 (대기열 주기적 폴링 & 탭 오픈)
│   ├── content.js                # 스마트에디터 ONE 내부 DOM 조작 & 사람 타자 모사 (30~120ms 딜레이)
│   ├── popup.html / popup.js     # 확장 팝업 UI (8자리 페어링 코드 입력 & 연결 상태 점검)
│   └── icons/                    # 확장 아이콘 (16, 48, 128)
├── public/
│   └── downloads/                # 크롬 확장 다운로드용 자동 생성 ZIP 번들
├── scripts/
│   └── build-extension-archive.mjs # 빌드 시 확장 폴더를 최신 버전 ZIP으로 압축하는 스크립트
├── src/
│   ├── app/                      # Next.js 16 App Router
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx        # force-dynamic, requireProgramAccess() 세션 검증
│   │   │   ├── page.tsx          # ✍️ 2단계: 5단계 AI 글 생성 & 멀티 이미지 스튜디오
│   │   │   ├── collector/        # 🔥 1단계: 떡상 글감 수집소 (트렌드/뉴스/URL 분석)
│   │   │   ├── queue/            # 📑 3단계: 생성 원고 보관함 & 스마트 에디터 & 발행 큐
│   │   │   ├── accounts/         # 👥 4단계: 네이버 계정 및 카테고리 관리
│   │   │   ├── dashboard/        # 📊 최상단 운영 대시보드 (통계 & 4단계 빠른 작업 카드)
│   │   │   ├── settings/         # 🔑 API키등록·플랫폼연동 (BYOK 키 & 페어링 코드)
│   │   │   └── guide/            # 📖 연동 & 실전 사용 매뉴얼 (최신 개정판)
│   │   └── api/
│   │       ├── collector/        # 글감 수집, 카테고리, 보관함 책갈피 API
│   │       ├── posts/            # Supabase DB 원고 영구 저장 (GET/POST/PUT/DELETE)
│   │       ├── generate/         # 5단계 AI 글 생성 파이프라인
│   │       ├── generate-image/   # 4대 AI 이미지 생성 플랫폼 연동
│   │       ├── upload-image/     # Supabase Storage 이미지 업로드
│   │       ├── keys/             # 페어링 코드 발급 및 검증
│   │       ├── extension/        # 크롬 확장 통신 (auth, task, finish)
│   │       └── cron/cleanup/     # 30일 만료 콘텐츠 자동 삭제 Cron (Vercel Cron 연동)
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx       # 1~4 번호형 Stepper & 하단 구분선 분리 표준 사이드바
│   │   │   └── Header.tsx        # 모바일 헤더
│   │   ├── collector/
│   │   │   └── CategoryManagementModal.tsx # 카테고리 관리 모달
│   │   ├── BlogSmartEditorModal.tsx # Tiptap 기반 듀얼(위지윅/코드) 스마트 에디터
│   │   └── ContentRetentionNotice.tsx # 30일 보관 및 자동 삭제 공지 배너
│   └── lib/
│       ├── access.ts             # AIMaster 통합 권한 체크 (requireProgramAccess)
│       ├── retention.ts          # 30일 만료일 및 잔여일수(D-xx) 계산 유틸리티
│       └── version.ts            # 프로그램 버전 (APP_VERSION = "v1.28")
```

---

## 💡 2. 최근 주요 작업 내역 (v1.20 ~ v1.28)

| 버전 | 작업 일자 | 핵심 구현 내용 |
|---|---|---|
| **v1.28** | 2026-10-08 | **좌측 사이드바 표준 Stepper 및 API키등록 분리**: 최상단 대시보드 ➔ 1~4 원형 번호 배지 및 세로선(떡상 콘텐츠 수집 ➔ 콘텐츠 생성 ➔ 콘텐츠 보관함 ➔ 계정 운영정보) ➔ 구분선(`border-t`) 아래 `🔑 API키등록·플랫폼연동`, 매뉴얼, 계정, 로그아웃 분리 배치 |
| **v1.27** | 2026-10-08 | **연동 & 실전 사용 매뉴얼(`/guide`) 전면 개편**: Akamai 보안 우회 원리, 3분 연동, 실전 4단계 워크플로우, 30일 보관 정책, FAQ 6종 집대성 |
| **v1.26** | 2026-10-08 | **사이드바 및 대시보드 메뉴 순서 정렬**: 계정·카테고리 메뉴를 원고 보관함 밑으로 배치하여 작업 흐름 동기화 |
| **v1.25** | 2026-10-08 | **30일 보관 및 자동 삭제(Content Retention)**: `retention.ts`, `ContentRetentionNotice.tsx`, D-xx 배지, Vercel Cron(`/api/cron/cleanup`), 보관함 책갈피(초록색) 영구 보호 |
| **v1.24** | 2026-10-08 | **원고 보관함 카테고리 연계**: 글감 수집소 카테고리 체계 공유, 탭 필터링, 인라인 변경, 다중 선택 일괄 이동(Bulk Move) |
| **v1.23** | 2026-10-08 | **대시보드 퀵 액션 카드 순서 개편**: 1번 글감 수집 ➔ 2번 글 생성 ➔ 3번 보관함 ➔ 4번 계정 관리 |
| **v1.22** | 2026-10-08 | **사이드바 대시보드 최상단 배치**: 플랫폼 표준 준수 |
| **v1.21** | 2026-10-08 | **서버 Supabase DB 원고 영구 저장 API (`/api/posts`)**: 로컬스토리지 의존 탈피, Dual Storage Adapter (`nba_posts` / `naver_blog_seo_drafts`), RLS owner-only 격리 |
| **v1.20** | 2026-10-08 | **원고 보관함 & 발행 큐(`/queue`) 전면 개편**: Tiptap 듀얼 스마트 에디터, PC 사진 첨부, AI 이미지 추가 생성 |

---

## ⚠️ 3. 다음 작업 시 반드시 주의할 핵심 사항 (Gotchas)

1. **원고 저장 및 조회는 반드시 `/api/posts` 서버 API를 경유할 것**:
   - 브라우저 `localStorage`는 오프라인 임시 버퍼일 뿐이며, SSOT는 항상 Supabase DB입니다.
   - `Dual Storage Adapter`가 구현되어 있어 `nba_posts` 테이블이 없더라도 `naver_blog_seo_drafts`에 안전하게 폴백 저장됩니다.
2. **30일 자동 삭제 대상에서 보관된 글감(is_archived = true) 제외 보장**:
   - 글감 수집소에서 초록색 책갈피를 누른 글감은 회원이 아껴둔 핵심 자산이므로, 배치 정리(`cron/cleanup`) 시 절대 삭제되지 않도록 `is_archived IS NOT TRUE` 필터가 유지되어야 합니다.
3. **네이버 스마트에디터 ONE DOM 변경 감지 주의**:
   - 크롬 확장의 `content.js`는 스마트에디터 ONE의 내부 iframe 셀렉터(`.se-title-text`, `.se-component-content` 등)를 기반으로 작동합니다. 네이버 에디터 업데이트 시 셀렉터 폴백 로직을 확인해야 합니다.
4. **흰색 베이스 UI 원칙 준수 (Rule 8)**:
   - 본문, 카드, 모달, 입력창은 항상 흰색 또는 옅은 중성색(`bg-white`, `border-neutral-200`, `bg-neutral-50`)을 기본으로 유지합니다.
