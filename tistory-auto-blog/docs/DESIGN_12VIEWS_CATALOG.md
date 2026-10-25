# 티스토리 자동화 4대 핵심 화면 3시안 공식 디자인 레퍼런스 (DESIGN_12VIEWS_CATALOG.md)

> **최초 작성**: 2026-10-25 (주인님 지시: 「지금 작업한 것 디자인 리뉴얼 페이지에 업데이트해놓고 다음번 작업 시 참고할 수 있도록 해」)  
> **검수 브라우저**: **네이버 웨일(Whale) 실제 창(포그라운드)** 데스크톱 1440px 고해상도 실세션 검수 완료  
> **쇼케이스 실행기**: \`scratch/tistory_showcase_12views.html\`  
> **연계 마스터 문서**: [\`DESIGN.md\`](../../DESIGN.md) (원칙 21, 23, 24, 25, 26), [\`docs/DESIGN_TEMPLATE_CATALOG.md\`](../../docs/DESIGN_TEMPLATE_CATALOG.md), [\`docs/PROGRAM_REDESIGN_GROUPING_ROADMAP.md\`](../../docs/PROGRAM_REDESIGN_GROUPING_ROADMAP.md)

---

## 1. 개요 및 4대 핵심 화면별 3대 시안 요약

AIMaster의 최우선 지침에 따라, 프로그램 전면 재작업 시 코드를 확정하기 전에 **1) 메인 스튜디오 3종, 2) 원고 상세 결과 3종, 3) 사용자 매뉴얼(\`/guide\`) 3종, 4) 플랫폼 및 API 연동(\`/settings\`) 3종 (총 12개 뷰)**를 사전 제작하여 네이버 웨일 브라우저에서 검수 완료하였습니다.

### 3대 템플릿 스타일 컨셉 비교
1. **시안 1: 클린 에디토리얼 오렌지 스타일 (Clean Editorial Orange Style)**
   - **배경**: 퓨어 화이트 (\`#ffffff\`) & 소프트 슬레이트 (\`#f8fafc\`)
   - **포인트**: 티스토리 오리지널 오렌지 (\`#ea580c\` ~ \`#ff7e36\`), 3D 엠보싱 오렌지 버튼
   - **특징**: 2열 분할 워크스페이스, 3종 포스팅 모드(발행전까지/즉시/예약) 라디오 위젯, 2단 분리형 API 키 카드 표준
2. **시안 2: 옵시디언 다크 스튜디오 스타일 (Obsidian Dark Studio Style)**
   - **배경**: 퓨어 옵시디언 블랙 (\`#0c0f17\`) & 다크 서피스 (\`#161c28\`)
   - **포인트**: 네온 앰버 (\`#f59e0b\`) & 일렉트릭 바이올렛 (\`#8b5cf6\`)
   - **특징**: 3열 매트릭스 콘솔, 상단 3대 KPI 게이지 (SEO 96점, 독서시간, 이미지수), 암호화 볼트 API 허브
3. **시안 3: 모던 플로우 위저드 스타일 (Modern Flow Wizard Style)**
   - **배경**: 딥 네이비 & 소프트 펄 그레이 (\`#f1f5f9\` / \`#ffffff\`)
   - **포인트**: 로열 블루 (\`#2563eb\`) & 에메랄드 (\`#10b981\`)
   - **특징**: 1→2→3→4 스텝별 프로그레스 타임라인, 거대 액션 카드 덱, 모듈형 플러그앤플레이 커넥터

---

## 2. 4대 화면별 12개 뷰 스크린샷 레퍼런스

- **메인 스튜디오 (3종)**:
  - 시안 1: \`scratch/showcase_screenshots/01_main_concept1_clean_editorial.png\`
  - 시안 2: \`scratch/showcase_screenshots/02_main_concept2_obsidian_dark.png\`
  - 시안 3: \`scratch/showcase_screenshots/03_main_concept3_flow_wizard.png\`
- **원고 상세 결과 (3종)**:
  - 시안 1: \`scratch/showcase_screenshots/04_detail_concept1_clean_editorial.png\`
  - 시안 2: \`scratch/showcase_screenshots/05_detail_concept2_obsidian_dark.png\`
  - 시안 3: \`scratch/showcase_screenshots/06_detail_concept3_flow_wizard.png\`
- **사용자 매뉴얼 (\`/guide\`) (3종)**:
  - 시안 1: \`scratch/showcase_screenshots/07_guide_concept1_clean_editorial.png\`
  - 시안 2: \`scratch/showcase_screenshots/08_guide_concept2_obsidian_dark.png\`
  - 시안 3: \`scratch/showcase_screenshots/09_guide_concept3_flow_wizard.png\`
- **플랫폼 및 API 설정 (\`/settings\`) (3종)**:
  - 시안 1: \`scratch/showcase_screenshots/10_settings_concept1_clean_editorial.png\`
  - 시안 2: \`scratch/showcase_screenshots/11_settings_concept2_obsidian_dark.png\`
  - 시안 3: \`scratch/showcase_screenshots/12_settings_concept3_flow_wizard.png\`

---

## 3. 다음 작업 시 필수 구현 가이드라인

1. **3D 엠보싱 버튼 필수 적용**:
   - 실행 버튼, 크롬 확장 다운로드 링크, API 발급 ↗ 링크는 반드시 3D 엠보싱 스타일(\`box-shadow: 0 5px 0 ...\`, 호버 \`-1.5px\`, 클릭 시 \`translateY(4px)\`)로 구현합니다.
2. **2단 분리형 카드 API 키 표준 준수**:
   - 1행 상단 [엔진명 + 뱃지 + 역할설명 한줄 + 3D 발급 버튼], 2행 하단 [마스킹 키 박스 + 넓은 모델 셀렉트박스 + 수정/삭제] 구조를 100% 유지합니다.
3. **블로그 핵심 3대 포스팅 방식 선택권 보장**:
   - 웹 내에서 글·이미지 완성 ➔ 크롬 확장이 플랫폼 글쓰기 에디터에 자동 입력 ➔ 회원이 직접 ⓐ 발행 전까지, ⓑ 실제 포스팅, ⓒ 예약 포스팅 선택.
