import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { RouterModule } from '@angular/router';
import { Layout } from './layout';

describe('Layout', () => {
    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [Layout, RouterModule.forRoot([])],
            providers: [provideHttpClient(), provideHttpClientTesting()],
        }).compileComponents();
    });

    it('should create', () => {
        const fixture = TestBed.createComponent(Layout);
        expect(fixture.componentInstance).toBeTruthy();
    });

    it('should render sidebar', () => {
        const fixture = TestBed.createComponent(Layout);
        fixture.detectChanges();
        expect(fixture.nativeElement.querySelector('app-sidebar')).toBeTruthy();
    });

    it('should render router-outlet', () => {
        const fixture = TestBed.createComponent(Layout);
        fixture.detectChanges();
        expect(fixture.nativeElement.querySelector('router-outlet')).toBeTruthy();
    });

    it('should render the mobile header with a menu button', () => {
        const fixture = TestBed.createComponent(Layout);
        fixture.detectChanges();
        const button = fixture.nativeElement.querySelector('main header [aria-label="Abrir menú"]');
        expect(button).toBeTruthy();
    });
});
