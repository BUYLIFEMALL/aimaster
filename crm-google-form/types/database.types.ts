export type SubmissionStatus = "received" | "notified" | "failed";
export type FollowupSendStatus = "sent" | "failed";

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      crm_form_sources: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          webhook_token: string;
          field_mapping: Record<string, string>;
          notify_email: boolean;
          notify_telegram: boolean;
          notify_sms: boolean;
          notify_alimtalk: boolean;
          notify_friendtalk: boolean;
          kakao_template_id: string | null;
          kakao_variables: Record<string, string>;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          webhook_token?: string;
          field_mapping?: Record<string, string>;
          notify_email?: boolean;
          notify_telegram?: boolean;
          notify_sms?: boolean;
          notify_alimtalk?: boolean;
          notify_friendtalk?: boolean;
          kakao_template_id?: string | null;
          kakao_variables?: Record<string, string>;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          webhook_token?: string;
          field_mapping?: Record<string, string>;
          notify_email?: boolean;
          notify_telegram?: boolean;
          notify_sms?: boolean;
          notify_alimtalk?: boolean;
          notify_friendtalk?: boolean;
          kakao_template_id?: string | null;
          kakao_variables?: Record<string, string>;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      crm_submissions: {
        Row: {
          id: string;
          user_id: string;
          form_source_id: string;
          response_id: string | null;
          raw_values: Record<string, string>;
          name: string | null;
          phone: string | null;
          email: string | null;
          status: SubmissionStatus;
          error_message: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          form_source_id: string;
          response_id?: string | null;
          raw_values?: Record<string, string>;
          name?: string | null;
          phone?: string | null;
          email?: string | null;
          status?: SubmissionStatus;
          error_message?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          form_source_id?: string;
          response_id?: string | null;
          raw_values?: Record<string, string>;
          name?: string | null;
          phone?: string | null;
          email?: string | null;
          status?: SubmissionStatus;
          error_message?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      crm_followup_rules: {
        Row: {
          id: string;
          user_id: string;
          form_source_id: string;
          name: string;
          days_after: number;
          channel_email: boolean;
          channel_sms: boolean;
          channel_alimtalk: boolean;
          channel_friendtalk: boolean;
          message_subject: string | null;
          message_text: string;
          kakao_template_id: string | null;
          kakao_variables: Record<string, string>;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          form_source_id: string;
          name: string;
          days_after: number;
          channel_email?: boolean;
          channel_sms?: boolean;
          channel_alimtalk?: boolean;
          channel_friendtalk?: boolean;
          message_subject?: string | null;
          message_text: string;
          kakao_template_id?: string | null;
          kakao_variables?: Record<string, string>;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          form_source_id?: string;
          name?: string;
          days_after?: number;
          channel_email?: boolean;
          channel_sms?: boolean;
          channel_alimtalk?: boolean;
          channel_friendtalk?: boolean;
          message_subject?: string | null;
          message_text?: string;
          kakao_template_id?: string | null;
          kakao_variables?: Record<string, string>;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      crm_followup_sends: {
        Row: {
          id: string;
          user_id: string;
          rule_id: string;
          submission_id: string;
          status: FollowupSendStatus;
          error_message: string | null;
          sent_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          rule_id: string;
          submission_id: string;
          status: FollowupSendStatus;
          error_message?: string | null;
          sent_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          rule_id?: string;
          submission_id?: string;
          status?: FollowupSendStatus;
          error_message?: string | null;
          sent_at?: string;
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
      // 텔레그램/SMTP와 동일한 철학으로 처음부터 공용(프로그램 접두어 없음)으로 설계했다.
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
      // real_estate_sales가 만든 공용 테이블(프로그램 접두어 없음, docs/PLATFORM_PATTERNS.md §9).
      // 새 테이블을 만들지 않고 그대로 재사용한다.
      user_telegram_links: {
        Row: {
          user_id: string;
          bot_token: string;
          chat_id: string;
          bot_username: string | null;
          linked_at: string;
        };
        Insert: {
          user_id: string;
          bot_token: string;
          chat_id: string;
          bot_username?: string | null;
          linked_at?: string;
        };
        Update: {
          user_id?: string;
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
