// AIMaster 플랫폼 공용 provider 목록. 이 프로그램(shop-detail-page)은 이미지 생성/분석에
// Gemini(나노바나나 프로)만 사용하지만, 공용 타입은 다른 서브프로젝트와 동일하게 전체를 남겨둔다.
export type ApiKeyProvider =
  | "openai"
  | "anthropic"
  | "gemini"
  | "perplexity"
  | "replicate";

export type ProductStatus =
  | "draft"
  | "analyzing"
  | "analyzed"
  | "generating"
  | "completed"
  | "error";

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
      shop_products: {
        Row: {
          id: string;
          user_id: string;
          product_label: string | null;
          name: string | null;
          category: string | null;
          price: number | null;
          sale_price: number | null;
          key_features: string | null;
          specs: string | null;
          how_to_use: string | null;
          target_customer: string | null;
          main_color: string | null;
          sub_color: string | null;
          background_style: string | null;
          mood_keywords: string[];
          font_style: string | null;
          layout_density: string | null;
          source_image_url: string | null;
          reference_image_urls: string[];
          image_generation_notes: string | null;
          default_image_model: string;
          status: ProductStatus;
          language: string;
          currency: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          product_label?: string | null;
          name?: string | null;
          category?: string | null;
          price?: number | null;
          sale_price?: number | null;
          key_features?: string | null;
          specs?: string | null;
          how_to_use?: string | null;
          target_customer?: string | null;
          main_color?: string | null;
          sub_color?: string | null;
          background_style?: string | null;
          mood_keywords?: string[];
          font_style?: string | null;
          layout_density?: string | null;
          source_image_url?: string | null;
          reference_image_urls?: string[];
          image_generation_notes?: string | null;
          default_image_model?: string;
          status?: ProductStatus;
          language?: string;
          currency?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          product_label?: string | null;
          name?: string | null;
          category?: string | null;
          price?: number | null;
          sale_price?: number | null;
          key_features?: string | null;
          specs?: string | null;
          how_to_use?: string | null;
          target_customer?: string | null;
          main_color?: string | null;
          sub_color?: string | null;
          background_style?: string | null;
          mood_keywords?: string[];
          font_style?: string | null;
          layout_density?: string | null;
          source_image_url?: string | null;
          reference_image_urls?: string[];
          image_generation_notes?: string | null;
          default_image_model?: string;
          status?: ProductStatus;
          language?: string;
          currency?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      shop_prompt_templates: {
        Row: {
          id: string;
          user_id: string | null;
          section_key: string;
          section_order: number;
          section_name: string;
          prompt_template: string;
          korean_guide: string;
          aspect_ratio: string;
          resolution: string;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          section_key: string;
          section_order: number;
          section_name: string;
          prompt_template: string;
          korean_guide?: string;
          aspect_ratio?: string;
          resolution?: string;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          section_key?: string;
          section_order?: number;
          section_name?: string;
          prompt_template?: string;
          korean_guide?: string;
          aspect_ratio?: string;
          resolution?: string;
          is_active?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      shop_product_images: {
        Row: {
          id: string;
          product_id: string;
          user_id: string;
          template_id: string | null;
          section_key: string;
          section_order: number;
          language: string;
          prompt_used: string | null;
          image_url: string | null;
          image_urls: string[];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          product_id: string;
          user_id: string;
          template_id?: string | null;
          section_key: string;
          section_order: number;
          language?: string;
          prompt_used?: string | null;
          image_url?: string | null;
          image_urls?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          product_id?: string;
          user_id?: string;
          template_id?: string | null;
          section_key?: string;
          section_order?: number;
          language?: string;
          prompt_used?: string | null;
          image_url?: string | null;
          image_urls?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      shop_page_exports: {
        Row: {
          id: string;
          product_id: string;
          user_id: string;
          language: string;
          image_url: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          product_id: string;
          user_id: string;
          language?: string;
          image_url: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          product_id?: string;
          user_id?: string;
          language?: string;
          image_url?: string;
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
