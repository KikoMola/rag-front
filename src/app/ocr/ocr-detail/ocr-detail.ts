import {
    ChangeDetectionStrategy,
    Component,
    OnDestroy,
    OnInit,
    inject,
    signal,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { EMPTY, interval, Subscription } from 'rxjs';
import { catchError, startWith, switchMap, takeWhile } from 'rxjs/operators';
import {
    LucideAlertCircle,
    LucideArrowLeft,
    LucideCalendar,
    LucideCheckCircle,
    LucideChevronRight,
    LucideClock,
    LucideCopy,
    LucideFileImage,
    LucideFileText,
    LucideFolderPlus,
    LucideFolderOpen,
    LucideHeadphones,
    LucideLoader,
    LucideScanText,
    LucideDynamicIcon,
    LucideX,
} from '@lucide/angular';
import {
    NgpDialog,
    NgpDialogDescription,
    NgpDialogOverlay,
    NgpDialogTitle,
    NgpDialogTrigger,
} from 'ng-primitives/dialog';
import { NgpTabButton, NgpTabList, NgpTabPanel, NgpTabset } from 'ng-primitives/tabs';
import { CollectionsService } from '../../core/services/collections.service';
import { OcrService } from '../../core/services/ocr.service';
import { TtsService } from '../../core/services/tts.service';
import { MarkdownPipe } from '../../core/pipes/markdown.pipe';
import type { Collection } from '../../core/models/collection.model';
import type { OcrDocument } from '../../core/models/ocr-document.model';
import { AppButton } from '../../shared/ui/button';
import { PageHeader } from '../../shared/ui/page-header';
import { ToastService } from '../../shared/ui/toast';

const POLL_INTERVAL_MS = 3000;

@Component({
    selector: 'app-ocr-detail',
    imports: [
        RouterLink,
        LucideDynamicIcon,
        MarkdownPipe,
        AppButton,
        PageHeader,
        NgpTabset,
        NgpTabList,
        NgpTabButton,
        NgpTabPanel,
        NgpDialog,
        NgpDialogOverlay,
        NgpDialogTitle,
        NgpDialogDescription,
        NgpDialogTrigger,
    ],
    templateUrl: './ocr-detail.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: { class: 'flex flex-col h-full overflow-hidden' },
})
export class OcrDetail implements OnInit, OnDestroy {
    protected readonly LucideFolderPlus = LucideFolderPlus;
    protected readonly LucideFolderOpen = LucideFolderOpen;
    protected readonly LucideHeadphones = LucideHeadphones;
    protected readonly LucideX = LucideX;
    protected readonly LucideAlertCircle = LucideAlertCircle;
    protected readonly LucideArrowLeft = LucideArrowLeft;
    protected readonly LucideCalendar = LucideCalendar;
    protected readonly LucideCheckCircle = LucideCheckCircle;
    protected readonly LucideChevronRight = LucideChevronRight;
    protected readonly LucideClock = LucideClock;
    protected readonly LucideCopy = LucideCopy;
    protected readonly LucideFileImage = LucideFileImage;
    protected readonly LucideFileText = LucideFileText;
    protected readonly LucideLoader = LucideLoader;
    protected readonly LucideScanText = LucideScanText;

    private readonly ocrService = inject(OcrService);
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    private readonly toast = inject(ToastService);
    private readonly ttsService = inject(TtsService);
    private readonly collectionsService = inject(CollectionsService);

    document = signal<OcrDocument | null>(null);
    loading = signal(true);
    copySuccess = signal(false);
    generatingAudio = signal(false);
    /** Colecciones para «Añadir a colección»; null mientras se cargan. */
    collections = signal<Collection[] | null>(null);
    addingTo = signal<number | null>(null);

    /** Nombre del archivo sin extensión, para el título del audio y del documento. */
    private baseName(): string {
        return (this.document()?.filename ?? 'documento').replace(/\.[^.]+$/, '');
    }

    /** Encola un MP3 con el texto extraído. */
    generateAudio(): void {
        const content = this.document()?.markdown_content;
        if (!content || this.generatingAudio()) return;
        this.generatingAudio.set(true);
        this.ttsService.createAudio({ text: content, title: this.baseName() }).subscribe({
            next: () => {
                this.generatingAudio.set(false);
                this.toast.info('Audio en cola. Lo encontrarás en Audio.');
            },
            error: (err) => {
                this.generatingAudio.set(false);
                const detail = err?.error?.detail;
                this.toast.error(typeof detail === 'string' ? detail : 'No se pudo crear el audio.');
            },
        });
    }

    loadCollections(): void {
        this.collections.set(null);
        this.collectionsService.getCollections().subscribe({
            next: (list) => this.collections.set(list),
            error: () => {
                this.collections.set([]);
                this.toast.error('No se pudieron cargar las colecciones.');
            },
        });
    }

    /** Sube el texto extraído como un .md a la colección elegida, donde se indexa como cualquier documento. */
    addToCollection(collection: Collection, close: () => void): void {
        const content = this.document()?.markdown_content;
        if (!content || this.addingTo()) return;
        this.addingTo.set(collection.id);
        const file = new File([content], `${this.baseName()}.md`, { type: 'text/markdown' });
        this.collectionsService.uploadDocuments(collection.id, [file]).subscribe({
            next: () => {
                this.addingTo.set(null);
                close();
                this.toast.success(`Añadido a «${collection.name}». Se está indexando.`);
            },
            error: () => {
                this.addingTo.set(null);
                this.toast.error('No se pudo añadir el texto a la colección.');
            },
        });
    }

    private pollSub: Subscription | null = null;

    ngOnInit(): void {
        const id = Number(this.route.snapshot.paramMap.get('id'));
        if (isNaN(id)) {
            this.router.navigate(['/ocr']);
            return;
        }
        this.startPolling(id);
    }

    ngOnDestroy(): void {
        this.pollSub?.unsubscribe();
    }

    private startPolling(id: number): void {
        this.pollSub = interval(POLL_INTERVAL_MS)
            .pipe(
                startWith(0),
                switchMap(() =>
                    this.ocrService.getDocument(id).pipe(
                        catchError(() => {
                            this.loading.set(false);
                            return EMPTY;
                        }),
                    ),
                ),
                takeWhile((doc) => doc.status !== 'done' && doc.status !== 'error', true),
            )
            .subscribe((doc) => {
                this.document.set(doc);
                this.loading.set(false);
            });
    }

    copyMarkdown(): void {
        const content = this.document()?.markdown_content;
        if (!content) return;
        navigator.clipboard.writeText(content).then(
            () => {
                this.copySuccess.set(true);
                this.toast.success('Texto copiado al portapapeles.');
                setTimeout(() => this.copySuccess.set(false), 2000);
            },
            () => this.toast.error('No se pudo copiar al portapapeles.'),
        );
    }

    formatBytes(bytes: number): string {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }

    formatDate(iso: string): string {
        return new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    }
}
