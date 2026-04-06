import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, ElementRef, inject, OnInit, signal, viewChild } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
    LucideDynamicIcon,
    LucideFileText,
    LucideFileType,
    LucideFileCode,
    LucideCloudUpload,
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
import { CollectionsService } from '../../core/services/collections.service';
import type { Collection, CollectionDocument, DocumentStatus } from '../../core/models/collection.model';

const FORMAT_ICONS: Record<string, LucideIconInput> = {
    pdf: LucideFileText,
    txt: LucideFileType,
    md: LucideFileCode,
    docx: LucideFileText,
    html: LucideFileCode,
    epub: LucideFileText,
};

@Component({
    selector: 'app-collection-detail',
    imports: [RouterLink, DecimalPipe, LucideDynamicIcon],
    templateUrl: './collection-detail.html',
    styleUrl: './collection-detail.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CollectionDetail implements OnInit {
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

    collectionId = signal(0);
    collection = signal<Collection | null>(null);
    documents = signal<CollectionDocument[]>([]);
    loading = signal(true);
    uploading = signal(false);
    deletingDoc = signal<number | null>(null);
    dragging = signal(false);

    readonly dropZoneInput = viewChild<ElementRef<HTMLInputElement>>('dropZoneInput');

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
        this.collectionsService.getCollections().subscribe({
            next: (collections) => {
                const match = collections.find((c) => c.id === this.collectionId());
                this.collection.set(match ?? null);
                if (!match) {
                    this.loading.set(false);
                    return;
                }
                this.collectionsService.getDocuments(this.collectionId()).subscribe({
                    next: (docs) => {
                        this.documents.set(docs);
                        this.loading.set(false);
                        this.pollProcessingDocs();
                    },
                    error: () => this.loading.set(false),
                });
            },
            error: () => this.loading.set(false),
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

    onDragLeave(): void {
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
            },
            error: () => this.uploading.set(false),
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
