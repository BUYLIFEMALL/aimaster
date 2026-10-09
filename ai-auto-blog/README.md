# BLOG(원문)생성 자동화 — AIMaster 통합 DB 사용

AIMaster 공용 Supabase(`esgxyikcnnvmlhygjkth`)에서 회원 본인의 글·작성자·API 키를 사용합니다.
공통 카테고리 변경은 관리자만 가능합니다. 라이브: https://ai-auto-blog-one.vercel.app.

2026-10-10 승인된 DB 보안 정책을 적용했습니다. **v1.39 릴리스 검수 중**입니다.
로그인·이용 권한·소유권 검사, 인증 없는 글 조회 제거, 관리자 카테고리 API,
서비스 키 폴백 제거를 구현했습니다. 빌드·39개 보안 검사 통과.
운영 API 비로그인 401·no-store 및 상세 화면 307을 확인했습니다.
7개 테이블 본인 데이터 격리·익명 접근 차단·관리자 분류 변경 정책 적용 완료.
DB 검증 27개·REST 익명 차단 7곳 통과, 기존 데이터 전체 내용 지문 일치.
실제 BLOG 회원 화면 검수·옛 서비스 키 폐기는 미완료입니다.
다음 작업자는 [보안 검토 기록](docs/SECURITY_REVIEW_2026-10-10.md)을 먼저 확인합니다.

## 실행 방법 (Getting Started)

1. **환경 변수 구성**: `.env.local` 파일에 AIMaster 공용 Supabase 연결 설정을 등록합니다. 서버 서비스 키는 서버 환경변수로만 관리합니다.
2. **개발 서버 실행**:

```bash
npm run dev
```

[http://localhost:3000](http://localhost:3000) 접속하여 확인합니다.

3. **데이터베이스 가이드**: 자세한 마이그레이션과 스키마 정보는 [docs/SUPABASE_SETUP.md](docs/SUPABASE_SETUP.md)를 참고하세요.

---

## 주요 기능 및 트러블슈팅 이력

### 📌 AI 생성 프롬프트 복사(Copy Prompt) 이벤트 위임 패턴 (2026-09-28)
- **문제**: 블로그 상세 보기에서 "📋 프롬프트 복사" 버튼 클릭 시 마크다운 변환 인라인 `onclick` 스크립트가 DOM 구조 변경이나 과거 DB 저장글(107번 포스트 등)에서 정상 작동하지 않던 현상.
- **해결**:
  - `ai-auto-blog/app/posts/[id]/page.tsx`에 **Client-side Event Delegation** 적용 (`handleContentClick`).
  - 클릭된 요소가 복사 버튼인 경우 다중 DOM 트래버스(Sibling -> Parent -> Following DOM Node)로 프롬프트 구문(`code`)을 탐색하여 복사 후 `✓ 복사완료!` 피드백 노출.
  - 상세 내용은 루트 `docs/PLATFORM_PATTERNS.md` §26 참조.
