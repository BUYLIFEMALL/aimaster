# 🤖 네이버 블로그 에이전트 (naver-blog-agent) — CLI 인수인계 & 작업 가이드 (CONTINUATION.md)

> **최종 갱신**: 2026-10-08 | **현재 버전**: `v1.42` | **라이브 URL**: https://naver-blog-agent.vercel.app
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
│   ├── manifest.json             # 확장 메타데이터 및 권한 설정 (v1.32.0)
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
│   │   │   ├── accounts/         # 옛 주소 호환: /settings로 리다이렉트만
│   │   │   ├── dashboard/        # 📊 최상단 운영 대시보드 (통계 & 3개 빠른 작업 카드)
│   │   │   ├── settings/         # 🔑 API키등록·플랫폼연동 (BYOK 키 & 페어링 코드)
│   │   │   └── guide/            # 📖 연동 & 실전 사용 매뉴얼 (최신 개정판)
│   │   └── api/
│   │       ├── collector/        # 글감 수집, 카테고리, 보관함 책갈피 API
│   │       ├── posts/            # Supabase DB 원고 영구 저장 (GET/POST/PUT/DELETE)
│   │       ├── generate/         # 5단계 AI 글 생성 파이프라인
│   │       ├── generate-image/   # 4대 AI 이미지 생성 플랫폼 연동
│   │       ├── generation-preferences/ # 회원별 기본 글·이미지 모델 저장/복원
│   │       ├── upload-image/     # Supabase Storage 이미지 업로드
│   │       ├── keys/             # 페어링 코드 발급 및 검증
│   │       ├── extension/        # 크롬 확장 통신 (auth, task, finish)
│   │       └── cron/cleanup/     # 30일 만료 콘텐츠 자동 삭제 Cron (Vercel Cron 연동)
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx       # 1~3 번호형 Stepper & 하단 구분선 분리 표준 사이드바
│   │   │   └── Header.tsx        # 모바일 헤더
│   │   ├── collector/
│   │   │   └── CategoryManagementModal.tsx # 카테고리 관리 모달
│   │   ├── NaverAccountManager.tsx # /settings의 블로그 ID 등록·수정, 기존 데이터 보존
│   │   ├── BlogSmartEditorModal.tsx # Tiptap 기반 듀얼(위지윅/코드) 스마트 에디터
│   │   └── ContentRetentionNotice.tsx # 30일 보관 및 자동 삭제 공지 배너
│   └── lib/
│       ├── access.ts             # AIMaster 통합 권한 체크 (requireProgramAccess)
│       ├── retention.ts          # 30일 만료일 및 잔여일수(D-xx) 계산 유틸리티
│       └── version.ts            # 프로그램 버전 (APP_VERSION = "v1.32")
```

---

## 💡 2. 최근 주요 작업 내역 (v1.20 ~ v1.42)

| 버전 | 작업 일자 | 핵심 구현 내용 |
|---|---|---|
| **v1.42** | 2026-10-08 | **페르소나 조건 버튼**: 미선택 파란색·선택 초록색, 실제 버튼/키보드 포커스/aria-pressed. 조건만 적용·폼 제출 및 카드 중복 호출 방지. `test:personas` 6개 항목 모의 검수 |
| **v1.41** | 2026-10-08 | **카테고리 아래 설명/여백 제거**: 공유 분류 안내·현재 기획 카테고리 문구와 도움말 블록 제거, `aria-describedby` 잔존 참조 제거. 선택·관리·입력값·기존 행 배치 유지. 문구 부재 회귀 검사 |
| **v1.40** | 2026-10-08 | **불필요한 계정·카테고리 페이지/메뉴 제거**: 작업 흐름 1~3, 대시보드 3개 카드. `/accounts`는 설정 리다이렉트만. 계정 관리 컴포넌트 분리·설정/생성 링크/매뉴얼 갱신. 기존 계정·옛 분류·공유 분류 데이터 보존. `test:navigation` 모의 검수 추가 |
| **v1.39** | 2026-10-08 | **기획 폼 2열 재배치**: 첫 행 블로그 ID/카테고리 선택·관리, 두 번째 행 특정 주제/발행 목적·독자 타깃, 아래 전체 너비 키워드. 동일 높이·좁은 화면 세로 전환. 기존 값/핸들러 유지 및 JSX 행·순서·높이 검수 |
| **v1.38** | 2026-10-08 | **기획 폼 정렬**: 카테고리 선택 상자+관리 버튼 동일 입력 행(40px), 특정 주제는 아래 전체 너비, 검색 키워드·발행 목적/독자 타깃은 다음 행 2열. 모바일 세로 전환 및 라벨 연결. 기존 입력/관리/생성 로직 보존, JSX 구조 테스트 추가 |
| **v1.37** | 2026-10-08 | **생성 화면 직접 카테고리 관리**: 수집소와 동일한 버튼·공통 모달로 등록/수정/삭제/정렬. 세 화면 공유 목록, 선택 항목 수정 시 ID 기준 이름 갱신·삭제 시 선택 해제. 저장 실패 완료 처리 방지·순서 변경 불변성·모달 폼 중첩 방지. 기존 원고 본문 보존 및 모달 실제 핸들러 모의 검수 |
| **v1.36** | 2026-10-08 | **카테고리 출처 정정**: `카테고리 선택`은 보관함·수집소의 사용자 콘텐츠 분류(`nba_collector_categories`). 세 화면 공통 훅·탭 동기화·생성 결과 편집기 연결. 계정/페르소나 전환·즉시 생성에서도 분류 유지. 기존 사용자 목록·순서 보존. v1.35의 계정별 목록 연결은 잘못된 해석으로 폐기 |
| **v1.35** | 2026-10-08 | **등록 카테고리 선택 상자**: 생성 폼에서 계정별 등록 목록을 선택하면 키워드·발행 목적을 함께 적용. 빈 계정 전환 시 이전 값 제거, 주제·말끝·문체 유지. 기존 `/accounts` 브라우저 저장 데이터를 재사용하며 DB 스키마 변경 없음. `npm run test:categories`로 실제 선택·제출 핸들러 모의 검수 |
| **v1.34** | 2026-10-08 | **말끝·문체 확장**: 4종 말끝×8종 문체, 독립 흰색 박스·표현 예시·생성 결과 배지. `writingStyles.ts` 공통 레지스트리와 서버 검증, Writer/Humanizer/Reviewer 우선 지침. 페르소나·계정·카테고리 변경 및 즉시 생성에서도 선택 유지. `npm run test:writing-styles`로 32조합 모의 검수. 기존 모델 저장 스키마 변경 없음 |
| **v1.33** | 2026-10-08 | **모델 설정 독립 박스**: 생성 버튼 아래 별도 `section`으로 배치. 공통 저장 버튼은 글·이미지 설정을 함께 저장하며 저장 후 변경을 구분. 기본값 로딩 중 생성·선택 대기 및 로딩 오류 안내 추가. 기존 `/api/generation-preferences`·RLS 테이블 재사용 |
| **v1.32** | 2026-10-08 | **회원별 기본 생성 모델 저장**: 글 생성 엔진·세부 모델과 이미지 플랫폼·모델·비율·장수를 `nba_generation_preferences`에 저장하고, `/api/generation-preferences`가 권한과 모델 레지스트리를 검증한 뒤 다음 접속에 자동 복원 |
| **v1.31** | 2026-10-08 | **계정·카테고리 관리 분리**: 네이버 블로그 계정 연결·추가·수정·삭제는 `/settings`으로 이동, `/accounts`는 대상 계정 선택 드롭다운을 포함한 카테고리·키워드 관리 전용으로 정리 |
| **v1.30** | 2026-10-08 | **사이드바 연결 메뉴 위치 조정**: `justify-between` 하단 고정을 없애고 API키등록·매뉴얼·로그인 계정·로그아웃을 4번 계정·카테고리 관리 바로 아래에 배치 |
| **v1.29** | 2026-10-08 | **API·확장 이용 권한 검증**: 웹 API는 `checkProgramAccessApi()`로 JSON 401/403을 반환하고, 확장 토큰은 페어링·작업 수신·결과 반영 전 `evaluateProgramAccessForUser()`로 소유자의 현재 이용 권한을 재검증 |
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

0-5. **v1.42 페르소나 조건 버튼**:
   - `조건 불러오기`와 `✓ 선택됨`은 같은 실제 버튼의 상태입니다. `activePersonaId === p.id` 기준으로 파란색/초록색을 전환합니다. 기본 선택 페르소나도 초록색이며 조건 불러오기는 AI 생성/발행을 실행하지 않습니다.
   - `type="button"`·`stopPropagation()`·`aria-pressed`·포커스 표시·생성 중 잠금을 유지합니다. 기존 카드 선택 및 즉시 생성 핸들러는 변경하지 않습니다. `npm run test:personas`와 기존 테스트/빌드를 실행합니다.

0-4. **v1.41 카테고리 설명 제거**:
   - `generation-category-help` 문구/블록은 주인님 요청으로 제거했습니다. 선택 상자는 로딩/빈 목록 상태를 직접 안내하고 라벨 연결은 유지합니다. 삭제된 도움말의 `aria-describedby`를 복원하지 않습니다.
   - 이 변경은 화면 설명과 여백만 제거하며 실제 현재 기획 카테고리 값이나 공유 목록, 입력 키워드/목적, 선택/관리 핸들러를 초기화하지 않습니다. `test:categories`가 구조와 문구 부재/기능 보존을 함께 검수합니다.

0-3. **v1.40 폐기 페이지와 계정 컴포넌트 분리**:
   - `/accounts`는 `/settings`로 리다이렉트만 합니다. 이 라우트를 client 컴포넌트로 import하거나 옛 메뉴/계정별 카테고리 UI를 복원하지 않습니다.
   - 설정은 `components/NaverAccountManager.tsx`를 사용합니다. 기존 저장 키와 account 객체의 categories/default_category/기타 필드를 보존하며 일괄 삭제/이관은 하지 않습니다. 기존 샘플 초기화 동작은 유지합니다.
   - 생성/대시보드 계정 링크는 `/settings`, 사용자 분류 관리는 기존 공통 모달입니다. 사이드바 1~3 및 빠른 작업 카드 3개입니다.
   - `npm run test:navigation`, `test:categories`, `test:writing-styles`, `npm run build`로 검수합니다. 실제 회원 데이터 쓰기·유료 생성·발행은 실행하지 않습니다.

0-2. **v1.39 입력 폼 배치 (v1.38 후속 사용자 지정)**:
   - `generation-account-category-row`의 왼쪽은 `generation-blog-id`, 오른쪽은 카테고리 선택·관리 묶음입니다. 카테고리 내부는 `xl:flex-row` 이전에는 세로 배치해 좁은 열 넘침을 막습니다. 관리 버튼은 `type="button"`이고 공통 모달을 엽니다.
   - `generation-topic-purpose-row`의 왼쪽은 `generation-topic`, 오른쪽은 `generation-purpose`입니다. `generation-keywords`는 그 아래 전체 너비 행입니다. 두 행은 `grid-cols-1 md:grid-cols-2`, 입력 높이는 모두 `h-10`입니다. 값·기존 제출 핸들러는 변경하지 않습니다.
   - `test:categories`가 실제 JSX 부모·표시 순서·동일 높이·반응형 분기를 검증합니다. 카테고리·문체 테스트와 빌드 통과입니다.

0-1. **v1.37 생성 화면의 공통 카테고리 관리 모달**:
   - `page.tsx`의 `handleUpdateRegisteredCategories`는 `useContentCategories.saveCategories` 성공 후 현재 선택을 ID로 추적합니다. 모달은 생성 폼 밖에 렌더링하며 관리 버튼은 `type="button"`입니다. 등록/수정만으로 AI 생성이나 발행을 실행하지 않습니다.
   - `CategoryManagementModal`의 저장 콜백은 `boolean | void`로 기존 호출자와 호환됩니다. 실패(`false`) 시 입력 및 기존 목록을 유지하고 안내합니다. 순서 변경 시 각 항목을 복사한 뒤 수정합니다.
   - 분류 목록 변경은 기존 글감·원고 본문을 삭제하지 않습니다. 생성 화면은 기존 기록의 분류명을 자동 일괄 재작성하지 않으며, 삭제된/이름이 바뀐 분류의 기존 기록은 각 보관함의 카테고리 이동 기능으로 재분류합니다.
   - 로컬 검수: `test:categories`(공통 모달 실제 CRUD/정렬 핸들러, 중복/취소/마지막 항목/저장 실패, 3개 화면 이벤트 갱신, 선택 추적, 기존 원고 보호, 폼 중첩 검사), `test:writing-styles`, `npm run build` 통과. 브라우저 저장·다른 기기 동기화 한계는 아래 v1.36 기록과 같습니다.

0. **v1.36 카테고리 선택의 데이터 출처와 검수 한계 (v1.35 정정)**:
   - 생성 폼·보관함·수집소·생성 결과 편집기는 사용자 콘텐츠 분류 `nba_collector_categories`를 공유합니다. `/accounts`의 `nba_accounts_local`은 네이버 계정별 메뉴/기획 설정이며 이 목록의 출처가 아닙니다. 공통 훅과 저장 유틸을 사용하며 별도 복사본을 만들지 않습니다.
   - 분류 선택은 분류명만 바꿉니다. 계정 전환·페르소나 전환·즉시 생성에서도 선택 분류를 유지합니다. 주제·키워드·발행 목적·말끝·문체를 분류 선택으로 덮어쓰지 않습니다. 기존 글감 선택은 해당 글감 분류를 불러옵니다.
   - 동일 창 custom event, 다른 탭 storage event, 창 focus에서 목록을 갱신합니다. 저장 목록·순서를 그대로 사용하고 명시적인 빈 목록은 유지합니다. 브라우저 저장 방식을 서버/회원별/다른 기기 동기화로 설명하지 않습니다.
   - `npm run test:categories`와 `npm run test:writing-styles` 후 빌드합니다. 실제 글 생성 품질/네이버 최종 발행 성공을 이 선택 UI 테스트로 보장하지 않습니다.
   - v1.36 로컬 검수: 두 테스트와 `npm run build` 통과. 카테고리 테스트는 실제 저장 유틸·훅·이벤트·선택 핸들러·폼/즉시 생성·로컬 원고 저장 및 `/api/posts` 요청을 모의 실행합니다. `npm run lint`는 기존 `eslint.config.*` 부재로 실행 불가(기존 ERROR_LESSONS의 v1.29 기록 참고). 린트 성공으로 보고하지 않습니다.
   - 이전 진단에서 확인된 별도 후속 과제(이번 요청 범위 밖): 계정·카테고리의 회원별 서버 저장 이관, 페르소나 즉시 생성의 기존 주제 혼합, Writer에 원본 키워드·발행 목적 직접 전달, 글자수·Reviewer 전체 본문 검증, 배포 확장의 로컬 브리지 의존과 웹 큐 연결 검증. 확대 구현/DB 스키마 변경은 별도 범위·승인 확인 후 진행합니다.

1. **원고 저장 및 조회는 반드시 `/api/posts` 서버 API를 경유할 것**:
   - 브라우저 `localStorage`는 오프라인 임시 버퍼일 뿐이며, SSOT는 항상 Supabase DB입니다.
   - `Dual Storage Adapter`가 구현되어 있어 `nba_posts` 테이블이 없더라도 `naver_blog_seo_drafts`에 안전하게 폴백 저장됩니다.
2. **30일 자동 삭제 대상에서 보관된 글감(is_archived = true) 제외 보장**:
   - 글감 수집소에서 초록색 책갈피를 누른 글감은 회원이 아껴둔 핵심 자산이므로, 배치 정리(`cron/cleanup`) 시 절대 삭제되지 않도록 `is_archived IS NOT TRUE` 필터가 유지되어야 합니다.
3. **네이버 스마트에디터 ONE DOM 변경 감지 주의**:
   - 크롬 확장의 `content.js`는 스마트에디터 ONE의 내부 iframe 셀렉터(`.se-title-text`, `.se-component-content` 등)를 기반으로 작동합니다. 네이버 에디터 업데이트 시 셀렉터 폴백 로직을 확인해야 합니다.
4. **흰색 베이스 UI 원칙 준수 (Rule 8)**:
   - 본문, 카드, 모달, 입력창은 항상 흰색 또는 옅은 중성색(`bg-white`, `border-neutral-200`, `bg-neutral-50`)을 기본으로 유지합니다.
5. **API route에서는 `requireProgramAccess()`를 호출하지 말 것**:
   - 이 함수는 페이지 이동을 위한 `redirect()`를 사용합니다. API는 `checkProgramAccessApi()`로 JSON 오류를 반환해야 합니다.
   - 확장처럼 웹 세션이 없는 요청은 토큰에서 `user_id`를 확인한 뒤 `evaluateProgramAccessForUser(userId)`를 사용합니다.
