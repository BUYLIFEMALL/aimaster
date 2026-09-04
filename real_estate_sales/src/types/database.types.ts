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
    PostgrestVersion: "14.5"
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
      affiliate_products: {
        Row: {
          affiliate_url: string
          created_at: string
          description: string | null
          detail_page_id: string | null
          id: string
          image_url: string | null
          input_mode: string
          key_selling_points: string[] | null
          platform: string
          price: number | null
          product_name: string
          product_url: string | null
          user_id: string
        }
        Insert: {
          affiliate_url: string
          created_at?: string
          description?: string | null
          detail_page_id?: string | null
          id?: string
          image_url?: string | null
          input_mode?: string
          key_selling_points?: string[] | null
          platform: string
          price?: number | null
          product_name: string
          product_url?: string | null
          user_id: string
        }
        Update: {
          affiliate_url?: string
          created_at?: string
          description?: string | null
          detail_page_id?: string | null
          id?: string
          image_url?: string | null
          input_mode?: string
          key_selling_points?: string[] | null
          platform?: string
          price?: number | null
          product_name?: string
          product_url?: string | null
          user_id?: string
        }
        Relationships: []
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
      blog_candidates: {
        Row: {
          created_at: string
          id: string
          keywords: string[]
          source_input: string
          source_type: string
          summary: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          keywords?: string[]
          source_input: string
          source_type: string
          summary?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          keywords?: string[]
          source_input?: string
          source_type?: string
          summary?: string
          title?: string
          updated_at?: string
          user_id?: string
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
      booking_reminder_rules: {
        Row: {
          channel_alimtalk: boolean
          channel_email: boolean
          channel_friendtalk: boolean
          channel_sms: boolean
          created_at: string
          id: string
          is_active: boolean
          kakao_template_id: string | null
          kakao_variables: Json
          message_subject: string | null
          message_text: string
          name: string
          offset_minutes: number
          updated_at: string
          user_id: string
        }
        Insert: {
          channel_alimtalk?: boolean
          channel_email?: boolean
          channel_friendtalk?: boolean
          channel_sms?: boolean
          created_at?: string
          id?: string
          is_active?: boolean
          kakao_template_id?: string | null
          kakao_variables?: Json
          message_subject?: string | null
          message_text: string
          name: string
          offset_minutes: number
          updated_at?: string
          user_id: string
        }
        Update: {
          channel_alimtalk?: boolean
          channel_email?: boolean
          channel_friendtalk?: boolean
          channel_sms?: boolean
          created_at?: string
          id?: string
          is_active?: boolean
          kakao_template_id?: string | null
          kakao_variables?: Json
          message_subject?: string | null
          message_text?: string
          name?: string
          offset_minutes?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      booking_reminder_sends: {
        Row: {
          error_message: string | null
          id: string
          reservation_id: string
          rule_id: string
          sent_at: string
          status: string
          user_id: string
        }
        Insert: {
          error_message?: string | null
          id?: string
          reservation_id: string
          rule_id: string
          sent_at?: string
          status: string
          user_id: string
        }
        Update: {
          error_message?: string | null
          id?: string
          reservation_id?: string
          rule_id?: string
          sent_at?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_reminder_sends_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "booking_reservations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_reminder_sends_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "booking_reminder_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_reservations: {
        Row: {
          created_at: string
          customer_email: string | null
          customer_name: string
          customer_phone: string | null
          id: string
          memo: string | null
          reservation_at: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          customer_email?: string | null
          customer_name: string
          customer_phone?: string | null
          id?: string
          memo?: string | null
          reservation_at: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          customer_email?: string | null
          customer_name?: string
          customer_phone?: string | null
          id?: string
          memo?: string | null
          reservation_at?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
      competitor_analyses: {
        Row: {
          created_at: string
          html_report: string | null
          id: string
          job_id: string
          keyword_id: string
          summary_text: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          html_report?: string | null
          id?: string
          job_id: string
          keyword_id: string
          summary_text?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          html_report?: string | null
          id?: string
          job_id?: string
          keyword_id?: string
          summary_text?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "competitor_analyses_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "competitor_serp_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "competitor_analyses_keyword_id_fkey"
            columns: ["keyword_id"]
            isOneToOne: false
            referencedRelation: "competitor_keywords"
            referencedColumns: ["id"]
          },
        ]
      }
      competitor_keywords: {
        Row: {
          created_at: string
          engine: string
          google_domain: string
          id: string
          is_active: boolean
          keyword: string
          lang: string
          location: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          engine?: string
          google_domain?: string
          id?: string
          is_active?: boolean
          keyword: string
          lang?: string
          location?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          engine?: string
          google_domain?: string
          id?: string
          is_active?: boolean
          keyword?: string
          lang?: string
          location?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      competitor_profiles: {
        Row: {
          company_name: string | null
          created_at: string
          domain: string
          id: string
          researched_at: string
          summary: string | null
        }
        Insert: {
          company_name?: string | null
          created_at?: string
          domain: string
          id?: string
          researched_at?: string
          summary?: string | null
        }
        Update: {
          company_name?: string | null
          created_at?: string
          domain?: string
          id?: string
          researched_at?: string
          summary?: string | null
        }
        Relationships: []
      }
      competitor_serp_jobs: {
        Row: {
          created_at: string
          engine: string
          executed_at: string
          google_domain: string | null
          id: string
          keyword_id: string
          lang: string | null
          location: string | null
          serp_search_id: string | null
          total_results: number | null
          user_id: string
        }
        Insert: {
          created_at?: string
          engine?: string
          executed_at?: string
          google_domain?: string | null
          id?: string
          keyword_id: string
          lang?: string | null
          location?: string | null
          serp_search_id?: string | null
          total_results?: number | null
          user_id: string
        }
        Update: {
          created_at?: string
          engine?: string
          executed_at?: string
          google_domain?: string | null
          id?: string
          keyword_id?: string
          lang?: string | null
          location?: string | null
          serp_search_id?: string | null
          total_results?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "competitor_serp_jobs_keyword_id_fkey"
            columns: ["keyword_id"]
            isOneToOne: false
            referencedRelation: "competitor_keywords"
            referencedColumns: ["id"]
          },
        ]
      }
      competitor_serp_results: {
        Row: {
          created_at: string
          domain: string | null
          id: string
          job_id: string
          link: string | null
          position: number | null
          result_type: string
          snippet: string | null
          title: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          domain?: string | null
          id?: string
          job_id: string
          link?: string | null
          position?: number | null
          result_type: string
          snippet?: string | null
          title?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          domain?: string | null
          id?: string
          job_id?: string
          link?: string | null
          position?: number | null
          result_type?: string
          snippet?: string | null
          title?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "competitor_serp_results_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "competitor_serp_jobs"
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
      crm_followup_rules: {
        Row: {
          channel_alimtalk: boolean
          channel_email: boolean
          channel_friendtalk: boolean
          channel_sms: boolean
          created_at: string
          days_after: number
          form_source_id: string
          id: string
          is_active: boolean
          kakao_template_id: string | null
          kakao_variables: Json
          message_subject: string | null
          message_text: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          channel_alimtalk?: boolean
          channel_email?: boolean
          channel_friendtalk?: boolean
          channel_sms?: boolean
          created_at?: string
          days_after: number
          form_source_id: string
          id?: string
          is_active?: boolean
          kakao_template_id?: string | null
          kakao_variables?: Json
          message_subject?: string | null
          message_text: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          channel_alimtalk?: boolean
          channel_email?: boolean
          channel_friendtalk?: boolean
          channel_sms?: boolean
          created_at?: string
          days_after?: number
          form_source_id?: string
          id?: string
          is_active?: boolean
          kakao_template_id?: string | null
          kakao_variables?: Json
          message_subject?: string | null
          message_text?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_followup_rules_form_source_id_fkey"
            columns: ["form_source_id"]
            isOneToOne: false
            referencedRelation: "crm_form_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_followup_sends: {
        Row: {
          error_message: string | null
          id: string
          rule_id: string
          sent_at: string
          status: string
          submission_id: string
          user_id: string
        }
        Insert: {
          error_message?: string | null
          id?: string
          rule_id: string
          sent_at?: string
          status: string
          submission_id: string
          user_id: string
        }
        Update: {
          error_message?: string | null
          id?: string
          rule_id?: string
          sent_at?: string
          status?: string
          submission_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_followup_sends_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "crm_followup_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_followup_sends_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "crm_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_form_sources: {
        Row: {
          created_at: string
          field_mapping: Json
          id: string
          is_active: boolean
          kakao_template_id: string | null
          kakao_variables: Json
          name: string
          notify_alimtalk: boolean
          notify_email: boolean
          notify_friendtalk: boolean
          notify_sms: boolean
          notify_telegram: boolean
          updated_at: string
          user_id: string
          webhook_token: string
        }
        Insert: {
          created_at?: string
          field_mapping?: Json
          id?: string
          is_active?: boolean
          kakao_template_id?: string | null
          kakao_variables?: Json
          name: string
          notify_alimtalk?: boolean
          notify_email?: boolean
          notify_friendtalk?: boolean
          notify_sms?: boolean
          notify_telegram?: boolean
          updated_at?: string
          user_id: string
          webhook_token?: string
        }
        Update: {
          created_at?: string
          field_mapping?: Json
          id?: string
          is_active?: boolean
          kakao_template_id?: string | null
          kakao_variables?: Json
          name?: string
          notify_alimtalk?: boolean
          notify_email?: boolean
          notify_friendtalk?: boolean
          notify_sms?: boolean
          notify_telegram?: boolean
          updated_at?: string
          user_id?: string
          webhook_token?: string
        }
        Relationships: []
      }
      crm_submissions: {
        Row: {
          created_at: string
          email: string | null
          error_message: string | null
          form_source_id: string
          id: string
          name: string | null
          phone: string | null
          raw_values: Json
          response_id: string | null
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          error_message?: string | null
          form_source_id: string
          id?: string
          name?: string | null
          phone?: string | null
          raw_values?: Json
          response_id?: string | null
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          error_message?: string | null
          form_source_id?: string
          id?: string
          name?: string | null
          phone?: string | null
          raw_values?: Json
          response_id?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_submissions_form_source_id_fkey"
            columns: ["form_source_id"]
            isOneToOne: false
            referencedRelation: "crm_form_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      detail_pages: {
        Row: {
          created_at: string
          html: string
          id: string
          product_name: string
          template: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          html: string
          id?: string
          product_name: string
          template: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          html?: string
          id?: string
          product_name?: string
          template?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      dm_accounts: {
        Row: {
          access_token: string
          created_at: string
          id: string
          instagram_user_id: string
          last_checked_at: string | null
          needs_reconnect: boolean
          reconnect_notified_at: string | null
          token_expires_at: string | null
          updated_at: string
          user_id: string
          username: string
        }
        Insert: {
          access_token: string
          created_at?: string
          id?: string
          instagram_user_id: string
          last_checked_at?: string | null
          needs_reconnect?: boolean
          reconnect_notified_at?: string | null
          token_expires_at?: string | null
          updated_at?: string
          user_id: string
          username: string
        }
        Update: {
          access_token?: string
          created_at?: string
          id?: string
          instagram_user_id?: string
          last_checked_at?: string | null
          needs_reconnect?: boolean
          reconnect_notified_at?: string | null
          token_expires_at?: string | null
          updated_at?: string
          user_id?: string
          username?: string
        }
        Relationships: []
      }
      dm_conversations: {
        Row: {
          created_at: string
          customer_username: string | null
          disclosure_sent_at: string | null
          id: string
          ig_scoped_id: string
          last_inbound_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          customer_username?: string | null
          disclosure_sent_at?: string | null
          id?: string
          ig_scoped_id: string
          last_inbound_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          customer_username?: string | null
          disclosure_sent_at?: string | null
          id?: string
          ig_scoped_id?: string
          last_inbound_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      dm_messages: {
        Row: {
          conversation_id: string
          created_at: string
          direction: string
          generated_reply: string | null
          id: string
          ig_message_id: string
          message_text: string
          posted_message_id: string | null
          replied_at: string | null
          status: string
          telegram_chat_id: string | null
          telegram_message_id: number | null
          user_id: string
        }
        Insert: {
          conversation_id: string
          created_at?: string
          direction: string
          generated_reply?: string | null
          id?: string
          ig_message_id: string
          message_text: string
          posted_message_id?: string | null
          replied_at?: string | null
          status?: string
          telegram_chat_id?: string | null
          telegram_message_id?: number | null
          user_id: string
        }
        Update: {
          conversation_id?: string
          created_at?: string
          direction?: string
          generated_reply?: string | null
          id?: string
          ig_message_id?: string
          message_text?: string
          posted_message_id?: string | null
          replied_at?: string | null
          status?: string
          telegram_chat_id?: string | null
          telegram_message_id?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dm_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "dm_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      dm_settings: {
        Row: {
          ai_instructions: string | null
          auto_approve: boolean
          bot_enabled: boolean
          bot_started_at: string | null
          created_at: string
          default_link: string | null
          disclosure_message: string | null
          id: string
          reply_model: string
          tone_preset: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_instructions?: string | null
          auto_approve?: boolean
          bot_enabled?: boolean
          bot_started_at?: string | null
          created_at?: string
          default_link?: string | null
          disclosure_message?: string | null
          id?: string
          reply_model?: string
          tone_preset?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_instructions?: string | null
          auto_approve?: boolean
          bot_enabled?: boolean
          bot_started_at?: string | null
          created_at?: string
          default_link?: string | null
          disclosure_message?: string | null
          id?: string
          reply_model?: string
          tone_preset?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      faq_items: {
        Row: {
          answer: string
          category: string
          created_at: string | null
          id: string
          is_active: boolean | null
          question: string
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          answer: string
          category?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          question: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          answer?: string
          category?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          question?: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: []
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
      ig_accounts: {
        Row: {
          access_token: string
          created_at: string
          id: string
          ig_user_id: string
          last_checked_at: string | null
          needs_reconnect: boolean
          reconnect_notified_at: string | null
          token_expires_at: string | null
          updated_at: string
          user_id: string
          username: string
        }
        Insert: {
          access_token: string
          created_at?: string
          id?: string
          ig_user_id: string
          last_checked_at?: string | null
          needs_reconnect?: boolean
          reconnect_notified_at?: string | null
          token_expires_at?: string | null
          updated_at?: string
          user_id: string
          username: string
        }
        Update: {
          access_token?: string
          created_at?: string
          id?: string
          ig_user_id?: string
          last_checked_at?: string | null
          needs_reconnect?: boolean
          reconnect_notified_at?: string | null
          token_expires_at?: string | null
          updated_at?: string
          user_id?: string
          username?: string
        }
        Relationships: []
      }
      ig_comments: {
        Row: {
          author_username: string | null
          comment_text: string
          fetched_at: string
          generated_reply: string | null
          id: string
          ig_comment_id: string
          media_id: string
          posted_reply_id: string | null
          replied_at: string | null
          status: string
          telegram_chat_id: string | null
          telegram_message_id: number | null
          user_id: string
        }
        Insert: {
          author_username?: string | null
          comment_text: string
          fetched_at?: string
          generated_reply?: string | null
          id?: string
          ig_comment_id: string
          media_id: string
          posted_reply_id?: string | null
          replied_at?: string | null
          status?: string
          telegram_chat_id?: string | null
          telegram_message_id?: number | null
          user_id: string
        }
        Update: {
          author_username?: string | null
          comment_text?: string
          fetched_at?: string
          generated_reply?: string | null
          id?: string
          ig_comment_id?: string
          media_id?: string
          posted_reply_id?: string | null
          replied_at?: string | null
          status?: string
          telegram_chat_id?: string | null
          telegram_message_id?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ig_comments_media_id_fkey"
            columns: ["media_id"]
            isOneToOne: false
            referencedRelation: "ig_media"
            referencedColumns: ["id"]
          },
        ]
      }
      ig_media: {
        Row: {
          caption: string | null
          created_at: string
          custom_link: string | null
          id: string
          ig_media_id: string
          is_hidden: boolean
          is_monitored: boolean
          media_type: string
          permalink: string | null
          thumbnail_url: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          custom_link?: string | null
          id?: string
          ig_media_id: string
          is_hidden?: boolean
          is_monitored?: boolean
          media_type: string
          permalink?: string | null
          thumbnail_url?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          custom_link?: string | null
          id?: string
          ig_media_id?: string
          is_hidden?: boolean
          is_monitored?: boolean
          media_type?: string
          permalink?: string | null
          thumbnail_url?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ig_settings: {
        Row: {
          ai_instructions: string | null
          auto_approve: boolean
          created_at: string
          default_link: string | null
          id: string
          last_run_at: string | null
          monitoring_enabled: boolean
          monitoring_interval_minutes: number
          monitoring_started_at: string | null
          reply_model: string
          tone_preset: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_instructions?: string | null
          auto_approve?: boolean
          created_at?: string
          default_link?: string | null
          id?: string
          last_run_at?: string | null
          monitoring_enabled?: boolean
          monitoring_interval_minutes?: number
          monitoring_started_at?: string | null
          reply_model?: string
          tone_preset?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_instructions?: string | null
          auto_approve?: boolean
          created_at?: string
          default_link?: string | null
          id?: string
          last_run_at?: string | null
          monitoring_enabled?: boolean
          monitoring_interval_minutes?: number
          monitoring_started_at?: string | null
          reply_model?: string
          tone_preset?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      insta_accounts: {
        Row: {
          access_token: string
          created_at: string
          id: string
          ig_user_id: string
          ig_username: string | null
          page_id: string
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
          page_id: string
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
          page_id?: string
          token_expires_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      insta_candidates: {
        Row: {
          caption: string
          created_at: string
          hashtags: string[]
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
          caption: string
          created_at?: string
          hashtags?: string[]
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
          caption?: string
          created_at?: string
          hashtags?: string[]
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
      insta_post_slides: {
        Row: {
          created_at: string
          id: string
          image_prompt: string | null
          image_url: string | null
          image_urls: string[]
          post_id: string
          slide_order: number
          source_paragraph: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_prompt?: string | null
          image_url?: string | null
          image_urls?: string[]
          post_id: string
          slide_order: number
          source_paragraph?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          image_prompt?: string | null
          image_url?: string | null
          image_urls?: string[]
          post_id?: string
          slide_order?: number
          source_paragraph?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "insta_post_slides_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "insta_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      insta_posts: {
        Row: {
          caption: string
          cover_image_url: string | null
          created_at: string
          error_message: string | null
          hashtags: string[]
          id: string
          ig_media_id: string | null
          ig_permalink: string | null
          image_url: string | null
          post_type: string
          scheduled_at: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          caption: string
          cover_image_url?: string | null
          created_at?: string
          error_message?: string | null
          hashtags?: string[]
          id?: string
          ig_media_id?: string | null
          ig_permalink?: string | null
          image_url?: string | null
          post_type?: string
          scheduled_at?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          caption?: string
          cover_image_url?: string | null
          created_at?: string
          error_message?: string | null
          hashtags?: string[]
          id?: string
          ig_media_id?: string | null
          ig_permalink?: string | null
          image_url?: string | null
          post_type?: string
          scheduled_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
      legal_documents: {
        Row: {
          content: string
          slug: string
          title: string
          updated_at: string | null
        }
        Insert: {
          content: string
          slug: string
          title: string
          updated_at?: string | null
        }
        Update: {
          content?: string
          slug?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      longtail_expansions: {
        Row: {
          created_at: string
          id: string
          keyword: string
          related_id: string | null
          seed_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          keyword: string
          related_id?: string | null
          seed_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          keyword?: string
          related_id?: string | null
          seed_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "longtail_expansions_related_id_fkey"
            columns: ["related_id"]
            isOneToOne: false
            referencedRelation: "longtail_related_keywords"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "longtail_expansions_seed_id_fkey"
            columns: ["seed_id"]
            isOneToOne: false
            referencedRelation: "longtail_seed_keywords"
            referencedColumns: ["id"]
          },
        ]
      }
      longtail_related_keywords: {
        Row: {
          created_at: string
          id: string
          keyword: string
          relevance_score: number | null
          seed_id: string
          source: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          keyword: string
          relevance_score?: number | null
          seed_id: string
          source?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          keyword?: string
          relevance_score?: number | null
          seed_id?: string
          source?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "longtail_related_keywords_seed_id_fkey"
            columns: ["seed_id"]
            isOneToOne: false
            referencedRelation: "longtail_seed_keywords"
            referencedColumns: ["id"]
          },
        ]
      }
      longtail_runs: {
        Row: {
          executed_at: string
          expansion_count: number
          id: string
          related_count: number
          seed_id: string
          summary_text: string | null
          user_id: string
        }
        Insert: {
          executed_at?: string
          expansion_count?: number
          id?: string
          related_count?: number
          seed_id: string
          summary_text?: string | null
          user_id: string
        }
        Update: {
          executed_at?: string
          expansion_count?: number
          id?: string
          related_count?: number
          seed_id?: string
          summary_text?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "longtail_runs_seed_id_fkey"
            columns: ["seed_id"]
            isOneToOne: false
            referencedRelation: "longtail_seed_keywords"
            referencedColumns: ["id"]
          },
        ]
      }
      longtail_seed_keywords: {
        Row: {
          created_at: string
          engine: string
          id: string
          is_active: boolean
          keyword: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          engine?: string
          id?: string
          is_active?: boolean
          keyword: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          engine?: string
          id?: string
          is_active?: boolean
          keyword?: string
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
      music_plannings: {
        Row: {
          created_at: string
          description: string | null
          exclude_styles: string | null
          id: string
          lang: string
          song_description: string
          status: string
          style_description: string | null
          title: string | null
          updated_at: string
          user_id: string
          vocal_gender: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          exclude_styles?: string | null
          id?: string
          lang?: string
          song_description: string
          status?: string
          style_description?: string | null
          title?: string | null
          updated_at?: string
          user_id: string
          vocal_gender?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          exclude_styles?: string | null
          id?: string
          lang?: string
          song_description?: string
          status?: string
          style_description?: string | null
          title?: string | null
          updated_at?: string
          user_id?: string
          vocal_gender?: string | null
        }
        Relationships: []
      }
      music_remix_sources: {
        Row: {
          audio_url: string
          created_at: string
          id: string
          kind: string
          title: string
          track_id: string | null
          user_id: string
        }
        Insert: {
          audio_url: string
          created_at?: string
          id?: string
          kind: string
          title: string
          track_id?: string | null
          user_id: string
        }
        Update: {
          audio_url?: string
          created_at?: string
          id?: string
          kind?: string
          title?: string
          track_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "music_remix_sources_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "music_tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      music_track_mr: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          instrumental_url: string | null
          status: string
          task_id: string | null
          updated_at: string
          user_id: string
          variant_id: string
          vocal_url: string | null
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          instrumental_url?: string | null
          status?: string
          task_id?: string | null
          updated_at?: string
          user_id: string
          variant_id: string
          vocal_url?: string | null
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          instrumental_url?: string | null
          status?: string
          task_id?: string | null
          updated_at?: string
          user_id?: string
          variant_id?: string
          vocal_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "music_track_mr_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "music_track_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      music_track_remix_variants: {
        Row: {
          audio_url: string
          created_at: string
          duration_seconds: number | null
          id: string
          image_url: string | null
          remix_id: string
          suno_audio_id: string | null
          user_id: string
        }
        Insert: {
          audio_url: string
          created_at?: string
          duration_seconds?: number | null
          id?: string
          image_url?: string | null
          remix_id: string
          suno_audio_id?: string | null
          user_id: string
        }
        Update: {
          audio_url?: string
          created_at?: string
          duration_seconds?: number | null
          id?: string
          image_url?: string | null
          remix_id?: string
          suno_audio_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "music_track_remix_variants_remix_id_fkey"
            columns: ["remix_id"]
            isOneToOne: false
            referencedRelation: "music_track_remixes"
            referencedColumns: ["id"]
          },
        ]
      }
      music_track_remixes: {
        Row: {
          audio_weight: number | null
          created_at: string
          desired_feel: string
          error_message: string | null
          extend_hop_count: number
          id: string
          instrumental: boolean
          lang: string
          lyrics: string | null
          source_audio_url: string
          source_id: string | null
          source_title: string | null
          status: string
          style_description: string | null
          style_weight: number | null
          suno_model: string
          target_duration_seconds: number | null
          task_id: string | null
          updated_at: string
          user_id: string
          vocal_gender: string | null
          weirdness_constraint: number | null
        }
        Insert: {
          audio_weight?: number | null
          created_at?: string
          desired_feel: string
          error_message?: string | null
          extend_hop_count?: number
          id?: string
          instrumental?: boolean
          lang?: string
          lyrics?: string | null
          source_audio_url: string
          source_id?: string | null
          source_title?: string | null
          status?: string
          style_description?: string | null
          style_weight?: number | null
          suno_model?: string
          target_duration_seconds?: number | null
          task_id?: string | null
          updated_at?: string
          user_id: string
          vocal_gender?: string | null
          weirdness_constraint?: number | null
        }
        Update: {
          audio_weight?: number | null
          created_at?: string
          desired_feel?: string
          error_message?: string | null
          extend_hop_count?: number
          id?: string
          instrumental?: boolean
          lang?: string
          lyrics?: string | null
          source_audio_url?: string
          source_id?: string | null
          source_title?: string | null
          status?: string
          style_description?: string | null
          style_weight?: number | null
          suno_model?: string
          target_duration_seconds?: number | null
          task_id?: string | null
          updated_at?: string
          user_id?: string
          vocal_gender?: string | null
          weirdness_constraint?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "music_track_remixes_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "music_remix_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      music_track_variants: {
        Row: {
          audio_url: string
          created_at: string
          duration_seconds: number | null
          id: string
          image_url: string | null
          suno_audio_id: string | null
          track_id: string
          user_id: string
        }
        Insert: {
          audio_url: string
          created_at?: string
          duration_seconds?: number | null
          id?: string
          image_url?: string | null
          suno_audio_id?: string | null
          track_id: string
          user_id: string
        }
        Update: {
          audio_url?: string
          created_at?: string
          duration_seconds?: number | null
          id?: string
          image_url?: string | null
          suno_audio_id?: string | null
          track_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "music_track_variants_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "music_tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      music_track_wav: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          status: string
          task_id: string | null
          updated_at: string
          user_id: string
          variant_id: string
          wav_url: string | null
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          status?: string
          task_id?: string | null
          updated_at?: string
          user_id: string
          variant_id: string
          wav_url?: string | null
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          status?: string
          task_id?: string | null
          updated_at?: string
          user_id?: string
          variant_id?: string
          wav_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "music_track_wav_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "music_track_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      music_tracks: {
        Row: {
          created_at: string
          error_message: string | null
          exclude_styles: string | null
          extended_from_variant_id: string | null
          id: string
          mode: string
          planning_id: string
          prompt_text: string
          status: string
          style_description: string | null
          suno_model: string
          task_id: string | null
          title: string
          updated_at: string
          user_id: string
          vocal_gender: string | null
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          exclude_styles?: string | null
          extended_from_variant_id?: string | null
          id?: string
          mode: string
          planning_id: string
          prompt_text: string
          status?: string
          style_description?: string | null
          suno_model?: string
          task_id?: string | null
          title: string
          updated_at?: string
          user_id: string
          vocal_gender?: string | null
        }
        Update: {
          created_at?: string
          error_message?: string | null
          exclude_styles?: string | null
          extended_from_variant_id?: string | null
          id?: string
          mode?: string
          planning_id?: string
          prompt_text?: string
          status?: string
          style_description?: string | null
          suno_model?: string
          task_id?: string | null
          title?: string
          updated_at?: string
          user_id?: string
          vocal_gender?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "music_tracks_extended_from_variant_id_fkey"
            columns: ["extended_from_variant_id"]
            isOneToOne: false
            referencedRelation: "music_track_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "music_tracks_planning_id_fkey"
            columns: ["planning_id"]
            isOneToOne: false
            referencedRelation: "music_plannings"
            referencedColumns: ["id"]
          },
        ]
      }
      naver_search_cache: {
        Row: {
          cache_key: string
          fetched_at: string
          id: string
          items: Json
          query: string
          search_type: string
        }
        Insert: {
          cache_key: string
          fetched_at?: string
          id?: string
          items: Json
          query: string
          search_type: string
        }
        Update: {
          cache_key?: string
          fetched_at?: string
          id?: string
          items?: Json
          query?: string
          search_type?: string
        }
        Relationships: []
      }
      naver_trend_cache: {
        Row: {
          cache_key: string
          fetched_at: string
          groups: Json
          id: string
          period_months: number
          results: Json
          time_unit: string
        }
        Insert: {
          cache_key: string
          fetched_at?: string
          groups: Json
          id?: string
          period_months: number
          results: Json
          time_unit: string
        }
        Update: {
          cache_key?: string
          fetched_at?: string
          groups?: Json
          id?: string
          period_months?: number
          results?: Json
          time_unit?: string
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
      notices: {
        Row: {
          content: string
          created_at: string | null
          id: string
          is_active: boolean | null
          is_pinned: boolean | null
          title: string
          updated_at: string | null
          view_count: number | null
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_pinned?: boolean | null
          title: string
          updated_at?: string | null
          view_count?: number | null
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_pinned?: boolean | null
          title?: string
          updated_at?: string | null
          view_count?: number | null
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
          is_suspended: boolean
          name: string | null
          phone: string | null
          referred_by: string | null
          suspended_at: string | null
          suspended_reason: string | null
        }
        Insert: {
          affiliate_code?: string | null
          created_at?: string | null
          email: string
          grade_id?: string | null
          id: string
          is_admin?: boolean | null
          is_suspended?: boolean
          name?: string | null
          phone?: string | null
          referred_by?: string | null
          suspended_at?: string | null
          suspended_reason?: string | null
        }
        Update: {
          affiliate_code?: string | null
          created_at?: string | null
          email?: string
          grade_id?: string | null
          id?: string
          is_admin?: boolean | null
          is_suspended?: boolean
          name?: string | null
          phone?: string | null
          referred_by?: string | null
          suspended_at?: string | null
          suspended_reason?: string | null
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
          badge: string | null
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
          badge?: string | null
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
          badge?: string | null
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
          used_fallback_key: boolean
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
          used_fallback_key?: boolean
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
          used_fallback_key?: boolean
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
      real_estate_kakao_templates: {
        Row: {
          created_at: string | null
          template_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          template_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          template_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      real_estate_land_info: {
        Row: {
          fetched_at: string
          pnu: string
          price_per_m2: number | null
          price_stdr_year: string | null
          raw_price_data: Json | null
          raw_use_data: Json | null
          use_zones: string | null
        }
        Insert: {
          fetched_at?: string
          pnu: string
          price_per_m2?: number | null
          price_stdr_year?: string | null
          raw_price_data?: Json | null
          raw_use_data?: Json | null
          use_zones?: string | null
        }
        Update: {
          fetched_at?: string
          pnu?: string
          price_per_m2?: number | null
          price_stdr_year?: string | null
          raw_price_data?: Json | null
          raw_use_data?: Json | null
          use_zones?: string | null
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
      recommendation_reports: {
        Row: {
          ai_summary: string | null
          generated_at: string
          id: string
          items: Json
          user_id: string
          watchlist_id: string
        }
        Insert: {
          ai_summary?: string | null
          generated_at?: string
          id?: string
          items?: Json
          user_id: string
          watchlist_id: string
        }
        Update: {
          ai_summary?: string | null
          generated_at?: string
          id?: string
          items?: Json
          user_id?: string
          watchlist_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recommendation_reports_watchlist_id_fkey"
            columns: ["watchlist_id"]
            isOneToOne: false
            referencedRelation: "trend_watchlist"
            referencedColumns: ["id"]
          },
        ]
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
      shop_page_exports: {
        Row: {
          created_at: string
          id: string
          image_url: string
          language: string
          product_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_url: string
          language?: string
          product_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string
          language?: string
          product_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shop_page_exports_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "shop_products"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_product_images: {
        Row: {
          created_at: string
          id: string
          image_url: string | null
          image_urls: string[]
          language: string
          product_id: string
          prompt_used: string | null
          section_key: string
          section_order: number
          template_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_url?: string | null
          image_urls?: string[]
          language?: string
          product_id: string
          prompt_used?: string | null
          section_key: string
          section_order: number
          template_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string | null
          image_urls?: string[]
          language?: string
          product_id?: string
          prompt_used?: string | null
          section_key?: string
          section_order?: number
          template_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shop_product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "shop_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_product_images_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "shop_prompt_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_products: {
        Row: {
          background_style: string | null
          category: string | null
          created_at: string
          currency: string
          default_image_model: string
          font_style: string | null
          how_to_use: string | null
          id: string
          image_generation_notes: string | null
          key_features: string | null
          language: string
          layout_density: string | null
          main_color: string | null
          mood_keywords: string[]
          name: string | null
          price: number | null
          product_label: string | null
          reference_image_urls: string[]
          sale_price: number | null
          source_image_url: string | null
          specs: string | null
          status: string
          sub_color: string | null
          target_customer: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          background_style?: string | null
          category?: string | null
          created_at?: string
          currency?: string
          default_image_model?: string
          font_style?: string | null
          how_to_use?: string | null
          id?: string
          image_generation_notes?: string | null
          key_features?: string | null
          language?: string
          layout_density?: string | null
          main_color?: string | null
          mood_keywords?: string[]
          name?: string | null
          price?: number | null
          product_label?: string | null
          reference_image_urls?: string[]
          sale_price?: number | null
          source_image_url?: string | null
          specs?: string | null
          status?: string
          sub_color?: string | null
          target_customer?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          background_style?: string | null
          category?: string | null
          created_at?: string
          currency?: string
          default_image_model?: string
          font_style?: string | null
          how_to_use?: string | null
          id?: string
          image_generation_notes?: string | null
          key_features?: string | null
          language?: string
          layout_density?: string | null
          main_color?: string | null
          mood_keywords?: string[]
          name?: string | null
          price?: number | null
          product_label?: string | null
          reference_image_urls?: string[]
          sale_price?: number | null
          source_image_url?: string | null
          specs?: string | null
          status?: string
          sub_color?: string | null
          target_customer?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      shop_prompt_templates: {
        Row: {
          aspect_ratio: string
          created_at: string
          id: string
          is_active: boolean
          korean_guide: string
          prompt_template: string
          resolution: string
          section_key: string
          section_name: string
          section_order: number
          user_id: string | null
        }
        Insert: {
          aspect_ratio?: string
          created_at?: string
          id?: string
          is_active?: boolean
          korean_guide?: string
          prompt_template: string
          resolution?: string
          section_key: string
          section_name: string
          section_order: number
          user_id?: string | null
        }
        Update: {
          aspect_ratio?: string
          created_at?: string
          id?: string
          is_active?: boolean
          korean_guide?: string
          prompt_template?: string
          resolution?: string
          section_key?: string
          section_name?: string
          section_order?: number
          user_id?: string | null
        }
        Relationships: []
      }
      shopping_competition: {
        Row: {
          fetched_at: string
          id: string
          keyword: string
          max_price: number | null
          min_price: number | null
          product_count: number | null
          user_id: string
          watchlist_id: string | null
        }
        Insert: {
          fetched_at?: string
          id?: string
          keyword: string
          max_price?: number | null
          min_price?: number | null
          product_count?: number | null
          user_id: string
          watchlist_id?: string | null
        }
        Update: {
          fetched_at?: string
          id?: string
          keyword?: string
          max_price?: number | null
          min_price?: number | null
          product_count?: number | null
          user_id?: string
          watchlist_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shopping_competition_watchlist_id_fkey"
            columns: ["watchlist_id"]
            isOneToOne: false
            referencedRelation: "trend_watchlist"
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
      sourcing_saved_products: {
        Row: {
          active_hour_end: number | null
          active_hour_start: number | null
          alert_channels: string[]
          alert_enabled: boolean
          alert_interval_minutes: number
          created_at: string
          detail_url: string
          id: string
          keyword: string
          last_checked_at: string | null
          last_price_krw: number | null
          last_status: string
          platform: string
          product_key: string
          title: string
          user_id: string
        }
        Insert: {
          active_hour_end?: number | null
          active_hour_start?: number | null
          alert_channels?: string[]
          alert_enabled?: boolean
          alert_interval_minutes?: number
          created_at?: string
          detail_url: string
          id?: string
          keyword: string
          last_checked_at?: string | null
          last_price_krw?: number | null
          last_status?: string
          platform: string
          product_key: string
          title: string
          user_id: string
        }
        Update: {
          active_hour_end?: number | null
          active_hour_start?: number | null
          alert_channels?: string[]
          alert_enabled?: boolean
          alert_interval_minutes?: number
          created_at?: string
          detail_url?: string
          id?: string
          keyword?: string
          last_checked_at?: string | null
          last_price_krw?: number | null
          last_status?: string
          platform?: string
          product_key?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      stepmail_campaign_smtp_accounts: {
        Row: {
          campaign_id: string
          smtp_account_id: string
          sort_order: number
        }
        Insert: {
          campaign_id: string
          smtp_account_id: string
          sort_order?: number
        }
        Update: {
          campaign_id?: string
          smtp_account_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "stepmail_campaign_smtp_accounts_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "stepmail_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stepmail_campaign_smtp_accounts_smtp_account_id_fkey"
            columns: ["smtp_account_id"]
            isOneToOne: false
            referencedRelation: "user_smtp_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      stepmail_campaigns: {
        Row: {
          created_at: string
          draft_id: string
          id: string
          is_active: boolean
          last_run_at: string | null
          name: string
          quantity_per_run: number
          recurrence: string
          send_hour: number
          send_minute: number
          target_send_count: number
          updated_at: string
          user_id: string
          weekly_day: number | null
        }
        Insert: {
          created_at?: string
          draft_id: string
          id?: string
          is_active?: boolean
          last_run_at?: string | null
          name: string
          quantity_per_run?: number
          recurrence?: string
          send_hour?: number
          send_minute?: number
          target_send_count?: number
          updated_at?: string
          user_id: string
          weekly_day?: number | null
        }
        Update: {
          created_at?: string
          draft_id?: string
          id?: string
          is_active?: boolean
          last_run_at?: string | null
          name?: string
          quantity_per_run?: number
          recurrence?: string
          send_hour?: number
          send_minute?: number
          target_send_count?: number
          updated_at?: string
          user_id?: string
          weekly_day?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "stepmail_campaigns_draft_id_fkey"
            columns: ["draft_id"]
            isOneToOne: false
            referencedRelation: "stepmail_email_drafts"
            referencedColumns: ["id"]
          },
        ]
      }
      stepmail_email_drafts: {
        Row: {
          body_html: string
          created_at: string
          cta_text: string | null
          cta_url: string | null
          custom_prompt: string | null
          id: string
          image_url: string | null
          keywords: string[]
          reference_urls: string[]
          subject: string
          topic: string
          updated_at: string
          user_id: string
        }
        Insert: {
          body_html: string
          created_at?: string
          cta_text?: string | null
          cta_url?: string | null
          custom_prompt?: string | null
          id?: string
          image_url?: string | null
          keywords?: string[]
          reference_urls?: string[]
          subject: string
          topic: string
          updated_at?: string
          user_id: string
        }
        Update: {
          body_html?: string
          created_at?: string
          cta_text?: string | null
          cta_url?: string | null
          custom_prompt?: string | null
          id?: string
          image_url?: string | null
          keywords?: string[]
          reference_urls?: string[]
          subject?: string
          topic?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      stepmail_leads: {
        Row: {
          channel: string | null
          created_at: string
          email: string
          id: string
          input_date: string | null
          last_sent_at: string | null
          memo: string | null
          nickname: string | null
          send_count: number
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          channel?: string | null
          created_at?: string
          email: string
          id?: string
          input_date?: string | null
          last_sent_at?: string | null
          memo?: string | null
          nickname?: string | null
          send_count?: number
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          channel?: string | null
          created_at?: string
          email?: string
          id?: string
          input_date?: string | null
          last_sent_at?: string | null
          memo?: string | null
          nickname?: string | null
          send_count?: number
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      stepmail_send_log: {
        Row: {
          campaign_id: string | null
          error_message: string | null
          id: string
          lead_id: string
          sent_at: string
          smtp_account_id: string | null
          status: string
          subject: string | null
          user_id: string
        }
        Insert: {
          campaign_id?: string | null
          error_message?: string | null
          id?: string
          lead_id: string
          sent_at?: string
          smtp_account_id?: string | null
          status: string
          subject?: string | null
          user_id: string
        }
        Update: {
          campaign_id?: string | null
          error_message?: string | null
          id?: string
          lead_id?: string
          sent_at?: string
          smtp_account_id?: string | null
          status?: string
          subject?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stepmail_send_log_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "stepmail_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stepmail_send_log_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "stepmail_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stepmail_send_log_smtp_account_id_fkey"
            columns: ["smtp_account_id"]
            isOneToOne: false
            referencedRelation: "user_smtp_accounts"
            referencedColumns: ["id"]
          },
        ]
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
      tap_accounts: {
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
      tap_posts: {
        Row: {
          content: string
          created_at: string
          error_message: string | null
          id: string
          image_url: string | null
          product_id: string | null
          scheduled_at: string | null
          status: string
          threads_permalink: string | null
          threads_post_id: string | null
          updated_at: string
          user_id: string
          video_url: string | null
        }
        Insert: {
          content: string
          created_at?: string
          error_message?: string | null
          id?: string
          image_url?: string | null
          product_id?: string | null
          scheduled_at?: string | null
          status?: string
          threads_permalink?: string | null
          threads_post_id?: string | null
          updated_at?: string
          user_id: string
          video_url?: string | null
        }
        Update: {
          content?: string
          created_at?: string
          error_message?: string | null
          id?: string
          image_url?: string | null
          product_id?: string | null
          scheduled_at?: string | null
          status?: string
          threads_permalink?: string | null
          threads_post_id?: string | null
          updated_at?: string
          user_id?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tap_posts_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "affiliate_products"
            referencedColumns: ["id"]
          },
        ]
      }
      th_accounts: {
        Row: {
          access_token: string
          created_at: string
          id: string
          last_checked_at: string | null
          needs_reconnect: boolean
          reconnect_notified_at: string | null
          threads_user_id: string
          token_expires_at: string | null
          updated_at: string
          user_id: string
          username: string
        }
        Insert: {
          access_token: string
          created_at?: string
          id?: string
          last_checked_at?: string | null
          needs_reconnect?: boolean
          reconnect_notified_at?: string | null
          threads_user_id: string
          token_expires_at?: string | null
          updated_at?: string
          user_id: string
          username: string
        }
        Update: {
          access_token?: string
          created_at?: string
          id?: string
          last_checked_at?: string | null
          needs_reconnect?: boolean
          reconnect_notified_at?: string | null
          threads_user_id?: string
          token_expires_at?: string | null
          updated_at?: string
          user_id?: string
          username?: string
        }
        Relationships: []
      }
      th_comments: {
        Row: {
          author_username: string | null
          comment_text: string
          fetched_at: string
          generated_reply: string | null
          id: string
          post_id: string
          posted_reply_id: string | null
          replied_at: string | null
          status: string
          telegram_chat_id: string | null
          telegram_message_id: number | null
          threads_reply_id: string
          user_id: string
        }
        Insert: {
          author_username?: string | null
          comment_text: string
          fetched_at?: string
          generated_reply?: string | null
          id?: string
          post_id: string
          posted_reply_id?: string | null
          replied_at?: string | null
          status?: string
          telegram_chat_id?: string | null
          telegram_message_id?: number | null
          threads_reply_id: string
          user_id: string
        }
        Update: {
          author_username?: string | null
          comment_text?: string
          fetched_at?: string
          generated_reply?: string | null
          id?: string
          post_id?: string
          posted_reply_id?: string | null
          replied_at?: string | null
          status?: string
          telegram_chat_id?: string | null
          telegram_message_id?: number | null
          threads_reply_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "th_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "th_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      th_posts: {
        Row: {
          created_at: string
          custom_link: string | null
          id: string
          is_hidden: boolean
          is_monitored: boolean
          permalink: string | null
          text: string | null
          threads_post_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          custom_link?: string | null
          id?: string
          is_hidden?: boolean
          is_monitored?: boolean
          permalink?: string | null
          text?: string | null
          threads_post_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          custom_link?: string | null
          id?: string
          is_hidden?: boolean
          is_monitored?: boolean
          permalink?: string | null
          text?: string | null
          threads_post_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      th_settings: {
        Row: {
          ai_instructions: string | null
          auto_approve: boolean
          created_at: string
          default_link: string | null
          id: string
          last_run_at: string | null
          monitoring_enabled: boolean
          monitoring_interval_minutes: number
          monitoring_started_at: string | null
          reply_model: string
          tone_preset: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_instructions?: string | null
          auto_approve?: boolean
          created_at?: string
          default_link?: string | null
          id?: string
          last_run_at?: string | null
          monitoring_enabled?: boolean
          monitoring_interval_minutes?: number
          monitoring_started_at?: string | null
          reply_model?: string
          tone_preset?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_instructions?: string | null
          auto_approve?: boolean
          created_at?: string
          default_link?: string | null
          id?: string
          last_run_at?: string | null
          monitoring_enabled?: boolean
          monitoring_interval_minutes?: number
          monitoring_started_at?: string | null
          reply_model?: string
          tone_preset?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
      trend_snapshots: {
        Row: {
          fetched_at: string
          id: string
          keyword: string | null
          period_end: string
          period_start: string
          raw: Json | null
          source: string
          time_unit: string
          trend_index: number | null
          user_id: string
          watchlist_id: string
        }
        Insert: {
          fetched_at?: string
          id?: string
          keyword?: string | null
          period_end: string
          period_start: string
          raw?: Json | null
          source?: string
          time_unit?: string
          trend_index?: number | null
          user_id: string
          watchlist_id: string
        }
        Update: {
          fetched_at?: string
          id?: string
          keyword?: string | null
          period_end?: string
          period_start?: string
          raw?: Json | null
          source?: string
          time_unit?: string
          trend_index?: number | null
          user_id?: string
          watchlist_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trend_snapshots_watchlist_id_fkey"
            columns: ["watchlist_id"]
            isOneToOne: false
            referencedRelation: "trend_watchlist"
            referencedColumns: ["id"]
          },
        ]
      }
      trend_watchlist: {
        Row: {
          category_name: string
          created_at: string
          id: string
          is_active: boolean
          keywords: string[]
          naver_category_code: string | null
          sourcing_alert_active_hour_end: number | null
          sourcing_alert_active_hour_start: number | null
          sourcing_alert_channels: string[]
          sourcing_alert_enabled: boolean
          sourcing_alert_interval_minutes: number | null
          sourcing_alert_last_run_at: string | null
          sourcing_alert_last_snapshot: Json | null
          sourcing_alert_notify_mode: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category_name: string
          created_at?: string
          id?: string
          is_active?: boolean
          keywords?: string[]
          naver_category_code?: string | null
          sourcing_alert_active_hour_end?: number | null
          sourcing_alert_active_hour_start?: number | null
          sourcing_alert_channels?: string[]
          sourcing_alert_enabled?: boolean
          sourcing_alert_interval_minutes?: number | null
          sourcing_alert_last_run_at?: string | null
          sourcing_alert_last_snapshot?: Json | null
          sourcing_alert_notify_mode?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category_name?: string
          created_at?: string
          id?: string
          is_active?: boolean
          keywords?: string[]
          naver_category_code?: string | null
          sourcing_alert_active_hour_end?: number | null
          sourcing_alert_active_hour_start?: number | null
          sourcing_alert_channels?: string[]
          sourcing_alert_enabled?: boolean
          sourcing_alert_interval_minutes?: number | null
          sourcing_alert_last_run_at?: string | null
          sourcing_alert_last_snapshot?: Json | null
          sourcing_alert_notify_mode?: string
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
      user_kakao_alimtalk_templates: {
        Row: {
          created_at: string | null
          price_template_id: string | null
          sourcing_template_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          price_template_id?: string | null
          sourcing_template_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          price_template_id?: string | null
          sourcing_template_id?: string | null
          updated_at?: string | null
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
      user_smtp_accounts: {
        Row: {
          created_at: string
          from_name: string | null
          id: string
          is_active: boolean
          label: string
          provider: string | null
          smtp_host: string
          smtp_password: string
          smtp_port: number
          smtp_user: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          from_name?: string | null
          id?: string
          is_active?: boolean
          label: string
          provider?: string | null
          smtp_host: string
          smtp_password: string
          smtp_port?: number
          smtp_user: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          from_name?: string | null
          id?: string
          is_active?: boolean
          label?: string
          provider?: string | null
          smtp_host?: string
          smtp_password?: string
          smtp_port?: number
          smtp_user?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_solapi_accounts: {
        Row: {
          api_key: string
          api_secret: string
          created_at: string
          kakao_pf_id: string | null
          rcs_brand_id: string | null
          sender_phone: string
          updated_at: string
          user_id: string
        }
        Insert: {
          api_key: string
          api_secret: string
          created_at?: string
          kakao_pf_id?: string | null
          rcs_brand_id?: string | null
          sender_phone: string
          updated_at?: string
          user_id: string
        }
        Update: {
          api_key?: string
          api_secret?: string
          created_at?: string
          kakao_pf_id?: string | null
          rcs_brand_id?: string | null
          sender_phone?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_telegram_links: {
        Row: {
          bot_token: string | null
          bot_username: string | null
          chat_id: string
          id: string
          linked_at: string
          program_slug: string
          user_id: string
        }
        Insert: {
          bot_token?: string | null
          bot_username?: string | null
          chat_id: string
          id?: string
          linked_at?: string
          program_slug: string
          user_id: string
        }
        Update: {
          bot_token?: string | null
          bot_username?: string | null
          chat_id?: string
          id?: string
          linked_at?: string
          program_slug?: string
          user_id?: string
        }
        Relationships: []
      }
      user_tracked_competitors: {
        Row: {
          created_at: string
          domain: string
          id: string
          note: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          domain: string
          id?: string
          note?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          domain?: string
          id?: string
          note?: string | null
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
      ytreply_accounts: {
        Row: {
          access_token: string
          channel_id: string
          channel_title: string
          created_at: string
          id: string
          last_checked_at: string | null
          needs_reconnect: boolean
          reconnect_notified_at: string | null
          refresh_token: string
          token_expires_at: string | null
          user_id: string
        }
        Insert: {
          access_token: string
          channel_id: string
          channel_title: string
          created_at?: string
          id?: string
          last_checked_at?: string | null
          needs_reconnect?: boolean
          reconnect_notified_at?: string | null
          refresh_token: string
          token_expires_at?: string | null
          user_id: string
        }
        Update: {
          access_token?: string
          channel_id?: string
          channel_title?: string
          created_at?: string
          id?: string
          last_checked_at?: string | null
          needs_reconnect?: boolean
          reconnect_notified_at?: string | null
          refresh_token?: string
          token_expires_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      ytreply_comments: {
        Row: {
          author_display_name: string | null
          comment_text: string
          fetched_at: string
          generated_reply: string | null
          id: string
          posted_reply_id: string | null
          replied_at: string | null
          status: string
          telegram_chat_id: string | null
          telegram_message_id: number | null
          user_id: string
          video_id: string
          youtube_comment_id: string
        }
        Insert: {
          author_display_name?: string | null
          comment_text: string
          fetched_at?: string
          generated_reply?: string | null
          id?: string
          posted_reply_id?: string | null
          replied_at?: string | null
          status?: string
          telegram_chat_id?: string | null
          telegram_message_id?: number | null
          user_id: string
          video_id: string
          youtube_comment_id: string
        }
        Update: {
          author_display_name?: string | null
          comment_text?: string
          fetched_at?: string
          generated_reply?: string | null
          id?: string
          posted_reply_id?: string | null
          replied_at?: string | null
          status?: string
          telegram_chat_id?: string | null
          telegram_message_id?: number | null
          user_id?: string
          video_id?: string
          youtube_comment_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ytreply_comments_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "ytreply_videos"
            referencedColumns: ["id"]
          },
        ]
      }
      ytreply_settings: {
        Row: {
          ai_instructions: string | null
          auto_approve: boolean
          created_at: string
          default_link: string | null
          id: string
          last_run_at: string | null
          monitoring_enabled: boolean
          monitoring_interval_minutes: number
          monitoring_started_at: string | null
          reply_model: string
          tone_preset: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_instructions?: string | null
          auto_approve?: boolean
          created_at?: string
          default_link?: string | null
          id?: string
          last_run_at?: string | null
          monitoring_enabled?: boolean
          monitoring_interval_minutes?: number
          monitoring_started_at?: string | null
          reply_model?: string
          tone_preset?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_instructions?: string | null
          auto_approve?: boolean
          created_at?: string
          default_link?: string | null
          id?: string
          last_run_at?: string | null
          monitoring_enabled?: boolean
          monitoring_interval_minutes?: number
          monitoring_started_at?: string | null
          reply_model?: string
          tone_preset?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ytreply_videos: {
        Row: {
          created_at: string
          custom_link: string | null
          id: string
          is_hidden: boolean
          is_monitored: boolean
          thumbnail_url: string | null
          title: string
          updated_at: string
          user_id: string
          youtube_video_id: string
        }
        Insert: {
          created_at?: string
          custom_link?: string | null
          id?: string
          is_hidden?: boolean
          is_monitored?: boolean
          thumbnail_url?: string | null
          title: string
          updated_at?: string
          user_id: string
          youtube_video_id: string
        }
        Update: {
          created_at?: string
          custom_link?: string | null
          id?: string
          is_hidden?: boolean
          is_monitored?: boolean
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          user_id?: string
          youtube_video_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_delete_user: { Args: { target_id: string }; Returns: undefined }
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
