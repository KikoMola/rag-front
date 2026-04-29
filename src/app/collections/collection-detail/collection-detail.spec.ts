import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CollectionDetail } from './collection-detail';
import type { Collection, CollectionDocument } from '../../core/models/collection.model';

const API_BASE = 'http://localhost:8000/api/knowledge';

const mockCollections: Collection[] = [
    { id: 5, name: 'Test Collection', description: 'A test', created_at: '2026-01-01', document_count: 2 },
];

const mockDocuments: CollectionDocument[] = [
    {
        id: 1, collection_id: 5, filename: 'doc.pdf', filepath: '/files/doc.pdf',
        format: 'pdf', size_bytes: 1048576, chunk_count: 20, status: 'indexed',
        error_message: null, created_at: '2026-01-01',
    },
    {
        id: 2, collection_id: 5, filename: 'readme.md', filepath: '/files/readme.md',
        format: 'md', size_bytes: 512, chunk_count: 2, status: 'processing',
        error_message: null, created_at: '2026-01-02',
    },
];

const mockRoute = { snapshot: { paramMap: { get: (_key: string): string | null => '5' } } };

function setRouteId(id: string | null) {
    mockRoute.snapshot.paramMap.get = () => id;
}

describe('CollectionDetail', () => {
    let httpTesting: HttpTestingController;

    beforeEach(async () => {
        setRouteId('5');
        await TestBed.configureTestingModule({
            imports: [CollectionDetail, RouterModule.forRoot([])],
            providers: [
                provideHttpClient(),
                provideHttpClientTesting(),
                { provide: ActivatedRoute, useValue: mockRoute },
            ],
        }).compileComponents();
        httpTesting = TestBed.inject(HttpTestingController);
    });

    afterEach(() => {
        httpTesting.verify();
    });

    function createFixture() {
        return TestBed.createComponent(CollectionDetail);
    }

    function initWithData(fixture: ReturnType<typeof createFixture>) {
        fixture.detectChanges();
        httpTesting.expectOne(`${API_BASE}/collections`).flush(mockCollections);
        httpTesting.expectOne(`${API_BASE}/collections/5/documents`).flush(mockDocuments);
        fixture.detectChanges();
    }

    it('should create', () => {
        const fixture = createFixture();
        fixture.detectChanges();
        expect(fixture.componentInstance).toBeTruthy();
        httpTesting.expectOne(`${API_BASE}/collections`).flush(mockCollections);
        httpTesting.expectOne(`${API_BASE}/collections/5/documents`).flush([]);
    });

    it('should redirect when no id in route', () => {
        setRouteId(null);
        const router = TestBed.inject(Router);
        vi.spyOn(router, 'navigate');

        const fixture = createFixture();
        fixture.detectChanges();

        expect(router.navigate).toHaveBeenCalledWith(['/collections']);
    });

    it('should redirect when id is 0', () => {
        setRouteId('0');
        const router = TestBed.inject(Router);
        vi.spyOn(router, 'navigate');

        const fixture = createFixture();
        fixture.detectChanges();

        expect(router.navigate).toHaveBeenCalledWith(['/collections']);
    });

    it('should load collection and documents', () => {
        const fixture = createFixture();
        initWithData(fixture);

        expect(fixture.componentInstance.collection()?.name).toBe('Test Collection');
        expect(fixture.componentInstance.documents()).toHaveLength(2);
        expect(fixture.componentInstance.loading()).toBe(false);
    });

    it('should handle collection not found', () => {
        const fixture = createFixture();
        fixture.detectChanges();

        httpTesting.expectOne(`${API_BASE}/collections`).flush([]);
        fixture.detectChanges();

        expect(fixture.componentInstance.collection()).toBeNull();
        expect(fixture.componentInstance.loading()).toBe(false);
    });

    it('should handle loadData error', () => {
        const fixture = createFixture();
        fixture.detectChanges();

        httpTesting.expectOne(`${API_BASE}/collections`).error(new ProgressEvent('error'));
        fixture.detectChanges();

        expect(fixture.componentInstance.loading()).toBe(false);
    });

    it('should compute totalSize', () => {
        const fixture = createFixture();
        initWithData(fixture);

        expect(fixture.componentInstance.totalSize()).toBeTruthy();
        expect(typeof fixture.componentInstance.totalSize()).toBe('string');
    });

    it('should compute indexedCount', () => {
        const fixture = createFixture();
        initWithData(fixture);
        expect(fixture.componentInstance.indexedCount()).toBe(1);
    });

    it('should compute totalChunks', () => {
        const fixture = createFixture();
        initWithData(fixture);
        expect(fixture.componentInstance.totalChunks()).toBe(22);
    });

    it('should return correct format icons', () => {
        const fixture = createFixture();
        initWithData(fixture);

        const component = fixture.componentInstance;
        expect(component.getFormatIcon('pdf')).toBeTruthy();
        expect(component.getFormatIcon('txt')).toBeTruthy();
        expect(component.getFormatIcon('md')).toBeTruthy();
        expect(component.getFormatIcon('docx')).toBeTruthy();
        expect(component.getFormatIcon('html')).toBeTruthy();
        expect(component.getFormatIcon('epub')).toBeTruthy();
        // Unknown format should fall back to LucideFileText
        expect(component.getFormatIcon('xyz')).toBeTruthy();
    });

    it('should return correct status labels', () => {
        const fixture = createFixture();
        initWithData(fixture);

        const component = fixture.componentInstance;
        expect(component.getStatusLabel('pending')).toBe('Pendiente');
        expect(component.getStatusLabel('processing')).toBe('Procesando');
        expect(component.getStatusLabel('indexed')).toBe('Indexado');
        expect(component.getStatusLabel('error')).toBe('Error');
    });

    it('should handle drag events', () => {
        const fixture = createFixture();
        initWithData(fixture);

        const dragEvent = { preventDefault: vi.fn() } as unknown as DragEvent;
        fixture.componentInstance.onDragOver(dragEvent);
        expect(dragEvent.preventDefault).toHaveBeenCalled();
        expect(fixture.componentInstance.dragging()).toBe(true);

        fixture.componentInstance.onDragLeave();
        expect(fixture.componentInstance.dragging()).toBe(false);
    });

    it('should handle drop with files', () => {
        const fixture = createFixture();
        initWithData(fixture);

        const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
        const dropEvent = {
            preventDefault: vi.fn(),
            dataTransfer: { files: [file] as unknown as FileList },
        } as unknown as DragEvent;

        fixture.componentInstance.onDrop(dropEvent);
        expect(dropEvent.preventDefault).toHaveBeenCalled();
        expect(fixture.componentInstance.dragging()).toBe(false);
        expect(fixture.componentInstance.uploading()).toBe(true);

        httpTesting.expectOne(`${API_BASE}/collections/5/documents`).flush([]);
        fixture.detectChanges();
        expect(fixture.componentInstance.uploading()).toBe(false);
    });

    it('should handle drop without files', () => {
        const fixture = createFixture();
        initWithData(fixture);

        const dropEvent = {
            preventDefault: vi.fn(),
            dataTransfer: null,
        } as unknown as DragEvent;

        fixture.componentInstance.onDrop(dropEvent);
        expect(fixture.componentInstance.uploading()).toBe(false);
    });

    it('should upload files via onFileSelect', () => {
        const fixture = createFixture();
        initWithData(fixture);

        const file = new File(['content'], 'test.pdf');
        const input = { files: [file] as unknown as FileList } as HTMLInputElement;

        fixture.componentInstance.onFileSelect({ target: input } as unknown as Event);

        httpTesting.expectOne(`${API_BASE}/collections/5/documents`).flush([]);
        fixture.detectChanges();
        expect(fixture.componentInstance.uploading()).toBe(false);
    });

    it('should not upload when no files selected', () => {
        const fixture = createFixture();
        initWithData(fixture);

        const input = document.createElement('input');
        input.type = 'file';

        fixture.componentInstance.onFileSelect({ target: input } as unknown as Event);
        expect(fixture.componentInstance.uploading()).toBe(false);
    });

    it('should handle upload error', () => {
        const fixture = createFixture();
        initWithData(fixture);

        fixture.componentInstance.uploadFiles([new File(['x'], 'test.pdf')]);
        httpTesting.expectOne(`${API_BASE}/collections/5/documents`).error(new ProgressEvent('error'));
        fixture.detectChanges();

        expect(fixture.componentInstance.uploading()).toBe(false);
    });

    it('should prepend uploaded documents', () => {
        const fixture = createFixture();
        initWithData(fixture);

        const newDoc: CollectionDocument = {
            id: 10, collection_id: 5, filename: 'new.pdf', filepath: '/new.pdf',
            format: 'pdf', size_bytes: 100, chunk_count: 1, status: 'pending',
            error_message: null, created_at: '2026-01-10',
        };

        fixture.componentInstance.uploadFiles([new File(['x'], 'new.pdf')]);
        httpTesting.expectOne(`${API_BASE}/collections/5/documents`).flush([newDoc]);
        fixture.detectChanges();

        expect(fixture.componentInstance.documents()[0].id).toBe(10);
    });

    it('should request delete document', () => {
        const fixture = createFixture();
        initWithData(fixture);

        const event = new MouseEvent('click');
        vi.spyOn(event, 'stopPropagation');

        fixture.componentInstance.requestDeleteDocument(event, 1);
        expect(event.stopPropagation).toHaveBeenCalled();
        expect(fixture.componentInstance.pendingDeleteDocId()).toBe(1);
    });

    it('should compute pendingDeleteDoc', () => {
        const fixture = createFixture();
        initWithData(fixture);

        expect(fixture.componentInstance.pendingDeleteDoc()).toBeUndefined();
        fixture.componentInstance.pendingDeleteDocId.set(1);
        expect(fixture.componentInstance.pendingDeleteDoc()?.id).toBe(1);
    });

    it('should confirm delete document', () => {
        const fixture = createFixture();
        initWithData(fixture);
        const closeSpy = vi.fn();

        fixture.componentInstance.pendingDeleteDocId.set(1);
        fixture.componentInstance.confirmDeleteDocument(closeSpy);

        expect(closeSpy).toHaveBeenCalled();
        expect(fixture.componentInstance.deletingDoc()).toBe(1);

        httpTesting.expectOne(`${API_BASE}/collections/5/documents/1`).flush(null);
        fixture.detectChanges();

        expect(fixture.componentInstance.documents()).toHaveLength(1);
        expect(fixture.componentInstance.deletingDoc()).toBeNull();
    });

    it('should not confirm delete without pending docId', () => {
        const fixture = createFixture();
        initWithData(fixture);
        const closeSpy = vi.fn();

        fixture.componentInstance.confirmDeleteDocument(closeSpy);
        expect(closeSpy).not.toHaveBeenCalled();
    });

    it('should handle confirm delete document error', () => {
        const fixture = createFixture();
        initWithData(fixture);
        const closeSpy = vi.fn();

        fixture.componentInstance.pendingDeleteDocId.set(1);
        fixture.componentInstance.confirmDeleteDocument(closeSpy);

        httpTesting.expectOne(`${API_BASE}/collections/5/documents/1`).error(new ProgressEvent('error'));
        fixture.detectChanges();

        expect(fixture.componentInstance.deletingDoc()).toBeNull();
        expect(fixture.componentInstance.pendingDeleteDocId()).toBeNull();
    });

    it('should delete document directly', () => {
        const fixture = createFixture();
        initWithData(fixture);

        const event = new MouseEvent('click');
        vi.spyOn(event, 'stopPropagation');

        fixture.componentInstance.deleteDocument(event, 1);
        expect(event.stopPropagation).toHaveBeenCalled();

        httpTesting.expectOne(`${API_BASE}/collections/5/documents/1`).flush(null);
        fixture.detectChanges();

        expect(fixture.componentInstance.documents()).toHaveLength(1);
        expect(fixture.componentInstance.deletingDoc()).toBeNull();
    });

    it('should handle direct delete document error', () => {
        const fixture = createFixture();
        initWithData(fixture);

        const event = new MouseEvent('click');
        fixture.componentInstance.deleteDocument(event, 1);

        httpTesting.expectOne(`${API_BASE}/collections/5/documents/1`).error(new ProgressEvent('error'));
        fixture.detectChanges();

        expect(fixture.componentInstance.deletingDoc()).toBeNull();
    });

    it('should format bytes correctly', () => {
        const fixture = createFixture();
        initWithData(fixture);

        expect(fixture.componentInstance.formatBytes(0)).toBe('0 B');
        expect(fixture.componentInstance.formatBytes(512)).toBe('512.0 B');
        expect(fixture.componentInstance.formatBytes(1024)).toBe('1.0 KB');
        expect(fixture.componentInstance.formatBytes(1048576)).toBe('1.0 MB');
        expect(fixture.componentInstance.formatBytes(1073741824)).toBe('1.0 GB');
    });

    it('should poll processing documents', () => {
        vi.useFakeTimers();
        const fixture = createFixture();
        fixture.detectChanges();

        httpTesting.expectOne(`${API_BASE}/collections`).flush(mockCollections);

        const docsWithProcessing: CollectionDocument[] = [
            { ...mockDocuments[1], status: 'processing' },
        ];
        httpTesting.expectOne(`${API_BASE}/collections/5/documents`).flush(docsWithProcessing);
        fixture.detectChanges();

        vi.advanceTimersByTime(3000);

        const statusReq = httpTesting.expectOne(`${API_BASE}/collections/5/documents/2`);
        statusReq.flush({ ...mockDocuments[1], status: 'indexed' });
        fixture.detectChanges();

        expect(fixture.componentInstance.documents()[0].status).toBe('indexed');
        vi.useRealTimers();
    });

    it('should trigger file picker via openFilePicker', () => {
        const fixture = createFixture();
        initWithData(fixture);

        // The viewChild will be null in test since template rendering may be limited,
        // but we test the method doesn't throw
        expect(() => fixture.componentInstance.openFilePicker()).not.toThrow();
    });

    it('should render empty documents state', () => {
        const fixture = createFixture();
        fixture.detectChanges();
        httpTesting.expectOne(`${API_BASE}/collections`).flush(mockCollections);
        httpTesting.expectOne(`${API_BASE}/collections/5/documents`).flush([]);
        fixture.detectChanges();

        const html = fixture.nativeElement.innerHTML;
        expect(html).toContain('No hay documentos');
    });

    it('should render document table with all statuses', () => {
        const allStatusDocs: CollectionDocument[] = [
            { id: 1, collection_id: 5, filename: 'a.pdf', filepath: '/a.pdf', format: 'pdf', size_bytes: 1024, chunk_count: 5, status: 'indexed', error_message: null, created_at: '2026-01-01' },
            { id: 2, collection_id: 5, filename: 'b.txt', filepath: '/b.txt', format: 'txt', size_bytes: 512, chunk_count: 0, status: 'processing', error_message: null, created_at: '2026-01-01' },
            { id: 3, collection_id: 5, filename: 'c.md', filepath: '/c.md', format: 'md', size_bytes: 256, chunk_count: 0, status: 'pending', error_message: null, created_at: '2026-01-01' },
            { id: 4, collection_id: 5, filename: 'd.html', filepath: '/d.html', format: 'html', size_bytes: 100, chunk_count: 0, status: 'error', error_message: 'Parse failed', created_at: '2026-01-01' },
        ];

        const fixture = createFixture();
        fixture.detectChanges();
        httpTesting.expectOne(`${API_BASE}/collections`).flush(mockCollections);
        httpTesting.expectOne(`${API_BASE}/collections/5/documents`).flush(allStatusDocs);
        fixture.detectChanges();

        const html = fixture.nativeElement.innerHTML;
        expect(html).toContain('Indexado');
        expect(html).toContain('Procesando');
        expect(html).toContain('Pendiente');
        expect(html).toContain('Error');
        expect(html).toContain('a.pdf');
    });

    it('should render description card when collection has description', () => {
        const fixture = createFixture();
        fixture.detectChanges();
        httpTesting.expectOne(`${API_BASE}/collections`).flush(mockCollections);
        httpTesting.expectOne(`${API_BASE}/collections/5/documents`).flush(mockDocuments);
        fixture.detectChanges();

        const html = fixture.nativeElement.innerHTML;
        expect(html).toContain('A test');
    });

    it('should render uploading state in drop zone', () => {
        const fixture = createFixture();
        initWithData(fixture);
        fixture.componentInstance.uploading.set(true);
        fixture.detectChanges();

        const html = fixture.nativeElement.innerHTML;
        expect(html).toContain('Subiendo archivos');
    });

    it('should render dragging state in drop zone', () => {
        const fixture = createFixture();
        initWithData(fixture);
        fixture.componentInstance.dragging.set(true);
        fixture.detectChanges();

        const html = fixture.nativeElement.innerHTML;
        expect(html).toContain('Suelta los archivos aquí');
    });

    it('should render deletingDoc spinner in document row', () => {
        const fixture = createFixture();
        initWithData(fixture);
        fixture.componentInstance.deletingDoc.set(1);
        fixture.detectChanges();

        const deleteButtons = fixture.nativeElement.querySelectorAll('[aria-label="Eliminar documento"]');
        expect(deleteButtons.length).toBeGreaterThan(0);
        // First button should be disabled since deletingDoc matches doc id 1
        expect(deleteButtons[0].disabled).toBe(true);
    });

    it('should click dragover zone through template', () => {
        const fixture = createFixture();
        initWithData(fixture);

        const dropZone = fixture.nativeElement.querySelector('[style="border: 2px dashed;"]');
        expect(dropZone).toBeTruthy();
        dropZone.click();
        fixture.detectChanges();
    });

    it('should trigger file select through header label', () => {
        const fixture = createFixture();
        initWithData(fixture);

        const fileInputs: NodeListOf<HTMLInputElement> = fixture.nativeElement.querySelectorAll('input[type="file"]');
        expect(fileInputs.length).toBeGreaterThanOrEqual(1);
    });



    it('should continue polling when status is still processing', () => {
        vi.useFakeTimers();
        const fixture = createFixture();
        fixture.detectChanges();

        httpTesting.expectOne(`${API_BASE}/collections`).flush(mockCollections);
        httpTesting.expectOne(`${API_BASE}/collections/5/documents`).flush([
            { ...mockDocuments[1], status: 'processing' },
        ]);
        fixture.detectChanges();

        // First poll
        vi.advanceTimersByTime(3000);
        httpTesting.expectOne(`${API_BASE}/collections/5/documents/2`).flush({ ...mockDocuments[1], status: 'processing' });
        fixture.detectChanges();

        // Second poll (recursive)
        vi.advanceTimersByTime(3000);
        httpTesting.expectOne(`${API_BASE}/collections/5/documents/2`).flush({ ...mockDocuments[1], status: 'indexed' });
        fixture.detectChanges();

        vi.useRealTimers();
    });
});
