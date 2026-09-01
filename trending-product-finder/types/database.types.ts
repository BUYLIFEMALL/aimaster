export type ApiKeyProvider =
  | "naver_client_id"
  | "naver_client_secret"
  | "naver_ads_api_key"
  | "naver_ads_secret_key"
  | "naver_ads_customer_id"
  | "aliexpress_app_key"
  | "aliexpress_app_secret"
  | "aliexpress_tracking_id"
  | "domeggook_api_key"
  | "openai"
  | "gemini";

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
      trend_watchlist: {
        Row: {
          id: string;
          user_id: string;
          category_name: string;
          naver_category_code: string | null;
          keywords: string[];
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          category_name: string;
          naver_category_code?: string | null;
          keywords?: string[];
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          category_name?: string;
          naver_category_code?: string | null;
          keywords?: string[];
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      trend_snapshots: {
        Row: {
          id: string;
          user_id: string;
          watchlist_id: string;
          keyword: string | null;
          trend_index: number | null;
          period_start: string;
          period_end: string;
          time_unit: string;
          source: string;
          raw: Json | null;
          fetched_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          watchlist_id: string;
          keyword?: string | null;
          trend_index?: number | null;
          period_start: string;
          period_end: string;
          time_unit?: string;
          source?: string;
          raw?: Json | null;
          fetched_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          watchlist_id?: string;
          keyword?: string | null;
          trend_index?: number | null;
          period_start?: string;
          period_end?: string;
          time_unit?: string;
          source?: string;
          raw?: Json | null;
          fetched_at?: string;
        };
        Relationships: [];
      };
      shopping_competition: {
        Row: {
          id: string;
          user_id: string;
          watchlist_id: string | null;
          keyword: string;
          product_count: number | null;
          min_price: number | null;
          max_price: number | null;
          fetched_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          watchlist_id?: string | null;
          keyword: string;
          product_count?: number | null;
          min_price?: number | null;
          max_price?: number | null;
          fetched_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          watchlist_id?: string | null;
          keyword?: string;
          product_count?: number | null;
          min_price?: number | null;
          max_price?: number | null;
          fetched_at?: string;
        };
        Relationships: [];
      };
      recommendation_reports: {
        Row: {
          id: string;
          user_id: string;
          watchlist_id: string;
          generated_at: string;
          ai_summary: string | null;
          items: Json;
        };
        Insert: {
          id?: string;
          user_id: string;
          watchlist_id: string;
          generated_at?: string;
          ai_summary?: string | null;
          items: Json;
        };
        Update: {
          id?: string;
          user_id?: string;
          watchlist_id?: string;
          generated_at?: string;
          ai_summary?: string | null;
          items?: Json;
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
