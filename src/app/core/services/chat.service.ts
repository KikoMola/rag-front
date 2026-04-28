import { HttpClient } from '@angular/common/http';
import { inject, Injectable, NgZone } from '@angular/core';
import { Observable } from 'rxjs';
import type {
    ChatStreamEvent,
    ConversationCreate,
    ConversationDetail,
    ConversationForkResponse,
    ConversationListItem,
    Source,
} from '../models/conversation.model';

const API_BASE = 'http://localhost:8000/api';

@Injectable({ providedIn: 'root' })
export class ChatService {
    private readonly http = inject(HttpClient);
    private readonly zone = inject(NgZone);

    getConversations(): Observable<ConversationListItem[]> {
        return this.http.get<ConversationListItem[]>(`${API_BASE}/chat/conversations`);
    }

    searchConversations(query: string): Observable<ConversationListItem[]> {
        return this.http.get<ConversationListItem[]>(`${API_BASE}/chat/conversations/search`, {
            params: { q: query },
        });
    }

    getConversation(id: number): Observable<ConversationDetail> {
        return this.http.get<ConversationDetail>(`${API_BASE}/chat/conversations/${id}`);
    }

    createConversation(data: ConversationCreate): Observable<ConversationListItem> {
        return this.http.post<ConversationListItem>(`${API_BASE}/chat/conversations`, data);
    }

    deleteConversation(id: number): Observable<void> {
        return this.http.delete<void>(`${API_BASE}/chat/conversations/${id}`);
    }

    forkConversation(id: number, messageId: number): Observable<ConversationForkResponse> {
        return this.http.post<ConversationForkResponse>(`${API_BASE}/chat/conversations/${id}/fork`, {
            message_id: messageId,
        });
    }

    getForks(id: number): Observable<ConversationListItem[]> {
        return this.http.get<ConversationListItem[]>(`${API_BASE}/chat/conversations/${id}/forks`);
    }

    exportConversation(id: number, format: 'md' | 'pdf'): Observable<Blob> {
        return this.http.get(`${API_BASE}/chat/conversations/${id}/export`, {
            params: { format },
            responseType: 'blob',
        });
    }

    sendMessage(conversationId: number, content: string): Observable<ChatStreamEvent> {
        return new Observable<ChatStreamEvent>((subscriber) => {
            const abortController = new AbortController();

            this.zone.runOutsideAngular(() => {
                fetch(`${API_BASE}/chat/conversations/${conversationId}/messages`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ content }),
                    signal: abortController.signal,
                })
                    .then((response) => {
                        if (!response.ok) {
                            this.zone.run(() => subscriber.error(new Error(`HTTP ${response.status}`)));
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
                                        this.zone.run(() => subscriber.complete());
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
                                                this.zone.run(() => this.emitEvent(subscriber, currentEventType, data));
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

    private emitEvent(
        subscriber: { next: (v: ChatStreamEvent) => void },
        eventType: string,
        data: unknown,
    ): void {
        if (eventType === 'thinking' && isTokenData(data)) {
            subscriber.next({ type: 'thinking', token: data.token });
        } else if (eventType === 'token' && isTokenData(data)) {
            subscriber.next({ type: 'token', token: data.token });
        } else if (eventType === 'sources' && Array.isArray(data)) {
            subscriber.next({ type: 'sources', sources: data as Source[] });
        } else if (eventType === 'done' && isDoneData(data)) {
            subscriber.next({ type: 'done', messageId: data.message_id });
        } else if (eventType === 'error' && isErrorData(data)) {
            subscriber.next({ type: 'error', error: data.error });
        }
    }
}

function isTokenData(v: unknown): v is { token: string } {
    return typeof v === 'object' && v !== null && 'token' in v && typeof (v as Record<string, unknown>)['token'] === 'string';
}

function isDoneData(v: unknown): v is { message_id: number } {
    return typeof v === 'object' && v !== null && 'message_id' in v;
}

function isErrorData(v: unknown): v is { error: string } {
    return typeof v === 'object' && v !== null && 'error' in v;
}
