import { ChangeDetectionStrategy, Component, computed, forwardRef, input, model, signal } from '@angular/core';
import type { ControlValueAccessor } from '@angular/forms';
import { NG_VALUE_ACCESSOR } from '@angular/forms';
import { LucideCheck, LucideChevronDown, LucideDynamicIcon } from '@lucide/angular';
import { NgpFormField, NgpLabel } from 'ng-primitives/form-field';
import { NgpSelect, NgpSelectDropdown, NgpSelectOption, NgpSelectPortal } from 'ng-primitives/select';

export interface SelectOption<T = string> {
    value: T;
    label: string;
    /** Texto secundario a la derecha de la opción (p. ej. «2 documentos»). */
    description?: string;
    /** Las opciones con el mismo grupo se muestran juntas bajo ese título. */
    group?: string;
}

interface OptionGroup<T> {
    label: string | null;
    options: SelectOption<T>[];
}

let nextId = 0;

/**
 * Desplegable de la aplicación sobre `ng-primitives/select`: teclado, foco y ARIA
 * los pone la librería. Funciona con formularios reactivos (`formControlName`) y
 * con señales (`[(value)]`).
 *
 * Es un `ngpFormField` con su propia etiqueta: `NgpSelect` toma de ahí su nombre
 * accesible y descarta cualquier `aria-labelledby` puesto desde fuera.
 */
@Component({
    selector: 'app-select',
    imports: [LucideDynamicIcon, NgpLabel, NgpSelect, NgpSelectDropdown, NgpSelectOption, NgpSelectPortal],
    hostDirectives: [NgpFormField],
    providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => AppSelect), multi: true }],
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: { '[class]': 'hostClass()' },
    template: `
        <label ngpLabel [class]="labelClass()">{{ label() }}</label>
        <div
            ngpSelect
            [id]="id()"
            [ngpSelectValue]="value()"
            (ngpSelectValueChange)="select($event)"
            (ngpSelectOpenChange)="$event || onTouched()"
            [ngpSelectDisabled]="disabled()"
            ngpSelectDropdownPlacement="bottom-start"
            [class.flex-1]="labelPosition() === 'inline'"
            class="group flex w-full min-w-0 items-center gap-2 rounded-lg bg-surface-container-high px-3 text-sm text-on-surface cursor-pointer select-none outline-none transition-colors hover:bg-surface-container-highest focus-visible:outline-2 focus-visible:outline-surface-tint data-[open]:outline-2 data-[open]:outline-surface-tint data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50"
            [class]="size() === 'sm' ? 'h-9' : 'h-11'"
        >
            <span class="flex-1 min-w-0 truncate text-left" [class.text-on-surface-variant]="!selected()">
                {{ selected()?.label ?? placeholder() }}
            </span>
            <svg
                [lucideIcon]="LucideChevronDown"
                class="size-4 shrink-0 text-on-surface-variant transition-transform group-data-[open]:rotate-180"
            ></svg>

            <div *ngpSelectPortal ngpSelectDropdown class="app-select-dropdown">
                @for (group of groups(); track group.label) {
                    @if (group.label) {
                        <div class="app-select-group" role="presentation">{{ group.label }}</div>
                    }
                    @for (option of group.options; track option.value) {
                        <div ngpSelectOption [ngpSelectOptionValue]="option.value" class="group/option">
                            <svg
                                [lucideIcon]="LucideCheck"
                                class="size-4 shrink-0 invisible group-data-[selected]/option:visible"
                            ></svg>
                            <span class="flex-1 min-w-0 truncate">{{ option.label }}</span>
                            @if (option.description) {
                                <span class="shrink-0 text-xs text-on-surface-variant">{{ option.description }}</span>
                            }
                        </div>
                    }
                }
            </div>
        </div>
    `,
})
export class AppSelect<T = string> implements ControlValueAccessor {
    protected readonly LucideCheck = LucideCheck;
    protected readonly LucideChevronDown = LucideChevronDown;

    readonly options = input<SelectOption<T>[]>([]);
    readonly value = model<T | null>(null);
    readonly placeholder = input('Elige una opción');
    /** Etiqueta del campo; también es su nombre accesible. */
    readonly label = input.required<string>();
    /** `stacked`: etiqueta encima; `inline`: a la izquierda; `hidden`: solo para lectores de pantalla. */
    readonly labelPosition = input<'stacked' | 'inline' | 'hidden'>('stacked');
    readonly size = input<'sm' | 'md'>('md');
    readonly id = input(`app-select-${nextId++}`);

    protected readonly disabled = signal(false);

    protected readonly hostClass = computed(() =>
        this.labelPosition() === 'inline' ? 'flex items-center gap-3' : 'flex flex-col gap-1.5',
    );
    protected readonly labelClass = computed(() => {
        switch (this.labelPosition()) {
            case 'inline':
                return 'shrink-0 text-sm text-on-surface-variant';
            case 'hidden':
                return 'sr-only';
            default:
                return 'text-sm font-medium text-on-surface';
        }
    });

    protected readonly selected = computed(() => this.options().find((o) => o.value === this.value()) ?? null);

    protected readonly groups = computed(() => {
        const groups: OptionGroup<T>[] = [];
        for (const option of this.options()) {
            const label = option.group ?? null;
            const group = groups.find((g) => g.label === label);
            if (group) group.options.push(option);
            else groups.push({ label, options: [option] });
        }
        return groups;
    });

    private onChange: (value: T | null) => void = () => {};
    protected onTouched: () => void = () => {};

    protected select(value: T | null): void {
        this.value.set(value);
        this.onChange(value);
    }

    writeValue(value: T | null): void {
        this.value.set(value);
    }

    registerOnChange(fn: (value: T | null) => void): void {
        this.onChange = fn;
    }

    registerOnTouched(fn: () => void): void {
        this.onTouched = fn;
    }

    setDisabledState(disabled: boolean): void {
        this.disabled.set(disabled);
    }
}
