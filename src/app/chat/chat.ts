import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import {
    LucideDynamicIcon,
    LucideFileText,
    LucideFileType,
    LucideCircleCheck,
    LucideClock,
    LucideBot,
    LucideTrash2,
    LucideShare,
    LucideLink,
    LucideSparkles,
    LucidePaperclip,
    LucideSlidersHorizontal,
    LucideArrowUp,
} from '@lucide/angular';
import type { LucideIconInput } from '@lucide/angular';

interface ContextDocument {
    name: string;
    detail: string;
    icon: LucideIconInput;
    status: 'synced' | 'pending';
}

interface Citation {
    label: string;
}

interface ChatMessage {
    role: 'user' | 'ai';
    content: string[];
    time: string;
    citations?: Citation[];
}

@Component({
    selector: 'app-chat',
    imports: [LucideDynamicIcon],
    templateUrl: './chat.html',
    styleUrl: './chat.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Chat {
    protected readonly LucideFileText = LucideFileText;
    protected readonly LucideFileType = LucideFileType;
    protected readonly LucideCircleCheck = LucideCircleCheck;
    protected readonly LucideClock = LucideClock;
    protected readonly LucideBot = LucideBot;
    protected readonly LucideTrash2 = LucideTrash2;
    protected readonly LucideShare = LucideShare;
    protected readonly LucideLink = LucideLink;
    protected readonly LucideSparkles = LucideSparkles;
    protected readonly LucidePaperclip = LucidePaperclip;
    protected readonly LucideSlidersHorizontal = LucideSlidersHorizontal;
    protected readonly LucideArrowUp = LucideArrowUp;

    contextDocuments = signal<ContextDocument[]>([
        { name: 'Análisis Trimestral 2024.pdf', detail: 'Updated 2 days ago', icon: LucideFileText, status: 'synced' },
        { name: 'Estrategia de Crecimiento.docx', detail: 'Inferred locally', icon: LucideFileType, status: 'synced' },
        { name: 'Notas_Reunion_Ventas.pdf', detail: 'Pending Sync', icon: LucideFileText, status: 'pending' },
    ]);

    messages = signal<ChatMessage[]>([
        {
            role: 'user',
            content: [
                '¿Cuáles son las proyecciones de ingresos para el tercer trimestre según los documentos analizados?',
            ],
            time: 'You • 10:42 AM',
        },
        {
            role: 'ai',
            content: [
                'Basado en el archivo <strong class="text-primary-container">"Análisis Trimestral 2024.pdf"</strong>, las proyecciones indican un crecimiento del 14% para el Q3, impulsado principalmente por la nueva línea de servicios inteligentes.',
                'Se espera alcanzar los $4.2M en ingresos brutos, asumiendo que la tasa de retención de clientes se mantenga por encima del 92% como se describe en la sección de riesgos del documento.',
            ],
            time: 'Curator AI • Just now',
            citations: [{ label: 'Análisis Trimestral (Pag. 12)' }, { label: 'Estrategia Crecimiento (Sec. 4)' }],
        },
        {
            role: 'user',
            content: ['¿Existe algún riesgo mencionado sobre la cadena de suministro en estos informes?'],
            time: 'You • 10:45 AM',
        },
    ]);

    inputValue = signal('');
}
