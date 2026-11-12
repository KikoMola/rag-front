import { ChangeDetectionStrategy, Component, ElementRef, OnInit, computed, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import type { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { EMPTY, interval } from 'rxjs';
import { catchError, filter, switchMap } from 'rxjs/operators';
import {
    LucideAlertCircle,
    LucideCalendar,
    LucideCirclePlus,
    LucideClock,
    LucideDownload,
    LucideDynamicIcon,
    LucideFileText,
    LucideHeadphones,
    LucideLoader,
    LucideTrash2,
    LucideType,
    LucideUpload,
    LucideX,
} from '@lucide/angular';
import {
    NgpDialog,
    NgpDialogDescription,
    NgpDialogOverlay,
    NgpDialogTitle,
    NgpDialogTrigger,
} from 'ng-primitives/dialog';
import { Navbar } from '../layout/navbar/navbar';
import { TtsService } from '../core/services/tts.service';
import type { TtsAudioListItem, TtsVoice } from '../core/models/tts-audio.model';

const POLL_INTERVAL_MS = 2000;
const ACCEPTED_EXTENSIONS = ['.pdf', '.docx', '.epub', '.html', '.htm', '.txt', '.md'];

type SourceMode = 'file' | 'text';

interface VoiceGroup {
    language: string;
    voices: TtsVoice[];
}

@Component({
    selector: 'app-tts',
    imports: [
        ReactiveFormsModule,
        LucideDynamicIcon,
        Navbar,
        NgpDialogTrigger,
        NgpDialog,
        NgpDialogOverlay,
        NgpDialogTitle,
        NgpDialogDescription,
    ],
    templateUrl: './tts.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Tts implements OnInit {
    protected readonly LucideAlertCircle = LucideAlertCircle;
    protected readonly LucideCalendar = LucideCalendar;
    protected readonly LucideCirclePlus = LucideCirclePlus;
    protected readonly LucideClock = LucideClock;
    protected readonly LucideDownload = LucideDownload;
    protected readonly LucideFileText = LucideFileText;
    protected readonly LucideHeadphones = LucideHeadphones;
    protected readonly LucideLoader = LucideLoader;
    protected readonly LucideTrash2 = LucideTrash2;
    protected readonly LucideType = LucideType;
    protected readonly LucideUpload = LucideUpload;
    protected readonly LucideX = LucideX;

    protected readonly acceptedExtensions = ACCEPTED_EXTENSIONS.join(',');
    protected readonly speedOptions = [0.8, 0.9, 1, 1.1, 1.25, 1.5];

    private readonly ttsService = inject(TtsService);
    private readonly fb = inject(FormBuilder);

    readonly fileInput = viewChild<ElementRef<HTMLInputElement>>('fileInput');

    audios = signal<TtsAudioListItem[]>([]);
    loading = signal(true);
    voices = signal<TtsVoice[]>([]);
    sourceMode = signal<SourceMode>('file');
    selectedFile = signal<File | null>(null);
    creating = signal(false);
    formError = signal<string | null>(null);
    deletingId = signal<number | null>(null);
    pendingDeleteId = signal<number | null>(null);

    voiceGroups = computed<VoiceGroup[]>(() => {
        const groups: VoiceGroup[] = [];
        for (const voice of this.voices()) {
            const group = groups.find((g) => g.language === voice.language);
            if (group) group.voices.push(voice);
            else groups.push({ language: voice.language, voices: [voice] });
        }
        return groups;
    });
    isPdf = computed(() => this.selectedFile()?.name.toLowerCase().endsWith('.pdf') ?? false);
    hasActiveJobs = computed(() => this.audios().some((a) => a.status === 'pending' || a.status === 'processing'));
    pendingDeleteTitle = computed(() => this.audios().find((a) => a.id === this.pendingDeleteId())?.title ?? '');

    createForm = this.fb.nonNullable.group({
        title: [''],
        text: [''],
        voice: [''],
        speed: [1],
        pageStart: [null as number | null, Validators.min(1)],
        pageEnd: [null as number | null, Validators.min(1)],
    });

    constructor() {
        // Mientras haya audios generándose, refresca la lista para mostrar el progreso
        interval(POLL_INTERVAL_MS)
            .pipe(
                filter(() => this.hasActiveJobs()),
                switchMap(() => this.ttsService.getAudios().pipe(catchError(() => EMPTY))),
                takeUntilDestroyed(),
            )
            .subscribe((audios) => this.audios.set(audios));
    }

    ngOnInit(): void {
        this.ttsService.getAudios().subscribe({
            next: (audios) => {
                this.audios.set(audios);
                this.loading.set(false);
            },
            error: () => this.loading.set(false),
        });
        this.ttsService.getVoices().subscribe({
            next: ({ voices, default_voice }) => {
                this.voices.set(voices);
                this.createForm.controls.voice.setValue(default_voice);
            },
            error: () => this.voices.set([]),
        });
    }

    openCreateForm(): void {
        const voice = this.createForm.controls.voice.value;
        this.createForm.reset({ voice, speed: 1 });
        this.selectedFile.set(null);
        this.formError.set(null);
    }

    setSourceMode(mode: SourceMode): void {
        this.sourceMode.set(mode);
        this.formError.set(null);
    }

    triggerFilePicker(): void {
        this.fileInput()?.nativeElement.click();
    }

    onFileSelected(event: Event): void {
        const input = event.target as HTMLInputElement;
        const file = input.files?.[0] ?? null;
        input.value = '';
        if (!file) return;
        const extension = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
        if (!ACCEPTED_EXTENSIONS.includes(extension)) {
            this.formError.set(`Formato no soportado. Permitidos: ${ACCEPTED_EXTENSIONS.join(', ')}`);
            return;
        }
        this.selectedFile.set(file);
        this.formError.set(null);
        this.createForm.patchValue({ pageStart: null, pageEnd: null });
    }

    canSubmit(): boolean {
        if (this.creating() || this.createForm.invalid) return false;
        return this.sourceMode() === 'file'
            ? this.selectedFile() !== null
            : this.createForm.controls.text.value.trim().length > 0;
    }

    submitCreate(close: () => void): void {
        if (!this.canSubmit()) return;
        const { title, text, voice, speed, pageStart, pageEnd } = this.createForm.getRawValue();
        const usePages = this.sourceMode() === 'file' && this.isPdf();
        if (usePages && pageStart && pageEnd && pageStart > pageEnd) {
            this.formError.set('La página inicial no puede ser mayor que la final.');
            return;
        }

        this.creating.set(true);
        this.formError.set(null);
        this.ttsService
            .createAudio({
                ...(this.sourceMode() === 'file' ? { file: this.selectedFile()! } : { text: text.trim() }),
                title: title.trim() || undefined,
                voice: voice || undefined,
                speed,
                pageStart: usePages ? pageStart : null,
                pageEnd: usePages ? pageEnd : null,
            })
            .subscribe({
                next: (audio) => {
                    this.creating.set(false);
                    this.audios.update((list) => [audio, ...list]);
                    close();
                },
                error: (err: HttpErrorResponse) => {
                    this.creating.set(false);
                    this.formError.set(this.errorMessage(err));
                },
            });
    }

    requestDelete(id: number): void {
        this.pendingDeleteId.set(id);
    }

    confirmDelete(close: () => void): void {
        const id = this.pendingDeleteId();
        if (!id) return;
        close();
        this.deletingId.set(id);
        this.ttsService.deleteAudio(id).subscribe({
            next: () => {
                this.audios.update((list) => list.filter((a) => a.id !== id));
                this.deletingId.set(null);
                this.pendingDeleteId.set(null);
            },
            error: () => {
                this.deletingId.set(null);
                this.pendingDeleteId.set(null);
            },
        });
    }

    fileUrl(id: number, download = false): string {
        return this.ttsService.fileUrl(id, download);
    }

    voiceName(id: string): string {
        return this.voices().find((v) => v.id === id)?.name ?? id;
    }

    formatDuration(seconds: number | null): string {
        if (seconds == null) return '';
        const total = Math.round(seconds);
        const hours = Math.floor(total / 3600);
        const minutes = Math.floor((total % 3600) / 60);
        const secs = total % 60;
        if (hours > 0) return `${hours} h ${minutes} min`;
        if (minutes > 0) return `${minutes} min ${secs} s`;
        return `${secs} s`;
    }

    formatBytes(bytes: number | null): string {
        if (bytes == null) return '';
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }

    formatDate(iso: string): string {
        return new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
    }

    private errorMessage(err: HttpErrorResponse): string {
        const detail = err.error?.detail;
        if (typeof detail === 'string') return detail;
        if (err.status === 0) return 'No se pudo conectar con el servidor.';
        return 'No se pudo crear el audio. Revisa los datos e inténtalo de nuevo.';
    }
}
