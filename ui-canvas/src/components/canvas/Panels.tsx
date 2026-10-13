/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useState } from "react";
import {
  AppWindow, ChartColumn, ChartLine, ChartPie, ChevronDown, ChevronRight, ChevronUp, ChevronsDown, ChevronsUp, CircleDot, Copy, Frame,
  Gauge, Group, Image as ImageIcon, List, ListChecks, LoaderCircle, Lock, LockOpen, MessageSquare, MessageSquareMore, MousePointerClick,
  PanelTop, Rows3, Shapes, Smile, SlidersHorizontal, Sparkles, SquareCheck, SquareChevronDown, TextCursorInput, ToggleRight, FileText, Trash2,
  TriangleAlert, Type, Ungroup,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { CanvasComponent, ComponentType, DesignSpec } from "@/lib/canvas/types";
import { TOOLBOX, TYPE_LABEL, PRESETS, ICON_NAMES } from "@/lib/canvas/constants";
import type { LayerMove } from "@/lib/canvas/model";
import { ICON_LABEL } from "./icons";

// ---------------- 도구 상자 ----------------
export const TOOL_ICONS: Record<ComponentType, LucideIcon> = {
  Container: Frame, Text: Type, Button: MousePointerClick, Input: TextCursorInput, Listbox: List, Image: ImageIcon, Tabs: PanelTop,
  Accordion: Rows3, Dropdown: SquareChevronDown, Radio: CircleDot, Checkbox: SquareCheck, Toggle: ToggleRight, Slider: SlidersHorizontal,
  Alert: TriangleAlert, Loader: LoaderCircle, Progress: Gauge, Tooltip: MessageSquare, Modal: AppWindow, Popover: MessageSquareMore,
  Icon: Smile, BarChart: ChartColumn, LineChart: ChartLine, PieChart: ChartPie, Misc: Shapes, Group: Group,
};

export function Toolbox({ active, onPick }: { active: ComponentType | null; onPick: (t: ComponentType | null) => void }) {
  return (
    <div className="uc-toolbox">
      <p className="uc-hint">컴포넌트를 선택한 뒤 캔버스에서 드래그하면 그 크기로 만들어집니다.</p>
      <div className="uc-tool-grid">
        {TOOLBOX.map((t) => (
          <button
            key={t.type}
            type="button"
            title={t.tip}
            aria-pressed={active === t.type}
            className={`uc-tool ${active === t.type ? "active" : ""}`}
            onClick={() => onPick(active === t.type ? null : t.type)}
          >
            {(() => { const Icon = TOOL_ICONS[t.type]; return <Icon size={18} aria-hidden />; })()}
            <span>{t.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ---------------- 레이어 ----------------
interface LayersProps {
  components: CanvasComponent[];
  selectedIds: string[];
  onSelect: (id: string, additive: boolean) => void;
  onMove: (id: string, dir: LayerMove) => void;
  onDelete: (id: string) => void;
}

export function LayersPanel({ components, selectedIds, onSelect, onMove, onDelete }: LayersProps) {
  const [open, setOpen] = useState<Set<string>>(new Set());
  const top = components.filter((c) => !c.parentId).slice().reverse();
  const toggle = (id: string) => setOpen((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  const row = (c: CanvasComponent, depth: number) => {
    const isGroup = c.type === "Group";
    const kids = isGroup ? components.filter((k) => k.parentId === c.id) : [];
    const selected = selectedIds.includes(c.id);
    return (
      <li key={c.id}>
        <div className={`uc-layer ${selected ? "selected" : ""}`} style={{ paddingLeft: 8 + depth * 14 }}>
          {isGroup ? (
            <button type="button" className="uc-icon-btn" aria-label={open.has(c.id) ? "접기" : "펼치기"} onClick={() => toggle(c.id)}>
              {open.has(c.id) ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>
          ) : <span style={{ width: 22 }} />}
          <button type="button" className="uc-layer-name" onClick={(e) => onSelect(c.id, e.shiftKey)} title={c.name}>
            <span className="uc-layer-type">{TYPE_LABEL[c.type]}</span>
            <span>{c.name}</span>
            {c.isLocked && <Lock size={12} />}
          </button>
          {!c.parentId && selected && (
            <span className="uc-layer-actions">
              <button type="button" className="uc-icon-btn" title="맨 앞으로" onClick={() => onMove(c.id, "top")}><ChevronsUp size={14} /></button>
              <button type="button" className="uc-icon-btn" title="앞으로" onClick={() => onMove(c.id, "up")}><ChevronUp size={14} /></button>
              <button type="button" className="uc-icon-btn" title="뒤로" onClick={() => onMove(c.id, "down")}><ChevronDown size={14} /></button>
              <button type="button" className="uc-icon-btn" title="맨 뒤로" onClick={() => onMove(c.id, "bottom")}><ChevronsDown size={14} /></button>
              <button type="button" className="uc-icon-btn danger" title="삭제" onClick={() => onDelete(c.id)}><Trash2 size={14} /></button>
            </span>
          )}
        </div>
        {isGroup && open.has(c.id) && kids.length > 0 && <ul>{kids.slice().reverse().map((k) => row(k, depth + 1))}</ul>}
      </li>
    );
  };

  return (
    <div className="uc-layers">
      {top.length === 0 ? <p className="uc-empty">아직 컴포넌트가 없습니다.</p> : <ul>{top.map((c) => row(c, 0))}</ul>}
    </div>
  );
}

// ---------------- 컨텍스트 메뉴 ----------------
interface MenuProps {
  x: number; y: number; component: CanvasComponent;
  canGroup: boolean; canUngroup: boolean;
  onMove: (dir: LayerMove) => void; onDuplicate: () => void; onDelete: () => void;
  onGroup: () => void; onUngroup: () => void; onToggleLock: () => void; onClose: () => void;
}

export function ContextMenu(p: MenuProps) {
  const run = (fn: () => void) => () => { fn(); p.onClose(); };
  const Item = ({ label, icon: Icon, onClick, danger }: { label: string; icon: any; onClick: () => void; danger?: boolean }) => (
    <button type="button" role="menuitem" className={`uc-menu-item ${danger ? "danger" : ""}`} onClick={run(onClick)}><Icon size={14} />{label}</button>
  );
  return (
    <div className="uc-menu" role="menu" style={{ left: p.x, top: p.y }} onMouseDown={(e) => e.stopPropagation()}>
      <Item label="맨 앞으로" icon={ChevronsUp} onClick={() => p.onMove("top")} />
      <Item label="앞으로" icon={ChevronUp} onClick={() => p.onMove("up")} />
      <Item label="뒤로" icon={ChevronDown} onClick={() => p.onMove("down")} />
      <Item label="맨 뒤로" icon={ChevronsDown} onClick={() => p.onMove("bottom")} />
      {(p.canGroup || p.canUngroup) && <hr />}
      {p.canGroup && <Item label="그룹" icon={Group} onClick={p.onGroup} />}
      {p.canUngroup && <Item label="그룹 해제" icon={Ungroup} onClick={p.onUngroup} />}
      <hr />
      {p.component.type === "Container" && <Item label={p.component.isLocked ? "잠금 해제" : "잠금"} icon={p.component.isLocked ? LockOpen : Lock} onClick={p.onToggleLock} />}
      <Item label="복제" icon={Copy} onClick={p.onDuplicate} />
      <Item label="삭제" icon={Trash2} onClick={p.onDelete} danger />
    </div>
  );
}

// ---------------- 속성 패널 ----------------
function Group2({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="uc-group"><h4>{title}</h4><div>{children}</div></section>;
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="uc-field"><span>{label}</span>{children}</label>;
}
function Text({ label, value, onChange, area, type = "text" }: { label: string; value: any; onChange: (v: string) => void; area?: boolean; type?: string }) {
  return (
    <Field label={label}>
      {area ? <textarea rows={3} value={value ?? ""} onChange={(e) => onChange(e.target.value)} /> : <input type={type} value={value ?? ""} onChange={(e) => onChange(e.target.value)} />}
    </Field>
  );
}
function Num({ label, value, onChange, min }: { label: string; value: any; onChange: (v: number) => void; min?: number }) {
  return (
    <Field label={label}>
      <input type="number" value={Number.isFinite(Number(value)) ? value : ""} min={min} onChange={(e) => { const n = parseInt(e.target.value, 10); if (Number.isFinite(n)) onChange(n); }} />
    </Field>
  );
}
function Select({ label, value, options, onChange }: { label: string; value: any; options: { value: string; label: string }[]; onChange: (v: string) => void }) {
  return (
    <Field label={label}>
      <select value={value ?? ""} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </Field>
  );
}
function Color({ label, value, onChange }: { label: string; value: any; onChange: (v: string) => void }) {
  const hex = typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value) ? value : "#000000";
  return (
    <Field label={label}>
      <span className="uc-color">
        <input type="color" value={hex} onChange={(e) => onChange(e.target.value)} aria-label={`${label} 선택`} />
        <input type="text" value={value ?? ""} placeholder="#RRGGBB" onChange={(e) => onChange(e.target.value)} />
      </span>
    </Field>
  );
}
function Check({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return <label className="uc-check"><input type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)} /><span>{label}</span></label>;
}
function StringList({ label, items, addLabel, newItem, onChange }: { label: string; items: string[]; addLabel: string; newItem: string; onChange: (v: string[]) => void }) {
  return (
    <div className="uc-list">
      <span className="uc-list-label">{label}</span>
      {items.map((it, i) => (
        <div key={i} className="uc-list-row">
          <input type="text" value={it} onChange={(e) => onChange(items.map((x, j) => (j === i ? e.target.value : x)))} />
          <button type="button" className="uc-icon-btn danger" aria-label="삭제" onClick={() => onChange(items.filter((_, j) => j !== i))}><Trash2 size={14} /></button>
        </div>
      ))}
      <button type="button" onClick={() => onChange([...items, newItem])}>{addLabel}</button>
    </div>
  );
}

export interface PropertiesProps {
  component: CanvasComponent | null;
  spec: DesignSpec;
  onSpec: (s: DesignSpec) => void;
  onAiFill: () => void;
  aiBusy: boolean;
  onProps: (id: string, props: Record<string, any>) => void;
  onStyles: (id: string, styles: Record<string, any>) => void;
  onMeta: (id: string, meta: { name?: string; description?: string }) => void;
  onSize: (id: string, size: { width: number; height: number }) => void;
  onPosition: (id: string, pos: { x: number; y: number }) => void;
  onPreset: (id: string, presetName: string) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onToggleLock: () => void;
}

const TEXT_TYPES: ComponentType[] = ["Button", "Text", "Input", "Alert", "Radio", "Checkbox"];

export function PropertiesPanel(p: PropertiesProps) {
  const [tab, setTab] = useState<"props" | "spec">("props");
  const c = p.component;
  const active = c ? tab : "spec";

  const body = () => {
    if (!c) return null;
    const P = (patch: Record<string, any>) => p.onProps(c.id, patch);
    const S = (patch: Record<string, any>) => p.onStyles(c.id, patch);
    const presets = PRESETS[c.type] ?? [];
    const stylePresets = c.type === "Button" ? presets.filter((x) => x.type !== "functional") : presets;
    const purposes = c.type === "Button" ? presets.filter((x) => x.type === "functional") : [];
    const props = c.props;

    let specific: React.ReactNode = null;
    switch (c.type) {
      case "Text": specific = <Text area label="텍스트" value={props.text} onChange={(v) => P({ text: v })} />; break;
      case "Button": {
        const kind = props.kind ?? "text";
        const current = purposes.find((x) => x.name !== "Standard" && x.props?.kind === kind && x.props?.icon === props.icon)?.name
          ?? (kind === "text" && !props.icon ? "Standard" : "Custom");
        specific = (
          <>
            <Select label="버튼 용도" value={current}
              options={[...purposes.map((x) => ({ value: x.name, label: x.label ?? x.name })), ...(current === "Custom" ? [{ value: "Custom", label: "사용자 정의" }] : [])]}
              onChange={(v) => v !== "Custom" && p.onPreset(c.id, v)} />
            <Select label="종류" value={kind} onChange={(v) => P({ kind: v })} options={[{ value: "text", label: "텍스트만" }, { value: "icon", label: "아이콘만" }, { value: "text-icon", label: "텍스트와 아이콘" }]} />
            {(kind === "icon" || kind === "text-icon") && (
              <Select label="아이콘" value={props.icon ?? ""} onChange={(v) => P({ icon: v })} options={ICON_NAMES.map((n) => ({ value: n, label: ICON_LABEL[n] ?? n }))} />
            )}
            {(kind === "text" || kind === "text-icon") && <Text area label="텍스트" value={props.text} onChange={(v) => P({ text: v })} />}
          </>
        );
        break;
      }
      case "Input": specific = <Text label="안내 문구(Placeholder)" value={props.placeholder} onChange={(v) => P({ placeholder: v })} />; break;
      case "Image": specific = <Text area label="이미지 URL (https://…)" value={props.src} onChange={(v) => P({ src: v })} />; break;
      case "Listbox": specific = <StringList label="항목" items={props.items ?? []} addLabel="항목 추가" newItem={`항목 ${(props.items ?? []).length + 1}`} onChange={(items) => P({ items, selectedIndex: Math.min(props.selectedIndex ?? 0, Math.max(0, items.length - 1)) })} />; break;
      case "Dropdown": specific = <StringList label="옵션" items={props.options ?? []} addLabel="옵션 추가" newItem={`옵션 ${(props.options ?? []).length + 1}`} onChange={(options) => P({ options })} />; break;
      case "Alert":
        specific = (
          <>
            <Text label="텍스트" value={props.text} onChange={(v) => P({ text: v })} />
            <Select label="종류" value={props.type} onChange={(v) => P({ type: v })} options={[{ value: "info", label: "정보" }, { value: "success", label: "성공" }, { value: "warning", label: "경고" }, { value: "error", label: "오류" }]} />
            <Check label="닫기 버튼 표시" value={props.dismissible} onChange={(v) => P({ dismissible: v })} />
          </>
        );
        break;
      case "Icon": specific = <Select label="아이콘" value={props.icon} onChange={(v) => P({ icon: v })} options={ICON_NAMES.map((n) => ({ value: n, label: ICON_LABEL[n] ?? n }))} />; break;
      case "Progress":
        specific = (
          <>
            <Num label="진행률 (%)" value={props.progress} min={0} onChange={(v) => P({ progress: Math.max(0, Math.min(100, v)) })} />
            <Check label="레이블 표시" value={props.showLabel} onChange={(v) => P({ showLabel: v })} />
          </>
        );
        break;
      case "Slider": specific = <Num label="값 (0~100)" value={props.value} onChange={(v) => P({ value: Math.max(0, Math.min(100, v)) })} />; break;
      case "Loader": specific = <Select label="스타일" value={props.style} onChange={(v) => P({ style: v })} options={[{ value: "spinner", label: "스피너" }, { value: "dots", label: "점" }]} />; break;
      case "Toggle":
        specific = (
          <>
            <Check label="켜짐" value={props.isOn} onChange={(v) => P({ isOn: v })} />
            <Text label="왼쪽 텍스트" value={props.leftLabel} onChange={(v) => P({ leftLabel: v })} />
            <Text label="오른쪽 텍스트" value={props.rightLabel} onChange={(v) => P({ rightLabel: v })} />
          </>
        );
        break;
      case "Radio":
        specific = (
          <>
            <Text label="레이블" value={props.label} onChange={(v) => P({ label: v })} />
            <Text label="그룹 이름" value={props.name} onChange={(v) => P({ name: v })} />
            <Check label="선택됨" value={props.checked} onChange={(v) => P({ checked: v })} />
          </>
        );
        break;
      case "Checkbox":
        specific = (
          <>
            <Text label="레이블" value={props.label} onChange={(v) => P({ label: v })} />
            <Check label="선택됨" value={props.checked} onChange={(v) => P({ checked: v })} />
          </>
        );
        break;
      case "Tabs":
        specific = (
          <>
            <StringList label="탭" items={props.tabs ?? []} addLabel="탭 추가" newItem={`탭 ${(props.tabs ?? []).length + 1}`} onChange={(tabs) => P({ tabs, activeTab: Math.min(props.activeTab ?? 0, Math.max(0, tabs.length - 1)) })} />
            <Num label="활성 탭 번호 (0부터)" value={props.activeTab ?? 0} min={0} onChange={(v) => P({ activeTab: Math.max(0, Math.min(v, (props.tabs ?? []).length - 1)) })} />
            <Select label="스타일" value={props.style} onChange={(v) => P({ style: v })} options={[{ value: "line", label: "라인" }, { value: "pill", label: "알약" }, { value: "segmented", label: "분할" }]} />
          </>
        );
        break;
      case "Accordion": {
        const items: { title: string; content: string }[] = props.items ?? [];
        specific = (
          <div className="uc-list">
            {items.map((it, i) => (
              <div key={i} className="uc-card-mini">
                <Text label={`항목 ${i + 1} 제목`} value={it.title} onChange={(v) => P({ items: items.map((x, j) => (j === i ? { ...x, title: v } : x)) })} />
                <Text area label={`항목 ${i + 1} 내용`} value={it.content} onChange={(v) => P({ items: items.map((x, j) => (j === i ? { ...x, content: v } : x)) })} />
                <button type="button" onClick={() => P({ items: items.filter((_, j) => j !== i), openItem: 0 })}>이 항목 삭제</button>
              </div>
            ))}
            <button type="button" onClick={() => P({ items: [...items, { title: `항목 ${items.length + 1}`, content: "새로운 내용" }] })}>항목 추가</button>
          </div>
        );
        break;
      }
      case "Modal":
        specific = (<><Text label="제목" value={props.title} onChange={(v) => P({ title: v })} /><Text area label="내용" value={props.content} onChange={(v) => P({ content: v })} /></>);
        break;
      case "Tooltip": specific = <Text label="툴팁 텍스트" value={props.text} onChange={(v) => P({ text: v })} />; break;
      case "Popover":
        specific = (
          <>
            <Text label="제목" value={props.title} onChange={(v) => P({ title: v })} />
            <Select label="방향" value={props.placement} onChange={(v) => P({ placement: v })} options={[{ value: "top", label: "위" }, { value: "bottom", label: "아래" }, { value: "left", label: "왼쪽" }, { value: "right", label: "오른쪽" }]} />
          </>
        );
        break;
      default: specific = null;
    }

    return (
      <div className="uc-props">
        <div className="uc-props-head">
          <strong>{TYPE_LABEL[c.type]}</strong>
          <span>
            {c.type === "Container" && (
              <button type="button" className="uc-icon-btn" title={c.isLocked ? "잠금 해제" : "잠금"} onClick={p.onToggleLock}>{c.isLocked ? <LockOpen size={15} /> : <Lock size={15} />}</button>
            )}
            <button type="button" className="uc-icon-btn" title="복제 (Ctrl+D)" onClick={p.onDuplicate}><Copy size={15} /></button>
            <button type="button" className="uc-icon-btn danger" title="삭제 (Delete)" onClick={p.onDelete}><Trash2 size={15} /></button>
          </span>
        </div>
        <Group2 title="기본 정보">
          <Text label="이름" value={c.name} onChange={(v) => p.onMeta(c.id, { name: v })} />
          <Text area label="설명 (역할·상태)" value={c.description} onChange={(v) => p.onMeta(c.id, { description: v })} />
        </Group2>
        {stylePresets.length > 0 && (
          <Group2 title="스타일 프리셋">
            <div className="uc-preset-grid">
              {stylePresets.map((x) => <button key={x.name} type="button" onClick={() => p.onPreset(c.id, x.name)}>{x.label ?? x.name}</button>)}
            </div>
          </Group2>
        )}
        {specific && <Group2 title="고유 속성">{specific}</Group2>}
        <Group2 title="크기 및 위치">
          <div className="uc-two">
            <Num label="너비" value={c.size.width} min={1} onChange={(v) => p.onSize(c.id, { width: Math.max(1, v), height: c.size.height })} />
            <Num label="높이" value={c.size.height} min={1} onChange={(v) => p.onSize(c.id, { width: c.size.width, height: Math.max(1, v) })} />
            <Num label="X" value={Math.round(c.position.x)} onChange={(v) => p.onPosition(c.id, { x: v, y: c.position.y })} />
            <Num label="Y" value={Math.round(c.position.y)} onChange={(v) => p.onPosition(c.id, { x: c.position.x, y: v })} />
          </div>
        </Group2>
        {TEXT_TYPES.includes(c.type) && (
          <Group2 title="텍스트">
            <Color label="색상" value={c.styles.color} onChange={(v) => S({ color: v })} />
            <div className="uc-two">
              <Num label="크기 (px)" value={c.styles.fontSize} min={1} onChange={(v) => S({ fontSize: v })} />
              <Select label="굵기" value={String(c.styles.fontWeight ?? "400")} onChange={(v) => S({ fontWeight: v })}
                options={[{ value: "300", label: "가늘게" }, { value: "400", label: "보통" }, { value: "500", label: "중간" }, { value: "600", label: "약간 굵게" }, { value: "700", label: "굵게" }, { value: "bold", label: "굵게(bold)" }]} />
            </div>
            <Select label="정렬" value={c.styles.textAlign ?? "left"} onChange={(v) => S({ textAlign: v })} options={[{ value: "left", label: "왼쪽" }, { value: "center", label: "가운데" }, { value: "right", label: "오른쪽" }]} />
          </Group2>
        )}
        <Group2 title="채우기">
          <Color label="배경색" value={c.styles.backgroundColor} onChange={(v) => S({ backgroundColor: v })} />
          {c.type === "Progress" && <Color label="진행 막대 색" value={c.styles.barColor} onChange={(v) => S({ barColor: v })} />}
        </Group2>
        <Group2 title="테두리">
          <Color label="색상" value={c.styles.borderColor} onChange={(v) => S({ borderColor: v })} />
          <div className="uc-two">
            <Num label="두께 (px)" value={c.styles.borderWidth ?? 0} min={0} onChange={(v) => S({ borderWidth: Math.max(0, v) })} />
            <Num label="반경 (px)" value={c.styles.borderRadius ?? 0} min={0} onChange={(v) => S({ borderRadius: Math.max(0, v) })} />
          </div>
        </Group2>
      </div>
    );
  };

  return (
    <aside className="uc-right" aria-label="속성 패널">
      <div className="uc-tabs">
        <button type="button" disabled={!c} aria-pressed={active === "props"} onClick={() => setTab("props")}><SlidersHorizontal size={15} />속성</button>
        <button type="button" aria-pressed={active === "spec"} onClick={() => setTab("spec")}><FileText size={15} />명세</button>
      </div>
      <div className="uc-right-body">
        {active === "props" && c ? body() : (
          <div className="uc-props">
            <h3 className="uc-spec-title">디자인 명세서</h3>
            <Text label="애플리케이션 이름" value={p.spec.appName} onChange={(v) => p.onSpec({ ...p.spec, appName: v })} />
            <Text area label="애플리케이션 상세 설명" value={p.spec.appDescription} onChange={(v) => p.onSpec({ ...p.spec, appDescription: v })} />
            <Text area label="화면 설명" value={p.spec.screenDescription} onChange={(v) => p.onSpec({ ...p.spec, screenDescription: v })} />
            <button type="button" className="primary uc-wide" disabled={p.aiBusy} onClick={p.onAiFill}>
              <Sparkles size={15} />{p.aiBusy ? "AI가 제안 중…" : "AI로 내용 채우기"}
            </button>
            <p className="uc-hint">회원 본인의 Gemini API 키로 호출합니다. 키는 [API키등록·플랫폼연동]에서 등록하세요.</p>
          </div>
        )}
      </div>
    </aside>
  );
}
