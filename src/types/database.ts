export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      sites: {
        Row: {
          id: string
          slug: string
          name: string
          template_id: string
          owner_id: string | null
          settings: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          slug: string
          name: string
          template_id: string
          owner_id?: string | null
          settings?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          slug?: string
          name?: string
          template_id?: string
          owner_id?: string | null
          settings?: Json
          created_at?: string
          updated_at?: string
        }
      }
      pages: {
        Row: {
          id: string
          site_id: string
          slug: string
          title: string
          content: Json
          metadata: Json
          is_published: boolean
          version: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          site_id: string
          slug: string
          title: string
          content: Json
          metadata?: Json
          is_published?: boolean
          version?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          site_id?: string
          slug?: string
          title?: string
          content?: Json
          metadata?: Json
          is_published?: boolean
          version?: number
          created_at?: string
          updated_at?: string
        }
      }
      content_versions: {
        Row: {
          id: string
          page_id: string
          version: number
          content: Json
          created_at: string
          created_by: string | null
        }
        Insert: {
          id?: string
          page_id: string
          version: number
          content: Json
          created_at?: string
          created_by?: string | null
        }
        Update: {
          id?: string
          page_id?: string
          version?: number
          content?: Json
          created_at?: string
          created_by?: string | null
        }
      }
      contact_submissions: {
        Row: {
          id: string
          site_id: string
          name: string
          email: string
          phone: string | null
          message: string
          created_at: string
          is_read: boolean
        }
        Insert: {
          id?: string
          site_id: string
          name: string
          email: string
          phone?: string | null
          message: string
          created_at?: string
          is_read?: boolean
        }
        Update: {
          id?: string
          site_id?: string
          name?: string
          email?: string
          phone?: string | null
          message?: string
          created_at?: string
          is_read?: boolean
        }
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
  }
}
