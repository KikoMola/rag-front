import { DOCUMENT } from '@angular/common';
import { Injectable, effect, inject, signal } from '@angular/core';

export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'rag-theme';

/**
 * Tema claro u oscuro. La primera vez sigue al sistema; si el usuario lo cambia,
 * se recuerda en localStorage. `index.html` aplica el mismo valor antes de que
 * arranque Angular para evitar un parpadeo.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
    private readonly document = inject(DOCUMENT);

    readonly theme = signal<Theme>(this.initialTheme());

    constructor() {
        effect(() => {
            this.document.documentElement.dataset['theme'] = this.theme();
        });
    }

    toggle(): void {
        this.set(this.theme() === 'dark' ? 'light' : 'dark');
    }

    set(theme: Theme): void {
        this.theme.set(theme);
        try {
            localStorage.setItem(STORAGE_KEY, theme);
        } catch {
            // Almacenamiento no disponible: el tema solo dura esta sesión
        }
    }

    private initialTheme(): Theme {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored === 'light' || stored === 'dark') return stored;
        } catch {
            // Sin acceso a localStorage
        }
        const prefersDark = this.document.defaultView?.matchMedia?.('(prefers-color-scheme: dark)').matches;
        return prefersDark ? 'dark' : 'light';
    }
}
