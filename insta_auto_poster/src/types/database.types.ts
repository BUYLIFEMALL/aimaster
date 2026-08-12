export type PostStatus = "draft" | "scheduled" | "publishing" | "published" | "failed";
export type ApiKeyProvider = "openai" | "anthropic" | "gemini" | "perplexity";
export type InstaSourceType = "http" | "rss" | "perplexity";
export type InstaCandidateStatus = "collected" | "used";
export type InstaPostType = "feed" | "card_news";

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      insta_posts: {
        Row: {
          id: string;
          user_id: string;
          post_type: InstaPostType;
          caption: string;
          hashtags: string[];
          image_url: string | null;
          cover_image_url: string | null;
          status: PostStatus;
          scheduled_at: string | null;
          ig_media_id: string | null;
          ig_permalink: string | null;
          error_message: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          post_type?: InstaPostType;
          caption: string;
          hashtags?: string[];
          image_url?: string | null;
          cover_image_url?: string | null;
          status?: PostStatus;
          scheduled_at?: string | null;
          ig_media_id?: string | null;
          ig_permalink?: string | null;
          error_message?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          post_type?: InstaPostType;
          caption?: string;
          hashtags?: string[];
          image_url?: string | null;
          cover_image_url?: string | null;
          status?: PostStatus;
          scheduled_at?: string | null;
          ig_media_id?: string | null;
          ig_permalink?: string | null;
          error_message?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      insta_post_slides: {
        Row: {
          id: string;
          post_id: string;
          user_id: string;
          slide_order: number;
          source_paragraph: string | null;
          image_prompt: string | null;
          image_url: string | null;
          image_urls: string[];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          post_id: string;
          user_id: string;
          slide_order: number;
          source_paragraph?: string | null;
          image_prompt?: string | null;
          image_url?: string | null;
          image_urls?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          post_id?: string;
          user_id?: string;
          slide_order?: number;
          source_paragraph?: string | null;
          image_prompt?: string | null;
          image_url?: string | null;
          image_urls?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      insta_accounts: {
        Row: {
          id: string;
          user_id: string;
          ig_user_id: string;
          ig_username: string | null;
          page_id: string;
          access_token: string;
          token_expires_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          ig_user_id: string;
          ig_username?: string | null;
          page_id: string;
          access_token: string;
          token_expires_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          ig_user_id?: string;
          ig_username?: string | null;
          page_id?: string;
          access_token?: string;
          token_expires_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      insta_candidates: {
        Row: {
          id: string;
          user_id: string;
          source_type: InstaSourceType;
          source_input: string;
          title: string;
          caption: string;
          hashtags: string[];
          keywords: string[];
          status: InstaCandidateStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          source_type: InstaSourceType;
          source_input: string;
          title: string;
          caption: string;
          hashtags?: string[];
          keywords?: string[];
          status?: InstaCandidateStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          source_type?: InstaSourceType;
          source_input?: string;
          title?: string;
          caption?: string;
          hashtags?: string[];
          keywords?: string[];
          status?: InstaCandidateStatus;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      // newsblur_accounts, user_api_keys는 AIMaster 플랫폼 공용 테이블이다
      // (threads/shots와 동일한 스키마를 그대로 공유해서 재사용하며, 새로 만들지 않는다).
      newsblur_accounts: {
        Row: {
          id: string;
          user_id: string;
          username: string;
          password: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          username: string;
          password: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          username?: string;
          password?: string;
          created_at?: string;
          updated_at?: string;
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
