import type { Plan } from "./types";

// 「🧩 UI Canvas로 보내 다듬기」(2026-10-21 v1.11) — 기획안을 UI Canvas 자동화 프로젝트 문서로 바꾼다(AI 없이 규칙으로).
// 문서 모양은 ui-canvas/src/lib/canvas/types.ts의 ProjectDoc·CanvasComponent와 같아야 한다(저장 표 ui_canvas_projects.doc).
/* eslint-disable @typescript-eslint/no-explicit-any */
interface CanvasComponent {
  id: string;
  name: string;
  type: "Text" | "Button" | "Container";
  position: { x: number; y: number };
  size: { width: number; height: number };
  props: Record<string, any>;
  styles: Record<string, any>;
  description: string;
  isLocked?: boolean;
}

const W = 1440;
const PAD = 120;
const MAX_H = 4000;

/** 배경색이 어두우면 밝은 글자, 밝으면 어두운 글자 */
function textOn(bg: string): string {
  const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(bg);
  if (!m) return "#0f172a";
  const [r, g, b] = [m[1], m[2], m[3]].map((h) => parseInt(h, 16));
  return 0.299 * r + 0.587 * g + 0.114 * b < 140 ? "#ffffff" : "#0f172a";
}

export function planToCanvasDoc(plan: Plan): { components: CanvasComponent[]; spec: { appName: string; appDescription: string; screenDescription: string }; canvas: { width: number; height: number }; dark: boolean } {
  const ds = plan.designSystem;
  const bg = ds.backgroundColor || "#ffffff";
  const primary = ds.primaryColor || "#2563eb";
  const secondary = ds.secondaryColor || "#f1f5f9";
  const fg = textOn(bg);
  const list: CanvasComponent[] = [];
  let n = 0;
  const add = (type: CanvasComponent["type"], name: string, x: number, y: number, w: number, h: number, props: Record<string, any>, styles: Record<string, any>, description = "") => {
    n += 1;
    list.push({ id: `lpa-${type.toLowerCase()}-${n}-${Math.random().toString(36).slice(2, 8)}`, name, type, position: { x, y }, size: { width: w, height: h }, props, styles, description, isLocked: false });
  };

  // 히어로: 바탕 상자 + 헤드라인 + 서브 헤드라인 + CTA 버튼
  add("Container", "히어로 배경", 0, 0, W, 420, {}, { backgroundColor: secondary, borderWidth: 0, borderRadius: 0 }, "히어로 영역");
  add("Text", "헤드라인", PAD, 100, W - PAD * 2, 90, { text: plan.contentStrategy.headline || plan.projectInfo.topic }, { fontSize: 44, fontWeight: 800, color: textOn(secondary), backgroundColor: "transparent", textAlign: "left", padding: "4px 8px" });
  add("Text", "서브 헤드라인", PAD, 200, W - PAD * 2, 70, { text: plan.contentStrategy.subHeadline }, { fontSize: 20, fontWeight: 400, color: textOn(secondary), backgroundColor: "transparent", textAlign: "left", padding: "4px 8px" });
  if (plan.contentStrategy.cta) {
    add("Button", "CTA 버튼", PAD, 300, 260, 60, { text: plan.contentStrategy.cta, kind: "text" }, { backgroundColor: primary, color: textOn(primary), borderRadius: 12, borderWidth: 0, fontSize: 18, fontWeight: 700 });
  }

  // 메인 페이지 섹션: 상자 + 제목 + 설명
  let y = 480;
  for (const s of plan.structure.mainPage.sections) {
    if (y + 200 > MAX_H - 40) break;
    add("Container", `섹션: ${s.title}`.slice(0, 40), PAD, y, W - PAD * 2, 200, {}, { backgroundColor: bg === "#ffffff" ? "#f8fafc" : bg, borderColor: secondary, borderWidth: 1, borderRadius: 16 }, s.description);
    add("Text", `${s.title} 제목`.slice(0, 40), PAD + 32, y + 24, W - PAD * 2 - 64, 44, { text: s.title }, { fontSize: 24, fontWeight: 700, color: fg, backgroundColor: "transparent", textAlign: "left", padding: "4px 8px" });
    add("Text", `${s.title} 설명`.slice(0, 40), PAD + 32, y + 76, W - PAD * 2 - 64, 100, { text: s.description }, { fontSize: 16, fontWeight: 400, color: fg, backgroundColor: "transparent", textAlign: "left", padding: "4px 8px" });
    y += 232;
  }

  return {
    components: list,
    spec: {
      appName: plan.projectInfo.topic.slice(0, 200),
      appDescription: `${plan.projectInfo.goal}\n대상: ${plan.projectInfo.target}\n${plan.projectInfo.designIntent}`.slice(0, 8000),
      screenDescription: `AI 랜딩페이지 기획 자동화에서 보낸 메인 페이지 초안입니다. 섹션: ${plan.structure.mainPage.sections.map((s) => s.title).join(", ")}`.slice(0, 8000),
    },
    canvas: { width: W, height: Math.min(MAX_H, Math.max(900, y + 80)) },
    dark: textOn(bg) === "#ffffff",
  };
}
