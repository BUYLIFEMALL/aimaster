export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      // U10 2차: 공용 표(업무 워크스페이스 「받은 업무」) — 공용 사본 lib/workInbox.ts가 형식으로 쓴다
      work_inbox: {
        Row: { id: string; user_id: string; source_slug: string; target_slug: string; kind: string; title: string; body_md: string; data: Json; source_url: string | null; created_at: string; imported_at: string | null; imported_ref: string | null };
        Insert: { id?: string; user_id: string; source_slug: string; target_slug?: string; kind?: string; title: string; body_md?: string; data?: Json; source_url?: string | null; created_at?: string; imported_at?: string | null; imported_ref?: string | null };
        Update: { id?: string; user_id?: string; source_slug?: string; target_slug?: string; kind?: string; title?: string; body_md?: string; data?: Json; source_url?: string | null; created_at?: string; imported_at?: string | null; imported_ref?: string | null };
        Relationships: [];
      };
      [key: string]: {
        Row: Record<string, any>;
        Insert: Record<string, any>;
        Update: Record<string, any>;
        Relationships: [];
      };
    };
    Views: {
      [key: string]: {
        Row: Record<string, any>;
        Relationships: [];
      };
    };
    Functions: {
      [key: string]: {
        Args: Record<string, any>;
        Returns: any;
      };
    };
  };
}
