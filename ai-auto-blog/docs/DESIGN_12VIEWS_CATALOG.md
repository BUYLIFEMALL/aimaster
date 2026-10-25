# 네이버 실시간 이슈 AI 자동 블로그 4대 핵심 화면 3시안 공식 디자인 레퍼런스 (DESIGN_12VIEWS_CATALOG.md)

> **최초 작성**: 2026-10-25 (주인님 승인: 「이작업 진행해」, 시안 1 네이버 스마트 그린 저널 스타일 확정 적용)  
> **검수 브라우저**: **네이버 웨일(Whale) 실제 창(포그라운드)** 데스크톱 1440px 고해상도 실세션 검수 완료  
> **쇼케이스 실행기**: `scratch/ai_auto_blog_showcase_12views.html`  
> **프로덕션 배포**: `https://ai-auto-blog.buylife.xyz` (v1.82)  
> **연계 마스터 문서**: [`DESIGN.md`](../../DESIGN.md) (원칙 21, 23, 24, 25, 26), [`docs/DESIGN_TEMPLATE_CATALOG.md`](../../docs/DESIGN_TEMPLATE_CATALOG.md), [`docs/PROGRAM_REDESIGN_GROUPING_ROADMAP.md`](../../docs/PROGRAM_REDESIGN_GROUPING_ROADMAP.md)

---

## 1. 개요 및 4대 핵심 화면별 3대 시안 요약

주인님의 4대 화면 3시안 사전 승인 지침에 따라, 네이버 실시간 이슈 AI 자동 블로그(`ai-auto-blog`)의 **1) 메인 스튜디오 3종, 2) 원고 상세 결과 3종, 3) 사용자 매뉴얼(`/guide`) 3종, 4) 플랫폼 및 API 연동(`/settings`) 3종 (총 12개 뷰)**를 사전 제작하여 네이버 웨일 브라우저에서 검수 완료하고, 주인님 승인에 따라 **시안 1(네이버 스마트 그린 저널 스타일)**을 프로덕션에 확정 적용하였습니다.

### 3대 템플릿 스타일 컨셉 비교
1. **시안 1: 네이버 스마트 그린 저널 스타일 (Naver Smart Green Journal Style) — [★ 확정 채택]**
   - **배경**: 퓨어 화이트 (`#ffffff`) & 소프트 세이지 그린 (`#f0fdf4`)
   - **포인트**: 네이버 시그니처 딥 에메랄드 (`#059669` ~ `#10b981`), 3D 엠보싱 그린 버튼 (`.btn-3d-green`)
   - **특징**: 2열 분할 에디토리얼 워크스페이스, 크롬 확장 자동 포스팅 3종 모드(발행 전까지/즉시 발행/예약 발행) 라디오 카드 칩셋, 2단 분리형 API 키 카드 표준
   - **선정 이유**: 네이버 스마트에디터 환경과 완벽히 호환되는 신뢰감 높은 그린 톤앤매너와 직관적인 포스팅 3대 모드 선택 UI 제공.
2. **시안 2: 실시간 이슈 다크 레이더 콘솔 스타일 (Realtime Dark Radar Console Style) — [자산화]**
   - **배경**: 딥 사이버 슬레이트 (`#0f172a` ~ `#020617`) & 다크 서피스
   - **포인트**: 네온 시안 (`#06b6d4`) & 일렉트릭 그린 (`#10b981`)
   - **특징**: 실시간 급상승 키워드 트렌드 레이더 모니터링 매트릭스 콘솔, 글래스모피즘 HUD 패널, 상단 실시간 지표 & AI 파이프라인 모니터, 볼트 보안 키 카드
3. **시안 3: 오토 파이프라인 위저드 스타일 (Auto Pipeline Flow Wizard Style) — [자산화]**
   - **배경**: 콤팩트 펄 그레이 (`#f8fafc`) & 퓨어 화이트
   - **포인트**: 딥 에메랄드 그린 (`#059669`)
   - **특징**: 1→2→3 단계별 파이프라인 인터랙티브 인디케이터, 집중형 파이프라인 카드 덱, 콤팩트 유틸리티 룩

---

## 2. 4대 화면별 12개 뷰 스크린샷 레퍼런스

- **메인 스튜디오 (3종)**:
  - 시안 1: `scratch/ai_auto_blog_screenshots/01_main_concept1_smart_green.png`
  - 시안 2: `scratch/ai_auto_blog_screenshots/02_main_concept2_dark_radar.png`
  - 시안 3: `scratch/ai_auto_blog_screenshots/03_main_concept3_pipeline_wizard.png`
- **원고 상세 결과 (3종)**:
  - 시안 1: `scratch/ai_auto_blog_screenshots/04_detail_concept1_smart_green.png`
  - 시안 2: `scratch/ai_auto_blog_screenshots/05_detail_concept2_dark_radar.png`
  - 시안 3: `scratch/ai_auto_blog_screenshots/06_detail_concept3_pipeline_wizard.png`
- **사용자 매뉴얼 (`/guide`) (3종)**:
  - 시안 1: `scratch/ai_auto_blog_screenshots/07_guide_concept1_smart_green.png`
  - 시안 2: `scratch/ai_auto_blog_screenshots/08_guide_concept2_dark_radar.png`
  - 시안 3: `scratch/ai_auto_blog_screenshots/09_guide_concept3_pipeline_wizard.png`
- **플랫폼 및 API 설정 (`/settings`) (3종)**:
  - 시안 1: `scratch/ai_auto_blog_screenshots/10_settings_concept1_smart_green.png`
  - 시안 2: `scratch/ai_auto_blog_screenshots/11_settings_concept2_dark_radar.png`
  - 시안 3: `scratch/ai_auto_blog_screenshots/12_settings_concept3_pipeline_wizard.png`

---

## 3. 프로덕션 실세션 네이버 웨일 브라우저 검증

- **실제 배포 주소**: `https://ai-auto-blog.buylife.xyz`
- **메인 페이지 검증**: `scratch/ai_auto_blog_live_home_verified.png`
- **글쓰기 폼 검증 (포스팅 3종 모드 & 3D 버튼)**: `scratch/ai_auto_blog_live_write_verified.png`
