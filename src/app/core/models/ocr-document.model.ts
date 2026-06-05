export type OcrStatus = 'pending' | 'processing' | 'done' | 'error';

export interface OcrDocument {
    id: number;
    filename: string;
    filepath: string;
    format: string;
    size_bytes: number;
    status: OcrStatus;
    error_message: string | null;
    markdown_content: string | null;
    created_at: string;
}

export type OcrDocumentListItem = Omit<OcrDocument, 'markdown_content'>;
