const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

// 1. DESIGN.md 수정
const designFile = path.join(root, 'DESIGN.md');
if (fs.existsSync(designFile)) {
  let content = fs.readFileSync(designFile, 'utf8').replace(/\r\n/g, '\n');

  const charterAddition = `
---

> **🎬 영상·음악 분야 공식 레퍼런스 템플릿 지정 헌장 (2026-10-29 주인님 절대 지시: 「디자인 UI 템플릿은 잘되어있는 것 같아. 영상이나 음악쪽 작업시 레퍼런스 템플릿으로 참고하면 좋을 것같아. 이 템플릿의 이름을 등록하고 레퍼런스로 삼아」, 모든 AI 코딩 에이전트·모든 CLI 공통 영구 준수)**
> ① **공식 레퍼런스 템플릿 명칭**: **「시네마틱 앰버 렌더 스튜디오 스타일 (Cinematic Amber Render Studio Style)」** (약칭: **시네마틱 렌더 스튜디오**)
> ② **기준 공식 구현체**: **AI 영상렌더 스튜디오** (\`video-to-gif\` \`v1.25\`, \`https://video-to-gif.buylife.xyz\`)
> ③ **레퍼런스 지정 분야**: 향후 신규 개발 또는 리뉴얼되는 **영상 및 음악 관련 프로그램 전체 (영상 편집/트랜스코딩/인코딩, 오디오/음악 생성·플레이어, 사운드 마스터링, 비디오 툴 등)**의 1순위 대표 벤치마크 레퍼런스 템플릿으로 공식 지정.
> ④ **5대 핵심 디자인 시그니처 표준**:
>    1. **배경 & 서피스**: 딥 옵시디언 나이트 블랙 (\`#090d13\` / \`#161b22\`) 베이스에 세련된 정밀 하드웨어 테두리 (\`#30363d\`).
>    2. **시그니처 포인트 컬러**: 프로페셔널 앰버 골드 (\`#f59e0b\` ~ \`#b45309\`), 실시간 펄스 인디케이터 (\`● REC STANDBY 00:00:00:00\`), 사이언 가속 칩 (\`#06b6d4\`).
>    3. **프레임 메타포**: 시네마틱 뷰파인더 코너 브래킷 (\`⌜ ⌟\`) 카드 프레임 및 NLE 에디터 OSD 레이아웃.
>    4. **파이프라인 UX**: 넘버링 원형 배지가 적용된 단계별 시각적 작업 순서 가이드 (1. 파일 등록 ➔ 2. 가속 렌더링 ➔ 3. 다운로드).
>    5. **컨트롤 프리셋 3D 버튼**: 앰버 골드 및 슬레이트 3D 엠보싱 버튼 (프레임레이트 40fps/50fps, 해상도 560px/780px 등 쾌속 전환).
`;

  const targetPoint = '## 1. 공식 디자인 템플릿 시스템';
  if (content.includes(targetPoint)) {
    content = content.replace(targetPoint, charterAddition + '\n' + targetPoint);
  }

  // 템플릿 표 라인 418 업데이트
  content = content.replace(
    '| **12. 시네마틱 렌더 스튜디오 스타일<br>(Cinematic Render Studio Style)** |',
    '| **12. 시네마틱 앰버 렌더 스튜디오 스타일<br>(Cinematic Amber Render Studio Style)**<br>★ **영상·음악 대표 레퍼런스** |'
  );

  fs.writeFileSync(designFile, content, 'utf8');
  console.log('DESIGN.md updated successfully');
}

// 2. docs/PROGRAM_DESIGN_STANDARD.md 수정
const progFile = path.join(root, 'docs/PROGRAM_DESIGN_STANDARD.md');
if (fs.existsSync(progFile)) {
  let content = fs.readFileSync(progFile, 'utf8').replace(/\r\n/g, '\n');

  const progAddition = `\n\n## §15. 영상·음악 분야 공식 레퍼런스 템플릿 규격: 「시네마틱 앰버 렌더 스튜디오」 (2026-10-29 주인님 확정)

### 15.1 제정 배경 및 레퍼런스 선정 이유
- 주인님 평가: *"디자인 UI 템플릿은 잘되어있는 것 같아. 영상이나 음악쪽 작업시 레퍼런스 템플릿으로 참고하면 좋을 것같아. 이 템플릿의 이름을 등록하고 레퍼런스로 삼아"* (2026-10-29 지시)
- \`video-to-gif\`(AI 영상렌더 스튜디오 \`v1.25\`)의 디자인 UI가 전문 스튜디오급의 완성도와 사용자 편의성, 다크 앰버의 고급스러운 시각적 몰입감을 입증받아, **영상·음악 카테고리 전체의 공식 최우선 레퍼런스 템플릿**으로 지정되었습니다.

### 15.2 템플릿 프로필 및 핵심 스펙
1. **공식 명칭**: **「시네마틱 앰버 렌더 스튜디오 스타일 (Cinematic Amber Render Studio Style)」**
2. **기준 구현체**: \`video-to-gif\` (\`https://video-to-gif.buylife.xyz\`)
3. **색상 팔레트**:
   - 메인 배경: 딥 옵시디언 블랙 (\`#090d13\`)
   - 카드 서피스: 다크 차콜 (\`#161b22\`), 테두리 (\`#30363d\`)
   - 시그니처 악센트: 앰버 골드 (\`#f59e0b\` ~ \`#b45309\`), 레코딩 레드 (\`#ef4444\`), 사이언 (\`#06b6d4\`)
4. **시그니처 UI 요소**:
   - 뷰파인더 코너 브래킷 (\`⌜ ⌟\`)으로 둘러싸인 전문 미디어 캔버스
   - 타임코드 인디케이터 (\`● REC STANDBY 00:00:00:00\`)
   - 상단 4K/FHD 듀얼 엔진 브리프 & 100% 클라이언트 사이드 WASM 보증 칩
   - 프리셋 3D 엠보싱 버튼 (호버 시 부유, 클릭 시 3px 눌림)
5. **적용 권장 분야**:
   - 영상/비디오: 쇼츠/릴스 생성, 비디오 인코딩/트랜스코딩, 애니메이션/GIF 스튜디오, 웹 비디오 툴
   - 음악/오디오: Suno/Udio 프롬프트 작곡기, 뮤직 플레이어, 사운드 마스터링/EQ 콘솔, 오디오 비주얼라이저
`;

  fs.appendFileSync(progFile, progAddition, 'utf8');
  console.log('PROGRAM_DESIGN_STANDARD.md updated successfully');
}

// 3. docs/roles/design.md 수정
const roleFile = path.join(root, 'docs/roles/design.md');
if (fs.existsSync(roleFile)) {
  let content = fs.readFileSync(roleFile, 'utf8').replace(/\r\n/g, '\n');
  const roleAddition = `| 2026-10-29 | 전체 영상·음악 프로그램 | **「시네마틱 앰버 렌더 스튜디오 스타일」** 영상·음악 공식 대표 레퍼런스 템플릿 지정(\`video-to-gif\` v1.25 기준) 및 \`DESIGN.md\`, \`PROGRAM_DESIGN_STANDARD.md\` 지침 공식 등재 (2026-10-29 주인님 지시) | 지침 반영 완료 |\n`;
  content = content.replace('## 최근 완료 (최근 10개)\n| 날짜 | 프로그램·버전 | 한 일 | 배포 |\n|---|---|---|---|\n', '## 최근 완료 (최근 10개)\n| 날짜 | 프로그램·버전 | 한 일 | 배포 |\n|---|---|---|---|\n' + roleAddition);
  fs.writeFileSync(roleFile, content, 'utf8');
  console.log('docs/roles/design.md updated successfully');
}
