import { ChangeDetectionStrategy, Component, Injectable, inject } from '@angular/core';
import { LucideCircleAlert, LucideCircleCheck, LucideDynamicIcon, LucideInfo, LucideX } from '@lucide/angular';
import { NgpToast, NgpToastManager, injectToastContext } from 'ng-primitives/toast';

export type ToastKind = 'success' | 'error' | 'info';

interface ToastContext {
    message: string;
    kind: ToastKind;
}

const ICONS = { success: LucideCircleCheck, error: LucideCircleAlert, info: LucideInfo };

@Component({
    selector: 'app-toast',
    imports: [LucideDynamicIcon],
    hostDirectives: [NgpToast],
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: {
        class: 'app-toast',
        '[attr.data-kind]': 'context.kind',
        '[attr.role]': "context.kind === 'error' ? 'alert' : 'status'",
    },
    template: `
        <svg [lucideIcon]="icon" class="size-5 shrink-0 app-toast-icon"></svg>
        <p class="flex-1 text-sm leading-snug">{{ context.message }}</p>
        <button
            type="button"
            (click)="dismiss()"
            class="shrink-0 -m-1 p-1 rounded-md opacity-70 hover:opacity-100 cursor-pointer outline-none focus-visible:outline-2 focus-visible:outline-current"
            aria-label="Cerrar aviso"
        >
            <svg [lucideIcon]="LucideX" class="size-4"></svg>
        </button>
    `,
})
export class AppToast {
    protected readonly LucideX = LucideX;
    protected readonly context = injectToastContext<ToastContext>();
    protected readonly icon = ICONS[this.context.kind];

    private readonly manager = inject(NgpToastManager);
    private readonly toast = inject(NgpToast);

    protected dismiss(): void {
        void this.manager.dismiss(this.toast);
    }
}

/** Avisos breves en la esquina inferior derecha. */
@Injectable({ providedIn: 'root' })
export class ToastService {
    private readonly manager = inject(NgpToastManager);

    success(message: string): void {
        this.show(message, 'success');
    }

    error(message: string): void {
        // Los errores se quedan más tiempo para dar tiempo a leerlos
        this.show(message, 'error', 6000);
    }

    info(message: string): void {
        this.show(message, 'info');
    }

    private show(message: string, kind: ToastKind, duration = 3500): void {
        this.manager.show(AppToast, { context: { message, kind } satisfies ToastContext, duration });
    }
}
