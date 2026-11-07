export type JobStatus = "pending" | "running" | "blocked" | "completed" | "failed";
export type ApiKeyProvider = "openai" | "anthropic" | "gemini" | "perplexity";

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      // U10 2차: 공용 표(업무 워크스페이스 「받은 업무」) — 공용 사본 lib/workInbox.ts가 형식으로 쓴다
      work_inbox: {
        Row: { id: string; user_id: string; source_slug: string; target_slug: string; kind: string; title: string; body_md: string; data: Json; source_url: string | null; created_at: string; imported_at: string | null; imported_ref: string | null };
        Insert: { id?: string; user_id: string; source_slug: string; target_slug?: string; kind?: string; title: string; body_md?: string; data?: Json; source_url?: string | null; created_at?: string; imported_at?: string | null; imported_ref?: string | null };
        Update: { id?: string; user_id?: string; source_slug?: string; target_slug?: string; kind?: string; title?: string; body_md?: string; data?: Json; source_url?: string | null; created_at?: string; imported_at?: string | null; imported_ref?: string | null };
        Relationships: [];
      };
      web_crawler_jobs: {
        Row: {
          id: string;
          user_id: string;
          url: string;
          target_fields: string[];
          status: JobStatus;
          result_url: string | null;
          row_count: number | null;
          error_message: string | null;
          pii_warning: boolean | null;
          ai_provider: string | null;
          ai_model: string | null;
          max_rows: number | null;
          created_at: string;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          url: string;
          target_fields: string[];
          status?: JobStatus;
          result_url?: string | null;
          row_count?: number | null;
          error_message?: string | null;
          pii_warning?: boolean | null;
          ai_provider?: string | null;
          ai_model?: string | null;
          max_rows?: number | null;
          created_at?: string;
          completed_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          url?: string;
          target_fields?: string[];
          status?: JobStatus;
          result_url?: string | null;
          row_count?: number | null;
          error_message?: string | null;
          pii_warning?: boolean | null;
          ai_provider?: string | null;
          ai_model?: string | null;
          max_rows?: number | null;
          created_at?: string;
          completed_at?: string | null;
        };
        Relationships: [];
      };
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
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
