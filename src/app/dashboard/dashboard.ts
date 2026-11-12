import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import {
    LucideAlertCircle,
    LucideArrowRight,
    LucideCheckCircle2,
    LucideClock,
    LucideCpu,
    LucideDatabase,
    LucideDynamicIcon,
    LucideFileText,
    LucideHeadphones,
    LucideMessageSquare,
    LucidePause,
    LucidePlay,
    LucideSendHorizontal,
} from '@lucide/angular';
import { NgpPopover, NgpPopoverTrigger } from 'ng-primitives/popover';
import { AudioPlayerService } from '../core/services/audio-player.service';
import { ChatService } from '../core/services/chat.service';
import { CollectionsService } from '../core/services/collections.service';
import { DashboardService } from '../core/services/dashboard.service';
import type { DashboardData } from '../core/services/dashboard.service';
import { TtsService } from '../core/services/tts.service';
import type { Collection } from '../core/models/collection.model';
import type { ConversationListItem } from '../core/models/conversation.model';
import type { TtsAudioListItem } from '../core/models/tts-audio.model';
import { AppButton } from '../shared/ui/button';
import { PageHeader } from '../shared/ui/page-header';
import { AppSelect } from '../shared/ui/select';
import type { SelectOption } from '../shared/ui/select';

/** Destino de la pregunta: el chat general o una colección concreta. */
const GENERAL_CHAT = 'general';

@Component({
    selector: 'app-dashboard',
    imports: [LucideDynamicIcon, RouterLink, AppButton, AppSelect, PageHeader, NgpPopover, NgpPopoverTrigger],
    templateUrl: './dashboard.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Dashboard implements OnInit {
    private readonly dashboardService = inject(DashboardService);
    private readonly chatService = inject(ChatService);
    private readonly collectionsService = inject(CollectionsService);
    private readonly ttsService = inject(TtsService);
    private readonly router = inject(Router);
    protected readonly player = inject(AudioPlayerService);

    protected readonly LucideAlertCircle = LucideAlertCircle;
    protected readonly LucideArrowRight = LucideArrowRight;
    protected readonly LucideCheckCircle2 = LucideCheckCircle2;
    protected readonly LucideClock = LucideClock;
    protected readonly LucideCpu = LucideCpu;
    protected readonly LucideDatabase = LucideDatabase;
    protected readonly LucideFileText = LucideFileText;
    protected readonly LucideHeadphones = LucideHeadphones;
    protected readonly LucideMessageSquare = LucideMessageSquare;
    protected readonly LucidePause = LucidePause;
    protected readonly LucidePlay = LucidePlay;
    protected readonly LucideSendHorizontal = LucideSendHorizontal;
    protected readonly GENERAL_CHAT = GENERAL_CHAT;

    protected readonly loading = signal(true);
    protected readonly data = signal<DashboardData | null>(null);
    protected readonly collections = signal<Collection[]>([]);
    protected readonly conversations = signal<ConversationListItem[]>([]);
    protected readonly audios = signal<TtsAudioListItem[]>([]);

    protected readonly question = signal('');
    protected readonly target = signal<string>(GENERAL_CHAT);

    /** Solo se puede preguntar a colecciones que tienen documentos. */
    protected readonly askableCollections = computed(() => this.collections().filter((c) => c.document_count > 0));
    protected readonly targetOptions = computed<SelectOption[]>(() => [
        { value: GENERAL_CHAT, label: 'Chat general', description: 'sin documentos' },
        ...this.askableCollections().map((c) => ({
            value: String(c.id),
            label: c.name,
            description: `${c.document_count} ${c.document_count === 1 ? 'documento' : 'documentos'}`,
            group: 'Colecciones',
        })),
    ]);
    protected readonly targetCollection = computed(() =>
        this.collections().find((c) => String(c.id) === this.target()),
    );

    protected readonly lastConversation = computed(
        () => [...this.conversations()].sort((a, b) => b.updated_at.localeCompare(a.updated_at))[0] ?? null,
    );
    /** El audio que se está generando, o si no el último terminado. */
    protected readonly featuredAudio = computed(() => {
        const list = this.audios();
        return (
            list.find((a) => a.status === 'processing' || a.status === 'pending') ??
            list.find((a) => a.status === 'done') ??
            null
        );
    });
    protected readonly lastDocument = computed(() => this.data()?.recent_documents[0] ?? null);
    /** El resumen no trae el id de la colección del documento: se busca por nombre. */
    protected readonly lastDocumentLink = computed(() => {
        const name = this.lastDocument()?.collection_name;
        const collection = this.collections().find((c) => c.name === name);
        return collection ? ['/collections', collection.id] : ['/collections'];
    });

    ngOnInit(): void {
        this.dashboardService.getDashboard().subscribe({
            next: (d) => {
                this.data.set(d);
                this.loading.set(false);
            },
            error: () => this.loading.set(false),
        });
        // Lo demás es secundario: si falla, su tarjeta simplemente no aparece
        this.collectionsService.getCollections().subscribe({
            next: (list) => this.collections.set(list),
            error: () => this.collections.set([]),
        });
        this.chatService.getConversations().subscribe({
            next: (list) => this.conversations.set(list),
            error: () => this.conversations.set([]),
        });
        this.ttsService.getAudios().subscribe({
            next: (list) => this.audios.set(list),
            error: () => this.audios.set([]),
        });
    }

    /** Lleva la pregunta al chat elegido, que la envía nada más abrirse. */
    protected ask(): void {
        const q = this.question().trim();
        if (!q) return;
        const collection = this.targetCollection();
        if (collection) {
            this.router.navigate(['/collections', collection.id, 'chat'], { queryParams: { q } });
        } else {
            this.router.navigate(['/chat'], { queryParams: { q } });
        }
    }

    protected onQuestionKeydown(event: KeyboardEvent): void {
        if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
            event.preventDefault();
            this.ask();
        }
    }

    protected continueConversation(conv: ConversationListItem): void {
        if (conv.mode === 'rag') {
            // Las conversaciones de colección no guardan aquí a qué colección pertenecen
            this.router.navigate(['/collections']);
        } else {
            this.router.navigate(['/chat'], { queryParams: { c: conv.id } });
        }
    }

    protected playAudio(audio: TtsAudioListItem): void {
        this.player.play({
            id: audio.id,
            title: audio.title,
            subtitle: audio.source_name ?? 'Texto pegado',
            src: this.ttsService.fileUrl(audio.id),
        });
    }

    protected openCollection(id: number): void {
        this.router.navigate(['/collections', id]);
    }

    protected formatDate(dateStr: string): string {
        return new Date(dateStr).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
    }

    protected statusIcon(status: string) {
        if (status === 'indexed') return this.LucideCheckCircle2;
        if (status === 'error') return this.LucideAlertCircle;
        return this.LucideClock;
    }

    protected statusClass(status: string): string {
        if (status === 'indexed') return 'text-on-tertiary-fixed-variant';
        if (status === 'error') return 'text-error';
        return 'text-on-surface-variant';
    }

    protected statusLabel(status: string): string {
        if (status === 'indexed') return 'Indexado';
        if (status === 'error') return 'Error al indexar';
        return 'Indexándose';
    }
}
