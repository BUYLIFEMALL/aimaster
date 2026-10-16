const fs = require('fs');
let c = fs.readFileSync('docs/HANDOFF.md', 'utf8');

const newEntry = `## 2026-10-17 Antigravity(Windows) — AI Prompt 자동화 v1.05: 포커스 스튜디오 디자인 리뉴얼 & 전 화면 단일 배경색(#f8fafc) 일체화 및 비주얼 가이드북 전면 신설 완료

- **대상 프로그램**: \`ai-prompt-studio/\` (slug: \`ai-prompt-studio\`, 공식 라이브: \`https://ai-prompt.buylife.xyz/\`, 배포 버전: \`v1.05\`)
- **적용 디자인 템플릿**: **포커스 스튜디오 스타일 (Focus Studio Style · 프롬프트 엔지니어링 스튜디오, 라이트 클린 슬레이트 \`#f8fafc\`, 화이트 카드, 바이올렛/인디고 \`#7c3aed\`~\`#4f46e5\` 포인트)**
- **인수인계 문서**:
  - 개발 플랜: [\`ai-prompt-studio/docs/PLAN_20261017_DESIGN_RENEWAL.md\`](../ai-prompt-studio/docs/PLAN_20261017_DESIGN_RENEWAL.md)
  - 개선사항 목록: [\`ai-prompt-studio/docs/IMPROVEMENTS.md\`](../ai-prompt-studio/docs/IMPROVEMENTS.md)
  - 개선사항 인수인계: [\`ai-prompt-studio/docs/IMPROVEMENT_HANDOFF_20261017.md\`](../ai-prompt-studio/docs/IMPROVEMENT_HANDOFF_20261017.md)
  - 디자인 완료 인수인계: [\`ai-prompt-studio/docs/DESIGN_HANDOFF.md\`](../ai-prompt-studio/docs/DESIGN_HANDOFF.md)
- **주요 작업 내용**:
  1. **전체 화면 단일 클린 슬레이트 배경(\`bg-[#f8fafc]\`) 및 일관된 테마 스타일 준수 (최상단 지침 11번)**:
     - \`src/app/globals.css\`: \`:root { --background: #f8fafc; --foreground: #0f172a; }\` 고정.
     - \`src/components/PromptStudioApp.tsx\`: 최상위 컨테이너 \`min-h-screen bg-[#f8fafc]\` 적용으로 모드 선택, 빌더, 결과, 가이드북 전체 탭에서 단일 배경색 일체화.
     - \`src/components/Sidebar.tsx\`: 사이드바 유틸리티 영역을 표준 \`📖 연동 & 사용 매뉴얼\` 및 \`🔑 API키등록·플랫폼연동\`으로 정돈.
  2. **📖 연동 & 사용 매뉴얼 (\`/guide\` & \`currentTab = 'guide'\`) 비주얼 가이드북 전면 신설 (최상단 지침 7번)**:
     - \`src/components/PromptGuideView.tsx\`: 5단계 파이프라인 인포그래픽(API 키 ➔ 5대 모드 선택 ➔ 실시간 AI 3단 어시스턴트 ➔ 메타 프롬프트 원클릭 생성 & 검수 ➔ 클립보드 복사 & 실전 AI 실행).
     - 5대 프롬프트 프레임워크 매트릭스 치트시트(RTSC, CoT, Few-Shot, Persona, Dynamic Variable).
     - 실전 프로 팁 카드 2종 (역질문 기법, 엄격한 출력 서식 제약).
     - 자주 묻는 질문(FAQ) 4종 아코디언 컴포넌트 탑재.
     - 회원 본인 API 키 직접 연동 보안 원칙 배너 탑재.
     - \`src/app/guide/page.tsx\`: \`/guide\` 독립 브라우저 접속 라우트 신설.
  3. **버전 동기화 & 프로덕션 배포**:
     - \`src/lib/version.ts\`: \`v1.05\`, \`package.json\`: \`1.5.0\`, Supabase DB \`programs.version = 'v1.05'\` 동기화 완료.
     - Next.js Turbopack 로컬 빌드 성공 (\`npm run build\`, 8개 라우트 정상).
     - Vercel 프로덕션 배포 완료 (\`https://ai-prompt.buylife.xyz\`).
  4. **Microsoft Edge 전용 실세션 검수 완료 (7종 스크린샷 캡처)**:
     - \`edge_prompt_studio_guide_desktop_v105.png\`: 데스크톱 가이드북 헤더 및 5단계 파이프라인 확인.
     - \`edge_prompt_studio_guide_pipeline_v105.png\`: 프레임워크 매트릭스 및 프로 팁 확인.
     - \`edge_prompt_studio_guide_faq_v105.png\`: FAQ 아코디언 및 보안 배너 확인.
     - \`edge_prompt_studio_mode_desktop_v105.png\`: 모드 선택 스튜디오 메인 화면 클린 슬레이트/화이트 일체감 확인.
     - \`edge_prompt_studio_build_desktop_v105.png\`: 엔지니어링 빌더 화면 단일 테마 확인.
     - \`edge_prompt_studio_mobile_home_v105.png\`: 모바일 390px 홈 반응형 점검 완료.
     - \`edge_prompt_studio_mobile_guide_v105.png\`: 모바일 390px 가이드북 반응형 점검 완료.
  5. **현황판 상태 및 인수인계 완료**:
     - \`DESIGN.md\` 11번 프로그램 상태: \`✅ 1차 작업완료 (v1.05, 포커스 스튜디오 스타일)\` 갱신.
     - \`docs/ACTIVE_WORK.md\`: 작업 중 행 삭제 완료.

`;

c = c.replace('# 작업 인수인계 현황판 (HANDOFF.md)\n\n', '# 작업 인수인계 현황판 (HANDOFF.md)\n\n' + newEntry);
if (!c.includes('v1.05: 포커스 스튜디오 디자인 리뉴얼')) {
  c = c.replace('# 작업 인수인계 현황판 (HANDOFF.md)\r\n\r\n', '# 작업 인수인계 현황판 (HANDOFF.md)\r\n\r\n' + newEntry.replace(/\n/g, '\r\n'));
}

fs.writeFileSync('docs/HANDOFF.md', c, 'utf8');
console.log('Successfully prepended ai-prompt-studio to HANDOFF.md');
