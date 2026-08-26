export type ApiKeyProvider = "meta_app_id" | "meta_app_secret" | "openai" | "anthropic" | "gemini";
export type DmMessageStatus = "pending_review" | "posted" | "skipped" | "failed";
export type DmMessageDirection = "in" | "out";

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
      dm_accounts: {
        Row: {
          id: string;
          user_id: string;
          instagram_user_id: string;
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
          instagram_user_id: string;
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
          instagram_user_id?: string;
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
      dm_settings: {
        Row: {
          id: string;
          user_id: string;
          default_link: string | null;
          ai_instructions: string | null;
          tone_preset: string | null;
          reply_model: string;
          disclosure_message: string | null;
          auto_approve: boolean;
          bot_enabled: boolean;
          bot_started_at: string | null;
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
          disclosure_message?: string | null;
          auto_approve?: boolean;
          bot_enabled?: boolean;
          bot_started_at?: string | null;
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
          disclosure_message?: string | null;
          auto_approve?: boolean;
          bot_enabled?: boolean;
          bot_started_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      dm_conversations: {
        Row: {
          id: string;
          user_id: string;
          ig_scoped_id: string;
          customer_username: string | null;
          last_inbound_at: string | null;
          disclosure_sent_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          ig_scoped_id: string;
          customer_username?: string | null;
          last_inbound_at?: string | null;
          disclosure_sent_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          ig_scoped_id?: string;
          customer_username?: string | null;
          last_inbound_at?: string | null;
          disclosure_sent_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      dm_messages: {
        Row: {
          id: string;
          user_id: string;
          conversation_id: string;
          ig_message_id: string;
          direction: DmMessageDirection;
          message_text: string;
          generated_reply: string | null;
          status: DmMessageStatus;
          posted_message_id: string | null;
          telegram_chat_id: string | null;
          telegram_message_id: number | null;
          created_at: string;
          replied_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          conversation_id: string;
          ig_message_id: string;
          direction: DmMessageDirection;
          message_text: string;
          generated_reply?: string | null;
          status?: DmMessageStatus;
          posted_message_id?: string | null;
          telegram_chat_id?: string | null;
          telegram_message_id?: number | null;
          created_at?: string;
          replied_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          conversation_id?: string;
          ig_message_id?: string;
          direction?: DmMessageDirection;
          message_text?: string;
          generated_reply?: string | null;
          status?: DmMessageStatus;
          posted_message_id?: string | null;
          telegram_chat_id?: string | null;
          telegram_message_id?: number | null;
          created_at?: string;
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
