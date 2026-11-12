export type TtsStatus = 'pending' | 'processing' | 'done' | 'error';
export type TtsSourceType = 'file' | 'document' | 'text';

export interface TtsAudio {
    id: number;
    title: string;
    source_type: TtsSourceType;
    source_name: string | null;
    voice: string;
    speed: number;
    status: TtsStatus;
    progress: number;
    char_count: number;
    duration_seconds: number | null;
    size_bytes: number | null;
    error_message: string | null;
    text_content: string;
    created_at: string;
}

export type TtsAudioListItem = Omit<TtsAudio, 'text_content'>;

export interface TtsVoice {
    id: string;
    name: string;
    language: string;
    gender: 'female' | 'male';
}

export interface TtsVoicesResponse {
    default_voice: string;
    voices: TtsVoice[];
}

/** Exactamente uno de `file`, `text` o `documentId` debe estar definido. */
export interface TtsCreateRequest {
    file?: File;
    text?: string;
    documentId?: number;
    title?: string;
    voice?: string;
    speed?: number;
    pageStart?: number | null;
    pageEnd?: number | null;
}
