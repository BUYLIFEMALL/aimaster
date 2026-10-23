/* eslint-disable @typescript-eslint/no-explicit-any */
import { COMPONENT_TYPES, type CanvasComponent, type CanvasSize, type ComponentType, type DesignSpec, type Preset } from "./types";
import { DEFAULTS } from "./constants";

const TYPE_SET = new Set<string>(COMPONENT_TYPES);
export type LayerMove = "up" | "down" | "top" | "bottom";

let seq = 0;
export function newId(type: string): string {
  seq += 1;
  return `${type}-${Date.now().toString(36)}-${seq.toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function randomChartData(rand: () => number = Math.random) {
  const letters = ["A", "B", "C", "D", "E", "F", "G"];
  const n = Math.floor(rand() * 4) + 4;
  return Array.from({ length: n }, (_, i) => ({
    name: letters[i],
    value1: Math.floor(rand() * 80) + 20,
    value2: Math.floor(rand() * 60) + 15,
  }));
}

/** 새 컴포넌트(이름은 "타입+번호"). 차트는 임의 데이터가 들어간다. */
export function makeComponent(
  type: ComponentType,
  position: { x: number; y: number },
  size: { width: number; height: number },
  existing: CanvasComponent[],
): CanvasComponent {
  const d = DEFAULTS[type];
  const props = clone(d.props);
  if (type === "BarChart" || type === "LineChart" || type === "PieChart") props.data = randomChartData();
  const count = existing.filter((c) => c.type === type).length + 1;
  return {
    id: newId(type),
    name: `${type}${count}`,
    type,
    position: { x: Math.round(position.x), y: Math.round(position.y) },
    size: { width: Math.max(10, Math.round(size.width)), height: Math.max(10, Math.round(size.height)) },
    props,
    styles: clone(d.styles),
    description: "",
    isLocked: false,
  };
}

export function topLevelId(id: string, comps: CanvasComponent[]): string {
  let cur = comps.find((c) => c.id === id);
  const seen = new Set<string>();
  while (cur?.parentId && !seen.has(cur.id)) {
    seen.add(cur.id);
    const parent = comps.find((c) => c.id === cur!.parentId);
    if (!parent) break;
    cur = parent;
  }
  return cur ? cur.id : id;
}

export function childrenOf(id: string, comps: CanvasComponent[]): CanvasComponent[] {
  return comps.filter((c) => c.parentId === id);
}

export function descendantIds(id: string, comps: CanvasComponent[]): string[] {
  const out: string[] = [];
  const stack = [id];
  const seen = new Set<string>([id]);
  while (stack.length) {
    const cur = stack.pop()!;
    for (const c of comps) {
      if (c.parentId === cur && !seen.has(c.id)) {
        seen.add(c.id);
        out.push(c.id);
        stack.push(c.id);
      }
    }
  }
  return out;
}

/** 지정한 컴포넌트와(그룹이면) 그 자식을 모두 지운다. */
export function deleteComponents(comps: CanvasComponent[], ids: string[]): CanvasComponent[] {
  const doomed = new Set<string>();
  for (const id of ids) {
    doomed.add(id);
    descendantIds(id, comps).forEach((d) => doomed.add(d));
  }
  return comps.filter((c) => !doomed.has(c.id));
}

/** 복제: 최상위는 +20px, 그룹이면 자식까지 새 id로 복제한다. */
export function duplicateComponent(comps: CanvasComponent[], id: string): { components: CanvasComponent[]; newId: string | null } {
  const original = comps.find((c) => c.id === id);
  if (!original) return { components: comps, newId: null };
  const added: CanvasComponent[] = [];
  const walk = (src: CanvasComponent, parentId?: string): string => {
    const nid = newId(src.type);
    added.push({
      ...clone(src),
      id: nid,
      name: `${src.name} 복사본`,
      parentId,
      position: parentId ? { ...src.position } : { x: src.position.x + 20, y: src.position.y + 20 },
    });
    if (src.type === "Group") childrenOf(src.id, comps).forEach((child) => walk(child, nid));
    return nid;
  };
  const rootId = walk(original, original.parentId);
  return { components: [...comps, ...added], newId: rootId };
}

export function moveLayer(comps: CanvasComponent[], id: string, dir: LayerMove): CanvasComponent[] {
  const index = comps.findIndex((c) => c.id === id);
  if (index === -1) return comps;
  const next = [...comps];
  const [item] = next.splice(index, 1);
  if (dir === "up") next.splice(Math.min(index + 1, next.length), 0, item);
  else if (dir === "down") next.splice(Math.max(index - 1, 0), 0, item);
  else if (dir === "top") next.push(item);
  else next.unshift(item);
  return next;
}

export type GroupResult = { ok: true; components: CanvasComponent[]; groupId: string } | { ok: false; error: string };

export function groupComponents(comps: CanvasComponent[], ids: string[]): GroupResult {
  if (ids.length < 2) return { ok: false, error: "그룹으로 묶으려면 컴포넌트를 2개 이상 선택하세요." };
  const picked = comps.filter((c) => ids.includes(c.id));
  if (picked.length < 2) return { ok: false, error: "선택한 컴포넌트를 찾을 수 없습니다." };
  if (picked.some((c) => c.parentId)) return { ok: false, error: "이미 그룹에 속한 컴포넌트는 다시 그룹으로 묶을 수 없습니다." };
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const c of picked) {
    minX = Math.min(minX, c.position.x);
    minY = Math.min(minY, c.position.y);
    maxX = Math.max(maxX, c.position.x + c.size.width);
    maxY = Math.max(maxY, c.position.y + c.size.height);
  }
  const base = DEFAULTS.Group;
  const groupCount = comps.filter((c) => c.type === "Group").length + 1;
  const group: CanvasComponent = {
    id: newId("Group"),
    name: `그룹 ${groupCount}`,
    type: "Group",
    position: { x: minX, y: minY },
    size: { width: maxX - minX, height: maxY - minY },
    props: clone(base.props),
    styles: clone(base.styles),
    description: "",
    isLocked: false,
  };
  const moved = comps.map((c) =>
    ids.includes(c.id) ? { ...c, parentId: group.id, position: { x: c.position.x - minX, y: c.position.y - minY } } : c,
  );
  return { ok: true, components: [...moved, group], groupId: group.id };
}

export function ungroupComponents(comps: CanvasComponent[], groupId: string): { components: CanvasComponent[]; childIds: string[] } | null {
  const group = comps.find((c) => c.id === groupId);
  if (!group || group.type !== "Group") return null;
  const childIds: string[] = [];
  const components = comps
    .map((c) => {
      if (c.parentId !== groupId) return c;
      childIds.push(c.id);
      const { parentId: _drop, ...rest } = c;
      void _drop;
      return { ...rest, position: { x: c.position.x + group.position.x, y: c.position.y + group.position.y } } as CanvasComponent;
    })
    .filter((c) => c.id !== groupId);
  return { components, childIds };
}

/** 프리셋 적용. 버튼의 "용도" 프리셋은 기본 props로 되돌린 뒤 덮어쓴다. */
export function applyPreset(comp: CanvasComponent, preset: Preset): CanvasComponent {
  const reset = comp.type === "Button" && preset.type === "functional";
  const baseProps = reset ? clone(DEFAULTS.Button.props) : comp.props;
  return { ...comp, styles: { ...comp.styles, ...preset.styles }, props: { ...baseProps, ...(preset.props ?? {}) } };
}

// ---- 불러오기 검증 (원본 JSON 호환) ----

export function isValidComponentsArray(arr: unknown): arr is CanvasComponent[] {
  if (!Array.isArray(arr)) return false;
  return arr.every((item: any) =>
    item && typeof item === "object" &&
    typeof item.id === "string" && typeof item.type === "string" && "name" in item && "description" in item &&
    item.position && typeof item.position.x === "number" && typeof item.position.y === "number" &&
    item.size && typeof item.size.width === "number" && typeof item.size.height === "number" &&
    item.props && typeof item.props === "object" && item.styles && typeof item.styles === "object",
  );
}

export interface ImportResult { components: CanvasComponent[]; spec: DesignSpec | null }

/** 컴포넌트 JSON(배열) · 디자인 명세 JSON({application,screen,components}) 모두 읽는다. 여러 파일이면 마지막 유효 컴포넌트를 쓴다. */
export function parseImportedJson(texts: string[]): ImportResult {
  let components: CanvasComponent[] | null = null;
  let spec = null as DesignSpec | null;
  for (const text of texts) {
    const data: any = JSON.parse(text);
    if (isValidComponentsArray(data)) components = data;
    else if (data && typeof data === "object" && !Array.isArray(data) && isValidComponentsArray(data.components)) components = data.components;
    if (data && typeof data === "object" && !Array.isArray(data) && (data.application || data.screen)) {
      spec = {
        appName: String(data.application?.name ?? spec?.appName ?? ""),
        appDescription: String(data.application?.description ?? spec?.appDescription ?? ""),
        screenDescription: String(data.screen?.description ?? spec?.screenDescription ?? ""),
      };
    }
  }
  if (!components) throw new Error("지원하지 않는 JSON 형식입니다. 유효한 컴포넌트 데이터를 찾을 수 없습니다.");
  return { components: sanitizeComponents(components), spec };
}

/** 알 수 없는 type 제거, 필수 필드 보정, 존재하지 않는 부모 참조 해제 */
export function sanitizeComponents(list: CanvasComponent[]): CanvasComponent[] {
  const ids = new Set(list.map((c) => c.id));
  return list
    .filter((c) => TYPE_SET.has(c.type))
    .map((c) => ({
      ...c,
      name: String(c.name ?? c.type),
      description: String(c.description ?? ""),
      parentId: c.parentId && ids.has(c.parentId) ? c.parentId : undefined,
      isLocked: !!c.isLocked,
    }));
}

// ---- 좌표 보정 ----

/** 최상위 컴포넌트를 캔버스 안으로 들인다(크기가 캔버스보다 크면 줄인다). */
export function clampToCanvas(comps: CanvasComponent[], canvas: CanvasSize): CanvasComponent[] {
  return comps.map((c) => {
    if (c.parentId) return c;
    const width = Math.max(10, Math.min(c.size.width, canvas.width));
    const height = Math.max(10, Math.min(c.size.height, canvas.height));
    const x = Math.max(0, Math.min(c.position.x, canvas.width - width));
    const y = Math.max(0, Math.min(c.position.y, canvas.height - height));
    return { ...c, position: { x: Math.round(x), y: Math.round(y) }, size: { width: Math.round(width), height: Math.round(height) } };
  });
}

/** AI가 만든 원시 컴포넌트를 앱 모델로 변환(알 수 없는 type 제외, 기본값 병합, 캔버스 안으로 보정) */
export function normalizeAiComponents(raw: unknown, canvas: CanvasSize): CanvasComponent[] {
  if (!Array.isArray(raw)) return [];
  const out: CanvasComponent[] = [];
  for (const item of raw as any[]) {
    if (!item || typeof item !== "object" || !TYPE_SET.has(item.type) || item.type === "Group") continue;
    const type = item.type as ComponentType;
    const d = DEFAULTS[type];
    const x = Number(item.position?.x);
    const y = Number(item.position?.y);
    const w = Number(item.size?.width);
    const h = Number(item.size?.height);
    out.push({
      id: newId(type),
      name: String(item.name || `${type}${out.length + 1}`),
      type,
      position: { x: Number.isFinite(x) ? x : 0, y: Number.isFinite(y) ? y : 0 },
      size: { width: Number.isFinite(w) && w > 0 ? w : d.size.width, height: Number.isFinite(h) && h > 0 ? h : d.size.height },
      props: { ...clone(d.props), ...(item.props && typeof item.props === "object" ? item.props : {}) },
      styles: clone(d.styles),
      description: String(item.description ?? ""),
      isLocked: false,
    });
  }
  return clampToCanvas(out, canvas);
}

// ---- 선택 ----

export function marqueeSelect(comps: CanvasComponent[], rect: { x: number; y: number; width: number; height: number }): string[] {
  return comps
    .filter((c) => !c.parentId && !c.isLocked)
    .filter((c) =>
      c.position.x < rect.x + rect.width && c.position.x + c.size.width > rect.x &&
      c.position.y < rect.y + rect.height && c.position.y + c.size.height > rect.y)
    .map((c) => c.id);
}

// ---- 내보내기 / AI 요약 ----

export function buildComponentsJson(comps: CanvasComponent[]): string {
  return JSON.stringify(comps, null, 2);
}

export function buildDesignSpecJson(spec: DesignSpec, comps: CanvasComponent[]): string {
  return JSON.stringify(
    { application: { name: spec.appName, description: spec.appDescription }, screen: { name: "Main Screen", description: spec.screenDescription }, components: comps },
    null, 2,
  );
}

export function summarizeForSpec(comps: CanvasComponent[]) {
  return comps.slice(0, 200).map((c) => ({
    name: c.name, type: c.type, purpose: c.description,
    text: c.props?.text ?? c.props?.placeholder ?? c.props?.label ?? undefined,
    position: c.position, size: c.size,
  }));
}
