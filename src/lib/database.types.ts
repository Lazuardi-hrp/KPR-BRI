/**
 * DIHASILKAN OTOMATIS — jangan disunting dengan tangan.
 *
 * Bangkitkan ulang setelah setiap migrasi:
 *   supabase gen types typescript --project-id avthqhzpmqskagnumiap --schema public \
 *     > src/lib/database.types.ts
 *
 * Interface `Housing` tulisan tangan di src/lib/housing-storage.ts kini menjadi
 * view model presentasi, bukan bentuk basis data. Bentuk basis data ada di sini.
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  __InternalSupabase: { PostgrestVersion: "14.5" }
  public: {
    Tables: {
      app_settings: {
        Row: { description: string | null; key: string; updated_at: string; updated_by: string | null; value: Json }
        Insert: { description?: string | null; key: string; updated_at?: string; updated_by?: string | null; value: Json }
        Update: { description?: string | null; key?: string; updated_at?: string; updated_by?: string | null; value?: Json }
        Relationships: []
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
        Relationships: []
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
        Relationships: []
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
        Relationships: []
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
          wall_type: string | null
        }
        Insert: {
          address?: string
          bathrooms?: number | null
          bedrooms?: number | null
          building_area?: number | null
          commercial_units?: number
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          developer_id?: string | null
          foundation_type?: string | null
          id?: string
          land_area?: number | null
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
          slug: string
          sold_commercial_units?: number
          sold_subsidi_units?: number
          status?: Database["public"]["Enums"]["housing_status"]
          subsidi_units?: number
          updated_at?: string
          updated_by?: string | null
          wall_type?: string | null
        }
        Update: {
          address?: string
          bathrooms?: number | null
          bedrooms?: number | null
          building_area?: number | null
          commercial_units?: number
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          developer_id?: string | null
          foundation_type?: string | null
          id?: string
          land_area?: number | null
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
          slug?: string
          sold_commercial_units?: number
          sold_subsidi_units?: number
          status?: Database["public"]["Enums"]["housing_status"]
          subsidi_units?: number
          updated_at?: string
          updated_by?: string | null
          wall_type?: string | null
        }
        Relationships: []
      }
      lead_notes: {
        Row: { author_id: string | null; body: string; created_at: string; id: string; lead_id: string }
        Insert: { author_id?: string | null; body: string; created_at?: string; id?: string; lead_id: string }
        Update: { author_id?: string | null; body?: string; created_at?: string; id?: string; lead_id?: string }
        Relationships: []
      }
      leads: {
        Row: {
          assigned_to: string | null
          closed_at: string | null
          consent_at: string
          consent_version: string
          contacted_at: string | null
          created_at: string
          email: string | null
          housing_id: string | null
          id: string
          ip_hash: string | null
          message: string | null
          name: string
          phone: string
          purge_after: string
          source: string
          status: Database["public"]["Enums"]["lead_status"]
          updated_at: string
          user_agent: string | null
        }
        Insert: {
          assigned_to?: string | null
          closed_at?: string | null
          consent_at: string
          consent_version: string
          contacted_at?: string | null
          created_at?: string
          email?: string | null
          housing_id?: string | null
          id?: string
          ip_hash?: string | null
          message?: string | null
          name: string
          phone: string
          purge_after?: string
          source?: string
          status?: Database["public"]["Enums"]["lead_status"]
          updated_at?: string
          user_agent?: string | null
        }
        Update: {
          assigned_to?: string | null
          closed_at?: string | null
          consent_at?: string
          consent_version?: string
          contacted_at?: string | null
          created_at?: string
          email?: string | null
          housing_id?: string | null
          id?: string
          ip_hash?: string | null
          message?: string | null
          name?: string
          phone?: string
          purge_after?: string
          source?: string
          status?: Database["public"]["Enums"]["lead_status"]
          updated_at?: string
          user_agent?: string | null
        }
        Relationships: []
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
        Relationships: []
      }
      regions: {
        Row: { city: string; created_at: string; district: string; id: string; province: string; village: string | null }
        Insert: { city?: string; created_at?: string; district: string; id?: string; province?: string; village?: string | null }
        Update: { city?: string; created_at?: string; district?: string; id?: string; province?: string; village?: string | null }
        Relationships: []
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
          foundation_type: string | null
          id: string | null
          images: Json | null
          land_area: number | null
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
          village: string | null
          wall_type: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      is_admin: { Args: never; Returns: boolean }
      jwt_role: { Args: never; Returns: Database["public"]["Enums"]["user_role"] }
      my_developer_id: { Args: never; Returns: string }
      nearest_housings: {
        Args: { p_lat: number; p_lng: number; p_limit?: number; p_max_km?: number }
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
      purge_expired_leads: { Args: never; Returns: number }
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
      slugify: { Args: { p_text: string }; Returns: string }
      submit_lead: {
        Args: {
          p_consent_version?: string
          p_email?: string
          p_housing_id: string
          p_ip_hash?: string
          p_message?: string
          p_name: string
          p_phone: string
          p_user_agent?: string
        }
        Returns: string
      }
      sweep_notification_outbox: { Args: never; Returns: number }
      try_uuid: { Args: { p: string }; Returns: string }
    }
    Enums: {
      audit_action: "INSERT" | "UPDATE" | "DELETE"
      event_type: "view_detail" | "click_kontak" | "click_peta" | "submit_lead"
      housing_status: "draft" | "published" | "archived"
      lead_status: "baru" | "dihubungi" | "diproses" | "selesai" | "batal"
      notif_channel: "email" | "whatsapp"
      notif_status: "pending" | "sent" | "failed" | "dead"
      user_role: "admin" | "pengembang" | "viewer"
    }
    CompositeTypes: Record<string, never>
  }
}

type DefaultSchema = Database["public"]

export type Tables<T extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])> =
  (DefaultSchema["Tables"] & DefaultSchema["Views"])[T] extends { Row: infer R } ? R : never

export type TablesInsert<T extends keyof DefaultSchema["Tables"]> =
  DefaultSchema["Tables"][T] extends { Insert: infer I } ? I : never

export type TablesUpdate<T extends keyof DefaultSchema["Tables"]> =
  DefaultSchema["Tables"][T] extends { Update: infer U } ? U : never

export type Enums<T extends keyof DefaultSchema["Enums"]> = DefaultSchema["Enums"][T]
