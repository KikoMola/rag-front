import {
    ChangeDetectionStrategy,
    Component,
    ElementRef,
    OnInit,
    Type,
    ViewContainerRef,
    computed,
    inject,
    signal,
    viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import type { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { EMPTY, interval } from 'rxjs';
import { catchError, filter, switchMap } from 'rxjs/operators';
import {
    LucideAlertCircle,
    LucideCirclePlus,
    LucideClock,
    LucideDownload,
    LucideDynamicIcon,
    LucideEllipsis,
    LucideFileText,
    LucideHeadphones,
    LucideLoader,
    LucidePause,
    LucidePlay,
    LucideTrash2,
    LucideType,
    LucideUpload,
    LucideX,
} from '@lucide/angular';
import {
    NgpDialog,
    NgpDialogDescription,
    NgpDialogManager,
    NgpDialogOverlay,
    NgpDialogTitle,
    NgpDialogTrigger,
} from 'ng-primitives/dialog';
import { NgpMenu, NgpMenuItem, NgpMenuTrigger } from 'ng-primitives/menu';
import { AudioPlayerService } from '../core/services/audio-player.service';
import { TtsService } from '../core/services/tts.service';
import type { TtsAudioListItem, TtsVoice } from '../core/models/tts-audio.model';
import { AppButton } from '../shared/ui/button';
import { PageHeader } from '../shared/ui/page-header';
import { ToastService } from '../shared/ui/toast';

const POLL_INTERVAL_MS = 2000;
const ACCEPTED_EXTENSIONS = ['.pdf', '.docx', '.epub', '.html', '.htm', '.txt', '.md'];

type SourceMode = 'file' | 'text';

interface VoiceGroup {
    language: string;
    voices: TtsVoice[];
}

/** Tipo de plantilla que acepta NgpDialogManager.open (el contexto no se exporta). */
type DialogTemplate = Exclude<Parameters<NgpDialogManager['open']>[0], Type<unknown>>;

/** Primer progreso observado de un audio, para estimar cuánto le queda. */
interface ProgressSample {
    at: number;
    progress: number;
}

@Component({
    selector: 'app-tts',
    imports: [
        ReactiveFormsModule,
        LucideDynamicIcon,
        NgpDialogTrigger,
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
    templateUrl: './tts.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Tts implements OnInit {
    protected readonly LucideAlertCircle = LucideAlertCircle;
    protected readonly LucideEllipsis = LucideEllipsis;
    protected readonly LucidePause = LucidePause;
    protected readonly LucidePlay = LucidePlay;
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
    private readonly toast = inject(ToastService);
    private readonly dialogs = inject(NgpDialogManager);
    private readonly viewContainerRef = inject(ViewContainerRef);
    protected readonly player = inject(AudioPlayerService);

    private readonly confirmDeleteDialog = viewChild.required<DialogTemplate>('confirmDeleteDialog');
    private readonly progressSamples = new Map<number, ProgressSample>();

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
    totalMinutes = computed(() =>
        Math.round(this.audios().reduce((sum, a) => sum + (a.status === 'done' ? (a.duration_seconds ?? 0) : 0), 0) / 60),
    );

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
            .subscribe((audios) => this.setAudios(audios));
    }

    /** Guarda la lista y anota el primer progreso de cada audio en curso. */
    private setAudios(audios: TtsAudioListItem[], now = Date.now()): void {
        for (const audio of audios) {
            if (audio.status === 'processing' && !this.progressSamples.has(audio.id)) {
                this.progressSamples.set(audio.id, { at: now, progress: audio.progress });
            }
        }
        this.audios.set(audios);
    }

    /** «quedan unos N min», en cuanto hay avance suficiente para estimarlo. */
    remainingLabel(audio: TtsAudioListItem, now = Date.now()): string | null {
        const sample = this.progressSamples.get(audio.id);
        if (audio.status !== 'processing' || !sample) return null;
        const gained = audio.progress - sample.progress;
        const elapsed = now - sample.at;
        if (gained < 2 || elapsed <= 0) return null;
        const remainingMs = ((100 - audio.progress) / gained) * elapsed;
        const minutes = Math.round(remainingMs / 60_000);
        return minutes < 1 ? 'menos de un minuto' : `quedan unos ${minutes} min`;
    }

    play(audio: TtsAudioListItem): void {
        this.player.play({
            id: audio.id,
            title: audio.title,
            subtitle: `Voz ${this.voiceName(audio.voice)}`,
            src: this.fileUrl(audio.id),
        });
    }

    isPlaying(audio: TtsAudioListItem): boolean {
        return this.player.isCurrent(audio.id) && this.player.playing();
    }

    /** Abre la confirmación de borrado desde el menú de acciones. */
    askDelete(id: number): void {
        this.pendingDeleteId.set(id);
        // Se abre tras cerrarse el menú; si no, el mismo clic cierra el diálogo
        setTimeout(() => this.dialogs.open(this.confirmDeleteDialog(), { viewContainerRef: this.viewContainerRef }));
    }

    ngOnInit(): void {
        this.ttsService.getAudios().subscribe({
            next: (audios) => {
                this.setAudios(audios);
                this.loading.set(false);
            },
            error: () => {
                this.loading.set(false);
                this.toast.error('No se pudieron cargar los audios. Comprueba que el backend está en marcha.');
            },
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
                    this.toast.info('Audio en cola. Puedes seguir el progreso en la lista.');
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
                this.player.forget(id);
                this.deletingId.set(null);
                this.pendingDeleteId.set(null);
                this.toast.success('Audio eliminado.');
            },
            error: () => {
                this.deletingId.set(null);
                this.pendingDeleteId.set(null);
                this.toast.error('No se pudo eliminar el audio.');
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
