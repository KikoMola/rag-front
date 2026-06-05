import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { OcrService } from './ocr.service';
import type { OcrDocument, OcrDocumentListItem } from '../models/ocr-document.model';

const API_BASE = 'http://localhost:8000/api/ocr';

const mockList: OcrDocumentListItem[] = [
    { id: 1, filename: 'doc.jpg', filepath: 'data/ocr_uploads/doc.jpg', format: 'jpg', size_bytes: 12345, status: 'done', error_message: null, created_at: '2026-01-01T10:00:00Z' },
];

const mockDoc: OcrDocument = { ...mockList[0], markdown_content: '# Hello\n\nWorld' };

describe('OcrService', () => {
    let service: OcrService;
    let httpTesting: HttpTestingController;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [provideHttpClient(), provideHttpClientTesting()],
        });
        service = TestBed.inject(OcrService);
        httpTesting = TestBed.inject(HttpTestingController);
    });

    afterEach(() => httpTesting.verify());

    it('should list documents', () => {
        let result: OcrDocumentListItem[] | undefined;
        service.getDocuments().subscribe((r) => (result = r));
        const req = httpTesting.expectOne(`${API_BASE}/documents`);
        expect(req.request.method).toBe('GET');
        req.flush(mockList);
        expect(result).toEqual(mockList);
    });

    it('should get a single document', () => {
        let result: OcrDocument | undefined;
        service.getDocument(1).subscribe((r) => (result = r));
        const req = httpTesting.expectOne(`${API_BASE}/documents/1`);
        expect(req.request.method).toBe('GET');
        req.flush(mockDoc);
        expect(result).toEqual(mockDoc);
    });

    it('should upload a document', () => {
        const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' });
        let result: OcrDocumentListItem | undefined;
        service.uploadDocument(file).subscribe((r) => (result = r));
        const req = httpTesting.expectOne(`${API_BASE}/documents`);
        expect(req.request.method).toBe('POST');
        req.flush(mockList[0]);
        expect(result).toEqual(mockList[0]);
    });

    it('should delete a document', () => {
        let completed = false;
        service.deleteDocument(1).subscribe({ complete: () => (completed = true) });
        const req = httpTesting.expectOne(`${API_BASE}/documents/1`);
        expect(req.request.method).toBe('DELETE');
        req.flush(null);
        expect(completed).toBeTrue();
    });
});
