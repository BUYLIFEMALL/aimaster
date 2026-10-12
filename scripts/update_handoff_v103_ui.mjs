import fs from "node:fs";

const path = "D:/Antigravity/AIMaster/docs/HANDOFF.md";
let content = fs.readFileSync(path, "utf8");

const newEntry = `## 2026-10-13 Antigravity — Youtube Playlist 자동화 (yt-playlist-studio v1.03) 채널 로고 · GIF 스티커 정사각형 박스화 & 배경 미디어 세로 비율 확장 완료

주인님 요청("채널로고,gif 스티커 를 정사각형 박스로 만들어줘 배경미디어도 너무 좌우로 기니까 가로폭 비율을 밑에 정사각형 박스에 맞추어 세로를 좀더 비율적으로 맞게 길게 해주고")에 따라, 오리지널 레퍼런스 규격에 맞추어 미디어 센터 우측 업로드 박스들의 비율과 시각적 밸런스를 완벽하게 개선하여 프로덕션 배포 완료했습니다:

1. **채널 로고 & GIF 스티커 박스 정사각형화**:
   - 기존의 납작한 \`h-24\` 직사각형에서 완벽한 \`aspect-square\` 1:1 정사각형 박스로 변경.
   - 업로드 전 상태: 중앙 미니 아이콘(이미지 아이콘, GIF 뱃지) + "+ 로고 추가", "+ GIF 추가" 텍스트 수직 중앙 정렬.
   - 업로드 후 상태: \`object-contain\` 이미지 노출, 호버 시 오버레이 "변경" 및 개별 "삭제" 버튼 추가.
2. **배경 미디어 박스 세로 비율 확장**:
   - 기존의 납작한 \`h-44\`(176px)에서 \`h-60 sm:h-64\`(240~256px)로 세로 높이를 시원하게 확장.
   - 하단 2개 정사각형 박스의 전체 폭과 유기적인 16:10 황금 비율을 이루도록 시각적 균형감 완성.
   - 배경 이미지/영상 등록 시 호버 변경 및 삭제 버튼 지원.
3. **버전 및 형상 관리**:
   - 버전: \`v1.03\` 상향 (\`version.ts\`, \`package.json\`, Supabase DB \`programs.version = 'v1.03'\` 일괄 동기화 완료).
   - 공식 도메인: [https://youtube-playlist.buylife.xyz](https://youtube-playlist.buylife.xyz) 프로덕션 배포 완료.

---

`;

const match = content.match(/^# 작업 인수인계 현황판 \(HANDOFF\.md\)[\r\n]+/);
if (match) {
  content = match[0] + newEntry + content.slice(match[0].length);
  fs.writeFileSync(path, content, "utf8");
  console.log("Updated HANDOFF.md successfully for v1.03");
} else {
  console.log("Header not matched in HANDOFF.md");
}
