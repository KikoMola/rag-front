import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import {
    LucideBrain,
    LucideFolderOpen,
    LucideCpu,
    LucideSettings,
    LucideActivity,
    LucidePlus,
    LucideDynamicIcon,
} from '@lucide/angular';
import type { LucideIconInput } from '@lucide/angular';

interface NavItem {
    label: string;
    icon: LucideIconInput;
    route: string;
}

@Component({
    selector: 'app-sidebar',
    imports: [RouterLink, RouterLinkActive, LucideDynamicIcon],
    templateUrl: './sidebar.html',
    styleUrl: './sidebar.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Sidebar {
    protected readonly LucideBrain = LucideBrain;
    protected readonly LucidePlus = LucidePlus;
    protected readonly LucideActivity = LucideActivity;

    protected readonly navItems = signal<NavItem[]>([
        { label: 'Dashboard', icon: LucideBrain, route: '/' },
        { label: 'Collections', icon: LucideFolderOpen, route: '/collections' },
        { label: 'Models', icon: LucideCpu, route: '/models' },
        { label: 'Settings', icon: LucideSettings, route: '/settings' },
    ]);
}
