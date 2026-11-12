import { ChangeDetectionStrategy, Component, input, model, output } from '@angular/core';
import { LucideArrowUp, LucideDynamicIcon, LucideSquare } from '@lucide/angular';
import { NgpTooltipTrigger } from 'ng-primitives/tooltip';
import { AppButton } from '../ui/button';

let nextId = 0;

/**
 * Caja de escritura común a los chats. Intro envía, Mayús + Intro hace salto de
 * línea, y el área de texto crece con el contenido hasta un máximo.
 * Lo que se proyecte con `[composerTools]` aparece encima (p. ej. el modo).
 */
@Component({
    selector: 'app-chat-composer',
    imports: [LucideDynamicIcon, NgpTooltipTrigger, AppButton],
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: { class: 'block' },
    template: `
        <div class="max-w-4xl mx-auto w-full">
            <ng-content select="[composerTools]" />
            <div
                class="bg-surface-container-lowest rounded-2xl shadow-xl shadow-on-surface/5 p-2 border border-outline-variant/40 focus-within:ring-2 focus-within:ring-surface-tint/40 transition-shadow"
            >
                <div class="flex items-end gap-2 p-1">
                    <label [for]="inputId" class="sr-only">{{ label() }}</label>
                    <textarea
                        [id]="inputId"
                        class="flex-1 bg-transparent border-none outline-none focus:ring-0 text-base py-2.5 px-3 resize-none max-h-48 min-h-11 field-sizing-content font-body text-on-surface placeholder:text-on-surface-variant"
                        [placeholder]="placeholder()"
                        rows="1"
                        [value]="value()"
                        (input)="value.set($any($event.target).value)"
                        (keydown)="onKeydown($event)"
                    ></textarea>
                    @if (streaming()) {
                        <button
                            appButton
                            variant="danger"
                            size="icon"
                            (click)="stop.emit()"
                            ngpTooltipTrigger
                            aria-label="Detener generación"
                        >
                            <span class="sr-only">Detener</span>
                            <svg [lucideIcon]="LucideSquare" class="size-4"></svg>
                        </button>
                    } @else {
                        <button
                            appButton
                            size="icon"
                            (click)="submit()"
                            [disabled]="!value().trim()"
                            ngpTooltipTrigger
                            aria-label="Enviar mensaje"
                        >
                            <span class="sr-only">Enviar (Intro)</span>
                            <svg [lucideIcon]="LucideArrowUp" class="size-5"></svg>
                        </button>
                    }
                </div>
            </div>
            <p class="text-center text-xs text-on-surface-variant mt-2">{{ hint() }}</p>
        </div>
    `,
})
export class ChatComposer {
    protected readonly LucideArrowUp = LucideArrowUp;
    protected readonly LucideSquare = LucideSquare;
    protected readonly inputId = `chat-composer-${nextId++}`;

    readonly value = model('');
    readonly streaming = input(false);
    readonly placeholder = input('Escribe tu mensaje...');
    readonly label = input('Mensaje');
    readonly hint = input('Intro para enviar · Mayús + Intro para salto de línea.');

    readonly send = output<void>();
    readonly stop = output<void>();

    protected submit(): void {
        if (this.value().trim() && !this.streaming()) this.send.emit();
    }

    protected onKeydown(event: KeyboardEvent): void {
        if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
            event.preventDefault();
            this.submit();
        }
    }
}
