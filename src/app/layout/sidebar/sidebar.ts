import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import type { LucideIconInput } from '@lucide/angular';
import {
    LucideBrain,
    LucideCirclePlus,
    LucideDynamicIcon,
    LucideFolderOpen
} from '@lucide/angular';

interface NavItem {
    label: string;
    icon: LucideIconInput;
    route: string;
}

@Component({
    selector: 'app-sidebar',
    imports: [RouterLink, RouterLinkActive, LucideDynamicIcon],
    templateUrl: './sidebar.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Sidebar {
    protected readonly LucideBrain = LucideBrain;
    protected readonly LucideCirclePlus = LucideCirclePlus;

    protected readonly navItems = signal<NavItem[]>([
        { label: 'Dashboard', icon: LucideBrain, route: '/' },
        { label: 'Collections', icon: LucideFolderOpen, route: '/collections' }
    ]);
}
