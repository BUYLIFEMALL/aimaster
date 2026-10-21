import type { Plan, SubPage } from "./types";

// 「🧩 UI Canvas로 보내 다듬기」(2026-10-21 v1.11~) — 기획안을 UI Canvas 자동화 프로젝트 문서로 바꾼다(AI 없이 규칙으로).
// 문서 모양은 ui-canvas/src/lib/canvas/types.ts의 ProjectDoc·CanvasComponent와 같아야 한다(저장 표 ui_canvas_projects.doc).
// v1.12: 이미지 에셋을 이미지 컴포넌트로 배치, 서브 페이지는 각각 별도 프로젝트 문서로.
/* eslint-disable @typescript-eslint/no-explicit-any */
interface CanvasComponent {
  id: string;
  name: string;
  type: "Text" | "Button" | "Container" | "Image";
  position: { x: number; y: number };
  size: { width: number; height: number };
  props: Record<string, any>;
  styles: Record<string, any>;
  description: string;
  isLocked?: boolean;
}
export interface CanvasDoc {
  components: CanvasComponent[];
  spec: { appName: string; appDescription: string; screenDescription: string };
  canvas: { width: number; height: number };
  dark: boolean;
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

/** 키 없는 무료 임시 사진(프로토타입의 fallbackPicsum과 같은 방식). 키워드가 같으면 늘 같은 사진 */
export function placeholderImage(keyword: string, w: number, h: number): string {
  const kw = (keyword || "landing").toLowerCase().replace(/[^a-z0-9가-힣 -]/g, "").trim() || "landing";
  return `https://picsum.photos/seed/${encodeURIComponent(kw)}/${w}/${h}`;
}

function builder() {
  const list: CanvasComponent[] = [];
  let n = 0;
  const add = (type: CanvasComponent["type"], name: string, x: number, y: number, w: number, h: number, props: Record<string, any>, styles: Record<string, any>, description = "") => {
    n += 1;
    list.push({ id: `lpa-${type.toLowerCase()}-${n}-${Math.random().toString(36).slice(2, 8)}`, name: name.slice(0, 40), type, position: { x, y }, size: { width: w, height: h }, props, styles, description: description.slice(0, 2000), isLocked: false });
  };
  return { list, add };
}

const text = (fontSize: number, fontWeight: number, color: string) => ({ fontSize, fontWeight, color, backgroundColor: "transparent", textAlign: "left", padding: "4px 8px" });

/**
 * 메인 페이지: 히어로(헤드라인·설명·CTA·대표 이미지) + 섹션마다 상자·제목·설명·이미지.
 * imageUrls(키워드 → 실제 사진 주소, v1.13)가 있으면 그 사진을, 없으면 무료 임시 사진을 쓴다.
 */
export function planToCanvasDoc(plan: Plan, imageUrls: Record<string, string> = {}): CanvasDoc {
  const ds = plan.designSystem;
  const bg = ds.backgroundColor || "#ffffff";
  const primary = ds.primaryColor || "#2563eb";
  const secondary = ds.secondaryColor || "#f1f5f9";
  const fg = textOn(bg);
  const assets = plan.imageAssets.filter((a) => a.keyword || a.name);
  const { list, add } = builder();
  const image = (a: Plan["imageAssets"][number], x: number, y: number, w: number, h: number) => {
    const real = /^https:\/\//.test(imageUrls[a.keyword] ?? "") ? imageUrls[a.keyword] : "";
    add("Image", `이미지: ${a.name || a.keyword}`, x, y, w, h, { src: real || placeholderImage(a.keyword || a.name, w * 2, h * 2) }, { objectFit: "cover", borderRadius: 12, borderWidth: 0 },
      real
        ? `${a.description || a.name} (키워드: ${a.keyword}) — 회원님의 이미지 소스에서 찾은 사진입니다. 사용 조건(출처 표기 등)은 해당 사이트 기준을 따라 주세요.`
        : `${a.description || a.name} (키워드: ${a.keyword}) — 임시 사진입니다. 오른쪽 [속성]에서 실제 이미지 주소로 바꿔 주세요.`);
  };

  // 히어로: 대표 이미지가 있으면 글은 왼쪽, 이미지는 오른쪽
  const hero = assets[0];
  const textW = hero ? 720 : W - PAD * 2;
  add("Container", "히어로 배경", 0, 0, W, 420, {}, { backgroundColor: secondary, borderWidth: 0, borderRadius: 0 }, "히어로 영역");
  add("Text", "헤드라인", PAD, 100, textW, 90, { text: plan.contentStrategy.headline || plan.projectInfo.topic }, text(44, 800, textOn(secondary)));
  add("Text", "서브 헤드라인", PAD, 200, textW, 70, { text: plan.contentStrategy.subHeadline }, text(20, 400, textOn(secondary)));
  if (plan.contentStrategy.cta) {
    add("Button", "CTA 버튼", PAD, 300, 260, 60, { text: plan.contentStrategy.cta, kind: "text" }, { backgroundColor: primary, color: textOn(primary), borderRadius: 12, borderWidth: 0, fontSize: 18, fontWeight: 700 });
  }
  if (hero) image(hero, PAD + textW + 40, 60, W - PAD * 2 - textW - 40, 300);

  // 섹션: 남은 이미지를 차례로 오른쪽에 하나씩
  let y = 480;
  plan.structure.mainPage.sections.forEach((s, i) => {
    if (y + 200 > MAX_H - 40) return;
    const a = assets[i + 1];
    const innerW = W - PAD * 2 - 64 - (a ? 300 : 0);
    add("Container", `섹션: ${s.title}`, PAD, y, W - PAD * 2, 200, {}, { backgroundColor: bg === "#ffffff" ? "#f8fafc" : bg, borderColor: secondary, borderWidth: 1, borderRadius: 16 }, s.description);
    add("Text", `${s.title} 제목`, PAD + 32, y + 24, innerW, 44, { text: s.title }, text(24, 700, fg));
    add("Text", `${s.title} 설명`, PAD + 32, y + 76, innerW, 100, { text: s.description }, text(16, 400, fg));
    if (a) image(a, W - PAD - 32 - 260, y + 20, 260, 160);
    y += 232;
  });

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

/** 내용이 있는 서브 페이지만(목적·콘텐츠 명세가 둘 다 비면 기본으로 채운 자리라 건너뜀) */
export function sendableSubPages(plan: Plan): SubPage[] {
  return plan.structure.subPages.filter((p) => p.purpose.trim() || p.contentSpecs.trim());
}

/** 서브 페이지 1개 → 캔버스 문서: 상단 바·페이지 제목·경로·목적·콘텐츠 명세·메인으로 돌아가는 버튼 */
export function subPageToCanvasDoc(plan: Plan, page: SubPage): CanvasDoc {
  const ds = plan.designSystem;
  const bg = ds.backgroundColor || "#ffffff";
  const primary = ds.primaryColor || "#2563eb";
  const secondary = ds.secondaryColor || "#f1f5f9";
  const fg = textOn(bg);
  const { list, add } = builder();
  add("Container", "상단 바", 0, 0, W, 80, {}, { backgroundColor: secondary, borderWidth: 0, borderRadius: 0 }, "공통 상단 메뉴");
  add("Text", "사이트 이름", PAD, 20, 600, 40, { text: plan.projectInfo.topic }, text(20, 700, textOn(secondary)));
  add("Text", "페이지 제목", PAD, 130, W - PAD * 2, 70, { text: page.title }, text(36, 800, fg));
  add("Text", "페이지 경로", PAD, 205, 600, 32, { text: page.path }, text(14, 500, primary));
  add("Container", "목적 상자", PAD, 260, W - PAD * 2, 150, {}, { backgroundColor: bg === "#ffffff" ? "#f8fafc" : bg, borderColor: secondary, borderWidth: 1, borderRadius: 16 }, "이 페이지의 목적");
  add("Text", "목적 제목", PAD + 32, 280, 400, 36, { text: "이 페이지의 목적" }, text(18, 700, fg));
  add("Text", "목적", PAD + 32, 322, W - PAD * 2 - 64, 76, { text: page.purpose }, text(16, 400, fg));
  add("Container", "콘텐츠 상자", PAD, 440, W - PAD * 2, 300, {}, { backgroundColor: bg === "#ffffff" ? "#f8fafc" : bg, borderColor: secondary, borderWidth: 1, borderRadius: 16 }, "들어갈 콘텐츠");
  add("Text", "콘텐츠 제목", PAD + 32, 460, 400, 36, { text: "들어갈 콘텐츠" }, text(18, 700, fg));
  add("Text", "콘텐츠 명세", PAD + 32, 502, W - PAD * 2 - 64, 220, { text: page.contentSpecs }, text(16, 400, fg));
  add("Button", "메인으로 버튼", PAD, 780, 220, 52, { text: "메인으로 돌아가기", kind: "text" }, { backgroundColor: primary, color: textOn(primary), borderRadius: 12, borderWidth: 0, fontSize: 16, fontWeight: 700 });
  return {
    components: list,
    spec: {
      appName: plan.projectInfo.topic.slice(0, 200),
      appDescription: `${plan.projectInfo.goal}\n대상: ${plan.projectInfo.target}`.slice(0, 8000),
      screenDescription: `서브 페이지 「${page.title}」(${page.path}) 초안입니다. 목적: ${page.purpose}`.slice(0, 8000),
    },
    canvas: { width: W, height: 900 },
    dark: textOn(bg) === "#ffffff",
  };
}
