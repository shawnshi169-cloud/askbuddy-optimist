// Generated from LOCAL Supabase schema by canonical-topic-v1-local-types.mjs. Do not edit.
// Topic additions only; NOT Production Database types or consumer authorization.
export type Json = string | number | boolean | null | {
    [key: string]: Json | undefined;
} | Json[];
export type CanonicalTopicDatabaseV1Local = { public: { Tables: {
canonical_topics_v1: {
    Row: {
        canonical_name: string;
        created_at: string;
        normalized_name: string | null;
        status: string;
        topic_id: string;
        updated_at: string;
    };
    Insert: {
        canonical_name: string;
        created_at?: string;
        normalized_name?: string | null;
        status?: string;
        topic_id?: string;
        updated_at?: string;
    };
    Update: {
        canonical_name?: string;
        created_at?: string;
        normalized_name?: string | null;
        status?: string;
        topic_id?: string;
        updated_at?: string;
    };
    Relationships: [
        {
            foreignKeyName: "canonical_topics_v1_name_term_fkey";
            columns: [
                "topic_id",
                "normalized_name"
            ];
            isOneToOne: true;
            referencedRelation: "canonical_topic_terms_v1";
            referencedColumns: [
                "topic_id",
                "normalized_term"
            ];
        }
    ];
};
canonical_topic_terms_v1: {
    Row: {
        normalized_term: string;
        term: string;
        topic_id: string;
    };
    Insert: {
        normalized_term?: string;
        term: string;
        topic_id: string;
    };
    Update: {
        normalized_term?: string;
        term?: string;
        topic_id?: string;
    };
    Relationships: [
        {
            foreignKeyName: "canonical_topic_terms_v1_topic_id_fkey";
            columns: [
                "topic_id"
            ];
            isOneToOne: false;
            referencedRelation: "canonical_topics_v1";
            referencedColumns: [
                "topic_id"
            ];
        }
    ];
};
question_topics_v1: {
    Row: {
        question_id: string;
        topic_id: string;
    };
    Insert: {
        question_id: string;
        topic_id: string;
    };
    Update: {
        question_id?: string;
        topic_id?: string;
    };
    Relationships: [
        {
            foreignKeyName: "question_topics_v1_question_id_fkey";
            columns: [
                "question_id"
            ];
            isOneToOne: false;
            referencedRelation: "questions_v1";
            referencedColumns: [
                "id"
            ];
        },
        {
            foreignKeyName: "question_topics_v1_topic_id_fkey";
            columns: [
                "topic_id"
            ];
            isOneToOne: false;
            referencedRelation: "canonical_topics_v1";
            referencedColumns: [
                "topic_id"
            ];
        }
    ];
};
experience_topics_v1: {
    Row: {
        experience_id: string;
        topic_id: string;
    };
    Insert: {
        experience_id: string;
        topic_id: string;
    };
    Update: {
        experience_id?: string;
        topic_id?: string;
    };
    Relationships: [
        {
            foreignKeyName: "experience_topics_v1_experience_id_fkey";
            columns: [
                "experience_id"
            ];
            isOneToOne: false;
            referencedRelation: "person_experiences";
            referencedColumns: [
                "id"
            ];
        },
        {
            foreignKeyName: "experience_topics_v1_topic_id_fkey";
            columns: [
                "topic_id"
            ];
            isOneToOne: false;
            referencedRelation: "canonical_topics_v1";
            referencedColumns: [
                "topic_id"
            ];
        }
    ];
};
}; Functions: {
resolve_canonical_topic_v1: {
    Args: {
        p_term: string;
    };
    Returns: Json;
};
get_experience_topics_v1: {
    Args: {
        p_experience_id: string;
    };
    Returns: Json;
};
set_experience_topics_v1: {
    Args: {
        p_experience_id: string;
        p_topic_ids: string[];
    };
    Returns: Json;
};
}; }; };
