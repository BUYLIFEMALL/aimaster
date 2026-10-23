/* eslint-disable @next/next/no-img-element, @typescript-eslint/no-explicit-any */
"use client";
import type { CSSProperties, ReactNode } from "react";
import { Image as ImageIcon, Info, CircleCheck, TriangleAlert, CircleX, X as XIcon, ChevronDown } from "lucide-react";
import type { CanvasComponent } from "@/lib/canvas/types";
import { ICONS } from "./icons";

const CUSTOM_STYLE_KEYS = new Set(["barColor"]);

function cssOf(styles: Record<string, any>): CSSProperties {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(styles)) if (!CUSTOM_STYLE_KEYS.has(k)) out[k] = v;
  return out as CSSProperties;
}

function safeImageSrc(src: unknown): string | null {
  if (typeof src !== "string") return null;
  const s = src.trim();
  return /^https?:\/\//i.test(s) || /^data:image\/(png|jpe?g|gif|webp);/i.test(s) ? s : null;
}

const ALERT = {
  info: { icon: Info, bg: "#eff6ff", border: "#3b82f6", color: "#1e40af", ic: "#3b82f6" },
  success: { icon: CircleCheck, bg: "#f0fdf4", border: "#22c55e", color: "#166534", ic: "#22c55e" },
  warning: { icon: TriangleAlert, bg: "#fffbeb", border: "#f59e0b", color: "#92400e", ic: "#f59e0b" },
  error: { icon: CircleX, bg: "#fef2f2", border: "#ef4444", color: "#991b1b", ic: "#ef4444" },
} as const;

interface Props {
  component: CanvasComponent;
  all: CanvasComponent[];
  selectedIds: string[];
  editing?: boolean;
  textRef?: (el: HTMLDivElement | null) => void;
  onTextBlur?: (id: string, text: string) => void;
  onProps?: (id: string, props: Record<string, any>) => void;
}

/** 컴포넌트 한 개를 그린다(위치·선택 테두리는 Stage가 담당). 그룹이면 자식을 상대좌표로 그린다. */
export function ComponentView({ component, all, selectedIds, editing, textRef, onTextBlur, onProps }: Props): ReactNode {
  const { type, props, styles, size } = component;
  const inner: CSSProperties = {
    width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center",
    boxSizing: "border-box", ...cssOf(styles), borderStyle: styles.borderStyle || (hasBorder(styles) ? "solid" : "none"),
  };

  switch (type) {
    case "Button": {
      const kind = props.kind ?? "text";
      const Icon = props.icon ? ICONS[props.icon] : null;
      const showIcon = (kind === "icon" || kind === "text-icon") && !!Icon;
      const text = typeof props.text === "string" ? props.text : "";
      const showText = (kind === "text" || kind === "text-icon") && text.trim().length > 0;
      return (
        <button type="button" tabIndex={-1} style={{ ...inner, gap: showText && showIcon ? 8 : 0, cursor: "inherit", padding: 0 }}>
          {showIcon && Icon && <Icon size={showText ? 18 : Math.max(14, Math.min(size.height, size.width) * 0.55)} />}
          {showText && <span>{text}</span>}
        </button>
      );
    }
    case "Text":
      return (
        <div
          ref={textRef}
          contentEditable={!!editing}
          suppressContentEditableWarning
          onBlur={(e) => onTextBlur?.(component.id, e.currentTarget.innerText)}
          style={{ ...inner, whiteSpace: "pre-wrap", wordBreak: "break-word", alignItems: "flex-start", justifyContent: "flex-start", cursor: editing ? "text" : "inherit", outline: "none" }}
        >
          {props.text}
        </div>
      );
    case "Container":
      return <div style={inner} />;
    case "Group": {
      const kids = all.filter((c) => c.parentId === component.id);
      return (
        <div style={{ ...inner, display: "block", position: "relative" }}>
          {kids.map((child) => (
            <div key={child.id} data-cid={child.id} style={{
              position: "absolute", left: child.position.x, top: child.position.y, width: child.size.width, height: child.size.height,
              outline: selectedIds.includes(child.id) ? "2px solid #2563eb" : undefined,
            }}>
              <ComponentView component={child} all={all} selectedIds={selectedIds} onProps={onProps} />
            </div>
          ))}
        </div>
      );
    }
    case "Image": {
      const src = safeImageSrc(props.src);
      const frame: CSSProperties = {
        ...inner, overflow: "hidden", backgroundColor: styles.backgroundColor || "#e2e8f0",
        border: styles.borderWidth > 0 ? `${styles.borderWidth}px solid ${styles.borderColor ?? "#cbd5e1"}` : "2px dashed #cbd5e1",
      };
      return (
        <div style={frame}>
          {src ? (
            <img src={src} alt={component.name} draggable={false} style={{ width: "100%", height: "100%", objectFit: styles.objectFit || "cover", display: "block" }} />
          ) : (
            <ImageIcon size={Math.max(16, Math.min(size.width, size.height) / 3)} color="#94a3b8" />
          )}
        </div>
      );
    }
    case "Input":
      return <input type="text" tabIndex={-1} readOnly placeholder={props.placeholder} style={{ ...inner, paddingLeft: styles.paddingLeft ?? 8, justifyContent: "flex-start", pointerEvents: "none" }} />;
    case "Listbox":
      return (
        <div style={{ ...inner, flexDirection: "column", alignItems: "stretch", justifyContent: "flex-start", overflow: "hidden", padding: 4 }}>
          {(props.items ?? []).map((item: string, i: number) => (
            <div key={i} style={{ padding: "4px 12px", fontSize: 14, borderRadius: 6, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", background: i === props.selectedIndex ? "#2563eb" : "transparent", color: i === props.selectedIndex ? "#fff" : "inherit" }}>{item}</div>
          ))}
        </div>
      );
    case "Tabs": {
      const tabs: string[] = props.tabs ?? [];
      const style = props.style ?? "line";
      const wrap: CSSProperties =
        style === "line" ? { borderBottom: "1px solid #cbd5e1" }
        : style === "segmented" ? { background: "#e2e8f0", borderRadius: 8, padding: 4, gap: 2 }
        : { background: styles.backgroundColor || "#f1f5f9", borderRadius: styles.borderRadius ?? 9999, padding: 4, gap: 4 };
      return (
        <div style={{ display: "flex", width: "100%", height: "100%", boxSizing: "border-box", ...wrap }}>
          {tabs.map((tab, i) => {
            const active = i === props.activeTab;
            const tabStyle: CSSProperties =
              style === "line"
                ? { borderBottom: active ? "2px solid #2563eb" : "2px solid transparent", color: active ? "#2563eb" : "#64748b" }
                : style === "segmented"
                  ? { background: active ? "#fff" : "transparent", color: active ? "#0f172a" : "#475569", borderRadius: 6, boxShadow: active ? "0 1px 2px rgba(0,0,0,.15)" : undefined }
                  : { background: active ? "#2563eb" : "transparent", color: active ? "#fff" : "#475569", borderRadius: 9999 };
            return <div key={i} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 500, padding: "0 12px", whiteSpace: "nowrap", ...tabStyle }}>{tab}</div>;
          })}
        </div>
      );
    }
    case "Accordion":
      return (
        <div style={{ width: "100%", height: "100%", overflow: "auto", display: "flex", flexDirection: "column", gap: 8, padding: 4, boxSizing: "border-box" }}>
          {(props.items ?? []).map((item: { title: string; content: string }, i: number) => (
            <div key={i} style={{ border: `${styles.borderWidth ?? 1}px solid ${styles.borderColor ?? "#cbd5e1"}`, borderRadius: styles.borderRadius ?? 6, background: styles.backgroundColor, color: styles.color }}>
              <div
                data-nodrag
                onMouseDown={(e) => e.stopPropagation()}
                onClick={() => onProps?.(component.id, { openItem: props.openItem === i ? null : i })}
                style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: 10, fontWeight: 600, fontSize: 14, cursor: "pointer" }}
              >
                <span>{item.title}</span>
                <ChevronDown size={16} style={{ transform: props.openItem === i ? "rotate(180deg)" : undefined }} />
              </div>
              {props.openItem === i && <div style={{ padding: 10, fontSize: 13, borderTop: `1px solid ${styles.borderColor ?? "#cbd5e1"}` }}>{item.content}</div>}
            </div>
          ))}
        </div>
      );
    case "Dropdown":
      return (
        <div style={{ ...inner, justifyContent: "space-between", padding: "0 12px", position: "relative", fontSize: 14 }}>
          <span>{(props.options ?? [])[0] ?? "선택..."}</span>
          <ChevronDown size={16} />
          {props.isOpen && (
            <div style={{ position: "absolute", top: "100%", left: 0, right: 0, marginTop: 4, background: "#fff", border: "1px solid #cbd5e1", borderRadius: 6, zIndex: 5, boxShadow: "0 8px 16px rgba(15,23,42,.12)" }}>
              {(props.options ?? []).map((o: string, i: number) => <div key={i} style={{ padding: "8px 12px", fontSize: 14, color: "#0f172a" }}>{o}</div>)}
            </div>
          )}
        </div>
      );
    case "Radio":
    case "Checkbox": {
      const checked = !!props.checked;
      const radio = type === "Radio";
      return (
        <div style={{ ...inner, justifyContent: "flex-start", gap: 8, padding: "0 4px", border: "none", background: "transparent" }}>
          <span style={{ width: 18, height: 18, flexShrink: 0, borderRadius: radio ? "50%" : 4, border: `2px solid ${checked && !radio ? "#2563eb" : "#94a3b8"}`, background: checked && !radio ? "#2563eb" : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>
            {checked && radio && <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#2563eb" }} />}
            {checked && !radio && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3"><path d="M5 13l4 4L19 7" /></svg>}
          </span>
          <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{props.label}</span>
        </div>
      );
    }
    case "Toggle": {
      const on = !!props.isOn;
      return (
        <div style={{ ...inner, gap: 8, padding: "0 8px", border: "none", background: "transparent", fontSize: 14 }}>
          {props.leftLabel && <span>{props.leftLabel}</span>}
          <span style={{ width: 44, height: 24, borderRadius: 9999, background: on ? "#2563eb" : "#cbd5e1", position: "relative", flexShrink: 0 }}>
            <span style={{ position: "absolute", top: 2, left: on ? 22 : 2, width: 20, height: 20, borderRadius: "50%", background: "#fff", boxShadow: "0 1px 2px rgba(0,0,0,.3)" }} />
          </span>
          {props.rightLabel && <span>{props.rightLabel}</span>}
        </div>
      );
    }
    case "Slider": {
      const v = Math.max(0, Math.min(100, Number(props.value) || 0));
      return (
        <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", padding: "0 8px", boxSizing: "border-box" }}>
          <div style={{ position: "relative", width: "100%", height: 6, background: "#cbd5e1", borderRadius: 9999 }}>
            <div style={{ width: `${v}%`, height: 6, background: "#2563eb", borderRadius: 9999 }} />
            <div style={{ position: "absolute", top: "50%", left: `calc(${v}% - 8px)`, width: 16, height: 16, marginTop: -8, borderRadius: "50%", background: "#fff", border: "2px solid #2563eb", boxSizing: "border-box" }} />
          </div>
        </div>
      );
    }
    case "Alert": {
      const a = ALERT[(props.type as keyof typeof ALERT) ?? "info"] ?? ALERT.info;
      const Icon = a.icon;
      const base: CSSProperties = { background: a.bg, color: a.color, border: "none", borderLeft: `4px solid ${a.border}` };
      return (
        <div style={{ ...base, ...cssOf(styles), width: "100%", height: "100%", boxSizing: "border-box", display: "flex", alignItems: "center", justifyContent: "space-between", padding: 12, borderRadius: styles.borderRadius ?? 6 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14, fontWeight: 500 }}>
            <Icon size={18} color={a.ic} />
            <span>{props.text}</span>
          </div>
          {props.dismissible && <XIcon size={16} />}
        </div>
      );
    }
    case "Loader":
      return props.style === "dots" ? (
        <div style={{ ...inner, border: "none", gap: 6 }}>
          {[0, 1, 2].map((i) => <span key={i} className="uc-dot" style={{ animationDelay: `${i * 0.15}s` }} />)}
        </div>
      ) : (
        <div style={{ ...inner, border: "none", background: "transparent" }}>
          <svg className="uc-spin" viewBox="0 0 24 24" fill="none" style={{ width: "100%", height: "100%", color: "#2563eb" }}>
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" opacity=".25" />
            <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
          </svg>
        </div>
      );
    case "Progress":
      return (
        <div style={{ position: "relative", width: "100%", height: "100%", borderRadius: 9999, overflow: "hidden", background: styles.backgroundColor || "#e2e8f0" }}>
          <div style={{ width: `${Math.max(0, Math.min(100, Number(props.progress) || 0))}%`, height: "100%", background: styles.barColor || "#2563eb", backgroundImage: styles.backgroundImage, backgroundSize: "1rem 1rem", borderRadius: 9999 }} />
          {props.showLabel && <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#0f172a" }}>{props.progress}%</div>}
        </div>
      );
    case "Tooltip":
      return (
        <div className="uc-tip" style={{ position: "relative", width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Info size={22} color="#64748b" />
          <div className="uc-tip-body" style={{ background: styles.backgroundColor || "#0f172a", color: styles.color || "#fff" }}>{props.text}</div>
        </div>
      );
    case "Modal":
      return (
        <div style={{ ...inner, flexDirection: "column", alignItems: "stretch", justifyContent: "space-between", boxShadow: "0 20px 40px rgba(15,23,42,.18)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: 16, borderBottom: "1px solid #e2e8f0" }}>
            <strong style={{ fontSize: 16 }}>{props.title}</strong><XIcon size={16} color="#64748b" />
          </div>
          <div style={{ padding: 16, flex: 1, fontSize: 14 }}>{props.content}</div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, padding: 12, borderTop: "1px solid #e2e8f0" }}>
            <span style={{ padding: "6px 14px", fontSize: 13, borderRadius: 6, background: "#e2e8f0" }}>취소</span>
            <span style={{ padding: "6px 14px", fontSize: 13, borderRadius: 6, background: "#2563eb", color: "#fff" }}>확인</span>
          </div>
        </div>
      );
    case "Popover": {
      const bg = styles.backgroundColor || "#f8fafc";
      const placement = props.placement ?? "bottom";
      const beak: CSSProperties =
        placement === "top" ? { left: "50%", bottom: -8, marginLeft: -8, borderLeft: "8px solid transparent", borderRight: "8px solid transparent", borderTop: `8px solid ${bg}` }
        : placement === "left" ? { top: "50%", right: -8, marginTop: -8, borderTop: "8px solid transparent", borderBottom: "8px solid transparent", borderLeft: `8px solid ${bg}` }
        : placement === "right" ? { top: "50%", left: -8, marginTop: -8, borderTop: "8px solid transparent", borderBottom: "8px solid transparent", borderRight: `8px solid ${bg}` }
        : { left: "50%", top: -8, marginLeft: -8, borderLeft: "8px solid transparent", borderRight: "8px solid transparent", borderBottom: `8px solid ${bg}` };
      return (
        <div style={{ ...inner, position: "relative", flexDirection: "column", alignItems: "stretch", justifyContent: "flex-start" }}>
          <div style={{ padding: 12, borderBottom: "1px solid #e2e8f0", fontWeight: 600 }}>{props.title}</div>
          <div style={{ padding: 12, fontSize: 13, flex: 1 }}>팝오버 콘텐츠가 여기에 표시됩니다.</div>
          <span style={{ position: "absolute", width: 0, height: 0, ...beak }} />
        </div>
      );
    }
    case "Icon": {
      const Icon = ICONS[props.icon] ?? ICONS.HomeIcon;
      return <Icon style={{ width: "100%", height: "100%", color: styles.color }} />;
    }
    case "BarChart": {
      const data: { value1: number }[] = props.data ?? [];
      const colors: string[] = props.colors ?? ["#6366f1"];
      return (
        <div style={{ ...inner, alignItems: "flex-end", gap: 8, padding: 16 }}>
          {data.map((d, i) => <div key={i} style={{ width: "100%", height: `${Math.max(0, Math.min(100, d.value1))}%`, background: colors[i % colors.length] ?? "#6366f1", borderRadius: "2px 2px 0 0" }} />)}
        </div>
      );
    }
    case "LineChart": {
      const data: { value1: number; value2: number }[] = props.data ?? [];
      const colors: string[] = props.colors ?? ["#6366f1", "#22c55e"];
      const path = (key: "value1" | "value2") =>
        data.length < 2 ? "" : "M " + data.map((p, i) => `${(i / (data.length - 1)) * 100} ${100 - p[key]}`).join(" L ");
      return (
        <div style={{ ...inner, padding: 16 }}>
          <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
            <path d={path("value1")} fill="none" stroke={colors[0] ?? "#6366f1"} strokeWidth="2" vectorEffect="non-scaling-stroke" />
            <path d={path("value2")} fill="none" stroke={colors[1] ?? "#22c55e"} strokeWidth="2" vectorEffect="non-scaling-stroke" />
          </svg>
        </div>
      );
    }
    case "PieChart": {
      const data: { value1: number }[] = props.data ?? [];
      const colors: string[] = props.colors ?? [];
      const total = data.reduce((a, d) => a + d.value1, 0) || 1;
      let acc = 0;
      const stops = data.map((d, i) => {
        const start = (acc / total) * 100;
        acc += d.value1;
        return `${colors[i % Math.max(1, colors.length)] ?? "#6366f1"} ${start}% ${(acc / total) * 100}%`;
      }).join(", ");
      const d = Math.min(size.width, size.height) * 0.7;
      return (
        <div style={inner}>
          <div style={{ width: d, height: d, borderRadius: "50%", background: stops ? `conic-gradient(${stops})` : "#e2e8f0" }} />
        </div>
      );
    }
    case "Misc":
      // 캔버스에 놓은 저장 AI 컴포넌트(v1.13): 생성 코드는 실행하지 않고 제목 상자로만 보여 준다(코드 내보내기 때 이 자리에 import)
      if (props.snippetId) {
        return (
          <div style={{ ...inner, flexDirection: "column", gap: 6, padding: 12, textAlign: "center", wordBreak: "break-word" }}>
            <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 9999, background: "#06b6d4", color: "#fff" }}>🧩 AI 컴포넌트</span>
            <strong style={{ fontSize: 15 }}>{component.description || "AI 컴포넌트"}</strong>
            <span style={{ fontSize: 11, opacity: 0.8 }}>코드 내보내기 때 이 자리에 들어갑니다</span>
          </div>
        );
      }
      return <div style={{ ...inner, padding: 8, textAlign: "center", wordBreak: "break-word" }}>{component.description || "설명을 입력하세요..."}</div>;
    default:
      return <div style={{ color: "#dc2626" }}>알 수 없는 컴포넌트</div>;
  }
}

/** 두께가 있는 테두리가 하나라도 있을 때만 선을 그린다(두께 없이 solid만 주면 브라우저가 3px 검은 선을 그린다) */
function hasBorder(styles: Record<string, any>): boolean {
  return ["borderWidth", "borderTopWidth", "borderRightWidth", "borderBottomWidth", "borderLeftWidth"].some((k) => Number(styles[k]) > 0);
}
