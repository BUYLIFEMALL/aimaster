# DevFlow 블로그 (`AIMaster_dev` 통합 DB 사용)

DevFlow는 `AIMaster_dev` 프로젝트 가이드에 따라 개발된 블로그 프로그램입니다.
통합 Supabase 데이터베이스(`AIMaster_dev`) 환경에서 `blog_` 접두사가 부여된 데이터베이스 개체를 공유하여 동작합니다.

## 실행 방법 (Getting Started)

1. **환경 변수 구성**: `.env.local` 파일에 Supabase `AIMaster_dev` 프로젝트의 URL과 Key 입력
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

