export type ApiKeyProvider = "meta_app_id" | "meta_app_secret" | "openai" | "anthropic" | "gemini";
export type CommentStatus = "pending_review" | "posted" | "skipped" | "failed";

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      user_api_keys: {
        Row: { id: string; user_id: string; provider: ApiKeyProvider; api_key: string; created_at: string };
        Insert: { id?: string; user_id: string; provider: ApiKeyProvider; api_key: string; created_at?: string };
        Update: { id?: string; user_id?: string; provider?: ApiKeyProvider; api_key?: string; created_at?: string };
        Relationships: [];
      };
      user_telegram_links: {
        Row: {
          id: string;
          user_id: string;
          program_slug: string;
          bot_token: string;
          chat_id: string;
          bot_username: string | null;
          linked_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          program_slug: string;
          bot_token: string;
          chat_id: string;
          bot_username?: string | null;
          linked_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          program_slug?: string;
          bot_token?: string;
          chat_id?: string;
          bot_username?: string | null;
          linked_at?: string;
        };
        Relationships: [];
      };
      ig_accounts: {
        Row: {
          id: string;
          user_id: string;
          ig_user_id: string;
          username: string;
          access_token: string;
          token_expires_at: string | null;
          needs_reconnect: boolean;
          last_checked_at: string | null;
          reconnect_notified_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          ig_user_id: string;
          username: string;
          access_token: string;
          token_expires_at?: string | null;
          needs_reconnect?: boolean;
          last_checked_at?: string | null;
          reconnect_notified_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          ig_user_id?: string;
          username?: string;
          access_token?: string;
          token_expires_at?: string | null;
          needs_reconnect?: boolean;
          last_checked_at?: string | null;
          reconnect_notified_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      ig_media: {
        Row: {
          id: string;
          user_id: string;
          ig_media_id: string;
          caption: string | null;
          permalink: string | null;
          media_type: string;
          thumbnail_url: string | null;
          is_monitored: boolean;
          is_hidden: boolean;
          custom_link: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          ig_media_id: string;
          caption?: string | null;
          permalink?: string | null;
          media_type: string;
          thumbnail_url?: string | null;
          is_monitored?: boolean;
          is_hidden?: boolean;
          custom_link?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          ig_media_id?: string;
          caption?: string | null;
          permalink?: string | null;
          media_type?: string;
          thumbnail_url?: string | null;
          is_monitored?: boolean;
          is_hidden?: boolean;
          custom_link?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      ig_settings: {
        Row: {
          id: string;
          user_id: string;
          default_link: string | null;
          ai_instructions: string | null;
          tone_preset: string | null;
          reply_model: string;
          monitoring_enabled: boolean;
          monitoring_interval_minutes: number;
          monitoring_started_at: string | null;
          last_run_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          default_link?: string | null;
          ai_instructions?: string | null;
          tone_preset?: string | null;
          reply_model?: string;
          monitoring_enabled?: boolean;
          monitoring_interval_minutes?: number;
          monitoring_started_at?: string | null;
          last_run_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          default_link?: string | null;
          ai_instructions?: string | null;
          tone_preset?: string | null;
          reply_model?: string;
          monitoring_enabled?: boolean;
          monitoring_interval_minutes?: number;
          monitoring_started_at?: string | null;
          last_run_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      ig_comments: {
        Row: {
          id: string;
          user_id: string;
          media_id: string;
          ig_comment_id: string;
          author_username: string | null;
          comment_text: string;
          status: CommentStatus;
          generated_reply: string | null;
          posted_reply_id: string | null;
          fetched_at: string;
          replied_at: string | null;
          telegram_chat_id: string | null;
          telegram_message_id: number | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          media_id: string;
          ig_comment_id: string;
          author_username?: string | null;
          comment_text: string;
          status?: CommentStatus;
          generated_reply?: string | null;
          posted_reply_id?: string | null;
          fetched_at?: string;
          replied_at?: string | null;
          telegram_chat_id?: string | null;
          telegram_message_id?: number | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          media_id?: string;
          ig_comment_id?: string;
          author_username?: string | null;
          comment_text?: string;
          status?: CommentStatus;
          generated_reply?: string | null;
          posted_reply_id?: string | null;
          fetched_at?: string;
          replied_at?: string | null;
          telegram_chat_id?: string | null;
          telegram_message_id?: number | null;
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
