export type ApiKeyProvider = "openai" | "anthropic" | "gemini" | "perplexity";
export type ReportSourceType = "perplexity";

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      kakao_topics: {
        Row: {
          id: string;
          user_id: string;
          topic_name: string;
          keywords: string[];
          is_active: boolean;
          lookback_days: number;
          schedule_enabled: boolean;
          interval_minutes: number | null;
          last_run_at: string | null;
          active_hour_start: number | null;
          active_hour_end: number | null;
          notify_channels: string[];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          topic_name: string;
          keywords?: string[];
          is_active?: boolean;
          lookback_days?: number;
          schedule_enabled?: boolean;
          interval_minutes?: number | null;
          last_run_at?: string | null;
          active_hour_start?: number | null;
          active_hour_end?: number | null;
          notify_channels?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          topic_name?: string;
          keywords?: string[];
          is_active?: boolean;
          lookback_days?: number;
          schedule_enabled?: boolean;
          interval_minutes?: number | null;
          last_run_at?: string | null;
          active_hour_start?: number | null;
          active_hour_end?: number | null;
          notify_channels?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      kakao_reports: {
        Row: {
          id: string;
          user_id: string;
          topic_id: string;
          title: string;
          summary: string;
          content: string;
          source_type: ReportSourceType;
          kakao_sent_at: string | null;
          kakao_send_error: string | null;
          telegram_review_status: "not_requested" | "pending" | "approved" | "rejected";
          telegram_chat_id: string | null;
          telegram_message_id: number | null;
          generated_via: "manual" | "scheduled";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          topic_id: string;
          title: string;
          summary: string;
          content: string;
          source_type?: ReportSourceType;
          kakao_sent_at?: string | null;
          kakao_send_error?: string | null;
          telegram_review_status?: "not_requested" | "pending" | "approved" | "rejected";
          telegram_chat_id?: string | null;
          telegram_message_id?: number | null;
          generated_via?: "manual" | "scheduled";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          topic_id?: string;
          title?: string;
          summary?: string;
          content?: string;
          source_type?: ReportSourceType;
          kakao_sent_at?: string | null;
          kakao_send_error?: string | null;
          telegram_review_status?: "not_requested" | "pending" | "approved" | "rejected";
          telegram_chat_id?: string | null;
          telegram_message_id?: number | null;
          generated_via?: "manual" | "scheduled";
          created_at?: string;
          updated_at?: string;
        };
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
      // profiles / user_api_keys / user_solapi_accounts는 AIMaster 플랫폼 공용 테이블이다
      // (threads/insta_auto_poster/trending-product-finder 등과 동일 스키마를 그대로
      // 공유해서 재사용하며, 이 프로젝트에서 새로 만들지 않는다). profiles는 실제로는 컬럼이
      // 훨씬 많지만, 이 프로젝트에서 쓰는 phone만 최소 타입으로 선언한다
      // (trending-product-finder/types/database.types.ts와 동일한 관례).
      profiles: {
        Row: { id: string; phone: string | null };
        Insert: { id: string; phone?: string | null };
        Update: { id?: string; phone?: string | null };
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
      user_solapi_accounts: {
        Row: {
          user_id: string;
          api_key: string;
          api_secret: string;
          sender_phone: string;
          kakao_pf_id: string | null;
          rcs_brand_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          api_key: string;
          api_secret: string;
          sender_phone: string;
          kakao_pf_id?: string | null;
          rcs_brand_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          api_key?: string;
          api_secret?: string;
          sender_phone?: string;
          kakao_pf_id?: string | null;
          rcs_brand_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      user_kakao_accounts: {
        Row: {
          id: string;
          user_id: string;
          kakao_user_id: string;
          nickname: string | null;
          access_token: string;
          refresh_token: string;
          token_expires_at: string;
          refresh_token_expires_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          kakao_user_id: string;
          nickname?: string | null;
          access_token: string;
          refresh_token: string;
          token_expires_at: string;
          refresh_token_expires_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          kakao_user_id?: string;
          nickname?: string | null;
          access_token?: string;
          refresh_token?: string;
          token_expires_at?: string;
          refresh_token_expires_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      user_smtp_accounts: {
        Row: {
          id: string;
          user_id: string;
          label: string;
          provider: string | null;
          smtp_host: string;
          smtp_port: number;
          smtp_user: string;
          smtp_password: string;
          from_name: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          label: string;
          provider?: string | null;
          smtp_host: string;
          smtp_port?: number;
          smtp_user: string;
          smtp_password: string;
          from_name?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          label?: string;
          provider?: string | null;
          smtp_host?: string;
          smtp_port?: number;
          smtp_user?: string;
          smtp_password?: string;
          from_name?: string | null;
          is_active?: boolean;
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
