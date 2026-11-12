import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { RouterModule } from '@angular/router';
import { Tts } from './tts';
import { AudioPlayerService } from '../core/services/audio-player.service';
import type { TtsAudioListItem, TtsVoicesResponse } from '../core/models/tts-audio.model';

const API_BASE = 'http://localhost:8000/api/tts';

const mockVoices: TtsVoicesResponse = {
    default_voice: 'ef_dora',
    voices: [
        { id: 'ef_dora', name: 'Dora', language: 'Español', gender: 'female' },
        { id: 'em_alex', name: 'Alex', language: 'Español', gender: 'male' },
        { id: 'af_heart', name: 'Heart', language: 'Inglés (EE. UU.)', gender: 'female' },
    ],
};

const doneAudio: TtsAudioListItem = {
    id: 1,
    title: 'Tema 1',
    source_type: 'file',
    source_name: 'tema1.pdf',
    voice: 'ef_dora',
    speed: 1,
    status: 'done',
    progress: 100,
    char_count: 1200,
    duration_seconds: 83.4,
    size_bytes: 667968,
    error_message: null,
    created_at: '2026-11-12T10:00:00Z',
};

const processingAudio: TtsAudioListItem = {
    ...doneAudio,
    id: 2,
    title: 'Tema 2',
    status: 'processing',
    progress: 40,
    duration_seconds: null,
    size_bytes: null,
};

describe('Tts', () => {
    let httpTesting: HttpTestingController;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [Tts, RouterModule.forRoot([])],
            providers: [provideHttpClient(), provideHttpClientTesting()],
        }).compileComponents();
        httpTesting = TestBed.inject(HttpTestingController);
    });

    afterEach(() => {
        httpTesting.verify();
        vi.useRealTimers();
    });

    function createFixture(audios: TtsAudioListItem[]): ComponentFixture<Tts> {
        const fixture = TestBed.createComponent(Tts);
        fixture.detectChanges();
        httpTesting.expectOne(`${API_BASE}/audios`).flush(audios);
        httpTesting.expectOne(`${API_BASE}/voices`).flush(mockVoices);
        fixture.detectChanges();
        return fixture;
    }

    it('should show the empty state when there are no audios', () => {
        const fixture = createFixture([]);
        expect(fixture.nativeElement.textContent).toContain('Sin audios');
    });

    it('should offer play for finished audios and progress for the rest', () => {
        const fixture = createFixture([doneAudio, processingAudio]);
        const el: HTMLElement = fixture.nativeElement;

        expect(el.querySelectorAll('article').length).toBe(2);
        expect(el.querySelector('[aria-label="Reproducir Tema 1"]')).toBeTruthy();
        expect(el.querySelector('[aria-label="Reproducir Tema 2"]')).toBeNull();
        expect(el.querySelector('[role="progressbar"]')?.getAttribute('aria-valuenow')).toBe('40');
        expect(el.textContent).toContain('Generando 40%');
        expect(el.textContent).toContain('2 audios');
    });

    it('should send finished audios to the shared player', () => {
        const fixture = createFixture([doneAudio]);
        const player = TestBed.inject(AudioPlayerService);
        const play = vi.spyOn(player, 'play').mockImplementation(() => undefined);

        fixture.nativeElement.querySelector('[aria-label="Reproducir Tema 1"]').click();
        expect(play).toHaveBeenCalledWith(
            expect.objectContaining({ id: 1, title: 'Tema 1', src: `${API_BASE}/audios/1/file` }),
        );
    });

    it('should estimate the remaining time from the observed progress', () => {
        const component = createFixture([]).componentInstance;
        const start = 1_000_000;
        component['setAudios']([{ ...processingAudio, progress: 20 }], start);

        // Sin avance suficiente todavía no hay estimación
        expect(component.remainingLabel({ ...processingAudio, progress: 21 }, start + 30_000)).toBeNull();
        // 20 % → 40 % en 2 min: quedan 60 % → 6 min
        expect(component.remainingLabel({ ...processingAudio, progress: 40 }, start + 120_000)).toBe(
            'quedan unos 6 min',
        );
        expect(component.remainingLabel({ ...processingAudio, progress: 99 }, start + 120_000)).toBe(
            'menos de un minuto',
        );
    });

    it('should group voices by language and preselect the default voice', () => {
        const fixture = createFixture([]);
        const component = fixture.componentInstance;

        expect(component.voiceGroups().map((g) => g.language)).toEqual(['Español', 'Inglés (EE. UU.)']);
        expect(component.voiceGroups()[0].voices).toHaveLength(2);
        expect(component.createForm.controls.voice.value).toBe('ef_dora');
        expect(component.voiceName('em_alex')).toBe('Alex');
        expect(component.voiceName('desconocida')).toBe('desconocida');
    });

    it('should poll while an audio is being generated and stop when it finishes', () => {
        vi.useFakeTimers();
        const fixture = createFixture([processingAudio]);

        vi.advanceTimersByTime(2000);
        httpTesting.expectOne(`${API_BASE}/audios`).flush([{ ...processingAudio, progress: 80 }]);
        expect(fixture.componentInstance.audios()[0].progress).toBe(80);

        vi.advanceTimersByTime(2000);
        httpTesting.expectOne(`${API_BASE}/audios`).flush([{ ...processingAudio, status: 'done', progress: 100 }]);
        expect(fixture.componentInstance.hasActiveJobs()).toBe(false);

        vi.advanceTimersByTime(6000);
        httpTesting.expectNone(`${API_BASE}/audios`);
    });

    it('should require a file or a text before submitting', () => {
        const component = createFixture([]).componentInstance;
        expect(component.canSubmit()).toBe(false);

        component.selectedFile.set(new File(['x'], 'tema.pdf'));
        expect(component.canSubmit()).toBe(true);
        expect(component.isPdf()).toBe(true);

        component.setSourceMode('text');
        expect(component.canSubmit()).toBe(false);
        component.createForm.controls.text.setValue('Hola mundo');
        expect(component.canSubmit()).toBe(true);
    });

    it('should reject files with an unsupported extension', () => {
        const component = createFixture([]).componentInstance;
        const input = { files: [new File(['x'], 'foto.png')], value: 'foto.png' };
        component.onFileSelected({ target: input } as unknown as Event);

        expect(component.selectedFile()).toBeNull();
        expect(component.formError()).toContain('Formato no soportado');
    });

    it('should send the page range for a PDF and add the new audio to the list', () => {
        const component = createFixture([]).componentInstance;
        component.selectedFile.set(new File(['x'], 'tema.pdf'));
        component.createForm.patchValue({ pageStart: 3, pageEnd: 12, speed: 1.25 });

        const close = vi.fn();
        component.submitCreate(close);

        const req = httpTesting.expectOne(`${API_BASE}/audios`);
        const body = req.request.body as FormData;
        expect(body.get('page_start')).toBe('3');
        expect(body.get('page_end')).toBe('12');
        expect(body.get('speed')).toBe('1.25');
        expect(body.get('voice')).toBe('ef_dora');
        req.flush({ ...processingAudio, status: 'pending', progress: 0 });

        expect(close).toHaveBeenCalled();
        expect(component.audios()).toHaveLength(1);
        expect(component.creating()).toBe(false);
    });

    it('should not send the page range for non-PDF sources', () => {
        const component = createFixture([]).componentInstance;
        component.createForm.patchValue({ pageStart: 3, pageEnd: 12 });
        component.setSourceMode('text');
        component.createForm.controls.text.setValue('  Hola mundo  ');
        component.submitCreate(vi.fn());

        const req = httpTesting.expectOne(`${API_BASE}/audios`);
        const body = req.request.body as FormData;
        expect(body.get('text')).toBe('Hola mundo');
        expect(body.has('page_start')).toBe(false);
        expect(body.has('file')).toBe(false);
        req.flush(doneAudio);
    });

    it('should block an inverted page range without calling the API', () => {
        const component = createFixture([]).componentInstance;
        component.selectedFile.set(new File(['x'], 'tema.pdf'));
        component.createForm.patchValue({ pageStart: 20, pageEnd: 5 });
        component.submitCreate(vi.fn());

        httpTesting.expectNone(`${API_BASE}/audios`);
        expect(component.formError()).toContain('página inicial');
    });

    it('should show the backend error and keep the dialog open', () => {
        const component = createFixture([]).componentInstance;
        component.selectedFile.set(new File(['x'], 'escaneado.pdf'));
        const close = vi.fn();
        component.submitCreate(close);

        httpTesting
            .expectOne(`${API_BASE}/audios`)
            .flush({ detail: 'No se ha encontrado texto que leer.' }, { status: 422, statusText: 'Unprocessable' });

        expect(close).not.toHaveBeenCalled();
        expect(component.formError()).toBe('No se ha encontrado texto que leer.');
        expect(component.creating()).toBe(false);
    });

    it('should delete an audio after confirmation', () => {
        const component = createFixture([doneAudio, processingAudio]).componentInstance;
        component.requestDelete(1);
        expect(component.pendingDeleteTitle()).toBe('Tema 1');

        const close = vi.fn();
        component.confirmDelete(close);
        const req = httpTesting.expectOne(`${API_BASE}/audios/1`);
        expect(req.request.method).toBe('DELETE');
        req.flush(null);

        expect(close).toHaveBeenCalled();
        expect(component.audios().map((a) => a.id)).toEqual([2]);
        expect(component.pendingDeleteId()).toBeNull();
    });

    it('should format durations and sizes', () => {
        const component = createFixture([]).componentInstance;
        expect(component.formatDuration(42)).toBe('42 s');
        expect(component.formatDuration(83.4)).toBe('1 min 23 s');
        expect(component.formatDuration(4000)).toBe('1 h 6 min');
        expect(component.formatDuration(null)).toBe('');
        expect(component.formatBytes(667968)).toBe('652 KB');
        expect(component.formatBytes(5 * 1024 * 1024)).toBe('5.0 MB');
    });
});
