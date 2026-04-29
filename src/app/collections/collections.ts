import { ChangeDetectionStrategy, Component, computed, effect, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, EMPTY, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, catchError, map } from 'rxjs/operators';
import { Router } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import {
    LucideDynamicIcon,
    LucideCirclePlus,
    LucideFolderOpen,
    LucideFileText,
    LucideArrowRight,
    LucideTrash2,
    LucideX,
    LucideLoader,
    LucideSearch,
} from '@lucide/angular';
import {
    NgpDialog,
    NgpDialogDescription,
    NgpDialogOverlay,
    NgpDialogTitle,
    NgpDialogTrigger,
} from 'ng-primitives/dialog';
import { CollectionsService } from '../core/services/collections.service';
import { DashboardService } from '../core/services/dashboard.service';
import { SearchService } from '../core/services/search.service';
import type { Collection } from '../core/models/collection.model';

@Component({
    selector: 'app-collections',
    imports: [ReactiveFormsModule, LucideDynamicIcon, NgpDialogTrigger, NgpDialog, NgpDialogOverlay, NgpDialogTitle, NgpDialogDescription],
    templateUrl: './collections.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Collections implements OnInit {
    protected readonly LucideCirclePlus = LucideCirclePlus;
    protected readonly LucideFolderOpen = LucideFolderOpen;
    protected readonly LucideFileText = LucideFileText;
    protected readonly LucideArrowRight = LucideArrowRight;
    protected readonly LucideTrash2 = LucideTrash2;
    protected readonly LucideX = LucideX;
    protected readonly LucideLoader = LucideLoader;
    protected readonly LucideSearch = LucideSearch;

    private readonly collectionsService = inject(CollectionsService);
    private readonly dashboardService = inject(DashboardService);
    private readonly searchService = inject(SearchService);
    private readonly router = inject(Router);
    private readonly fb = inject(FormBuilder);

    collections = signal<Collection[]>([]);
    loading = signal(true);
    creating = signal(false);
    deleting = signal<number | null>(null);
    pendingDeleteCollectionId = signal<number | null>(null);
    searchResults = signal<Collection[] | null>(null);
    searching = signal(false);

    pendingDeleteCollection = computed(() =>
        this.collections().find((c) => c.id === this.pendingDeleteCollectionId()),
    );

    totalDocuments = computed(() => this.collections().reduce((sum, c) => sum + c.document_count, 0));
    hasSearch = computed(() => !!this.searchService.query().trim());
    displayedCollections = computed(() => this.searchResults() ?? this.collections());
    searchQuery = this.searchService.query;

    createForm = this.fb.nonNullable.group({
        name: ['', Validators.required],
        description: [''],
    });

    constructor() {
        const searchSubject = new Subject<string>();

        effect(() => searchSubject.next(this.searchService.query()));

        searchSubject
            .pipe(
                debounceTime(300),
                distinctUntilChanged(),
                switchMap((q) => {
                    if (!q.trim()) {
                        this.searchResults.set(null);
                        this.searching.set(false);
                        return EMPTY;
                    }
                    this.searching.set(true);
                    return this.dashboardService.searchCollections(q).pipe(
                        map((r) => r as Collection[]),
                        catchError(() => of([] as Collection[])),
                    );
                }),
                takeUntilDestroyed(),
            )
            .subscribe((results) => {
                this.searching.set(false);
                this.searchResults.set(results);
            });
    }

    ngOnInit(): void {
        this.loadCollections();
    }

    loadCollections(): void {
        this.loading.set(true);
        this.collectionsService.getCollections().subscribe({
            next: (collections) => {
                this.collections.set(collections);
                this.loading.set(false);
            },
            error: () => this.loading.set(false),
        });
    }

    openCreateForm(): void {
        this.createForm.reset();
    }

    submitCreate(close: () => void): void {
        if (this.createForm.invalid) return;
        this.creating.set(true);
        const { name, description } = this.createForm.getRawValue();
        this.collectionsService.createCollection({ name, description: description || null }).subscribe({
            next: (collection) => {
                this.creating.set(false);
                close();
                this.collections.update((list) => [collection, ...list]);
            },
            error: () => this.creating.set(false),
        });
    }

    requestDeleteCollection(event: Event, id: number): void {
        event.stopPropagation();
        this.pendingDeleteCollectionId.set(id);
    }

    confirmDeleteCollection(close: () => void): void {
        const id = this.pendingDeleteCollectionId();
        if (!id) return;
        close();
        this.deleting.set(id);
        this.collectionsService.deleteCollection(id).subscribe({
            next: () => {
                this.collections.update((list) => list.filter((c) => c.id !== id));
                this.searchResults.update((res) => (res ? res.filter((c) => c.id !== id) : null));
                this.deleting.set(null);
                this.pendingDeleteCollectionId.set(null);
            },
            error: () => {
                this.deleting.set(null);
                this.pendingDeleteCollectionId.set(null);
            },
        });
    }

    deleteCollection(event: Event, id: number): void {
        event.stopPropagation();
        this.deleting.set(id);
        this.collectionsService.deleteCollection(id).subscribe({
            next: () => {
                this.collections.update((list) => list.filter((c) => c.id !== id));
                this.deleting.set(null);
            },
            error: () => this.deleting.set(null),
        });
    }

    openCollection(id: number): void {
        this.router.navigate(['/collections', id]);
    }

    formatDate(dateStr: string): string {
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        if (diffMins < 1) return 'Ahora mismo';
        if (diffMins < 60) return `Hace ${diffMins} min`;
        const diffHours = Math.floor(diffMins / 60);
        if (diffHours < 24) return `Hace ${diffHours}h`;
        const diffDays = Math.floor(diffHours / 24);
        if (diffDays < 7) return `Hace ${diffDays}d`;
        return date.toLocaleDateString('es-ES');
    }
}
