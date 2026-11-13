// v1.57 검토용: 기존 프리셋 461개의 공식 장르 연결 결과를 표로 출력한다(사람 검토 단계).
// 실행: node --import tsx scripts/preset-genre-link-report.mjs [--md 파일]
import fs from "node:fs";
import { linkPresetGenre, linkedGenreText } from "../lib/studio/presetGenreLink.ts";

const metadata = JSON.parse(fs.readFileSync(new URL("../lib/studio/catalog-metadata.json", import.meta.url), "utf8"));
const rows = metadata.map((p) => {
  const l = linkPresetGenre(p.name, p.group);
  return { id: p.id, name: p.name, group: p.group, link: l };
});
const strong = rows.filter((r) => r.link && !r.link.weak).length;
const weak = rows.filter((r) => r.link?.weak).length;
const none = rows.filter((r) => !r.link).length;
const lines = [
  `| 프리셋 | 그룹 | 연결 공식 장르 | Style 장르 칸 | 근거 |`,
  `|---|---|---|---|---|`,
  ...rows.map(
    (r) =>
      `| ${r.name.replace(/\|/g, "/")} | ${r.group.replace(/\|/g, "/")} | ${
        r.link ? `${r.link.genre.ko} · ${r.link.genre.name}` : "연결 없음"
      } | ${r.link ? linkedGenreText(r.link) : "(기존 그대로)"} | ${
        r.link ? (r.link.from === "name" ? "이름" : "그룹") + (r.link.weak ? "·약함(배지만)" : "") : "-"
      } |`,
  ),
];
const summary = `전체 ${rows.length} · 확실한 연결 ${strong} · 약한 연결(배지만) ${weak} · 연결 없음 ${none}`;
const md = process.argv.indexOf("--md");
if (md > 0) fs.writeFileSync(process.argv[md + 1], `${summary}\n\n${lines.join("\n")}\n`);
console.log(summary);
if (md < 0) console.log(lines.join("\n"));
