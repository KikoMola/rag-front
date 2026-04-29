import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { RouterModule, Router } from '@angular/router';
import { Dashboard } from './dashboard';
import type { DashboardData } from '../core/services/dashboard.service';

const API_BASE = 'http://localhost:8000/api';

const mockDashboardData: DashboardData = {
    stats: { total_documents: 15, total_collections: 3, models: ['gpt-4', 'llama-3'] },
    recent_documents: [
        { id: 1, filename: 'doc.pdf', collection_name: 'Test', status: 'indexed', created_at: '2026-01-15T10:00:00Z' },
        { id: 2, filename: 'err.txt', collection_name: 'Test', status: 'error', created_at: '2026-01-14T10:00:00Z' },
        { id: 3, filename: 'wait.md', collection_name: 'Test', status: 'pending', created_at: '2026-01-13T10:00:00Z' },
    ],
    recent_collections: [
        { id: 1, name: 'Test Collection', document_count: 5, created_at: '2026-01-10T10:00:00Z' },
    ],
};

describe('Dashboard', () => {
    let httpTesting: HttpTestingController;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [Dashboard, RouterModule.forRoot([])],
            providers: [provideHttpClient(), provideHttpClientTesting()],
        }).compileComponents();
        httpTesting = TestBed.inject(HttpTestingController);
    });

    afterEach(() => {
        httpTesting.verify();
    });

    it('should create', () => {
        const fixture = TestBed.createComponent(Dashboard);
        fixture.detectChanges();
        expect(fixture.componentInstance).toBeTruthy();
        httpTesting.expectOne(`${API_BASE}/dashboard`).flush(mockDashboardData);
    });

    it('should show loading skeleton initially', () => {
        const fixture = TestBed.createComponent(Dashboard);
        fixture.detectChanges();
        expect(fixture.componentInstance['loading']()).toBe(true);
        httpTesting.expectOne(`${API_BASE}/dashboard`).flush(mockDashboardData);
    });

    it('should load dashboard data on init', () => {
        const fixture = TestBed.createComponent(Dashboard);
        fixture.detectChanges();

        const req = httpTesting.expectOne(`${API_BASE}/dashboard`);
        req.flush(mockDashboardData);
        fixture.detectChanges();

        expect(fixture.componentInstance['loading']()).toBe(false);
        expect(fixture.componentInstance['data']()).toEqual(mockDashboardData);
    });

    it('should handle loading error', () => {
        const fixture = TestBed.createComponent(Dashboard);
        fixture.detectChanges();

        const req = httpTesting.expectOne(`${API_BASE}/dashboard`);
        req.error(new ProgressEvent('error'));
        fixture.detectChanges();

        expect(fixture.componentInstance['loading']()).toBe(false);
        expect(fixture.componentInstance['data']()).toBeNull();
    });

    it('should navigate to collection on openCollection', () => {
        const router = TestBed.inject(Router);
        vi.spyOn(router, 'navigate');

        const fixture = TestBed.createComponent(Dashboard);
        fixture.detectChanges();
        httpTesting.expectOne(`${API_BASE}/dashboard`).flush(mockDashboardData);

        fixture.componentInstance['openCollection'](5);
        expect(router.navigate).toHaveBeenCalledWith(['/collections', 5]);
    });

    it('should format date correctly', () => {
        const fixture = TestBed.createComponent(Dashboard);
        fixture.detectChanges();
        httpTesting.expectOne(`${API_BASE}/dashboard`).flush(mockDashboardData);

        const result = fixture.componentInstance['formatDate']('2026-03-15T10:00:00Z');
        expect(result).toBeTruthy();
        expect(typeof result).toBe('string');
    });

    it('should return correct status icon for indexed', () => {
        const fixture = TestBed.createComponent(Dashboard);
        fixture.detectChanges();
        httpTesting.expectOne(`${API_BASE}/dashboard`).flush(mockDashboardData);

        const component = fixture.componentInstance;
        expect(component['statusIcon']('indexed')).toBe(component['LucideCheckCircle2']);
    });

    it('should return correct status icon for error', () => {
        const fixture = TestBed.createComponent(Dashboard);
        fixture.detectChanges();
        httpTesting.expectOne(`${API_BASE}/dashboard`).flush(mockDashboardData);

        const component = fixture.componentInstance;
        expect(component['statusIcon']('error')).toBe(component['LucideAlertCircle']);
    });

    it('should return default status icon for other statuses', () => {
        const fixture = TestBed.createComponent(Dashboard);
        fixture.detectChanges();
        httpTesting.expectOne(`${API_BASE}/dashboard`).flush(mockDashboardData);

        const component = fixture.componentInstance;
        expect(component['statusIcon']('pending')).toBe(component['LucideClock']);
    });

    it('should return correct status class for indexed', () => {
        const fixture = TestBed.createComponent(Dashboard);
        fixture.detectChanges();
        httpTesting.expectOne(`${API_BASE}/dashboard`).flush(mockDashboardData);

        expect(fixture.componentInstance['statusClass']('indexed')).toBe('text-tertiary-fixed-dim');
    });

    it('should return correct status class for error', () => {
        const fixture = TestBed.createComponent(Dashboard);
        fixture.detectChanges();
        httpTesting.expectOne(`${API_BASE}/dashboard`).flush(mockDashboardData);

        expect(fixture.componentInstance['statusClass']('error')).toBe('text-error');
    });

    it('should return default status class for other statuses', () => {
        const fixture = TestBed.createComponent(Dashboard);
        fixture.detectChanges();
        httpTesting.expectOne(`${API_BASE}/dashboard`).flush(mockDashboardData);

        expect(fixture.componentInstance['statusClass']('pending')).toBe('text-on-surface-variant');
    });

    it('should render stats when data is loaded', () => {
        const fixture = TestBed.createComponent(Dashboard);
        fixture.detectChanges();

        httpTesting.expectOne(`${API_BASE}/dashboard`).flush(mockDashboardData);
        fixture.detectChanges();

        const html = fixture.nativeElement.innerHTML;
        expect(html).toContain('15');
        expect(html).toContain('3');
    });

    it('should render empty collections state', () => {
        const emptyData: DashboardData = {
            ...mockDashboardData,
            recent_collections: [],
            recent_documents: [],
        };
        const fixture = TestBed.createComponent(Dashboard);
        fixture.detectChanges();
        httpTesting.expectOne(`${API_BASE}/dashboard`).flush(emptyData);
        fixture.detectChanges();

        const html = fixture.nativeElement.innerHTML;
        expect(html).toContain('No hay colecciones todavía');
        expect(html).toContain('Sin documentos aún');
    });

    it('should render recent documents with divider lines', () => {
        const fixture = TestBed.createComponent(Dashboard);
        fixture.detectChanges();
        httpTesting.expectOne(`${API_BASE}/dashboard`).flush(mockDashboardData);
        fixture.detectChanges();

        const html = fixture.nativeElement.innerHTML;
        expect(html).toContain('doc.pdf');
        expect(html).toContain('gpt-4');
        expect(html).toContain('llama-3');
    });

    it('should render collection cards and handle click', () => {
        const router = TestBed.inject(Router);
        vi.spyOn(router, 'navigate');

        const fixture = TestBed.createComponent(Dashboard);
        fixture.detectChanges();
        httpTesting.expectOne(`${API_BASE}/dashboard`).flush(mockDashboardData);
        fixture.detectChanges();

        const article = fixture.nativeElement.querySelector('article');
        expect(article).toBeTruthy();
        article.click();
        expect(router.navigate).toHaveBeenCalledWith(['/collections', 1]);
    });
});
