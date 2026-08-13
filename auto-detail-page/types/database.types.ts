// AIMaster 플랫폼 공용 provider 목록 + 이 프로그램(auto-detail-page)의 이미지 생성
// 플랫폼(Replicate/FLUX)을 위해 추가한 "replicate" (supabase/migrations/0001_multitenancy.sql
// 에서 user_api_keys_provider_check 제약도 함께 넓혀뒀다).
export type ApiKeyProvider =
  | "openai"
  | "anthropic"
  | "gemini"
  | "perplexity"
  | "replicate";

export type DetailPageTemplate = "coupang" | "smartstore" | "premium";

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      // user_api_keys는 AIMaster 플랫폼 공용 테이블이다 — 새로 만들지 않고
      // 기존 스키마를 그대로 공유한다 (insta_auto_poster/threads/shots와 동일).
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
      detail_pages: {
        Row: {
          id: string;
          user_id: string;
          template: DetailPageTemplate;
          product_name: string;
          html: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          template: DetailPageTemplate;
          product_name: string;
          html: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          template?: DetailPageTemplate;
          product_name?: string;
          html?: string;
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
