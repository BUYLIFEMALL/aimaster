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
  | "youtube_api_key"
  | "elevenst_api_key"
  | "openai"
  | "gemini";

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      // 루트 AIMaster 공용 회원 프로필 테이블 — 카카오톡 알림 발송 대상 번호(phone)
      // 조회에만 쓴다(Phase 10). 이 프로젝트가 소유/관리하는 테이블이 아니라 필요한
      // 컬럼만 최소로 선언.
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
          sourcing_alert_enabled: boolean;
          sourcing_alert_interval_minutes: number | null;
          sourcing_alert_channels: string[];
          sourcing_alert_last_run_at: string | null;
          sourcing_alert_active_hour_start: number | null;
          sourcing_alert_active_hour_end: number | null;
          sourcing_alert_notify_mode: string;
          sourcing_alert_last_snapshot: Json | null;
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
          sourcing_alert_enabled?: boolean;
          sourcing_alert_interval_minutes?: number | null;
          sourcing_alert_channels?: string[];
          sourcing_alert_last_run_at?: string | null;
          sourcing_alert_active_hour_start?: number | null;
          sourcing_alert_active_hour_end?: number | null;
          sourcing_alert_notify_mode?: string;
          sourcing_alert_last_snapshot?: Json | null;
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
          sourcing_alert_enabled?: boolean;
          sourcing_alert_interval_minutes?: number | null;
          sourcing_alert_channels?: string[];
          sourcing_alert_last_run_at?: string | null;
          sourcing_alert_active_hour_start?: number | null;
          sourcing_alert_active_hour_end?: number | null;
          sourcing_alert_notify_mode?: string;
          sourcing_alert_last_snapshot?: Json | null;
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
      // 공용 테이블(프로그램 접두어 없음) — stepmail/crm-google-form/booking-reminder가
      // 이미 만들어둔 것을 그대로 재사용(Phase 10, 2026-09-02). 마이그레이션 불필요.
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
      sourcing_saved_products: {
        Row: {
          id: string;
          user_id: string;
          keyword: string;
          platform: string;
          product_key: string;
          title: string;
          detail_url: string;
          last_price_krw: number | null;
          last_status: string;
          last_checked_at: string | null;
          alert_interval_minutes: number;
          alert_channels: string[];
          alert_enabled: boolean;
          active_hour_start: number | null;
          active_hour_end: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          keyword: string;
          platform: string;
          product_key: string;
          title: string;
          detail_url: string;
          last_price_krw?: number | null;
          last_status?: string;
          last_checked_at?: string | null;
          alert_interval_minutes?: number;
          alert_channels?: string[];
          alert_enabled?: boolean;
          active_hour_start?: number | null;
          active_hour_end?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          keyword?: string;
          platform?: string;
          product_key?: string;
          title?: string;
          detail_url?: string;
          last_price_krw?: number | null;
          last_status?: string;
          last_checked_at?: string | null;
          alert_interval_minutes?: number;
          alert_channels?: string[];
          alert_enabled?: boolean;
          active_hour_start?: number | null;
          active_hour_end?: number | null;
          created_at?: string;
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
      user_kakao_alimtalk_templates: {
        Row: {
          user_id: string;
          sourcing_template_id: string | null;
          price_template_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          sourcing_template_id?: string | null;
          price_template_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          sourcing_template_id?: string | null;
          price_template_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      user_telegram_links: {
        Row: {
          user_id: string;
          program_slug: string;
          bot_token: string;
          chat_id: string;
          bot_username: string | null;
          linked_at: string;
        };
        Insert: {
          user_id: string;
          program_slug: string;
          bot_token: string;
          chat_id: string;
          bot_username?: string | null;
          linked_at?: string;
        };
        Update: {
          user_id?: string;
          program_slug?: string;
          bot_token?: string;
          chat_id?: string;
          bot_username?: string | null;
          linked_at?: string;
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
