import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ChatService } from './chat.service';
import type {
    ConversationCreate,
    ConversationDetail,
    ConversationForkResponse,
    ConversationListItem,
} from '../models/conversation.model';

const API = 'http://localhost:8000/api';

const mockListItem: ConversationListItem = {
    id: 1,
    title: 'Test conversation',
    mode: 'general',
    forked_from_id: null,
    created_at: '2026-04-29T10:00:00Z',
    updated_at: '2026-04-29T10:00:00Z',
};

const mockDetail: ConversationDetail = {
    ...mockListItem,
    collection_ids: null,
    forked_at_message_id: null,
    messages: [
        { id: 10, conversation_id: 1, role: 'user', content: 'Hello', created_at: '2026-04-29T10:00:00Z' },
        { id: 11, conversation_id: 1, role: 'assistant', content: 'Hi', created_at: '2026-04-29T10:01:00Z' },
    ],
};

const mockFork: ConversationForkResponse = {
    id: 42,
    title: 'Fork of Test',
    forked_from_id: 1,
    forked_at_message_id: 10,
    message_count: 1,
    created_at: '2026-04-29T12:00:00Z',
};

describe('ChatService', () => {
    let service: ChatService;
    let http: HttpTestingController;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [provideHttpClient(), provideHttpClientTesting()],
        });
        service = TestBed.inject(ChatService);
        http = TestBed.inject(HttpTestingController);
    });

    afterEach(() => http.verify());

    // ─── getConversations ────────────────────────────────────────────

    it('getConversations sends GET to /chat/conversations', () => {
        service.getConversations().subscribe();
        const req = http.expectOne(`${API}/chat/conversations`);
        expect(req.request.method).toBe('GET');
        req.flush([mockListItem]);
    });

    it('getConversations returns the conversation list', () => {
        let result: ConversationListItem[] = [];
        service.getConversations().subscribe((v) => (result = v));
        http.expectOne(`${API}/chat/conversations`).flush([mockListItem]);
        expect(result).toEqual([mockListItem]);
    });

    // ─── searchConversations ─────────────────────────────────────────

    it('searchConversations sends q query param', () => {
        service.searchConversations('angular').subscribe();
        const req = http.expectOne((r) => r.url === `${API}/chat/conversations/search`);
        expect(req.request.method).toBe('GET');
        expect(req.request.params.get('q')).toBe('angular');
        req.flush([]);
    });

    // ─── getConversation ─────────────────────────────────────────────

    it('getConversation sends GET to /chat/conversations/:id', () => {
        service.getConversation(5).subscribe();
        const req = http.expectOne(`${API}/chat/conversations/5`);
        expect(req.request.method).toBe('GET');
        req.flush(mockDetail);
    });

    it('getConversation returns the conversation detail', () => {
        let result: ConversationDetail | undefined;
        service.getConversation(1).subscribe((v) => (result = v));
        http.expectOne(`${API}/chat/conversations/1`).flush(mockDetail);
        expect(result).toEqual(mockDetail);
    });

    // ─── createConversation ──────────────────────────────────────────

    it('createConversation sends POST to /chat/conversations with body', () => {
        const data: ConversationCreate = { mode: 'general', title: 'New' };
        service.createConversation(data).subscribe();
        const req = http.expectOne(`${API}/chat/conversations`);
        expect(req.request.method).toBe('POST');
        expect(req.request.body).toEqual(data);
        req.flush(mockListItem);
    });

    it('createConversation returns the created item', () => {
        let result: ConversationListItem | undefined;
        service.createConversation({ mode: 'general' }).subscribe((v) => (result = v));
        http.expectOne(`${API}/chat/conversations`).flush(mockListItem);
        expect(result).toEqual(mockListItem);
    });

    // ─── deleteConversation ──────────────────────────────────────────

    it('deleteConversation sends DELETE to /chat/conversations/:id', () => {
        service.deleteConversation(3).subscribe();
        const req = http.expectOne(`${API}/chat/conversations/3`);
        expect(req.request.method).toBe('DELETE');
        req.flush(null);
    });

    // ─── forkConversation ────────────────────────────────────────────

    it('forkConversation sends POST to fork endpoint with message_id in body', () => {
        service.forkConversation(10, 42).subscribe();
        const req = http.expectOne(`${API}/chat/conversations/10/fork`);
        expect(req.request.method).toBe('POST');
        expect(req.request.body).toEqual({ message_id: 42 });
        req.flush(mockFork);
    });

    it('forkConversation returns the fork response', () => {
        let result: ConversationForkResponse | undefined;
        service.forkConversation(1, 10).subscribe((v) => (result = v));
        http.expectOne(`${API}/chat/conversations/1/fork`).flush(mockFork);
        expect(result).toEqual(mockFork);
    });

    // ─── getForks ───────────────────────────────────────────────────

    it('getForks sends GET to /chat/conversations/:id/forks', () => {
        service.getForks(10).subscribe();
        const req = http.expectOne(`${API}/chat/conversations/10/forks`);
        expect(req.request.method).toBe('GET');
        req.flush([]);
    });

    // ─── exportConversation ──────────────────────────────────────────

    it('exportConversation sends GET with format param and responseType blob (md)', () => {
        service.exportConversation(7, 'md').subscribe();
        const req = http.expectOne((r) => r.url === `${API}/chat/conversations/7/export`);
        expect(req.request.method).toBe('GET');
        expect(req.request.params.get('format')).toBe('md');
        expect(req.request.responseType).toBe('blob');
        req.flush(new Blob(['# Export'], { type: 'text/markdown' }));
    });

    it('exportConversation sends GET with format param pdf', () => {
        service.exportConversation(7, 'pdf').subscribe();
        const req = http.expectOne((r) => r.url === `${API}/chat/conversations/7/export`);
        expect(req.request.params.get('format')).toBe('pdf');
        req.flush(new Blob([], { type: 'application/pdf' }));
    });

    // ─── sendMessage (SSE via fetch) ─────────────────────────────────

    describe('sendMessage', () => {
        let fetchSpy: ReturnType<typeof vi.spyOn>;

        afterEach(() => {
            fetchSpy?.mockRestore();
        });

        function makeSseResponse(lines: string[]): Response {
            const text = lines.join('\n') + '\n';
            const encoder = new TextEncoder();
            const encoded = encoder.encode(text);
            const stream = new ReadableStream({
                start(controller) {
                    controller.enqueue(encoded);
                    controller.close();
                },
            });
            return new Response(stream, { status: 200 });
        }

        it('emits token events from SSE stream', async () => {
            fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
                makeSseResponse([
                    'event: token',
                    'data: {"token": "Hello"}',
                    '',
                    'event: done',
                    'data: {"message_id": 1}',
                ]),
            );

            const events: unknown[] = [];
            await new Promise<void>((resolve) => {
                service.sendMessage(1, 'hi').subscribe({
                    next: (e) => events.push(e),
                    complete: resolve,
                });
            });

            expect(events).toContainEqual({ type: 'token', token: 'Hello' });
            expect(events).toContainEqual({ type: 'done', messageId: 1 });
        });

        it('emits thinking events from SSE stream', async () => {
            fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
                makeSseResponse([
                    'event: thinking',
                    'data: {"token": "let me think"}',
                    '',
                    'event: done',
                    'data: {"message_id": 2}',
                ]),
            );

            const events: unknown[] = [];
            await new Promise<void>((resolve) => {
                service.sendMessage(1, 'think').subscribe({
                    next: (e) => events.push(e),
                    complete: resolve,
                });
            });

            expect(events).toContainEqual({ type: 'thinking', token: 'let me think' });
        });

        it('includes model in fetch body when provided', async () => {
            fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
                makeSseResponse(['event: done', 'data: {"message_id": 1}']),
            );

            await new Promise<void>((resolve) => {
                service.sendMessage(1, 'hi', 'gemma3:27b').subscribe({ complete: resolve });
            });

            const body = JSON.parse((fetchSpy.mock.calls[0][1] as RequestInit).body as string);
            expect(body.model).toBe('gemma3:27b');
        });

        it('omits model from fetch body when not provided', async () => {
            fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
                makeSseResponse(['event: done', 'data: {"message_id": 1}']),
            );

            await new Promise<void>((resolve) => {
                service.sendMessage(1, 'hi').subscribe({ complete: resolve });
            });

            const body = JSON.parse((fetchSpy.mock.calls[0][1] as RequestInit).body as string);
            expect(body).not.toHaveProperty('model');
        });

        it('emits error event from SSE stream', async () => {
            fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
                makeSseResponse(['event: error', 'data: {"error": "Something went wrong"}']),
            );

            const events: unknown[] = [];
            await new Promise<void>((resolve) => {
                service.sendMessage(1, 'hi').subscribe({
                    next: (e) => events.push(e),
                    complete: resolve,
                });
            });

            expect(events).toContainEqual({ type: 'error', error: 'Something went wrong' });
        });

        it('errors the observable on non-200 HTTP response', async () => {
            fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
                new Response(null, { status: 500 }),
            );

            await new Promise<void>((resolve) => {
                service.sendMessage(1, 'hi').subscribe({
                    error: (err: Error) => {
                        expect(err.message).toContain('500');
                        resolve();
                    },
                });
            });
        });
    });
});
