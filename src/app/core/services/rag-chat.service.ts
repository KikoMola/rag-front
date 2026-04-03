import { inject, Injectable, NgZone } from '@angular/core';
import { Observable } from 'rxjs';

const API_BASE = 'http://localhost:8000/api/knowledge';

export interface RagStreamEvent {
    type: 'token' | 'thinking' | 'done' | 'error';
    token?: string;
    error?: string;
}

@Injectable({ providedIn: 'root' })
export class RagChatService {
    private readonly zone = inject(NgZone);

    queryCollection(collectionId: number, question: string, topK = 5): Observable<RagStreamEvent> {
        return new Observable<RagStreamEvent>((subscriber) => {
            const abortController = new AbortController();

            this.zone.runOutsideAngular(() => {
                fetch(`${API_BASE}/collections/${collectionId}/query`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ question, top_k: topK }),
                    signal: abortController.signal,
                })
                    .then((response) => {
                        if (!response.ok) {
                            this.zone.run(() => {
                                subscriber.error(new Error(`HTTP ${response.status}`));
                            });
                            return;
                        }
                        const reader = response.body!.getReader();
                        const decoder = new TextDecoder();
                        let buffer = '';
                        let currentEventType = 'token';

                        const pump = (): void => {
                            reader
                                .read()
                                .then(({ done, value }) => {
                                    if (done) {
                                        this.zone.run(() => {
                                            subscriber.next({ type: 'done' });
                                            subscriber.complete();
                                        });
                                        return;
                                    }

                                    buffer += decoder.decode(value, { stream: true });
                                    const lines = buffer.split('\n');
                                    buffer = lines.pop() ?? '';

                                    for (const line of lines) {
                                        if (line.startsWith('event: ')) {
                                            currentEventType = line.slice(7).trim();
                                        } else if (line.startsWith('data: ')) {
                                            try {
                                                const data = JSON.parse(line.slice(6));
                                                if (currentEventType === 'thinking' && data.token) {
                                                    this.zone.run(() => {
                                                        subscriber.next({ type: 'thinking', token: data.token });
                                                    });
                                                } else if (currentEventType === 'token' && data.token) {
                                                    this.zone.run(() => {
                                                        subscriber.next({ type: 'token', token: data.token });
                                                    });
                                                } else if (
                                                    currentEventType === 'done' ||
                                                    data.status === 'complete' ||
                                                    data.message_id != null
                                                ) {
                                                    this.zone.run(() => {
                                                        subscriber.next({ type: 'done' });
                                                    });
                                                } else if (currentEventType === 'error' || data.error) {
                                                    this.zone.run(() => {
                                                        subscriber.next({ type: 'error', error: data.error });
                                                    });
                                                }
                                            } catch {
                                                // skip malformed JSON
                                            }
                                            currentEventType = 'token';
                                        }
                                    }

                                    pump();
                                })
                                .catch((err) => {
                                    if (err.name !== 'AbortError') {
                                        this.zone.run(() => subscriber.error(err));
                                    }
                                });
                        };

                        pump();
                    })
                    .catch((err) => {
                        if (err.name !== 'AbortError') {
                            this.zone.run(() => subscriber.error(err));
                        }
                    });
            });

            return () => abortController.abort();
        });
    }
}
