import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import type { LucideIconInput } from '@lucide/angular';
import {
    LucideBrain,
    LucideCirclePlus,
    LucideDynamicIcon,
    LucideFolderOpen,
    LucideHeadphones,
    LucideMessageSquare,
    LucideScanText,
} from '@lucide/angular';
import { AppButton } from '../../shared/ui/button';

interface NavItem {
    label: string;
    icon: LucideIconInput;
    route: string;
}

@Component({
    selector: 'app-sidebar',
    imports: [RouterLink, RouterLinkActive, LucideDynamicIcon, AppButton],
    templateUrl: './sidebar.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Sidebar {
    protected readonly LucideBrain = LucideBrain;
    protected readonly LucideCirclePlus = LucideCirclePlus;

    protected readonly navItems = signal<NavItem[]>([
        { label: 'Inicio', icon: LucideBrain, route: '/' },
        { label: 'Chat', icon: LucideMessageSquare, route: '/chat' },
        { label: 'Colecciones', icon: LucideFolderOpen, route: '/collections' },
        { label: 'OCR', icon: LucideScanText, route: '/ocr' },
        { label: 'Audio', icon: LucideHeadphones, route: '/tts' },
    ]);
}
