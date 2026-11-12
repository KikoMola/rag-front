import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type { Observable } from 'rxjs';
import type { TtsAudio, TtsAudioListItem, TtsCreateRequest, TtsVoicesResponse } from '../models/tts-audio.model';

const API_BASE = 'http://localhost:8000/api/tts';

@Injectable({ providedIn: 'root' })
export class TtsService {
    private readonly http = inject(HttpClient);

    getVoices(): Observable<TtsVoicesResponse> {
        return this.http.get<TtsVoicesResponse>(`${API_BASE}/voices`);
    }

    getAudios(): Observable<TtsAudioListItem[]> {
        return this.http.get<TtsAudioListItem[]>(`${API_BASE}/audios`);
    }

    getAudio(id: number): Observable<TtsAudio> {
        return this.http.get<TtsAudio>(`${API_BASE}/audios/${id}`);
    }

    createAudio(request: TtsCreateRequest): Observable<TtsAudioListItem> {
        const formData = new FormData();
        if (request.file) formData.append('file', request.file);
        if (request.text) formData.append('text', request.text);
        if (request.documentId != null) formData.append('document_id', String(request.documentId));
        if (request.title) formData.append('title', request.title);
        if (request.voice) formData.append('voice', request.voice);
        if (request.speed != null) formData.append('speed', String(request.speed));
        if (request.pageStart != null) formData.append('page_start', String(request.pageStart));
        if (request.pageEnd != null) formData.append('page_end', String(request.pageEnd));
        return this.http.post<TtsAudioListItem>(`${API_BASE}/audios`, formData);
    }

    deleteAudio(id: number): Observable<void> {
        return this.http.delete<void>(`${API_BASE}/audios/${id}`);
    }

    /** URL del MP3, para usar directamente en un `<audio>` o en un enlace de descarga. */
    fileUrl(id: number, download = false): string {
        return `${API_BASE}/audios/${id}/file${download ? '?download=true' : ''}`;
    }
}
