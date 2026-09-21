// Phase 7–9 additions follow canonical migration SQL; operator-generated types can replace this contract after application.
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: {
          extensions?: Json;
          operationName?: string;
          query?: string;
          variables?: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      platform_billing_settings: {
        Row: {
          bank_account_holder: string;
          bank_account_number: string;
          bank_branch: string;
          bank_enabled: boolean;
          bank_iban: string;
          bank_instructions: Json;
          bank_name: string;
          bank_number: string;
          bit_enabled: boolean;
          bit_instructions: Json;
          bit_phone: string;
          id: boolean;
          payment_due_days: number;
          sender_name: string;
          support_email: string | null;
          updated_at: string;
        };
        Insert: {
          bank_account_holder?: string;
          bank_account_number?: string;
          bank_branch?: string;
          bank_enabled?: boolean;
          bank_iban?: string;
          bank_instructions?: Json;
          bank_name?: string;
          bank_number?: string;
          bit_enabled?: boolean;
          bit_instructions?: Json;
          bit_phone?: string;
          id?: boolean;
          payment_due_days?: number;
          sender_name?: string;
          support_email?: string | null;
          updated_at?: string;
        };
        Update: {
          bank_account_holder?: string;
          bank_account_number?: string;
          bank_branch?: string;
          bank_enabled?: boolean;
          bank_iban?: string;
          bank_instructions?: Json;
          bank_name?: string;
          bank_number?: string;
          bit_enabled?: boolean;
          bit_instructions?: Json;
          bit_phone?: string;
          id?: boolean;
          payment_due_days?: number;
          sender_name?: string;
          support_email?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      customer_agreements: {
        Row: {
          agreed_amount_ils: number;
          application_id: string;
          approved_at: string;
          approved_by: string;
          billing_cycle: string;
          business_name: string;
          catalog_amount_ils: number;
          currency: string;
          customer_email: string;
          customer_name: string;
          id: string;
          locale: string;
          payment_due_at: string;
          payment_reference: string;
          plan_code: string;
          plan_id: string;
          plan_name: Json;
        };
        Insert: {
          agreed_amount_ils: number;
          application_id: string;
          approved_at?: string;
          approved_by: string;
          billing_cycle: string;
          business_name: string;
          catalog_amount_ils: number;
          currency?: string;
          customer_email: string;
          customer_name: string;
          id?: string;
          locale: string;
          payment_due_at: string;
          payment_reference?: string;
          plan_code: string;
          plan_id: string;
          plan_name: Json;
        };
        Update: {
          agreed_amount_ils?: number;
          application_id?: string;
          approved_at?: string;
          approved_by?: string;
          billing_cycle?: string;
          business_name?: string;
          catalog_amount_ils?: number;
          currency?: string;
          customer_email?: string;
          customer_name?: string;
          id?: string;
          locale?: string;
          payment_due_at?: string;
          payment_reference?: string;
          plan_code?: string;
          plan_id?: string;
          plan_name?: Json;
        };
        Relationships: [
          {
            foreignKeyName: "customer_agreements_application_id_fkey";
            columns: ["application_id"];
            isOneToOne: true;
            referencedRelation: "restaurant_applications";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "customer_agreements_plan_id_fkey";
            columns: ["plan_id"];
            isOneToOne: false;
            referencedRelation: "plans";
            referencedColumns: ["id"];
          },
        ];
      };
      manual_customer_payments: {
        Row: {
          accounting_reference: string;
          agreement_id: string;
          confirmed_at: string | null;
          confirmed_by: string | null;
          created_at: string;
          currency: string;
          expected_amount_ils: number;
          external_reference: string;
          id: string;
          internal_note: string;
          method: string | null;
          paid_amount_ils: number | null;
          payment_reference: string;
          period_end: string | null;
          period_start: string | null;
          purpose: string;
          status: string;
        };
        Insert: {
          accounting_reference?: string;
          agreement_id: string;
          confirmed_at?: string | null;
          confirmed_by?: string | null;
          created_at?: string;
          currency?: string;
          expected_amount_ils: number;
          external_reference?: string;
          id?: string;
          internal_note?: string;
          method?: string | null;
          paid_amount_ils?: number | null;
          payment_reference: string;
          period_end?: string | null;
          period_start?: string | null;
          purpose?: string;
          status?: string;
        };
        Update: {
          accounting_reference?: string;
          agreement_id?: string;
          confirmed_at?: string | null;
          confirmed_by?: string | null;
          created_at?: string;
          currency?: string;
          expected_amount_ils?: number;
          external_reference?: string;
          id?: string;
          internal_note?: string;
          method?: string | null;
          paid_amount_ils?: number | null;
          payment_reference?: string;
          period_end?: string | null;
          period_start?: string | null;
          purpose?: string;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: "manual_customer_payments_agreement_id_fkey";
            columns: ["agreement_id"];
            isOneToOne: false;
            referencedRelation: "customer_agreements";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "manual_customer_payments_agreement_id_payment_reference_fkey";
            columns: ["agreement_id", "payment_reference"];
            isOneToOne: false;
            referencedRelation: "customer_agreements";
            referencedColumns: ["id", "payment_reference"];
          },
        ];
      };
      customer_activations: {
        Row: {
          activated_at: string | null;
          agreement_id: string;
          business_id: string | null;
          created_at: string;
          instruction_token_expires_at: string | null;
          instruction_token_hash: string | null;
          invite_attempt_id: string | null;
          invite_attempts: number;
          invite_claimed_at: string | null;
          invite_error_code: string | null;
          invite_sent_at: string | null;
          invite_state: string;
          onboarded_at: string | null;
          updated_at: string;
          user_id: string | null;
        };
        Insert: {
          activated_at?: string | null;
          agreement_id: string;
          business_id?: string | null;
          created_at?: string;
          instruction_token_expires_at?: string | null;
          instruction_token_hash?: string | null;
          invite_attempt_id?: string | null;
          invite_attempts?: number;
          invite_claimed_at?: string | null;
          invite_error_code?: string | null;
          invite_sent_at?: string | null;
          invite_state?: string;
          onboarded_at?: string | null;
          updated_at?: string;
          user_id?: string | null;
        };
        Update: {
          activated_at?: string | null;
          agreement_id?: string;
          business_id?: string | null;
          created_at?: string;
          instruction_token_expires_at?: string | null;
          instruction_token_hash?: string | null;
          invite_attempt_id?: string | null;
          invite_attempts?: number;
          invite_claimed_at?: string | null;
          invite_error_code?: string | null;
          invite_sent_at?: string | null;
          invite_state?: string;
          onboarded_at?: string | null;
          updated_at?: string;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "customer_activations_agreement_id_fkey";
            columns: ["agreement_id"];
            isOneToOne: true;
            referencedRelation: "customer_agreements";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "customer_activations_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: true;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
        ];
      };
      customer_subscriptions: {
        Row: {
          agreed_amount_ils: number;
          agreement_id: string;
          billing_cycle: string;
          business_id: string;
          created_at: string;
          currency: string;
          current_period_end: string | null;
          current_period_start: string | null;
          id: string;
          plan_id: string;
          started_at: string | null;
          status: string;
          updated_at: string;
        };
        Insert: {
          agreed_amount_ils: number;
          agreement_id: string;
          billing_cycle: string;
          business_id: string;
          created_at?: string;
          currency?: string;
          current_period_end?: string | null;
          current_period_start?: string | null;
          id?: string;
          plan_id: string;
          started_at?: string | null;
          status: string;
          updated_at?: string;
        };
        Update: {
          agreed_amount_ils?: number;
          agreement_id?: string;
          billing_cycle?: string;
          business_id?: string;
          created_at?: string;
          currency?: string;
          current_period_end?: string | null;
          current_period_start?: string | null;
          id?: string;
          plan_id?: string;
          started_at?: string | null;
          status?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "customer_subscriptions_agreement_id_fkey";
            columns: ["agreement_id"];
            isOneToOne: true;
            referencedRelation: "customer_agreements";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "customer_subscriptions_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: true;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "customer_subscriptions_plan_id_fkey";
            columns: ["plan_id"];
            isOneToOne: false;
            referencedRelation: "plans";
            referencedColumns: ["id"];
          },
        ];
      };
      customer_mail_outbox: {
        Row: {
          agreement_id: string | null;
          application_id: string;
          attempts: number;
          claim_id: string | null;
          claimed_at: string | null;
          created_at: string;
          deduplication_key: string;
          error_code: string | null;
          id: string;
          kind: string;
          provider_reference: string | null;
          sent_at: string | null;
          state: string;
          updated_at: string;
        };
        Insert: {
          agreement_id?: string | null;
          application_id: string;
          attempts?: number;
          claim_id?: string | null;
          claimed_at?: string | null;
          created_at?: string;
          deduplication_key: string;
          error_code?: string | null;
          id?: string;
          kind: string;
          provider_reference?: string | null;
          sent_at?: string | null;
          state?: string;
          updated_at?: string;
        };
        Update: {
          agreement_id?: string | null;
          application_id?: string;
          attempts?: number;
          claim_id?: string | null;
          claimed_at?: string | null;
          created_at?: string;
          deduplication_key?: string;
          error_code?: string | null;
          id?: string;
          kind?: string;
          provider_reference?: string | null;
          sent_at?: string | null;
          state?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "customer_mail_outbox_agreement_id_fkey";
            columns: ["agreement_id"];
            isOneToOne: false;
            referencedRelation: "customer_agreements";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "customer_mail_outbox_application_id_fkey";
            columns: ["application_id"];
            isOneToOne: false;
            referencedRelation: "restaurant_applications";
            referencedColumns: ["id"];
          },
        ];
      };
      customer_commercial_audit: {
        Row: {
          action: string;
          actor_id: string | null;
          id: number;
          occurred_at: string;
          record_id: string;
          record_table: string;
        };
        Insert: {
          action: string;
          actor_id?: string | null;
          id?: never;
          occurred_at?: string;
          record_id: string;
          record_table: string;
        };
        Update: {
          action?: string;
          actor_id?: string | null;
          id?: never;
          occurred_at?: string;
          record_id?: string;
          record_table?: string;
        };
        Relationships: [];
      };

      restaurant_applications: {
        Row: {
          id: string;
          kind: "application" | "inquiry";
          full_name: string;
          business_name: string;
          email: string;
          phone: string;
          city: string | null;
          business_type: "restaurant" | "cafe" | null;
          branch_count: number | null;
          requested_plan_code: "starter" | "pro" | "business" | null;
          message: string;
          locale: "en" | "ar" | "he";
          status: "pending" | "approved" | "rejected";
          reviewed_by: string | null;
          reviewed_at: string | null;
          internal_note: string;
          customer_safe_message: string;
          created_at: string;
          updated_at: string;
        };
        Insert: never;
        Update: Partial<Database["public"]["Tables"]["restaurant_applications"]["Row"]>;
        Relationships: [];
      };
      restaurant_launch: {
        Row: { business_id: string; is_public: boolean; updated_at: string };
        Insert: { business_id: string; is_public?: boolean };
        Update: { is_public?: boolean };
        Relationships: [];
      };
      business_domains: {
        Row: {
          id: string;
          business_id: string;
          hostname: string;
          verification_token: string;
          verified_until: string | null;
          active: boolean;
          canonical: boolean;
          created_at: string;
        };
        Insert: { business_id: string; hostname: string };
        Update: { active?: boolean };
        Relationships: [];
      };
      public_request_budgets: {
        Row: { key: string; window_start: string; hits: number };
        Insert: { key: string; window_start: string; hits: number };
        Update: { hits?: number };
        Relationships: [];
      };
      business_feature_overrides: {
        Row: {
          business_id: string;
          created_at: string;
          enabled: boolean;
          expires_at: string | null;
          feature_key: string;
          id: string;
          limit_value: number | null;
          reason: string | null;
          updated_at: string;
        };
        Insert: {
          business_id: string;
          created_at?: string;
          enabled: boolean;
          expires_at?: string | null;
          feature_key: string;
          id?: string;
          limit_value?: number | null;
          reason?: string | null;
          updated_at?: string;
        };
        Update: {
          business_id?: string;
          created_at?: string;
          enabled?: boolean;
          expires_at?: string | null;
          feature_key?: string;
          id?: string;
          limit_value?: number | null;
          reason?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "business_feature_overrides_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
        ];
      };
      restaurant_appearance: {
        Row: {
          business_id: string;
          draft: Json;
          published: Json | null;
          revision: number;
          published_at: string | null;
          updated_at: string;
        };
        Insert: {
          business_id: string;
          draft: Json;
          published?: Json | null;
          revision?: number;
          published_at?: string | null;
          updated_at?: string;
        };
        Update: {
          draft?: Json;
          published?: Json | null;
          revision?: number;
          published_at?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      business_settings: {
        Row: {
          whatsapp_number: string | null;
          accent_color: string | null;
          business_id: string;
          cancellation_policy: string | null;
          cover_url: string | null;
          cover_video_url: string | null;
          created_at: string;
          email_public: string | null;
          facebook_url: string | null;
          instagram_url: string | null;
          logo_url: string | null;
          phone_public: string | null;
          primary_color: string | null;
          updated_at: string;
          website_url: string | null;
        };
        Insert: {
          whatsapp_number?: string | null;
          accent_color?: string | null;
          business_id: string;
          cancellation_policy?: string | null;
          cover_url?: string | null;
          cover_video_url?: string | null;
          created_at?: string;
          email_public?: string | null;
          facebook_url?: string | null;
          instagram_url?: string | null;
          logo_url?: string | null;
          phone_public?: string | null;
          primary_color?: string | null;
          updated_at?: string;
          website_url?: string | null;
        };
        Update: {
          whatsapp_number?: string | null;
          accent_color?: string | null;
          business_id?: string;
          cancellation_policy?: string | null;
          cover_url?: string | null;
          cover_video_url?: string | null;
          created_at?: string;
          email_public?: string | null;
          facebook_url?: string | null;
          instagram_url?: string | null;
          logo_url?: string | null;
          phone_public?: string | null;
          primary_color?: string | null;
          updated_at?: string;
          website_url?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "business_settings_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: true;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
        ];
      };
      businesses: {
        Row: {
          business_type: string;
          created_at: string;
          currency: string;
          default_locale: string;
          disabled_at: string | null;
          id: string;
          legal_name: string | null;
          name: Json;
          onboarding_step: number;
          plan_id: string | null;
          slug: string;
          status: string;
          timezone: string;
          updated_at: string;
        };
        Insert: {
          business_type?: string;
          created_at?: string;
          currency?: string;
          default_locale?: string;
          disabled_at?: string | null;
          id?: string;
          legal_name?: string | null;
          name: Json;
          onboarding_step?: number;
          plan_id?: string | null;
          slug: string;
          status?: string;
          timezone?: string;
          updated_at?: string;
        };
        Update: {
          business_type?: string;
          created_at?: string;
          currency?: string;
          default_locale?: string;
          disabled_at?: string | null;
          id?: string;
          legal_name?: string | null;
          name?: Json;
          onboarding_step?: number;
          plan_id?: string | null;
          slug?: string;
          status?: string;
          timezone?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "businesses_plan_id_fkey";
            columns: ["plan_id"];
            isOneToOne: false;
            referencedRelation: "plans";
            referencedColumns: ["id"];
          },
        ];
      };
      content_audit_events: {
        Row: {
          action: string;
          actor_id: string | null;
          business_id: string;
          created_at: string;
          entity_id: string;
          entity_table: string;
          id: number;
        };
        Insert: {
          action: string;
          actor_id?: string | null;
          business_id: string;
          created_at?: string;
          entity_id: string;
          entity_table: string;
          id?: never;
        };
        Update: {
          action?: string;
          actor_id?: string | null;
          business_id?: string;
          created_at?: string;
          entity_id?: string;
          entity_table?: string;
          id?: never;
        };
        Relationships: [
          {
            foreignKeyName: "content_audit_events_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
        ];
      };
      guest_order_limits: {
        Row: {
          attempts: number;
          token_hash: string;
          window_start: string;
        };
        Insert: {
          attempts?: number;
          token_hash: string;
          window_start?: string;
        };
        Update: {
          attempts?: number;
          token_hash?: string;
          window_start?: string;
        };
        Relationships: [];
      };
      item_allergens: {
        Row: {
          business_id: string;
          code: string;
          created_at: string;
          id: string;
          item_id: string;
          sort_order: number;
          updated_at: string;
        };
        Insert: {
          business_id: string;
          code: string;
          created_at?: string;
          id?: string;
          item_id: string;
          sort_order?: number;
          updated_at?: string;
        };
        Update: {
          business_id?: string;
          code?: string;
          created_at?: string;
          id?: string;
          item_id?: string;
          sort_order?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "item_allergens_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "item_allergens_item_id_business_id_fkey";
            columns: ["item_id", "business_id"];
            isOneToOne: false;
            referencedRelation: "menu_items";
            referencedColumns: ["id", "business_id"];
          },
        ];
      };
      item_dietary_tags: {
        Row: {
          business_id: string;
          code: string;
          created_at: string;
          id: string;
          item_id: string;
          sort_order: number;
          updated_at: string;
        };
        Insert: {
          business_id: string;
          code: string;
          created_at?: string;
          id?: string;
          item_id: string;
          sort_order?: number;
          updated_at?: string;
        };
        Update: {
          business_id?: string;
          code?: string;
          created_at?: string;
          id?: string;
          item_id?: string;
          sort_order?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "item_dietary_tags_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "item_dietary_tags_item_id_business_id_fkey";
            columns: ["item_id", "business_id"];
            isOneToOne: false;
            referencedRelation: "menu_items";
            referencedColumns: ["id", "business_id"];
          },
        ];
      };
      item_modifier_groups: {
        Row: {
          business_id: string;
          created_at: string;
          id: string;
          item_id: string;
          modifier_group_id: string;
          sort_order: number;
          updated_at: string;
        };
        Insert: {
          business_id: string;
          created_at?: string;
          id?: string;
          item_id: string;
          modifier_group_id: string;
          sort_order?: number;
          updated_at?: string;
        };
        Update: {
          business_id?: string;
          created_at?: string;
          id?: string;
          item_id?: string;
          modifier_group_id?: string;
          sort_order?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "item_modifier_groups_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "item_modifier_groups_item_id_business_id_fkey";
            columns: ["item_id", "business_id"];
            isOneToOne: false;
            referencedRelation: "menu_items";
            referencedColumns: ["id", "business_id"];
          },
          {
            foreignKeyName: "item_modifier_groups_modifier_group_id_business_id_fkey";
            columns: ["modifier_group_id", "business_id"];
            isOneToOne: false;
            referencedRelation: "modifier_groups";
            referencedColumns: ["id", "business_id"];
          },
        ];
      };
      item_variants: {
        Row: {
          business_id: string;
          created_at: string;
          id: string;
          is_available: boolean;
          item_id: string;
          name_i18n: Json;
          price: number;
          sort_order: number;
          updated_at: string;
        };
        Insert: {
          business_id: string;
          created_at?: string;
          id?: string;
          is_available?: boolean;
          item_id: string;
          name_i18n: Json;
          price: number;
          sort_order?: number;
          updated_at?: string;
        };
        Update: {
          business_id?: string;
          created_at?: string;
          id?: string;
          is_available?: boolean;
          item_id?: string;
          name_i18n?: Json;
          price?: number;
          sort_order?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "item_variants_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "item_variants_item_id_business_id_fkey";
            columns: ["item_id", "business_id"];
            isOneToOne: false;
            referencedRelation: "menu_items";
            referencedColumns: ["id", "business_id"];
          },
        ];
      };
      location_operating_hours: {
        Row: {
          close_time: string;
          created_at: string;
          day_of_week: number;
          id: string;
          is_closed: boolean;
          location_id: string;
          open_time: string;
          updated_at: string;
        };
        Insert: {
          close_time?: string;
          created_at?: string;
          day_of_week: number;
          id?: string;
          is_closed?: boolean;
          location_id: string;
          open_time?: string;
          updated_at?: string;
        };
        Update: {
          close_time?: string;
          created_at?: string;
          day_of_week?: number;
          id?: string;
          is_closed?: boolean;
          location_id?: string;
          open_time?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "location_operating_hours_location_id_fkey";
            columns: ["location_id"];
            isOneToOne: false;
            referencedRelation: "locations";
            referencedColumns: ["id"];
          },
        ];
      };
      locations: {
        Row: {
          whatsapp_number: string | null;
          address_line1: string;
          address_line2: string | null;
          business_id: string;
          city: string;
          country: string;
          created_at: string;
          email: string | null;
          id: string;
          is_primary: boolean;
          latitude: number | null;
          longitude: number | null;
          name: Json;
          phone: string | null;
          postal_code: string | null;
          slug: string;
          state_region: string | null;
          status: string;
          timezone: string | null;
          updated_at: string;
        };
        Insert: {
          whatsapp_number?: string | null;
          address_line1: string;
          address_line2?: string | null;
          business_id: string;
          city: string;
          country?: string;
          created_at?: string;
          email?: string | null;
          id?: string;
          is_primary?: boolean;
          latitude?: number | null;
          longitude?: number | null;
          name: Json;
          phone?: string | null;
          postal_code?: string | null;
          slug: string;
          state_region?: string | null;
          status?: string;
          timezone?: string | null;
          updated_at?: string;
        };
        Update: {
          whatsapp_number?: string | null;
          address_line1?: string;
          address_line2?: string | null;
          business_id?: string;
          city?: string;
          country?: string;
          created_at?: string;
          email?: string | null;
          id?: string;
          is_primary?: boolean;
          latitude?: number | null;
          longitude?: number | null;
          name?: Json;
          phone?: string | null;
          postal_code?: string | null;
          slug?: string;
          state_region?: string | null;
          status?: string;
          timezone?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "locations_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
        ];
      };
      memberships: {
        Row: {
          business_id: string;
          created_at: string;
          id: string;
          role: string;
          status: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          business_id: string;
          created_at?: string;
          id?: string;
          role: string;
          status?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          business_id?: string;
          created_at?: string;
          id?: string;
          role?: string;
          status?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "memberships_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
        ];
      };
      menu_item_location_overrides: {
        Row: {
          business_id: string;
          created_at: string;
          id: string;
          is_available_override: boolean | null;
          is_visible_override: boolean | null;
          item_id: string;
          location_id: string;
          price_override: number | null;
          sort_order: number;
          updated_at: string;
        };
        Insert: {
          business_id: string;
          created_at?: string;
          id?: string;
          is_available_override?: boolean | null;
          is_visible_override?: boolean | null;
          item_id: string;
          location_id: string;
          price_override?: number | null;
          sort_order?: number;
          updated_at?: string;
        };
        Update: {
          business_id?: string;
          created_at?: string;
          id?: string;
          is_available_override?: boolean | null;
          is_visible_override?: boolean | null;
          item_id?: string;
          location_id?: string;
          price_override?: number | null;
          sort_order?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "menu_item_location_overrides_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "menu_item_location_overrides_item_id_business_id_fkey";
            columns: ["item_id", "business_id"];
            isOneToOne: false;
            referencedRelation: "menu_items";
            referencedColumns: ["id", "business_id"];
          },
          {
            foreignKeyName: "menu_item_location_overrides_location_id_business_id_fkey";
            columns: ["location_id", "business_id"];
            isOneToOne: false;
            referencedRelation: "locations";
            referencedColumns: ["id", "business_id"];
          },
        ];
      };
      menu_items: {
        Row: {
          archived_at: string | null;
          base_price: number;
          business_id: string;
          created_at: string;
          currency: string;
          description_i18n: Json;
          id: string;
          image_path: string | null;
          is_available: boolean;
          is_visible: boolean;
          name_i18n: Json;
          section_id: string;
          sku: string | null;
          sort_order: number;
          updated_at: string;
        };
        Insert: {
          archived_at?: string | null;
          base_price?: number;
          business_id: string;
          created_at?: string;
          currency: string;
          description_i18n?: Json;
          id?: string;
          image_path?: string | null;
          is_available?: boolean;
          is_visible?: boolean;
          name_i18n: Json;
          section_id: string;
          sku?: string | null;
          sort_order?: number;
          updated_at?: string;
        };
        Update: {
          archived_at?: string | null;
          base_price?: number;
          business_id?: string;
          created_at?: string;
          currency?: string;
          description_i18n?: Json;
          id?: string;
          image_path?: string | null;
          is_available?: boolean;
          is_visible?: boolean;
          name_i18n?: Json;
          section_id?: string;
          sku?: string | null;
          sort_order?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "menu_items_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "menu_items_section_id_business_id_fkey";
            columns: ["section_id", "business_id"];
            isOneToOne: false;
            referencedRelation: "menu_sections";
            referencedColumns: ["id", "business_id"];
          },
        ];
      };
      menu_locations: {
        Row: {
          business_id: string;
          created_at: string;
          id: string;
          is_enabled: boolean;
          location_id: string;
          menu_id: string;
          sort_order: number;
          updated_at: string;
        };
        Insert: {
          business_id: string;
          created_at?: string;
          id?: string;
          is_enabled?: boolean;
          location_id: string;
          menu_id: string;
          sort_order?: number;
          updated_at?: string;
        };
        Update: {
          business_id?: string;
          created_at?: string;
          id?: string;
          is_enabled?: boolean;
          location_id?: string;
          menu_id?: string;
          sort_order?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "menu_locations_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "menu_locations_location_id_business_id_fkey";
            columns: ["location_id", "business_id"];
            isOneToOne: false;
            referencedRelation: "locations";
            referencedColumns: ["id", "business_id"];
          },
          {
            foreignKeyName: "menu_locations_menu_id_business_id_fkey";
            columns: ["menu_id", "business_id"];
            isOneToOne: false;
            referencedRelation: "menus";
            referencedColumns: ["id", "business_id"];
          },
        ];
      };
      menu_sections: {
        Row: {
          business_id: string;
          created_at: string;
          description_i18n: Json;
          id: string;
          is_visible: boolean;
          menu_id: string;
          name_i18n: Json;
          sort_order: number;
          updated_at: string;
        };
        Insert: {
          business_id: string;
          created_at?: string;
          description_i18n?: Json;
          id?: string;
          is_visible?: boolean;
          menu_id: string;
          name_i18n: Json;
          sort_order?: number;
          updated_at?: string;
        };
        Update: {
          business_id?: string;
          created_at?: string;
          description_i18n?: Json;
          id?: string;
          is_visible?: boolean;
          menu_id?: string;
          name_i18n?: Json;
          sort_order?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "menu_sections_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "menu_sections_menu_id_business_id_fkey";
            columns: ["menu_id", "business_id"];
            isOneToOne: false;
            referencedRelation: "menus";
            referencedColumns: ["id", "business_id"];
          },
        ];
      };
      menus: {
        Row: {
          archived_at: string | null;
          business_id: string;
          created_at: string;
          description_i18n: Json;
          id: string;
          is_default: boolean;
          name_i18n: Json;
          sort_order: number;
          status: string;
          updated_at: string;
        };
        Insert: {
          archived_at?: string | null;
          business_id: string;
          created_at?: string;
          description_i18n?: Json;
          id?: string;
          is_default?: boolean;
          name_i18n: Json;
          sort_order?: number;
          status?: string;
          updated_at?: string;
        };
        Update: {
          archived_at?: string | null;
          business_id?: string;
          created_at?: string;
          description_i18n?: Json;
          id?: string;
          is_default?: boolean;
          name_i18n?: Json;
          sort_order?: number;
          status?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "menus_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
        ];
      };
      modifier_groups: {
        Row: {
          business_id: string;
          created_at: string;
          id: string;
          is_required: boolean;
          max_select: number;
          min_select: number;
          name_i18n: Json;
          sort_order: number;
          updated_at: string;
        };
        Insert: {
          business_id: string;
          created_at?: string;
          id?: string;
          is_required?: boolean;
          max_select?: number;
          min_select?: number;
          name_i18n: Json;
          sort_order?: number;
          updated_at?: string;
        };
        Update: {
          business_id?: string;
          created_at?: string;
          id?: string;
          is_required?: boolean;
          max_select?: number;
          min_select?: number;
          name_i18n?: Json;
          sort_order?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "modifier_groups_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
        ];
      };
      modifiers: {
        Row: {
          business_id: string;
          created_at: string;
          id: string;
          is_available: boolean;
          modifier_group_id: string;
          name_i18n: Json;
          price_delta: number;
          sort_order: number;
          updated_at: string;
        };
        Insert: {
          business_id: string;
          created_at?: string;
          id?: string;
          is_available?: boolean;
          modifier_group_id: string;
          name_i18n: Json;
          price_delta?: number;
          sort_order?: number;
          updated_at?: string;
        };
        Update: {
          business_id?: string;
          created_at?: string;
          id?: string;
          is_available?: boolean;
          modifier_group_id?: string;
          name_i18n?: Json;
          price_delta?: number;
          sort_order?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "modifiers_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "modifiers_modifier_group_id_business_id_fkey";
            columns: ["modifier_group_id", "business_id"];
            isOneToOne: false;
            referencedRelation: "modifier_groups";
            referencedColumns: ["id", "business_id"];
          },
        ];
      };
      onboarding_drafts: {
        Row: {
          created_at: string;
          current_step: number;
          data: Json;
          id: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          current_step?: number;
          data?: Json;
          id?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          current_step?: number;
          data?: Json;
          id?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      order_item_modifiers: {
        Row: {
          business_id: string;
          group_name_i18n: Json;
          id: string;
          modifier_id: string;
          name_i18n: Json;
          order_id: string;
          order_item_id: string;
          price_cents: number;
        };
        Insert: {
          business_id: string;
          group_name_i18n: Json;
          id?: string;
          modifier_id: string;
          name_i18n: Json;
          order_id: string;
          order_item_id: string;
          price_cents: number;
        };
        Update: {
          business_id?: string;
          group_name_i18n?: Json;
          id?: string;
          modifier_id?: string;
          name_i18n?: Json;
          order_id?: string;
          order_item_id?: string;
          price_cents?: number;
        };
        Relationships: [
          {
            foreignKeyName: "order_item_modifiers_order_item_id_order_id_business_id_fkey";
            columns: ["order_item_id", "order_id", "business_id"];
            isOneToOne: false;
            referencedRelation: "order_items";
            referencedColumns: ["id", "order_id", "business_id"];
          },
        ];
      };
      order_items: {
        Row: {
          base_unit_cents: number;
          business_id: string;
          id: string;
          item_id: string;
          line_total_cents: number;
          modifier_unit_cents: number;
          name_i18n: Json;
          order_id: string;
          quantity: number;
          sort_order: number;
          variant_id: string | null;
          variant_name_i18n: Json | null;
        };
        Insert: {
          base_unit_cents: number;
          business_id: string;
          id?: string;
          item_id: string;
          line_total_cents: number;
          modifier_unit_cents: number;
          name_i18n: Json;
          order_id: string;
          quantity: number;
          sort_order: number;
          variant_id?: string | null;
          variant_name_i18n?: Json | null;
        };
        Update: {
          base_unit_cents?: number;
          business_id?: string;
          id?: string;
          item_id?: string;
          line_total_cents?: number;
          modifier_unit_cents?: number;
          name_i18n?: Json;
          order_id?: string;
          quantity?: number;
          sort_order?: number;
          variant_id?: string | null;
          variant_name_i18n?: Json | null;
        };
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_business_id_fkey";
            columns: ["order_id", "business_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id", "business_id"];
          },
        ];
      };
      restaurant_tables: {
        Row: {
          operational_state: string;
          assigned_user_id: string | null;
          id: string;
          business_id: string;
          location_id: string;
          name: string;
          area: string;
          is_active: boolean;
          archived_at: string | null;
          revision: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          operational_state?: string;
          assigned_user_id?: string | null;
          id?: string;
          business_id: string;
          location_id: string;
          name: string;
          area?: string;
          is_active?: boolean;
          archived_at?: string | null;
          revision?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          operational_state?: string;
          assigned_user_id?: string | null;
          id?: string;
          business_id?: string;
          location_id?: string;
          name?: string;
          area?: string;
          is_active?: boolean;
          archived_at?: string | null;
          revision?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      table_qr_tokens: {
        Row: {
          table_id: string;
          business_id: string;
          location_id: string;
          token: string;
          created_at: string;
        };
        Insert: {
          table_id: string;
          business_id: string;
          location_id: string;
          token: string;
          created_at?: string;
        };
        Update: {
          table_id?: string;
          business_id?: string;
          location_id?: string;
          token?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      kitchen_stations: {
        Row: {
          id: string;
          business_id: string;
          location_id: string;
          name: string;
          is_active: boolean;
          revision: number;
        };
        Insert: {
          id?: string;
          business_id: string;
          location_id: string;
          name: string;
          is_active?: boolean;
          revision?: number;
        };
        Update: Partial<{
          id: string;
          business_id: string;
          location_id: string;
          name: string;
          is_active: boolean;
          revision: number;
        }>;
        Relationships: [];
      };
      station_routes: {
        Row: {
          id: string;
          business_id: string;
          location_id: string;
          station_id: string;
          item_id: string | null;
          section_id: string | null;
        };
        Insert: {
          id?: string;
          business_id: string;
          location_id: string;
          station_id: string;
          item_id?: string | null;
          section_id?: string | null;
        };
        Update: Partial<{
          id: string;
          business_id: string;
          location_id: string;
          station_id: string;
          item_id: string | null;
          section_id: string | null;
        }>;
        Relationships: [];
      };
      branch_staff: {
        Row: { business_id: string; location_id: string; user_id: string };
        Insert: { business_id: string; location_id: string; user_id: string };
        Update: Partial<{ business_id: string; location_id: string; user_id: string }>;
        Relationships: [];
      };
      order_item_tasks: {
        Row: {
          id: string;
          business_id: string;
          location_id: string;
          order_id: string;
          order_item_id: string;
          station_id: string | null;
          station_name: string | null;
          state: string;
          revision: number;
          started_at: string | null;
          ready_at: string | null;
        };
        Insert: {
          id?: string;
          business_id: string;
          location_id: string;
          order_id: string;
          order_item_id: string;
          station_id?: string | null;
          station_name?: string | null;
          state?: string;
          revision?: number;
          started_at?: string | null;
          ready_at?: string | null;
        };
        Update: Partial<{
          id: string;
          business_id: string;
          location_id: string;
          order_id: string;
          order_item_id: string;
          station_id: string | null;
          station_name: string | null;
          state: string;
          revision: number;
          started_at: string | null;
          ready_at: string | null;
        }>;
        Relationships: [];
      };
      operation_preferences: {
        Row: {
          business_id: string;
          location_id: string;
          user_id: string;
          new_orders: boolean;
          ready_orders: boolean;
        };
        Insert: {
          business_id: string;
          location_id: string;
          user_id: string;
          new_orders?: boolean;
          ready_orders?: boolean;
        };
        Update: Partial<{
          business_id: string;
          location_id: string;
          user_id: string;
          new_orders: boolean;
          ready_orders: boolean;
        }>;
        Relationships: [];
      };
      restaurant_operation_history: {
        Row: {
          id: string;
          business_id: string;
          location_id: string;
          actor_id: string | null;
          action: string;
          target_id: string | null;
          payload: Json;
          created_at: string;
        };
        Insert: {
          id: string;
          business_id: string;
          location_id: string;
          actor_id?: string | null;
          action: string;
          target_id?: string | null;
          payload: Json;
          created_at?: string;
        };
        Update: Partial<{
          id: string;
          business_id: string;
          location_id: string;
          actor_id: string | null;
          action: string;
          target_id: string | null;
          payload: Json;
          created_at: string;
        }>;
        Relationships: [];
      };
      printer_events: {
        Row: {
          id: string;
          business_id: string;
          location_id: string;
          order_id: string;
          kind: string;
          version: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          location_id: string;
          order_id: string;
          kind: string;
          version?: number;
          created_at?: string;
        };
        Update: Partial<{
          id: string;
          business_id: string;
          location_id: string;
          order_id: string;
          kind: string;
          version: number;
          created_at: string;
        }>;
        Relationships: [];
      };
      kitchen_signals: {
        Row: {
          location_id: string;
          business_id: string;
          revision: number;
          submitted_count: number;
          ready_count: number;
          updated_at: string;
        };
        Insert: {
          location_id: string;
          business_id: string;
          revision?: number;
          submitted_count?: number;
          ready_count?: number;
          updated_at?: string;
        };
        Update: {
          location_id?: string;
          business_id?: string;
          revision?: number;
          submitted_count?: number;
          ready_count?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      order_operations: {
        Row: {
          id: string;
          business_id: string;
          location_id: string;
          order_id: string;
          actor_id: string;
          expected_revision: number;
          target_status: string;
          reason: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          business_id: string;
          location_id: string;
          order_id: string;
          actor_id: string;
          expected_revision: number;
          target_status: string;
          reason?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          location_id?: string;
          order_id?: string;
          actor_id?: string;
          expected_revision?: number;
          target_status?: string;
          reason?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      orders: {
        Row: {
          is_rush: boolean;
          assigned_user_id: string | null;
          accepted_at: string | null;
          prep_started_at: string | null;
          ready_at: string | null;
          completed_at: string | null;
          cancellation_reason: string | null;
          table_id: string | null;
          table_name: string | null;
          table_area: string | null;
          business_id: string;
          cart: Json;
          created_at: string;
          created_by: string | null;
          currency: string;
          customer_name: string;
          customer_phone: string;
          fulfillment_mode: string;
          guest_token_hash: string | null;
          id: string;
          location_id: string;
          revision: number;
          status: string;
          submitted_at: string | null;
          subtotal_cents: number;
          updated_at: string;
        };
        Insert: {
          is_rush?: boolean;
          assigned_user_id?: string | null;
          accepted_at?: string | null;
          prep_started_at?: string | null;
          ready_at?: string | null;
          completed_at?: string | null;
          cancellation_reason?: string | null;
          table_id?: string | null;
          table_name?: string | null;
          table_area?: string | null;
          business_id: string;
          cart: Json;
          created_at?: string;
          created_by?: string | null;
          currency: string;
          customer_name: string;
          customer_phone?: string;
          fulfillment_mode: string;
          guest_token_hash?: string | null;
          id: string;
          location_id: string;
          revision?: number;
          status?: string;
          submitted_at?: string | null;
          subtotal_cents: number;
          updated_at?: string;
        };
        Update: {
          is_rush?: boolean;
          assigned_user_id?: string | null;
          accepted_at?: string | null;
          prep_started_at?: string | null;
          ready_at?: string | null;
          completed_at?: string | null;
          cancellation_reason?: string | null;
          table_id?: string | null;
          table_name?: string | null;
          table_area?: string | null;
          business_id?: string;
          cart?: Json;
          created_at?: string;
          created_by?: string | null;
          currency?: string;
          customer_name?: string;
          customer_phone?: string;
          fulfillment_mode?: string;
          guest_token_hash?: string | null;
          id?: string;
          location_id?: string;
          revision?: number;
          status?: string;
          submitted_at?: string | null;
          subtotal_cents?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "orders_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "orders_location_id_business_id_fkey";
            columns: ["location_id", "business_id"];
            isOneToOne: false;
            referencedRelation: "locations";
            referencedColumns: ["id", "business_id"];
          },
        ];
      };
      payment_events: {
        Row: {
          created_at: string;
          event_id: string;
          outcome: string;
          payload_hash: string;
          payment_id: string;
          provider: string;
          status: string;
        };
        Insert: {
          created_at?: string;
          event_id: string;
          outcome: string;
          payload_hash: string;
          payment_id: string;
          provider: string;
          status: string;
        };
        Update: {
          created_at?: string;
          event_id?: string;
          outcome?: string;
          payload_hash?: string;
          payment_id?: string;
          provider?: string;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: "payment_events_payment_id_fkey";
            columns: ["payment_id"];
            isOneToOne: false;
            referencedRelation: "payments";
            referencedColumns: ["id"];
          },
        ];
      };
      payments: {
        Row: {
          amount_cents: number;
          business_id: string;
          created_at: string;
          currency: string;
          id: string;
          method: string;
          order_id: string;
          provider: string;
          provider_reference: string | null;
          recorded_at: string | null;
          recorded_by: string | null;
          reference: string;
          revision: number;
          status: string;
          updated_at: string;
        };
        Insert: {
          amount_cents: number;
          business_id: string;
          created_at?: string;
          currency: string;
          id?: string;
          method: string;
          order_id: string;
          provider: string;
          provider_reference?: string | null;
          recorded_at?: string | null;
          recorded_by?: string | null;
          reference?: string;
          revision?: number;
          status?: string;
          updated_at?: string;
        };
        Update: {
          amount_cents?: number;
          business_id?: string;
          created_at?: string;
          currency?: string;
          id?: string;
          method?: string;
          order_id?: string;
          provider?: string;
          provider_reference?: string | null;
          recorded_at?: string | null;
          recorded_by?: string | null;
          reference?: string;
          revision?: number;
          status?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "payments_order_id_business_id_fkey";
            columns: ["order_id", "business_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id", "business_id"];
          },
        ];
      };
      plan_entitlements: {
        Row: {
          created_at: string;
          enabled: boolean;
          feature_key: string;
          id: string;
          limit_value: number | null;
          plan_id: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          enabled?: boolean;
          feature_key: string;
          id?: string;
          limit_value?: number | null;
          plan_id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          enabled?: boolean;
          feature_key?: string;
          id?: string;
          limit_value?: number | null;
          plan_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "plan_entitlements_plan_id_fkey";
            columns: ["plan_id"];
            isOneToOne: false;
            referencedRelation: "plans";
            referencedColumns: ["id"];
          },
        ];
      };
      plans: {
        Row: {
          monthly_price_ils: number | null;
          yearly_price_ils: number | null;
          price_is_starting: boolean;
          display_order: number;
          public_features: Json;
          billing_note: Json;

          code: string;
          created_at: string;
          description: Json | null;
          id: string;
          is_active: boolean;
          name: Json;
          updated_at: string;
        };
        Insert: {
          monthly_price_ils?: number | null;
          yearly_price_ils?: number | null;
          price_is_starting?: boolean;
          display_order?: number;
          public_features?: Json;
          billing_note?: Json;

          code: string;
          created_at?: string;
          description?: Json | null;
          id?: string;
          is_active?: boolean;
          name: Json;
          updated_at?: string;
        };
        Update: {
          monthly_price_ils?: number | null;
          yearly_price_ils?: number | null;
          price_is_starting?: boolean;
          display_order?: number;
          public_features?: Json;
          billing_note?: Json;

          code?: string;
          created_at?: string;
          description?: Json | null;
          id?: string;
          is_active?: boolean;
          name?: Json;
          updated_at?: string;
        };
        Relationships: [];
      };
      platform_admins: {
        Row: {
          created_at: string;
          created_by: string | null;
          id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          created_at: string;
          full_name: string;
          id: string;
          phone: string | null;
          preferred_locale: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          full_name: string;
          id: string;
          phone?: string | null;
          preferred_locale?: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          full_name?: string;
          id?: string;
          phone?: string | null;
          preferred_locale?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      approve_customer_application: {
        Args: {
          p_amount?: number;
          p_application: string;
          p_confirm_starting?: boolean;
          p_cycle: string;
          p_plan: string;
        };
        Returns: string;
      };
      confirm_customer_payment: {
        Args: {
          p_amount: number;
          p_external_reference?: string;
          p_method: string;
          p_note?: string;
          p_payment: string;
        };
        Returns: undefined;
      };

      public_commercial_plans: { Args: Record<string, never>; Returns: Json };
      submit_restaurant_application: { Args: { p_input: Json }; Returns: undefined };
      review_restaurant_application: {
        Args: { p_id: string; p_status: string; p_internal_note: string; p_plan: string | null };
        Returns: undefined;
      };

      save_restaurant_appearance: {
        Args: { p_business_id: string; p_revision: number; p_settings: Json; p_publish: boolean };
        Returns: number;
      };
      manage_restaurant_table: {
        Args: {
          p_business_id: string;
          p_location_id: string;
          p_id: string;
          p_revision: number;
          p_action: string;
          p_name?: string;
          p_area?: string;
          p_active?: boolean;
        };
        Returns: Database["public"]["Tables"]["restaurant_tables"]["Row"];
      };
      resolve_table_qr: { Args: { p_token: string }; Returns: Json };
      save_table_guest_order: {
        Args: Database["public"]["Functions"]["save_guest_order"]["Args"] & {
          p_table_token: string | null;
        };
        Returns: Database["public"]["Tables"]["orders"]["Row"];
      };
      checkout_table_guest_order: {
        Args: Database["public"]["Functions"]["checkout_guest_order"]["Args"] & {
          p_table_token: string | null;
        };
        Returns: Database["public"]["Tables"]["payments"]["Row"];
      };
      apply_payment_event: {
        Args: {
          p_amount_cents: number;
          p_currency: string;
          p_event_id: string;
          p_id: string;
          p_payload_hash: string;
          p_provider: string;
          p_reference: string;
          p_status: string;
        };
        Returns: {
          amount_cents: number;
          business_id: string;
          created_at: string;
          currency: string;
          id: string;
          method: string;
          order_id: string;
          provider: string;
          provider_reference: string | null;
          recorded_at: string | null;
          recorded_by: string | null;
          reference: string;
          revision: number;
          status: string;
          updated_at: string;
        };
        SetofOptions: {
          from: "*";
          to: "payments";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      attach_payment_reference: {
        Args: { p_id: string; p_provider: string; p_reference: string };
        Returns: undefined;
      };
      can_access_menu_media: {
        Args: { path: string; writing: boolean };
        Returns: boolean;
      };
      checkout_guest_order: {
        Args: {
          p_business_slug: string;
          p_customer_name: string;
          p_customer_phone: string;
          p_expected_subtotal_cents: number;
          p_fulfillment_mode: string;
          p_guest_token: string;
          p_id: string;
          p_lines: Json;
          p_location_slug: string;
          p_method: string;
          p_provider: string;
          p_revision: number;
        };
        Returns: {
          amount_cents: number;
          business_id: string;
          created_at: string;
          currency: string;
          id: string;
          method: string;
          order_id: string;
          provider: string;
          provider_reference: string | null;
          recorded_at: string | null;
          recorded_by: string | null;
          reference: string;
          revision: number;
          status: string;
          updated_at: string;
        };
        SetofOptions: {
          from: "*";
          to: "payments";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      create_onboarding_business: {
        Args: {
          p_accent_color: string;
          p_branch_address_line1: string;
          p_branch_city: string;
          p_branch_country: string;
          p_branch_email: string;
          p_branch_name: Json;
          p_branch_phone: string;
          p_branch_slug: string;
          p_business_type: string;
          p_currency: string;
          p_default_locale: string;
          p_email_public: string;
          p_facebook_url: string;
          p_hours: Json;
          p_instagram_url: string;
          p_legal_name: string;
          p_name: Json;
          p_phone_public: string;
          p_plan_id: string;
          p_primary_color: string;
          p_slug: string;
          p_timezone: string;
          p_website_url: string;
        };
        Returns: Json;
      };
      get_user_business_role: {
        Args: { target_business_id: string };
        Returns: string;
      };
      has_business_role: {
        Args: { required_roles: string[]; target_business_id: string };
        Returns: boolean;
      };
      is_platform_admin: { Args: { target_user_id?: string }; Returns: boolean };
      public_order_menu: {
        Args: { p_business_slug: string; p_location_slug: string };
        Returns: Json;
      };
      record_restaurant_payment: {
        Args: { p_business_id: string; p_id: string; p_revision: number };
        Returns: undefined;
      };
      save_guest_order: {
        Args: {
          p_business_slug: string;
          p_customer_name: string;
          p_customer_phone: string;
          p_expected_subtotal_cents: number;
          p_fulfillment_mode: string;
          p_guest_token: string;
          p_id: string;
          p_lines: Json;
          p_location_slug: string;
          p_revision: number;
          p_submit: boolean;
        };
        Returns: {
          business_id: string;
          cart: Json;
          created_at: string;
          created_by: string | null;
          currency: string;
          customer_name: string;
          customer_phone: string;
          fulfillment_mode: string;
          guest_token_hash: string | null;
          id: string;
          location_id: string;
          revision: number;
          status: string;
          submitted_at: string | null;
          subtotal_cents: number;
          updated_at: string;
        };
        SetofOptions: {
          from: "*";
          to: "orders";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      save_menu_content: {
        Args: { p_business_id: string; p_operations: Json };
        Returns: undefined;
      };
      save_order: {
        Args: {
          p_business_id: string;
          p_customer_name: string;
          p_customer_phone: string;
          p_expected_subtotal_cents: number;
          p_fulfillment_mode: string;
          p_id: string;
          p_lines: Json;
          p_location_id: string;
          p_revision: number;
          p_submit: boolean;
        };
        Returns: {
          business_id: string;
          cart: Json;
          created_at: string;
          created_by: string | null;
          currency: string;
          customer_name: string;
          customer_phone: string;
          fulfillment_mode: string;
          guest_token_hash: string | null;
          id: string;
          location_id: string;
          revision: number;
          status: string;
          submitted_at: string | null;
          subtotal_cents: number;
          updated_at: string;
        };
        SetofOptions: {
          from: "*";
          to: "orders";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      save_order_core: {
        Args: {
          p_business_id: string;
          p_customer_name: string;
          p_customer_phone: string;
          p_expected_subtotal_cents: number;
          p_fulfillment_mode: string;
          p_guest_token: string;
          p_id: string;
          p_lines: Json;
          p_location_id: string;
          p_revision: number;
          p_submit: boolean;
        };
        Returns: {
          business_id: string;
          cart: Json;
          created_at: string;
          created_by: string | null;
          currency: string;
          customer_name: string;
          customer_phone: string;
          fulfillment_mode: string;
          guest_token_hash: string | null;
          id: string;
          location_id: string;
          revision: number;
          status: string;
          submitted_at: string | null;
          subtotal_cents: number;
          updated_at: string;
        };
        SetofOptions: {
          from: "*";
          to: "orders";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      set_menu_item_availability: {
        Args: { p_available: boolean; p_item_id: string };
        Returns: undefined;
      };
      restaurant_orders: {
        Args: {
          p_business_id: string;
          p_location_id: string;
          p_status?: string;
          p_offset?: number;
          p_station?: string;
          p_unassigned?: boolean;
          p_mine?: boolean;
        };
        Returns: Json;
      };
      restaurant_operations_context: {
        Args: { p_business_id: string; p_location_id: string; p_history_offset?: number };
        Returns: Json;
      };
      restaurant_operation: {
        Args: {
          p_action_id: string;
          p_business_id: string;
          p_location_id: string;
          p_action: string;
          p_payload: Json;
        };
        Returns: undefined;
      };
      set_restaurant_launch: {
        Args: { p_business_id: string; p_public: boolean };
        Returns: undefined;
      };
      manage_business_domain: {
        Args: { p_business_id: string; p_hostname: string; p_action: string };
        Returns: string;
      };
      verify_business_domain: { Args: { p_id: string; p_token: string }; Returns: boolean };
      resolve_restaurant_host: { Args: { p_hostname: string }; Returns: string | null };
      consume_public_budget: { Args: { p_key: string }; Returns: boolean };
      restaurant_sitemap: { Args: { p_slug?: string; p_offset?: number }; Returns: Json };
      restaurant_analytics: {
        Args: { p_business_id: string; p_from: string; p_to: string; p_location_id?: string };
        Returns: Json;
      };
      kitchen_orders: {
        Args: {
          p_business_id: string;
          p_location_id: string;
          p_status?: string;
          p_offset?: number;
        };
        Returns: Json;
      };
      operate_kitchen_order: {
        Args: {
          p_action_id: string;
          p_business_id: string;
          p_location_id: string;
          p_order_id: string;
          p_revision: number;
          p_status: string;
          p_reason?: string;
        };
        Returns: undefined;
      };
      transition_order: {
        Args: {
          p_business_id: string;
          p_id: string;
          p_revision: number;
          p_status: string;
        };
        Returns: {
          business_id: string;
          cart: Json;
          created_at: string;
          created_by: string | null;
          currency: string;
          customer_name: string;
          customer_phone: string;
          fulfillment_mode: string;
          guest_token_hash: string | null;
          id: string;
          location_id: string;
          revision: number;
          status: string;
          submitted_at: string | null;
          subtotal_cents: number;
          updated_at: string;
        };
        SetofOptions: {
          from: "*";
          to: "orders";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      user_belongs_to_business: {
        Args: { target_business_id: string };
        Returns: boolean;
      };
      valid_content_name: { Args: { value: Json }; Returns: boolean };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const;
