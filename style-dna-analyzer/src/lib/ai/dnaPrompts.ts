// [이미지 모델 교체 2026-10-17] gemini-3.1-flash-image(-preview) → gemini-nano-banana-2.1, gemini-2.5-flash-image → gemini-3.1-flash-lite-image(경량 1K), 기준: ai-image-studio v1.11.
// 실제 이미지 생성 시험은 하지 않았음 — 이미지 생성 오류가 나면 그때 테스트 검증한다(주인님 지시).
// 이미지 분석·프롬프트 보정용 프롬프트와 응답 정리. 순수 함수만 둔다(테스트 가능).
import {
  SUBJECT_PLACEHOLDER_EN,
  SUBJECT_PLACEHOLDER_KO,
  ATTACHED_IMAGE_TAG,
  type DnaMode,
  type DnaResult,
  type Fact,
  type DnaAnchor,
  type TargetImageModel,
} from "@/lib/dna/types";

/** 사용자 입력에서 꺾쇠를 없애고 길이를 제한한다(프롬프트 안의 <data> 구획을 깨지 못하게). */
export function cleanInput(text: string, max: number): string {
  return text.replace(/[<>]/g, " ").replace(/\r/g, "").trim().slice(0, max);
}

const yearRule = (year: number) =>
  `[기준 연도 엄수: 현재 연도는 ${year}년입니다. 연도·트렌드를 언급할 때는 ${year}년 기준으로 쓰고 과거 연도(2023년, 2024년 등)로 퇴행하지 마세요.] ${koreaNowRule()}`;

function koreaNowRule(now = new Date()): string {
  const [year, month] = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit" }).format(now).split("-").map(Number);
  return `[기준 시점: 한국 시간으로 지금은 ${year}년 ${month}월입니다. 계절·시기 표현은 현재 월에 맞추고, 연도·계절은 불필요하게 덧붙이지 마세요.]`;
}

export interface AnalysisPromptOptions {
  mutationLevel?: number;
  includeImageTag?: boolean;
  targetModel?: TargetImageModel;
  aspectRatio?: string;
}

export function buildAnalysisSystem(
  mode: DnaMode,
  year: number,
  options?: AnalysisPromptOptions
): string {
  const mutationLevel = typeof options?.mutationLevel === "number" ? Math.min(100, Math.max(0, options.mutationLevel)) : 30;
  const includeImageTag = Boolean(options?.includeImageTag);
  const targetModel = options?.targetModel || "gemini-nano-banana-2.1";
  const detectedAr = options?.aspectRatio || "1:1";

  const attachedImageBlock = includeImageTag
    ? `**## 🖼️ [첨부 이미지] (Attached Image) Integration**:
IMPORTANT: When this option is active, you MUST treat "${ATTACHED_IMAGE_TAG}" as a semantic anchor for the source image's style and structure.
Integrate it naturally with the subject placeholder in both **masterPrompt** and **promptKo**.

**Required Phrasing Patterns**:
- English (masterPrompt): "...depicting **${SUBJECT_PLACEHOLDER_EN}** by adapting the stylistic DNA and structural layout of **${ATTACHED_IMAGE_TAG}**..."
- Korean (promptKo): "...**${ATTACHED_IMAGE_TAG}**의 시각적 DNA와 공간 구도를 엄격히 계승하면서, 그 중심에 **${SUBJECT_PLACEHOLDER_KO}**을 자연스럽게 조화시킵니다..."

DO NOT just append it at the end. Make it the functional reference for the subject's environment and aesthetic. Use the exact Korean text "${ATTACHED_IMAGE_TAG}" in both language prompts.`
    : "";

  let targetModelGuidance = "";
  if (targetModel === "gemini-3.1-flash-lite-image") {
    targetModelGuidance = `
**TARGET: Gemini 3.1 Flash Lite Image (경량)**
- Optimization: Use rich, descriptive natural language (English).
- Format: A single, comprehensive paragraph describing the scene, subject, lighting, and style in detail.
- Style: Fast generation, high adherence to prompt.`;
  } else {
    targetModelGuidance = `
**TARGET: Gemini Nano Banana 2.1 (Nano Banana 2)**
- Optimization: High-quality image generation. Supports complex prompts and fine details.
- Format: A single, comprehensive paragraph describing the scene, subject, lighting, and style in detail.
- Style: State-of-the-art visual quality, excellent composition.`;
  }

  const dnaModeBlock =
    mode === "mutate"
      ? `**## 🧪 변이 리포트 (Mutation Report - 유전자 변이)**:
Current Mutation Level: **${mutationLevel}%**

**Level-Specific Strategy**:
- **Low (0-30%)**: "Conservative Reconstruction". Strictly preserve the original DNA. Only allow subtle texture refinements.
- **Mid (31-70%)**: "Structural Hybridization". Maintain composition but actively mutate the art style, material, and lighting. Introduce one experimental keyword (e.g., "cybernetic", "bioluminescent", "brutalist").
- **High (71-100%)**: "Genomic Chaos". Retain only the core structural axiality. Drastically reinterpret the scene with abstract or wildly different aesthetic DNA. Use strong mutation keywords.

Clearly define which genes are **PRESERVED** vs **MUTATED** according to this intensity.`
      : `**DNA Extraction (Clone Mode - 유전자 복제)**:
Capture 1:1 Spatial Layout, style, lighting, and color. Strictly reproduce the exact composition.`;

  const schemaJson = `{
  "symbolicTitle": "<strong>EN</strong>: [Impactful Short English Title] <br> <strong>KR</strong>: [한국어 상징적 제목]",
  "titleEn": "Short English Title",
  "titleKo": "짧은 한국어 제목",
  "camera": {
    "angle": "아이레벨 (Eye-level) 등",
    "shotType": "미디엄 샷 (Medium shot) 등",
    "lens": "35mm 프라임 등",
    "focalLength": "35mm 등",
    "depthOfField": "얕은 심도 (Shallow DoF) 등"
  },
  "lighting": {
    "timeOfDay": "골든 아워 (Golden Hour) 등",
    "direction": "측면광 (Side Lighting) 등",
    "elevation": "낮은 각도 등",
    "contrast": "중간 대비 등",
    "shadows": "부드러운 그림자 등"
  },
  "dna": [
    { "label": "CINEMATIC", "score": 88 },
    { "label": "WARM_PALETTE", "score": 92 }
  ],
  "matchScore": 95,
  "structuralBlueprint": "<ul><li><strong>📸 앵글/구도</strong>: ...</li><li><strong>🎥 렌즈/심도</strong>: ...</li><li><strong>📏 비율(AR)</strong>: ${detectedAr} 감지</li></ul>",
  "styleAnalysis": "<ul><li><strong>🎨 아트 스타일</strong>: ...</li><li><strong>💡 조명/분위기</strong>: ...</li></ul>",
  "usageTips": "<ul><li><strong>🎯 추천 피사체</strong>: ...</li><li><strong>🎛 파라미터 팁</strong>: ...</li><li><strong>⚠️ 주의사항</strong>: ...</li></ul>",
  "analysisSummary": "스타일 및 구조에 대한 한두 문장의 종합 요약",
  "aspectRatio": "${detectedAr}",
  "masterPromptEn": "A single rich paragraph in English with ${SUBJECT_PLACEHOLDER_EN} placeholder and ending with natural language aspect ratio such as '${detectedAr} aspect ratio'. PLAIN TEXT ONLY NO HTML.",
  "masterPromptKo": "한국어 마스터 프롬프트. ${SUBJECT_PLACEHOLDER_KO} 자리표시자를 포함하고 끝에 '${detectedAr} 비율' 명시. PLAIN TEXT ONLY NO HTML.",
  "keywords": ["cinematic", "film-grain", "portrait", "warm-tone"]
}`;

  return `Role: Expert Image Prompt Engineer & Visual DNA Decoder specialized in Gemini models.
${attachedImageBlock}

Mission: Extract visual DNA and **Structural Blueprint (composition, perspective, framing, camera angle)** from reference images to create "Subject-Agnostic Master Prompts" optimized for **${targetModel}**.
Output: MUST return strictly in valid JSON format matching the schema below. No explanation, markdown blocks outside JSON.

${schemaJson}

**CRITICAL FORMATTING RULES**:
1. For HTML string fields (symbolicTitle, structuralBlueprint, styleAnalysis, usageTips):
   - Use <strong> for bold text.
   - Use <ul> and <li> for list items.
   - Use <br> for line breaks between sections.
   - Use distinct emojis (📸, 🎥, 📏, 🎨, 💡, 🎯, 🎛, ⚠️) for visual clarity.
   - DO NOT use markdown (*, •) inside these HTML fields.
2. For masterPromptEn and masterPromptKo:
   - **MUST BE PLAIN TEXT ONLY** with no HTML tags or Markdown.
   - English prompt uses "${SUBJECT_PLACEHOLDER_EN}" as placeholder.
   - Korean prompt uses "${SUBJECT_PLACEHOLDER_KO}" as placeholder.
   - Always mention the detected aspect ratio at the end of the prompts as natural language (e.g. "${detectedAr} aspect ratio" or "${detectedAr} 비율").
   - **STRICTLY FORBIDDEN**: Do not use Midjourney-style parameters like "--ar 16:9".
3. Percentage values:
   - **matchScore** and **score** in dna MUST be numbers between 0 and 100.
4. Privacy & Exclusion:
   - 실제 사람의 신원(이름·유명인 여부)은 추측하거나 밝히지 않습니다. 보이는 외형·옷차림·자세만 중립적으로 묘사합니다.
   - Strictly ignore text, letters, or logos within the image. Focus only on aesthetic and structural DNA.

${targetModelGuidance}
${dnaModeBlock}
${yearRule(year)}`;
}

export function buildAnalysisUser(
  mode: DnaMode,
  guidance: string,
  options?: AnalysisPromptOptions
): string {
  const g = cleanInput(guidance, 800);
  const mutationLevel = options?.mutationLevel ?? 30;
  const includeTag = options?.includeImageTag ? "YES" : "NO";
  const targetModel = options?.targetModel || "gemini-nano-banana-2.1";
  const detectedAr = options?.aspectRatio || "1:1";

  const dataBlock = g ? `\n<data>${g}</data>` : "";

  return `Analyze Visual DNA.
Detected Aspect Ratio: **${detectedAr}**
Target Model: **${targetModel}**
DNA Mode: **${mode === "mutate" ? `Mutation (Level: ${mutationLevel}%)` : "Clone (Replicate)"}**
Include Image Tag: **${includeTag}**
User Guidelines:${dataBlock ? ` ${dataBlock}` : " Standard structural and style sequencing."}

Identify key camera settings, lighting, composition anchors, and dominant aesthetic DNA.
Generate two master prompts (${SUBJECT_PLACEHOLDER_EN} for English, ${SUBJECT_PLACEHOLDER_KO} for Korean) that lock in the layout and aesthetics. Respond in pure JSON.`;
}

export function buildRefineSystem(year: number, options?: AnalysisPromptOptions): string {
  const includeImageTag = Boolean(options?.includeImageTag);
  const targetModel = options?.targetModel || "gemini-nano-banana-2.1";

  return `당신은 이미지 생성 프롬프트를 사용자 피드백에 맞춰 미세 조정하고 재시퀀싱하는 프롬프트 엔지니어입니다.
현재 마스터 프롬프트(영어·한국어)와 스타일 분석 요약, 사용자 피드백을 받아 아래 JSON으로만 답하세요. 설명·마크다운·코드 블록은 쓰지 마세요.
{
  "masterPromptEn": "수정된 영문 마스터 프롬프트 (PLAIN TEXT)",
  "masterPromptKo": "수정된 한글 마스터 프롬프트 (PLAIN TEXT)",
  "note": "무엇을 어떻게 바꿨는지 한국어 한두 문장",
  "structuralBlueprint": "수정된 구조 청사진 (선택적 HTML)",
  "styleAnalysis": "수정된 스타일 분석 (선택적 HTML)"
}
규칙:
- 피드백이 요구한 부분만 바꾸고 원본의 핵심 미학 DNA는 보존합니다.
- 자리표시자 ${SUBJECT_PLACEHOLDER_EN}(영어), ${SUBJECT_PLACEHOLDER_KO}(한국어)는 그대로 유지합니다.
- 첨부 이미지 태그 옵션(${includeImageTag ? "ON" : "OFF"}): ON일 때는 ${ATTACHED_IMAGE_TAG} 태그가 유지되어야 합니다.
- 타겟 모델: ${targetModel}
${yearRule(year)}`;
}

export function buildRefineUser(result: DnaResult, feedback: string): string {
  const summary = [
    `제목: ${result.titleEn} / ${result.titleKo}`,
    `카메라: ${Object.values(result.camera).join(", ")}`,
    `조명: ${Object.values(result.lighting).join(", ")}`,
    `키워드: ${result.keywords.join(", ")}`,
    `비율: ${result.aspectRatio || "1:1"}`,
  ].join("\n");
  return `[스타일 분석 요약]\n${summary}\n\n[현재 영어 프롬프트]\n${result.masterPromptEn}\n\n[현재 한국어 프롬프트]\n${result.masterPromptKo}\n\n[사용자 피드백]\n<data>${cleanInput(feedback, 600)}</data>`;
}

export function extractJson(text: string): unknown | null {
  const cleaned = text.replace(/```(?:json)?/gi, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(cleaned.slice(start, end + 1));
  } catch {
    return null;
  }
}

const str = (v: unknown, max: number): string => (typeof v === "string" ? v.trim().slice(0, max) : "");
const rec = (v: unknown): Record<string, unknown> => (v && typeof v === "object" ? (v as Record<string, unknown>) : {});

function parseHtmlListToFacts(html: string): Fact[] {
  if (!html) return [];
  const items: Fact[] = [];
  const liRegex = /<li>(?:<strong>([^<]+)<\/strong>[:\s]*)?([^<]*)<\/li>/gi;
  let match;
  while ((match = liRegex.exec(html)) !== null) {
    const label = (match[1] || "").trim();
    const text = (match[2] || "").trim();
    if (label || text) {
      items.push({ label: label || "항목", text: text || label });
    }
  }
  return items;
}

function facts(v: unknown, limit: number): Fact[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((f) => ({ label: str(rec(f).label, 40), text: str(rec(f).text, 400) }))
    .filter((f) => f.text)
    .slice(0, limit);
}

const clampScore = (v: unknown): number => {
  const n = Math.round(Number(v));
  if (!Number.isFinite(n)) return 0;
  if (n <= 1 && n > 0) return Math.round(n * 100);
  return Math.min(100, Math.max(0, n));
};

/** AI 응답을 분석 결과로 정리한다. 마스터 프롬프트가 없으면 쓸 수 없는 결과이므로 null. */
export function parseAnalysis(text: string): DnaResult | null {
  const d = rec(extractJson(text));
  const masterPromptEn = str(d.masterPromptEn, 3000) || str(d.masterPrompt, 3000);
  const masterPromptKo = str(d.masterPromptKo, 3000) || str(d.promptKo, 3000);
  if (!masterPromptEn || !masterPromptKo) return null;

  const cam = rec(d.camera);
  const light = rec(d.lighting || d.light);
  
  // styleDna or dna
  const rawDna = Array.isArray(d.styleDna) ? d.styleDna : Array.isArray(d.dna) ? d.dna : [];
  const dna = rawDna
    .map((x) => ({
      label: str(rec(x).label, 40),
      score: clampScore(rec(x).score ?? rec(x).value),
    }))
    .filter((x) => x.label)
    .slice(0, 6);

  const keywords = (Array.isArray(d.keywords) ? d.keywords : [])
    .filter((k): k is string => typeof k === "string" && k.trim().length > 0)
    .map((k) => k.trim().slice(0, 40))
    .slice(0, 10);

  const structuralBlueprintHtml = str(d.structuralBlueprint, 1500);
  const styleAnalysisHtml = str(d.styleAnalysis, 1500);
  const usageTipsHtml = str(d.usageTips, 1500);
  const symbolicTitle = str(d.symbolicTitle, 300);

  // fallback for structure, style, tips
  let structure = facts(d.structure, 5);
  if (structure.length === 0 && structuralBlueprintHtml) {
    structure = parseHtmlListToFacts(structuralBlueprintHtml);
  }

  let style = facts(d.style, 5);
  if (style.length === 0 && styleAnalysisHtml) {
    style = parseHtmlListToFacts(styleAnalysisHtml);
  }

  let tips = facts(d.tips, 5);
  if (tips.length === 0 && usageTipsHtml) {
    tips = parseHtmlListToFacts(usageTipsHtml);
  }

  // Camera fields fallback
  const camera = {
    angle: str(cam.angle, 80),
    shotType: str(cam.shotType || cam.shot, 80),
    lens: str(cam.lens, 80),
    focusDistance: str(cam.focusDistance || cam.focalLength || cam.focal, 80),
    depthOfField: str(cam.depthOfField || cam.dof, 80),
  };

  // Light fields fallback
  const lighting = {
    timeOfDay: str(light.timeOfDay || light.time, 80),
    direction: str(light.direction, 80),
    altitude: str(light.altitude || light.elevation, 80),
    contrast: str(light.contrast, 80),
    shadows: str(light.shadows, 80),
  };

  // Anchors fallback
  const composition = rec(d.composition);
  const rawAnchors = Array.isArray(composition.anchors) ? composition.anchors : [];
  const anchors: DnaAnchor[] = rawAnchors
    .map((a) => ({
      label: str(rec(a).label, 40),
      text: str(rec(a).text, 120),
      x: Number(rec(a).x) || 0,
      y: Number(rec(a).y) || 0,
    }))
    .filter((a) => a.label);

  const matchRate = clampScore(d.matchRate ?? d.matchScore);
  const aspectRatio = str(d.aspectRatio, 20);
  const analysisSummary = str(d.analysisSummary, 500);

  let titleEn = str(d.titleEn, 80);
  let titleKo = str(d.titleKo, 80);
  if ((!titleEn || !titleKo) && symbolicTitle) {
    const enMatch = symbolicTitle.match(/EN<\/strong>:\s*([^<]+)/i);
    const krMatch = symbolicTitle.match(/KR<\/strong>:\s*([^<]+)/i);
    if (enMatch && !titleEn) titleEn = enMatch[1].trim().slice(0, 80);
    if (krMatch && !titleKo) titleKo = krMatch[1].trim().slice(0, 80);
  }

  return {
    titleEn: titleEn || "DNA Genome",
    titleKo: titleKo || "게놈 분석",
    symbolicTitle,
    camera,
    lighting,
    dna,
    matchRate,
    structure,
    style,
    tips,
    structuralBlueprintHtml,
    styleAnalysisHtml,
    usageTipsHtml,
    analysisSummary,
    aspectRatio,
    anchors: anchors.length > 0 ? anchors : undefined,
    masterPromptEn,
    masterPromptKo,
    keywords,
  };
}

export function parseRefine(text: string): {
  masterPromptEn: string;
  masterPromptKo: string;
  note: string;
  structuralBlueprintHtml?: string;
  styleAnalysisHtml?: string;
} | null {
  const d = rec(extractJson(text));
  const masterPromptEn = str(d.masterPromptEn, 3000) || str(d.masterPrompt, 3000);
  const masterPromptKo = str(d.masterPromptKo, 3000) || str(d.promptKo, 3000);
  if (!masterPromptEn || !masterPromptKo) return null;

  const res: {
    masterPromptEn: string;
    masterPromptKo: string;
    note: string;
    structuralBlueprintHtml?: string;
    styleAnalysisHtml?: string;
  } = {
    masterPromptEn,
    masterPromptKo,
    note: str(d.note, 300) || "DNA 및 프롬프트 미세 조정 완료",
  };

  const sb = str(d.structuralBlueprint, 1500);
  if (sb) res.structuralBlueprintHtml = sb;
  const sa = str(d.styleAnalysis, 1500);
  if (sa) res.styleAnalysisHtml = sa;

  return res;
}

export const KOREAN_PEOPLE_RULE =
  "If any people appear and the prompt does not explicitly specify otherwise, depict them as Korean/East Asian people.";
export const NO_TEXT_RULE = "Do not draw any text, letters, numbers, captions, logos or watermarks.";

/** 영어 마스터 프롬프트의 자리표시자를 사용자가 입력한 피사체로 바꾼다. */
export function fillSubject(prompt: string, subject: string): string {
  const s = cleanInput(subject, 300);
  return s ? prompt.split(SUBJECT_PLACEHOLDER_EN).join(s) : prompt;
}

export function hasPlaceholder(prompt: string): boolean {
  return prompt.includes(SUBJECT_PLACEHOLDER_EN);
}

/** 결과 테스트용 최종 프롬프트 */
export function buildTestPrompt(
  masterPromptEn: string,
  subject: string,
  ratio: string,
  withReference: boolean
): string {
  const base = fillSubject(masterPromptEn, subject);
  return [
    base,
    withReference
      ? "Use the attached image as a style reference (camera, lens look, lighting, color palette, texture, mood). Create a NEW image of the subject described above; do not copy the attached subject or composition."
      : "",
    `Aspect ratio ${ratio}.`,
    KOREAN_PEOPLE_RULE,
    NO_TEXT_RULE,
  ]
    .filter(Boolean)
    .join("\n");
}
