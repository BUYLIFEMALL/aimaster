const fs = require('fs');
let c = fs.readFileSync('DESIGN.md', 'utf8');
c = c.replace(
  /\| 10 \| 페르소나 문체 자동화[^\r\n]+/,
  '| 10 | 페르소나 문체 자동화 | `persona-style-studio` | **포커스 스튜디오 스타일** (문체 변환 스튜디오) | 라이트(클린 슬레이트 `#f8fafc`) | ✅ 1차 작업완료 (`v1.07`, 포커스 스튜디오 스타일) | [`persona-style-studio/docs/DESIGN_HANDOFF.md`](persona-style-studio/docs/DESIGN_HANDOFF.md) |'
);
fs.writeFileSync('DESIGN.md', c, 'utf8');
console.log('Successfully updated row 10 in DESIGN.md');
