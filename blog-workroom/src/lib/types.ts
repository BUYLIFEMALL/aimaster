// 저장 데이터 형태(서버·화면 공용)
import type { AiProvider } from "@/lib/models";
import type { Grade } from "@/lib/logic";

export interface Settings { provider: AiProvider; model: string; imageModel: string }

export interface BlogPost { title: string; link: string; date: string; category: string; text: string }
export interface StyleProfile {
  summary: string; tone: string; sentence: string; structure: string; reader: string;
  expressions: string[]; avoid: string[]; topics: string[]; strengths: string[]; cautions: string[];
}
export interface BlogData {
  blogId: string | null; name: string; url: string | null;
  posts: BlogPost[]; samples: string[]; depth: number;
  style: StyleProfile | null; approved: boolean; analyzedAt: string | null;
  categories: string[]; subtopics: string[]; selected: string[];
}

export interface KeywordMetric { keyword: string; pc: number; mobile: number; total: number; docs: number | null; ratio: number | null; grade: Grade; compIdx?: string | null }
export interface KeywordData extends KeywordMetric { source: "탐색" | "직접" | "트렌드" | "벤치마킹"; blogItemId: string | null; reason: string; checkedAt: string }

export interface BriefSource { kind: "뉴스" | "웹"; title: string; link: string; date: string; summary: string }
export interface BriefTerm { term: string; why: string; series?: number[]; change?: number | null; surging?: boolean; metric?: KeywordMetric | null }
export interface BriefData { blogItemId: string | null; topic: string; sources: BriefSource[]; summary: string; terms: BriefTerm[]; step: "collected" | "analyzed" | "verified"; at: string }

export interface BenchBlog { blogId: string; name: string; hits: number; sample: string }
export interface BenchAnalysis { blogId: string; name: string; titles: string[]; pattern: string; strengths: string[]; keywords: { keyword: string; why: string; metric?: KeywordMetric | null }[]; at: string }
export interface BenchData { blogItemId: string | null; topic: string; blogs: BenchBlog[]; analyses: BenchAnalysis[]; watch: string[] }

export interface ResearchSource { title: string; link: string; blogger: string; text: string; ok: boolean }
export interface KnowledgePoint { text: string; source: number; quote: string; kept: boolean }
export interface ResearchData {
  blogItemId: string | null; keyword: string; query: string; related: string[];
  sources: ResearchSource[]; news: BriefSource[];
  points: KnowledgePoint[]; angle: string; gaps: string[];
  approved: boolean; approvedAt: string | null; step: "picked" | "collected" | "analyzed" | "approved";
}

export interface Section { heading: string; goal: string; body: string }
export interface ReviewIssue { area: string; level: "필수" | "권장"; quote: string; reason: string; suggestion: string }
export interface DraftData {
  researchId: string; blogItemId: string | null; keyword: string;
  options: { type: string; length: string; experience: string; request: string };
  title: string; titles: string[]; sections: Section[]; text: string;
  review: { issues: ReviewIssue[]; summary: string; at: string; textHash: string } | null;
  status: "outline" | "writing" | "written" | "reviewed";
}
export interface FinalData { draftId: string; title: string; text: string; at: string }

export interface ImageNode { id: string; role: "대표" | "본문"; paragraph: string; content: string; style: string; request: string; prompt: string; url: string | null; status: "ready" | "done" | "error"; error?: string }
export interface ImageJobData { title: string; text: string; ratio: string; common: string; nodes: ImageNode[] }
