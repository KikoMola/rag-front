import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { AppSelect } from './select';
import type { SelectOption } from './select';

const OPTIONS: SelectOption[] = [
    { value: 'ef_dora', label: 'Dora', description: 'mujer', group: 'Español' },
    { value: 'em_alex', label: 'Alex', description: 'hombre', group: 'Español' },
    { value: 'af_heart', label: 'Heart', description: 'mujer', group: 'Inglés' },
];

@Component({
    imports: [AppSelect, ReactiveFormsModule],
    template: `
        <app-select label="Voz" [options]="options" [formControl]="control" />
    `,
})
class FormHost {
    options = OPTIONS;
    control = new FormControl<string | null>('ef_dora');
}

@Component({
    imports: [AppSelect],
    template: `<app-select label="Destino" labelPosition="hidden" [options]="options" [(value)]="value" />`,
})
class SignalHost {
    options = OPTIONS;
    value = signal<string | null>(null);
}

describe('AppSelect', () => {
    afterEach(() => document.querySelectorAll('.app-select-dropdown').forEach((el) => el.remove()));

    it('should show the label of the form control value and update it', () => {
        const fixture = TestBed.createComponent(FormHost);
        fixture.detectChanges();
        const trigger: HTMLElement = fixture.nativeElement.querySelector('[role="combobox"]');
        expect(trigger.textContent).toContain('Dora');
        const label: HTMLLabelElement = fixture.nativeElement.querySelector('label');
        expect(label.textContent).toContain('Voz');
        expect(trigger.getAttribute('aria-labelledby')).toBe(label.id);

        fixture.componentInstance.control.setValue('af_heart');
        fixture.detectChanges();
        expect(trigger.textContent).toContain('Heart');
    });

    it('should disable the trigger with the form control', () => {
        const fixture = TestBed.createComponent(FormHost);
        fixture.componentInstance.control.disable();
        fixture.detectChanges();
        const trigger: HTMLElement = fixture.nativeElement.querySelector('[role="combobox"]');
        expect(trigger.hasAttribute('data-disabled')).toBe(true);
    });

    it('should show the placeholder and accessible name when nothing is chosen', () => {
        const fixture = TestBed.createComponent(SignalHost);
        fixture.detectChanges();
        const trigger: HTMLElement = fixture.nativeElement.querySelector('[role="combobox"]');
        expect(trigger.textContent).toContain('Elige una opción');
        expect(fixture.nativeElement.querySelector('label').classList).toContain('sr-only');
    });

    it('should open a grouped list and write the picked option back', async () => {
        const fixture = TestBed.createComponent(SignalHost);
        fixture.detectChanges();
        const trigger: HTMLElement = fixture.nativeElement.querySelector('[role="combobox"]');

        trigger.click();
        fixture.detectChanges();
        await fixture.whenStable();
        // El desplegable se abre de forma asíncrona
        await new Promise((r) => setTimeout(r, 50));
        fixture.detectChanges();

        const dropdown = document.querySelector('.app-select-dropdown')!;
        expect(dropdown).toBeTruthy();
        const groups = [...dropdown.querySelectorAll('.app-select-group')].map((g) => g.textContent!.trim());
        expect(groups).toEqual(['Español', 'Inglés']);

        const alex = [...dropdown.querySelectorAll('[role="option"]')].find((o) => o.textContent!.includes('Alex'));
        (alex as HTMLElement).click();
        fixture.detectChanges();

        expect(fixture.componentInstance.value()).toBe('em_alex');
        expect(trigger.textContent).toContain('Alex');
    });
});
