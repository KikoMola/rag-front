import { ChangeDetectionStrategy, Component, OnInit, booleanAttribute, computed, inject, input, output, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import type { LucideIconInput } from '@lucide/angular';
import {
    LucideBrain,
    LucideDynamicIcon,
    LucideFolderOpen,
    LucideHeadphones,
    LucideHouse,
    LucideMessageSquare,
    LucideMoon,
    LucideRefreshCw,
    LucideScanText,
} from '@lucide/angular';
import { NgpSwitch, NgpSwitchThumb } from 'ng-primitives/switch';
import { NgpTooltipTrigger } from 'ng-primitives/tooltip';
import { SystemStatusService } from '../../core/services/system-status.service';
import { ThemeService } from '../../core/services/theme.service';

type NavGroup = 'main' | 'work' | 'tools';

interface NavItem {
    label: string;
    icon: LucideIconInput;
    route: string;
    group: NavGroup;
}

const GROUP_LABELS: Record<NavGroup, string | null> = { main: null, work: 'Trabajar', tools: 'Herramientas' };

@Component({
    selector: 'app-sidebar',
    imports: [RouterLink, RouterLinkActive, LucideDynamicIcon, NgpSwitch, NgpSwitchThumb, NgpTooltipTrigger],
    templateUrl: './sidebar.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Sidebar implements OnInit {
    protected readonly LucideBrain = LucideBrain;
    protected readonly LucideMoon = LucideMoon;
    protected readonly LucideRefreshCw = LucideRefreshCw;

    /** En el panel desplegable del móvil el menú ocupa todo su contenedor en vez de ir fijo. */
    readonly drawer = input(false, { transform: booleanAttribute });
    /** Se emite al pulsar un enlace, para cerrar el panel en el móvil. */
    readonly navigated = output<void>();

    protected readonly theme = inject(ThemeService);
    protected readonly status = inject(SystemStatusService);

    protected readonly navItems = signal<NavItem[]>([
        { label: 'Inicio', icon: LucideHouse, route: '/', group: 'main' },
        { label: 'Chat', icon: LucideMessageSquare, route: '/chat', group: 'work' },
        { label: 'Colecciones', icon: LucideFolderOpen, route: '/collections', group: 'work' },
        { label: 'OCR', icon: LucideScanText, route: '/ocr', group: 'tools' },
        { label: 'Audio', icon: LucideHeadphones, route: '/tts', group: 'tools' },
    ]);

    protected readonly groups = computed(() =>
        (Object.keys(GROUP_LABELS) as NavGroup[]).map((group) => ({
            label: GROUP_LABELS[group],
            items: this.navItems().filter((item) => item.group === group),
        })),
    );

    ngOnInit(): void {
        // El menú del móvil reutiliza el estado que ya comprobó el menú fijo
        if (!this.drawer() || this.status.state() === 'offline') {
            this.status.check();
        }
    }
}
