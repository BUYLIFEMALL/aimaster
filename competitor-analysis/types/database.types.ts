export type ApiKeyProvider = "serpapi" | "perplexity" | "openai" | "anthropic";
export type ResultType = "organic" | "ad" | "paa" | "local";
export type SerpEngine = "google" | "naver";
export type CompetitorSourceKind = "track" | "upload"; // (미사용, 확장 여지로만 남김)

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      user_api_keys: {
        Row: {
          id: string;
          user_id: string;
          provider: ApiKeyProvider;
          api_key: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          provider: ApiKeyProvider;
          api_key: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          provider?: ApiKeyProvider;
          api_key?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      competitor_keywords: {
        Row: {
          id: string;
          user_id: string;
          keyword: string;
          location: string;
          google_domain: string;
          lang: string;
          engine: SerpEngine;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          keyword: string;
          location?: string;
          google_domain?: string;
          lang?: string;
          engine?: SerpEngine;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          keyword?: string;
          location?: string;
          google_domain?: string;
          lang?: string;
          engine?: SerpEngine;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      competitor_serp_jobs: {
        Row: {
          id: string;
          user_id: string;
          keyword_id: string;
          total_results: number | null;
          location: string | null;
          google_domain: string | null;
          lang: string | null;
          engine: SerpEngine;
          serp_search_id: string | null;
          executed_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          keyword_id: string;
          total_results?: number | null;
          location?: string | null;
          google_domain?: string | null;
          lang?: string | null;
          engine?: SerpEngine;
          serp_search_id?: string | null;
          executed_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          keyword_id?: string;
          total_results?: number | null;
          location?: string | null;
          google_domain?: string | null;
          lang?: string | null;
          engine?: SerpEngine;
          serp_search_id?: string | null;
          executed_at?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      competitor_serp_results: {
        Row: {
          id: string;
          user_id: string;
          job_id: string;
          position: number | null;
          result_type: ResultType;
          title: string | null;
          link: string | null;
          snippet: string | null;
          domain: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          job_id: string;
          position?: number | null;
          result_type: ResultType;
          title?: string | null;
          link?: string | null;
          snippet?: string | null;
          domain?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          job_id?: string;
          position?: number | null;
          result_type?: ResultType;
          title?: string | null;
          link?: string | null;
          snippet?: string | null;
          domain?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      // 도메인 -> 회사정보 전역 공유 캐시(user_id 없음). 여러 회원이 같은 도메인을 조회해도
      // Perplexity/GPT 리서치를 한 번만 하도록 공유한다.
      competitor_profiles: {
        Row: {
          id: string;
          domain: string;
          company_name: string | null;
          summary: string | null;
          researched_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          domain: string;
          company_name?: string | null;
          summary?: string | null;
          researched_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          domain?: string;
          company_name?: string | null;
          summary?: string | null;
          researched_at?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      user_tracked_competitors: {
        Row: {
          id: string;
          user_id: string;
          domain: string;
          note: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          domain: string;
          note?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          domain?: string;
          note?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      competitor_analyses: {
        Row: {
          id: string;
          user_id: string;
          keyword_id: string;
          job_id: string;
          summary_text: string | null;
          html_report: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          keyword_id: string;
          job_id: string;
          summary_text?: string | null;
          html_report?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          keyword_id?: string;
          job_id?: string;
          summary_text?: string | null;
          html_report?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
