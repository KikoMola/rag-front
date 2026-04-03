import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import type { Collection, CollectionCreate, CollectionDocument } from '../models/collection.model';

const API_BASE = 'http://localhost:8000/api/knowledge';

@Injectable({ providedIn: 'root' })
export class CollectionsService {
  private readonly http = inject(HttpClient);

  // ─── Collections ────────────────────────────────────────────────

  getCollections(): Observable<Collection[]> {
    return this.http.get<Collection[]>(`${API_BASE}/collections`);
  }

  createCollection(body: CollectionCreate): Observable<Collection> {
    return this.http.post<Collection>(`${API_BASE}/collections`, body);
  }

  deleteCollection(id: number): Observable<void> {
    return this.http.delete<void>(`${API_BASE}/collections/${id}`);
  }

  // ─── Documents ──────────────────────────────────────────────────

  getDocuments(collectionId: number): Observable<CollectionDocument[]> {
    return this.http.get<CollectionDocument[]>(
      `${API_BASE}/collections/${collectionId}/documents`
    );
  }

  getDocumentStatus(collectionId: number, documentId: number): Observable<CollectionDocument> {
    return this.http.get<CollectionDocument>(
      `${API_BASE}/collections/${collectionId}/documents/${documentId}`
    );
  }

  uploadDocuments(collectionId: number, files: File[]): Observable<CollectionDocument[]> {
    const formData = new FormData();
    for (const file of files) {
      formData.append('files', file);
    }
    return this.http.post<CollectionDocument[]>(
      `${API_BASE}/collections/${collectionId}/documents`,
      formData
    );
  }

  deleteDocument(collectionId: number, documentId: number): Observable<void> {
    return this.http.delete<void>(
      `${API_BASE}/collections/${collectionId}/documents/${documentId}`
    );
  }
}
