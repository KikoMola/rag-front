import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

const API_BASE = 'http://localhost:8000/api';

export interface DashboardStats {
    total_documents: number;
    total_collections: number;
    models: string[];
}

export interface RecentDocument {
    id: number;
    filename: string;
    collection_name: string;
    status: string;
    created_at: string;
}

export interface RecentCollection {
    id: number;
    name: string;
    document_count: number;
    created_at: string;
}

export interface DashboardData {
    stats: DashboardStats;
    recent_documents: RecentDocument[];
    recent_collections: RecentCollection[];
}

export interface SearchCollectionResult {
    id: number;
    name: string;
    description: string | null;
    document_count: number;
    created_at: string;
}

@Injectable({ providedIn: 'root' })
export class DashboardService {
    private readonly http = inject(HttpClient);

    getDashboard(): Observable<DashboardData> {
        return this.http.get<DashboardData>(`${API_BASE}/dashboard`);
    }

    searchCollections(q: string): Observable<SearchCollectionResult[]> {
        const params = new HttpParams().set('q', q);
        return this.http.get<SearchCollectionResult[]>(`${API_BASE}/dashboard/search`, { params });
    }
}
