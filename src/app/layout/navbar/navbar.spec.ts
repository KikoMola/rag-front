import { TestBed } from '@angular/core/testing';
import { Router, NavigationEnd } from '@angular/router';
import { RouterModule } from '@angular/router';
import { Subject } from 'rxjs';
import { Navbar } from './navbar';
import { SearchService } from '../../core/services/search.service';

describe('Navbar', () => {
    let routerEvents$: Subject<unknown>;

    beforeEach(async () => {
        routerEvents$ = new Subject();

        await TestBed.configureTestingModule({
            imports: [Navbar, RouterModule.forRoot([])],
            providers: [
                {
                    provide: Router,
                    useValue: {
                        url: '/',
                        events: routerEvents$.asObservable(),
                    },
                },
            ],
        }).compileComponents();
    });

    it('should create', () => {
        const fixture = TestBed.createComponent(Navbar);
        fixture.detectChanges();
        expect(fixture.componentInstance).toBeTruthy();
    });

    it('should hide search when not on /collections', () => {
        const fixture = TestBed.createComponent(Navbar);
        fixture.detectChanges();
        expect(fixture.nativeElement.querySelector('input')).toBeNull();
    });

    it('should show search when navigating to /collections', () => {
        const fixture = TestBed.createComponent(Navbar);
        fixture.detectChanges();

        routerEvents$.next(new NavigationEnd(1, '/collections', '/collections'));
        fixture.detectChanges();

        expect(fixture.nativeElement.querySelector('input')).toBeTruthy();
    });

    it('should clear search query when navigating away from /collections', () => {
        const searchService = TestBed.inject(SearchService);
        searchService.query.set('test');

        const fixture = TestBed.createComponent(Navbar);
        fixture.detectChanges();

        routerEvents$.next(new NavigationEnd(2, '/dashboard', '/dashboard'));
        fixture.detectChanges();

        expect(searchService.query()).toBe('');
    });

    it('should update search query on input', () => {
        const searchService = TestBed.inject(SearchService);
        const fixture = TestBed.createComponent(Navbar);
        fixture.detectChanges();

        routerEvents$.next(new NavigationEnd(1, '/collections', '/collections'));
        fixture.detectChanges();

        const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
        input.value = 'angular';
        input.dispatchEvent(new Event('input'));
        fixture.detectChanges();

        expect(searchService.query()).toBe('angular');
    });
});
