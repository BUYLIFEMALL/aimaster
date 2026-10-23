const fs = require('fs');
let c = fs.readFileSync('DESIGN.md', 'utf8');

c = c.replace('✅ 13개 · ⚪ 68개', '✅ 14개 · ⚪ 67개');

c = c.replace(
  /\| 11 \| AI Prompt 자동화[^\r\n]+/,
  '| 11 | AI Prompt 자동화 | `ai-prompt-studio` | **포커스 스튜디오 스타일** (프롬프트 엔지니어링 스튜디오) | 라이트(클린 슬레이트 `#f8fafc`) | ✅ 1차 작업완료 (`v1.05`, 포커스 스튜디오 스타일) | [`ai-prompt-studio/docs/DESIGN_HANDOFF.md`](ai-prompt-studio/docs/DESIGN_HANDOFF.md) |'
);

fs.writeFileSync('DESIGN.md', c, 'utf8');
console.log('Successfully updated row 11 in DESIGN.md to completed state');
