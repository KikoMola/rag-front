import {
    ChangeDetectionStrategy,
    Component,
    ElementRef,
    OnDestroy,
    computed,
    effect,
    inject,
    signal,
    viewChild,
} from '@angular/core';
import {
    LucideArrowUp,
    LucideBrain,
    LucideChevronDown,
    LucideDynamicIcon,
    LucideLoader,
    LucideSparkles,
    LucideSquare,
} from '@lucide/angular';
import { map, of, switchMap, tap } from 'rxjs';
import type { Subscription } from 'rxjs';
import { ChatService } from '../core/services/chat.service';
import { MarkdownPipe } from '../core/pipes/markdown.pipe';

interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
    thinking?: string;
    timestamp: Date;
    streaming?: boolean;
}

@Component({
    selector: 'app-chat',
    imports: [LucideDynamicIcon, MarkdownPipe],
    templateUrl: './chat.html',
    styleUrl: './chat.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: { class: 'flex flex-col h-full' },
})
export class Chat implements OnDestroy {
    protected readonly LucideArrowUp = LucideArrowUp;
    protected readonly LucideBrain = LucideBrain;
    protected readonly LucideChevronDown = LucideChevronDown;
    protected readonly LucideLoader = LucideLoader;
    protected readonly LucideSparkles = LucideSparkles;
    protected readonly LucideSquare = LucideSquare;

    private readonly chatService = inject(ChatService);

    private streamSub: Subscription | null = null;

    readonly messagesContainer = viewChild<ElementRef<HTMLDivElement>>('messagesContainer');

    messages = signal<ChatMessage[]>([]);
    inputValue = signal('');
    streaming = signal(false);
    conversationId = signal<number | null>(null);

    expandedThinking = signal<Set<number>>(new Set());

    hasMessages = computed(() => this.messages().length > 0);

    constructor() {
        effect(() => {
            const msgs = this.messages();
            if (msgs.length > 0) {
                queueMicrotask(() => this.scrollToBottom());
            }
        });
    }

    ngOnDestroy(): void {
        this.streamSub?.unsubscribe();
    }

    sendMessage(): void {
        const question = this.inputValue().trim();
        if (!question || this.streaming()) return;

        const userMsg: ChatMessage = { role: 'user', content: question, timestamp: new Date() };
        const assistantMsg: ChatMessage = {
            role: 'assistant',
            content: '',
            thinking: '',
            timestamp: new Date(),
            streaming: true,
        };

        this.messages.update((msgs) => [...msgs, userMsg, assistantMsg]);
        this.inputValue.set('');
        this.streaming.set(true);

        let fullResponse = '';
        let thinkingContent = '';

        const conversationId$ = this.conversationId()
            ? of(this.conversationId()!)
            : this.chatService.createConversation({ mode: 'general' }).pipe(
                  tap((conv) => this.conversationId.set(conv.id)),
                  map((conv) => conv.id),
              );

        this.streamSub = conversationId$
            .pipe(switchMap((id) => this.chatService.sendMessage(id, question)))
            .subscribe({
                next: (event) => {
                    if (event.type === 'thinking') {
                        thinkingContent += event.token;
                        this.updateLastMessage(fullResponse, thinkingContent);
                    } else if (event.type === 'token') {
                        fullResponse += event.token;
                        this.updateLastMessage(fullResponse, thinkingContent);
                    } else if (event.type === 'done') {
                        this.finishStream();
                    } else if (event.type === 'error') {
                        this.messages.update((msgs) => {
                            const updated = [...msgs];
                            const last = { ...updated[updated.length - 1] };
                            last.content = event.error ?? 'Error al procesar la consulta.';
                            last.streaming = false;
                            updated[updated.length - 1] = last;
                            return updated;
                        });
                        this.streaming.set(false);
                    }
                },
                error: () => {
                    this.messages.update((msgs) => {
                        const updated = [...msgs];
                        const last = { ...updated[updated.length - 1] };
                        last.content = 'Error de conexión con el servidor.';
                        last.streaming = false;
                        updated[updated.length - 1] = last;
                        return updated;
                    });
                    this.streaming.set(false);
                },
            });
    }

    stopStream(): void {
        this.streamSub?.unsubscribe();
        this.streamSub = null;
        this.finishStream();
    }

    toggleThinking(index: number): void {
        this.expandedThinking.update((set) => {
            const newSet = new Set(set);
            if (newSet.has(index)) {
                newSet.delete(index);
            } else {
                newSet.add(index);
            }
            return newSet;
        });
    }

    isThinkingExpanded(index: number): boolean {
        return this.expandedThinking().has(index);
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

    private finishStream(): void {
        this.messages.update((msgs) => {
            const updated = [...msgs];
            const last = { ...updated[updated.length - 1] };
            last.streaming = false;
            updated[updated.length - 1] = last;
            return updated;
        });
        this.streaming.set(false);
    }

    private updateLastMessage(content: string, thinking: string): void {
        this.messages.update((msgs) => {
            const updated = [...msgs];
            const last = { ...updated[updated.length - 1] };
            last.content = content;
            last.thinking = thinking;
            updated[updated.length - 1] = last;
            return updated;
        });
    }

    private scrollToBottom(): void {
        const el = this.messagesContainer()?.nativeElement;
        if (el) el.scrollTop = el.scrollHeight;
    }
}
