import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs/operators';
import { LucideSearch, LucideDynamicIcon } from '@lucide/angular';
import { SearchService } from '../../core/services/search.service';

@Component({
    selector: 'app-navbar',
    imports: [LucideDynamicIcon],
    templateUrl: './navbar.html',
    styleUrl: './navbar.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Navbar {
    protected readonly LucideSearch = LucideSearch;

    private readonly router = inject(Router);
    private readonly searchService = inject(SearchService);
    protected readonly searchQuery = this.searchService.query;

    private readonly currentUrl = signal(this.router.url);
    protected readonly showSearch = computed(() => this.currentUrl() === '/collections');

    constructor() {
        this.router.events
            .pipe(filter((e) => e instanceof NavigationEnd), takeUntilDestroyed())
            .subscribe((e) => {
                const url = (e as NavigationEnd).urlAfterRedirects;
                this.currentUrl.set(url);
                if (url !== '/collections') {
                    this.searchService.query.set('');
                }
            });
    }
}
