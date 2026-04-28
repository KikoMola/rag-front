export type ConversationMode = 'general' | 'rag';

export interface ConversationCreate {
    title?: string;
    mode?: ConversationMode;
    collection_ids?: number[] | null;
}

export interface ConversationListItem {
    id: number;
    title: string;
    mode: ConversationMode;
    forked_from_id: number | null;
    created_at: string;
    updated_at: string;
}

export interface Message {
    id: number;
    conversation_id: number;
    role: 'user' | 'assistant';
    content: string;
    created_at: string;
}

export interface ConversationDetail extends ConversationListItem {
    collection_ids: number[] | null;
    forked_at_message_id: number | null;
    messages: Message[];
}

export interface ConversationForkRequest {
    message_id: number;
}

export interface ConversationForkResponse {
    id: number;
    title: string;
    forked_from_id: number;
    forked_at_message_id: number;
    message_count: number;
    created_at: string;
}

export interface Source {
    filename: string;
    chunk_index: number;
    excerpt: string;
}

export type ChatStreamEvent =
    | { type: 'thinking'; token: string }
    | { type: 'token'; token: string }
    | { type: 'sources'; sources: Source[] }
    | { type: 'done'; messageId: number }
    | { type: 'error'; error: string };
