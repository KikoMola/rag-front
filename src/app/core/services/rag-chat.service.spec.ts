import { TestBed } from '@angular/core/testing';
import { RagChatService, type RagStreamEvent } from './rag-chat.service';

const API_BASE = 'http://localhost:8000/api/knowledge';

function createSSEStream(lines: string[]): ReadableStream<Uint8Array> {
    const encoder = new TextEncoder();
    const text = lines.join('\n') + '\n';
    return new ReadableStream({
        start(controller) {
            controller.enqueue(encoder.encode(text));
            controller.close();
        },
    });
}

describe('RagChatService', () => {
    let service: RagChatService;
    let fetchSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        TestBed.configureTestingModule({});
        service = TestBed.inject(RagChatService);
        fetchSpy = vi.spyOn(globalThis, 'fetch');
    });

    afterEach(() => {
        fetchSpy.mockRestore();
    });

    it('should call fetch with correct URL and body', () => {
        fetchSpy.mockResolvedValue(
            new Response(createSSEStream(['event: done', 'data: {"status":"complete"}']), { status: 200 }),
        );

        service.queryCollection(3, 'What is Angular?', 5).subscribe();

        expect(fetchSpy).toHaveBeenCalledWith(`${API_BASE}/collections/3/query`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ question: 'What is Angular?', top_k: 5 }),
            signal: expect.any(AbortSignal),
        });
    });

    it('should emit token events from streamed SSE', async () => {
        const sseLines = ['event: token', 'data: {"token":"Hello"}', 'event: token', 'data: {"token":" world"}', 'event: done', 'data: {"status":"complete"}'];

        fetchSpy.mockResolvedValue(new Response(createSSEStream(sseLines), { status: 200 }));

        const events: RagStreamEvent[] = [];

        await new Promise<void>((resolve, reject) => {
            service.queryCollection(1, 'test').subscribe({
                next: (e) => events.push(e),
                complete: () => resolve(),
                error: reject,
            });
        });

        expect(events).toContainEqual({ type: 'token', token: 'Hello' });
        expect(events).toContainEqual({ type: 'token', token: ' world' });
        expect(events).toContainEqual({ type: 'done' });
    });

    it('should emit thinking events', async () => {
        const sseLines = ['event: thinking', 'data: {"token":"Hmm"}', 'event: done', 'data: {"status":"complete"}'];

        fetchSpy.mockResolvedValue(new Response(createSSEStream(sseLines), { status: 200 }));

        const events: RagStreamEvent[] = [];

        await new Promise<void>((resolve, reject) => {
            service.queryCollection(1, 'test').subscribe({
                next: (e) => events.push(e),
                complete: () => resolve(),
                error: reject,
            });
        });

        expect(events).toContainEqual({ type: 'thinking', token: 'Hmm' });
    });

    it('should emit error event from SSE error event', async () => {
        const sseLines = ['event: error', 'data: {"error":"Something went wrong"}'];

        fetchSpy.mockResolvedValue(new Response(createSSEStream(sseLines), { status: 200 }));

        const events: RagStreamEvent[] = [];

        await new Promise<void>((resolve, reject) => {
            service.queryCollection(1, 'test').subscribe({
                next: (e) => events.push(e),
                complete: () => resolve(),
                error: reject,
            });
        });

        expect(events).toContainEqual({ type: 'error', error: 'Something went wrong' });
    });

    it('should error on non-ok HTTP response', async () => {
        fetchSpy.mockResolvedValue(new Response(null, { status: 500 }));

        await expect(
            new Promise<void>((resolve, reject) => {
                service.queryCollection(1, 'test').subscribe({
                    complete: () => resolve(),
                    error: reject,
                });
            }),
        ).rejects.toThrow('HTTP 500');
    });

    it('should abort fetch on unsubscribe', () => {
        fetchSpy.mockResolvedValue(
            new Response(
                new ReadableStream({
                    start() {
                        // never closes — simulates a long-running stream
                    },
                }),
                { status: 200 },
            ),
        );

        const sub = service.queryCollection(1, 'test').subscribe();
        sub.unsubscribe();

        const signal = (fetchSpy.mock.calls[0]?.[1] as RequestInit)?.signal as AbortSignal;
        expect(signal?.aborted).toBe(true);
    });

    it('should use default topK of 5', () => {
        fetchSpy.mockResolvedValue(
            new Response(createSSEStream(['event: done', 'data: {"status":"complete"}']), { status: 200 }),
        );

        service.queryCollection(2, 'question').subscribe();

        const body = JSON.parse((fetchSpy.mock.calls[0]?.[1] as RequestInit)?.body as string);
        expect(body.top_k).toBe(5);
    });
});
