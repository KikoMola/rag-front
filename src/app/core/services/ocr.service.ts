import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type { Observable } from 'rxjs';
import type { OcrDocument, OcrDocumentListItem } from '../models/ocr-document.model';

const API_BASE = 'http://localhost:8000/api/ocr';

@Injectable({ providedIn: 'root' })
export class OcrService {
    private readonly http = inject(HttpClient);

    getDocuments(): Observable<OcrDocumentListItem[]> {
        return this.http.get<OcrDocumentListItem[]>(`${API_BASE}/documents`);
    }

    getDocument(id: number): Observable<OcrDocument> {
        return this.http.get<OcrDocument>(`${API_BASE}/documents/${id}`);
    }

    uploadDocument(file: File): Observable<OcrDocumentListItem> {
        const formData = new FormData();
        formData.append('file', file);
        return this.http.post<OcrDocumentListItem>(`${API_BASE}/documents`, formData);
    }

    deleteDocument(id: number): Observable<void> {
        return this.http.delete<void>(`${API_BASE}/documents/${id}`);
    }
}
