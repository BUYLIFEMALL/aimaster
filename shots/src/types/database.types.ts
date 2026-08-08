export type ApiKeyProvider =
  | "openai"
  | "anthropic"
  | "gemini"
  | "perplexity"
  | "suno"
  | "json2video"
  | "google_client_id"
  | "google_client_secret";
export type ShortsSourceType = "http" | "rss" | "perplexity";
export type ShortsCandidateStatus = "collected" | "requested";
export type ShortsVideoStatus = "script_ready" | "images_generating" | "images_ready";
export type BgmStatus = "processing" | "ready" | "failed";
export type RenderStatus = "rendering" | "ready" | "failed";
export type PostStatus = "posting" | "posted" | "failed";

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
          suno_task_id: string | null;
          bgm_status: BgmStatus | null;
          bgm_selected_track_id: string | null;
          render_status: RenderStatus | null;
          j2v_project_id: string | null;
          rendered_video_url: string | null;
          youtube_category_id: string | null;
          youtube_status: PostStatus | null;
          youtube_video_id: string | null;
          youtube_video_url: string | null;
          youtube_description: string | null;
          instagram_status: PostStatus | null;
          instagram_post_url: string | null;
          instagram_caption: string | null;
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
          suno_task_id?: string | null;
          bgm_status?: BgmStatus | null;
          bgm_selected_track_id?: string | null;
          render_status?: RenderStatus | null;
          j2v_project_id?: string | null;
          rendered_video_url?: string | null;
          youtube_category_id?: string | null;
          youtube_status?: PostStatus | null;
          youtube_video_id?: string | null;
          youtube_video_url?: string | null;
          youtube_description?: string | null;
          instagram_status?: PostStatus | null;
          instagram_post_url?: string | null;
          instagram_caption?: string | null;
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
          suno_task_id?: string | null;
          bgm_status?: BgmStatus | null;
          bgm_selected_track_id?: string | null;
          render_status?: RenderStatus | null;
          j2v_project_id?: string | null;
          rendered_video_url?: string | null;
          youtube_category_id?: string | null;
          youtube_status?: PostStatus | null;
          youtube_video_id?: string | null;
          youtube_video_url?: string | null;
          youtube_description?: string | null;
          instagram_status?: PostStatus | null;
          instagram_post_url?: string | null;
          instagram_caption?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      shorts_bgm_tracks: {
        Row: {
          id: string;
          video_id: string;
          user_id: string;
          audio_url: string;
          image_url: string | null;
          title: string | null;
          duration_seconds: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          video_id: string;
          user_id: string;
          audio_url: string;
          image_url?: string | null;
          title?: string | null;
          duration_seconds?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          video_id?: string;
          user_id?: string;
          audio_url?: string;
          image_url?: string | null;
          title?: string | null;
          duration_seconds?: number | null;
          created_at?: string;
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
      user_render_settings: {
        Row: {
          id: string;
          user_id: string;
          elevenlabs_voice_id: string | null;
          elevenlabs_connection_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          elevenlabs_voice_id?: string | null;
          elevenlabs_connection_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          elevenlabs_voice_id?: string | null;
          elevenlabs_connection_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      youtube_accounts: {
        Row: {
          id: string;
          user_id: string;
          channel_id: string | null;
          channel_title: string | null;
          access_token: string;
          refresh_token: string;
          token_expires_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          channel_id?: string | null;
          channel_title?: string | null;
          access_token: string;
          refresh_token: string;
          token_expires_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          channel_id?: string | null;
          channel_title?: string | null;
          access_token?: string;
          refresh_token?: string;
          token_expires_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      instagram_accounts: {
        Row: {
          id: string;
          user_id: string;
          ig_user_id: string;
          ig_username: string | null;
          page_id: string | null;
          access_token: string;
          token_expires_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          ig_user_id: string;
          ig_username?: string | null;
          page_id?: string | null;
          access_token: string;
          token_expires_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          ig_user_id?: string;
          ig_username?: string | null;
          page_id?: string | null;
          access_token?: string;
          token_expires_at?: string | null;
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
