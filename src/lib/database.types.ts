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
      abuse_events: {
        Row: {
          action: string | null
          created_at: string
          detail: Json
          id: number
          ip_hash: string
          kind: Database["public"]["Enums"]["abuse_kind"]
          path: string | null
          resolved_at: string | null
          resolved_by: string | null
          severity: number
        }
        Insert: {
          action?: string | null
          created_at?: string
          detail?: Json
          id?: never
          ip_hash: string
          kind: Database["public"]["Enums"]["abuse_kind"]
          path?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: number
        }
        Update: {
          action?: string | null
          created_at?: string
          detail?: Json
          id?: never
          ip_hash?: string
          kind?: Database["public"]["Enums"]["abuse_kind"]
          path?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: number
        }
        Relationships: [
          {
            foreignKeyName: "abuse_events_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_notifications: {
        Row: {
          body: string | null
          created_at: string
          housing_id: string | null
          href: string | null
          id: string
          kind: Database["public"]["Enums"]["notif_kind"]
          lead_id: string | null
          read_at: string | null
          read_by: string | null
          severity: number
          title: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          housing_id?: string | null
          href?: string | null
          id?: string
          kind: Database["public"]["Enums"]["notif_kind"]
          lead_id?: string | null
          read_at?: string | null
          read_by?: string | null
          severity?: number
          title: string
        }
        Update: {
          body?: string | null
          created_at?: string
          housing_id?: string | null
          href?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["notif_kind"]
          lead_id?: string | null
          read_at?: string | null
          read_by?: string | null
          severity?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_notifications_housing_id_fkey"
            columns: ["housing_id"]
            isOneToOne: false
            referencedRelation: "housings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_notifications_housing_id_fkey"
            columns: ["housing_id"]
            isOneToOne: false
            referencedRelation: "v_housing_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_notifications_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_notifications_read_by_fkey"
            columns: ["read_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      app_settings: {
        Row: {
          description: string | null
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          description?: string | null
          key: string
          updated_at?: string
          updated_by?: string | null
          value: Json
        }
        Update: {
          description?: string | null
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "app_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: Database["public"]["Enums"]["audit_action"]
          actor_email: string | null
          actor_id: string | null
          created_at: string
          diff: Json | null
          id: number
          record_id: string
          table_name: string
        }
        Insert: {
          action: Database["public"]["Enums"]["audit_action"]
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string
          diff?: Json | null
          id?: never
          record_id: string
          table_name: string
        }
        Update: {
          action?: Database["public"]["Enums"]["audit_action"]
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string
          diff?: Json | null
          id?: never
          record_id?: string
          table_name?: string
        }
        Relationships: []
      }
      blocked_identities: {
        Row: {
          blocked_at: string
          blocked_until: string
          created_by: string | null
          hits: number
          ip_hash: string
          is_manual: boolean
          reason: string
        }
        Insert: {
          blocked_at?: string
          blocked_until: string
          created_by?: string | null
          hits?: number
          ip_hash: string
          is_manual?: boolean
          reason: string
        }
        Update: {
          blocked_at?: string
          blocked_until?: string
          created_by?: string | null
          hits?: number
          ip_hash?: string
          is_manual?: boolean
          reason?: string
        }
        Relationships: [
          {
            foreignKeyName: "blocked_identities_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      developers: {
        Row: {
          address: string | null
          contact_person: string | null
          created_at: string
          email: string | null
          id: string
          is_active: boolean
          logo_path: string | null
          name: string
          phone: string | null
          slug: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          contact_person?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          logo_path?: string | null
          name: string
          phone?: string | null
          slug: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          contact_person?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          logo_path?: string | null
          name?: string
          phone?: string | null
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      housing_contacts: {
        Row: {
          created_at: string
          email: string | null
          housing_id: string
          id: string
          is_primary: boolean
          name: string
          phone: string | null
          role_label: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          housing_id: string
          id?: string
          is_primary?: boolean
          name: string
          phone?: string | null
          role_label?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          housing_id?: string
          id?: string
          is_primary?: boolean
          name?: string
          phone?: string | null
          role_label?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "housing_contacts_housing_id_fkey"
            columns: ["housing_id"]
            isOneToOne: false
            referencedRelation: "housings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "housing_contacts_housing_id_fkey"
            columns: ["housing_id"]
            isOneToOne: false
            referencedRelation: "v_housing_public"
            referencedColumns: ["id"]
          },
        ]
      }
      housing_events: {
        Row: {
          created_at: string
          housing_id: string | null
          id: number
          kind: Database["public"]["Enums"]["event_type"]
          referrer: string | null
          session_hash: string | null
        }
        Insert: {
          created_at?: string
          housing_id?: string | null
          id?: never
          kind: Database["public"]["Enums"]["event_type"]
          referrer?: string | null
          session_hash?: string | null
        }
        Update: {
          created_at?: string
          housing_id?: string | null
          id?: never
          kind?: Database["public"]["Enums"]["event_type"]
          referrer?: string | null
          session_hash?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "housing_events_housing_id_fkey"
            columns: ["housing_id"]
            isOneToOne: false
            referencedRelation: "housings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "housing_events_housing_id_fkey"
            columns: ["housing_id"]
            isOneToOne: false
            referencedRelation: "v_housing_public"
            referencedColumns: ["id"]
          },
        ]
      }
      housing_field_history: {
        Row: {
          actor_id: string | null
          created_at: string
          field: string
          housing_id: string
          id: number
          nilai_baru: string | null
          nilai_lama: string | null
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          field: string
          housing_id: string
          id?: never
          nilai_baru?: string | null
          nilai_lama?: string | null
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          field?: string
          housing_id?: string
          id?: never
          nilai_baru?: string | null
          nilai_lama?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "housing_field_history_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "housing_field_history_housing_id_fkey"
            columns: ["housing_id"]
            isOneToOne: false
            referencedRelation: "housings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "housing_field_history_housing_id_fkey"
            columns: ["housing_id"]
            isOneToOne: false
            referencedRelation: "v_housing_public"
            referencedColumns: ["id"]
          },
        ]
      }
      housing_images: {
        Row: {
          alt: string
          blur_data_url: string | null
          bytes: number | null
          created_at: string
          height: number | null
          housing_id: string
          id: string
          is_cover: boolean
          sort_order: number
          storage_path: string
          width: number | null
        }
        Insert: {
          alt?: string
          blur_data_url?: string | null
          bytes?: number | null
          created_at?: string
          height?: number | null
          housing_id: string
          id?: string
          is_cover?: boolean
          sort_order?: number
          storage_path: string
          width?: number | null
        }
        Update: {
          alt?: string
          blur_data_url?: string | null
          bytes?: number | null
          created_at?: string
          height?: number | null
          housing_id?: string
          id?: string
          is_cover?: boolean
          sort_order?: number
          storage_path?: string
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "housing_images_housing_id_fkey"
            columns: ["housing_id"]
            isOneToOne: false
            referencedRelation: "housings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "housing_images_housing_id_fkey"
            columns: ["housing_id"]
            isOneToOne: false
            referencedRelation: "v_housing_public"
            referencedColumns: ["id"]
          },
        ]
      }
      housing_verifications: {
        Row: {
          checked: Database["public"]["Enums"]["verification_field"][]
          created_at: string
          housing_id: string
          id: string
          next_review_at: string | null
          note: string | null
          snapshot: Json
          verified_by: string | null
          verified_email: string | null
        }
        Insert: {
          checked?: Database["public"]["Enums"]["verification_field"][]
          created_at?: string
          housing_id: string
          id?: string
          next_review_at?: string | null
          note?: string | null
          snapshot?: Json
          verified_by?: string | null
          verified_email?: string | null
        }
        Update: {
          checked?: Database["public"]["Enums"]["verification_field"][]
          created_at?: string
          housing_id?: string
          id?: string
          next_review_at?: string | null
          note?: string | null
          snapshot?: Json
          verified_by?: string | null
          verified_email?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "housing_verifications_housing_id_fkey"
            columns: ["housing_id"]
            isOneToOne: false
            referencedRelation: "housings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "housing_verifications_housing_id_fkey"
            columns: ["housing_id"]
            isOneToOne: false
            referencedRelation: "v_housing_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "housing_verifications_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      housings: {
        Row: {
          address: string
          available_units: number | null
          bathrooms: number | null
          bedrooms: number | null
          building_area: number | null
          commercial_units: number
          created_at: string
          created_by: string | null
          deleted_at: string | null
          developer_id: string | null
          foundation_type: string | null
          geom: unknown
          id: string
          land_area: number | null
          last_data_change_at: string
          lat: number
          legacy_id: number | null
          lng: number
          name: string
          needs_review: boolean
          price_max: number | null
          price_min: number | null
          published_at: string | null
          region_id: string | null
          roof_type: string | null
          search_tsv: unknown
          slug: string
          sold_commercial_units: number
          sold_subsidi_units: number
          status: Database["public"]["Enums"]["housing_status"]
          subsidi_units: number
          total_units: number | null
          updated_at: string
          updated_by: string | null
          verification_due_at: string | null
          verification_note: string | null
          verification_status: Database["public"]["Enums"]["verification_status"]
          verified_at: string | null
          verified_by: string | null
          wall_type: string | null
        }
        Insert: {
          address?: string
          available_units?: number | null
          bathrooms?: number | null
          bedrooms?: number | null
          building_area?: number | null
          commercial_units?: number
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          developer_id?: string | null
          foundation_type?: string | null
          geom?: unknown
          id?: string
          land_area?: number | null
          last_data_change_at?: string
          lat: number
          legacy_id?: number | null
          lng: number
          name: string
          needs_review?: boolean
          price_max?: number | null
          price_min?: number | null
          published_at?: string | null
          region_id?: string | null
          roof_type?: string | null
          search_tsv?: unknown
          slug: string
          sold_commercial_units?: number
          sold_subsidi_units?: number
          status?: Database["public"]["Enums"]["housing_status"]
          subsidi_units?: number
          total_units?: number | null
          updated_at?: string
          updated_by?: string | null
          verification_due_at?: string | null
          verification_note?: string | null
          verification_status?: Database["public"]["Enums"]["verification_status"]
          verified_at?: string | null
          verified_by?: string | null
          wall_type?: string | null
        }
        Update: {
          address?: string
          available_units?: number | null
          bathrooms?: number | null
          bedrooms?: number | null
          building_area?: number | null
          commercial_units?: number
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          developer_id?: string | null
          foundation_type?: string | null
          geom?: unknown
          id?: string
          land_area?: number | null
          last_data_change_at?: string
          lat?: number
          legacy_id?: number | null
          lng?: number
          name?: string
          needs_review?: boolean
          price_max?: number | null
          price_min?: number | null
          published_at?: string | null
          region_id?: string | null
          roof_type?: string | null
          search_tsv?: unknown
          slug?: string
          sold_commercial_units?: number
          sold_subsidi_units?: number
          status?: Database["public"]["Enums"]["housing_status"]
          subsidi_units?: number
          total_units?: number | null
          updated_at?: string
          updated_by?: string | null
          verification_due_at?: string | null
          verification_note?: string | null
          verification_status?: Database["public"]["Enums"]["verification_status"]
          verified_at?: string | null
          verified_by?: string | null
          wall_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "housings_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "housings_developer_id_fkey"
            columns: ["developer_id"]
            isOneToOne: false
            referencedRelation: "developers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "housings_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "housings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "housings_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_notes: {
        Row: {
          author_id: string | null
          body: string
          created_at: string
          id: string
          lead_id: string
        }
        Insert: {
          author_id?: string | null
          body: string
          created_at?: string
          id?: string
          lead_id: string
        }
        Update: {
          author_id?: string | null
          body?: string
          created_at?: string
          id?: string
          lead_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_notes_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_notes_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_status_history: {
        Row: {
          actor_id: string | null
          created_at: string
          dari: Database["public"]["Enums"]["lead_status"] | null
          id: number
          ke: Database["public"]["Enums"]["lead_status"]
          lead_id: string
          note: string | null
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          dari?: Database["public"]["Enums"]["lead_status"] | null
          id?: never
          ke: Database["public"]["Enums"]["lead_status"]
          lead_id: string
          note?: string | null
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          dari?: Database["public"]["Enums"]["lead_status"] | null
          id?: never
          ke?: Database["public"]["Enums"]["lead_status"]
          lead_id?: string
          note?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_status_history_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_status_history_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          affordability_band: string | null
          assigned_to: string | null
          closed_at: string | null
          consent_at: string
          consent_version: string
          contacted_at: string | null
          created_at: string
          down_payment: number | null
          email: string | null
          est_monthly_payment: number | null
          first_contact_due_at: string | null
          housing_id: string | null
          id: string
          interest_rate: number | null
          ip_hash: string | null
          is_flagged: boolean
          last_activity_at: string
          lead_kind: Database["public"]["Enums"]["lead_kind"]
          message: string | null
          monthly_commitments?: number | null
          monthly_income?: number | null
          name: string
          phone: string
          price_snapshot: number | null
          purge_after: string
          risk_score: number
          source: string
          source_page: string | null
          status: Database["public"]["Enums"]["lead_status"]
          tenor_years: number | null
          updated_at: string
          user_agent: string | null
        }
        Insert: {
          affordability_band?: string | null
          assigned_to?: string | null
          closed_at?: string | null
          consent_at: string
          consent_version: string
          contacted_at?: string | null
          created_at?: string
          down_payment?: number | null
          email?: string | null
          est_monthly_payment?: number | null
          first_contact_due_at?: string | null
          housing_id?: string | null
          id?: string
          interest_rate?: number | null
          ip_hash?: string | null
          is_flagged?: boolean
          last_activity_at?: string
          lead_kind?: Database["public"]["Enums"]["lead_kind"]
          message?: string | null
          monthly_commitments?: number | null
          monthly_income?: number | null
          name: string
          phone: string
          price_snapshot?: number | null
          purge_after?: string
          risk_score?: number
          source?: string
          source_page?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          tenor_years?: number | null
          updated_at?: string
          user_agent?: string | null
        }
        Update: {
          affordability_band?: string | null
          assigned_to?: string | null
          closed_at?: string | null
          consent_at?: string
          consent_version?: string
          contacted_at?: string | null
          created_at?: string
          down_payment?: number | null
          email?: string | null
          est_monthly_payment?: number | null
          first_contact_due_at?: string | null
          housing_id?: string | null
          id?: string
          interest_rate?: number | null
          ip_hash?: string | null
          is_flagged?: boolean
          last_activity_at?: string
          lead_kind?: Database["public"]["Enums"]["lead_kind"]
          message?: string | null
          monthly_commitments?: number | null
          monthly_income?: number | null
          name?: string
          phone?: string
          price_snapshot?: number | null
          purge_after?: string
          risk_score?: number
          source?: string
          source_page?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          tenor_years?: number | null
          updated_at?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_housing_id_fkey"
            columns: ["housing_id"]
            isOneToOne: false
            referencedRelation: "housings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_housing_id_fkey"
            columns: ["housing_id"]
            isOneToOne: false
            referencedRelation: "v_housing_public"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_outbox: {
        Row: {
          attempts: number
          channel: Database["public"]["Enums"]["notif_channel"]
          created_at: string
          id: string
          last_error: string | null
          next_try_at: string
          payload: Json
          recipient: string
          sent_at: string | null
          status: Database["public"]["Enums"]["notif_status"]
          template: string
        }
        Insert: {
          attempts?: number
          channel: Database["public"]["Enums"]["notif_channel"]
          created_at?: string
          id?: string
          last_error?: string | null
          next_try_at?: string
          payload?: Json
          recipient: string
          sent_at?: string | null
          status?: Database["public"]["Enums"]["notif_status"]
          template: string
        }
        Update: {
          attempts?: number
          channel?: Database["public"]["Enums"]["notif_channel"]
          created_at?: string
          id?: string
          last_error?: string | null
          next_try_at?: string
          payload?: Json
          recipient?: string
          sent_at?: string | null
          status?: Database["public"]["Enums"]["notif_status"]
          template?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          developer_id: string | null
          full_name: string
          id: string
          is_active: boolean
          last_seen_at: string | null
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          developer_id?: string | null
          full_name?: string
          id: string
          is_active?: boolean
          last_seen_at?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          developer_id?: string | null
          full_name?: string
          id?: string
          is_active?: boolean
          last_seen_at?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_developer_fk"
            columns: ["developer_id"]
            isOneToOne: false
            referencedRelation: "developers"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_limit_buckets: {
        Row: {
          action: string
          bucket_key: string
          hits: number
          window_start: string
        }
        Insert: {
          action: string
          bucket_key: string
          hits?: number
          window_start: string
        }
        Update: {
          action?: string
          bucket_key?: string
          hits?: number
          window_start?: string
        }
        Relationships: []
      }
      regions: {
        Row: {
          city: string
          created_at: string
          district: string
          id: string
          province: string
          village: string | null
        }
        Insert: {
          city?: string
          created_at?: string
          district: string
          id?: string
          province?: string
          village?: string | null
        }
        Update: {
          city?: string
          created_at?: string
          district?: string
          id?: string
          province?: string
          village?: string | null
        }
        Relationships: []
      }
      security_alerts: {
        Row: {
          action: string
          created_at: string
          id: number
          identities: number
          requests: number
          resolved_at: string | null
          resolved_by: string | null
          suspicious: number
        }
        Insert: {
          action: string
          created_at?: string
          id?: never
          identities: number
          requests: number
          resolved_at?: string | null
          resolved_by?: string | null
          suspicious?: number
        }
        Update: {
          action?: string
          created_at?: string
          id?: never
          identities?: number
          requests?: number
          resolved_at?: string | null
          resolved_by?: string | null
          suspicious?: number
        }
        Relationships: [
          {
            foreignKeyName: "security_alerts_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      v_housing_public: {
        Row: {
          address: string | null
          availability_percent: number | null
          available_units: number | null
          bathrooms: number | null
          bedrooms: number | null
          building_area: number | null
          commercial_units: number | null
          contact: Json | null
          cover_path: string | null
          developer_name: string | null
          district: string | null
          field_checks: Json | null
          foundation_type: string | null
          id: string | null
          images: Json | null
          land_area: number | null
          last_data_change_at: string | null
          lat: number | null
          legacy_id: number | null
          lng: number | null
          name: string | null
          needs_review: boolean | null
          price_max: number | null
          price_min: number | null
          published_at: string | null
          roof_type: string | null
          slug: string | null
          sold_commercial_units: number | null
          sold_subsidi_units: number | null
          subsidi_units: number | null
          total_units: number | null
          verification_due_at: string | null
          verification_status:
            | Database["public"]["Enums"]["verification_status"]
            | null
          verified_at: string | null
          verified_fields: string[] | null
          village: string | null
          wall_type: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      detect_traffic_spike: { Args: never; Returns: number }
      expire_verifications: { Args: never; Returns: number }
      guard_request: {
        Args: {
          p_action: string
          p_ip_hash: string
          p_path?: string
          p_signals?: Json
        }
        Returns: Json
      }
      housing_field_checks: {
        Args: { p_housing_id: string }
        Returns: {
          changed_since: boolean
          checked_by: string
          field: string
          last_checked_at: string
        }[]
      }
      is_admin: { Args: never; Returns: boolean }
      jwt_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      lead_metrics: {
        Args: never
        Returns: {
          baru: number
          belum_ditugaskan: number
          minggu_ini: number
          pengajuan: number
          perlu_tindak: number
          terkualifikasi: number
          terlambat: number
          total: number
        }[]
      }
      lead_sla_hours: { Args: never; Returns: number }
      lead_status_final: {
        Args: { s: Database["public"]["Enums"]["lead_status"] }
        Returns: boolean
      }
      mark_needs_update: {
        Args: { p_housing_id: string; p_note?: string }
        Returns: string
      }
      my_developer_id: { Args: never; Returns: string }
      nearest_housings: {
        Args: {
          p_lat: number
          p_limit?: number
          p_lng: number
          p_max_km?: number
        }
        Returns: {
          address: string
          available_units: number
          distance_m: number
          id: string
          lat: number
          lng: number
          name: string
          price_min: number
          slug: string
        }[]
      }
      normalize_phone_id: { Args: { p: string }; Returns: string }
      purge_expired_leads: { Args: never; Returns: number }
      purge_security_data: { Args: never; Returns: number }
      rate_limit_hit: {
        Args: { p_action: string; p_key: string; p_window: number }
        Returns: number
      }
      record_auth_fail: { Args: { p_ip_hash: string }; Returns: Json }
      record_challenge: {
        Args: { p_action?: string; p_ip_hash: string; p_lolos: boolean }
        Returns: undefined
      }
      resolve_abuse_event: {
        Args: { p_id: number; p_selesai?: boolean }
        Returns: undefined
      }
      search_housings: {
        Args: {
          p_district?: string
          p_limit?: number
          p_max_price?: number
          p_min_price?: number
          p_offset?: number
          p_q?: string
        }
        Returns: {
          address: string
          available_units: number
          id: string
          lat: number
          lng: number
          name: string
          price_min: number
          rank: number
          slug: string
        }[]
      }
      security_metrics: {
        Args: never
        Returns: {
          belum_selesai: number
          bot_tertahan: number
          diblokir_aktif: number
          identitas_unik: number
          kuota_terlampaui: number
          lonjakan_terbuka: number
          peristiwa_24j: number
        }[]
      }
      slugify: { Args: { p_text: string }; Returns: string }
      /**
       * SATU-SATUNYA penyimpangan tangan dari keluaran `supabase gen types`:
       * `p_housing_id` ditulis `string | null`, bukan `string`.
       *
       * Pembangkitnya menandai setiap parameter tanpa DEFAULT sebagai wajib
       * dan tidak nullable, padahal fungsinya memang menerima null — ia
       * menjaga `if p_housing_id is not null` dan memberi notifikasi "Tanpa
       * perumahan". Parameter ini tidak bisa diberi DEFAULT di sisi SQL
       * karena mendahului p_name/p_phone yang wajib.
       *
       * Tanpa `| null`, kiriman dari /simulasi tanpa perumahan gagal
       * typecheck. Terapkan ulang setelah setiap regenerasi tipe.
       */
      submit_lead: {
        Args: {
          p_affordability_band?: string
          p_consent_version?: string
          p_down_payment?: number
          p_email?: string
          p_est_monthly_payment?: number
          p_housing_id: string | null
          p_interest_rate?: number
          p_ip_hash?: string
          p_lead_kind?: string
          p_message?: string
          p_monthly_commitments?: number
          p_monthly_income?: number
          p_name: string
          p_phone: string
          p_price_snapshot?: number
          p_risk_score?: number
          p_source_page?: string
          p_tenor_years?: number
          p_user_agent?: string
        }
        Returns: Json
      }
      sweep_notification_outbox: { Args: never; Returns: number }
      try_uuid: { Args: { p: string }; Returns: string }
      verification_metrics: {
        Args: never
        Returns: {
          jatuh_tempo: number
          menunggu: number
          perlu_pembaruan: number
          terbit_belum_verif: number
          terverifikasi: number
        }[]
      }
      verification_queue: {
        Args: { p_limit?: number }
        Returns: {
          developer_id: string
          district: string
          hari_terlambat: number
          id: string
          jumlah_foto: number
          last_data_change_at: string
          name: string
          needs_review: boolean
          price_min: number
          prioritas: number
          punya_kontak: boolean
          slug: string
          status: string
          total_units: number
          verification_due_at: string
          verification_status: string
          verified_at: string
          verified_fields: string[]
          village: string
        }[]
      }
      verify_housing: {
        Args: {
          p_checked: string[]
          p_housing_id: string
          p_note?: string
          p_review_days?: number
        }
        Returns: string
      }
    }
    Enums: {
      abuse_kind:
        | "rate_limit"
        | "honeypot"
        | "too_fast"
        | "stale_form"
        | "challenge_failed"
        | "challenge_passed"
        | "blocked"
        | "invalid_payload"
        | "auth_fail"
        | "scrape_suspect"
        | "duplicate_lead"
      audit_action: "INSERT" | "UPDATE" | "DELETE"
      event_type: "view_detail" | "click_kontak" | "click_peta" | "submit_lead"
      housing_status: "draft" | "published" | "archived"
      lead_kind:
        | "form_minat"
        | "kalkulator"
        | "ajukan_kpr"
        | "minta_info"
        | "whatsapp"
      lead_status:
        | "baru"
        | "dihubungi"
        | "terkualifikasi"
        | "tindak_lanjut"
        | "pengajuan"
        | "disetujui"
        | "ditolak"
        | "ditutup"
      notif_channel: "email" | "whatsapp"
      notif_kind: "prospek_baru" | "verifikasi" | "keamanan" | "sistem"
      notif_status: "pending" | "sent" | "failed" | "dead"
      user_role: "admin" | "pengembang" | "viewer"
      verification_field:
        | "harga"
        | "lokasi"
        | "pengembang"
        | "kontak"
        | "foto"
        | "ketersediaan_unit"
        | "nama"
      verification_status: "terverifikasi" | "menunggu" | "perlu_pembaruan"
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
    Enums: {
      abuse_kind: [
        "rate_limit",
        "honeypot",
        "too_fast",
        "stale_form",
        "challenge_failed",
        "challenge_passed",
        "blocked",
        "invalid_payload",
        "auth_fail",
        "scrape_suspect",
        "duplicate_lead",
      ],
      audit_action: ["INSERT", "UPDATE", "DELETE"],
      event_type: ["view_detail", "click_kontak", "click_peta", "submit_lead"],
      housing_status: ["draft", "published", "archived"],
      lead_kind: [
        "form_minat",
        "kalkulator",
        "ajukan_kpr",
        "minta_info",
        "whatsapp",
      ],
      lead_status: [
        "baru",
        "dihubungi",
        "terkualifikasi",
        "tindak_lanjut",
        "pengajuan",
        "disetujui",
        "ditolak",
        "ditutup",
      ],
      notif_channel: ["email", "whatsapp"],
      notif_kind: ["prospek_baru", "verifikasi", "keamanan", "sistem"],
      notif_status: ["pending", "sent", "failed", "dead"],
      user_role: ["admin", "pengembang", "viewer"],
      verification_field: [
        "harga",
        "lokasi",
        "pengembang",
        "kontak",
        "foto",
        "ketersediaan_unit",
        "nama",
      ],
      verification_status: ["terverifikasi", "menunggu", "perlu_pembaruan"],
    },
  },
} as const
