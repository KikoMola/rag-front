import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { Chat } from './chat';
import { ChatService } from '../core/services/chat.service';
import type {
    ChatStreamEvent,
    ConversationDetail,
    ConversationForkResponse,
    ConversationListItem,
} from '../core/models/conversation.model';

// ─── Shared test data ────────────────────────────────────────────────────────

const generalConv: ConversationListItem = {
    id: 1,
    title: 'General conversation',
    mode: 'general',
    forked_from_id: null,
    created_at: '2026-04-01T10:00:00Z',
    updated_at: '2026-04-01T10:00:00Z',
};

const ragConv: ConversationListItem = {
    id: 2,
    title: 'RAG conversation',
    mode: 'rag',
    forked_from_id: null,
    created_at: '2026-04-01T10:00:00Z',
    updated_at: '2026-04-01T10:00:00Z',
};

const mockDetail: ConversationDetail = {
    ...generalConv,
    collection_ids: null,
    forked_at_message_id: null,
    messages: [
        { id: 10, conversation_id: 1, role: 'user', content: 'Hello', created_at: '2026-04-01T10:00:00Z' },
        { id: 11, conversation_id: 1, role: 'assistant', content: 'Hi there', created_at: '2026-04-01T10:01:00Z' },
    ],
};

const mockForkResponse: ConversationForkResponse = {
    id: 99,
    title: 'Fork of General conversation',
    forked_from_id: 1,
    forked_at_message_id: 10,
    message_count: 1,
    created_at: '2026-04-01T12:00:00Z',
};

const forkDetail: ConversationDetail = {
    id: 99,
    title: 'Fork of General conversation',
    mode: 'general',
    forked_from_id: 1,
    forked_at_message_id: 10,
    collection_ids: null,
    created_at: '2026-04-01T12:00:00Z',
    updated_at: '2026-04-01T12:00:00Z',
    messages: [
        { id: 10, conversation_id: 99, role: 'user', content: 'Hello', created_at: '2026-04-01T10:00:00Z' },
    ],
};

// ─── Factory ─────────────────────────────────────────────────────────────────

function createMockChatService() {
    return {
        getConversations: vi.fn().mockReturnValue(of([generalConv, ragConv])),
        getConversation: vi.fn().mockReturnValue(of(mockDetail)),
        createConversation: vi.fn().mockReturnValue(of(generalConv)),
        deleteConversation: vi.fn().mockReturnValue(of(undefined as void)),
        forkConversation: vi.fn().mockReturnValue(of(mockForkResponse)),
        sendMessage: vi.fn().mockReturnValue(of<ChatStreamEvent>({ type: 'done', messageId: 1 })),
    };
}

// ─── Suite ───────────────────────────────────────────────────────────────────

describe('Chat', () => {
    let component: Chat;
    let fixture: ComponentFixture<Chat>;
    let mockChatService: ReturnType<typeof createMockChatService>;

    beforeEach(async () => {
        mockChatService = createMockChatService();

        await TestBed.configureTestingModule({
            imports: [Chat],
            providers: [{ provide: ChatService, useValue: mockChatService }],
        }).compileComponents();

        fixture = TestBed.createComponent(Chat);
        component = fixture.componentInstance;
        fixture.detectChanges(); // triggers ngOnInit
    });

    // ─── ngOnInit ─────────────────────────────────────────────────────

    describe('ngOnInit', () => {
        it('calls getConversations once', () => {
            expect(mockChatService.getConversations).toHaveBeenCalledOnce();
        });

        it('filters conversations to general mode only', () => {
            expect(component.conversations()).toEqual([generalConv]);
        });

        it('sets loadingConversations to false after success', () => {
            expect(component.loadingConversations()).toBe(false);
        });

        it('sets loadingConversations to false on error', () => {
            mockChatService.getConversations.mockReturnValue(throwError(() => new Error('Network error')));
            const errorFixture = TestBed.createComponent(Chat);
            errorFixture.detectChanges();
            expect(errorFixture.componentInstance.loadingConversations()).toBe(false);
        });
    });

    // ─── newConversation ──────────────────────────────────────────────

    describe('newConversation', () => {
        it('clears messages and conversationId', () => {
            component.messages.set([{ role: 'user', content: 'hi', timestamp: new Date() }]);
            component.conversationId.set(5);
            component.newConversation();
            expect(component.messages()).toEqual([]);
            expect(component.conversationId()).toBeNull();
        });

        it('resets expandedThinking', () => {
            component.expandedThinking.set(new Set([0, 1]));
            component.newConversation();
            expect(component.expandedThinking().size).toBe(0);
        });

        it('does nothing while streaming', () => {
            component.conversationId.set(5);
            component.streaming.set(true);
            component.newConversation();
            expect(component.conversationId()).toBe(5);
        });
    });

    // ─── selectConversation ───────────────────────────────────────────

    describe('selectConversation', () => {
        it('calls getConversation with the conversation id', () => {
            component.selectConversation(generalConv);
            expect(mockChatService.getConversation).toHaveBeenCalledWith(1);
        });

        it('sets conversationId from the loaded detail', () => {
            component.selectConversation(generalConv);
            expect(component.conversationId()).toBe(1);
        });

        it('maps messages including messageId', () => {
            component.selectConversation(generalConv);
            expect(component.messages()).toHaveLength(2);
            expect(component.messages()[0]).toMatchObject({ role: 'user', content: 'Hello', messageId: 10 });
            expect(component.messages()[1]).toMatchObject({ role: 'assistant', content: 'Hi there', messageId: 11 });
        });

        it('resets expandedThinking on load', () => {
            component.expandedThinking.set(new Set([0, 1]));
            component.selectConversation(generalConv);
            expect(component.expandedThinking().size).toBe(0);
        });

        it('does nothing when streaming', () => {
            component.streaming.set(true);
            component.selectConversation(generalConv);
            expect(mockChatService.getConversation).not.toHaveBeenCalled();
        });

        it('does nothing when selecting the already active conversation', () => {
            component.conversationId.set(1);
            component.selectConversation(generalConv);
            expect(mockChatService.getConversation).not.toHaveBeenCalled();
        });
    });

    // ─── deleteConversation ───────────────────────────────────────────

    describe('deleteConversation', () => {
        const click = () => new MouseEvent('click');

        it('calls deleteConversation on the service', () => {
            component.conversations.set([generalConv]);
            component.deleteConversation(click(), 1);
            expect(mockChatService.deleteConversation).toHaveBeenCalledWith(1);
        });

        it('removes the conversation from the list', () => {
            component.conversations.set([generalConv]);
            component.deleteConversation(click(), 1);
            expect(component.conversations()).toEqual([]);
        });

        it('resets active conversation and messages when deleting the active one', () => {
            component.conversations.set([generalConv]);
            component.conversationId.set(1);
            component.messages.set([{ role: 'user', content: 'hi', timestamp: new Date() }]);
            component.deleteConversation(click(), 1);
            expect(component.conversationId()).toBeNull();
            expect(component.messages()).toEqual([]);
        });

        it('does not reset active conversation when deleting a different one', () => {
            const other: ConversationListItem = { ...generalConv, id: 2, title: 'Other' };
            component.conversations.set([generalConv, other]);
            component.conversationId.set(1);
            component.deleteConversation(click(), 2);
            expect(component.conversationId()).toBe(1);
        });

        it('does nothing while streaming', () => {
            component.streaming.set(true);
            component.deleteConversation(click(), 1);
            expect(mockChatService.deleteConversation).not.toHaveBeenCalled();
        });
    });

    // ─── selectModel ──────────────────────────────────────────────────

    describe('selectModel', () => {
        it('updates the selectedModel signal', () => {
            const thinkingModel = { id: 'thinking', label: 'Thinking', emoji: '🧠', model: 'gemma4:26b' };
            component.selectModel(thinkingModel);
            expect(component.selectedModel()).toEqual(thinkingModel);
        });

        it('defaults to the first model (Rápido)', () => {
            expect(component.selectedModel().id).toBe('fast');
        });
    });

    // ─── toggleThinking / isThinkingExpanded ──────────────────────────

    describe('toggleThinking / isThinkingExpanded', () => {
        it('expands on first toggle', () => {
            expect(component.isThinkingExpanded(2)).toBe(false);
            component.toggleThinking(2);
            expect(component.isThinkingExpanded(2)).toBe(true);
        });

        it('collapses on second toggle', () => {
            component.toggleThinking(0);
            component.toggleThinking(0);
            expect(component.isThinkingExpanded(0)).toBe(false);
        });

        it('tracks multiple indices independently', () => {
            component.toggleThinking(0);
            component.toggleThinking(1);
            expect(component.isThinkingExpanded(0)).toBe(true);
            expect(component.isThinkingExpanded(1)).toBe(true);
            component.toggleThinking(0);
            expect(component.isThinkingExpanded(0)).toBe(false);
            expect(component.isThinkingExpanded(1)).toBe(true);
        });
    });

    // ─── onKeydown ────────────────────────────────────────────────────

    describe('onKeydown', () => {
        it('calls sendMessage and prevents default on Enter (no Shift)', () => {
            const spy = vi.spyOn(component, 'sendMessage').mockImplementation(() => {});
            const event = new KeyboardEvent('keydown', { key: 'Enter', shiftKey: false });
            const preventSpy = vi.spyOn(event, 'preventDefault');
            component.onKeydown(event);
            expect(preventSpy).toHaveBeenCalled();
            expect(spy).toHaveBeenCalled();
        });

        it('does not call sendMessage on Shift+Enter', () => {
            const spy = vi.spyOn(component, 'sendMessage').mockImplementation(() => {});
            const event = new KeyboardEvent('keydown', { key: 'Enter', shiftKey: true });
            component.onKeydown(event);
            expect(spy).not.toHaveBeenCalled();
        });

        it('does not call sendMessage for non-Enter keys', () => {
            const spy = vi.spyOn(component, 'sendMessage').mockImplementation(() => {});
            const event = new KeyboardEvent('keydown', { key: 'a' });
            component.onKeydown(event);
            expect(spy).not.toHaveBeenCalled();
        });
    });

    // ─── sendMessage ──────────────────────────────────────────────────

    describe('sendMessage', () => {
        it('does nothing when inputValue is empty', () => {
            component.inputValue.set('');
            component.sendMessage();
            expect(mockChatService.sendMessage).not.toHaveBeenCalled();
        });

        it('does nothing when inputValue is whitespace only', () => {
            component.inputValue.set('   ');
            component.sendMessage();
            expect(mockChatService.sendMessage).not.toHaveBeenCalled();
        });

        it('does nothing while already streaming', () => {
            component.inputValue.set('hello');
            component.streaming.set(true);
            component.sendMessage();
            expect(mockChatService.sendMessage).not.toHaveBeenCalled();
        });

        it('creates a new conversation when none exists', () => {
            component.inputValue.set('hello');
            component.sendMessage();
            expect(mockChatService.createConversation).toHaveBeenCalledWith({ mode: 'general' });
        });

        it('uses existing conversationId without creating a new conversation', () => {
            component.conversationId.set(5);
            component.inputValue.set('hello');
            component.sendMessage();
            expect(mockChatService.createConversation).not.toHaveBeenCalled();
        });

        it('calls chatService.sendMessage with the question and selected model', () => {
            component.conversationId.set(5);
            component.selectedModel.set({ id: 'coding', label: 'Coding', emoji: '💻', model: 'qwen3.6:27b' });
            component.inputValue.set('hello');
            component.sendMessage();
            expect(mockChatService.sendMessage).toHaveBeenCalledWith(5, 'hello', 'qwen3.6:27b');
        });

        it('adds a user message and a streaming assistant message', () => {
            const stream = new Subject<ChatStreamEvent>();
            mockChatService.sendMessage.mockReturnValue(stream.asObservable());
            component.conversationId.set(5);
            component.inputValue.set('my question');
            component.sendMessage();
            expect(component.messages()[0]).toMatchObject({ role: 'user', content: 'my question' });
            expect(component.messages()[1]).toMatchObject({ role: 'assistant', streaming: true });
            stream.complete();
        });

        it('clears inputValue after sending', () => {
            component.conversationId.set(5);
            component.inputValue.set('hello');
            component.sendMessage();
            expect(component.inputValue()).toBe('');
        });

        it('accumulates token events into the assistant message', () => {
            const stream = new Subject<ChatStreamEvent>();
            mockChatService.sendMessage.mockReturnValue(stream.asObservable());
            component.conversationId.set(5);
            component.inputValue.set('hi');
            component.sendMessage();

            stream.next({ type: 'token', token: 'Hello ' });
            stream.next({ type: 'token', token: 'world' });

            expect(component.messages()[1].content).toBe('Hello world');
        });

        it('accumulates thinking events into the assistant message', () => {
            const stream = new Subject<ChatStreamEvent>();
            mockChatService.sendMessage.mockReturnValue(stream.asObservable());
            component.conversationId.set(5);
            component.inputValue.set('hi');
            component.sendMessage();

            stream.next({ type: 'thinking', token: 'Let me think...' });

            expect(component.messages()[1].thinking).toBe('Let me think...');
        });

        it('sets streaming to false and clears streaming flag on done', () => {
            const stream = new Subject<ChatStreamEvent>();
            mockChatService.sendMessage.mockReturnValue(stream.asObservable());
            component.conversationId.set(5);
            component.inputValue.set('hi');
            component.sendMessage();

            expect(component.streaming()).toBe(true);
            stream.next({ type: 'done', messageId: 1 });
            expect(component.streaming()).toBe(false);
            expect(component.messages()[1].streaming).toBe(false);
        });

        it('reloads conversation after done to populate messageIds', () => {
            const stream = new Subject<ChatStreamEvent>();
            mockChatService.sendMessage.mockReturnValue(stream.asObservable());
            component.conversationId.set(5);
            mockChatService.getConversation.mockReturnValue(of(mockDetail));
            component.inputValue.set('hi');
            component.sendMessage();

            stream.next({ type: 'done', messageId: 11 });

            expect(mockChatService.getConversation).toHaveBeenCalledWith(5);
        });

        it('sets error content on error event', () => {
            const stream = new Subject<ChatStreamEvent>();
            mockChatService.sendMessage.mockReturnValue(stream.asObservable());
            component.conversationId.set(5);
            component.inputValue.set('hi');
            component.sendMessage();

            stream.next({ type: 'error', error: 'Service unavailable' });

            expect(component.messages()[1].content).toBe('Service unavailable');
            expect(component.streaming()).toBe(false);
        });

        it('sets connection error content on observable error', () => {
            mockChatService.sendMessage.mockReturnValue(throwError(() => new Error('Connection refused')));
            component.conversationId.set(5);
            component.inputValue.set('hi');
            component.sendMessage();

            expect(component.messages()[1].content).toBe('Error de conexión con el servidor.');
            expect(component.streaming()).toBe(false);
        });

        it('refreshes conversations list when a new conversation is created', () => {
            const callsBefore = mockChatService.getConversations.mock.calls.length;
            component.inputValue.set('hi');
            // conversationId is null → will create new conversation
            component.sendMessage();
            expect(mockChatService.getConversations).toHaveBeenCalledTimes(callsBefore + 1);
        });
    });

    // ─── stopStream ───────────────────────────────────────────────────

    describe('stopStream', () => {
        it('sets streaming to false', () => {
            const stream = new Subject<ChatStreamEvent>();
            mockChatService.sendMessage.mockReturnValue(stream.asObservable());
            component.conversationId.set(5);
            component.inputValue.set('hi');
            component.sendMessage();

            expect(component.streaming()).toBe(true);
            component.stopStream();
            expect(component.streaming()).toBe(false);
        });

        it('marks the last message as not streaming', () => {
            const stream = new Subject<ChatStreamEvent>();
            mockChatService.sendMessage.mockReturnValue(stream.asObservable());
            component.conversationId.set(5);
            component.inputValue.set('hi');
            component.sendMessage();

            component.stopStream();

            expect(component.messages()[1].streaming).toBe(false);
        });

        it('stops receiving further stream events after stopStream', () => {
            const stream = new Subject<ChatStreamEvent>();
            mockChatService.sendMessage.mockReturnValue(stream.asObservable());
            component.conversationId.set(5);
            component.inputValue.set('hi');
            component.sendMessage();

            component.stopStream();
            stream.next({ type: 'token', token: 'ignored' });

            expect(component.messages()[1].content).toBe('');
        });
    });

    // ─── copyMessage ──────────────────────────────────────────────────

    describe('copyMessage', () => {
        beforeEach(() => {
            vi.useFakeTimers();
            Object.defineProperty(navigator, 'clipboard', {
                value: { writeText: vi.fn().mockResolvedValue(undefined) },
                configurable: true,
                writable: true,
            });
        });

        afterEach(() => {
            vi.useRealTimers();
        });

        it('writes content to clipboard', async () => {
            component.copyMessage('hello world', 3);
            await Promise.resolve();
            expect(navigator.clipboard.writeText).toHaveBeenCalledWith('hello world');
        });

        it('sets copiedIndex after clipboard write', async () => {
            component.copyMessage('text', 3);
            await Promise.resolve();
            expect(component.copiedIndex()).toBe(3);
        });

        it('clears copiedIndex after 2 seconds', async () => {
            component.copyMessage('text', 1);
            await Promise.resolve();
            expect(component.copiedIndex()).toBe(1);
            vi.advanceTimersByTime(2001);
            expect(component.copiedIndex()).toBeNull();
        });

        it('does not clear copiedIndex before 2 seconds have passed', async () => {
            component.copyMessage('text', 1);
            await Promise.resolve();
            vi.advanceTimersByTime(1999);
            expect(component.copiedIndex()).toBe(1);
        });
    });

    // ─── forkFromMessage ──────────────────────────────────────────────

    describe('forkFromMessage', () => {
        it('does nothing when there is no active conversation', () => {
            component.conversationId.set(null);
            component.forkFromMessage(5);
            expect(mockChatService.forkConversation).not.toHaveBeenCalled();
        });

        it('calls forkConversation with the correct ids', () => {
            component.conversationId.set(10);
            mockChatService.forkConversation.mockReturnValue(of(mockForkResponse));
            mockChatService.getConversation.mockReturnValue(of(forkDetail));
            component.forkFromMessage(5);
            expect(mockChatService.forkConversation).toHaveBeenCalledWith(10, 5);
        });

        it('switches the active conversation to the new fork', () => {
            component.conversationId.set(10);
            mockChatService.forkConversation.mockReturnValue(of(mockForkResponse));
            mockChatService.getConversation.mockReturnValue(of(forkDetail));
            component.forkFromMessage(5);
            expect(component.conversationId()).toBe(99);
        });

        it('loads the fork messages with messageIds', () => {
            component.conversationId.set(10);
            mockChatService.forkConversation.mockReturnValue(of(mockForkResponse));
            mockChatService.getConversation.mockReturnValue(of(forkDetail));
            component.forkFromMessage(5);
            expect(component.messages()).toHaveLength(1);
            expect(component.messages()[0].messageId).toBe(10);
        });

        it('resets expandedThinking after fork', () => {
            component.conversationId.set(10);
            component.expandedThinking.set(new Set([0, 1]));
            mockChatService.forkConversation.mockReturnValue(of(mockForkResponse));
            mockChatService.getConversation.mockReturnValue(of(forkDetail));
            component.forkFromMessage(5);
            expect(component.expandedThinking().size).toBe(0);
        });

        it('refreshes the conversation list after fork', () => {
            component.conversationId.set(10);
            const callsBefore = mockChatService.getConversations.mock.calls.length;
            mockChatService.forkConversation.mockReturnValue(of(mockForkResponse));
            mockChatService.getConversation.mockReturnValue(of(forkDetail));
            component.forkFromMessage(5);
            expect(mockChatService.getConversations).toHaveBeenCalledTimes(callsBefore + 1);
        });
    });

    // ─── formatDate ───────────────────────────────────────────────────

    describe('formatDate', () => {
        it('returns "Hace un momento" for dates less than 1 hour ago', () => {
            const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
            expect(component.formatDate(tenMinutesAgo)).toBe('Hace un momento');
        });

        it('returns hours format for same-day dates', () => {
            const threeHoursAgo = new Date(Date.now() - 3 * 3600 * 1000).toISOString();
            expect(component.formatDate(threeHoursAgo)).toBe('Hace 3h');
        });

        it('returns days format for dates within a week', () => {
            const threeDaysAgo = new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString();
            expect(component.formatDate(threeDaysAgo)).toBe('Hace 3d');
        });

        it('returns a locale date string for dates older than a week', () => {
            const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 3600 * 1000).toISOString();
            const result = component.formatDate(twoWeeksAgo);
            // Should be a formatted date string, not a relative label
            expect(result).not.toContain('Hace');
        });
    });

    // ─── hasMessages computed ─────────────────────────────────────────

    describe('hasMessages', () => {
        it('is false when messages array is empty', () => {
            component.messages.set([]);
            expect(component.hasMessages()).toBe(false);
        });

        it('is true when there is at least one message', () => {
            component.messages.set([{ role: 'user', content: 'hi', timestamp: new Date() }]);
            expect(component.hasMessages()).toBe(true);
        });
    });
});
