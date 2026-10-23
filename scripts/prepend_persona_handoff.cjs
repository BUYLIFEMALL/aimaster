const fs = require('fs');
let c = fs.readFileSync('docs/HANDOFF.md', 'utf8');

const newEntry = `## 2026-10-16 Antigravity(Windows) — 페르소나 문체 자동화 v1.07: 포커스 스튜디오 디자인 리뉴얼 & 전 화면 단일 배경색(#f8fafc) 일체화 및 비주얼 가이드북 전면 고도화 완료

- **대상 프로그램**: \`persona-style-studio/\` (slug: \`persona-style-studio\`, 공식 라이브: \`https://persona-style-studio.buylife.xyz/\`, 배포 버전: \`v1.07\`)
- **적용 디자인 템플릿**: **포커스 스튜디오 스타일 (Focus Studio Style · 문체 변환 스튜디오, 라이트 클린 슬레이트 \`#f8fafc\`, 화이트 카드, 바이올렛/퍼플 \`#7c3aed\`~\`#4f46e5\` 포인트)**
- **인수인계 문서**:
  - 개발 플랜: [\`persona-style-studio/docs/PLAN_20261016_DESIGN_RENEWAL.md\`](../persona-style-studio/docs/PLAN_20261016_DESIGN_RENEWAL.md)
  - 개선사항 목록: [\`persona-style-studio/docs/IMPROVEMENTS.md\`](../persona-style-studio/docs/IMPROVEMENTS.md)
  - 개선사항 인수인계: [\`persona-style-studio/docs/IMPROVEMENT_HANDOFF_20261016.md\`](../persona-style-studio/docs/IMPROVEMENT_HANDOFF_20261016.md)
  - 디자인 완료 인수인계: [\`persona-style-studio/docs/DESIGN_HANDOFF.md\`](../persona-style-studio/docs/DESIGN_HANDOFF.md)
- **주요 작업 내용**:
  1. **전체 화면 단일 클린 슬레이트 배경(\`bg-[#f8fafc]\`) 및 일관된 테마 스타일 준수**:
     - \`src/app/globals.css\`: \`:root { --background: #f8fafc; --foreground: #0f172a; }\` 고정.
     - \`src/app/(dashboard)/layout.tsx\`: \`bg-[#f8fafc] font-sans text-slate-900 antialiased\`로 전 화면 통일.
     - \`src/components/layout/Sidebar.tsx\`: 사이드바 유틸리티 영역을 표준 \`📖 연동 & 사용 매뉴얼\` 및 \`🔑 API키등록·플랫폼연동\`으로 정돈.
  2. **📖 연동 & 사용 매뉴얼 (\`/guide\`) 비주얼 가이드북 전면 고도화**:
     - \`src/app/(dashboard)/guide/page.tsx\`: 5단계 파이프라인 인포그래픽(API 키 ➔ 원문 입력 ➔ 페르소나 선택 ➔ 5대 슬라이더 조절 ➔ 실시간 2단 비교 & 복사).
     - 5대 문체 이퀄라이저 파라미터 매트릭스 치트시트(공손도, 문장길이, 전문성, 이모지, 서사성).
     - 프로 팁 카드 2종 (되돌리기 안심 설계, 초안/TXT/JSON 백업).
     - 자주 묻는 질문(FAQ) 4종 아코디언 컴포넌트 탑재.
     - 회원 본인 API 키 직접 연동 보안 원칙 배너 탑재.
  3. **버전 동기화 & 프로덕션 배포**:
     - \`src/lib/version.ts\`: \`v1.07\`, \`package.json\`: \`1.7.0\`, Supabase DB \`programs.version = 'v1.07'\` 동기화.
     - Next.js Turbopack 로컬 빌드 성공 (\`npm run build\`, 12개 라우트 정상).
     - Vercel 프로덕션 배포 완료 (\`https://persona-style-studio.buylife.xyz\`).
  4. **Microsoft Edge 전용 실세션 검수 완료 (7종 스크린샷 캡처)**:
     - \`edge_persona_guide_desktop_v107.png\`: 데스크톱 가이드북 헤더 및 5단계 파이프라인 확인.
     - \`edge_persona_guide_pipeline_v107.png\`: 문체 파라미터 매트릭스 및 프로 팁 확인.
     - \`edge_persona_guide_faq_v107.png\`: FAQ 아코디언 및 보안 배너 확인.
     - \`edge_persona_studio_desktop_v107.png\`: 변환 스튜디오 메인 화면 클린 슬레이트/화이트 일체감 확인.
     - \`edge_persona_settings_desktop_v107.png\`: API 키 연동 설정 화면 일체감 확인.
     - \`edge_persona_studio_mobile_v107.png\`: 모바일 390px 스튜디오 반응형 점검 완료.
     - \`edge_persona_guide_mobile_v107.png\`: 모바일 390px 가이드북 반응형 점검 완료.
  5. **현황판 상태 및 인수인계 완료**:
     - \`DESIGN.md\` 10번 프로그램 상태: \`✅ 1차 작업완료 (v1.07, 포커스 스튜디오 스타일)\` 갱신.
     - \`docs/ACTIVE_WORK.md\`: 작업 중 행 삭제 완료.

`;

c = c.replace('# 작업 인수인계 현황판 (HANDOFF.md)\n\n', '# 작업 인수인계 현황판 (HANDOFF.md)\n\n' + newEntry);
if (!c.includes('v1.07: 포커스 스튜디오 디자인 리뉴얼')) {
  // If CRLF
  c = c.replace('# 작업 인수인계 현황판 (HANDOFF.md)\r\n\r\n', '# 작업 인수인계 현황판 (HANDOFF.md)\r\n\r\n' + newEntry.replace(/\n/g, '\r\n'));
}

fs.writeFileSync('docs/HANDOFF.md', c, 'utf8');
console.log('Successfully prepended persona-style-studio to HANDOFF.md');
