import type { LayoutType, Plan, PlanSection, SubPage } from "./types";

const LAYOUTS: LayoutType[] = ["card", "document", "hero", "gallery", "landing"];
const HEX = /^#[0-9a-fA-F]{6}$/;

const str = (v: unknown, max = 600, fallback = ""): string => {
  const s = typeof v === "string" ? v : typeof v === "number" ? String(v) : "";
  return (s.trim() || fallback).slice(0, max);
};
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const obj = (v: unknown): Record<string, unknown> => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {});
const color = (v: unknown, fallback: string) => (typeof v === "string" && HEX.test(v.trim()) ? v.trim() : fallback);

/** AI 응답 문자열에서 JSON 객체를 꺼낸다(코드블록·앞뒤 설명 제거). 실패하면 null */
export function parseJsonLoose(text: string | undefined | null): unknown {
  if (!text) return null;
  let t = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
  try { return JSON.parse(t); } catch { /* 아래에서 중괄호 범위로 재시도 */ }
  const a = t.indexOf("{");
  const b = t.lastIndexOf("}");
  if (a >= 0 && b > a) {
    t = t.slice(a, b + 1);
    try { return JSON.parse(t); } catch { return null; }
  }
  return null;
}

function normSubPages(v: unknown): SubPage[] {
  const list = arr(v).map((x, i) => {
    const o = obj(x);
    const id = str(o.id, 40, `sub${i + 1}`).replace(/[^a-zA-Z0-9_-]/g, "") || `sub${i + 1}`;
    return {
      id,
      title: str(o.title, 80, `서브 페이지 ${i + 1}`),
      path: str(o.path, 80, `/${id}`),
      purpose: str(o.purpose, 400),
      contentSpecs: str(o.contentSpecs, 800),
    };
  });
  return list.slice(0, 4);
}

/** 구조 섹션(페이지 구조)을 정규화한다. 서브 페이지는 항상 4개로 맞춘다. */
function normStructure(v: unknown): Plan["structure"] {
  const o = obj(v);
  const main = obj(o.mainPage);
  const sections = arr(main.sections).slice(0, 12).map((x, i) => {
    const s = obj(x);
    return { id: str(s.id, 40, `section${i + 1}`), title: str(s.title, 80, `섹션 ${i + 1}`), description: str(s.description, 400) };
  });
  const subs = normSubPages(o.subPages);
  while (subs.length < 4) {
    const n = subs.length + 1;
    subs.push({ id: `sub${n}`, title: `서브 페이지 ${n}`, path: `/sub${n}`, purpose: "", contentSpecs: "" });
  }
  return { mainPage: { title: str(main.title, 80, "메인 페이지"), sections }, subPages: subs };
}

function normSection(key: PlanSection, v: unknown, fallbackLayout: LayoutType): Plan[PlanSection] {
  const o = obj(v);
  switch (key) {
    case "projectInfo": {
      const layout = LAYOUTS.includes(o.layoutType as LayoutType) ? (o.layoutType as LayoutType) : fallbackLayout;
      return {
        topic: str(o.topic, 200), target: str(o.target, 400), goal: str(o.goal, 400), language: "ko",
        layoutType: layout, structureStrategy: str(o.structureStrategy, 600), designIntent: str(o.designIntent, 600),
      };
    }
    case "structure": return normStructure(v);
    case "contentStrategy":
      return {
        headline: str(o.headline, 160), subHeadline: str(o.subHeadline, 240), cta: str(o.cta, 60),
        keyMessages: arr(o.keyMessages).map((x) => str(x, 200)).filter(Boolean).slice(0, 8),
      };
    case "designSystem":
      return {
        primaryColor: color(o.primaryColor, "#4f46e5"), secondaryColor: color(o.secondaryColor, "#0ea5e9"),
        backgroundColor: color(o.backgroundColor, "#ffffff"), typography: str(o.typography, 200), mood: str(o.mood, 300),
      };
    case "developmentGuide":
      return {
        stack: str(o.stack, 200, "Vite + React + TypeScript + Tailwind CSS"),
        folderStructure: arr(o.folderStructure).map((x) => str(x, 120)).filter(Boolean).slice(0, 30),
        deployment: str(o.deployment, 800),
      };
    case "imageAssets":
      return arr(v).slice(0, 16).map((x, i) => {
        const a = obj(x);
        return { name: str(a.name, 60, `image-${i + 1}`), keyword: cleanKeyword(str(a.keyword, 60, "landscape")), description: str(a.description, 200) };
      });
  }
}

export function cleanKeyword(k: string): string {
  const s = k.toLowerCase().replace(/[^a-z0-9, -]/g, "").replace(/\s+/g, "-").replace(/^-+|-+$/g, "");
  return s || "landscape";
}

/** 한 섹션만 정규화(편집·부분 재생성용). 형식이 틀리면 null */
export function normalizeSection(key: PlanSection, value: unknown, fallbackLayout: LayoutType = "landing"): Plan[PlanSection] | null {
  if (key === "imageAssets") return Array.isArray(value) ? normSection(key, value, fallbackLayout) : null;
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return normSection(key, value, fallbackLayout);
}

/** AI 응답(파싱된 JSON)을 기획안으로 검증·정규화한다. 핵심 내용이 없으면 null */
export function normalizePlan(raw: unknown, fallbackLayout: LayoutType = "landing"): Plan | null {
  const o = obj(raw);
  if (!o.projectInfo || !o.structure) return null;
  const plan = {
    projectInfo: normSection("projectInfo", o.projectInfo, fallbackLayout),
    structure: normSection("structure", o.structure, fallbackLayout),
    contentStrategy: normSection("contentStrategy", o.contentStrategy, fallbackLayout),
    designSystem: normSection("designSystem", o.designSystem, fallbackLayout),
    developmentGuide: normSection("developmentGuide", o.developmentGuide, fallbackLayout),
    imageAssets: normSection("imageAssets", o.imageAssets ?? [], fallbackLayout),
  } as Plan;
  if (!plan.structure.mainPage.sections.length) return null;
  if (!plan.contentStrategy.headline) return null;
  return plan;
}

/** 저장된 문서의 plan 필드를 안전하게 읽는다(깨졌으면 null) */
export function sanitizeStoredPlan(raw: unknown): Plan | null {
  if (raw == null) return null;
  return normalizePlan(raw);
}

export function planToMarkdown(p: Plan): string {
  const L: string[] = [];
  L.push(`# ${p.projectInfo.topic || "랜딩페이지 기획안"}`, "");
  L.push(`- 타겟: ${p.projectInfo.target}`, `- 목표: ${p.projectInfo.goal}`, `- 레이아웃: ${p.projectInfo.layoutType}`, `- 구조 전략: ${p.projectInfo.structureStrategy}`, `- 디자인 의도: ${p.projectInfo.designIntent}`, "");
  L.push(`## 메인 페이지 — ${p.structure.mainPage.title}`);
  p.structure.mainPage.sections.forEach((s) => L.push(`- **${s.title}** (${s.id}): ${s.description}`));
  L.push("", "## 서브 페이지");
  p.structure.subPages.forEach((s, i) => L.push(`${i + 1}. **${s.title}** \`${s.path}\` — ${s.purpose}`, `   - ${s.contentSpecs}`));
  L.push("", "## 콘텐츠 전략", `- 헤드라인: ${p.contentStrategy.headline}`, `- 서브 헤드라인: ${p.contentStrategy.subHeadline}`, `- CTA: ${p.contentStrategy.cta}`);
  p.contentStrategy.keyMessages.forEach((m) => L.push(`- 핵심 메시지: ${m}`));
  L.push("", "## 디자인 시스템", `- 주 색상 ${p.designSystem.primaryColor} / 보조 ${p.designSystem.secondaryColor} / 배경 ${p.designSystem.backgroundColor}`, `- 타이포: ${p.designSystem.typography}`, `- 무드: ${p.designSystem.mood}`);
  L.push("", "## 개발 가이드", `- 스택: ${p.developmentGuide.stack}`);
  p.developmentGuide.folderStructure.forEach((f) => L.push(`  - ${f}`));
  L.push(`- 배포: ${p.developmentGuide.deployment}`, "", "## 이미지 에셋");
  p.imageAssets.forEach((a) => L.push(`- ${a.name} (\`${a.keyword}\`): ${a.description}`));
  return L.join("\n");
}
