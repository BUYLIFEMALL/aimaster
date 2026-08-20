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
export type VocalGender = "여성" | "남성" | "혼성";
export type MrStatus = "generating" | "completed" | "failed";
export type WavStatus = "generating" | "completed" | "failed";
export type RemixStatus = "generating" | "completed" | "failed";

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
          vocal_gender: VocalGender | null;
          suno_model: string;
          task_id: string | null;
          status: TrackStatus;
          error_message: string | null;
          // 이 트랙이 특정 variant를 "곡 연장"한 결과라면 원본 variant를 가리킨다(선택 기능).
          extended_from_variant_id: string | null;
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
          vocal_gender?: VocalGender | null;
          suno_model?: string;
          task_id?: string | null;
          status?: TrackStatus;
          error_message?: string | null;
          extended_from_variant_id?: string | null;
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
          vocal_gender?: VocalGender | null;
          suno_model?: string;
          task_id?: string | null;
          status?: TrackStatus;
          error_message?: string | null;
          extended_from_variant_id?: string | null;
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
      music_track_mr: {
        Row: {
          id: string;
          variant_id: string;
          user_id: string;
          task_id: string | null;
          status: MrStatus;
          instrumental_url: string | null;
          vocal_url: string | null;
          error_message: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          variant_id: string;
          user_id: string;
          task_id?: string | null;
          status?: MrStatus;
          instrumental_url?: string | null;
          vocal_url?: string | null;
          error_message?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          variant_id?: string;
          user_id?: string;
          task_id?: string | null;
          status?: MrStatus;
          instrumental_url?: string | null;
          vocal_url?: string | null;
          error_message?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      music_track_wav: {
        Row: {
          id: string;
          variant_id: string;
          user_id: string;
          task_id: string | null;
          status: WavStatus;
          wav_url: string | null;
          error_message: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          variant_id: string;
          user_id: string;
          task_id?: string | null;
          status?: WavStatus;
          wav_url?: string | null;
          error_message?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          variant_id?: string;
          user_id?: string;
          task_id?: string | null;
          status?: WavStatus;
          wav_url?: string | null;
          error_message?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      music_remix_sources: {
        Row: {
          id: string;
          user_id: string;
          kind: "track" | "upload";
          track_id: string | null;
          title: string;
          audio_url: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          kind: "track" | "upload";
          track_id?: string | null;
          title: string;
          audio_url: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          kind?: "track" | "upload";
          track_id?: string | null;
          title?: string;
          audio_url?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      music_track_remixes: {
        Row: {
          id: string;
          user_id: string;
          source_id: string | null;
          source_audio_url: string;
          source_title: string | null;
          desired_feel: string;
          lyrics: string | null;
          style_description: string | null;
          style_weight: number | null;
          weirdness_constraint: number | null;
          audio_weight: number | null;
          vocal_gender: VocalGender | null;
          suno_model: string;
          task_id: string | null;
          status: RemixStatus;
          error_message: string | null;
          target_duration_seconds: number | null;
          extend_hop_count: number;
          instrumental: boolean;
          lang: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          source_id?: string | null;
          source_audio_url: string;
          source_title?: string | null;
          desired_feel: string;
          lyrics?: string | null;
          style_description?: string | null;
          style_weight?: number | null;
          weirdness_constraint?: number | null;
          audio_weight?: number | null;
          vocal_gender?: VocalGender | null;
          suno_model?: string;
          task_id?: string | null;
          status?: RemixStatus;
          error_message?: string | null;
          target_duration_seconds?: number | null;
          extend_hop_count?: number;
          instrumental?: boolean;
          lang?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          source_id?: string | null;
          source_audio_url?: string;
          source_title?: string | null;
          desired_feel?: string;
          lyrics?: string | null;
          style_description?: string | null;
          style_weight?: number | null;
          weirdness_constraint?: number | null;
          audio_weight?: number | null;
          vocal_gender?: VocalGender | null;
          suno_model?: string;
          task_id?: string | null;
          status?: RemixStatus;
          error_message?: string | null;
          target_duration_seconds?: number | null;
          extend_hop_count?: number;
          instrumental?: boolean;
          lang?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      music_track_remix_variants: {
        Row: {
          id: string;
          remix_id: string;
          user_id: string;
          suno_audio_id: string | null;
          audio_url: string;
          image_url: string | null;
          duration_seconds: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          remix_id: string;
          user_id: string;
          suno_audio_id?: string | null;
          audio_url: string;
          image_url?: string | null;
          duration_seconds?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          remix_id?: string;
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
