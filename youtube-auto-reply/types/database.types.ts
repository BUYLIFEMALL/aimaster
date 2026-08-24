export type ApiKeyProvider = "google_client_id" | "google_client_secret" | "openai";
export type CommentStatus = "pending_review" | "posted" | "skipped" | "failed";

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
      // 프로그램 접두어 없는 공용 테이블(real_estate_sales가 만듦, docs/PLATFORM_PATTERNS.md §9).
      // (user_id, program_slug) 단위로 스코프돼 프로그램마다 다른 봇을 연결할 수 있다.
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
      // 이 프로젝트 전용 유튜브 OAuth 연결(shots의 youtube_accounts와 스코프가 달라 공유하지 않음).
      ytreply_accounts: {
        Row: {
          id: string;
          user_id: string;
          channel_id: string;
          channel_title: string;
          access_token: string;
          refresh_token: string;
          token_expires_at: string | null;
          needs_reconnect: boolean;
          last_checked_at: string | null;
          reconnect_notified_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          channel_id: string;
          channel_title: string;
          access_token: string;
          refresh_token: string;
          token_expires_at?: string | null;
          needs_reconnect?: boolean;
          last_checked_at?: string | null;
          reconnect_notified_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          channel_id?: string;
          channel_title?: string;
          access_token?: string;
          refresh_token?: string;
          token_expires_at?: string | null;
          needs_reconnect?: boolean;
          last_checked_at?: string | null;
          reconnect_notified_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      ytreply_videos: {
        Row: {
          id: string;
          user_id: string;
          youtube_video_id: string;
          title: string;
          thumbnail_url: string | null;
          is_monitored: boolean;
          custom_link: string | null;
          is_hidden: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          youtube_video_id: string;
          title: string;
          thumbnail_url?: string | null;
          is_monitored?: boolean;
          custom_link?: string | null;
          is_hidden?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          youtube_video_id?: string;
          title?: string;
          thumbnail_url?: string | null;
          is_monitored?: boolean;
          custom_link?: string | null;
          is_hidden?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      ytreply_settings: {
        Row: {
          id: string;
          user_id: string;
          default_link: string | null;
          ai_instructions: string | null;
          tone_preset: string | null;
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
          monitoring_enabled?: boolean;
          monitoring_interval_minutes?: number;
          monitoring_started_at?: string | null;
          last_run_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      ytreply_comments: {
        Row: {
          id: string;
          user_id: string;
          video_id: string;
          youtube_comment_id: string;
          author_display_name: string | null;
          comment_text: string;
          status: CommentStatus;
          generated_reply: string | null;
          posted_reply_id: string | null;
          fetched_at: string;
          replied_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          video_id: string;
          youtube_comment_id: string;
          author_display_name?: string | null;
          comment_text: string;
          status?: CommentStatus;
          generated_reply?: string | null;
          posted_reply_id?: string | null;
          fetched_at?: string;
          replied_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          video_id?: string;
          youtube_comment_id?: string;
          author_display_name?: string | null;
          comment_text?: string;
          status?: CommentStatus;
          generated_reply?: string | null;
          posted_reply_id?: string | null;
          fetched_at?: string;
          replied_at?: string | null;
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
