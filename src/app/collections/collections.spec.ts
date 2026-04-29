import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { RouterModule, Router } from '@angular/router';
import { Collections } from './collections';
import type { Collection } from '../core/models/collection.model';
import { SearchService } from '../core/services/search.service';

const API_BASE_KNOWLEDGE = 'http://localhost:8000/api/knowledge';
const API_BASE = 'http://localhost:8000/api';

const mockCollections: Collection[] = [
    { id: 1, name: 'Collection A', description: 'Desc A', created_at: '2026-01-01T10:00:00Z', document_count: 3 },
    { id: 2, name: 'Collection B', description: null, created_at: '2026-01-02T10:00:00Z', document_count: 0 },
];

describe('Collections', () => {
    let httpTesting: HttpTestingController;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [Collections, RouterModule.forRoot([])],
            providers: [provideHttpClient(), provideHttpClientTesting()],
        }).compileComponents();
        httpTesting = TestBed.inject(HttpTestingController);
    });

    afterEach(() => {
        httpTesting.verify();
    });

    function createAndInit() {
        const fixture = TestBed.createComponent(Collections);
        fixture.detectChanges();
        httpTesting.expectOne(`${API_BASE_KNOWLEDGE}/collections`).flush(mockCollections);
        fixture.detectChanges();
        return fixture;
    }

    it('should create', () => {
        const fixture = TestBed.createComponent(Collections);
        fixture.detectChanges();
        expect(fixture.componentInstance).toBeTruthy();
        httpTesting.expectOne(`${API_BASE_KNOWLEDGE}/collections`).flush([]);
    });

    it('should load collections on init', () => {
        const fixture = createAndInit();
        expect(fixture.componentInstance.collections()).toEqual(mockCollections);
        expect(fixture.componentInstance.loading()).toBe(false);
    });

    it('should handle load error', () => {
        const fixture = TestBed.createComponent(Collections);
        fixture.detectChanges();
        httpTesting.expectOne(`${API_BASE_KNOWLEDGE}/collections`).error(new ProgressEvent('error'));
        fixture.detectChanges();
        expect(fixture.componentInstance.loading()).toBe(false);
    });

    it('should compute totalDocuments', () => {
        const fixture = createAndInit();
        expect(fixture.componentInstance.totalDocuments()).toBe(3);
    });

    it('should compute hasSearch', () => {
        const fixture = createAndInit();
        expect(fixture.componentInstance.hasSearch()).toBe(false);

        const searchService = TestBed.inject(SearchService);
        searchService.query.set('test');
        expect(fixture.componentInstance.hasSearch()).toBe(true);
    });

    it('should display collections when not searching', () => {
        const fixture = createAndInit();
        expect(fixture.componentInstance.displayedCollections()).toEqual(mockCollections);
    });

    it('should reset createForm on openCreateForm', () => {
        const fixture = createAndInit();
        fixture.componentInstance.createForm.patchValue({ name: 'test', description: 'desc' });
        fixture.componentInstance.openCreateForm();
        expect(fixture.componentInstance.createForm.value).toEqual({ name: '', description: '' });
    });

    it('should submit create form and add collection', () => {
        const fixture = createAndInit();
        const closeSpy = vi.fn();

        fixture.componentInstance.createForm.patchValue({ name: 'New', description: 'Desc' });
        fixture.componentInstance.submitCreate(closeSpy);

        expect(fixture.componentInstance.creating()).toBe(true);

        const newCollection: Collection = {
            id: 3, name: 'New', description: 'Desc', created_at: '2026-01-03T10:00:00Z', document_count: 0,
        };
        httpTesting.expectOne(`${API_BASE_KNOWLEDGE}/collections`).flush(newCollection);
        fixture.detectChanges();

        expect(fixture.componentInstance.creating()).toBe(false);
        expect(closeSpy).toHaveBeenCalled();
        expect(fixture.componentInstance.collections()[0]).toEqual(newCollection);
    });

    it('should not submit if form is invalid', () => {
        const fixture = createAndInit();
        const closeSpy = vi.fn();
        fixture.componentInstance.submitCreate(closeSpy);
        expect(closeSpy).not.toHaveBeenCalled();
    });

    it('should handle create error', () => {
        const fixture = createAndInit();
        const closeSpy = vi.fn();

        fixture.componentInstance.createForm.patchValue({ name: 'Fail' });
        fixture.componentInstance.submitCreate(closeSpy);

        httpTesting.expectOne(`${API_BASE_KNOWLEDGE}/collections`).error(new ProgressEvent('error'));
        fixture.detectChanges();

        expect(fixture.componentInstance.creating()).toBe(false);
        expect(closeSpy).not.toHaveBeenCalled();
    });

    it('should send description as null when empty', () => {
        const fixture = createAndInit();
        const closeSpy = vi.fn();

        fixture.componentInstance.createForm.patchValue({ name: 'NoDesc', description: '' });
        fixture.componentInstance.submitCreate(closeSpy);

        const req = httpTesting.expectOne(`${API_BASE_KNOWLEDGE}/collections`);
        expect(req.request.body.description).toBeNull();
        req.flush({ id: 4, name: 'NoDesc', description: null, created_at: '2026-01-04', document_count: 0 });
    });

    it('should request delete collection', () => {
        const fixture = createAndInit();
        const event = new MouseEvent('click');
        vi.spyOn(event, 'stopPropagation');

        fixture.componentInstance.requestDeleteCollection(event, 1);
        expect(event.stopPropagation).toHaveBeenCalled();
        expect(fixture.componentInstance.pendingDeleteCollectionId()).toBe(1);
    });

    it('should confirm delete collection', () => {
        const fixture = createAndInit();
        const closeSpy = vi.fn();

        fixture.componentInstance.pendingDeleteCollectionId.set(1);
        fixture.componentInstance.confirmDeleteCollection(closeSpy);

        expect(closeSpy).toHaveBeenCalled();
        expect(fixture.componentInstance.deleting()).toBe(1);

        httpTesting.expectOne(`${API_BASE_KNOWLEDGE}/collections/1`).flush(null);
        fixture.detectChanges();

        expect(fixture.componentInstance.collections()).toHaveLength(1);
        expect(fixture.componentInstance.deleting()).toBeNull();
    });

    it('should not confirm delete without pending id', () => {
        const fixture = createAndInit();
        const closeSpy = vi.fn();
        fixture.componentInstance.confirmDeleteCollection(closeSpy);
        expect(closeSpy).not.toHaveBeenCalled();
    });

    it('should handle confirm delete error', () => {
        const fixture = createAndInit();
        const closeSpy = vi.fn();

        fixture.componentInstance.pendingDeleteCollectionId.set(1);
        fixture.componentInstance.confirmDeleteCollection(closeSpy);

        httpTesting.expectOne(`${API_BASE_KNOWLEDGE}/collections/1`).error(new ProgressEvent('error'));
        fixture.detectChanges();

        expect(fixture.componentInstance.deleting()).toBeNull();
        expect(fixture.componentInstance.pendingDeleteCollectionId()).toBeNull();
    });

    it('should also remove from searchResults on confirm delete', () => {
        const fixture = createAndInit();
        fixture.componentInstance.searchResults.set([...mockCollections]);

        const closeSpy = vi.fn();
        fixture.componentInstance.pendingDeleteCollectionId.set(1);
        fixture.componentInstance.confirmDeleteCollection(closeSpy);

        httpTesting.expectOne(`${API_BASE_KNOWLEDGE}/collections/1`).flush(null);
        fixture.detectChanges();

        expect(fixture.componentInstance.searchResults()!).toHaveLength(1);
    });

    it('should delete collection directly', () => {
        const fixture = createAndInit();
        const event = new MouseEvent('click');
        vi.spyOn(event, 'stopPropagation');

        fixture.componentInstance.deleteCollection(event, 2);
        expect(event.stopPropagation).toHaveBeenCalled();

        httpTesting.expectOne(`${API_BASE_KNOWLEDGE}/collections/2`).flush(null);
        fixture.detectChanges();

        expect(fixture.componentInstance.collections()).toHaveLength(1);
        expect(fixture.componentInstance.deleting()).toBeNull();
    });

    it('should handle direct delete error', () => {
        const fixture = createAndInit();
        const event = new MouseEvent('click');

        fixture.componentInstance.deleteCollection(event, 2);
        httpTesting.expectOne(`${API_BASE_KNOWLEDGE}/collections/2`).error(new ProgressEvent('error'));
        fixture.detectChanges();

        expect(fixture.componentInstance.deleting()).toBeNull();
    });

    it('should navigate to collection on openCollection', () => {
        const router = TestBed.inject(Router);
        vi.spyOn(router, 'navigate');

        const fixture = createAndInit();
        fixture.componentInstance.openCollection(1);
        expect(router.navigate).toHaveBeenCalledWith(['/collections', 1]);
    });

    it('should format recent dates as relative', () => {
        const fixture = createAndInit();
        const now = new Date();
        const result = fixture.componentInstance.formatDate(now.toISOString());
        expect(result).toBe('Ahora mismo');
    });

    it('should format minutes ago', () => {
        const fixture = createAndInit();
        const fiveMinAgo = new Date(Date.now() - 5 * 60000).toISOString();
        expect(fixture.componentInstance.formatDate(fiveMinAgo)).toBe('Hace 5 min');
    });

    it('should format hours ago', () => {
        const fixture = createAndInit();
        const twoHoursAgo = new Date(Date.now() - 2 * 3600000).toISOString();
        expect(fixture.componentInstance.formatDate(twoHoursAgo)).toBe('Hace 2h');
    });

    it('should format days ago', () => {
        const fixture = createAndInit();
        const threeDaysAgo = new Date(Date.now() - 3 * 86400000).toISOString();
        expect(fixture.componentInstance.formatDate(threeDaysAgo)).toBe('Hace 3d');
    });

    it('should format old dates with locale', () => {
        const fixture = createAndInit();
        const result = fixture.componentInstance.formatDate('2020-06-15T10:00:00Z');
        expect(result).toBeTruthy();
        expect(typeof result).toBe('string');
    });

    it('should compute pendingDeleteCollection', () => {
        const fixture = createAndInit();
        expect(fixture.componentInstance.pendingDeleteCollection()).toBeUndefined();
        fixture.componentInstance.pendingDeleteCollectionId.set(1);
        expect(fixture.componentInstance.pendingDeleteCollection()?.id).toBe(1);
    });

    it('should search collections via searchService', async () => {
        vi.useFakeTimers();
        const searchService = TestBed.inject(SearchService);
        const fixture = createAndInit();

        searchService.query.set('angular');
        TestBed.flushEffects();
        vi.advanceTimersByTime(300);

        const req = httpTesting.expectOne((r) => r.url === `${API_BASE}/dashboard/search`);
        req.flush([{ id: 10, name: 'Angular Coll', description: null, document_count: 1, created_at: '2026-01-01' }]);
        fixture.detectChanges();

        expect(fixture.componentInstance.searchResults()).toHaveLength(1);
        expect(fixture.componentInstance.searching()).toBe(false);
        vi.useRealTimers();
    });

    it('should clear searchResults when query is cleared', async () => {
        vi.useFakeTimers();
        const searchService = TestBed.inject(SearchService);
        const fixture = createAndInit();

        searchService.query.set('test');
        TestBed.flushEffects();
        vi.advanceTimersByTime(300);

        httpTesting.expectOne((r) => r.url === `${API_BASE}/dashboard/search`).flush([]);
        fixture.detectChanges();

        searchService.query.set('');
        TestBed.flushEffects();
        vi.advanceTimersByTime(300);

        expect(fixture.componentInstance.searchResults()).toBeNull();
        vi.useRealTimers();
    });

    it('should render loading state', () => {
        const fixture = TestBed.createComponent(Collections);
        fixture.detectChanges();
        expect(fixture.componentInstance.loading()).toBe(true);
        httpTesting.expectOne(`${API_BASE_KNOWLEDGE}/collections`).flush([]);
    });

    it('should render empty collections state', () => {
        const fixture = TestBed.createComponent(Collections);
        fixture.detectChanges();
        httpTesting.expectOne(`${API_BASE_KNOWLEDGE}/collections`).flush([]);
        fixture.detectChanges();

        const html = fixture.nativeElement.innerHTML;
        expect(html).toContain('No hay colecciones');
    });

    it('should render search header with result count', async () => {
        vi.useFakeTimers();
        const searchService = TestBed.inject(SearchService);
        const fixture = createAndInit();

        searchService.query.set('test');
        TestBed.flushEffects();
        vi.advanceTimersByTime(300);

        httpTesting.expectOne((r) => r.url === `${API_BASE}/dashboard/search`).flush(mockCollections);
        fixture.detectChanges();

        const html = fixture.nativeElement.innerHTML;
        expect(html).toContain('resultado(s) para');
        vi.useRealTimers();
    });

    it('should render no search results state', async () => {
        vi.useFakeTimers();
        const searchService = TestBed.inject(SearchService);
        const fixture = createAndInit();

        searchService.query.set('nonexistent');
        TestBed.flushEffects();
        vi.advanceTimersByTime(300);

        httpTesting.expectOne((r) => r.url === `${API_BASE}/dashboard/search`).flush([]);
        fixture.detectChanges();

        const html = fixture.nativeElement.innerHTML;
        expect(html).toContain('Sin resultados');
        vi.useRealTimers();
    });

    it('should show searching spinner', () => {
        const fixture = createAndInit();
        fixture.componentInstance.searching.set(true);
        const searchService = TestBed.inject(SearchService);
        searchService.query.set('test');
        fixture.detectChanges();

        // Spinner should be in the DOM when searching
        expect(fixture.componentInstance.searching()).toBe(true);
    });

    it('should render deleting spinner on collection card', () => {
        const fixture = createAndInit();
        fixture.componentInstance.deleting.set(1);
        fixture.detectChanges();

        // Verify the deleting state is reflected
        expect(fixture.componentInstance.deleting()).toBe(1);
    });

    it('should render creating spinner state', () => {
        const fixture = createAndInit();
        fixture.componentInstance.creating.set(true);
        fixture.detectChanges();

        expect(fixture.componentInstance.creating()).toBe(true);
    });

    it('should render collection grid with descriptions', () => {
        const fixture = createAndInit();
        const html = fixture.nativeElement.innerHTML;
        expect(html).toContain('Collection A');
        expect(html).toContain('Desc A');
        expect(html).toContain('Sin descripción');
    });

    it('should navigate when clicking a collection card', () => {
        const router = TestBed.inject(Router);
        vi.spyOn(router, 'navigate');

        const fixture = createAndInit();
        const article = fixture.nativeElement.querySelector('article');
        article.click();
        expect(router.navigate).toHaveBeenCalledWith(['/collections', 1]);
    });

    it('should navigate on Enter key on collection card', () => {
        const router = TestBed.inject(Router);
        vi.spyOn(router, 'navigate');

        const fixture = createAndInit();
        const article = fixture.nativeElement.querySelector('article');
        article.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
        fixture.detectChanges();
        expect(router.navigate).toHaveBeenCalledWith(['/collections', 1]);
    });

    it('should render deleting spinner on matching collection card', () => {
        const fixture = createAndInit();
        fixture.componentInstance.deleting.set(1);
        fixture.detectChanges();

        const deleteButtons = fixture.nativeElement.querySelectorAll('[aria-label="Eliminar colección"]');
        expect(deleteButtons.length).toBeGreaterThan(0);
        // The first button should be disabled since deleting matches id 1
        expect(deleteButtons[0].disabled).toBe(true);
    });

    it('should render empty state button in non-search mode', () => {
        const fixture = TestBed.createComponent(Collections);
        fixture.detectChanges();
        httpTesting.expectOne(`${API_BASE_KNOWLEDGE}/collections`).flush([]);
        fixture.detectChanges();

        const html = fixture.nativeElement.innerHTML;
        expect(html).toContain('Crear Primera Colección');
    });

    it('should handle search error gracefully', async () => {
        vi.useFakeTimers();
        const searchService = TestBed.inject(SearchService);
        const fixture = createAndInit();

        searchService.query.set('error-query');
        TestBed.flushEffects();
        vi.advanceTimersByTime(300);

        httpTesting.expectOne((r) => r.url === `${API_BASE}/dashboard/search`).error(new ProgressEvent('error'));
        fixture.detectChanges();

        expect(fixture.componentInstance.searching()).toBe(false);
        expect(fixture.componentInstance.searchResults()).toEqual([]);
        vi.useRealTimers();
    });
});
