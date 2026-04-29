import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { of, Subject } from 'rxjs';
import { CollectionChat } from './collection-chat';
import { RagChatService, type RagStreamEvent } from '../../core/services/rag-chat.service';
import type { Collection } from '../../core/models/collection.model';

const API_BASE = 'http://localhost:8000/api/knowledge';

const mockCollections: Collection[] = [
    { id: 3, name: 'Chat Collection', description: 'Test', created_at: '2026-01-01', document_count: 5 },
];

const mockRoute = { snapshot: { paramMap: { get: (_key: string): string | null => '3' } } };

function setRouteId(id: string | null) {
    mockRoute.snapshot.paramMap.get = () => id;
}

describe('CollectionChat', () => {
    let httpTesting: HttpTestingController;
    let ragChatStream$: Subject<RagStreamEvent>;

    beforeEach(async () => {
        ragChatStream$ = new Subject<RagStreamEvent>();
        setRouteId('3');

        await TestBed.configureTestingModule({
            imports: [CollectionChat, RouterModule.forRoot([])],
            providers: [
                provideHttpClient(),
                provideHttpClientTesting(),
                { provide: ActivatedRoute, useValue: mockRoute },
                {
                    provide: RagChatService,
                    useValue: {
                        queryCollection: vi.fn(() => ragChatStream$.asObservable()),
                    },
                },
            ],
        }).compileComponents();
        httpTesting = TestBed.inject(HttpTestingController);
    });

    afterEach(() => {
        httpTesting.verify();
    });

    function initComponent() {
        const fixture = TestBed.createComponent(CollectionChat);
        fixture.detectChanges();
        httpTesting.expectOne(`${API_BASE}/collections`).flush(mockCollections);
        fixture.detectChanges();
        return fixture;
    }

    it('should create', () => {
        const fixture = initComponent();
        expect(fixture.componentInstance).toBeTruthy();
    });

    it('should redirect when no id in route', () => {
        setRouteId(null);
        const router = TestBed.inject(Router);
        vi.spyOn(router, 'navigate');

        const fixture = TestBed.createComponent(CollectionChat);
        fixture.detectChanges();

        expect(router.navigate).toHaveBeenCalledWith(['/collections']);
    });

    it('should load collection on init', () => {
        const fixture = initComponent();
        expect(fixture.componentInstance.collection()?.name).toBe('Chat Collection');
        expect(fixture.componentInstance.loading()).toBe(false);
    });

    it('should handle collection not found', () => {
        const fixture = TestBed.createComponent(CollectionChat);
        fixture.detectChanges();
        httpTesting.expectOne(`${API_BASE}/collections`).flush([]);
        fixture.detectChanges();

        expect(fixture.componentInstance.collection()).toBeNull();
    });

    it('should handle load error', () => {
        const fixture = TestBed.createComponent(CollectionChat);
        fixture.detectChanges();
        httpTesting.expectOne(`${API_BASE}/collections`).error(new ProgressEvent('error'));
        fixture.detectChanges();

        expect(fixture.componentInstance.loading()).toBe(false);
    });

    it('should compute hasMessages', () => {
        const fixture = initComponent();
        expect(fixture.componentInstance.hasMessages()).toBe(false);
    });

    it('should send message and stream response', () => {
        const fixture = initComponent();
        const ragService = TestBed.inject(RagChatService);

        fixture.componentInstance.inputValue.set('What is Angular?');
        fixture.componentInstance.sendMessage();

        expect(ragService.queryCollection).toHaveBeenCalledWith(3, 'What is Angular?');
        expect(fixture.componentInstance.streaming()).toBe(true);
        expect(fixture.componentInstance.messages()).toHaveLength(2);
        expect(fixture.componentInstance.inputValue()).toBe('');

        // Stream tokens
        ragChatStream$.next({ type: 'token', token: 'Hello' });
        expect(fixture.componentInstance.messages()[1].content).toBe('Hello');

        ragChatStream$.next({ type: 'token', token: ' World' });
        expect(fixture.componentInstance.messages()[1].content).toBe('Hello World');

        // Done
        ragChatStream$.next({ type: 'done' });
        expect(fixture.componentInstance.streaming()).toBe(false);
        expect(fixture.componentInstance.messages()[1].streaming).toBe(false);
    });

    it('should handle thinking events', () => {
        const fixture = initComponent();

        fixture.componentInstance.inputValue.set('test');
        fixture.componentInstance.sendMessage();

        ragChatStream$.next({ type: 'thinking', token: 'Hmm' });
        expect(fixture.componentInstance.messages()[1].thinking).toBe('Hmm');

        ragChatStream$.next({ type: 'thinking', token: '...' });
        expect(fixture.componentInstance.messages()[1].thinking).toBe('Hmm...');
    });

    it('should handle error events from stream', () => {
        const fixture = initComponent();

        fixture.componentInstance.inputValue.set('test');
        fixture.componentInstance.sendMessage();

        ragChatStream$.next({ type: 'error', error: 'Something failed' });
        expect(fixture.componentInstance.messages()[1].content).toBe('Something failed');
        expect(fixture.componentInstance.streaming()).toBe(false);
    });

    it('should handle error events without message', () => {
        const fixture = initComponent();

        fixture.componentInstance.inputValue.set('test');
        fixture.componentInstance.sendMessage();

        ragChatStream$.next({ type: 'error' });
        expect(fixture.componentInstance.messages()[1].content).toBe('Error al procesar la consulta.');
    });

    it('should handle stream error (connection error)', () => {
        const fixture = initComponent();

        fixture.componentInstance.inputValue.set('test');
        fixture.componentInstance.sendMessage();

        ragChatStream$.error(new Error('Network error'));
        expect(fixture.componentInstance.messages()[1].content).toBe('Error de conexión con el servidor.');
        expect(fixture.componentInstance.streaming()).toBe(false);
    });

    it('should not send empty message', () => {
        const fixture = initComponent();
        const ragService = TestBed.inject(RagChatService);

        fixture.componentInstance.inputValue.set('   ');
        fixture.componentInstance.sendMessage();

        expect(ragService.queryCollection).not.toHaveBeenCalled();
    });

    it('should not send while already streaming', () => {
        const fixture = initComponent();
        const ragService = TestBed.inject(RagChatService);

        fixture.componentInstance.inputValue.set('first');
        fixture.componentInstance.sendMessage();

        fixture.componentInstance.inputValue.set('second');
        fixture.componentInstance.sendMessage();

        expect(ragService.queryCollection).toHaveBeenCalledTimes(1);
    });

    it('should stop stream on stopStream', () => {
        const fixture = initComponent();

        fixture.componentInstance.inputValue.set('test');
        fixture.componentInstance.sendMessage();

        expect(fixture.componentInstance.streaming()).toBe(true);
        fixture.componentInstance.stopStream();
        expect(fixture.componentInstance.streaming()).toBe(false);
        expect(fixture.componentInstance.messages()[1].streaming).toBe(false);
    });

    it('should toggle thinking expansion', () => {
        const fixture = initComponent();

        expect(fixture.componentInstance.isThinkingExpanded(0)).toBe(false);
        fixture.componentInstance.toggleThinking(0);
        expect(fixture.componentInstance.isThinkingExpanded(0)).toBe(true);
        fixture.componentInstance.toggleThinking(0);
        expect(fixture.componentInstance.isThinkingExpanded(0)).toBe(false);
    });

    it('should handle Enter key to send message', () => {
        const fixture = initComponent();
        const ragService = TestBed.inject(RagChatService);

        fixture.componentInstance.inputValue.set('test');

        const event = new KeyboardEvent('keydown', { key: 'Enter' });
        vi.spyOn(event, 'preventDefault');

        fixture.componentInstance.onKeydown(event);

        expect(event.preventDefault).toHaveBeenCalled();
        expect(ragService.queryCollection).toHaveBeenCalled();
    });

    it('should not send on Shift+Enter', () => {
        const fixture = initComponent();
        const ragService = TestBed.inject(RagChatService);

        fixture.componentInstance.inputValue.set('test');

        const event = new KeyboardEvent('keydown', { key: 'Enter', shiftKey: true });
        fixture.componentInstance.onKeydown(event);

        expect(ragService.queryCollection).not.toHaveBeenCalled();
    });

    it('should not send on other keys', () => {
        const fixture = initComponent();
        const ragService = TestBed.inject(RagChatService);

        fixture.componentInstance.inputValue.set('test');

        const event = new KeyboardEvent('keydown', { key: 'a' });
        fixture.componentInstance.onKeydown(event);

        expect(ragService.queryCollection).not.toHaveBeenCalled();
    });

    it('should format time', () => {
        const fixture = initComponent();
        const date = new Date(2026, 0, 1, 14, 30);
        const result = fixture.componentInstance.formatTime(date);
        expect(result).toBeTruthy();
        expect(typeof result).toBe('string');
    });

    it('should clean up subscription on destroy', () => {
        const fixture = initComponent();

        fixture.componentInstance.inputValue.set('test');
        fixture.componentInstance.sendMessage();

        fixture.destroy();
        // Should not throw
    });

    it('should render empty state with suggestion buttons', () => {
        const fixture = initComponent();
        const html = fixture.nativeElement.innerHTML;
        expect(html).toContain('Pregunta a tus documentos');
        expect(html).toContain('Resumen');
    });

    it('should set inputValue when suggestion button is clicked', () => {
        const fixture = initComponent();
        const buttons: NodeListOf<HTMLButtonElement> = fixture.nativeElement.querySelectorAll('button');
        const suggestionBtn = Array.from(buttons).find(b => b.textContent!.includes('Resumen'));
        expect(suggestionBtn).toBeTruthy();
        (suggestionBtn as HTMLButtonElement).click();
        fixture.detectChanges();
        expect(fixture.componentInstance.inputValue()).toContain('puntos clave');
    });

    it('should set inputValue when analysis suggestion is clicked', () => {
        const fixture = initComponent();
        const buttons: NodeListOf<HTMLButtonElement> = fixture.nativeElement.querySelectorAll('button');
        const analysisBtn = Array.from(buttons).find(b => b.textContent!.includes('Análisis'));
        expect(analysisBtn).toBeTruthy();
        (analysisBtn as HTMLButtonElement).click();
        fixture.detectChanges();
        expect(fixture.componentInstance.inputValue()).toContain('conclusiones');
    });

    it('should render user message in chat', () => {
        const fixture = initComponent();
        fixture.componentInstance.messages.set([
            { role: 'user', content: 'Hello RAG', timestamp: new Date() },
        ]);
        fixture.detectChanges();

        const html = fixture.nativeElement.innerHTML;
        expect(html).toContain('Hello RAG');
        expect(html).toContain('Tú');
    });

    it('should render assistant message with content', () => {
        const fixture = initComponent();
        fixture.componentInstance.messages.set([
            { role: 'assistant', content: 'Answer text', thinking: '', streaming: false, timestamp: new Date() },
        ]);
        fixture.detectChanges();

        const html = fixture.nativeElement.innerHTML;
        expect(html).toContain('C.O.R.E.');
    });

    it('should render assistant message with thinking block', () => {
        const fixture = initComponent();
        fixture.componentInstance.messages.set([
            { role: 'assistant', content: '', thinking: 'Analyzing docs...', streaming: true, timestamp: new Date() },
        ]);
        fixture.detectChanges();

        const html = fixture.nativeElement.innerHTML;
        expect(html).toContain('Analizando');
    });

    it('should render assistant message with thinking expanded', () => {
        const fixture = initComponent();
        fixture.componentInstance.messages.set([
            { role: 'assistant', content: 'Done', thinking: 'Some reasoning', streaming: false, timestamp: new Date() },
        ]);
        fixture.detectChanges();

        // Expand thinking
        fixture.componentInstance.toggleThinking(0);
        fixture.detectChanges();

        const html = fixture.nativeElement.innerHTML;
        expect(html).toContain('Razonamiento');
    });

    it('should render streaming stop button', () => {
        const fixture = initComponent();
        fixture.componentInstance.streaming.set(true);
        fixture.detectChanges();

        const stopBtn = fixture.nativeElement.querySelector('[aria-label="Detener generación"]');
        expect(stopBtn).toBeTruthy();
    });

    it('should render send button when not streaming', () => {
        const fixture = initComponent();
        fixture.componentInstance.streaming.set(false);
        fixture.detectChanges();

        const sendBtn = fixture.nativeElement.querySelector('[aria-label="Enviar mensaje"]');
        expect(sendBtn).toBeTruthy();
    });

    it('should click send button through template', () => {
        const fixture = initComponent();
        fixture.componentInstance.inputValue.set('test question');
        fixture.detectChanges();

        const sendBtn: HTMLButtonElement = fixture.nativeElement.querySelector('[aria-label="Enviar mensaje"]');
        sendBtn.click();
        fixture.detectChanges();

        expect(fixture.componentInstance.messages().length).toBeGreaterThan(0);
    });

    it('should click stop button through template', () => {
        const fixture = initComponent();
        fixture.componentInstance.inputValue.set('test');
        fixture.componentInstance.sendMessage();
        fixture.detectChanges();

        const stopBtn: HTMLButtonElement = fixture.nativeElement.querySelector('[aria-label="Detener generación"]');
        expect(stopBtn).toBeTruthy();
        stopBtn.click();
        fixture.detectChanges();

        expect(fixture.componentInstance.streaming()).toBe(false);
    });

    it('should update inputValue through textarea input event', () => {
        const fixture = initComponent();
        const textarea: HTMLTextAreaElement = fixture.nativeElement.querySelector('textarea');
        textarea.value = 'Hello typing';
        textarea.dispatchEvent(new Event('input'));
        fixture.detectChanges();

        expect(fixture.componentInstance.inputValue()).toBe('Hello typing');
    });

    it('should render collection not found state', () => {
        setRouteId('999');
        const fixture = TestBed.createComponent(CollectionChat);
        fixture.detectChanges();
        httpTesting.expectOne(`${API_BASE}/collections`).flush([]);
        fixture.detectChanges();

        const html = fixture.nativeElement.innerHTML;
        expect(html).toContain('Colección no encontrada');
    });

    it('should scroll to bottom when messages change', async () => {
        const fixture = initComponent();
        const component = fixture.componentInstance;

        // Add a message to trigger the effect
        component.messages.set([
            { role: 'user', content: 'test', timestamp: new Date() },
        ]);
        TestBed.flushEffects();
        fixture.detectChanges();

        // Wait for queueMicrotask
        await new Promise<void>(resolve => queueMicrotask(() => resolve()));

        // Just verify no errors occurred
        expect(component.messages()).toHaveLength(1);
    });

    it('should render assistant streaming cursor', () => {
        const fixture = initComponent();
        fixture.componentInstance.messages.set([
            { role: 'assistant', content: 'Partial...', thinking: '', streaming: true, timestamp: new Date() },
        ]);
        fixture.detectChanges();

        // Verify streaming badge/cursor is rendered (the pulsing cursor span)
        const html = fixture.nativeElement.innerHTML;
        expect(html).toContain('animate-pulse');
    });
});
