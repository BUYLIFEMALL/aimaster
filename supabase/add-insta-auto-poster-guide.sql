-- =============================================
-- platform_guides 테이블에 "인스타그램 계정 연동하기 (자동포스팅)" 매뉴얼 등록 SQL
-- Web/Admin (/admin/guides) 관리 및 /guides 공개 페이지용
-- =============================================

INSERT INTO platform_guides (category, title, content, sort_order, is_active)
VALUES (
  'SNS',
  '인스타그램 계정 연동하기 (자동포스팅)',
  '# 📸 인스타그램 계정 연동하기 (자동포스팅)

> 💡 **Meta 앱 검수(App Review) 없이 본인 계정에서 인스타그램 피드/릴스 자동 포스팅 시스템을 구축하는 1단계~8단계 전체 매뉴얼입니다.**

---

### 📋 [사전 준비] 인스타그램 계정 상태 확인
⚠️ **개인 계정은 인스타그램 API 정책상 자동 포스팅이 불가능합니다.**

1. **프로페셔널 계정 전환**: 본인 스마트폰 인스타그램 앱 ➔ `프로필` ➔ `설정 및 개인정보` ➔ `계정 유형 및 도구` 이동 ➔ **프로페셔널 계정(비즈니스 또는 크리에이터)**으로 전환합니다.
2. **Facebook 페이지 연결**: 인스타그램 계정을 본인의 **Facebook 페이지(Page)**와 연결해 둡니다.

---

### 1단계: 내 앱 추가 (Meta Developer Portal)
1. **[Meta Developer Portal](https://developers.facebook.com/)** 접속 ➔ 로그인
2. 우측 상단 **[내 앱]** ➔ **[앱 만들기]** (또는 기존 연동할 앱 선택) 클릭
3. 앱 유형을 **비즈니스(Business)**용으로 선택 후 앱 생성을 완료합니다.

---

### 2단계: 필수 권한(Permissions) 추가
1. 앱 대시보드 ➔ 왼쪽 메뉴 **[이용 사례]** (또는 제품) ➔ **비즈니스용 Facebook / Instagram API** 선택
2. **[권한 및 기능]** 탭에서 아래 자동 포스팅 필수 권한들이 추가되어 있는지 확인하고 클릭하여 추가합니다:
   * 🟢 `instagram_basic` 또는 `instagram_business_basic` (기본 비즈니스 정보 액세스)
   * 🟢 `instagram_content_publish` (⭐ **인스타 자동 포스팅 핵심 권한!**)
   * 🟢 `pages_read_engagement` (연결된 Facebook 페이지 권한 확인)
   * 🟢 `pages_show_list` (Facebook 페이지 목록 표시)

---

### 3단계: 앱 역할 및 테스터 추가 (앱 검수 없이 바로 쓰기!)
1. 앱 대시보드 ➔ **[앱 역할]** ➔ **[역할]** 메뉴로 이동합니다.
2. **Instagram 테스터** 및 **Facebook 테스터** 세션에서 **[테스터 추가]** 버튼을 클릭합니다.
3. 연동하여 사용할 본인의 계정 아이디를 등록합니다.

---

### 4단계: 웹훅(Webhook) 설정
1. 앱 대시보드 ➔ **[웹훅]** 메뉴로 이동합니다.
2. **콜백 URL (Callback URL)** 입력란에 아래 자동 포스팅 웹훅 주소를 입력합니다:
   ```text
   https://insta-auto-poster-red.vercel.app/api/instagram/callback
   ```
3. **인증 토큰 (Verify Token)**: `insta-auto-poster` Vercel 환경변수에 지정된 `INSTAGRAM_VERIFY_TOKEN` (보안 비밀키)을 입력 후 **[확인 및 저장]**을 클릭합니다.

---

### 5단계: 비즈니스 로그인 설정
1. 왼쪽 메뉴 **[비즈니스용 Facebook]** ➔ **[설정]**으로 이동합니다.
2. **유효한 OAuth 리디렉션 URI** 칸에 아래 주소를 입력합니다:
   ```text
   https://insta-auto-poster-red.vercel.app/api/instagram/callback
   ```
3. 하단의 **[변경사항 저장]**을 클릭합니다.

---

### 6단계: 리다이렉트 URL 설정 (프로그램별 3가지 구분)
💡 **사용하는 프로그램 종류에 따라 올바른 메뉴 위치에 URL을 등록해 주어야 합니다.**

| 기능 / 연동 종류 | 설정 메뉴 경로 | 사용 프로그램 예시 및 리디렉션 URL |
| :--- | :--- | :--- |
| **비즈니스용 Facebook 로그인** | 비즈니스용 Facebook ➔ 설정 ➔ 유효한 OAuth 리디렉션 URI | **`insta_auto_poster` (인스타 자동 포스팅)**<br>`https://insta-auto-poster-red.vercel.app/api/instagram/callback` |
| **Instagram 로그인 (Instagram API)** | 이용 사례 ➔ Instagram API ➔ 설정 ➔ 유효한 OAuth 리디렉션 URI | **`instagram-dm-reply` (DM 자동 답변)**<br>**`instagram-comment-reply` (댓글 자동 답글)** |
| **Threads API 액세스** | 이용 사례 ➔ Threads API 액세스 ➔ 설정 ➔ 리디렉션 클릭 URL | **`threads` (쓰레드 자동 포스팅)**<br>**`threads-comment-reply` (쓰레드 댓글)**<br>**`threads-affiliate-poster` (쓰레드 제휴)** |

---

### 7단계: 인스타그램 앱 내 테스터 승인 (📱 스마트폰 설정)
1. 스마트폰에서 **Instagram 앱** 실행 ➔ `프로필` ➔ 우측 상단 **[ ☰ 메뉴 ]** 클릭
2. **[설정 및 개인정보]** ➔ **[웹사이트 권한]** ➔ **[앱 및 웹사이트]** 이동
3. **테스터 초대** 탭으로 가서 **[승인]**을 클릭합니다.

---

### 8단계: 플랫폼 웹 서비스 로그인 & 최종 연동 완료
1. **[인스타그램 자동 포스팅 웹사이트 (`https://insta-auto-poster-red.vercel.app`)]** 접속 ➔ 로그인
2. **[Facebook으로 로그인]** 버튼 클릭
3. 포스팅을 게시할 **Facebook 페이지** 및 연결된 **Instagram 비즈니스 계정** 선택
4. 요청하는 모든 미디어 게시 권한(`instagram_content_publish`) 허용 동의 후 완료!
5. 웹 프로그램 대시보드에서 **[자동 포스팅 봇 활성화]** 스위치를 ON으로 켜면 완료됩니다. 🎉

---

### 💡 핵심 요약 정리
* **3단계 & 5단계**: OAuth 리디렉트 URL 입력 (`https://insta-auto-poster-red.vercel.app/api/instagram/callback`)
* **4단계**: Webhooks 콜백 URL 및 인증 토큰 입력
* **5단계 & 7단계**: **Instagram 테스터**에 내 인스타 아이디 추가 ➔ 인스타 앱에서 테스터 승인',
  10,
  true
);
