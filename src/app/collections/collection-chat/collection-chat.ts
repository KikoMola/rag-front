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
    LucideFileText,
    LucideSquare,
} from '@lucide/angular';
import { map, of, Subscription, switchMap, tap } from 'rxjs';
import { CollectionsService } from '../../core/services/collections.service';
import { ChatService } from '../../core/services/chat.service';
import { AssistantMessage } from '../../shared/chat/assistant-message';
import { ChatComposer } from '../../shared/chat/chat-composer';
import { ThinkingTimer } from '../../shared/chat/thinking-timer';
import type { Collection } from '../../core/models/collection.model';
import type { Source } from '../../core/models/conversation.model';
import { AppButton } from '../../shared/ui/button';
import { PageHeader } from '../../shared/ui/page-header';
import { ToastService } from '../../shared/ui/toast';

interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
    thinking?: string;
    thinkingSeconds?: number;
    sources?: Source[];
    timestamp: Date;
    streaming?: boolean;
}

@Component({
    selector: 'app-collection-chat',
    imports: [RouterLink, LucideDynamicIcon, AppButton, PageHeader, AssistantMessage, ChatComposer],
    templateUrl: './collection-chat.html',
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
    protected readonly LucideFileText = LucideFileText;
    protected readonly LucideSquare = LucideSquare;

    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    private readonly collectionsService = inject(CollectionsService);
    private readonly chatService = inject(ChatService);
    private readonly toast = inject(ToastService);

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
    conversationId = signal<number | null>(null);
    messages = signal<ChatMessage[]>([]);
    inputValue = signal('');
    streaming = signal(false);
    loading = signal(true);

    expandedThinking = signal<Set<number>>(new Set());

    /** Preguntas propuestas por el backend; null mientras se generan. */
    suggestions = signal<string[] | null>(null);

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
                if (match && match.document_count > 0) this.loadSuggestions();
                // Desde Inicio se puede llegar con la pregunta ya escrita (?q=)
                const question = this.route.snapshot.queryParamMap?.get('q')?.trim();
                if (match && question) {
                    this.inputValue.set(question);
                    this.sendMessage();
                    void this.router.navigate([], { relativeTo: this.route, queryParams: {}, replaceUrl: true });
                }
            },
            error: () => {
                this.loading.set(false);
                this.toast.error('No se pudo cargar la colección. Comprueba que el backend está en marcha.');
            },
        });
    }

    ngOnDestroy(): void {
        this.streamSub?.unsubscribe();
    }

    /** Las preguntas sugeridas son opcionales: si fallan se muestran las genéricas. */
    private loadSuggestions(): void {
        this.collectionsService.getSuggestedQuestions(this.collectionId()).subscribe({
            next: (res) => this.suggestions.set(res.questions.slice(0, 4)),
            error: () => this.suggestions.set([]),
        });
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
            sources: [],
            timestamp: new Date(),
            streaming: true,
        };

        this.messages.update((msgs) => [...msgs, userMsg, assistantMsg]);
        this.inputValue.set('');
        this.streaming.set(true);

        let fullResponse = '';
        let thinkingContent = '';
        const timer = new ThinkingTimer();
        let sources: Source[] = [];

        const conversationId$ = this.conversationId()
            ? of(this.conversationId()!)
            : this.chatService
                  .createConversation({ mode: 'rag', collection_ids: [this.collectionId()] })
                  .pipe(
                      tap((conv) => this.conversationId.set(conv.id)),
                      map((conv) => conv.id),
                  );

        this.streamSub = conversationId$
            .pipe(switchMap((id) => this.chatService.sendMessage(id, question)))
            .subscribe({
                next: (event) => {
                    if (event.type === 'thinking') {
                        thinkingContent += event.token;
                        timer.onThinking();
                        this.updateLastMessage(fullResponse, thinkingContent, sources, timer.seconds);
                    } else if (event.type === 'sources') {
                        sources = event.sources;
                        this.updateLastMessage(fullResponse, thinkingContent, sources, timer.seconds);
                    } else if (event.type === 'token') {
                        fullResponse += event.token;
                        timer.onContent();
                        this.updateLastMessage(fullResponse, thinkingContent, sources, timer.seconds);
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

    private updateLastMessage(content: string, thinking: string, sources: Source[], thinkingSeconds?: number): void {
        this.messages.update((msgs) => {
            const updated = [...msgs];
            const last = { ...updated[updated.length - 1] };
            last.content = content;
            last.thinking = thinking;
            last.thinkingSeconds = thinkingSeconds;
            last.sources = sources;
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
