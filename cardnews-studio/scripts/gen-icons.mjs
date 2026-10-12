// lucide-react(ISC) 아이콘 24개를 캔버스 Path2D로 그릴 수 있는 path 문자열로 바꿔 src/lib/cardnews/iconData.ts에 쓴다.
import fs from "node:fs";

const ICONS = [
  ["book-open", "책"], ["pen-line", "펜·글쓰기"], ["brain", "두뇌·생각"], ["trending-up", "상승 그래프"], ["lightbulb", "전구·아이디어"],
  ["target", "목표"], ["rocket", "로켓·성장"], ["clock", "시계·시간"], ["heart", "하트"], ["star", "별"], ["coins", "동전·재테크"],
  ["wallet", "지갑"], ["chart-line", "차트"], ["utensils", "식사"], ["coffee", "커피"], ["map-pin", "위치"], ["sparkles", "반짝임"],
  ["shirt", "옷·패션"], ["camera", "카메라"], ["circle-check", "체크"], ["users", "사람들"], ["shield-check", "보호·안심"],
  ["flame", "불꽃·열정"], ["gift", "선물"],
];

const f = (n) => Number(n.toFixed(3));
function toPath(tag, a) {
  const n = (k, d = 0) => Number(a[k] ?? d);
  switch (tag) {
    case "path": return a.d;
    case "line": return `M${n("x1")} ${n("y1")}L${n("x2")} ${n("y2")}`;
    case "polyline": return "M" + a.points.trim().split(/\s+/).join("L");
    case "polygon": return "M" + a.points.trim().split(/\s+/).join("L") + "Z";
    case "circle": { const cx = n("cx"), cy = n("cy"), r = n("r"); return `M${f(cx - r)} ${cy}a${r} ${r} 0 1 0 ${f(2 * r)} 0a${r} ${r} 0 1 0 ${f(-2 * r)} 0`; }
    case "ellipse": { const cx = n("cx"), cy = n("cy"), rx = n("rx"), ry = n("ry"); return `M${f(cx - rx)} ${cy}a${rx} ${ry} 0 1 0 ${f(2 * rx)} 0a${rx} ${ry} 0 1 0 ${f(-2 * rx)} 0`; }
    case "rect": {
      const x = n("x"), y = n("y"), w = n("width"), h = n("height"), r = Math.min(n("rx", n("ry")), w / 2, h / 2);
      if (!r) return `M${x} ${y}h${w}v${h}h${-w}Z`;
      return `M${x + r} ${y}h${w - 2 * r}a${r} ${r} 0 0 1 ${r} ${r}v${h - 2 * r}a${r} ${r} 0 0 1 ${-r} ${r}h${-(w - 2 * r)}a${r} ${r} 0 0 1 ${-r} ${-r}v${-(h - 2 * r)}a${r} ${r} 0 0 1 ${r} ${-r}Z`;
    }
    default: throw new Error("지원하지 않는 태그: " + tag);
  }
}

const out = {};
for (const [id] of ICONS) {
  const file = `node_modules/lucide-react/dist/esm/icons/${id}.mjs`;
  const src = fs.readFileSync(file, "utf8");
  const m = /const __iconData = (\{[\s\S]*?\n\});/.exec(src);
  const data = new Function("return " + m[1])();
  out[id] = data.node.map(([tag, attrs]) => toPath(tag, attrs));
}
const labels = Object.fromEntries(ICONS);
const body = `// 자동 생성 파일(scripts/gen-icons.mjs). lucide-react(ISC 라이선스) 아이콘 24종의 path 데이터(24×24 기준 선 아이콘).
export const ICON_PATHS: Record<string, string[]> = ${JSON.stringify(out, null, 2)};

export const ICON_LABELS: Record<string, string> = ${JSON.stringify(labels, null, 2)};
`;
fs.writeFileSync("src/lib/cardnews/iconData.ts", body);
console.log("ok", Object.keys(out).length, body.length);
