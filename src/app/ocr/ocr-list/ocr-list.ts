import {
    ChangeDetectionStrategy,
    Component,
    ElementRef,
    OnInit,
    inject,
    signal,
    viewChild,
} from '@angular/core';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject } from 'rxjs';
import { switchMap, catchError, of } from 'rxjs';
import {
    LucideDynamicIcon,
    LucideScanText,
    LucideUpload,
    LucideTrash2,
    LucideLoader,
    LucideDownload,
    LucideFileImage,
    LucideFileText,
    LucideCalendar,
    LucideAlertCircle,
    LucideCheckCircle,
    LucideClock,
    LucideX,
} from '@lucide/angular';
import {
    NgpDialog,
    NgpDialogDescription,
    NgpDialogOverlay,
    NgpDialogTitle,
    NgpDialogTrigger,
} from 'ng-primitives/dialog';
import { Navbar } from '../../layout/navbar/navbar';
import { OcrService } from '../../core/services/ocr.service';
import type { OcrDocumentListItem, OcrStatus } from '../../core/models/ocr-document.model';

@Component({
    selector: 'app-ocr-list',
    imports: [LucideDynamicIcon, Navbar, NgpDialogTrigger, NgpDialog, NgpDialogOverlay, NgpDialogTitle, NgpDialogDescription],
    templateUrl: './ocr-list.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OcrList implements OnInit {
    protected readonly LucideScanText = LucideScanText;
    protected readonly LucideUpload = LucideUpload;
    protected readonly LucideTrash2 = LucideTrash2;
    protected readonly LucideLoader = LucideLoader;
    protected readonly LucideFileImage = LucideFileImage;
    protected readonly LucideFileText = LucideFileText;
    protected readonly LucideCalendar = LucideCalendar;
    protected readonly LucideAlertCircle = LucideAlertCircle;
    protected readonly LucideCheckCircle = LucideCheckCircle;
    protected readonly LucideClock = LucideClock;
    protected readonly LucideX = LucideX;
    protected readonly LucideDownload = LucideDownload;

    downloadingId = signal<number | null>(null);

    private readonly ocrService = inject(OcrService);
    private readonly router = inject(Router);

    readonly fileInput = viewChild<ElementRef<HTMLInputElement>>('fileInput');

    documents = signal<OcrDocumentListItem[]>([]);
    loading = signal(true);
    uploading = signal(false);
    deletingId = signal<number | null>(null);
    pendingDeleteId = signal<number | null>(null);
    error = signal<string | null>(null);

    private readonly refresh$ = new Subject<void>();

    constructor() {
        this.refresh$
            .pipe(
                switchMap(() => this.ocrService.getDocuments().pipe(catchError(() => of([])))),
                takeUntilDestroyed(),
            )
            .subscribe((docs) => {
                this.documents.set(docs);
                this.loading.set(false);
            });
    }

    ngOnInit(): void {
        this.refresh$.next();
    }

    triggerUpload(): void {
        this.fileInput()?.nativeElement.click();
    }

    onFileSelected(event: Event): void {
        const input = event.target as HTMLInputElement;
        const file = input.files?.[0];
        if (!file) return;
        input.value = '';
        this.uploading.set(true);
        this.error.set(null);
        this.ocrService
            .uploadDocument(file)
            .pipe(catchError(() => { this.error.set('Error al subir el documento.'); return of(null); }))
            .subscribe((doc) => {
                this.uploading.set(false);
                if (doc) {
                    this.documents.update((prev) => [doc, ...prev]);
                }
            });
    }

    navigateToDetail(id: number): void {
        this.router.navigate(['/ocr', id]);
    }

    requestDelete(event: MouseEvent, id: number): void {
        event.stopPropagation();
        this.pendingDeleteId.set(id);
    }

    confirmDelete(close: () => void): void {
        const id = this.pendingDeleteId();
        if (!id) return;
        close();
        this.deletingId.set(id);
        this.ocrService
            .deleteDocument(id)
            .pipe(catchError(() => { this.deletingId.set(null); this.pendingDeleteId.set(null); return of(null); }))
            .subscribe(() => {
                this.documents.update((prev) => prev.filter((d) => d.id !== id));
                this.deletingId.set(null);
                this.pendingDeleteId.set(null);
            });
    }

    pendingDeleteFilename(): string {
        return this.documents().find((d) => d.id === this.pendingDeleteId())?.filename ?? '';
    }

    formatBytes(bytes: number): string {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }

    formatDate(iso: string): string {
        return new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
    }

    downloadMarkdown(event: MouseEvent, id: number, filename: string): void {
        event.stopPropagation();
        this.downloadingId.set(id);
        this.ocrService
            .getDocument(id)
            .pipe(catchError(() => { this.downloadingId.set(null); return of(null); }))
            .subscribe((doc) => {
                this.downloadingId.set(null);
                if (!doc?.markdown_content) return;
                const blob = new Blob([doc.markdown_content], { type: 'text/markdown;charset=utf-8' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = filename.replace(/\.[^.]+$/, '') + '.md';
                a.click();
                URL.revokeObjectURL(url);
            });
    }

    statusLabel(status: OcrStatus): string {
        const labels: Record<OcrStatus, string> = {
            pending: 'En cola',
            processing: 'Procesando',
            done: 'Listo',
            error: 'Error',
        };
        return labels[status];
    }
}
