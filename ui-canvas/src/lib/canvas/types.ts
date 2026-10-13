// 원본(GPT PARK UI 캔버스 Pro) JSON과 호환되는 데이터 모델 — type 문자열 값은 원본과 동일하게 유지한다.
export const COMPONENT_TYPES = [
  "Button", "Input", "Listbox", "Tabs", "Dropdown", "Radio", "Checkbox", "Toggle", "Slider",
  "Alert", "Loader", "Progress", "Tooltip", "Modal", "Popover", "Icon", "Text", "Image",
  "Container", "Accordion", "BarChart", "LineChart", "PieChart", "Group", "Misc",
] as const;
export type ComponentType = (typeof COMPONENT_TYPES)[number];

/* eslint-disable @typescript-eslint/no-explicit-any */
export interface CanvasComponent {
  id: string;
  name: string;
  type: ComponentType;
  position: { x: number; y: number };
  size: { width: number; height: number };
  props: Record<string, any>;
  styles: Record<string, any>;
  description: string;
  parentId?: string;
  isLocked?: boolean;
}

export interface Preset {
  name: string;
  label?: string;
  styles: Record<string, any>;
  props?: Record<string, any>;
  type?: "functional" | "style";
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export interface DesignSpec {
  appName: string;
  appDescription: string;
  screenDescription: string;
}

export interface CanvasSize { width: number; height: number }

export interface ProjectDoc {
  components: CanvasComponent[];
  spec: DesignSpec;
  canvas: CanvasSize;
  dark: boolean;
}

export const EMPTY_SPEC: DesignSpec = { appName: "", appDescription: "", screenDescription: "" };
export const DEFAULT_CANVAS: CanvasSize = { width: 1440, height: 900 };
export const CANVAS_PRESETS: { label: string; size: CanvasSize }[] = [
  { label: "데스크톱 1440×900", size: { width: 1440, height: 900 } },
  { label: "노트북 1280×800", size: { width: 1280, height: 800 } },
  { label: "태블릿 820×1180", size: { width: 820, height: 1180 } },
  { label: "모바일 390×844", size: { width: 390, height: 844 } },
];
