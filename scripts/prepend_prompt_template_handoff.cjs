const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'docs', 'HANDOFF.md');
const content = fs.readFileSync(file, 'utf8');

const newSection = `## 2026-10-16 Antigravity(Windows) — AI 프롬프트 템플릿 자동화 v1.04: 포커스 스튜디오 디자인 리뉴얼 & 전 화면 단일 배경색(#f8fafc) 일체화 및 비주얼 가이드북 전면 신설 완료

- **대상 프로그램**: \`prompt-template-studio/\` (slug: \`prompt-template-studio\`, 공식 라이브: \`https://prompt-template.buylife.xyz/\`, 배포 버전: \`v1.04\`)
- **적용 디자인 템플릿**: **포커스 스튜디오 스타일 (Focus Studio Style · 프롬프트 템플릿 스튜디오, 라이트 클린 슬레이트 \`#f8fafc\`, 화이트 카드, 블루/인디고 \`#2563eb\`~\`#4f46e5\` 포인트)**
- **인수인계 문서**:
  - 개발 플랜: [\`prompt-template-studio/docs/PLAN_20261016_DESIGN_RENEWAL.md\`](../prompt-template-studio/docs/PLAN_20261016_DESIGN_RENEWAL.md)
  - 개선사항 목록: [\`prompt-template-studio/docs/IMPROVEMENTS.md\`](../prompt-template-studio/docs/IMPROVEMENTS.md)
  - 개선사항 인수인계: [\`prompt-template-studio/docs/IMPROVEMENT_HANDOFF_20261016.md\`](../prompt-template-studio/docs/IMPROVEMENT_HANDOFF_20261016.md)
  - 디자인 완료 인수인계: [\`prompt-template-studio/docs/DESIGN_HANDOFF.md\`](../prompt-template-studio/docs/DESIGN_HANDOFF.md)
- **주요 작업 내용**:
  1. **전체 화면 단일 클린 슬레이트 배경(\`bg-[#f8fafc]\`) 및 일관된 테마 스타일 준수**:
     - \`src/app/globals.css\`: 기본 body 배경을 \`bg-[#f8fafc] text-slate-900\`으로 고정.
     - \`src/components/PromptTemplateApp.tsx\`: 탭별(\`library\`, \`guide\`) 렌더링 컨테이너를 단일 \`#f8fafc\` 배경색 및 화이트 카드로 통일, URL 쿼리 파라미터(\`?tab=\`)와 SPA 상태 완전 동기화.
     - \`src/components/Sidebar.tsx\`: 사이드바 \`bg-white border-slate-200\`, 블루/인디고 활성 배지, 계정 정보 12px 간격 밀착 정렬, 유틸리티 영역 최상단에 \`📖 연동 & 사용 매뉴얼\` 메뉴 탑재.
  2. **📖 연동 & 사용 매뉴얼 (\`/guide\` & \`?tab=guide\`) 비주얼 가이드북 전면 신설**:
     - \`src/components/PromptGuideView.tsx\`: 5단계 파이프라인 인포그래픽(API 키 ➔ 템플릿 탐색/제작 ➔ AI 3단 어시스턴트 ➔ AI 변수 자동채우기/실행 ➔ JSON 백업).
     - \`{{동적 변수}}\` 문법 및 카테고리별 실전 템플릿 모범 예시 3종 (비즈니스 이메일, 시니어 코드 리뷰어, SNS 마케팅 바이럴 카피) 원클릭 복사 탑재.
     - 프롬프트 엔지니어링 4대 골든 룰 (페르소나, 포맷 지정, 제약 조건, 변수화).
     - 자주 묻는 질문(FAQ) 4종 아코디언 컴포넌트 탑재.
     - \`src/app/guide/page.tsx\`: \`/guide\` 직접 URL 접근 라우트 신설.
  3. **버전 동기화 & 프로덕션 배포**:
     - \`src/lib/version.ts\`: \`v1.04\`, \`package.json\`: \`1.4.0\`, Supabase DB \`programs.version = 'v1.04'\` 동기화.
     - Next.js Turbopack 로컬 빌드 성공 (\`npm run build\`, 8개 라우트 정상).
     - Vercel 프로덕션 배포 완료 (\`https://prompt-template.buylife.xyz\`).
  4. **Microsoft Edge 전용 실세션 검수 완료 (6종 스크린샷 캡처)**:
     - \`edge_prompt_guide_desktop_v104.png\`: 데스크톱 가이드북 헤더 및 5단계 파이프라인 확인.
     - \`edge_prompt_guide_pipeline_v104.png\`: 변수 문법 모범 예시 및 프롬프트 골든 룰 확인.
     - \`edge_prompt_guide_faq_v104.png\`: FAQ 아코디언 및 하단 보안 안내 카드 확인.
     - \`edge_prompt_library_desktop_v104.png\`: 템플릿 라이브러리 화면 클린 슬레이트/화이트 일체감 확인.
     - \`edge_prompt_library_mobile_v104.png\`: 모바일 390px 라이브러리 반응형 점검 완료.
     - \`edge_prompt_guide_mobile_v104.png\`: 모바일 390px 가이드북 반응형 점검 완료.
  5. **현황판 상태 및 인수인계 완료**:
     - \`DESIGN.md\` 9번 프로그램 상태: \`✅ 1차 작업완료 (v1.04, 포커스 스튜디오 스타일)\` 갱신.
     - \`docs/ACTIVE_WORK.md\`: 작업 중 행 삭제 완료.

`;

const match = content.match(/^# 작업 인수인계 현황판 \(HANDOFF\.md\)\r?\n\r?\n/);
if (match) {
  const rest = content.slice(match[0].length);
  fs.writeFileSync(file, match[0] + newSection + rest, 'utf8');
  console.log('Successfully updated HANDOFF.md');
} else {
  console.error('Could not match HANDOFF.md header');
}
