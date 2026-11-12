import { Injectable, computed, inject, signal } from '@angular/core';
import { DashboardService } from './dashboard.service';

export type SystemState = 'checking' | 'ok' | 'no-models' | 'offline';

/** Estado del backend y de Ollama, para mostrarlo en el menú lateral. */
@Injectable({ providedIn: 'root' })
export class SystemStatusService {
    private readonly dashboardService = inject(DashboardService);

    readonly state = signal<SystemState>('checking');
    readonly models = signal<string[]>([]);

    readonly label = computed(() => {
        switch (this.state()) {
            case 'checking':
                return 'Comprobando conexión…';
            case 'ok': {
                const n = this.models().length;
                return `Ollama · ${n} ${n === 1 ? 'modelo' : 'modelos'}`;
            }
            case 'no-models':
                return 'Ollama no responde';
            case 'offline':
                return 'Backend sin conexión';
        }
    });

    readonly detail = computed(() => {
        switch (this.state()) {
            case 'ok':
                return this.models().join(', ');
            case 'no-models':
                return 'El backend responde pero no ve modelos. Comprueba que Ollama está en marcha.';
            case 'offline':
                return 'No hay respuesta en http://localhost:8000. Arranca el backend con uvicorn.';
            default:
                return '';
        }
    });

    check(): void {
        this.state.set('checking');
        this.dashboardService.getDashboard().subscribe({
            next: (data) => {
                this.models.set(data.stats.models);
                this.state.set(data.stats.models.length ? 'ok' : 'no-models');
            },
            error: () => {
                this.models.set([]);
                this.state.set('offline');
            },
        });
    }
}
