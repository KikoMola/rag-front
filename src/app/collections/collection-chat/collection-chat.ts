import {
    ChangeDetectionStrategy,
    Component,
    ElementRef,
    computed,
    effect,
    inject,
    OnDestroy,
    OnInit,
    signal,
    viewChild,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
    LucideDynamicIcon,
    LucideArrowUp,
    LucideBot,
    LucideChevronRight,
    LucideSparkles,
    LucideArrowLeft,
    LucideLoader,
    LucideBrain,
    LucideChevronDown,
    LucideSquare,
} from '@lucide/angular';
import { Subscription } from 'rxjs';
import { CollectionsService } from '../../core/services/collections.service';
import { RagChatService } from '../../core/services/rag-chat.service';
import { MarkdownPipe } from '../../core/pipes/markdown.pipe';
import type { Collection } from '../../core/models/collection.model';

interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
    thinking?: string;
    timestamp: Date;
    streaming?: boolean;
}

@Component({
    selector: 'app-collection-chat',
    imports: [RouterLink, LucideDynamicIcon, MarkdownPipe],
    templateUrl: './collection-chat.html',
    styleUrl: './collection-chat.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: { class: 'flex flex-col h-full' },
})
export class CollectionChat implements OnInit, OnDestroy {
    protected readonly LucideArrowUp = LucideArrowUp;
    protected readonly LucideBot = LucideBot;
    protected readonly LucideChevronRight = LucideChevronRight;
    protected readonly LucideSparkles = LucideSparkles;
    protected readonly LucideArrowLeft = LucideArrowLeft;
    protected readonly LucideLoader = LucideLoader;
    protected readonly LucideBrain = LucideBrain;
    protected readonly LucideChevronDown = LucideChevronDown;
    protected readonly LucideSquare = LucideSquare;

    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    private readonly collectionsService = inject(CollectionsService);
    private readonly ragChatService = inject(RagChatService);

    private streamSub: Subscription | null = null;

    readonly messagesContainer = viewChild<ElementRef<HTMLDivElement>>('messagesContainer');

    constructor() {
        effect(() => {
            const msgs = this.messages();
            if (msgs.length > 0) {
                queueMicrotask(() => this.scrollToBottom());
            }
        });
    }

    collectionId = signal(0);
    collection = signal<Collection | null>(null);
    messages = signal<ChatMessage[]>([]);
    inputValue = signal('');
    streaming = signal(false);
    loading = signal(true);

    expandedThinking = signal<Set<number>>(new Set());

    hasMessages = computed(() => this.messages().length > 0);

    ngOnInit(): void {
        const id = Number(this.route.snapshot.paramMap.get('id'));
        if (!id) {
            this.router.navigate(['/collections']);
            return;
        }
        this.collectionId.set(id);

        this.collectionsService.getCollections().subscribe({
            next: (collections) => {
                const match = collections.find((c) => c.id === this.collectionId());
                this.collection.set(match ?? null);
                this.loading.set(false);
            },
            error: () => this.loading.set(false),
        });
    }

    ngOnDestroy(): void {
        this.streamSub?.unsubscribe();
    }

    sendMessage(): void {
        const question = this.inputValue().trim();
        if (!question || this.streaming()) return;

        const userMsg: ChatMessage = {
            role: 'user',
            content: question,
            timestamp: new Date(),
        };

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

        this.streamSub = this.ragChatService.queryCollection(this.collectionId(), question).subscribe({
            next: (event) => {
                if (event.type === 'thinking' && event.token) {
                    thinkingContent += event.token;
                    this.updateLastMessage(fullResponse, thinkingContent);
                }

                if (event.type === 'token' && event.token) {
                    fullResponse += event.token;
                    this.updateLastMessage(fullResponse, thinkingContent);
                }

                if (event.type === 'done') {
                    this.finishStream();
                }

                if (event.type === 'error') {
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
        if (el) {
            el.scrollTop = el.scrollHeight;
        }
    }
}
