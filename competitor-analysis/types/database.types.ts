export type ApiKeyProvider = "serpapi" | "perplexity" | "openai" | "anthropic" | "naver_client_id" | "naver_client_secret" | "naver_ads_api_key" | "naver_ads_secret_key" | "naver_ads_customer_id";
export type PartnerChannelType = "blog" | "local" | "cafe" | "shop";
export type PartnerScanStatus = "pending" | "scanning" | "done" | "none" | "stopped";
export type PartnerContactType = "mobile" | "landline" | "email";
export type ResultType = "organic" | "ad" | "paa" | "local";
export type SerpEngine = "google" | "naver";
export type CompetitorSourceKind = "track" | "upload"; // (미사용, 확장 여지로만 남김)

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
      competitor_keywords: {
        Row: {
          id: string;
          user_id: string;
          keyword: string;
          location: string;
          google_domain: string;
          lang: string;
          engine: SerpEngine;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          keyword: string;
          location?: string;
          google_domain?: string;
          lang?: string;
          engine?: SerpEngine;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          keyword?: string;
          location?: string;
          google_domain?: string;
          lang?: string;
          engine?: SerpEngine;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      competitor_serp_jobs: {
        Row: {
          id: string;
          user_id: string;
          keyword_id: string;
          total_results: number | null;
          location: string | null;
          google_domain: string | null;
          lang: string | null;
          engine: SerpEngine;
          serp_search_id: string | null;
          executed_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          keyword_id: string;
          total_results?: number | null;
          location?: string | null;
          google_domain?: string | null;
          lang?: string | null;
          engine?: SerpEngine;
          serp_search_id?: string | null;
          executed_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          keyword_id?: string;
          total_results?: number | null;
          location?: string | null;
          google_domain?: string | null;
          lang?: string | null;
          engine?: SerpEngine;
          serp_search_id?: string | null;
          executed_at?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      competitor_serp_results: {
        Row: {
          id: string;
          user_id: string;
          job_id: string;
          position: number | null;
          result_type: ResultType;
          title: string | null;
          link: string | null;
          snippet: string | null;
          domain: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          job_id: string;
          position?: number | null;
          result_type: ResultType;
          title?: string | null;
          link?: string | null;
          snippet?: string | null;
          domain?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          job_id?: string;
          position?: number | null;
          result_type?: ResultType;
          title?: string | null;
          link?: string | null;
          snippet?: string | null;
          domain?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      // Member-owned, append-only research; expires 30 days after creation.
      competitor_company_profiles: {
        Row: {
          id: string;
          user_id: string;
          domain: string;
          company_name: string | null;
          summary: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          domain: string;
          company_name?: string | null;
          summary?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          domain?: string;
          company_name?: string | null;
          summary?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      competitor_partner_channels: {
        Row: {
          id: string;
          user_id: string;
          keyword: string;
          channel_type: PartnerChannelType;
          name: string;
          url: string;
          summary: string;
          category: string;
          address: string;
          public_phone: string | null;
          public_email: string | null;
          contact_note: string | null;
          match_score: number;
          match_reasons: string;
          display_name: string | null;
          public_id: string | null;
          phones_mobile: string[];
          phones_landline: string[];
          emails: string[];
          primary_contact: string | null;
          primary_type: PartnerContactType | null;
          scan_status: PartnerScanStatus;
          scanned_at: string | null;
          profile_match_score: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          keyword: string;
          channel_type: PartnerChannelType;
          name: string;
          url?: string;
          summary?: string;
          category?: string;
          address?: string;
          public_phone?: string | null;
          public_email?: string | null;
          contact_note?: string | null;
          match_score?: number;
          match_reasons?: string;
          display_name?: string | null;
          public_id?: string | null;
          phones_mobile?: string[];
          phones_landline?: string[];
          emails?: string[];
          primary_contact?: string | null;
          primary_type?: PartnerContactType | null;
          scan_status?: PartnerScanStatus;
          scanned_at?: string | null;
          profile_match_score?: number;
          created_at?: string;
        };
        Update: {
          public_phone?: string | null;
          public_email?: string | null;
          contact_note?: string | null;
          phones_mobile?: string[];
          phones_landline?: string[];
          emails?: string[];
          primary_contact?: string | null;
          primary_type?: PartnerContactType | null;
          // 아래는 서버(서비스 키, 확장 결과 저장)만 바꾼다 — 회원 권한(DB grant)에는 없음.
          display_name?: string | null;
          public_id?: string | null;
          scan_status?: PartnerScanStatus;
          scanned_at?: string | null;
          profile_match_score?: number;
        };
        Relationships: [];
      };
      competitor_partner_consents: {
        Row: { user_id: string; notice_version: number; agreed_at: string };
        Insert: { user_id: string; notice_version: number; agreed_at?: string };
        Update: { notice_version?: number; agreed_at?: string };
        Relationships: [];
      };
      user_tracked_competitors: {
        Row: {
          id: string;
          user_id: string;
          domain: string;
          note: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          domain: string;
          note?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          domain?: string;
          note?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      competitor_analyses: {
        Row: {
          id: string;
          user_id: string;
          keyword_id: string;
          job_id: string;
          summary_text: string | null;
          html_report: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          keyword_id: string;
          job_id: string;
          summary_text?: string | null;
          html_report?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          keyword_id?: string;
          job_id?: string;
          summary_text?: string | null;
          html_report?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      // 2026-10-23 병합 A: 롱테일 키워드분석 표(longtail-keyword-expander에서 옮겨 옴).
      // 텔레그램은 프로그램 접두어 없는 공용 테이블(booking-reminder/real_estate_sales/
      // crm-google-form과 공유, docs/PLATFORM_PATTERNS.md §9).
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
