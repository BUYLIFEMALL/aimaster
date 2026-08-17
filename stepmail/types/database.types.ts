// AIMaster 플랫폼 공용 provider 목록. stepmail은 이메일 초안 작성(GPT)에 openai만 쓰지만,
// 공용 타입은 다른 서브프로젝트와 동일하게 전체 enum을 남겨둔다(user_api_keys_provider_check
// 제약과 일치시키기 위함).
export type ApiKeyProvider =
  | "openai"
  | "anthropic"
  | "gemini"
  | "perplexity"
  | "replicate"
  | "suno"
  | "json2video"
  | "google_client_id"
  | "google_client_secret";

// 발송 "차수"(1~5차)는 상태값이 아니라 send_count(정수)로 표현한다 — status는 미발송/발송중
// 공통의 "new"와 종료 상태(customer_completed/stopped) 3가지로만 구분한다.
export type LeadStatus = "new" | "customer_completed" | "stopped";
export type CampaignRecurrence = "once" | "daily" | "weekly";
export type SendLogStatus = "sent" | "failed";

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      // user_api_keys는 AIMaster 플랫폼 공용 테이블이다 — 새로 만들지 않고 기존 스키마를 공유한다.
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
      stepmail_leads: {
        Row: {
          id: string;
          user_id: string;
          input_date: string | null;
          channel: string | null;
          nickname: string | null;
          email: string;
          memo: string | null;
          status: LeadStatus;
          send_count: number;
          last_sent_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          input_date?: string | null;
          channel?: string | null;
          nickname?: string | null;
          email: string;
          memo?: string | null;
          status?: LeadStatus;
          send_count?: number;
          last_sent_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          input_date?: string | null;
          channel?: string | null;
          nickname?: string | null;
          email?: string;
          memo?: string | null;
          status?: LeadStatus;
          send_count?: number;
          last_sent_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      stepmail_smtp_accounts: {
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
      stepmail_email_drafts: {
        Row: {
          id: string;
          user_id: string;
          topic: string;
          keywords: string[];
          reference_urls: string[];
          cta_text: string | null;
          cta_url: string | null;
          custom_prompt: string | null;
          subject: string;
          body_html: string;
          image_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          topic: string;
          keywords?: string[];
          reference_urls?: string[];
          cta_text?: string | null;
          cta_url?: string | null;
          custom_prompt?: string | null;
          subject: string;
          body_html: string;
          image_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          topic?: string;
          keywords?: string[];
          reference_urls?: string[];
          cta_text?: string | null;
          cta_url?: string | null;
          custom_prompt?: string | null;
          subject?: string;
          body_html?: string;
          image_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      stepmail_campaigns: {
        Row: {
          id: string;
          user_id: string;
          draft_id: string;
          name: string;
          target_send_count: number;
          quantity_per_run: number;
          send_hour: number;
          send_minute: number;
          recurrence: CampaignRecurrence;
          weekly_day: number | null;
          is_active: boolean;
          last_run_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          draft_id: string;
          name: string;
          target_send_count?: number;
          quantity_per_run?: number;
          send_hour?: number;
          send_minute?: number;
          recurrence?: CampaignRecurrence;
          weekly_day?: number | null;
          is_active?: boolean;
          last_run_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          draft_id?: string;
          name?: string;
          target_send_count?: number;
          quantity_per_run?: number;
          send_hour?: number;
          send_minute?: number;
          recurrence?: CampaignRecurrence;
          weekly_day?: number | null;
          is_active?: boolean;
          last_run_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      stepmail_campaign_smtp_accounts: {
        Row: {
          campaign_id: string;
          smtp_account_id: string;
          sort_order: number;
        };
        Insert: {
          campaign_id: string;
          smtp_account_id: string;
          sort_order?: number;
        };
        Update: {
          campaign_id?: string;
          smtp_account_id?: string;
          sort_order?: number;
        };
        Relationships: [];
      };
      stepmail_send_log: {
        Row: {
          id: string;
          user_id: string;
          campaign_id: string | null;
          lead_id: string;
          smtp_account_id: string | null;
          subject: string | null;
          status: SendLogStatus;
          error_message: string | null;
          sent_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          campaign_id?: string | null;
          lead_id: string;
          smtp_account_id?: string | null;
          subject?: string | null;
          status: SendLogStatus;
          error_message?: string | null;
          sent_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          campaign_id?: string | null;
          lead_id?: string;
          smtp_account_id?: string | null;
          subject?: string | null;
          status?: SendLogStatus;
          error_message?: string | null;
          sent_at?: string;
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
