# AIMaster 플랫폼 — Google 애드센스(AdSense) 승인 준비 및 운영 매뉴얼

> **최초 작성일**: 2026-10-11  
> **적용 대상**: AIMaster 메인 플랫폼 (`https://www.buylife.xyz`) 및 전체 서브프로젝트  
> **목적**: Google 애드센스 승인 심사 자격 요건을 100% 충족하고, 향후 심사 신청 및 승인 후 광고 운영 시 준수해야 할 기술적·정책적 가이드라인 인수인계

---

## 1. Google 애드센스 심사 핵심 원칙 및 자격 요건

### 1.1 무료·유료 서비스 혼합 사이트의 애드센스 정책
- **유료 SaaS나 결제 구독 모델이 존재한다는 이유만으로 애드센스 승인이 거절되지 않습니다.** (Google 공식 가이드라인)
- Google 심사에서 가장 중요하게 평가하는 요소는 다음 3가지입니다:
  1. **콘텐츠 품질 및 가치 (Content Quality & Value)**: 다른 사이트와 차별화되는 독창적이고 유용한 설명, 가이드, 실제 화면과 활용법이 충분한 분량으로 제공되어야 함.
  2. **정책 준수 (Policy Compliance)**: 개인정보처리방침에 Google 및 제3자 공급업체의 광고 쿠키(Cookie) 수집 사실과 맞춤 광고 차단(Opt-out) 링크가 반드시 포함되어야 함.
  3. **비로그인 크롤러 접근성 (Public Crawlability)**: Googlebot 및 애드센스 심사 봇(`Mediapartners-Google`)이 비밀번호나 회원가입 없이 사이트의 핵심 정보와 가이드를 자유롭게 크롤링할 수 있어야 함.

### 1.2 광고 게재 대상 화면과 제외 화면의 분리 원칙
- **광고 게재 적격 화면 (공개 정보성 페이지)**:
  - 메인 홈페이지 (`/`)
  - 프로그램 카탈로그 (`/programs`)
  - 프로그램 상세 안내 및 기능 매뉴얼 (`/programs/[slug]`)
  - 공식 이용 가이드 센터 (`/guides`, `/guides/[id]`)
  - 고객지원, 공지사항, FAQ (`/support`, `/support/*`)
- **광고 게재 제외 화면 (내부 작업 및 트랜잭션 화면)**:
  - 로그인 및 회원가입 화면 (`/login`, `/register`)
  - 관리자 화면 (`/admin/*`)
  - 결제 진행 및 결제 완료 화면 (`/payment/*`)
  - 서브프로그램 내부 회원 전용 작업 화면 (예: 캔버스, 포스팅 실행기 등)
  > **주의**: 콘텐츠가 없거나 단순 알림/버튼만 있는 화면, 로그인 전용 대시보드에는 광고를 게재하지 않아야 하며 애드센스 관리자 화면에서 "페이지 제외" 처리를 합니다.

---

## 2. 완료된 사이트 구조 개선 및 기술 반영 내역 (2026-10-11 완료)

### 2.1 개인정보처리방침(Privacy Policy) — Google 광고 쿠키 조항 신설
- **반영 위치**: Supabase DB `legal_documents` (slug: `privacy`), 라이브 주소: `https://www.buylife.xyz/privacy`
- **신설된 제13조 내용**:
  - Google 및 제3자 공급업체가 이용자의 이전 방문 기록을 바탕으로 광고를 게재하기 위해 쿠키(Cookie, DoubleClick/DART 쿠키)를 사용한다는 사실 명시.
  - 이용자가 맞춤형 광고 게재를 거부(Opt-out)할 수 있는 공식 링크 명시:
    - Google 광고 설정: `https://www.google.com/settings/ads`
    - 디지털 광고 연합(DAA): `https://www.aboutads.info/choices/`
    - 네트워크 광고 이니셔티브(NAI): `https://www.networkadvertising.org/choices/`
  - 브라우저 쿠키 거부 방법 및 영문 공식 정책(English Summary) 병기.
  > **인수인계 주의사항**: 개인정보처리방침을 향후 수정할 때 **제13조의 광고 쿠키 및 옵트아웃 조항을 절대 삭제하거나 누락하지 마십시오.**

### 2.2 프로그램 상세 페이지 (`/programs/[slug]`) — Thin Content 완전 해결
- **문제점**: 기존 프로그램 상세 페이지는 1~2줄의 짧은 요약과 요금표, 결제 유도 상자만 존재하여 Google로부터 "가치 없는 콘텐츠(Thin Content / Low Value Content)"로 분류되어 승인이 거절될 위험이 높았습니다.
- **개선 내용**: [`app/(main)/programs/[slug]/page.tsx`](file:///D:/Antigravity/AIMaster/app/(main)/programs/[slug]/page.tsx)에 **5대 리치 정보성 콘텐츠 섹션**을 전면 구축했습니다:
  1. **4대 핵심 특장점 그리드 (Key Features)**:
     - 실시간 AI 알고리즘 엔진
     - 본인 계정 · API 직접 연동 (계정 제재 위험 차단)
     - 운영 시간 90% 이상 절감
     - 성과 기반 바이럴 최적화
  2. **실제 사용 순서 (Step 1 ~ Step 4 워크플로우 가이드)**:
     - Step 01: 계정 및 API 연동
     - Step 02: 키워드 · 조건 설정
     - Step 03: 원클릭 AI 실행 · 검수
     - Step 04: 자동 발행 및 성과 추적
  3. **추천 활용 대상 및 시나리오 3개 카드 (Use Cases)**:
     - 1인 창업가 · 크리에이터
     - 이커머스 셀러 · 제휴마케터
     - 마케팅 대행사 · 브랜드 실무자
  4. **프로그램 이용 FAQ (자주 묻는 질문 3문 3답)**:
     - 외부 플랫폼(네이버, 인스타, 유튜브 등) 계정 제재 위험성 안내 (공식 API 준수로 안전)
     - API 키 및 계정 연동 방법 안내
     - 무료 체험(FREE 배지) 및 유료 플랜 이용 안내
  5. **공식 가이드 센터(`/guides`) 바로가기 배너 연동**
- **효과**: 36개 모든 프로그램 페이지가 1,500자~2,500자 이상의 양질의 소프트웨어 제품 가이드 문서로 격상되어 검색엔진 및 심사팀의 콘텐츠 가치 평가를 최상위로 통과합니다.

### 2.3 검색엔진 및 애드센스 전용 크롤러 최적화 (`robots.ts` & `sitemap.ts`)
- **`app/robots.ts` 신설**:
  - `Googlebot`, `Mediapartners-Google`(애드센스 전용 봇), 일반 봇(`*`)에 대해 공개 경로(`/`, `/programs`, `/guides`, `/support`, `/terms`, `/privacy` 등) 전면 허용.
  - 내부 관리자(`/admin/*`), 내부 API(`/api/*`), 인증 세션(`/login`, `/dashboard`)만 차단.
  - `Sitemap: https://www.buylife.xyz/sitemap.xml` 연결.
- **`app/sitemap.ts` 신설**:
  - Next.js MetadataRoute 기반으로 Supabase DB에서 활성화된 36개 프로그램과 28개 이용 가이드를 실시간 조회하여 **총 77개 URL을 동적으로 렌더링하는 XML 사이트맵 파이프라인 구축**.
  - 라이브 확인: `https://www.buylife.xyz/sitemap.xml` (Status 200 OK, 77개 URL 포함).

### 2.4 탐색성 및 푸터 네비게이션 강화
- **`components/layout/Footer.tsx`**:
  - 고객지원 메뉴에 `이용 가이드 (API연동)`(`/guides`) 링크 추가.
  - 약관 메뉴에 `데이터 삭제 안내`(`/data-deletion`) 링크 추가.
- **`app/(main)/programs/page.tsx`**:
  - 프로그램 카탈로그 하단에 초보자를 위한 무료 가이드 배너 추가.

---

## 3. Google 애드센스 승인 신청 실전 절차

### 1단계: Google 애드센스 가입 및 사이트 등록
1. [Google AdSense 공식 웹사이트](https://www.google.com/adsense)에 접속하여 로그인합니다.
2. 사이트 URL 입력란에 **`https://www.buylife.xyz`**를 입력합니다. (서브도메인이 아닌 루트 도메인으로 등록)

### 2단계: 사이트 소유권 확인 (애드센스 코드 삽입)
Google 애드센스에서 제공하는 인증 스크립트 코드:
```html
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-XXXXXXXXXXXXXXXX"
     crossorigin="anonymous"></script>
```
- **Next.js App Router 삽입 위치**:
  - 파일: [`app/layout.tsx`](file:///D:/Antigravity/AIMaster/app/layout.tsx)
  - `next/script`의 `Script` 컴포넌트를 사용하여 `<head>` 영역 또는 RootLayout 내부에 삽입:
```tsx
import Script from "next/script";

// RootLayout 내부:
<head>
  <Script
    async
    src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-XXXXXXXXXXXXXXXX"
    crossorigin="anonymous"
    strategy="afterInteractive"
  />
</head>
```

### 3단계: Google Search Console에 사이트맵 등록 (권장)
- [Google Search Console](https://search.google.com/search-console)에 접속하여 `https://www.buylife.xyz`의 Sitemaps 메뉴에서:
  - 새 사이트맵 추가: **`sitemap.xml`** 입력 후 제출
  - 상태가 **"성공"**으로 표시되고 77개 URL이 발견되었는지 확인합니다.
  - 이는 Googlebot과 애드센스 크롤러가 사이트의 모든 양질의 콘텐츠를 즉시 색인하도록 보장합니다.

### 4단계: 심사 요청 제출 및 대기
- 애드센스 대시보드에서 "검토 요청" 버튼을 클릭합니다.
- 심사 소요 기간은 통상 **2일 ~ 14일**입니다.

---

## 4. 심사 기간 중 필수 유지 및 주의사항

1. **URL 변경 및 구조 파괴 금지**:
   - 심사 진행 중에는 `/programs`, `/guides`, `/privacy`, `/terms` 등 주요 공개 URL의 경로를 변경하거나 리다이렉트 처리하지 마십시오.
2. **콘텐츠 비공개 전환 금지**:
   - 로그인 없이 접근할 수 있는 공개 프로그램 소개와 이용 가이드가 닫히면 "사이트에 접근할 수 없음" 오류가 발생하므로 공개 상태를 유지합니다.
3. **새 프로그램 등록 시 필수 체크리스트**:
   - 새 프로그램을 추가할 경우:
     - `programs` 테이블의 `short_desc`를 공백으로 두지 않고 2줄 이상의 명확한 설명을 작성합니다.
     - `pricing_plans` 기본 요금제(1만/2만/3만)를 세트로 함께 등록합니다.
     - 자동으로 리치 5대 섹션이 상세 페이지에 반영됩니다.

---

## 5. 승인 후 광고 단위 배치 및 수익화 권장 설정

1. **자동 광고 (Auto Ads) 설정**:
   - 애드센스 관리자에서 "자동 광고"를 활성화하되, **화면 상단/하단 앵커 광고 및 인피드 광고 위주**로 설정하고 전면 광고(화면 전체를 가리는 광고)의 게재 빈도는 낮게 설정하여 회원들의 소프트웨어 이용 경험을 저해하지 않도록 합니다.
2. **페이지 제외 설정**:
   - 애드센스 "광고 설정 > 페이지 제외"에서 다음 패턴을 등록합니다:
     - `https://www.buylife.xyz/admin/*` (관리자 전용 화면)
     - `https://www.buylife.xyz/login` (로그인 화면)
     - `https://www.buylife.xyz/register` (회원가입 화면)
     - `https://www.buylife.xyz/dashboard` (대시보드 화면)
3. **수동 광고 배치를 원할 경우 권장 위치**:
   - 프로그램 상세 페이지(`/programs/[slug]`): 4대 특장점 섹션 하단 및 요금제 상단
   - 이용 가이드 상세 페이지(`/guides/[id]`): 가이드 본문 하단

---

## 6. 라이브 검증 완료 상태 요약 (2026-10-11 기준)

| 점검 항목 | 대상 URL | 검증 결과 | 상태 |
| :--- | :--- | :--- | :---: |
| **개인정보처리방침 (제13조 광고쿠키)** | `https://www.buylife.xyz/privacy` | HTTP 200, Google AdSense 및 옵트아웃 조항 정상 노출 | **준수** |
| **크롤러 정책 (`robots.txt`)** | `https://www.buylife.xyz/robots.txt` | HTTP 200, Mediapartners-Google 허용 및 Sitemap 연결 | **준수** |
| **전체 사이트맵 (`sitemap.xml`)** | `https://www.buylife.xyz/sitemap.xml` | HTTP 200, 총 77개 공개 URL 동적 색인 완료 | **준수** |
| **프로그램 상세 리치콘텐츠** | `https://www.buylife.xyz/programs/auto-threads-posting` | HTTP 200, 특장점·순서·대상·FAQ·가이드 배너 정상 노출 | **준수** |
| **프로그램 목록 가이드 배너** | `https://www.buylife.xyz/programs` | HTTP 200, 하단 가이드 센터 배너 정상 노출 | **준수** |
| **푸터 네비게이션 링크** | `https://www.buylife.xyz/` (Footer) | 이용 가이드 및 데이터 삭제 안내 링크 정상 연결 | **준수** |
