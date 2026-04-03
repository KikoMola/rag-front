export interface Collection {
    id: number;
    name: string;
    description: string | null;
    created_at: string;
    document_count: number;
}

export interface CollectionCreate {
    name: string;
    description?: string | null;
}

export interface CollectionDocument {
    id: number;
    collection_id: number;
    filename: string;
    filepath: string;
    format: string;
    size_bytes: number;
    chunk_count: number;
    status: DocumentStatus;
    error_message: string | null;
    created_at: string;
}

export type DocumentStatus = 'pending' | 'processing' | 'indexed' | 'error';
