import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { LucideSearch, LucideDynamicIcon } from '@lucide/angular';

@Component({
    selector: 'app-navbar',
    imports: [LucideDynamicIcon],
    templateUrl: './navbar.html',
    styleUrl: './navbar.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Navbar {
    protected readonly LucideSearch = LucideSearch;

    protected readonly searchQuery = signal('');
}
