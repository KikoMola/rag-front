import { TestBed } from '@angular/core/testing';
import { RouterModule } from '@angular/router';
import { Layout } from './layout';

describe('Layout', () => {
    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [Layout, RouterModule.forRoot([])],
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

    it('should render navbar', () => {
        const fixture = TestBed.createComponent(Layout);
        fixture.detectChanges();
        expect(fixture.nativeElement.querySelector('app-navbar')).toBeTruthy();
    });

    it('should render router-outlet', () => {
        const fixture = TestBed.createComponent(Layout);
        fixture.detectChanges();
        expect(fixture.nativeElement.querySelector('router-outlet')).toBeTruthy();
    });
});
