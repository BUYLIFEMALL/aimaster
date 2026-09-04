export type JobStatus = "pending" | "running" | "completed" | "failed";
export type ApiKeyProvider = "openai" | "anthropic" | "gemini" | "perplexity";

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
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
