import { Directive, computed, input } from '@angular/core';
import { NgpButton } from 'ng-primitives/button';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'ghost-danger';
export type ButtonSize = 'sm' | 'md' | 'icon' | 'icon-sm';

const BASE =
    'inline-flex items-center justify-center gap-2 shrink-0 whitespace-nowrap rounded-lg font-semibold select-none ' +
    'cursor-pointer transition-colors outline-none ' +
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-surface-tint ' +
    'data-[disabled]:opacity-50 data-[disabled]:cursor-not-allowed data-[disabled]:pointer-events-none';

const VARIANTS: Record<ButtonVariant, string> = {
    primary:
        'bg-linear-to-r from-primary to-primary-container text-on-primary shadow-sm hover:opacity-90 data-[press]:opacity-80',
    secondary:
        'bg-surface-container-lowest text-on-surface ring-1 ring-inset ring-outline/50 hover:bg-surface-container-low data-[press]:bg-surface-container',
    ghost: 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface data-[press]:bg-surface-container-highest',
    danger: 'bg-error text-on-error shadow-sm hover:opacity-90 data-[press]:opacity-80',
    'ghost-danger': 'text-on-surface-variant hover:bg-error-container hover:text-on-error-container',
};

const SIZES: Record<ButtonSize, string> = {
    sm: 'h-8 px-3 text-xs',
    md: 'h-10 px-4 text-sm',
    icon: 'size-10',
    'icon-sm': 'size-8',
};

/**
 * Botón de la aplicación. Usa el comportamiento y la accesibilidad de `NgpButton`
 * y aplica una de las variantes visuales comunes.
 *
 * `<button appButton variant="secondary" size="sm">Cancelar</button>`
 */
@Directive({
    selector: '[appButton]',
    hostDirectives: [{ directive: NgpButton, inputs: ['disabled'] }],
    host: { '[class]': 'classes()' },
})
export class AppButton {
    readonly variant = input<ButtonVariant>('primary');
    readonly size = input<ButtonSize>('md');

    protected readonly classes = computed(() => `${BASE} ${VARIANTS[this.variant()]} ${SIZES[this.size()]}`);
}
