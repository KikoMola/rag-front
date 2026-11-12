import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { RouterModule } from '@angular/router';
import { Sidebar } from './sidebar';
import { ThemeService } from '../../core/services/theme.service';

const DASHBOARD_URL = 'http://localhost:8000/api/dashboard';

describe('Sidebar', () => {
    let httpTesting: HttpTestingController;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [Sidebar, RouterModule.forRoot([])],
            providers: [provideHttpClient(), provideHttpClientTesting()],
        }).compileComponents();
        httpTesting = TestBed.inject(HttpTestingController);
    });

    afterEach(() => httpTesting.verify());

    function create(models: string[] | 'error' = ['gemma4:26b', 'qwen3.6:27b']) {
        const fixture = TestBed.createComponent(Sidebar);
        fixture.detectChanges();
        const req = httpTesting.expectOne(DASHBOARD_URL);
        if (models === 'error') {
            req.error(new ProgressEvent('error'));
        } else {
            req.flush({ stats: { total_documents: 0, total_collections: 0, models }, recent_documents: [], recent_collections: [] });
        }
        fixture.detectChanges();
        return fixture;
    }

    it('should have nav items in order', () => {
        const fixture = create();
        const items = fixture.componentInstance['navItems']();
        expect(items.map((i) => i.label)).toEqual(['Inicio', 'Chat', 'Colecciones', 'OCR', 'Audio']);
    });

    it('should render the navigation links grouped by task', () => {
        const fixture = create();
        const el: HTMLElement = fixture.nativeElement;
        expect(el.querySelectorAll('nav a')).toHaveLength(5);
        expect(el.textContent).toContain('Trabajar');
        expect(el.textContent).toContain('Herramientas');
    });

    it('should render the brand', () => {
        const fixture = create();
        expect(fixture.nativeElement.textContent).toContain('RAG Chat');
    });

    it('should show how many models Ollama reports', () => {
        const fixture = create();
        expect(fixture.nativeElement.textContent).toContain('Ollama · 2 modelos');
    });

    it('should warn when the backend sees no models', () => {
        const fixture = create([]);
        expect(fixture.nativeElement.textContent).toContain('Ollama no responde');
    });

    it('should show the backend as offline and allow retrying', () => {
        const fixture = create('error');
        const el: HTMLElement = fixture.nativeElement;
        expect(el.textContent).toContain('Backend sin conexión');

        el.querySelector<HTMLButtonElement>('[aria-label="Volver a comprobar"]')!.click();
        httpTesting.expectOne(DASHBOARD_URL).flush({
            stats: { total_documents: 0, total_collections: 0, models: ['gemma4:26b'] },
            recent_documents: [],
            recent_collections: [],
        });
        fixture.detectChanges();
        expect(el.textContent).toContain('Ollama · 1 modelo');
    });

    it('should toggle the theme with the switch', () => {
        const theme = TestBed.inject(ThemeService);
        theme.set('light');
        const fixture = create();
        const toggle = fixture.nativeElement.querySelector('#theme-switch') as HTMLButtonElement;

        toggle.click();
        fixture.detectChanges();
        expect(theme.theme()).toBe('dark');
        expect(document.documentElement.dataset['theme']).toBe('dark');

        toggle.click();
        fixture.detectChanges();
        expect(theme.theme()).toBe('light');
    });

    it('should emit navigated when a link is clicked', () => {
        const fixture = create();
        const spy = vi.fn();
        fixture.componentInstance.navigated.subscribe(spy);
        fixture.nativeElement.querySelector('nav a').click();
        expect(spy).toHaveBeenCalled();
    });
});
