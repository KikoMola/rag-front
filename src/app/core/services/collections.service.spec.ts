import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { CollectionsService } from './collections.service';
import type { Collection, CollectionCreate, CollectionDocument } from '../models/collection.model';

const API_BASE = 'http://localhost:8000/api/knowledge';

describe('CollectionsService', () => {
    let service: CollectionsService;
    let httpTesting: HttpTestingController;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [provideHttpClient(), provideHttpClientTesting()],
        });
        service = TestBed.inject(CollectionsService);
        httpTesting = TestBed.inject(HttpTestingController);
    });

    afterEach(() => {
        httpTesting.verify();
    });

    // ─── Collections ────────────────────────────────────────────────

    describe('getCollections', () => {
        it('should GET all collections', () => {
            const mockCollections: Collection[] = [
                { id: 1, name: 'Test', description: null, created_at: '2026-01-01', document_count: 0 },
            ];

            service.getCollections().subscribe((result) => {
                expect(result).toEqual(mockCollections);
            });

            const req = httpTesting.expectOne(`${API_BASE}/collections`);
            expect(req.request.method).toBe('GET');
            req.flush(mockCollections);
        });
    });

    describe('createCollection', () => {
        it('should POST a new collection', () => {
            const body: CollectionCreate = { name: 'New Collection', description: 'A test' };
            const mockResponse: Collection = {
                id: 2,
                name: 'New Collection',
                description: 'A test',
                created_at: '2026-01-01',
                document_count: 0,
            };

            service.createCollection(body).subscribe((result) => {
                expect(result).toEqual(mockResponse);
            });

            const req = httpTesting.expectOne(`${API_BASE}/collections`);
            expect(req.request.method).toBe('POST');
            expect(req.request.body).toEqual(body);
            req.flush(mockResponse);
        });
    });

    describe('deleteCollection', () => {
        it('should DELETE a collection by id', () => {
            service.deleteCollection(5).subscribe();

            const req = httpTesting.expectOne(`${API_BASE}/collections/5`);
            expect(req.request.method).toBe('DELETE');
            req.flush(null);
        });
    });

    // ─── Documents ──────────────────────────────────────────────────

    describe('getDocuments', () => {
        it('should GET documents for a collection', () => {
            const mockDocs: CollectionDocument[] = [
                {
                    id: 1,
                    collection_id: 3,
                    filename: 'doc.pdf',
                    filepath: '/files/doc.pdf',
                    format: 'pdf',
                    size_bytes: 1024,
                    chunk_count: 10,
                    status: 'indexed',
                    error_message: null,
                    created_at: '2026-01-01',
                },
            ];

            service.getDocuments(3).subscribe((result) => {
                expect(result).toEqual(mockDocs);
            });

            const req = httpTesting.expectOne(`${API_BASE}/collections/3/documents`);
            expect(req.request.method).toBe('GET');
            req.flush(mockDocs);
        });
    });

    describe('getDocumentStatus', () => {
        it('should GET a single document status', () => {
            const mockDoc: CollectionDocument = {
                id: 7,
                collection_id: 3,
                filename: 'doc.pdf',
                filepath: '/files/doc.pdf',
                format: 'pdf',
                size_bytes: 2048,
                chunk_count: 5,
                status: 'processing',
                error_message: null,
                created_at: '2026-01-01',
            };

            service.getDocumentStatus(3, 7).subscribe((result) => {
                expect(result).toEqual(mockDoc);
            });

            const req = httpTesting.expectOne(`${API_BASE}/collections/3/documents/7`);
            expect(req.request.method).toBe('GET');
            req.flush(mockDoc);
        });
    });

    describe('uploadDocuments', () => {
        it('should POST files as FormData', () => {
            const file1 = new File(['content1'], 'file1.txt', { type: 'text/plain' });
            const file2 = new File(['content2'], 'file2.txt', { type: 'text/plain' });
            const mockResponse: CollectionDocument[] = [];

            service.uploadDocuments(3, [file1, file2]).subscribe((result) => {
                expect(result).toEqual(mockResponse);
            });

            const req = httpTesting.expectOne(`${API_BASE}/collections/3/documents`);
            expect(req.request.method).toBe('POST');
            expect(req.request.body).toBeInstanceOf(FormData);

            const formData = req.request.body as FormData;
            const files = formData.getAll('files');
            expect(files).toHaveLength(2);

            req.flush(mockResponse);
        });
    });

    describe('deleteDocument', () => {
        it('should DELETE a document by collection and document id', () => {
            service.deleteDocument(3, 7).subscribe();

            const req = httpTesting.expectOne(`${API_BASE}/collections/3/documents/7`);
            expect(req.request.method).toBe('DELETE');
            req.flush(null);
        });
    });
});
