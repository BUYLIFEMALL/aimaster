export type SubmissionStatus = "received" | "notified" | "failed";

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
      crm_smtp_accounts: {
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
