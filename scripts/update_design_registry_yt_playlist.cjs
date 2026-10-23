const fs = require('fs');
let c = fs.readFileSync('DESIGN.md', 'utf8');

c = c.replace(
  /\| 12 \| Youtube Playlist 자동화[^\r\n]+/,
  '| 12 | Youtube Playlist 자동화 | `yt-playlist-studio` | **유튜브 다크 콘솔 스타일** (YouTube Dark Console Style) | 다크(옵시디언 블랙 `#0f0f0f` + 유튜브 레드 `#ff0000`) | 🔵 작업 중 (Antigravity(Windows), 2026-10-17) | `yt-playlist-studio/AGENTS.md` |'
);

fs.writeFileSync('DESIGN.md', c, 'utf8');
console.log('Successfully updated row 12 in DESIGN.md to working state');
