import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { RouterModule, Router } from '@angular/router';
import { Dashboard } from './dashboard';
import type { DashboardData } from '../core/services/dashboard.service';
import type { Collection } from '../core/models/collection.model';
import type { ConversationListItem } from '../core/models/conversation.model';
import type { TtsAudioListItem } from '../core/models/tts-audio.model';
import { AudioPlayerService } from '../core/services/audio-player.service';

const API = 'http://localhost:8000/api';

const mockDashboardData: DashboardData = {
    stats: { total_documents: 15, total_collections: 3, models: ['gpt-4', 'llama-3'] },
    recent_documents: [
        { id: 1, filename: 'doc.pdf', collection_name: 'Test Collection', status: 'indexed', created_at: '2026-01-15T10:00:00Z' },
        { id: 2, filename: 'err.txt', collection_name: 'Test Collection', status: 'error', created_at: '2026-01-14T10:00:00Z' },
    ],
    recent_collections: [{ id: 1, name: 'Test Collection', document_count: 5, created_at: '2026-01-10T10:00:00Z' }],
};

const mockCollections: Collection[] = [
    { id: 1, name: 'Test Collection', description: null, created_at: '2026-01-10', document_count: 5 },
    { id: 2, name: 'Vacía', description: null, created_at: '2026-01-11', document_count: 0 },
];

const mockConversations: ConversationListItem[] = [
    { id: 7, title: 'Antigua', mode: 'general', forked_from_id: null, created_at: '2026-01-01', updated_at: '2026-01-01' },
    { id: 8, title: 'Reciente', mode: 'general', forked_from_id: null, created_at: '2026-01-05', updated_at: '2026-01-05' },
];

const doneAudio: TtsAudioListItem = {
    id: 3,
    title: 'Tema 1',
    source_type: 'file',
    source_name: 'tema1.pdf',
    voice: 'ef_dora',
    speed: 1,
    status: 'done',
    progress: 100,
    char_count: 100,
    duration_seconds: 60,
    size_bytes: 1000,
    error_message: null,
    created_at: '2026-01-05',
};

describe('Dashboard', () => {
    let httpTesting: HttpTestingController;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [Dashboard, RouterModule.forRoot([])],
            providers: [provideHttpClient(), provideHttpClientTesting()],
        }).compileComponents();
        httpTesting = TestBed.inject(HttpTestingController);
    });

    afterEach(() => httpTesting.verify());

    function init(
        options: { dashboard?: DashboardData | 'error'; audios?: TtsAudioListItem[] } = {},
    ): ComponentFixture<Dashboard> {
        const fixture = TestBed.createComponent(Dashboard);
        fixture.detectChanges();
        const dashboardReq = httpTesting.expectOne(`${API}/dashboard`);
        if (options.dashboard === 'error') dashboardReq.error(new ProgressEvent('error'));
        else dashboardReq.flush(options.dashboard ?? mockDashboardData);
        httpTesting.expectOne(`${API}/knowledge/collections`).flush(mockCollections);
        httpTesting.expectOne(`${API}/chat/conversations`).flush(mockConversations);
        httpTesting.expectOne(`${API}/tts/audios`).flush(options.audios ?? [doneAudio]);
        fixture.detectChanges();
        return fixture;
    }

    it('should show a loading skeleton until the summary arrives', () => {
        const fixture = TestBed.createComponent(Dashboard);
        fixture.detectChanges();
        expect(fixture.componentInstance['loading']()).toBe(true);
        httpTesting.expectOne(`${API}/dashboard`).flush(mockDashboardData);
        httpTesting.expectOne(`${API}/knowledge/collections`).flush([]);
        httpTesting.expectOne(`${API}/chat/conversations`).flush([]);
        httpTesting.expectOne(`${API}/tts/audios`).flush([]);
        expect(fixture.componentInstance['loading']()).toBe(false);
    });

    it('should explain the error when the backend does not answer', () => {
        const fixture = init({ dashboard: 'error' });
        expect(fixture.nativeElement.textContent).toContain('No se pudo cargar el resumen');
    });

    it('should summarise counts and list the models in a popover', () => {
        const fixture = init();
        const text = fixture.nativeElement.textContent;
        expect(text).toContain('3 colecciones');
        expect(text).toContain('15 documentos');
        expect(text).toContain('2 modelos disponibles');
    });

    it('should only offer collections with documents as question targets', () => {
        const fixture = init();
        const options = fixture.componentInstance['targetOptions']();
        expect(options.map((o) => o.label)).toEqual(['Chat general', 'Test Collection']);
        expect(options[1]).toEqual(
            expect.objectContaining({ value: '1', description: '5 documentos', group: 'Colecciones' }),
        );
        expect(fixture.nativeElement.querySelector('[role="combobox"]').textContent).toContain('Chat general');
    });

    it('should send the question to the general chat by default', () => {
        const router = TestBed.inject(Router);
        const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
        const fixture = init();
        const component = fixture.componentInstance;

        component['question'].set('  ');
        component['ask']();
        expect(navigate).not.toHaveBeenCalled();

        component['question'].set('¿Qué es un percentil?');
        component['ask']();
        expect(navigate).toHaveBeenCalledWith(['/chat'], { queryParams: { q: '¿Qué es un percentil?' } });
    });

    it('should send the question to the chosen collection', () => {
        const router = TestBed.inject(Router);
        const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
        const component = init().componentInstance;
        component['target'].set('1');
        component['question'].set('Resume el tema');
        component['ask']();
        expect(navigate).toHaveBeenCalledWith(['/collections', 1, 'chat'], { queryParams: { q: 'Resume el tema' } });
    });

    it('should ask on Enter but not on Shift+Enter', () => {
        const component = init().componentInstance;
        const ask = vi.spyOn(component as never, 'ask' as never);
        component['onQuestionKeydown'](new KeyboardEvent('keydown', { key: 'Enter', shiftKey: true }));
        expect(ask).not.toHaveBeenCalled();
        component['onQuestionKeydown'](new KeyboardEvent('keydown', { key: 'Enter' }));
        expect(ask).toHaveBeenCalled();
    });

    it('should offer to continue the most recent conversation', () => {
        const router = TestBed.inject(Router);
        const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
        const fixture = init();
        expect(fixture.nativeElement.textContent).toContain('Reciente');

        const button = [...fixture.nativeElement.querySelectorAll('button')].find(
            (b: HTMLButtonElement) => b.textContent!.trim() === 'Continuar',
        ) as HTMLButtonElement;
        button.click();
        expect(navigate).toHaveBeenCalledWith(['/chat'], { queryParams: { c: 8 } });
    });

    it('should play the last audio in the shared player', () => {
        const player = TestBed.inject(AudioPlayerService);
        const play = vi.spyOn(player, 'play').mockImplementation(() => undefined);
        const fixture = init();
        const button = [...fixture.nativeElement.querySelectorAll('button')].find((b: HTMLButtonElement) =>
            b.textContent!.includes('Escuchar'),
        ) as HTMLButtonElement;
        button.click();
        expect(play).toHaveBeenCalledWith(expect.objectContaining({ id: 3, title: 'Tema 1' }));
    });

    it('should show an audio being generated before the finished ones', () => {
        const fixture = init({ audios: [{ ...doneAudio, id: 4, title: 'Tema 2', status: 'processing', progress: 30 }, doneAudio] });
        const text = fixture.nativeElement.textContent;
        expect(text).toContain('Audio en preparación');
        expect(text).toContain('Generando 30%');
    });

    it('should link the last document to its collection', () => {
        const fixture = init();
        const link = [...fixture.nativeElement.querySelectorAll('a')].find((a: HTMLAnchorElement) =>
            a.textContent!.includes('Abrir colección'),
        ) as HTMLAnchorElement;
        expect(link.getAttribute('href')).toBe('/collections/1');
    });

    it('should render the empty collections state', () => {
        const fixture = init({ dashboard: { ...mockDashboardData, recent_collections: [] } });
        expect(fixture.nativeElement.textContent).toContain('No hay colecciones todavía');
    });

    it('should open a recent collection', () => {
        const router = TestBed.inject(Router);
        const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
        const fixture = init();
        fixture.nativeElement.querySelector('[aria-label="Abrir colección Test Collection"]').click();
        expect(navigate).toHaveBeenCalledWith(['/collections', 1]);
    });

    it('should describe document statuses', () => {
        const component = init().componentInstance;
        expect(component['statusLabel']('indexed')).toBe('Indexado');
        expect(component['statusLabel']('error')).toBe('Error al indexar');
        expect(component['statusLabel']('processing')).toBe('Indexándose');
        expect(component['statusClass']('error')).toBe('text-error');
    });
});
