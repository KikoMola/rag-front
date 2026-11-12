import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideChevronRight, LucideDynamicIcon } from '@lucide/angular';
import {
    NgpBreadcrumbItem,
    NgpBreadcrumbLink,
    NgpBreadcrumbList,
    NgpBreadcrumbPage,
    NgpBreadcrumbSeparator,
    NgpBreadcrumbs,
} from 'ng-primitives/breadcrumbs';

export interface Crumb {
    label: string;
    link?: string | (string | number)[];
}

/**
 * Cabecera común de las pantallas: migas de pan, título, resumen y acciones.
 *
 * El resumen admite contenido propio con `[pageSubtitle]` y las acciones van en `[pageActions]`.
 */
@Component({
    selector: 'app-page-header',
    imports: [
        RouterLink,
        LucideDynamicIcon,
        NgpBreadcrumbs,
        NgpBreadcrumbList,
        NgpBreadcrumbItem,
        NgpBreadcrumbLink,
        NgpBreadcrumbPage,
        NgpBreadcrumbSeparator,
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: { class: 'flex flex-wrap items-end justify-between gap-x-6 gap-y-4' },
    template: `
        <div class="flex flex-col gap-1 min-w-0">
            @if (crumbs().length) {
                <nav ngpBreadcrumbs aria-label="Migas de pan" class="mb-1">
                    <ol ngpBreadcrumbList class="flex flex-wrap items-center gap-1.5 text-sm text-on-surface-variant">
                        @for (crumb of crumbs(); track $index; let last = $last) {
                            <li ngpBreadcrumbItem class="flex items-center gap-1.5 min-w-0">
                                @if (crumb.link && !last) {
                                    <a
                                        ngpBreadcrumbLink
                                        [routerLink]="crumb.link"
                                        class="hover:text-primary transition-colors rounded outline-none focus-visible:outline-2 focus-visible:outline-surface-tint"
                                        >{{ crumb.label }}</a
                                    >
                                } @else {
                                    <span ngpBreadcrumbPage class="text-on-surface font-medium truncate max-w-xs">{{
                                        crumb.label
                                    }}</span>
                                }
                            </li>
                            @if (!last) {
                                <li ngpBreadcrumbSeparator aria-hidden="true" class="flex">
                                    <svg [lucideIcon]="LucideChevronRight" class="size-3.5"></svg>
                                </li>
                            }
                        }
                    </ol>
                </nav>
            }
            <h1 class="text-3xl font-extrabold tracking-tight font-headline text-on-surface text-balance break-words">
                {{ title() }}
            </h1>
            <div class="text-sm text-on-surface-variant flex flex-wrap items-center gap-x-2 gap-y-1 min-h-5">
                <ng-content select="[pageSubtitle]">{{ subtitle() }}</ng-content>
            </div>
        </div>
        <div class="flex flex-wrap items-center gap-3">
            <ng-content select="[pageActions]" />
        </div>
    `,
})
export class PageHeader {
    protected readonly LucideChevronRight = LucideChevronRight;

    readonly title = input.required<string>();
    readonly subtitle = input<string>('');
    readonly crumbs = input<Crumb[]>([]);
}
