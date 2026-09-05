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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      answer_helpful_marks_v1: {
        Row: {
          answer_id: string
          created_at: string
          mark_id: string
          person_id: string
        }
        Insert: {
          answer_id: string
          created_at?: string
          mark_id?: string
          person_id?: string
        }
        Update: {
          answer_id?: string
          created_at?: string
          mark_id?: string
          person_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "answer_helpful_marks_v1_answer_id_fkey"
            columns: ["answer_id"]
            isOneToOne: false
            referencedRelation: "answers_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "helpful_mark_fact_v1_fkey"
            columns: ["mark_id", "answer_id"]
            isOneToOne: true
            referencedRelation: "answer_helpful_public_facts_v1"
            referencedColumns: ["mark_id", "answer_id"]
          },
        ]
      }
      answer_helpful_public_facts_v1: {
        Row: {
          answer_id: string
          mark_id: string
        }
        Insert: {
          answer_id: string
          mark_id: string
        }
        Update: {
          answer_id?: string
          mark_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "answer_helpful_public_facts_v1_answer_id_fkey"
            columns: ["answer_id"]
            isOneToOne: false
            referencedRelation: "answers_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "helpful_fact_mark_v1_fkey"
            columns: ["mark_id", "answer_id"]
            isOneToOne: true
            referencedRelation: "answer_helpful_marks_v1"
            referencedColumns: ["mark_id", "answer_id"]
          },
        ]
      }
      answer_likes: {
        Row: {
          answer_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          answer_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          answer_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "answer_likes_answer_id_fkey"
            columns: ["answer_id"]
            isOneToOne: false
            referencedRelation: "answers"
            referencedColumns: ["id"]
          },
        ]
      }
      answer_replies_v1: {
        Row: {
          answer_id: string
          author_person_id: string
          body: string
          created_at: string
          deleted_at: string | null
          id: string
          moderation_visibility: string
          updated_at: string
        }
        Insert: {
          answer_id: string
          author_person_id?: string
          body: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          moderation_visibility?: string
          updated_at?: string
        }
        Update: {
          answer_id?: string
          author_person_id?: string
          body?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          moderation_visibility?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "answer_replies_v1_answer_id_fkey"
            columns: ["answer_id"]
            isOneToOne: false
            referencedRelation: "answers_v1"
            referencedColumns: ["id"]
          },
        ]
      }
      answers: {
        Row: {
          author_id: string
          content: string
          created_at: string
          id: string
          is_accepted: boolean
          is_hidden: boolean
          like_count: number
          likes_count: number
          question_id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string
          id?: string
          is_accepted?: boolean
          is_hidden?: boolean
          like_count?: number
          likes_count?: number
          question_id: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string
          id?: string
          is_accepted?: boolean
          is_hidden?: boolean
          like_count?: number
          likes_count?: number
          question_id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      answers_v1: {
        Row: {
          author_person_id: string
          body: string
          created_at: string
          deleted_at: string | null
          id: string
          moderation_visibility: string
          question_id: string
          updated_at: string
        }
        Insert: {
          author_person_id?: string
          body: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          moderation_visibility?: string
          question_id: string
          updated_at?: string
        }
        Update: {
          author_person_id?: string
          body?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          moderation_visibility?: string
          question_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "answers_v1_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions_v1"
            referencedColumns: ["id"]
          },
        ]
      }
      app_config: {
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
          value?: Json
        }
        Update: {
          description?: string | null
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      audit_events: {
        Row: {
          actor_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string | null
          event_type: string
          id: string
          payload: Json
          severity: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          event_type: string
          id?: string
          payload?: Json
          severity?: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          event_type?: string
          id?: string
          payload?: Json
          severity?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          metadata: Json
          severity: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          metadata?: Json
          severity?: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          metadata?: Json
          severity?: string
        }
        Relationships: []
      }
      call_sessions: {
        Row: {
          callee_id: string
          caller_id: string
          created_at: string
          end_reason: string | null
          ended_at: string | null
          id: string
          metadata: Json
          mode: string
          order_id: string | null
          rtc_channel: string | null
          started_at: string | null
          status: string
          target_id: string | null
          target_type: string | null
          updated_at: string
        }
        Insert: {
          callee_id: string
          caller_id: string
          created_at?: string
          end_reason?: string | null
          ended_at?: string | null
          id?: string
          metadata?: Json
          mode: string
          order_id?: string | null
          rtc_channel?: string | null
          started_at?: string | null
          status?: string
          target_id?: string | null
          target_type?: string | null
          updated_at?: string
        }
        Update: {
          callee_id?: string
          caller_id?: string
          created_at?: string
          end_reason?: string | null
          ended_at?: string | null
          id?: string
          metadata?: Json
          mode?: string
          order_id?: string | null
          rtc_channel?: string | null
          started_at?: string | null
          status?: string
          target_id?: string | null
          target_type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "call_sessions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      content_moderation_logs: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          id: string
          metadata: Json
          reason: string | null
          risk_score: number | null
          target_id: string
          target_type: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          reason?: string | null
          risk_score?: number | null
          target_id: string
          target_type: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          reason?: string | null
          risk_score?: number | null
          target_id?: string
          target_type?: string
        }
        Relationships: []
      }
      content_reports: {
        Row: {
          created_at: string
          details: string | null
          id: string
          reason: string
          reporter_id: string
          resolution: string | null
          resolution_note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          target_id: string
          target_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          details?: string | null
          id?: string
          reason: string
          reporter_id: string
          resolution?: string | null
          resolution_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          target_id: string
          target_type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          details?: string | null
          id?: string
          reason?: string
          reporter_id?: string
          resolution?: string | null
          resolution_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          target_id?: string
          target_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      conversation_members: {
        Row: {
          conversation_id: string
          created_at: string
          joined_at: string
          last_read_at: string | null
          last_read_message_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          conversation_id: string
          created_at?: string
          joined_at?: string
          last_read_at?: string | null
          last_read_message_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          conversation_id?: string
          created_at?: string
          joined_at?: string
          last_read_at?: string | null
          last_read_message_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_members_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_members_last_read_message_id_fkey"
            columns: ["last_read_message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          last_message_at: string
          participant_a: string | null
          participant_b: string | null
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          last_message_at?: string
          participant_a?: string | null
          participant_b?: string | null
          type?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          last_message_at?: string
          participant_a?: string | null
          participant_b?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      discussion_likes: {
        Row: {
          created_at: string
          discussion_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          discussion_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          discussion_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "discussion_likes_discussion_id_fkey"
            columns: ["discussion_id"]
            isOneToOne: false
            referencedRelation: "topic_discussions"
            referencedColumns: ["id"]
          },
        ]
      }
      drafts: {
        Row: {
          bounty_points: number | null
          category: string | null
          content: string | null
          created_at: string
          id: string
          tags: string[] | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          bounty_points?: number | null
          category?: string | null
          content?: string | null
          created_at?: string
          id?: string
          tags?: string[] | null
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          bounty_points?: number | null
          category?: string | null
          content?: string | null
          created_at?: string
          id?: string
          tags?: string[] | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      earning_transactions: {
        Row: {
          amount: number
          biz_id: string | null
          biz_type: string
          created_at: string
          direction: string
          id: string
          note: string | null
          order_id: string | null
          settled_at: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          biz_id?: string | null
          biz_type: string
          created_at?: string
          direction?: string
          id?: string
          note?: string | null
          order_id?: string | null
          settled_at?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          biz_id?: string | null
          biz_type?: string
          created_at?: string
          direction?: string
          id?: string
          note?: string | null
          order_id?: string | null
          settled_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "earning_transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      experience_claims: {
        Row: {
          claim_type: string
          claim_value: string
          created_at: string
          deleted_at: string | null
          experience_id: string
          id: string
          person_id: string
          updated_at: string
        }
        Insert: {
          claim_type: string
          claim_value: string
          created_at?: string
          deleted_at?: string | null
          experience_id: string
          id?: string
          person_id: string
          updated_at?: string
        }
        Update: {
          claim_type?: string
          claim_value?: string
          created_at?: string
          deleted_at?: string | null
          experience_id?: string
          id?: string
          person_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "experience_claims_experience_owner_fkey"
            columns: ["experience_id", "person_id"]
            isOneToOne: false
            referencedRelation: "person_experiences"
            referencedColumns: ["id", "person_id"]
          },
        ]
      }
      experience_transitions: {
        Row: {
          created_at: string
          experience_id: string
          from_label: string
          id: string
          occurred_month: number | null
          occurred_year: number | null
          person_id: string
          sort_order: number
          to_label: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          experience_id: string
          from_label: string
          id?: string
          occurred_month?: number | null
          occurred_year?: number | null
          person_id: string
          sort_order?: number
          to_label: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          experience_id?: string
          from_label?: string
          id?: string
          occurred_month?: number | null
          occurred_year?: number | null
          person_id?: string
          sort_order?: number
          to_label?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "experience_transitions_experience_owner_fkey"
            columns: ["experience_id", "person_id"]
            isOneToOne: false
            referencedRelation: "person_experiences"
            referencedColumns: ["id", "person_id"]
          },
        ]
      }
      expert_followers: {
        Row: {
          created_at: string
          expert_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expert_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          expert_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "expert_followers_expert_id_fkey"
            columns: ["expert_id"]
            isOneToOne: false
            referencedRelation: "experts"
            referencedColumns: ["user_id"]
          },
        ]
      }
      experts: {
        Row: {
          answer_count: number
          available_time_slots: Json | null
          avatar_url: string | null
          bio: string | null
          category: string | null
          channel: string | null
          consultation_count: number | null
          consultation_price: number | null
          cover_image: string | null
          created_at: string | null
          display_name: string | null
          education: Json | null
          experience: Json | null
          experience_level: string | null
          expertise_summary: string | null
          follower_count: number
          followers_count: number | null
          headline: string | null
          id: string
          intro: string | null
          is_active: boolean | null
          is_verified: boolean | null
          keywords: string[] | null
          location: string | null
          order_count: number | null
          profile_status: string
          rating: number | null
          response_rate: number | null
          response_time: string | null
          response_time_label: string | null
          service_count: number
          subcategory: string | null
          tags: string[] | null
          title: string
          updated_at: string | null
          user_id: string
          verification_status: string
        }
        Insert: {
          answer_count?: number
          available_time_slots?: Json | null
          avatar_url?: string | null
          bio?: string | null
          category?: string | null
          channel?: string | null
          consultation_count?: number | null
          consultation_price?: number | null
          cover_image?: string | null
          created_at?: string | null
          display_name?: string | null
          education?: Json | null
          experience?: Json | null
          experience_level?: string | null
          expertise_summary?: string | null
          follower_count?: number
          followers_count?: number | null
          headline?: string | null
          id?: string
          intro?: string | null
          is_active?: boolean | null
          is_verified?: boolean | null
          keywords?: string[] | null
          location?: string | null
          order_count?: number | null
          profile_status?: string
          rating?: number | null
          response_rate?: number | null
          response_time?: string | null
          response_time_label?: string | null
          service_count?: number
          subcategory?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string | null
          user_id: string
          verification_status?: string
        }
        Update: {
          answer_count?: number
          available_time_slots?: Json | null
          avatar_url?: string | null
          bio?: string | null
          category?: string | null
          channel?: string | null
          consultation_count?: number | null
          consultation_price?: number | null
          cover_image?: string | null
          created_at?: string | null
          display_name?: string | null
          education?: Json | null
          experience?: Json | null
          experience_level?: string | null
          expertise_summary?: string | null
          follower_count?: number
          followers_count?: number | null
          headline?: string | null
          id?: string
          intro?: string | null
          is_active?: boolean | null
          is_verified?: boolean | null
          keywords?: string[] | null
          location?: string | null
          order_count?: number | null
          profile_status?: string
          rating?: number | null
          response_rate?: number | null
          response_time?: string | null
          response_time_label?: string | null
          service_count?: number
          subcategory?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string | null
          user_id?: string
          verification_status?: string
        }
        Relationships: []
      }
      favorites: {
        Row: {
          created_at: string
          id: string
          question_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          question_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          question_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback: {
        Row: {
          content: string
          created_at: string
          id: string
          images: string[] | null
          type: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          images?: string[] | null
          type?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          images?: string[] | null
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      follows: {
        Row: {
          created_at: string
          followee_id: string
          follower_id: string
        }
        Insert: {
          created_at?: string
          followee_id: string
          follower_id: string
        }
        Update: {
          created_at?: string
          followee_id?: string
          follower_id?: string
        }
        Relationships: []
      }
      hot_keywords: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          keyword: string
          keyword_type: string
          score: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          keyword: string
          keyword_type?: string
          score?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          keyword?: string
          keyword_type?: string
          score?: number
          updated_at?: string
        }
        Relationships: []
      }
      hot_topics: {
        Row: {
          category: string | null
          channel: string | null
          cover_image: string | null
          created_at: string
          created_by: string
          description: string | null
          discussions_count: number
          featured_priority: number
          id: string
          is_active: boolean
          participants_count: number
          subcategory: string | null
          title: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          channel?: string | null
          cover_image?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          discussions_count?: number
          featured_priority?: number
          id?: string
          is_active?: boolean
          participants_count?: number
          subcategory?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          channel?: string | null
          cover_image?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          discussions_count?: number
          featured_priority?: number
          id?: string
          is_active?: boolean
          participants_count?: number
          subcategory?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          conversation_id: string | null
          created_at: string
          id: string
          is_hidden: boolean
          message_type: string
          read_at: string | null
          receiver_id: string
          sender_id: string
          status: string
          target_id: string | null
          target_type: string | null
          updated_at: string
        }
        Insert: {
          content: string
          conversation_id?: string | null
          created_at?: string
          id?: string
          is_hidden?: boolean
          message_type?: string
          read_at?: string | null
          receiver_id: string
          sender_id: string
          status?: string
          target_id?: string | null
          target_type?: string | null
          updated_at?: string
        }
        Update: {
          content?: string
          conversation_id?: string | null
          created_at?: string
          id?: string
          is_hidden?: boolean
          message_type?: string
          read_at?: string | null
          receiver_id?: string
          sender_id?: string
          status?: string
          target_id?: string | null
          target_type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      moderation_queue: {
        Row: {
          assigned_to: string | null
          created_at: string
          id: string
          item_id: string
          item_type: string
          priority: number
          processed_at: string | null
          queue_status: string
          review_notes: string | null
          source_report_id: string | null
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          id?: string
          item_id: string
          item_type: string
          priority?: number
          processed_at?: string | null
          queue_status?: string
          review_notes?: string | null
          source_report_id?: string | null
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          id?: string
          item_id?: string
          item_type?: string
          priority?: number
          processed_at?: string | null
          queue_status?: string
          review_notes?: string | null
          source_report_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "moderation_queue_source_report_id_fkey"
            columns: ["source_report_id"]
            isOneToOne: false
            referencedRelation: "content_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          content: string | null
          created_at: string | null
          id: string
          is_read: boolean | null
          related_id: string | null
          related_type: string | null
          sender_id: string | null
          target_id: string | null
          target_type: string | null
          title: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          body?: string | null
          content?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          related_id?: string | null
          related_type?: string | null
          sender_id?: string | null
          target_id?: string | null
          target_type?: string | null
          title: string
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string | null
          content?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          related_id?: string | null
          related_type?: string | null
          sender_id?: string | null
          target_id?: string | null
          target_type?: string | null
          title?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          amount: number
          biz_ref_id: string | null
          biz_ref_type: string | null
          buyer_id: string
          cash_amount: number | null
          closed_at: string | null
          completed_at: string | null
          created_at: string
          currency: string
          id: string
          metadata: Json
          order_type: string
          paid_at: string | null
          payment_method: string | null
          point_amount: number
          provider_order_id: string | null
          provider_transaction_id: string | null
          related_id: string | null
          seller_id: string | null
          status: string
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          biz_ref_id?: string | null
          biz_ref_type?: string | null
          buyer_id: string
          cash_amount?: number | null
          closed_at?: string | null
          completed_at?: string | null
          created_at?: string
          currency?: string
          id?: string
          metadata?: Json
          order_type: string
          paid_at?: string | null
          payment_method?: string | null
          point_amount?: number
          provider_order_id?: string | null
          provider_transaction_id?: string | null
          related_id?: string | null
          seller_id?: string | null
          status?: string
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          biz_ref_id?: string | null
          biz_ref_type?: string | null
          buyer_id?: string
          cash_amount?: number | null
          closed_at?: string | null
          completed_at?: string | null
          created_at?: string
          currency?: string
          id?: string
          metadata?: Json
          order_type?: string
          paid_at?: string | null
          payment_method?: string | null
          point_amount?: number
          provider_order_id?: string | null
          provider_transaction_id?: string | null
          related_id?: string | null
          seller_id?: string | null
          status?: string
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      payment_callbacks: {
        Row: {
          created_at: string
          id: string
          order_id: string
          payload: Json
          processed_at: string
          provider: string
          provider_transaction_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          order_id: string
          payload?: Json
          processed_at?: string
          provider: string
          provider_transaction_id: string
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string
          payload?: Json
          processed_at?: string
          provider?: string
          provider_transaction_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_callbacks_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          currency: string
          external_txn_id: string | null
          id: string
          order_id: string
          paid_at: string | null
          payer_id: string
          payment_channel: string
          status: string
          updated_at: string
        }
        Insert: {
          amount?: number
          created_at?: string
          currency?: string
          external_txn_id?: string | null
          id?: string
          order_id: string
          paid_at?: string | null
          payer_id: string
          payment_channel?: string
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          external_txn_id?: string | null
          id?: string
          order_id?: string
          paid_at?: string | null
          payer_id?: string
          payment_channel?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      person_experiences: {
        Row: {
          can_share: string[]
          city: string | null
          city_code: string | null
          created_at: string
          deleted_at: string | null
          description: string
          end_month: number | null
          end_year: number | null
          experience_kind: string
          id: string
          is_current: boolean
          location_label: string | null
          person_id: string
          sort_order: number
          start_month: number | null
          start_year: number | null
          title: string
          updated_at: string
          visibility: string
        }
        Insert: {
          can_share?: string[]
          city?: string | null
          city_code?: string | null
          created_at?: string
          deleted_at?: string | null
          description: string
          end_month?: number | null
          end_year?: number | null
          experience_kind?: string
          id?: string
          is_current?: boolean
          location_label?: string | null
          person_id: string
          sort_order?: number
          start_month?: number | null
          start_year?: number | null
          title: string
          updated_at?: string
          visibility?: string
        }
        Update: {
          can_share?: string[]
          city?: string | null
          city_code?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string
          end_month?: number | null
          end_year?: number | null
          experience_kind?: string
          id?: string
          is_current?: boolean
          location_label?: string | null
          person_id?: string
          sort_order?: number
          start_month?: number | null
          start_year?: number | null
          title?: string
          updated_at?: string
          visibility?: string
        }
        Relationships: []
      }
      point_accounts: {
        Row: {
          available_balance: number
          created_at: string
          frozen_balance: number
          total_earned: number
          total_spent: number
          updated_at: string
          user_id: string
        }
        Insert: {
          available_balance?: number
          created_at?: string
          frozen_balance?: number
          total_earned?: number
          total_spent?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          available_balance?: number
          created_at?: string
          frozen_balance?: number
          total_earned?: number
          total_spent?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      point_transactions: {
        Row: {
          amount: number
          balance_after: number | null
          biz_id: string | null
          biz_type: string
          created_at: string
          direction: string
          id: string
          idempotency_key: string | null
          note: string | null
          order_id: string | null
          point_account_id: string
          status: string
          user_id: string
        }
        Insert: {
          amount: number
          balance_after?: number | null
          biz_id?: string | null
          biz_type: string
          created_at?: string
          direction: string
          id?: string
          idempotency_key?: string | null
          note?: string | null
          order_id?: string | null
          point_account_id: string
          status?: string
          user_id: string
        }
        Update: {
          amount?: number
          balance_after?: number | null
          biz_id?: string | null
          biz_type?: string
          created_at?: string
          direction?: string
          id?: string
          idempotency_key?: string | null
          note?: string | null
          order_id?: string | null
          point_account_id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "point_transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "point_transactions_point_account_id_fkey"
            columns: ["point_account_id"]
            isOneToOne: false
            referencedRelation: "point_accounts"
            referencedColumns: ["user_id"]
          },
        ]
      }
      points_transactions: {
        Row: {
          amount: number
          balance_after: number
          created_at: string
          description: string | null
          id: string
          related_id: string | null
          status: string
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          balance_after?: number
          created_at?: string
          description?: string | null
          id?: string
          related_id?: string | null
          status?: string
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          balance_after?: number
          created_at?: string
          description?: string | null
          id?: string
          related_id?: string | null
          status?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      post_comments: {
        Row: {
          author_id: string
          content: string
          created_at: string
          id: string
          likes_count: number
          post_id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string
          id?: string
          likes_count?: number
          post_id: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string
          id?: string
          likes_count?: number
          post_id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_favorites: {
        Row: {
          created_at: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_favorites_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_likes: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_media: {
        Row: {
          created_at: string
          id: string
          media_type: string
          media_url: string | null
          post_id: string
          sort_order: number
          storage_path: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          media_type?: string
          media_url?: string | null
          post_id: string
          sort_order?: number
          storage_path?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          media_type?: string
          media_url?: string | null
          post_id?: string
          sort_order?: number
          storage_path?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "post_media_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          author_id: string
          city: string | null
          city_code: string | null
          comment_count: number
          comments_count: number
          content: string
          created_at: string
          favorite_count: number
          id: string
          images: string[] | null
          like_count: number
          likes_count: number
          shares_count: number
          status: string
          topics: string[] | null
          updated_at: string
          user_id: string
          video: string | null
          visibility: string
        }
        Insert: {
          author_id: string
          city?: string | null
          city_code?: string | null
          comment_count?: number
          comments_count?: number
          content: string
          created_at?: string
          favorite_count?: number
          id?: string
          images?: string[] | null
          like_count?: number
          likes_count?: number
          shares_count?: number
          status?: string
          topics?: string[] | null
          updated_at?: string
          user_id: string
          video?: string | null
          visibility?: string
        }
        Update: {
          author_id?: string
          city?: string | null
          city_code?: string | null
          comment_count?: number
          comments_count?: number
          content?: string
          created_at?: string
          favorite_count?: number
          id?: string
          images?: string[] | null
          like_count?: number
          likes_count?: number
          shares_count?: number
          status?: string
          topics?: string[] | null
          updated_at?: string
          user_id?: string
          video?: string | null
          visibility?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          city: string | null
          city_code: string | null
          cover_url: string | null
          created_at: string
          gender: string | null
          id: string
          industry: string | null
          is_expert: boolean
          is_verified: boolean
          nickname: string | null
          phone: string | null
          school: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          city_code?: string | null
          cover_url?: string | null
          created_at?: string
          gender?: string | null
          id?: string
          industry?: string | null
          is_expert?: boolean
          is_verified?: boolean
          nickname?: string | null
          phone?: string | null
          school?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          city_code?: string | null
          cover_url?: string | null
          created_at?: string
          gender?: string | null
          id?: string
          industry?: string | null
          is_expert?: boolean
          is_verified?: boolean
          nickname?: string | null
          phone?: string | null
          school?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      question_drafts: {
        Row: {
          author_id: string
          city: string | null
          city_code: string | null
          created_at: string
          description: string | null
          draft_payload: Json
          id: string
          reward_points: number
          title: string | null
          updated_at: string
        }
        Insert: {
          author_id: string
          city?: string | null
          city_code?: string | null
          created_at?: string
          description?: string | null
          draft_payload?: Json
          id?: string
          reward_points?: number
          title?: string | null
          updated_at?: string
        }
        Update: {
          author_id?: string
          city?: string | null
          city_code?: string | null
          created_at?: string
          description?: string | null
          draft_payload?: Json
          id?: string
          reward_points?: number
          title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      question_tags: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          question_id: string
          tag: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          question_id: string
          tag: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          question_id?: string
          tag?: string
        }
        Relationships: [
          {
            foreignKeyName: "question_tags_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      questions: {
        Row: {
          accepted_answer_id: string | null
          answer_count: number
          author_id: string
          bounty_points: number
          category: string | null
          category_slug: string | null
          channel: string | null
          city: string | null
          city_code: string | null
          content: string | null
          created_at: string
          description: string | null
          favorite_count: number
          id: string
          is_hidden: boolean
          reward_points: number
          status: string
          subcategory: string | null
          tags: string[] | null
          title: string
          updated_at: string
          user_id: string
          view_count: number
        }
        Insert: {
          accepted_answer_id?: string | null
          answer_count?: number
          author_id: string
          bounty_points?: number
          category?: string | null
          category_slug?: string | null
          channel?: string | null
          city?: string | null
          city_code?: string | null
          content?: string | null
          created_at?: string
          description?: string | null
          favorite_count?: number
          id?: string
          is_hidden?: boolean
          reward_points?: number
          status?: string
          subcategory?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string
          user_id: string
          view_count?: number
        }
        Update: {
          accepted_answer_id?: string | null
          answer_count?: number
          author_id?: string
          bounty_points?: number
          category?: string | null
          category_slug?: string | null
          channel?: string | null
          city?: string | null
          city_code?: string | null
          content?: string | null
          created_at?: string
          description?: string | null
          favorite_count?: number
          id?: string
          is_hidden?: boolean
          reward_points?: number
          status?: string
          subcategory?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string
          user_id?: string
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "questions_accepted_answer_id_fkey"
            columns: ["accepted_answer_id"]
            isOneToOne: false
            referencedRelation: "answers"
            referencedColumns: ["id"]
          },
        ]
      }
      questions_v1: {
        Row: {
          context: string
          created_at: string
          deep_exchange_budget_max_cents: number | null
          deleted_at: string | null
          id: string
          moderation_visibility: string
          primary_channel: string
          requester_person_id: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          context: string
          created_at?: string
          deep_exchange_budget_max_cents?: number | null
          deleted_at?: string | null
          id?: string
          moderation_visibility?: string
          primary_channel: string
          requester_person_id?: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          context?: string
          created_at?: string
          deep_exchange_budget_max_cents?: number | null
          deleted_at?: string | null
          id?: string
          moderation_visibility?: string
          primary_channel?: string
          requester_person_id?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      rate_limit_events: {
        Row: {
          action: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      recommendation_slots: {
        Row: {
          created_at: string
          created_by: string | null
          end_at: string | null
          id: string
          image_url: string | null
          is_active: boolean
          notes: string | null
          payload: Json
          priority: number
          slot_key: string
          start_at: string | null
          subtitle: string | null
          target_id: string | null
          target_type: string
          title: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          end_at?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          notes?: string | null
          payload?: Json
          priority?: number
          slot_key: string
          start_at?: string | null
          subtitle?: string | null
          target_id?: string | null
          target_type: string
          title?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          end_at?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          notes?: string | null
          payload?: Json
          priority?: number
          slot_key?: string
          start_at?: string | null
          subtitle?: string | null
          target_id?: string | null
          target_type?: string
          title?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      search_history: {
        Row: {
          created_at: string
          id: string
          last_used_at: string
          query_text: string
          query_text_norm: string | null
          query_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_used_at?: string
          query_text: string
          query_text_norm?: string | null
          query_type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_used_at?: string
          query_text?: string
          query_text_norm?: string | null
          query_type?: string
          user_id?: string
        }
        Relationships: []
      }
      skill_categories: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          parent_id: string | null
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          parent_id?: string | null
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          parent_id?: string | null
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "skill_categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "skill_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      skill_offers: {
        Row: {
          category_id: string | null
          city: string | null
          city_code: string | null
          created_at: string
          delivery_mode: string
          description: string | null
          expert_id: string
          id: string
          is_remote_supported: boolean
          price_amount: number | null
          price_currency: string
          pricing_mode: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          city?: string | null
          city_code?: string | null
          created_at?: string
          delivery_mode?: string
          description?: string | null
          expert_id: string
          id?: string
          is_remote_supported?: boolean
          price_amount?: number | null
          price_currency?: string
          pricing_mode?: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          city?: string | null
          city_code?: string | null
          created_at?: string
          delivery_mode?: string
          description?: string | null
          expert_id?: string
          id?: string
          is_remote_supported?: boolean
          price_amount?: number | null
          price_currency?: string
          pricing_mode?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "skill_offers_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "skill_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "skill_offers_expert_id_fkey"
            columns: ["expert_id"]
            isOneToOne: false
            referencedRelation: "experts"
            referencedColumns: ["user_id"]
          },
        ]
      }
      system_configs: {
        Row: {
          created_at: string
          description: string | null
          is_public: boolean
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          created_at?: string
          description?: string | null
          is_public?: boolean
          key: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Update: {
          created_at?: string
          description?: string | null
          is_public?: boolean
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      talent_certifications: {
        Row: {
          cert_type: string
          created_at: string
          details: Json | null
          id: string
          reviewed_at: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cert_type: string
          created_at?: string
          details?: Json | null
          id?: string
          reviewed_at?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cert_type?: string
          created_at?: string
          details?: Json | null
          id?: string
          reviewed_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      topic_discussions: {
        Row: {
          content: string
          created_at: string
          id: string
          is_hidden: boolean
          likes_count: number
          topic_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_hidden?: boolean
          likes_count?: number
          topic_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_hidden?: boolean
          likes_count?: number
          topic_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "topic_discussions_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "hot_topics"
            referencedColumns: ["id"]
          },
        ]
      }
      topic_followers: {
        Row: {
          created_at: string | null
          id: string
          topic_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          topic_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          topic_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "topic_followers_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "hot_topics"
            referencedColumns: ["id"]
          },
        ]
      }
      user_followers: {
        Row: {
          created_at: string
          follower_id: string
          following_id: string
          id: string
        }
        Insert: {
          created_at?: string
          follower_id: string
          following_id: string
          id?: string
        }
        Update: {
          created_at?: string
          follower_id?: string
          following_id?: string
          id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          content_preferences: Json
          created_at: string
          id: string
          notification_enabled: boolean
          notification_settings: Json
          privacy_level: string
          privacy_settings: Json
          push_enabled: boolean
          theme_preference: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content_preferences?: Json
          created_at?: string
          id?: string
          notification_enabled?: boolean
          notification_settings?: Json
          privacy_level?: string
          privacy_settings?: Json
          push_enabled?: boolean
          theme_preference?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content_preferences?: Json
          created_at?: string
          id?: string
          notification_enabled?: boolean
          notification_settings?: Json
          privacy_level?: string
          privacy_settings?: Json
          push_enabled?: boolean
          theme_preference?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_verifications: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          reviewed_at: string | null
          reviewer_id: string | null
          status: string
          submitted_at: string
          updated_at: string
          user_id: string
          verification_type: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          reviewed_at?: string | null
          reviewer_id?: string | null
          status?: string
          submitted_at?: string
          updated_at?: string
          user_id: string
          verification_type: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          reviewed_at?: string | null
          reviewer_id?: string | null
          status?: string
          submitted_at?: string
          updated_at?: string
          user_id?: string
          verification_type?: string
        }
        Relationships: []
      }
      wechat_identities: {
        Row: {
          app_id: string
          created_at: string
          id: string
          last_login_at: string
          openid: string
          unionid: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          app_id: string
          created_at?: string
          id?: string
          last_login_at?: string
          openid: string
          unionid?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          app_id?: string
          created_at?: string
          id?: string
          last_login_at?: string
          openid?: string
          unionid?: string | null
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
      accept_answer_and_transfer_points: {
        Args: { p_answer_id: string; p_question_id: string }
        Returns: undefined
      }
      accept_answer_v2: {
        Args: { p_answer_id: string; p_question_id: string }
        Returns: Json
      }
      accept_call_v1: { Args: { p_call_session_id: string }; Returns: Json }
      admin_confirm_recharge_order: {
        Args: { p_order_id: string; p_provider_transaction_id?: string }
        Returns: boolean
      }
      apply_content_moderation_action: {
        Args: {
          p_action: string
          p_reason?: string
          p_report_id?: string
          p_target_id: string
          p_target_type: string
        }
        Returns: boolean
      }
      can_read_post: {
        Args: { p_author_id: string; p_status: string; p_visibility: string }
        Returns: boolean
      }
      claim_wechat_identity_v1: {
        Args: {
          p_app_id: string
          p_candidate_user_id: string
          p_openid: string
          p_unionid: string
        }
        Returns: string
      }
      close_question_v1: { Args: { p_question_id: string }; Returns: Json }
      confirm_recharge_payment: {
        Args: {
          p_callback_payload?: Json
          p_order_id: string
          p_paid_cash: number
          p_provider_transaction_id: string
        }
        Returns: boolean
      }
      create_answer_reply_v1: {
        Args: { p_answer_id: string; p_body: string }
        Returns: Json
      }
      create_answer_secure: {
        Args: { p_content: string; p_question_id: string }
        Returns: string
      }
      create_answer_v1: {
        Args: { p_body: string; p_question_id: string }
        Returns: Json
      }
      create_call_session_v1: {
        Args: {
          p_callee_id: string
          p_mode: string
          p_order_id?: string
          p_target_id?: string
          p_target_type?: string
        }
        Returns: Json
      }
      create_consultation_order: {
        Args: { p_consult_type?: string; p_expert_id: string }
        Returns: string
      }
      create_experience_claim_v1: {
        Args: { p_claim_type: string; p_experience_id: string; p_value: string }
        Returns: string
      }
      create_experience_transition_v1: {
        Args: {
          p_experience_id: string
          p_from_label: string
          p_occurred_month?: number
          p_occurred_year?: number
          p_sort_order?: number
          p_to_label: string
        }
        Returns: string
      }
      create_person_experience_v1: {
        Args: {
          p_can_share?: string[]
          p_city?: string
          p_city_code?: string
          p_description: string
          p_end_month?: number
          p_end_year?: number
          p_is_current?: boolean
          p_kind?: string
          p_location_label?: string
          p_sort_order?: number
          p_start_month?: number
          p_start_year?: number
          p_title: string
          p_visibility?: string
        }
        Returns: string
      }
      create_question_secure: {
        Args: {
          p_bounty_points?: number
          p_category?: string
          p_content?: string
          p_tags?: string[]
          p_title: string
        }
        Returns: string
      }
      create_question_v1: {
        Args: {
          p_context: string
          p_deep_exchange_budget_max_cents: number
          p_primary_channel: string
          p_title: string
          p_topic_ids: string[]
        }
        Returns: Json
      }
      create_recharge_payment_order: {
        Args: { p_payment_method?: string; p_points: number }
        Returns: Json
      }
      create_system_notification_v2: {
        Args: {
          p_body: string
          p_target_id?: string
          p_target_type?: string
          p_title: string
          p_type: string
          p_user_id: string
        }
        Returns: string
      }
      create_topic_discussion_secure: {
        Args: { p_content: string; p_topic_id: string }
        Returns: string
      }
      delete_answer_reply_v1: { Args: { p_reply_id: string }; Returns: Json }
      delete_answer_v1: { Args: { p_answer_id: string }; Returns: Json }
      delete_experience_claim_v1: {
        Args: { p_claim_id: string }
        Returns: string
      }
      delete_experience_transition_v1: {
        Args: { p_transition_id: string }
        Returns: string
      }
      delete_person_experience_v1: {
        Args: { p_experience_id: string }
        Returns: string
      }
      end_call_v1: {
        Args: { p_call_session_id: string; p_reason?: string }
        Returns: Json
      }
      enforce_rate_limit: {
        Args: {
          p_action: string
          p_max_count?: number
          p_window_minutes?: number
        }
        Returns: undefined
      }
      evaluate_content_risk: { Args: { p_text: string }; Returns: Json }
      get_admin_dashboard: { Args: never; Returns: Json }
      get_app_configs: { Args: never; Returns: Json }
      get_channel_featured: {
        Args: { p_channel: string; p_subcategory?: string }
        Returns: Json
      }
      get_channel_feed: {
        Args: {
          p_channel: string
          p_experts_limit?: number
          p_questions_limit?: number
          p_subcategory?: string
        }
        Returns: Json
      }
      get_my_person_experiences_v1: {
        Args: { p_limit?: number; p_offset?: number }
        Returns: Json
      }
      get_my_unread_message_count: { Args: never; Returns: number }
      get_my_unread_notification_count: { Args: never; Returns: number }
      get_nearby_experts: {
        Args: { p_lat: number; p_lng: number; p_radius_km?: number }
        Returns: {
          avatar_url: string
          bio: string
          category: string
          consultation_count: number
          display_name: string
          distance_km: number
          expert_id: string
          followers_count: number
          is_verified: boolean
          location: string
          order_count: number
          rating: number
          response_rate: number
          title: string
          user_id: string
        }[]
      }
      get_or_create_direct_conversation: {
        Args: { p_created_by?: string; p_user_a: string; p_user_b: string }
        Returns: string
      }
      get_public_person_experiences_v1: {
        Args: { p_limit?: number; p_offset?: number; p_person_id: string }
        Returns: Json
      }
      get_public_person_profile_v1: {
        Args: { p_user_id: string }
        Returns: Json
      }
      get_question_detail_v1: { Args: { p_question_id: string }; Returns: Json }
      get_search_suggestions_v2: {
        Args: { p_limit?: number; p_query?: string; p_type?: string }
        Returns: Json
      }
      get_user_conversations: {
        Args: never
        Returns: {
          last_message: string
          last_message_time: string
          partner_avatar: string
          partner_id: string
          partner_nickname: string
          unread_count: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      infer_channel_from_subcategory: {
        Args: { p_value: string }
        Returns: string
      }
      is_admin_user: { Args: { p_uid?: string }; Returns: boolean }
      is_conversation_member: {
        Args: { p_conversation_id: string; p_user_id?: string }
        Returns: boolean
      }
      is_service_role: { Args: never; Returns: boolean }
      list_answer_replies_v1: {
        Args: { p_answer_id: string; p_limit: number; p_offset: number }
        Returns: Json
      }
      list_content_reports: { Args: { p_status?: string }; Returns: Json }
      list_pending_recharge_orders: { Args: never; Returns: Json }
      list_question_answers_v1: {
        Args: {
          p_limit: number
          p_offset: number
          p_order: string
          p_question_id: string
        }
        Returns: Json
      }
      list_questions_v1: {
        Args: {
          p_limit: number
          p_offset: number
          p_primary_channel: string
          p_status: string
        }
        Returns: Json
      }
      mark_notifications_read: {
        Args: { p_notification_ids?: string[] }
        Returns: number
      }
      normalize_channel: { Args: { p_value: string }; Returns: string }
      normalize_subcategory: {
        Args: { p_channel: string; p_value: string }
        Returns: string
      }
      recalculate_topic_discussions_count: {
        Args: { p_topic_id: string }
        Returns: undefined
      }
      recharge_points: {
        Args: { p_amount: number; p_payment_method?: string }
        Returns: undefined
      }
      record_audit_event: {
        Args: {
          p_entity_id?: string
          p_entity_type?: string
          p_event_type: string
          p_payload?: Json
          p_severity?: string
        }
        Returns: string
      }
      refresh_expert_follower_count: {
        Args: { p_expert_id: string }
        Returns: undefined
      }
      refresh_expert_service_count: {
        Args: { p_expert_id: string }
        Returns: undefined
      }
      refresh_post_engagement_counts: {
        Args: { p_post_id: string }
        Returns: undefined
      }
      refresh_question_answer_count: {
        Args: { p_question_id: string }
        Returns: undefined
      }
      reject_call_v1: {
        Args: { p_call_session_id: string; p_reason?: string }
        Returns: Json
      }
      reorder_person_experiences_v1: {
        Args: { p_experience_ids: string[] }
        Returns: number
      }
      review_content_report: {
        Args: {
          p_report_id: string
          p_resolution_note?: string
          p_status: string
        }
        Returns: boolean
      }
      search_app_content: {
        Args: { p_limit?: number; p_query: string }
        Returns: Json
      }
      search_app_content_v2: {
        Args: { p_limit?: number; p_query: string }
        Returns: Json
      }
      send_direct_message: {
        Args: {
          p_content: string
          p_message_type?: string
          p_receiver_id: string
        }
        Returns: string
      }
      set_answer_helpful_v1: {
        Args: { p_answer_id: string; p_is_helpful: boolean }
        Returns: Json
      }
      set_person_experience_visibility_v1: {
        Args: { p_experience_id: string; p_visibility: string }
        Returns: string
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      submit_content_report: {
        Args: {
          p_details?: string
          p_reason: string
          p_target_id: string
          p_target_type: string
        }
        Returns: string
      }
      transition_order_status_v2: {
        Args: { p_order_id: string; p_reason?: string; p_to_status: string }
        Returns: Json
      }
      update_experience_claim_v1: {
        Args: { p_claim_id: string; p_claim_type: string; p_value: string }
        Returns: string
      }
      update_experience_transition_v1: {
        Args: {
          p_from_label: string
          p_occurred_month: number
          p_occurred_year: number
          p_sort_order: number
          p_to_label: string
          p_transition_id: string
        }
        Returns: string
      }
      update_person_experience_v1: {
        Args: {
          p_can_share: string[]
          p_city: string
          p_city_code: string
          p_description: string
          p_end_month: number
          p_end_year: number
          p_experience_id: string
          p_is_current: boolean
          p_kind: string
          p_location_label: string
          p_sort_order: number
          p_start_month: number
          p_start_year: number
          p_title: string
          p_visibility: string
        }
        Returns: string
      }
      update_question_v1: {
        Args: {
          p_context: string
          p_deep_exchange_budget_max_cents: number
          p_primary_channel: string
          p_question_id: string
          p_title: string
          p_topic_ids: string[]
        }
        Returns: Json
      }
      upsert_app_config: {
        Args: { p_description?: string; p_key: string; p_value: Json }
        Returns: boolean
      }
      upsert_search_history: {
        Args: { p_query_text: string; p_query_type?: string }
        Returns: string
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
