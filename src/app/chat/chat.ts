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
import { NgTemplateOutlet } from '@angular/common';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import {
    LucideBrain,
    LucideCheck,
    LucideCode,
    LucideCopy,
    LucideDownload,
    LucideDynamicIcon,
    LucideEllipsis,
    LucideFileText,
    LucideGitFork,
    LucideHistory,
    LucideLoader,
    LucideMessageSquarePlus,
    LucideSearch,
    LucideSparkles,
    LucideTrash2,
    LucideZap,
} from '@lucide/angular';
import type { LucideIconInput } from '@lucide/angular';
import { NgpDialog, NgpDialogOverlay, NgpDialogTitle, NgpDialogTrigger } from 'ng-primitives/dialog';
import { NgpMenu, NgpMenuItem, NgpMenuTrigger } from 'ng-primitives/menu';
import { NgpTooltipTrigger } from 'ng-primitives/tooltip';
import { catchError, debounceTime, distinctUntilChanged, EMPTY, map, of, switchMap, tap } from 'rxjs';
import type { Subscription } from 'rxjs';
import { ChatService } from '../core/services/chat.service';
import { AssistantMessage } from '../shared/chat/assistant-message';
import { ChatComposer } from '../shared/chat/chat-composer';
import { ThinkingTimer } from '../shared/chat/thinking-timer';
import type { ConversationListItem } from '../core/models/conversation.model';
import { AppButton } from '../shared/ui/button';
import { PageHeader } from '../shared/ui/page-header';
import { ToastService } from '../shared/ui/toast';

interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
    thinking?: string;
    thinkingSeconds?: number;
    timestamp: Date;
    streaming?: boolean;
    messageId?: number;
}

interface ModelOption {
    id: string;
    label: string;
    icon: LucideIconInput;
    model: string;
    hint: string;
}

const MODELS: ModelOption[] = [
    { id: 'fast', label: 'Rápido', icon: LucideZap, model: 'gemma3:27b', hint: 'Respuestas directas' },
    {
        id: 'thinking',
        label: 'Razonamiento',
        icon: LucideBrain,
        model: 'gemma4:26b',
        hint: 'Piensa antes de responder',
    },
    { id: 'coding', label: 'Código', icon: LucideCode, model: 'qwen3.6:27b', hint: 'Especializado en programación' },
];

interface HistoryEntry {
    conversation: ConversationListItem;
    forks: ConversationListItem[];
}

interface HistoryGroup {
    label: string;
    entries: HistoryEntry[];
}

const DAY_MS = 86_400_000;

/** Agrupa por fecha y cuelga cada bifurcación de su conversación de origen. */
export function groupHistory(conversations: ConversationListItem[], now = new Date()): HistoryGroup[] {
    const ids = new Set(conversations.map((c) => c.id));
    const forksByParent = new Map<number, ConversationListItem[]>();
    const roots: ConversationListItem[] = [];
    for (const conv of conversations) {
        if (conv.forked_from_id !== null && ids.has(conv.forked_from_id)) {
            forksByParent.set(conv.forked_from_id, [...(forksByParent.get(conv.forked_from_id) ?? []), conv]);
        } else {
            roots.push(conv);
        }
    }

    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const labelFor = (iso: string): string => {
        const time = new Date(iso).getTime();
        if (time >= startOfToday) return 'Hoy';
        if (time >= startOfToday - DAY_MS) return 'Ayer';
        if (time >= startOfToday - 6 * DAY_MS) return 'Últimos 7 días';
        return 'Anteriores';
    };

    const groups: HistoryGroup[] = [];
    const sorted = [...roots].sort((a, b) => b.updated_at.localeCompare(a.updated_at));
    for (const conv of sorted) {
        const label = labelFor(conv.updated_at);
        let group = groups.find((g) => g.label === label);
        if (!group) {
            group = { label, entries: [] };
            groups.push(group);
        }
        group.entries.push({ conversation: conv, forks: forksByParent.get(conv.id) ?? [] });
    }
    return groups;
}

@Component({
    selector: 'app-chat',
    imports: [
        NgTemplateOutlet,
        LucideDynamicIcon,
        NgpTooltipTrigger,
        NgpMenu,
        NgpMenuItem,
        NgpMenuTrigger,
        NgpDialog,
        NgpDialogOverlay,
        NgpDialogTitle,
        NgpDialogTrigger,
        AppButton,
        PageHeader,
        AssistantMessage,
        ChatComposer,
    ],
    templateUrl: './chat.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: { class: 'flex h-full overflow-hidden' },
})
export class Chat implements OnInit, OnDestroy {
    protected readonly LucideCheck = LucideCheck;
    protected readonly LucideCopy = LucideCopy;
    protected readonly LucideDownload = LucideDownload;
    protected readonly LucideEllipsis = LucideEllipsis;
    protected readonly LucideFileText = LucideFileText;
    protected readonly LucideGitFork = LucideGitFork;
    protected readonly LucideHistory = LucideHistory;
    protected readonly LucideLoader = LucideLoader;
    protected readonly LucideMessageSquarePlus = LucideMessageSquarePlus;
    protected readonly LucideSearch = LucideSearch;
    protected readonly LucideSparkles = LucideSparkles;
    protected readonly LucideTrash2 = LucideTrash2;
    protected readonly models = MODELS;

    private readonly chatService = inject(ChatService);
    private readonly toast = inject(ToastService);
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
    copiedIndex = signal<number | null>(null);

    /** Texto del buscador del historial. */
    historyQuery = signal('');
    /** Conversaciones cuyo contenido coincide con la búsqueda (las devuelve el backend). */
    contentMatches = signal<ConversationListItem[] | null>(null);
    exporting = signal(false);

    hasMessages = computed(() => this.messages().length > 0);
    currentTitle = computed(() => {
        const id = this.conversationId();
        return this.conversations().find((c) => c.id === id)?.title ?? 'Nueva conversación';
    });

    historyGroups = computed(() => {
        const query = this.historyQuery().trim().toLowerCase();
        if (!query) return groupHistory(this.conversations());
        // Coincidencias por título al instante, más las del contenido cuando llegan
        const byTitle = this.conversations().filter((c) => c.title.toLowerCase().includes(query));
        const byContent = (this.contentMatches() ?? []).filter((c) => c.mode === 'general');
        const merged = new Map([...byTitle, ...byContent].map((c) => [c.id, c]));
        return groupHistory([...merged.values()]);
    });

    constructor() {
        effect(() => {
            const msgs = this.messages();
            if (msgs.length > 0) {
                queueMicrotask(() => this.scrollToBottom());
            }
        });

        toObservable(this.historyQuery)
            .pipe(
                map((q) => q.trim()),
                debounceTime(300),
                distinctUntilChanged(),
                switchMap((q) => {
                    if (q.length < 2) {
                        this.contentMatches.set(null);
                        return EMPTY;
                    }
                    return this.chatService.searchConversations(q).pipe(catchError(() => of([])));
                }),
                takeUntilDestroyed(),
            )
            .subscribe((results) => this.contentMatches.set(results));
    }

    ngOnInit(): void {
        this.chatService.getConversations().subscribe({
            next: (convs) => {
                this.conversations.set(convs.filter((c) => c.mode === 'general'));
                this.loadingConversations.set(false);
            },
            error: () => {
                this.loadingConversations.set(false);
                this.toast.error('No se pudo cargar el historial. Comprueba que el backend está en marcha.');
            },
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
                        messageId: m.id,
                    })),
                );
                this.expandedThinking.set(new Set());
            },
            error: () => this.toast.error('No se pudo abrir la conversación.'),
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
                this.toast.success('Conversación eliminada.');
            },
            error: () => this.toast.error('No se pudo eliminar la conversación.'),
        });
    }

    /** Descarga la conversación activa en Markdown o PDF. */
    exportConversation(format: 'md' | 'pdf'): void {
        const id = this.conversationId();
        if (!id || this.exporting()) return;
        this.exporting.set(true);
        this.chatService.exportConversation(id, format).subscribe({
            next: (blob) => {
                this.exporting.set(false);
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `${this.currentTitle().replace(/[\\/:*?"<>|]+/g, '-')}.${format}`;
                link.click();
                URL.revokeObjectURL(url);
            },
            error: () => {
                this.exporting.set(false);
                this.toast.error('No se pudo exportar la conversación.');
            },
        });
    }

    deleteCurrentConversation(): void {
        const id = this.conversationId();
        if (id) this.deleteConversation(new MouseEvent('click'), id);
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
        const timer = new ThinkingTimer();
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
                        timer.onThinking();
                        this.updateLastMessage(fullResponse, thinkingContent, timer.seconds);
                    } else if (event.type === 'token') {
                        fullResponse += event.token;
                        timer.onContent();
                        this.updateLastMessage(fullResponse, thinkingContent, timer.seconds);
                    } else if (event.type === 'done') {
                        this.finishStream();
                        const convId = this.conversationId();
                        if (convId) {
                            this.chatService.getConversation(convId).subscribe({
                                next: (detail) => {
                                    this.messages.update((msgs) =>
                                        msgs.map((m, i) => ({ ...m, messageId: detail.messages[i]?.id }))
                                    );
                                },
                            });
                        }
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

    copyMessage(content: string, index: number): void {
        navigator.clipboard.writeText(content).then(
            () => {
                this.copiedIndex.set(index);
                setTimeout(() => this.copiedIndex.set(null), 2000);
            },
            () => this.toast.error('No se pudo copiar al portapapeles.'),
        );
    }

    forkFromMessage(messageId: number): void {
        const convId = this.conversationId();
        if (!convId) return;
        this.chatService.forkConversation(convId, messageId).subscribe({
            next: (fork) => {
                this.refreshConversations();
                this.chatService.getConversation(fork.id).subscribe({
                    next: (detail) => {
                        this.conversationId.set(detail.id);
                        this.messages.set(
                            detail.messages.map((m) => ({
                                role: m.role,
                                content: m.content,
                                timestamp: new Date(m.created_at),
                                messageId: m.id,
                            }))
                        );
                        this.expandedThinking.set(new Set());
                        this.toast.success('Bifurcación creada a partir de ese mensaje.');
                    },
                });
            },
            error: () => this.toast.error('No se pudo bifurcar la conversación.'),
        });
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

    private updateLastMessage(content: string, thinking: string, thinkingSeconds?: number): void {
        this.messages.update((msgs) => {
            const updated = [...msgs];
            const last = { ...updated[updated.length - 1] };
            last.content = content;
            last.thinking = thinking;
            last.thinkingSeconds = thinkingSeconds;
            updated[updated.length - 1] = last;
            return updated;
        });
    }

    private scrollToBottom(): void {
        const el = this.messagesContainer()?.nativeElement;
        if (el) el.scrollTop = el.scrollHeight;
    }
}

