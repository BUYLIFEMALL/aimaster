# AI 이미지 스튜디오 (ai-image-studio) — 디자인 리뉴얼 인수인계서 (DESIGN_HANDOFF.md)

> **프로그램명**: AI 이미지 스튜디오 (`ai-image-studio`)  
> **공식 서비스 URL**: [https://ai-image-studio.buylife.xyz](https://ai-image-studio.buylife.xyz)  
> **적용 버전**: `v1.12`  
> **작성 일자**: 2026-10-17  
> **담당 CLI**: Antigravity CLI (`agy`)  
> **검수 브라우저**: **Microsoft Edge 전용 (Edge 1440px 데스크톱 & 375px 모바일 반응형 실세션 검수 완료)**

---

## 1. 공식 디자인 템플릿 명칭 및 컨셉
- **공식 템플릿명**: **크리에이티브 아틀리에 럭셔리 다크 스타일 템플릿 (Creative Atelier Luxury Dark Style Template)**
- **디자인 컨셉**:
  - 전문 예술가의 디지털 작업실(Atelier)에 들어선 듯한 프리미엄 감성의 다크 아틀리에 룩.
  - 딥 블랙(`bg-[#09090b]`) 베이스에 미세한 24px 모눈 격자 텍스처와 은은한 앰버/골드 네온 글로우를 배합하여 고품격 크리에이티브 환경을 제공.
  - 전 화면(로그인, 가이드, 작업실 대시보드, 갤러리)의 배경색과 테마를 100% 일체화하여 화면 전환 시의 이질감을 원천 차단.

---

## 2. 컬러 토큰 및 비주얼 시스템
- **Base Background**: `#09090b` (딥 차콜 블랙 일체화)
- **Grid Pattern**: 24px 모눈 격자 (`rgba(245, 158, 11, 0.04)`)
- **Card Surface**: `bg-zinc-900/80` (테두리 `border-zinc-800`, hover 시 `border-zinc-700`)
- **Primary Accent**: `amber-400` / `amber-500` (골드 앰버 그라데이션)
- **Status & Recommended Badges**:
  - `emerald-400` (연동 완료 및 💡 최저가 테스트 모델 뱃지)
  - `amber-400` (👑 하이엔드 4K 레퍼런스 모델 뱃지)
  - `red-400` (🚫 부정 프롬프트 배제 칩)
- **Typography & Icons**: `text-zinc-100` (Primary), `text-zinc-400` (Secondary), Lucide React 아이콘.

---

## 3. 핵심 리뉴얼 컴포넌트 구조
1. **공식 표준 로그인 레이아웃 (`app/login/layout.tsx`, `page.tsx`)**:
   - 루트 `threads-comment-reply/app/(auth)` 기준 공식 표준 100% 동기화.
   - 상단 44px 🎨 브랜드 로고 + 타이틀 + 안내 서브텍스트.
   - 알약형 `[로그인] / [회원가입]` 2버튼 탭 토글 바 (`mb-6 flex rounded-full bg-zinc-900 p-1`).
   - SVG 아이콘 인풋 필드, 비밀번호 찾기 링크, 하단 매뉴얼 바로가기 링크, 법적 고지 푸터.
2. **비주얼 사용 매뉴얼 (`components/ImageGuideView.tsx`, `app/guide/page.tsx`)**:
   - 5단계 파이프라인 카드(키 등록 -> 키워드 입력 -> 프롬프트 강화 -> 모델 생성 -> 갤러리 보관).
   - 실전 프롬프트 4대 골든 팁(포토리얼리즘, 한국인 인물 기준, 텍스트 배제, 일관성 유지).
   - 최상위 불변 원칙 보안 배너(무과금 원천 차단, 30일 격리 소유권, 암호화 세션).
   - 4종 FAQ 아코디언 카드 (비로그인 공개 열람 지원).
3. **사이드바 내비게이션 (`components/layout/Sidebar.tsx`)**:
   - 상단에 `📖 연동 & 사용 매뉴얼` 배너 버튼 탑재 및 다크 룩 일체화.
4. **마스터 프롬프트 생성기 (`Step1PromptEnhancer.tsx`)**:
   - `IMAGE_PROMPT_RULES` 공식 표준 5대 핵심 레퍼런스 원칙 배너 탑재.
   - 16종 화풍 프리셋 그리드 및 각 10종 총 160개 추천 태그 칩.
5. **다중 모델 생성기 (`Step2PlatformGenerator.tsx`)**:
   - 33종 플래그십 모델 셀렉터 및 최저가($0.0336) 권장 뱃지.
   - Replicate OpenAPI 동적 스키마 폼 렌더러 연동.

---

## 4. Microsoft Edge 실세션 검수 결과
- **검수 도구**: Microsoft Edge (`msedge`, headless)
- **검수 계정**: 일반 회원 테스트 계정 `buylifemall@naver.com` 세션 연동
- **아티팩트 캡처 목록**:
  1. `edge_image_studio_login_desktop_v112.png` (데스크톱 로그인 화면 1440px)
  2. `edge_image_studio_guide_desktop_v112.png` (데스크톱 사용 매뉴얼 1440px)
  3. `edge_image_studio_dashboard_desktop_v112.png` (데스크톱 작업실 대시보드 1440px)
  4. `edge_image_studio_login_mobile_v112.png` (모바일 로그인 화면 375px)
  5. `edge_image_studio_guide_mobile_v112.png` (모바일 사용 매뉴얼 375px)
  6. `edge_image_studio_dashboard_mobile_v112.png` (모바일 작업실 대시보드 375px)
- **반응형 검증**: 375px 모바일 화면에서 가로 스크롤 깨짐 없이 모든 컴포넌트가 부드럽게 1열 적응 스택됨 확인.

---

## 5. 차기 CLI 작업자를 위한 주의사항
1. **타 프로그램과의 레퍼런스 관계**: 이 프로그램의 `lib/providers/adapters/*.ts`는 플랫폼 전체의 이미지 생성 레퍼런스 코드입니다. 다른 프로그램에서 이미지 생성 기능을 만들 때는 이 프로그램의 어댑터를 복사/참조하십시오.
2. **비용 최소화 규칙**: 신규 모델 테스트 시 절대 고가 모델을 대량 호출하지 마시고, `Google Gemini 3.1 Flash Lite Image 1K` ($0.0336) 모델로 1회 한정 검증하십시오.
3. **배포 시 도메인 Alias 확인**: Vercel 프로덕션 배포 시 `ai-image-studio.buylife.xyz` 외에 레거시 도메인 `ai-image-studio.vercel.app`에도 alias가 제대로 할당되었는지 확인하십시오.

## 2026-10-20 v1.21 개인 화풍 프롬프트 UI (Codex)
- 기존 블랙/앰버 테마 유지, 기본 예시/나만의 프롬프트 탭·개수·화풍 필터·검색. 본문은 접힌 미리보기/전문 펼침·복사, 개인 영역에 30일 기한 안내·삭제예정일.
- 일반 회원은 개인 버전 만들기와 본인 사본 관리만 표시. 기본 원본 관리 버튼은 기존 관리자 조건 유지.
- native dialog로 키보드 초점과 Esc 처리, 입력칸 접근성 이름/길이 제한, 저장 중 중복 클릭 차단. 375px 편집창은 화면 안에서 스크롤되며 표는 가로 넘김. 메뉴 전체 배치는 이번에 변경하지 않음.
- 매뉴얼 /guide#custom-prompts에 4단계 시각 카드·바로가기·30일 안내.
- 보이는 Edge 가상 회원 2명 1440/375 검수 증거는 docs/evidence/custom-prompts-v121/. 실제 운영 회원 실세션 검수 상태는 IMPROVEMENT_HANDOFF_20261020_CUSTOM_STYLE_PROMPTS.md에 별도 기록.


## 2026-10-20 v1.22 — 문서 챗봇 기준 메뉴 레이아웃 (Codex)
- 제목/버전·카탈로그 링크·아이콘 작업 메뉴·도움말 및 설정·계정 밀착으로 정렬. 주인님 제시 화면에 따라 번호형 메뉴의 해당 앱 예외로 적용. 모바일 접는 메뉴/Escape/활성 표시를 함께 반영.
- 빌드·보이는 Edge 1440/375·낮은 높이·767/768 전환 검사 통과. [계획](PLAN_20261020_SIDEBAR_ALIGNMENT.md) · [운영 결과/인수인계](IMPROVEMENT_HANDOFF_20261020_SIDEBAR_ALIGNMENT.md).
