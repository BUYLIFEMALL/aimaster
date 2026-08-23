export type ReservationStatus = "booked" | "completed" | "no_show" | "cancelled";
export type ReminderSendStatus = "sent" | "failed";

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      booking_reservations: {
        Row: {
          id: string;
          user_id: string;
          customer_name: string;
          customer_phone: string | null;
          customer_email: string | null;
          reservation_at: string;
          memo: string | null;
          status: ReservationStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          customer_name: string;
          customer_phone?: string | null;
          customer_email?: string | null;
          reservation_at: string;
          memo?: string | null;
          status?: ReservationStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          customer_name?: string;
          customer_phone?: string | null;
          customer_email?: string | null;
          reservation_at?: string;
          memo?: string | null;
          status?: ReservationStatus;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      booking_reminder_rules: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          offset_minutes: number;
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
          name: string;
          offset_minutes: number;
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
          name?: string;
          offset_minutes?: number;
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
      booking_reminder_sends: {
        Row: {
          id: string;
          user_id: string;
          rule_id: string;
          reservation_id: string;
          status: ReminderSendStatus;
          error_message: string | null;
          sent_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          rule_id: string;
          reservation_id: string;
          status: ReminderSendStatus;
          error_message?: string | null;
          sent_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          rule_id?: string;
          reservation_id?: string;
          status?: ReminderSendStatus;
          error_message?: string | null;
          sent_at?: string;
        };
        Relationships: [];
      };
      // crm-google-form이 설계한 공용 테이블(프로그램 접두어 없음). 새 테이블을 만들지 않고
      // 그대로 재사용한다 (docs/PLATFORM_PATTERNS.md §9).
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
