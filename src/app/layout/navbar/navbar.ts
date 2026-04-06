import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
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

    private readonly searchService = inject(SearchService);
    protected readonly searchQuery = this.searchService.query;
}
