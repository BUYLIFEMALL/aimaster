import { z } from "zod";
export const LANGUAGES = [
  { id: "ko", name: "한국어" },
  { id: "en", name: "영어" },
  { id: "ja", name: "일본어" },
  { id: "zh-CN", name: "중국어 간체" },
  { id: "es", name: "스페인어" },
  { id: "fr", name: "프랑스어" },
  { id: "de", name: "독일어" },
  { id: "ru", name: "러시아어" },
  { id: "vi", name: "베트남어" },
  { id: "id", name: "인도네시아어" },
] as const;
export const languageSchema = z.enum([
  "ko",
  "en",
  "ja",
  "zh-CN",
  "es",
  "fr",
  "de",
  "ru",
  "vi",
  "id",
]);
export const MODELS = [
  { id: "gemini-3.8-flash", name: "Gemini 3.8 Flash · 기본" },
  { id: "gemini-3.5-flash-lite", name: "Gemini 3.5 Flash-Lite · 경제형" },
] as const;
export const modelSchema = z.enum([
  "gemini-3.8-flash",
  "gemini-3.5-flash-lite",
]);
export const DOMAINS = [
  "자동 감지",
  "일반",
  "비즈니스",
  "마케팅",
  "IT",
  "법률",
  "의학",
  "금융",
  "과학",
  "교육",
  "예술",
  "기술",
] as const;
export const MAX_SOURCE = 20_000,
  MAX_TRANSLATION = 60_000,
  CHUNK_SIZE = 4_000,
  MAX_CHUNKS = 10;
export const unicodeLength = (text: string) => Array.from(text).length;
const limitedText = (limit: number) =>
  z
    .string()
    .refine(
      (t) => unicodeLength(t) <= limit,
      `최대 ${limit.toLocaleString()}자까지 입력할 수 있습니다.`,
    );
export const optionsSchema = z
  .object({
    sourceLanguage: z.union([z.literal("auto"), languageSchema]),
    targetLanguage: languageSchema,
    domain: z.enum(DOMAINS),
    model: modelSchema,
  })
  .strict();
export type Options = z.infer<typeof optionsSchema>;
export const glossaryEntrySchema = z
  .object({
    sourceTerm: z.string().trim().min(1).max(80),
    targetTerm: z.string().trim().min(1).max(160),
    note: z.string().max(200).default(""),
  })
  .strict();
export type GlossaryEntry = z.infer<typeof glossaryEntrySchema>;
export const termSchema = z
  .object({
    sourceTerm: z.string().max(120),
    targetTerm: z.string().max(200),
    explanation: z.string().max(700),
    alternatives: z.array(z.string().max(200)).max(5),
  })
  .strict();
export const analysisSchema = z
  .object({
    context: z.array(termSchema).max(30),
    terminology: z.array(termSchema).max(50),
    style: z
      .object({
        score: z.number().int().min(1).max(10),
        formality: z.string().max(100),
        tone: z.string().max(100),
        feedback: z.string().max(1200),
      })
      .strict(),
  })
  .strict();
export type Analysis = z.infer<typeof analysisSchema>;
export const blockSchema = z
  .object({
    id: z.string().regex(/^b\d{1,4}$/),
    text: limitedText(16_000).refine(
      (t) => Boolean(t.trim()),
      "빈 문단은 번역하지 않습니다.",
    ),
  })
  .strict();
export type Block = z.infer<typeof blockSchema>;
export type SourceBlock = Block & { separator: string };
export const requestSchema = z
  .object({
    operationId: z.uuid(),
    kind: z.enum(["translate", "review", "reverse", "structure"]),
    options: optionsSchema,
    blocks: z.array(blockSchema).min(1).max(100),
    sourceBlocks: z.array(blockSchema).max(100).default([]),
    glossary: z.array(glossaryEntrySchema).max(100).default([]),
    context: z.string().max(1200).default(""),
  })
  .strict()
  .superRefine((v, ctx) => {
    const limit =
      v.kind === "review" ? 16_000 : v.kind === "reverse" ? 12_000 : CHUNK_SIZE;
    if (v.blocks.reduce((n, b) => n + unicodeLength(b.text), 0) > limit)
      ctx.addIssue({
        code: "custom",
        message: "한 번에 처리할 문서의 한도를 넘었습니다.",
      });
    if (new Set(v.blocks.map((b) => b.id)).size !== v.blocks.length)
      ctx.addIssue({ code: "custom", message: "문단 번호가 중복되었습니다." });
    if (
      v.sourceBlocks.reduce((n, b) => n + unicodeLength(b.text), 0) > CHUNK_SIZE
    )
      ctx.addIssue({ code: "custom", message: "검수할 원문이 너무 깁니다." });
  });
export type AiRequest = z.infer<typeof requestSchema>;
export const translatedSchema = z
  .object({
    blocks: z
      .array(
        z
          .object({
            id: z.string().regex(/^b\d{1,4}$/),
            text: limitedText(12_000).refine(
              (t) => Boolean(t.trim()),
              "빈 번역문입니다.",
            ),
          })
          .strict(),
      )
      .min(1)
      .max(100),
    sourceLanguage: languageSchema,
    detectedDomain: z.string().max(80),
    analysis: analysisSchema,
  })
  .strict();
export const textResultSchema = z
  .object({
    blocks: z
      .array(
        z
          .object({
            id: z.string().regex(/^b\d{1,4}$/),
            text: limitedText(12_000).refine(
              (t) => Boolean(t.trim()),
              "빈 결과입니다.",
            ),
          })
          .strict(),
      )
      .min(1)
      .max(100),
  })
  .strict();
export const reviewSchema = z.object({ analysis: analysisSchema }).strict();
export type AiResult = {
  blocks?: Block[];
  sourceLanguage?: z.infer<typeof languageSchema>;
  detectedDomain?: string;
  analysis?: Analysis;
  model: string;
  generatedAt: string;
};
export const alignmentSchema = z
  .object({
    id: z.string().regex(/^b\d{1,4}$/),
    text: limitedText(CHUNK_SIZE),
    translated: limitedText(12_000),
    separator: z.string().max(20_000),
  })
  .strict();
export const stateSchema = z
  .object({
    sourceText: limitedText(MAX_SOURCE),
    translationText: limitedText(MAX_TRANSLATION),
    reverseText: limitedText(MAX_TRANSLATION),
    filename: z.string().max(180),
    options: optionsSchema,
    glossary: z.array(glossaryEntrySchema).max(200),
    detectedLanguage: z.union([z.literal(""), languageSchema]),
    detectedDomain: z.string().max(80),
    translationBasis: z.string().max(64),
    analysisBasis: z.string().max(64),
    reverseBasis: z.string().max(64),
    analyses: z.array(analysisSchema).max(15),
    generatedAt: z.string().max(40),
    aligned: z.array(alignmentSchema).max(1000).default([]),
  })
  .strict()
  .superRefine((v, ctx) => {
    if (
      v.aligned.length &&
      (new Set(v.aligned.map((b) => b.id)).size !== v.aligned.length ||
        v.aligned.map((b) => b.translated + b.separator).join("") !==
          v.translationText)
    )
      ctx.addIssue({
        code: "custom",
        message: "번역문과 문단 대응 정보가 일치하지 않습니다.",
      });
  });
export type StudioState = z.infer<typeof stateSchema>;
export const emptyState = (): StudioState => ({
  sourceText: "",
  translationText: "",
  reverseText: "",
  filename: "",
  options: {
    sourceLanguage: "auto",
    targetLanguage: "en",
    domain: "자동 감지",
    model: "gemini-3.8-flash",
  },
  glossary: [],
  detectedLanguage: "",
  detectedDomain: "",
  translationBasis: "",
  analysisBasis: "",
  reverseBasis: "",
  analyses: [],
  generatedAt: "",
  aligned: [],
});
export const projectInputSchema = z
  .object({
    id: z.uuid(),
    revision: z.number().int().min(0),
    title: z.string().trim().min(1).max(120),
    payload: stateSchema,
  })
  .strict();
export const glossaryInputSchema = z
  .object({
    id: z.uuid(),
    revision: z.number().int().min(0),
    name: z.string().trim().min(1).max(80),
    entries: z.array(glossaryEntrySchema).max(200),
  })
  .strict();
