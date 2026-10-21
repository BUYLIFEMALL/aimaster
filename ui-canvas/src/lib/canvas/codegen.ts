/* eslint-disable @typescript-eslint/no-explicit-any */
// 캔버스 화면 → React + Tailwind TSX 한 파일(2026-10-21 병합 D, 「</> 코드」 내보내기).
// 위치·크기는 Tailwind 임의값(absolute left-[..] top-[..] w-[..] h-[..]), 모양은 캔버스와 같은 값을 style로 옮긴다.
// 그리는 방식은 components/canvas/ComponentView.tsx와 같게 맞춘다(캔버스에서 바꾸면 여기도 같이 고친다).
import type { CanvasComponent, CanvasSize } from "./types";

const CUSTOM_STYLE_KEYS = new Set(["barColor"]);
const LUCIDE: Record<string, string> = {
  MailIcon: "Mail", BellIcon: "Bell", HomeIcon: "House", UserIcon: "User", CogIcon: "Settings", SearchIcon: "Search",
  CheckCircleIcon: "CircleCheck", XCircleIcon: "CircleX", InformationCircleIcon: "Info", ExclamationTriangleIcon: "TriangleAlert",
  PlayIcon: "Play", PauseIcon: "Pause", ForwardIcon: "SkipForward", BackwardIcon: "SkipBack", XMarkIcon: "X",
};
const ALERT: Record<string, { bg: string; border: string; color: string; icon: string }> = {
  info: { bg: "#eff6ff", border: "#3b82f6", color: "#1e40af", icon: "Info" },
  success: { bg: "#f0fdf4", border: "#22c55e", color: "#166534", icon: "CircleCheck" },
  warning: { bg: "#fffbeb", border: "#f59e0b", color: "#92400e", icon: "TriangleAlert" },
  error: { bg: "#fef2f2", border: "#ef4444", color: "#991b1b", icon: "CircleX" },
};

const num = (v: unknown) => Math.round(Number(v) || 0);
const txt = (v: unknown) => `{${JSON.stringify(String(v ?? ""))}}`;
const hasBorder = (s: Record<string, any>) =>
  ["borderWidth", "borderTopWidth", "borderRightWidth", "borderBottomWidth", "borderLeftWidth"].some((k) => Number(s[k]) > 0);

function cssOf(styles: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(styles ?? {})) if (!CUSTOM_STYLE_KEYS.has(k) && v !== undefined && v !== null && v !== "") out[k] = v;
  return out;
}

/** 스타일 객체 → JSX style 속성 문자열 */
function styleAttr(obj: Record<string, any>): string {
  const entries = Object.entries(obj).filter(([, v]) => v !== undefined && v !== null && v !== "");
  if (!entries.length) return "";
  return ` style={{ ${entries.map(([k, v]) => `${/^[A-Za-z_$][\w$]*$/.test(k) ? k : JSON.stringify(k)}: ${JSON.stringify(v)}`).join(", ")} }}`;
}

function innerStyle(c: CanvasComponent): Record<string, any> {
  const s = c.styles ?? {};
  return {
    width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", boxSizing: "border-box",
    ...cssOf(s), borderStyle: s.borderStyle || (hasBorder(s) ? "solid" : "none"),
  };
}

const pad = (depth: number) => "  ".repeat(depth);

/** 컴포넌트 한 개의 내용(JSX). icons에 쓴 lucide 아이콘 이름을 모은다. */
function body(c: CanvasComponent, all: CanvasComponent[], icons: Set<string>, d: number): string {
  const p = c.props ?? {};
  const s = c.styles ?? {};
  const inner = innerStyle(c);
  const I = (name: string, extra = "") => { icons.add(name); return `<${name}${extra} />`; };
  switch (c.type) {
    case "Button": {
      const kind = p.kind ?? "text";
      const icon = p.icon && LUCIDE[p.icon];
      const showIcon = (kind === "icon" || kind === "text-icon") && !!icon;
      const text = typeof p.text === "string" ? p.text : "";
      const showText = (kind === "text" || kind === "text-icon") && text.trim().length > 0;
      const parts = [showIcon && icon ? I(icon, ` size={${showText ? 18 : Math.max(14, Math.round(Math.min(c.size.height, c.size.width) * 0.55))}}`) : "", showText ? `<span>${txt(text)}</span>` : ""].filter(Boolean);
      return `<button type="button"${styleAttr({ ...inner, gap: showText && showIcon ? 8 : 0, padding: 0, cursor: "pointer" })}>${parts.join("")}</button>`;
    }
    case "Text":
      return `<div${styleAttr({ ...inner, whiteSpace: "pre-wrap", wordBreak: "break-word", alignItems: "flex-start", justifyContent: "flex-start" })}>${txt(p.text)}</div>`;
    case "Container":
      return `<div${styleAttr(inner)} />`;
    case "Group": {
      const kids = all.filter((k) => k.parentId === c.id);
      return `<div${styleAttr({ ...inner, display: "block", position: "relative" })}>\n${kids.map((k) => placed(k, all, icons, d + 1)).join("\n")}\n${pad(d)}</div>`;
    }
    case "Image": {
      const src = typeof p.src === "string" && /^https?:\/\//i.test(p.src.trim()) ? p.src.trim() : "";
      const frame = { ...inner, overflow: "hidden", backgroundColor: s.backgroundColor || "#e2e8f0", border: s.borderWidth > 0 ? `${s.borderWidth}px solid ${s.borderColor ?? "#cbd5e1"}` : "2px dashed #cbd5e1" };
      return src
        ? `<div${styleAttr(frame)}><img src=${JSON.stringify(src)} alt=${JSON.stringify(c.name)} style={{ width: "100%", height: "100%", objectFit: ${JSON.stringify(s.objectFit || "cover")}, display: "block" }} /></div>`
        : `<div${styleAttr(frame)}>{/* 이미지 자리: src를 넣으세요 */}</div>`;
    }
    case "Input":
      return `<input type="text" placeholder=${JSON.stringify(String(p.placeholder ?? ""))}${styleAttr({ ...inner, paddingLeft: s.paddingLeft ?? 8, justifyContent: "flex-start" })} />`;
    case "Listbox":
      return `<ul${styleAttr({ ...inner, flexDirection: "column", alignItems: "stretch", justifyContent: "flex-start", overflow: "hidden", padding: 4, margin: 0, listStyle: "none" })}>\n${(p.items ?? []).map((it: string, i: number) =>
        `${pad(d + 1)}<li${styleAttr({ padding: "4px 12px", fontSize: 14, borderRadius: 6, background: i === p.selectedIndex ? "#2563eb" : "transparent", color: i === p.selectedIndex ? "#fff" : "inherit" })}>${txt(it)}</li>`).join("\n")}\n${pad(d)}</ul>`;
    case "Tabs": {
      const tabs: string[] = p.tabs ?? [];
      const st = p.style ?? "line";
      const wrap = st === "line" ? { borderBottom: "1px solid #cbd5e1" } : st === "segmented" ? { background: "#e2e8f0", borderRadius: 8, padding: 4, gap: 2 } : { background: s.backgroundColor || "#f1f5f9", borderRadius: s.borderRadius ?? 9999, padding: 4, gap: 4 };
      return `<div role="tablist"${styleAttr({ display: "flex", width: "100%", height: "100%", boxSizing: "border-box", ...wrap })}>\n${tabs.map((t, i) => {
        const a = i === p.activeTab;
        const ts = st === "line" ? { borderBottom: a ? "2px solid #2563eb" : "2px solid transparent", color: a ? "#2563eb" : "#64748b" }
          : st === "segmented" ? { background: a ? "#fff" : "transparent", color: a ? "#0f172a" : "#475569", borderRadius: 6 }
          : { background: a ? "#2563eb" : "transparent", color: a ? "#fff" : "#475569", borderRadius: 9999 };
        return `${pad(d + 1)}<button type="button" role="tab" aria-selected={${a}}${styleAttr({ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 500, padding: "0 12px", border: "none", ...ts })}>${txt(t)}</button>`;
      }).join("\n")}\n${pad(d)}</div>`;
    }
    case "Accordion":
      return `<div${styleAttr({ width: "100%", height: "100%", overflow: "auto", display: "flex", flexDirection: "column", gap: 8, padding: 4, boxSizing: "border-box" })}>\n${(p.items ?? []).map((it: { title: string; content: string }, i: number) =>
        `${pad(d + 1)}<details${i === p.openItem ? " open" : ""}${styleAttr({ border: `${s.borderWidth ?? 1}px solid ${s.borderColor ?? "#cbd5e1"}`, borderRadius: s.borderRadius ?? 6, background: s.backgroundColor, color: s.color })}><summary style={{ padding: 10, fontWeight: 600, fontSize: 14, cursor: "pointer" }}>${txt(it.title)}</summary><div style={{ padding: 10, fontSize: 13 }}>${txt(it.content)}</div></details>`).join("\n")}\n${pad(d)}</div>`;
    case "Dropdown":
      return `<select${styleAttr({ ...inner, padding: "0 12px", fontSize: 14 })}>${(p.options ?? []).map((o: string) => `<option>${txt(o)}</option>`).join("")}</select>`;
    case "Radio":
    case "Checkbox":
      return `<label${styleAttr({ ...inner, justifyContent: "flex-start", gap: 8, padding: "0 4px", border: "none", background: "transparent" })}><input type=${JSON.stringify(c.type === "Radio" ? "radio" : "checkbox")} defaultChecked={${!!p.checked}} /><span>${txt(p.label)}</span></label>`;
    case "Toggle":
      return `<label${styleAttr({ ...inner, gap: 8, padding: "0 8px", border: "none", background: "transparent", fontSize: 14 })}>${p.leftLabel ? `<span>${txt(p.leftLabel)}</span>` : ""}<span role="switch" aria-checked={${!!p.isOn}}${styleAttr({ width: 44, height: 24, borderRadius: 9999, background: p.isOn ? "#2563eb" : "#cbd5e1", position: "relative", flexShrink: 0 })}><span${styleAttr({ position: "absolute", top: 2, left: p.isOn ? 22 : 2, width: 20, height: 20, borderRadius: "50%", background: "#fff" })} /></span>${p.rightLabel ? `<span>${txt(p.rightLabel)}</span>` : ""}</label>`;
    case "Slider":
      return `<input type="range" min={0} max={100} defaultValue={${Math.max(0, Math.min(100, num(p.value)))}} className="w-full accent-blue-600" />`;
    case "Alert": {
      const a = ALERT[p.type] ?? ALERT.info;
      return `<div role="alert"${styleAttr({ background: a.bg, color: a.color, borderLeft: `4px solid ${a.border}`, ...cssOf(s), width: "100%", height: "100%", boxSizing: "border-box", display: "flex", alignItems: "center", gap: 10, padding: 12, borderRadius: s.borderRadius ?? 6, fontSize: 14, fontWeight: 500 })}>${I(a.icon, ` size={18} color=${JSON.stringify(a.border)}`)}<span>${txt(p.text)}</span>${p.dismissible ? I("X", " size={16}") : ""}</div>`;
    }
    case "Loader":
      return `<div className="flex h-full w-full items-center justify-center"><div className="h-full max-h-12 aspect-square animate-spin rounded-full border-4 border-blue-600 border-t-transparent" /></div>`;
    case "Progress":
      return `<div${styleAttr({ position: "relative", width: "100%", height: "100%", borderRadius: 9999, overflow: "hidden", background: s.backgroundColor || "#e2e8f0" })}><div${styleAttr({ width: `${Math.max(0, Math.min(100, num(p.progress)))}%`, height: "100%", background: s.barColor || "#2563eb", borderRadius: 9999 })} />${p.showLabel ? `<span className="absolute inset-0 flex items-center justify-center text-[11px] font-bold text-slate-900">${num(p.progress)}%</span>` : ""}</div>`;
    case "Tooltip":
      return `<div title=${JSON.stringify(String(p.text ?? ""))} className="flex h-full w-full items-center justify-center">${I("Info", ' size={22} color="#64748b"')}</div>`;
    case "Modal":
      return `<div role="dialog"${styleAttr({ ...inner, flexDirection: "column", alignItems: "stretch", justifyContent: "space-between", boxShadow: "0 20px 40px rgba(15,23,42,.18)" })}><div className="flex items-center justify-between border-b border-slate-200 p-4"><strong className="text-base">${txt(p.title)}</strong>${I("X", ' size={16} color="#64748b"')}</div><div className="flex-1 p-4 text-sm">${txt(p.content)}</div><div className="flex justify-end gap-2 border-t border-slate-200 p-3"><button type="button" className="rounded-md bg-slate-200 px-3.5 py-1.5 text-[13px]">취소</button><button type="button" className="rounded-md bg-blue-600 px-3.5 py-1.5 text-[13px] text-white">확인</button></div></div>`;
    case "Popover":
      return `<div${styleAttr({ ...inner, flexDirection: "column", alignItems: "stretch", justifyContent: "flex-start", backgroundColor: s.backgroundColor || "#f8fafc" })}><div className="border-b border-slate-200 p-3 font-semibold">${txt(p.title)}</div><div className="flex-1 p-3 text-[13px]">팝오버 콘텐츠</div></div>`;
    case "Icon": {
      const icon = LUCIDE[p.icon] ?? "House";
      return I(icon, ` style={{ width: "100%", height: "100%"${s.color ? `, color: ${JSON.stringify(s.color)}` : ""} }}`);
    }
    case "BarChart": {
      const data: { value1: number }[] = p.data ?? [];
      const colors: string[] = p.colors ?? ["#6366f1"];
      return `<div${styleAttr({ ...inner, alignItems: "flex-end", gap: 8, padding: 16 })}>${data.map((v, i) => `<div${styleAttr({ width: "100%", height: `${Math.max(0, Math.min(100, num(v.value1)))}%`, background: colors[i % colors.length] ?? "#6366f1", borderRadius: "2px 2px 0 0" })} />`).join("")}</div>`;
    }
    case "LineChart": {
      const data: { value1: number; value2: number }[] = p.data ?? [];
      const colors: string[] = p.colors ?? ["#6366f1", "#22c55e"];
      const path = (k: "value1" | "value2") => data.length < 2 ? "" : "M " + data.map((v, i) => `${Math.round((i / (data.length - 1)) * 1000) / 10} ${100 - num(v[k])}`).join(" L ");
      return `<div${styleAttr({ ...inner, padding: 16 })}><svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none"><path d=${JSON.stringify(path("value1"))} fill="none" stroke=${JSON.stringify(colors[0] ?? "#6366f1")} strokeWidth="2" vectorEffect="non-scaling-stroke" /><path d=${JSON.stringify(path("value2"))} fill="none" stroke=${JSON.stringify(colors[1] ?? "#22c55e")} strokeWidth="2" vectorEffect="non-scaling-stroke" /></svg></div>`;
    }
    case "PieChart": {
      const data: { value1: number }[] = p.data ?? [];
      const colors: string[] = p.colors ?? [];
      const total = data.reduce((a, v) => a + (Number(v.value1) || 0), 0) || 1;
      let acc = 0;
      const stops = data.map((v, i) => { const st = (acc / total) * 100; acc += Number(v.value1) || 0; return `${colors[i % Math.max(1, colors.length)] ?? "#6366f1"} ${Math.round(st)}% ${Math.round((acc / total) * 100)}%`; }).join(", ");
      const dia = Math.round(Math.min(c.size.width, c.size.height) * 0.7);
      return `<div${styleAttr(inner)}><div${styleAttr({ width: dia, height: dia, borderRadius: "50%", background: stops ? `conic-gradient(${stops})` : "#e2e8f0" })} /></div>`;
    }
    case "Misc":
      return `<div${styleAttr({ ...inner, padding: 8, textAlign: "center", wordBreak: "break-word" })}>${txt(c.description || "")}</div>`;
    default:
      return `{/* 지원하지 않는 컴포넌트: ${String(c.type)} */}`;
  }
}

/** 위치·크기를 Tailwind 임의값으로 감싼 한 줄 */
function placed(c: CanvasComponent, all: CanvasComponent[], icons: Set<string>, d: number): string {
  const cls = `absolute left-[${num(c.position.x)}px] top-[${num(c.position.y)}px] w-[${Math.max(1, num(c.size.width))}px] h-[${Math.max(1, num(c.size.height))}px]`;
  const label = c.name ? ` {/* ${String(c.name).replace(/\*\//g, "* /")} */}` : "";
  return `${pad(d)}<div className="${cls}">${label}\n${pad(d + 1)}${body(c, all, icons, d + 1)}\n${pad(d)}</div>`;
}

export function componentName(raw: string): string {
  const ascii = raw.replace(/[^A-Za-z0-9 ]/g, " ").trim().split(/\s+/).filter(Boolean).map((w) => w[0].toUpperCase() + w.slice(1)).join("");
  return /^[A-Z]/.test(ascii) ? ascii.slice(0, 40) : "CanvasScreen";
}

/** 캔버스 전체를 React + Tailwind TSX 한 파일로 만든다. */
export function generateTsx(components: CanvasComponent[], canvas: CanvasSize, opts: { name: string; dark: boolean }): string {
  const icons = new Set<string>();
  const top = components.filter((c) => !c.parentId || !components.some((p) => p.id === c.parentId));
  const children = top.map((c) => placed(c, components, icons, 3)).join("\n");
  const fn = componentName(opts.name);
  const header = [
    `// ${opts.name || "제목 없는 디자인"} — UI Canvas 자동화에서 내보낸 React + Tailwind CSS 코드 (${new Date().getFullYear()}년)`,
    "// 위치·크기는 캔버스 그대로(절대 위치)입니다. 실제 서비스에 넣을 때는 flex·grid로 바꿔 반응형으로 다듬으세요.",
    icons.size ? `import { ${[...icons].sort().join(", ")} } from "lucide-react";` : "",
  ].filter(Boolean).join("\n");
  return `${header}

export default function ${fn}() {
  return (
    <div className="w-full overflow-auto">
      <div className="relative mx-auto ${opts.dark ? "bg-slate-900 text-slate-100" : "bg-white text-slate-900"} w-[${num(canvas.width)}px] h-[${num(canvas.height)}px]">
${children || "        {/* 캔버스가 비어 있습니다 */}"}
      </div>
    </div>
  );
}
`;
}
