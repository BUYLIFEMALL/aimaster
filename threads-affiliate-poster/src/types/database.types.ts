export type PostStatus = "draft" | "scheduled" | "publishing" | "published" | "failed";
export type ApiKeyProvider =
  | "openai"
  | "gemini"
  | "coupang_access_key"
  | "coupang_secret_key"
  | "aliexpress_app_key"
  | "aliexpress_app_secret"
  | "aliexpress_tracking_id";
export type AffiliatePlatform = "coupang" | "aliexpress" | "naver";
export type AffiliateInputMode = "url" | "manual";

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      tap_posts: {
        Row: {
          id: string;
          user_id: string;
          product_id: string | null;
          content: string;
          image_url: string | null;
          video_filename: string | null;
          status: PostStatus;
          scheduled_at: string | null;
          threads_post_id: string | null;
          threads_permalink: string | null;
          error_message: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          product_id?: string | null;
          content: string;
          image_url?: string | null;
          video_filename?: string | null;
          status?: PostStatus;
          scheduled_at?: string | null;
          threads_post_id?: string | null;
          threads_permalink?: string | null;
          error_message?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          product_id?: string | null;
          content?: string;
          image_url?: string | null;
          video_filename?: string | null;
          status?: PostStatus;
          scheduled_at?: string | null;
          threads_post_id?: string | null;
          threads_permalink?: string | null;
          error_message?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      tap_accounts: {
        Row: {
          id: string;
          user_id: string;
          threads_user_id: string;
          username: string | null;
          access_token: string;
          token_expires_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          threads_user_id: string;
          username?: string | null;
          access_token: string;
          token_expires_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          threads_user_id?: string;
          username?: string | null;
          access_token?: string;
          token_expires_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      affiliate_products: {
        Row: {
          id: string;
          user_id: string;
          platform: AffiliatePlatform;
          product_name: string;
          product_url: string | null;
          affiliate_url: string;
          price: number | null;
          image_url: string | null;
          input_mode: AffiliateInputMode;
          description: string | null;
          key_selling_points: string[] | null;
          detail_page_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          platform: AffiliatePlatform;
          product_name: string;
          product_url?: string | null;
          affiliate_url: string;
          price?: number | null;
          image_url?: string | null;
          input_mode?: AffiliateInputMode;
          description?: string | null;
          key_selling_points?: string[] | null;
          detail_page_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          platform?: AffiliatePlatform;
          product_name?: string;
          product_url?: string | null;
          affiliate_url?: string;
          price?: number | null;
          image_url?: string | null;
          input_mode?: AffiliateInputMode;
          description?: string | null;
          key_selling_points?: string[] | null;
          detail_page_id?: string | null;
          created_at?: string;
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
