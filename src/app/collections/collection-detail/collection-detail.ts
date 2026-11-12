import { DecimalPipe } from '@angular/common';
import {
    ChangeDetectionStrategy,
    Component,
    computed,
    ElementRef,
    inject,
    OnInit,
    signal,
    Type,
    ViewContainerRef,
    viewChild,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
    LucideDynamicIcon,
    LucideFileText,
    LucideFileType,
    LucideFileCode,
    LucideCloudUpload,
    LucideEllipsis,
    LucideHeadphones,
    LucideUpload,
    LucideMessageSquare,
    LucideTrash2,
    LucideRefreshCw,
    LucideChevronRight,
    LucideLoader,
    LucideAlertCircle,
    LucideCheckCircle2,
} from '@lucide/angular';
import type { LucideIconInput } from '@lucide/angular';
import {
    NgpAccordion,
    NgpAccordionContent,
    NgpAccordionItem,
    NgpAccordionTrigger,
} from 'ng-primitives/accordion';
import {
    NgpDialog,
    NgpDialogDescription,
    NgpDialogManager,
    NgpDialogOverlay,
    NgpDialogTitle,
} from 'ng-primitives/dialog';
import { NgpMenu, NgpMenuItem, NgpMenuTrigger } from 'ng-primitives/menu';
import { EMPTY, switchMap, catchError } from 'rxjs';
import { CollectionsService } from '../../core/services/collections.service';
import { TtsService } from '../../core/services/tts.service';
import type { Collection, CollectionDocument, DocumentStatus } from '../../core/models/collection.model';
import { AppButton } from '../../shared/ui/button';
import { PageHeader } from '../../shared/ui/page-header';
import { ToastService } from '../../shared/ui/toast';

const FORMAT_ICONS: Record<string, LucideIconInput> = {
    pdf: LucideFileText,
    txt: LucideFileType,
    md: LucideFileCode,
    docx: LucideFileText,
    html: LucideFileCode,
    epub: LucideFileText,
};

/** Tipo de plantilla que acepta NgpDialogManager.open (el contexto no se exporta). */
type DialogTemplate = Exclude<Parameters<NgpDialogManager['open']>[0], Type<unknown>>;

@Component({
    selector: 'app-collection-detail',
    imports: [
        RouterLink,
        DecimalPipe,
        LucideDynamicIcon,
        NgpAccordion,
        NgpAccordionItem,
        NgpAccordionTrigger,
        NgpAccordionContent,
        NgpDialog,
        NgpDialogOverlay,
        NgpDialogTitle,
        NgpDialogDescription,
        NgpMenu,
        NgpMenuItem,
        NgpMenuTrigger,
        AppButton,
        PageHeader,
    ],
    templateUrl: './collection-detail.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: {
        class: 'block min-h-full relative',
        '(dragover)': 'onDragOver($event)',
        '(dragleave)': 'onDragLeave($event)',
        '(drop)': 'onDrop($event)',
    },
})
export class CollectionDetail implements OnInit {
    protected readonly LucideEllipsis = LucideEllipsis;
    protected readonly LucideHeadphones = LucideHeadphones;
    protected readonly LucideFileText = LucideFileText;
    protected readonly LucideCloudUpload = LucideCloudUpload;
    protected readonly LucideUpload = LucideUpload;
    protected readonly LucideMessageSquare = LucideMessageSquare;
    protected readonly LucideTrash2 = LucideTrash2;
    protected readonly LucideRefreshCw = LucideRefreshCw;
    protected readonly LucideChevronRight = LucideChevronRight;
    protected readonly LucideLoader = LucideLoader;
    protected readonly LucideAlertCircle = LucideAlertCircle;
    protected readonly LucideCheckCircle2 = LucideCheckCircle2;

    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    private readonly collectionsService = inject(CollectionsService);
    private readonly toast = inject(ToastService);
    private readonly ttsService = inject(TtsService);
    private readonly dialogs = inject(NgpDialogManager);
    private readonly viewContainerRef = inject(ViewContainerRef);
    private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

    private readonly confirmDeleteDocDialog = viewChild.required<DialogTemplate>('confirmDeleteDocDialog');

    /** Documento para el que se está encolando un audio. */
    generatingAudioFor = signal<number | null>(null);

    collectionId = signal(0);
    collection = signal<Collection | null>(null);
    documents = signal<CollectionDocument[]>([]);
    loading = signal(true);
    uploading = signal(false);
    deletingDoc = signal<number | null>(null);
    dragging = signal(false);
    pendingDeleteDocId = signal<number | null>(null);

    readonly dropZoneInput = viewChild<ElementRef<HTMLInputElement>>('dropZoneInput');

    pendingDeleteDoc = computed(() =>
        this.documents().find((d) => d.id === this.pendingDeleteDocId()),
    );

    openFilePicker(): void {
        this.dropZoneInput()?.nativeElement.click();
    }

    totalSize = computed(() => {
        const bytes = this.documents().reduce((sum, d) => sum + d.size_bytes, 0);
        return this.formatBytes(bytes);
    });

    indexedCount = computed(() => this.documents().filter((d) => d.status === 'indexed').length);

    totalChunks = computed(() => this.documents().reduce((sum, d) => sum + d.chunk_count, 0));

    ngOnInit(): void {
        const id = Number(this.route.snapshot.paramMap.get('id'));
        if (!id) {
            this.router.navigate(['/collections']);
            return;
        }
        this.collectionId.set(id);
        this.loadData();
    }

    loadData(): void {
        this.loading.set(true);
        this.collectionsService.getCollections().pipe(
            switchMap((collections) => {
                const match = collections.find((c) => c.id === this.collectionId());
                this.collection.set(match ?? null);
                if (!match) {
                    this.loading.set(false);
                    return EMPTY;
                }
                return this.collectionsService.getDocuments(this.collectionId());
            }),
            catchError(() => {
                this.loading.set(false);
                this.toast.error('No se pudo cargar la colección. Comprueba que el backend está en marcha.');
                return EMPTY;
            }),
        ).subscribe((docs) => {
            this.documents.set(docs);
            this.loading.set(false);
            this.pollProcessingDocs();
        });
    }

    getFormatIcon(format: string): LucideIconInput {
        return FORMAT_ICONS[format] ?? LucideFileText;
    }

    getStatusLabel(status: DocumentStatus): string {
        const labels: Record<DocumentStatus, string> = {
            pending: 'Pendiente',
            processing: 'Procesando',
            indexed: 'Indexado',
            error: 'Error',
        };
        return labels[status];
    }

    onDragOver(event: DragEvent): void {
        event.preventDefault();
        this.dragging.set(true);
    }

    onDragLeave(event?: DragEvent): void {
        // Moverse entre elementos de la página también dispara dragleave: solo
        // se cancela al salir de verdad de la pantalla
        const next = event?.relatedTarget as Node | null | undefined;
        if (next && this.host.nativeElement.contains(next)) return;
        this.dragging.set(false);
    }

    onDrop(event: DragEvent): void {
        event.preventDefault();
        this.dragging.set(false);
        const files = event.dataTransfer?.files;
        if (files?.length) {
            this.uploadFiles(Array.from(files));
        }
    }

    onFileSelect(event: Event): void {
        const input = event.target as HTMLInputElement;
        if (input.files?.length) {
            this.uploadFiles(Array.from(input.files));
            input.value = '';
        }
    }

    uploadFiles(files: File[]): void {
        this.uploading.set(true);
        this.collectionsService.uploadDocuments(this.collectionId(), files).subscribe({
            next: (newDocs) => {
                this.documents.update((list) => [...newDocs, ...list]);
                this.uploading.set(false);
                this.pollProcessingDocs();
                this.toast.success(
                    newDocs.length === 1
                        ? 'Documento subido. Se está indexando.'
                        : `${newDocs.length} documentos subidos. Se están indexando.`,
                );
            },
            error: () => {
                this.uploading.set(false);
                this.toast.error('No se pudieron subir los archivos. Revisa el formato e inténtalo de nuevo.');
            },
        });
    }

    /** Abre la confirmación de borrado desde el menú de acciones de un documento. */
    askDeleteDocument(docId: number): void {
        this.pendingDeleteDocId.set(docId);
        // Se abre tras cerrarse el menú; si no, el mismo clic cierra el diálogo
        setTimeout(() => this.dialogs.open(this.confirmDeleteDocDialog(), { viewContainerRef: this.viewContainerRef }));
    }

    /** Encola un MP3 del documento en la sección Audio. */
    generateAudio(doc: CollectionDocument): void {
        this.generatingAudioFor.set(doc.id);
        this.ttsService.createAudio({ documentId: doc.id }).subscribe({
            next: () => {
                this.generatingAudioFor.set(null);
                this.toast.info(`Audio de «${doc.filename}» en cola. Lo encontrarás en Audio.`);
            },
            error: (err) => {
                this.generatingAudioFor.set(null);
                const detail = err?.error?.detail;
                this.toast.error(typeof detail === 'string' ? detail : 'No se pudo crear el audio.');
            },
        });
    }

    statusSummary(doc: CollectionDocument): string {
        if (doc.status === 'error') return doc.error_message ?? 'No se pudo indexar el documento.';
        if (doc.status !== 'indexed') return 'El resumen aparecerá cuando termine la indexación.';
        return doc.summary ?? 'Este documento todavía no tiene resumen.';
    }

    requestDeleteDocument(event: Event, docId: number): void {
        event.stopPropagation();
        this.pendingDeleteDocId.set(docId);
    }

    confirmDeleteDocument(close: () => void): void {
        const docId = this.pendingDeleteDocId();
        if (!docId) return;
        close();
        this.deletingDoc.set(docId);
        this.collectionsService.deleteDocument(this.collectionId(), docId).subscribe({
            next: () => {
                this.documents.update((list) => list.filter((d) => d.id !== docId));
                this.deletingDoc.set(null);
                this.pendingDeleteDocId.set(null);
                this.toast.success('Documento eliminado.');
            },
            error: () => {
                this.deletingDoc.set(null);
                this.pendingDeleteDocId.set(null);
                this.toast.error('No se pudo eliminar el documento.');
            },
        });
    }

    deleteDocument(event: Event, docId: number): void {
        event.stopPropagation();
        this.deletingDoc.set(docId);
        this.collectionsService.deleteDocument(this.collectionId(), docId).subscribe({
            next: () => {
                this.documents.update((list) => list.filter((d) => d.id !== docId));
                this.deletingDoc.set(null);
            },
            error: () => this.deletingDoc.set(null),
        });
    }

    formatBytes(bytes: number): string {
        if (bytes === 0) return '0 B';
        const units = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
    }

    private pollProcessingDocs(): void {
        const processing = this.documents().filter((d) => d.status === 'pending' || d.status === 'processing');
        if (!processing.length) return;

        setTimeout(() => {
            for (const doc of processing) {
                this.collectionsService.getDocumentStatus(this.collectionId(), doc.id).subscribe({
                    next: (updated) => {
                        this.documents.update((list) =>
                            list.map((d) => (d.id === updated.id ? { ...d, ...updated } : d)),
                        );
                        if (updated.status === 'pending' || updated.status === 'processing') {
                            this.pollProcessingDocs();
                        }
                    },
                });
            }
        }, 3000);
    }
}
