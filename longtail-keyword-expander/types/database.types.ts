export type ApiKeyProvider = "serpapi" | "openai";
export type SerpEngine = "google" | "naver";

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
      // 텔레그램은 프로그램 접두어 없는 공용 테이블(booking-reminder/real_estate_sales/
      // crm-google-form과 공유, docs/PLATFORM_PATTERNS.md §9).
      user_telegram_links: {
        Row: {
          id: string;
          user_id: string;
          bot_token: string;
          chat_id: string;
          bot_username: string | null;
          linked_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          bot_token: string;
          chat_id: string;
          bot_username?: string | null;
          linked_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          bot_token?: string;
          chat_id?: string;
          bot_username?: string | null;
          linked_at?: string;
        };
        Relationships: [];
      };
      longtail_seed_keywords: {
        Row: {
          id: string;
          user_id: string;
          keyword: string;
          engine: SerpEngine;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          keyword: string;
          engine?: SerpEngine;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          keyword?: string;
          engine?: SerpEngine;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      longtail_related_keywords: {
        Row: {
          id: string;
          user_id: string;
          seed_id: string;
          keyword: string;
          relevance_score: number | null;
          source: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          seed_id: string;
          keyword: string;
          relevance_score?: number | null;
          source?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          seed_id?: string;
          keyword?: string;
          relevance_score?: number | null;
          source?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      longtail_expansions: {
        Row: {
          id: string;
          user_id: string;
          seed_id: string;
          related_id: string | null;
          keyword: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          seed_id: string;
          related_id?: string | null;
          keyword: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          seed_id?: string;
          related_id?: string | null;
          keyword?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      longtail_runs: {
        Row: {
          id: string;
          user_id: string;
          seed_id: string;
          executed_at: string;
          related_count: number;
          expansion_count: number;
          summary_text: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          seed_id: string;
          executed_at?: string;
          related_count?: number;
          expansion_count?: number;
          summary_text?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          seed_id?: string;
          executed_at?: string;
          related_count?: number;
          expansion_count?: number;
          summary_text?: string | null;
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
