import {
    ChangeDetectionStrategy,
    Component,
    ElementRef,
    computed,
    effect,
    signal,
    viewChild,
} from '@angular/core';
import {
    LucideArrowUp,
    LucideBot,
    LucideDynamicIcon,
    LucideSparkles,
    LucideSquare,
} from '@lucide/angular';
import { MarkdownPipe } from '../core/pipes/markdown.pipe';

interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    streaming?: boolean;
}

const MOCK_RESPONSES = [
    'Claro, puedo ayudarte con eso. Esta es una respuesta de ejemplo del chat general.',
    'Interesante pregunta. En un chat general puedes preguntarme lo que necesites.',
    'Estoy aquí para ayudarte. Esta funcionalidad está en desarrollo, pronto podrás conectarla a un modelo real.',
    'Esa es una buena pregunta. De momento estoy en modo demo, pero muy pronto estaré completamente operativo.',
];

@Component({
    selector: 'app-chat',
    imports: [LucideDynamicIcon, MarkdownPipe],
    templateUrl: './chat.html',
    styleUrl: './chat.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: { class: 'flex flex-col h-full' },
})
export class Chat {
    protected readonly LucideArrowUp = LucideArrowUp;
    protected readonly LucideBot = LucideBot;
    protected readonly LucideSparkles = LucideSparkles;
    protected readonly LucideSquare = LucideSquare;

    readonly messagesContainer = viewChild<ElementRef<HTMLDivElement>>('messagesContainer');

    messages = signal<ChatMessage[]>([]);
    inputValue = signal('');
    streaming = signal(false);

    hasMessages = computed(() => this.messages().length > 0);

    private mockTimer: ReturnType<typeof setTimeout> | null = null;

    constructor() {
        effect(() => {
            const msgs = this.messages();
            if (msgs.length > 0) {
                queueMicrotask(() => this.scrollToBottom());
            }
        });
    }

    sendMessage(): void {
        const question = this.inputValue().trim();
        if (!question || this.streaming()) return;

        const userMsg: ChatMessage = { role: 'user', content: question, timestamp: new Date() };
        const assistantMsg: ChatMessage = {
            role: 'assistant',
            content: '',
            timestamp: new Date(),
            streaming: true,
        };

        this.messages.update((msgs) => [...msgs, userMsg, assistantMsg]);
        this.inputValue.set('');
        this.streaming.set(true);

        const response = MOCK_RESPONSES[Math.floor(Math.random() * MOCK_RESPONSES.length)];

        this.mockTimer = setTimeout(() => {
            this.messages.update((msgs) => {
                const updated = [...msgs];
                const last = { ...updated[updated.length - 1] };
                last.content = response;
                last.streaming = false;
                updated[updated.length - 1] = last;
                return updated;
            });
            this.streaming.set(false);
            this.mockTimer = null;
        }, 1200);
    }

    stopStream(): void {
        if (this.mockTimer) {
            clearTimeout(this.mockTimer);
            this.mockTimer = null;
        }
        this.messages.update((msgs) => {
            const updated = [...msgs];
            const last = { ...updated[updated.length - 1] };
            last.streaming = false;
            updated[updated.length - 1] = last;
            return updated;
        });
        this.streaming.set(false);
    }

    onKeydown(event: KeyboardEvent): void {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            this.sendMessage();
        }
    }

    formatTime(date: Date): string {
        return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    }

    private scrollToBottom(): void {
        const el = this.messagesContainer()?.nativeElement;
        if (el) el.scrollTop = el.scrollHeight;
    }
}
