# 🟢 Naver Cafe Poster — 네이버 카페 포스팅 자동화 (v1.20)

> **공식 서비스 URL**: [https://naver-cafe-poster.buylife.xyz](https://naver-cafe-poster.buylife.xyz)  
> **공식 가이드북**: [https://naver-cafe-poster.buylife.xyz/guide](https://naver-cafe-poster.buylife.xyz/guide)  
> **현재 버전**: `v1.20` (플로우 위저드 스타일 — 네이버 카페 그린 에디션)

AIMaster 회원이 본인 네이버 계정을 연동하고 본인이 활동하는 카페 게시판을 등록하면, AI가 작성한 맞춤형 게시글을 그 카페에 자동으로 등록해주는 멀티테넌시 자동화 프로그램입니다.

---

## 🎨 주요 디자인 및 아키텍처 특징 (v1.20)

1. **플로우 위저드 스타일 — 네이버 카페 그린 에디션**:
   - 네이버 고유의 그린(`--brand: #03c75a`) 및 웜 슬레이트 라이트(`--background: #f8fafc`) 테마 적용.
   - 사이드바 내 1-2-3-4 단계 넘버링 스텝퍼 (`주제 수집` ➔ `초안 확인` ➔ `AI 글쓰기` ➔ `게시글 관리`).
   - 모바일(767px 이하) 반응형 헤더 & 햄버거 토글 드로어 완비.
2. **독립 비주얼 가이드북 (`/guide`) 전면 신설**:
   - 4단계 출판 파이프라인 다이어그램.
   - 카페 `club_id` 및 게시판 `menu_id` 추출 비주얼 매트릭스.
   - 3대 소스(URL, RSS NewsBlur, Perplexity 실시간 검색) 비교표.
   - 자주 묻는 질문 FAQ 5종 아코디언 제공.
3. **100% BYOK 보안 원칙**:
   - 회원 본인이 발급한 네이버 개발자센터 앱(Client ID/Secret) 및 본인 AI API 키(OpenAI/Perplexity/Gemini)만 사용.
   - 네이버 공식 Cafe API(OAuth 2.0)를 통한 100% 합법적이고 안전한 포스팅 보장.

---

## 🚀 빠른 시작

```bash
# 1. 패키지 설치
npm install

# 2. 로컬 개발 서버 실행
npm run dev

# 3. 프로덕션 빌드
npm run build
```

---

## 📂 관련 인수인계 문서
- [AGENTS.md](AGENTS.md): 7대 핵심 항목 개발 인수인계 가이드
- [docs/DESIGN_HANDOFF.md](docs/DESIGN_HANDOFF.md): 디자인 개발완료 보고서
- [docs/IMPROVEMENTS.md](docs/IMPROVEMENTS.md): 프로그램 개선 제안서 (3대 필수 관점)
- [docs/IMPROVEMENT_BACKLOG.md](docs/IMPROVEMENT_BACKLOG.md): 작업 대기 백로그
- [docs/PLAN_20261019_DESIGN_RENEWAL.md](docs/PLAN_20261019_DESIGN_RENEWAL.md): 사전 개발 플랜 원본 및 검수 결과
