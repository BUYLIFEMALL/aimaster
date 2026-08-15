// AIMaster 플랫폼 공용 provider 목록. 이 프로그램(music)은 곡 기획(OpenAI GPT)과
// 실제 곡 생성(Suno)에 openai/suno 두 provider만 쓰지만, 공용 타입은 다른 서브프로젝트와
// 동일하게 전체 enum을 남겨둔다(user_api_keys_provider_check 제약과 일치시키기 위함).
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

export type PlanningStatus = "draft" | "planned" | "generating" | "completed" | "error";
export type TrackMode = "vocal" | "instrumental";
export type TrackStatus = "generating" | "completed" | "failed";
export type VocalGender = "여성" | "남성";

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
      music_plannings: {
        Row: {
          id: string;
          user_id: string;
          song_description: string;
          vocal_gender: VocalGender | null;
          lang: string;
          style_description: string | null;
          exclude_styles: string | null;
          title: string | null;
          description: string | null;
          status: PlanningStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          song_description: string;
          vocal_gender?: VocalGender | null;
          lang?: string;
          style_description?: string | null;
          exclude_styles?: string | null;
          title?: string | null;
          description?: string | null;
          status?: PlanningStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          song_description?: string;
          vocal_gender?: VocalGender | null;
          lang?: string;
          style_description?: string | null;
          exclude_styles?: string | null;
          title?: string | null;
          description?: string | null;
          status?: PlanningStatus;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      music_tracks: {
        Row: {
          id: string;
          planning_id: string;
          user_id: string;
          mode: TrackMode;
          title: string;
          prompt_text: string;
          style_description: string | null;
          exclude_styles: string | null;
          suno_model: string;
          task_id: string | null;
          status: TrackStatus;
          error_message: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          planning_id: string;
          user_id: string;
          mode: TrackMode;
          title: string;
          prompt_text: string;
          style_description?: string | null;
          exclude_styles?: string | null;
          suno_model?: string;
          task_id?: string | null;
          status?: TrackStatus;
          error_message?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          planning_id?: string;
          user_id?: string;
          mode?: TrackMode;
          title?: string;
          prompt_text?: string;
          style_description?: string | null;
          exclude_styles?: string | null;
          suno_model?: string;
          task_id?: string | null;
          status?: TrackStatus;
          error_message?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      music_track_variants: {
        Row: {
          id: string;
          track_id: string;
          user_id: string;
          suno_audio_id: string | null;
          audio_url: string;
          image_url: string | null;
          duration_seconds: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          track_id: string;
          user_id: string;
          suno_audio_id?: string | null;
          audio_url: string;
          image_url?: string | null;
          duration_seconds?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          track_id?: string;
          user_id?: string;
          suno_audio_id?: string | null;
          audio_url?: string;
          image_url?: string | null;
          duration_seconds?: number | null;
          created_at?: string;
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
