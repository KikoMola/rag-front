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
    LucideLoader,
    LucideScanText,
    LucideDynamicIcon,
} from '@lucide/angular';
import { OcrService } from '../../core/services/ocr.service';
import { MarkdownPipe } from '../../core/pipes/markdown.pipe';
import type { OcrDocument } from '../../core/models/ocr-document.model';

const POLL_INTERVAL_MS = 3000;

@Component({
    selector: 'app-ocr-detail',
    imports: [RouterLink, LucideDynamicIcon, MarkdownPipe],
    templateUrl: './ocr-detail.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: { class: 'flex flex-col h-full overflow-hidden' },
})
export class OcrDetail implements OnInit, OnDestroy {
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

    document = signal<OcrDocument | null>(null);
    loading = signal(true);
    copySuccess = signal(false);

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
        navigator.clipboard.writeText(content).then(() => {
            this.copySuccess.set(true);
            setTimeout(() => this.copySuccess.set(false), 2000);
        });
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
