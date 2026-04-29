import {
    ChangeDetectionStrategy,
    Component,
    ElementRef,
    OnDestroy,
    OnInit,
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
    LucideMessageSquarePlus,
    LucideSparkles,
    LucideSquare,
    LucideTrash2,
} from '@lucide/angular';
import { map, of, switchMap, tap } from 'rxjs';
import type { Subscription } from 'rxjs';
import { ChatService } from '../core/services/chat.service';
import { MarkdownPipe } from '../core/pipes/markdown.pipe';
import type { ConversationListItem } from '../core/models/conversation.model';

interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
    thinking?: string;
    timestamp: Date;
    streaming?: boolean;
}

interface ModelOption {
    id: string;
    label: string;
    emoji: string;
    model: string;
}

const MODELS: ModelOption[] = [
    { id: 'fast', label: 'Rápido', emoji: '⚡', model: 'gemma3:27b' },
    { id: 'thinking', label: 'Thinking', emoji: '🧠', model: 'gemma4:26b' },
    { id: 'coding', label: 'Coding', emoji: '💻', model: 'qwen3.6:27b' },
];

@Component({
    selector: 'app-chat',
    imports: [LucideDynamicIcon, MarkdownPipe],
    templateUrl: './chat.html',
    styleUrl: './chat.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: { class: 'flex h-full overflow-hidden' },
})
export class Chat implements OnInit, OnDestroy {
    protected readonly LucideArrowUp = LucideArrowUp;
    protected readonly LucideBrain = LucideBrain;
    protected readonly LucideChevronDown = LucideChevronDown;
    protected readonly LucideLoader = LucideLoader;
    protected readonly LucideMessageSquarePlus = LucideMessageSquarePlus;
    protected readonly LucideSparkles = LucideSparkles;
    protected readonly LucideSquare = LucideSquare;
    protected readonly LucideTrash2 = LucideTrash2;
    protected readonly models = MODELS;

    private readonly chatService = inject(ChatService);
    private streamSub: Subscription | null = null;

    readonly messagesContainer = viewChild<ElementRef<HTMLDivElement>>('messagesContainer');

    messages = signal<ChatMessage[]>([]);
    inputValue = signal('');
    streaming = signal(false);
    conversationId = signal<number | null>(null);
    conversations = signal<ConversationListItem[]>([]);
    loadingConversations = signal(true);
    selectedModel = signal<ModelOption>(MODELS[0]);
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

    ngOnInit(): void {
        this.chatService.getConversations().subscribe({
            next: (convs) => {
                this.conversations.set(convs.filter((c) => c.mode === 'general'));
                this.loadingConversations.set(false);
            },
            error: () => this.loadingConversations.set(false),
        });
    }

    ngOnDestroy(): void {
        this.streamSub?.unsubscribe();
    }

    newConversation(): void {
        if (this.streaming()) return;
        this.messages.set([]);
        this.conversationId.set(null);
        this.expandedThinking.set(new Set());
    }

    selectConversation(conv: ConversationListItem): void {
        if (this.streaming() || conv.id === this.conversationId()) return;
        this.chatService.getConversation(conv.id).subscribe({
            next: (detail) => {
                this.conversationId.set(detail.id);
                this.messages.set(
                    detail.messages.map((m) => ({
                        role: m.role,
                        content: m.content,
                        timestamp: new Date(m.created_at),
                    })),
                );
                this.expandedThinking.set(new Set());
            },
        });
    }

    deleteConversation(event: MouseEvent, id: number): void {
        event.stopPropagation();
        if (this.streaming()) return;
        this.chatService.deleteConversation(id).subscribe({
            next: () => {
                this.conversations.update((list) => list.filter((c) => c.id !== id));
                if (this.conversationId() === id) {
                    this.messages.set([]);
                    this.conversationId.set(null);
                }
            },
        });
    }

    selectModel(model: ModelOption): void {
        this.selectedModel.set(model);
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
        let justCreated = false;
        const model = this.selectedModel().model;

        const conversationId$ = this.conversationId()
            ? of(this.conversationId()!)
            : this.chatService.createConversation({ mode: 'general' }).pipe(
                  tap((conv) => {
                      this.conversationId.set(conv.id);
                      justCreated = true;
                  }),
                  map((conv) => conv.id),
              );

        this.streamSub = conversationId$
            .pipe(switchMap((id) => this.chatService.sendMessage(id, question, model)))
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
                        if (justCreated) {
                            this.refreshConversations();
                            justCreated = false;
                        }
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

    formatDate(dateStr: string): string {
        const date = new Date(dateStr);
        const now = new Date();
        const diffH = (now.getTime() - date.getTime()) / 3_600_000;
        if (diffH < 1) return 'Hace un momento';
        if (diffH < 24) return `Hace ${Math.floor(diffH)}h`;
        const diffD = Math.floor(diffH / 24);
        if (diffD < 7) return `Hace ${diffD}d`;
        return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
    }

    private refreshConversations(): void {
        this.chatService.getConversations().subscribe({
            next: (convs) => this.conversations.set(convs.filter((c) => c.mode === 'general')),
        });
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

