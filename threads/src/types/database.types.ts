export type PostStatus = "draft" | "scheduled" | "publishing" | "published" | "failed";
export type ApiKeyProvider = "openai" | "anthropic" | "gemini" | "perplexity";

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      posts: {
        Row: {
          id: string;
          user_id: string;
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
      threads_accounts: {
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
