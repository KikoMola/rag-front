import { TestBed } from '@angular/core/testing';
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
    page_count: 1,
    status: 'done',
    error_message: null,
    markdown_content: '# Factura\n\nTotal: 100€',
    thumbnail_b64: null,
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

    it('should display document filename when loaded', async () => {
        const fixture = TestBed.createComponent(OcrDetail);
        fixture.detectChanges();

        const req = httpTesting.expectOne(`${API_BASE}/documents/1`);
        req.flush(mockDoc);

        await fixture.whenStable();
        fixture.detectChanges();

        expect(fixture.nativeElement.textContent).toContain('factura.jpg');
    });

    it('should render markdown content when status is done', async () => {
        const fixture = TestBed.createComponent(OcrDetail);
        fixture.detectChanges();

        const req = httpTesting.expectOne(`${API_BASE}/documents/1`);
        req.flush(mockDoc);

        await fixture.whenStable();
        fixture.detectChanges();

        const prose = fixture.nativeElement.querySelector('.prose');
        expect(prose).toBeTruthy();
    });

    async function loaded() {
        const fixture = TestBed.createComponent(OcrDetail);
        fixture.detectChanges();
        httpTesting.expectOne(`${API_BASE}/documents/1`).flush(mockDoc);
        await fixture.whenStable();
        fixture.detectChanges();
        return fixture;
    }

    it('should show the raw Markdown in its own tab', async () => {
        const fixture = await loaded();
        const tabs = [...fixture.nativeElement.querySelectorAll('[role="tab"]')] as HTMLButtonElement[];
        expect(tabs.map((t) => t.textContent!.trim())).toEqual(['Vista previa', 'Markdown']);
        expect(fixture.nativeElement.querySelector('pre').textContent).toContain('# Factura');
    });

    it('should queue an audio with the extracted text', async () => {
        const fixture = await loaded();
        fixture.componentInstance.generateAudio();
        const req = httpTesting.expectOne('http://localhost:8000/api/tts/audios');
        const body = req.request.body as FormData;
        expect(body.get('text')).toBe(mockDoc.markdown_content);
        expect(body.get('title')).toBe('factura');
        req.flush({});
        expect(fixture.componentInstance.generatingAudio()).toBe(false);
    });

    it('should add the extracted text to a collection as a Markdown file', async () => {
        const fixture = await loaded();
        const component = fixture.componentInstance;
        component.loadCollections();
        httpTesting
            .expectOne('http://localhost:8000/api/knowledge/collections')
            .flush([{ id: 7, name: 'Facturas', description: null, created_at: '2026-01-01', document_count: 0 }]);

        const close = vi.fn();
        component.addToCollection(component.collections()![0], close);
        const req = httpTesting.expectOne('http://localhost:8000/api/knowledge/collections/7/documents');
        const file = (req.request.body as FormData).getAll('files')[0] as File;
        expect(file.name).toBe('factura.md');
        req.flush([]);
        expect(close).toHaveBeenCalled();
        expect(component.addingTo()).toBeNull();
    });
});
