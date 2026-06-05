import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { RouterModule, ActivatedRoute, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { OcrDetail } from './ocr-detail';
import type { OcrDocument } from '../../core/models/ocr-document.model';

const API_BASE = 'http://localhost:8000/api/ocr';

const mockDoc: OcrDocument = {
    id: 1,
    filename: 'factura.jpg',
    filepath: 'data/ocr_uploads/factura.jpg',
    format: 'jpg',
    size_bytes: 20480,
    status: 'done',
    error_message: null,
    markdown_content: '# Factura\n\nTotal: 100€',
    created_at: '2026-01-10T10:00:00Z',
};

describe('OcrDetail', () => {
    let httpTesting: HttpTestingController;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [OcrDetail, RouterModule.forRoot([])],
            providers: [
                provideHttpClient(),
                provideHttpClientTesting(),
                {
                    provide: ActivatedRoute,
                    useValue: { snapshot: { paramMap: convertToParamMap({ id: '1' }) } },
                },
            ],
        }).compileComponents();
        httpTesting = TestBed.inject(HttpTestingController);
    });

    afterEach(() => httpTesting.verify());

    it('should display document filename when loaded', fakeAsync(() => {
        const fixture = TestBed.createComponent(OcrDetail);
        fixture.detectChanges();

        const req = httpTesting.expectOne(`${API_BASE}/documents/1`);
        req.flush(mockDoc);
        tick();
        fixture.detectChanges();

        expect(fixture.nativeElement.textContent).toContain('factura.jpg');
    }));

    it('should render markdown content when status is done', fakeAsync(() => {
        const fixture = TestBed.createComponent(OcrDetail);
        fixture.detectChanges();

        const req = httpTesting.expectOne(`${API_BASE}/documents/1`);
        req.flush(mockDoc);
        tick();
        fixture.detectChanges();

        const prose = fixture.nativeElement.querySelector('.prose');
        expect(prose).toBeTruthy();
    }));
});
