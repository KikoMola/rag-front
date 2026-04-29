import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { DashboardService, type DashboardData, type SearchCollectionResult } from './dashboard.service';

const API_BASE = 'http://localhost:8000/api';

describe('DashboardService', () => {
    let service: DashboardService;
    let httpTesting: HttpTestingController;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [provideHttpClient(), provideHttpClientTesting()],
        });
        service = TestBed.inject(DashboardService);
        httpTesting = TestBed.inject(HttpTestingController);
    });

    afterEach(() => {
        httpTesting.verify();
    });

    describe('getDashboard', () => {
        it('should GET dashboard data', () => {
            const mockData: DashboardData = {
                stats: { total_documents: 10, total_collections: 3, models: ['gpt-4'] },
                recent_documents: [
                    { id: 1, filename: 'doc.pdf', collection_name: 'Test', status: 'indexed', created_at: '2026-01-01' },
                ],
                recent_collections: [{ id: 1, name: 'Test', document_count: 5, created_at: '2026-01-01' }],
            };

            service.getDashboard().subscribe((result) => {
                expect(result).toEqual(mockData);
            });

            const req = httpTesting.expectOne(`${API_BASE}/dashboard`);
            expect(req.request.method).toBe('GET');
            req.flush(mockData);
        });
    });

    describe('searchCollections', () => {
        it('should GET with query param', () => {
            const mockResults: SearchCollectionResult[] = [
                { id: 1, name: 'Angular', description: null, document_count: 3, created_at: '2026-01-01' },
            ];

            service.searchCollections('angular').subscribe((result) => {
                expect(result).toEqual(mockResults);
            });

            const req = httpTesting.expectOne(`${API_BASE}/dashboard/search?q=angular`);
            expect(req.request.method).toBe('GET');
            expect(req.request.params.get('q')).toBe('angular');
            req.flush(mockResults);
        });

        it('should encode special characters in query', () => {
            service.searchCollections('hello world').subscribe();

            const req = httpTesting.expectOne((r) => r.url === `${API_BASE}/dashboard/search`);
            expect(req.request.params.get('q')).toBe('hello world');
            req.flush([]);
        });
    });
});
