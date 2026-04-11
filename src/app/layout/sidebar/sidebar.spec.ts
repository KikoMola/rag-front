import { TestBed } from '@angular/core/testing';
import { RouterModule } from '@angular/router';
import { Sidebar } from './sidebar';

describe('Sidebar', () => {
    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [Sidebar, RouterModule.forRoot([])],
        }).compileComponents();
    });

    it('should create', () => {
        const fixture = TestBed.createComponent(Sidebar);
        fixture.detectChanges();
        expect(fixture.componentInstance).toBeTruthy();
    });

    it('should have nav items', () => {
        const fixture = TestBed.createComponent(Sidebar);
        fixture.detectChanges();
        const items = fixture.componentInstance['navItems']();
        expect(items).toHaveLength(2);
        expect(items[0].label).toBe('Dashboard');
        expect(items[1].label).toBe('Collections');
    });

    it('should render navigation links', () => {
        const fixture = TestBed.createComponent(Sidebar);
        fixture.detectChanges();
        const links = fixture.nativeElement.querySelectorAll('nav a');
        expect(links).toHaveLength(2);
    });

    it('should render logo section', () => {
        const fixture = TestBed.createComponent(Sidebar);
        fixture.detectChanges();
        const h1 = fixture.nativeElement.querySelector('h1');
        expect(h1?.textContent).toContain('RAG Chat');
    });

    it('should render "Nueva Colección" button', () => {
        const fixture = TestBed.createComponent(Sidebar);
        fixture.detectChanges();
        const link = fixture.nativeElement.querySelector('a[routerLink="/collections"]');
        expect(link).toBeTruthy();
    });
});
