export type ApiKeyProvider = "openai" | "anthropic" | "gemini" | "perplexity";

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      affiliate_earnings: {
        Row: {
          commission_amount: number
          commission_rate: number | null
          created_at: string | null
          id: string
          payment_record_id: string | null
          program_id: string | null
          referrer_id: string | null
          status: string | null
        }
        Insert: {
          commission_amount: number
          commission_rate?: number | null
          created_at?: string | null
          id?: string
          payment_record_id?: string | null
          program_id?: string | null
          referrer_id?: string | null
          status?: string | null
        }
        Update: {
          commission_amount?: number
          commission_rate?: number | null
          created_at?: string | null
          id?: string
          payment_record_id?: string | null
          program_id?: string | null
          referrer_id?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_earnings_payment_record_id_fkey"
            columns: ["payment_record_id"]
            isOneToOne: false
            referencedRelation: "payment_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_earnings_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_earnings_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_rates: {
        Row: {
          program_id: string
          rate: number | null
        }
        Insert: {
          program_id: string
          rate?: number | null
        }
        Update: {
          program_id?: string
          rate?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_rates_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: true
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_authors: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          id: number
          name: string
          role: string | null
          user_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          id?: number
          name: string
          role?: string | null
          user_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          id?: number
          name?: string
          role?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      blog_categories: {
        Row: {
          created_at: string | null
          id: number
          name: string
          slug: string
        }
        Insert: {
          created_at?: string | null
          id?: number
          name: string
          slug: string
        }
        Update: {
          created_at?: string | null
          id?: number
          name?: string
          slug?: string
        }
        Relationships: []
      }
      blog_comments: {
        Row: {
          author_name: string
          content: string
          created_at: string | null
          id: number
          post_id: number | null
        }
        Insert: {
          author_name: string
          content: string
          created_at?: string | null
          id?: number
          post_id?: number | null
        }
        Update: {
          author_name?: string
          content?: string
          created_at?: string | null
          id?: number
          post_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "blog_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "blog_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_likes: {
        Row: {
          created_at: string | null
          id: number
          post_id: number | null
          user_ip: string | null
        }
        Insert: {
          created_at?: string | null
          id?: number
          post_id?: number | null
          user_ip?: string | null
        }
        Update: {
          created_at?: string | null
          id?: number
          post_id?: number | null
          user_ip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "blog_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "blog_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_post_categories: {
        Row: {
          category_id: number
          post_id: number
        }
        Insert: {
          category_id: number
          post_id: number
        }
        Update: {
          category_id?: number
          post_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "blog_post_categories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "blog_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blog_post_categories_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "blog_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_posts: {
        Row: {
          author_id: number | null
          content: string
          created_at: string | null
          excerpt: string | null
          id: number
          like_count: number
          published_at: string | null
          reading_minutes: number | null
          title: string
          user_id: string | null
        }
        Insert: {
          author_id?: number | null
          content: string
          created_at?: string | null
          excerpt?: string | null
          id?: number
          like_count?: number
          published_at?: string | null
          reading_minutes?: number | null
          title: string
          user_id?: string | null
        }
        Update: {
          author_id?: number | null
          content?: string
          created_at?: string | null
          excerpt?: string | null
          id?: number
          like_count?: number
          published_at?: string | null
          reading_minutes?: number | null
          title?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "blog_posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "blog_authors"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          id: string
          name: string
          parent_id: string | null
          slug: string
          sort_order: number | null
        }
        Insert: {
          id?: string
          name: string
          parent_id?: string | null
          slug: string
          sort_order?: number | null
        }
        Update: {
          id?: string
          name?: string
          parent_id?: string | null
          slug?: string
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      coupon_usage: {
        Row: {
          coupon_id: string | null
          discount_amount: number
          id: string
          payment_record_id: string | null
          used_at: string | null
          user_id: string | null
        }
        Insert: {
          coupon_id?: string | null
          discount_amount: number
          id?: string
          payment_record_id?: string | null
          used_at?: string | null
          user_id?: string | null
        }
        Update: {
          coupon_id?: string | null
          discount_amount?: number
          id?: string
          payment_record_id?: string | null
          used_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "coupon_usage_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_usage_payment_record_id_fkey"
            columns: ["payment_record_id"]
            isOneToOne: false
            referencedRelation: "payment_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_usage_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          assigned_user_id: string | null
          code: string
          created_at: string | null
          current_uses: number | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          max_uses: number | null
          program_id: string | null
          type: string
          value: number
        }
        Insert: {
          assigned_user_id?: string | null
          code: string
          created_at?: string | null
          current_uses?: number | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
          program_id?: string | null
          type: string
          value?: number
        }
        Update: {
          assigned_user_id?: string | null
          code?: string
          created_at?: string | null
          current_uses?: number | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
          program_id?: string | null
          type?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "coupons_assigned_user_id_fkey"
            columns: ["assigned_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupons_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      grade_program_access: {
        Row: {
          can_access: boolean | null
          grade_id: string
          program_id: string
        }
        Insert: {
          can_access?: boolean | null
          grade_id: string
          program_id: string
        }
        Update: {
          can_access?: boolean | null
          grade_id?: string
          program_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "grade_program_access_grade_id_fkey"
            columns: ["grade_id"]
            isOneToOne: false
            referencedRelation: "member_grades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grade_program_access_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      instagram_accounts: {
        Row: {
          access_token: string
          created_at: string
          id: string
          ig_user_id: string
          ig_username: string | null
          page_id: string | null
          token_expires_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token: string
          created_at?: string
          id?: string
          ig_user_id: string
          ig_username?: string | null
          page_id?: string | null
          token_expires_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string
          created_at?: string
          id?: string
          ig_user_id?: string
          ig_username?: string | null
          page_id?: string | null
          token_expires_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      member_grades: {
        Row: {
          color: string | null
          created_at: string | null
          id: string
          max_programs: number | null
          name: string
          slug: string
          sort_order: number | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          id?: string
          max_programs?: number | null
          name: string
          slug: string
          sort_order?: number | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          id?: string
          max_programs?: number | null
          name?: string
          slug?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      newsblur_accounts: {
        Row: {
          created_at: string
          id: string
          password: string
          updated_at: string
          user_id: string
          username: string
        }
        Insert: {
          created_at?: string
          id?: string
          password: string
          updated_at?: string
          user_id: string
          username: string
        }
        Update: {
          created_at?: string
          id?: string
          password?: string
          updated_at?: string
          user_id?: string
          username?: string
        }
        Relationships: []
      }
      payment_records: {
        Row: {
          amount: number
          created_at: string | null
          id: string
          paid_at: string | null
          payapp_data: Json | null
          payapp_order_id: string | null
          status: string | null
          subscription_id: string | null
          user_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          id?: string
          paid_at?: string | null
          payapp_data?: Json | null
          payapp_order_id?: string | null
          status?: string | null
          subscription_id?: string | null
          user_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          id?: string
          paid_at?: string | null
          payapp_data?: Json | null
          payapp_order_id?: string | null
          status?: string | null
          subscription_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_records_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_records_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          content: string
          created_at: string
          error_message: string | null
          id: string
          image_url: string | null
          scheduled_at: string | null
          status: string
          threads_permalink: string | null
          threads_post_id: string | null
          updated_at: string
          user_id: string
          video_filename: string | null
        }
        Insert: {
          content: string
          created_at?: string
          error_message?: string | null
          id?: string
          image_url?: string | null
          scheduled_at?: string | null
          status?: string
          threads_permalink?: string | null
          threads_post_id?: string | null
          updated_at?: string
          user_id: string
          video_filename?: string | null
        }
        Update: {
          content?: string
          created_at?: string
          error_message?: string | null
          id?: string
          image_url?: string | null
          scheduled_at?: string | null
          status?: string
          threads_permalink?: string | null
          threads_post_id?: string | null
          updated_at?: string
          user_id?: string
          video_filename?: string | null
        }
        Relationships: []
      }
      pricing_plans: {
        Row: {
          billing_type: string
          id: string
          is_active: boolean | null
          name: string
          original_price: number | null
          price: number
          program_id: string | null
          sort_order: number | null
        }
        Insert: {
          billing_type: string
          id?: string
          is_active?: boolean | null
          name: string
          original_price?: number | null
          price: number
          program_id?: string | null
          sort_order?: number | null
        }
        Update: {
          billing_type?: string
          id?: string
          is_active?: boolean | null
          name?: string
          original_price?: number | null
          price?: number
          program_id?: string | null
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pricing_plans_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          affiliate_code: string | null
          created_at: string | null
          email: string
          grade_id: string | null
          id: string
          is_admin: boolean | null
          name: string | null
          phone: string | null
          referred_by: string | null
        }
        Insert: {
          affiliate_code?: string | null
          created_at?: string | null
          email: string
          grade_id?: string | null
          id: string
          is_admin?: boolean | null
          name?: string | null
          phone?: string | null
          referred_by?: string | null
        }
        Update: {
          affiliate_code?: string | null
          created_at?: string | null
          email?: string
          grade_id?: string | null
          id?: string
          is_admin?: boolean | null
          name?: string | null
          phone?: string | null
          referred_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_grade_id_fkey"
            columns: ["grade_id"]
            isOneToOne: false
            referencedRelation: "member_grades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_referred_by_fkey"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      programs: {
        Row: {
          app_url: string | null
          category_id: string | null
          created_at: string | null
          description: string | null
          id: string
          images: string[] | null
          is_active: boolean | null
          name: string
          required_grade_id: string | null
          short_desc: string | null
          slug: string
          sort_order: number | null
          thumbnail_url: string | null
          updated_at: string | null
          video_url: string | null
        }
        Insert: {
          app_url?: string | null
          category_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          images?: string[] | null
          is_active?: boolean | null
          name: string
          required_grade_id?: string | null
          short_desc?: string | null
          slug: string
          sort_order?: number | null
          thumbnail_url?: string | null
          updated_at?: string | null
          video_url?: string | null
        }
        Update: {
          app_url?: string | null
          category_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          images?: string[] | null
          is_active?: boolean | null
          name?: string
          required_grade_id?: string | null
          short_desc?: string | null
          slug?: string
          sort_order?: number | null
          thumbnail_url?: string | null
          updated_at?: string | null
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "programs_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "programs_required_grade_id_fkey"
            columns: ["required_grade_id"]
            isOneToOne: false
            referencedRelation: "member_grades"
            referencedColumns: ["id"]
          },
        ]
      }
      real_estate_analyses: {
        Row: {
          created_at: string
          id: string
          investment_score: number | null
          listing_id: string
          model: string
          predicted_growth_pct: number | null
          rationale: string | null
          raw_result: Json | null
          undervaluation_index: number | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          investment_score?: number | null
          listing_id: string
          model: string
          predicted_growth_pct?: number | null
          rationale?: string | null
          raw_result?: Json | null
          undervaluation_index?: number | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          investment_score?: number | null
          listing_id?: string
          model?: string
          predicted_growth_pct?: number | null
          rationale?: string | null
          raw_result?: Json | null
          undervaluation_index?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "real_estate_analyses_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "real_estate_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      real_estate_district_collect_state: {
        Row: {
          last_collected_at: string
          sgg_cd: string
        }
        Insert: {
          last_collected_at?: string
          sgg_cd: string
        }
        Update: {
          last_collected_at?: string
          sgg_cd?: string
        }
        Relationships: []
      }
      real_estate_district_sentiment: {
        Row: {
          content: string
          created_at: string
          id: string
          sentiment_date: string
          sgg_nm: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          sentiment_date: string
          sgg_nm: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          sentiment_date?: string
          sgg_nm?: string
        }
        Relationships: []
      }
      real_estate_listings: {
        Row: {
          bldg_nm: string | null
          building_area: number | null
          building_year: number | null
          collected_at: string
          contract_date: string | null
          data_provided_at: string | null
          deal_type: string | null
          dedup_key: string
          dong: string | null
          exclusive_area: number | null
          floor: string | null
          ho: string | null
          id: string
          official_price: number | null
          pnu: string | null
          prev_deposit: number | null
          prev_rent: number | null
          price_amount: number | null
          raw_data: Json | null
          sgg_cd: string
          sgg_nm: string
          stdg_nm: string | null
        }
        Insert: {
          bldg_nm?: string | null
          building_area?: number | null
          building_year?: number | null
          collected_at?: string
          contract_date?: string | null
          data_provided_at?: string | null
          deal_type?: string | null
          dedup_key: string
          dong?: string | null
          exclusive_area?: number | null
          floor?: string | null
          ho?: string | null
          id?: string
          official_price?: number | null
          pnu?: string | null
          prev_deposit?: number | null
          prev_rent?: number | null
          price_amount?: number | null
          raw_data?: Json | null
          sgg_cd: string
          sgg_nm: string
          stdg_nm?: string | null
        }
        Update: {
          bldg_nm?: string | null
          building_area?: number | null
          building_year?: number | null
          collected_at?: string
          contract_date?: string | null
          data_provided_at?: string | null
          deal_type?: string | null
          dedup_key?: string
          dong?: string | null
          exclusive_area?: number | null
          floor?: string | null
          ho?: string | null
          id?: string
          official_price?: number | null
          pnu?: string | null
          prev_deposit?: number | null
          prev_rent?: number | null
          price_amount?: number | null
          raw_data?: Json | null
          sgg_cd?: string
          sgg_nm?: string
          stdg_nm?: string | null
        }
        Relationships: []
      }
      real_estate_user_matches: {
        Row: {
          created_at: string
          id: string
          listing_id: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          listing_id: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          listing_id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "real_estate_user_matches_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "real_estate_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      real_estate_user_preferences: {
        Row: {
          preferred_model: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          preferred_model?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          preferred_model?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      real_estate_watch_districts: {
        Row: {
          active_hour_end: number | null
          active_hour_start: number | null
          collect_interval_minutes: number
          created_at: string
          id: string
          is_active: boolean
          last_run_at: string | null
          monitoring_enabled: boolean
          sgg_cd: string
          sgg_nm: string
          user_id: string
        }
        Insert: {
          active_hour_end?: number | null
          active_hour_start?: number | null
          collect_interval_minutes?: number
          created_at?: string
          id?: string
          is_active?: boolean
          last_run_at?: string | null
          monitoring_enabled?: boolean
          sgg_cd: string
          sgg_nm: string
          user_id: string
        }
        Update: {
          active_hour_end?: number | null
          active_hour_start?: number | null
          collect_interval_minutes?: number
          created_at?: string
          id?: string
          is_active?: boolean
          last_run_at?: string | null
          monitoring_enabled?: boolean
          sgg_cd?: string
          sgg_nm?: string
          user_id?: string
        }
        Relationships: []
      }
      settlement_requests: {
        Row: {
          account_holder: string | null
          account_number: string | null
          admin_note: string | null
          amount: number
          bank_name: string | null
          id: string
          processed_at: string | null
          requested_at: string | null
          status: string | null
          user_id: string | null
        }
        Insert: {
          account_holder?: string | null
          account_number?: string | null
          admin_note?: string | null
          amount: number
          bank_name?: string | null
          id?: string
          processed_at?: string | null
          requested_at?: string | null
          status?: string | null
          user_id?: string | null
        }
        Update: {
          account_holder?: string | null
          account_number?: string | null
          admin_note?: string | null
          amount?: number
          bank_name?: string | null
          id?: string
          processed_at?: string | null
          requested_at?: string | null
          status?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "settlement_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      shorts_bgm_tracks: {
        Row: {
          audio_url: string
          created_at: string
          duration_seconds: number | null
          id: string
          image_url: string | null
          title: string | null
          user_id: string
          video_id: string
        }
        Insert: {
          audio_url: string
          created_at?: string
          duration_seconds?: number | null
          id?: string
          image_url?: string | null
          title?: string | null
          user_id: string
          video_id: string
        }
        Update: {
          audio_url?: string
          created_at?: string
          duration_seconds?: number | null
          id?: string
          image_url?: string | null
          title?: string | null
          user_id?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shorts_bgm_tracks_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "shorts_videos"
            referencedColumns: ["id"]
          },
        ]
      }
      shorts_candidates: {
        Row: {
          content: string
          created_at: string
          hook: string | null
          id: string
          keywords: string[] | null
          source_input: string
          source_type: string
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          hook?: string | null
          id?: string
          keywords?: string[] | null
          source_input: string
          source_type: string
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          hook?: string | null
          id?: string
          keywords?: string[] | null
          source_input?: string
          source_type?: string
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      shorts_video_segments: {
        Row: {
          created_at: string
          duration_seconds: number
          id: string
          image_prompt: string
          image_url: string | null
          image_urls: string[]
          narration: string
          segment_index: number
          updated_at: string
          user_id: string
          video_id: string
        }
        Insert: {
          created_at?: string
          duration_seconds?: number
          id?: string
          image_prompt: string
          image_url?: string | null
          image_urls?: string[]
          narration: string
          segment_index: number
          updated_at?: string
          user_id: string
          video_id: string
        }
        Update: {
          created_at?: string
          duration_seconds?: number
          id?: string
          image_prompt?: string
          image_url?: string | null
          image_urls?: string[]
          narration?: string
          segment_index?: number
          updated_at?: string
          user_id?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shorts_video_segments_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "shorts_videos"
            referencedColumns: ["id"]
          },
        ]
      }
      shorts_videos: {
        Row: {
          bgm_exclude: string | null
          bgm_prompt: string | null
          bgm_selected_track_id: string | null
          bgm_status: string | null
          bgm_style: string | null
          candidate_id: string
          created_at: string
          full_script: string
          id: string
          instagram_caption: string | null
          instagram_post_url: string | null
          instagram_status: string | null
          j2v_project_id: string | null
          render_status: string | null
          rendered_video_url: string | null
          status: string
          suno_task_id: string | null
          title: string
          updated_at: string
          user_id: string
          youtube_category_id: string | null
          youtube_description: string | null
          youtube_status: string | null
          youtube_video_id: string | null
          youtube_video_url: string | null
        }
        Insert: {
          bgm_exclude?: string | null
          bgm_prompt?: string | null
          bgm_selected_track_id?: string | null
          bgm_status?: string | null
          bgm_style?: string | null
          candidate_id: string
          created_at?: string
          full_script: string
          id?: string
          instagram_caption?: string | null
          instagram_post_url?: string | null
          instagram_status?: string | null
          j2v_project_id?: string | null
          render_status?: string | null
          rendered_video_url?: string | null
          status?: string
          suno_task_id?: string | null
          title: string
          updated_at?: string
          user_id: string
          youtube_category_id?: string | null
          youtube_description?: string | null
          youtube_status?: string | null
          youtube_video_id?: string | null
          youtube_video_url?: string | null
        }
        Update: {
          bgm_exclude?: string | null
          bgm_prompt?: string | null
          bgm_selected_track_id?: string | null
          bgm_status?: string | null
          bgm_style?: string | null
          candidate_id?: string
          created_at?: string
          full_script?: string
          id?: string
          instagram_caption?: string | null
          instagram_post_url?: string | null
          instagram_status?: string | null
          j2v_project_id?: string | null
          render_status?: string | null
          rendered_video_url?: string | null
          status?: string
          suno_task_id?: string | null
          title?: string
          updated_at?: string
          user_id?: string
          youtube_category_id?: string | null
          youtube_description?: string | null
          youtube_status?: string | null
          youtube_video_id?: string | null
          youtube_video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shorts_videos_bgm_selected_track_fk"
            columns: ["bgm_selected_track_id"]
            isOneToOne: false
            referencedRelation: "shorts_bgm_tracks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shorts_videos_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: true
            referencedRelation: "shorts_candidates"
            referencedColumns: ["id"]
          },
        ]
      }
      site_settings: {
        Row: {
          key: string
          updated_at: string | null
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string | null
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string | null
          value?: Json
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          created_at: string | null
          expires_at: string | null
          id: string
          payapp_order_id: string | null
          pricing_plan_id: string | null
          program_id: string | null
          started_at: string | null
          status: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          payapp_order_id?: string | null
          pricing_plan_id?: string | null
          program_id?: string | null
          started_at?: string | null
          status?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          payapp_order_id?: string | null
          pricing_plan_id?: string | null
          program_id?: string | null
          started_at?: string | null
          status?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_pricing_plan_id_fkey"
            columns: ["pricing_plan_id"]
            isOneToOne: false
            referencedRelation: "pricing_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      threads_accounts: {
        Row: {
          access_token: string
          created_at: string
          id: string
          threads_user_id: string
          token_expires_at: string | null
          updated_at: string
          user_id: string
          username: string | null
        }
        Insert: {
          access_token: string
          created_at?: string
          id?: string
          threads_user_id: string
          token_expires_at?: string | null
          updated_at?: string
          user_id: string
          username?: string | null
        }
        Update: {
          access_token?: string
          created_at?: string
          id?: string
          threads_user_id?: string
          token_expires_at?: string | null
          updated_at?: string
          user_id?: string
          username?: string | null
        }
        Relationships: []
      }
      threads_candidates: {
        Row: {
          content: string
          created_at: string
          id: string
          keywords: string[]
          source_input: string
          source_type: string
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          keywords?: string[]
          source_input: string
          source_type: string
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          keywords?: string[]
          source_input?: string
          source_type?: string
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      usage_logs: {
        Row: {
          action: string
          created_at: string | null
          credits_used: number
          id: string
          metadata: Json | null
          program_id: string | null
          quantity: number
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          credits_used?: number
          id?: string
          metadata?: Json | null
          program_id?: string | null
          quantity?: number
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          credits_used?: number
          id?: string
          metadata?: Json | null
          program_id?: string | null
          quantity?: number
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "usage_logs_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "usage_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_api_keys: {
        Row: {
          api_key: string
          created_at: string
          id: string
          provider: string
          updated_at: string
          user_id: string
        }
        Insert: {
          api_key: string
          created_at?: string
          id?: string
          provider: string
          updated_at?: string
          user_id: string
        }
        Update: {
          api_key?: string
          created_at?: string
          id?: string
          provider?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_cloudinary_config: {
        Row: {
          api_key: string
          api_secret: string
          cloud_name: string
          created_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          api_key: string
          api_secret: string
          cloud_name: string
          created_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          api_key?: string
          api_secret?: string
          cloud_name?: string
          created_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_program_access: {
        Row: {
          expires_at: string | null
          granted_at: string | null
          granted_by: string | null
          id: string
          program_id: string | null
          user_id: string | null
        }
        Insert: {
          expires_at?: string | null
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          program_id?: string | null
          user_id?: string | null
        }
        Update: {
          expires_at?: string | null
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          program_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_program_access_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_program_access_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_program_access_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_render_settings: {
        Row: {
          created_at: string
          elevenlabs_connection_id: string | null
          elevenlabs_voice_id: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          elevenlabs_connection_id?: string | null
          elevenlabs_voice_id?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          elevenlabs_connection_id?: string | null
          elevenlabs_voice_id?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_sessions: {
        Row: {
          created_at: string | null
          device_info: string | null
          id: string
          ip_address: string | null
          last_active: string | null
          session_token: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          device_info?: string | null
          id?: string
          ip_address?: string | null
          last_active?: string | null
          session_token: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          device_info?: string | null
          id?: string
          ip_address?: string | null
          last_active?: string | null
          session_token?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_telegram_links: {
        Row: {
          bot_token: string | null
          bot_username: string | null
          chat_id: string
          id: string
          linked_at: string
          user_id: string
        }
        Insert: {
          bot_token?: string | null
          bot_username?: string | null
          chat_id: string
          id?: string
          linked_at?: string
          user_id: string
        }
        Update: {
          bot_token?: string | null
          bot_username?: string | null
          chat_id?: string
          id?: string
          linked_at?: string
          user_id?: string
        }
        Relationships: []
      }
      youtube_accounts: {
        Row: {
          access_token: string
          channel_id: string | null
          channel_title: string | null
          created_at: string
          id: string
          refresh_token: string
          token_expires_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token: string
          channel_id?: string | null
          channel_title?: string | null
          created_at?: string
          id?: string
          refresh_token: string
          token_expires_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string
          channel_id?: string | null
          channel_title?: string | null
          created_at?: string
          id?: string
          refresh_token?: string
          token_expires_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
