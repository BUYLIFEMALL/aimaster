export type ApiKeyProvider = "openai" | "anthropic" | "gemini" | "perplexity";
export type ShortsSourceType = "http" | "rss" | "perplexity";
export type ShortsCandidateStatus = "collected" | "requested";
export type ShortsVideoStatus = "script_ready" | "images_generating" | "images_ready";

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      shorts_candidates: {
        Row: {
          id: string;
          user_id: string;
          source_type: ShortsSourceType;
          source_input: string;
          title: string;
          hook: string | null;
          content: string;
          keywords: string[] | null;
          status: ShortsCandidateStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          source_type: ShortsSourceType;
          source_input: string;
          title: string;
          hook?: string | null;
          content: string;
          keywords?: string[] | null;
          status?: ShortsCandidateStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          source_type?: ShortsSourceType;
          source_input?: string;
          title?: string;
          hook?: string | null;
          content?: string;
          keywords?: string[] | null;
          status?: ShortsCandidateStatus;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      shorts_videos: {
        Row: {
          id: string;
          user_id: string;
          candidate_id: string;
          title: string;
          full_script: string;
          bgm_prompt: string | null;
          bgm_style: string | null;
          bgm_exclude: string | null;
          status: ShortsVideoStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          candidate_id: string;
          title: string;
          full_script: string;
          bgm_prompt?: string | null;
          bgm_style?: string | null;
          bgm_exclude?: string | null;
          status?: ShortsVideoStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          candidate_id?: string;
          title?: string;
          full_script?: string;
          bgm_prompt?: string | null;
          bgm_style?: string | null;
          bgm_exclude?: string | null;
          status?: ShortsVideoStatus;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      shorts_video_segments: {
        Row: {
          id: string;
          video_id: string;
          user_id: string;
          segment_index: number;
          narration: string;
          image_prompt: string;
          image_url: string | null;
          image_urls: string[];
          duration_seconds: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          video_id: string;
          user_id: string;
          segment_index: number;
          narration: string;
          image_prompt: string;
          image_url?: string | null;
          image_urls?: string[];
          duration_seconds?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          video_id?: string;
          user_id?: string;
          segment_index?: number;
          narration?: string;
          image_prompt?: string;
          image_url?: string | null;
          image_urls?: string[];
          duration_seconds?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      newsblur_accounts: {
        Row: {
          id: string;
          user_id: string;
          username: string;
          password: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          username: string;
          password: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          username?: string;
          password?: string;
          created_at?: string;
          updated_at?: string;
        };
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
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
