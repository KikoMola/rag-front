import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { RouterModule } from '@angular/router';
import { OcrList } from './ocr-list';
import type { OcrDocumentListItem } from '../../core/models/ocr-document.model';

const API_BASE = 'http://localhost:8000/api/ocr';

const mockDocs: OcrDocumentListItem[] = [
    { id: 1, filename: 'factura.jpg', filepath: 'data/ocr_uploads/factura.jpg', format: 'jpg', size_bytes: 20480, page_count: 1, status: 'done', error_message: null, thumbnail_b64: null, created_at: '2026-01-10T10:00:00Z' },
    { id: 2, filename: 'contrato.pdf', filepath: 'data/ocr_uploads/contrato.pdf', format: 'pdf', size_bytes: 102400, page_count: 3, status: 'pending', error_message: null, thumbnail_b64: null, created_at: '2026-01-11T12:00:00Z' },
];

describe('OcrList', () => {
    let httpTesting: HttpTestingController;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [OcrList, RouterModule.forRoot([])],
            providers: [provideHttpClient(), provideHttpClientTesting()],
        }).compileComponents();
        httpTesting = TestBed.inject(HttpTestingController);
    });

    afterEach(() => httpTesting.verify());

    it('should render the document grid on load', () => {
        const fixture = TestBed.createComponent(OcrList);
        fixture.detectChanges();

        const req = httpTesting.expectOne(`${API_BASE}/documents`);
        req.flush(mockDocs);
        fixture.detectChanges();

        const articles = fixture.nativeElement.querySelectorAll('article');
        expect(articles.length).toBe(2);
    });

    it('should show empty state when no documents', () => {
        const fixture = TestBed.createComponent(OcrList);
        fixture.detectChanges();

        const req = httpTesting.expectOne(`${API_BASE}/documents`);
        req.flush([]);
        fixture.detectChanges();

        expect(fixture.nativeElement.textContent).toContain('Sin documentos OCR');
    });
});
