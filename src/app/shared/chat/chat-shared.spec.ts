import { TestBed } from '@angular/core/testing';
import { ChatComposer } from './chat-composer';
import { AssistantMessage } from './assistant-message';
import { ThinkingTimer } from './thinking-timer';
import { groupHistory } from '../../chat/chat';
import type { ConversationListItem } from '../../core/models/conversation.model';

describe('ChatComposer', () => {
    function create(value = '') {
        const fixture = TestBed.createComponent(ChatComposer);
        fixture.componentRef.setInput('value', value);
        fixture.detectChanges();
        const textarea: HTMLTextAreaElement = fixture.nativeElement.querySelector('textarea');
        return { fixture, textarea };
    }

    it('should send on Enter but not on Shift+Enter', () => {
        const { fixture, textarea } = create('Hola');
        const send = vi.fn();
        fixture.componentInstance.send.subscribe(send);

        textarea.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', shiftKey: true }));
        expect(send).not.toHaveBeenCalled();

        textarea.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
        expect(send).toHaveBeenCalledTimes(1);
    });

    it('should not send blank messages', () => {
        const { fixture, textarea } = create('   ');
        const send = vi.fn();
        fixture.componentInstance.send.subscribe(send);
        textarea.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
        expect(send).not.toHaveBeenCalled();
        expect(fixture.nativeElement.querySelector('[aria-label="Enviar mensaje"]').disabled).toBe(true);
    });

    it('should update the value while typing', () => {
        const { fixture, textarea } = create();
        textarea.value = 'Nueva pregunta';
        textarea.dispatchEvent(new Event('input'));
        expect(fixture.componentInstance.value()).toBe('Nueva pregunta');
    });

    it('should offer stop while streaming', () => {
        const { fixture } = create('x');
        fixture.componentRef.setInput('streaming', true);
        fixture.detectChanges();
        const stop = vi.fn();
        fixture.componentInstance.stop.subscribe(stop);
        fixture.nativeElement.querySelector('[aria-label="Detener generación"]').click();
        expect(stop).toHaveBeenCalled();
    });
});

describe('AssistantMessage', () => {
    it('should number the cited sources', () => {
        const fixture = TestBed.createComponent(AssistantMessage);
        fixture.componentRef.setInput('content', 'Respuesta');
        fixture.componentRef.setInput('sources', [
            { filename: 'Cap 12.pdf', chunk_index: 8, excerpt: 'El yo…' },
            { filename: 'Cap 11.pdf', chunk_index: 3, excerpt: 'El ello…' },
        ]);
        fixture.detectChanges();
        const chips = fixture.nativeElement.querySelectorAll('[aria-label="Fuentes consultadas"] button');
        expect(chips).toHaveLength(2);
        expect(chips[0].textContent).toContain('1');
        expect(chips[0].textContent).toContain('Cap 12');
        expect(chips[1].textContent).toContain('frag. 3');
    });

    it('should show how long the model thought once it answers', () => {
        const fixture = TestBed.createComponent(AssistantMessage);
        fixture.componentRef.setInput('thinking', 'Pienso…');
        fixture.componentRef.setInput('thinkingSeconds', 4);
        fixture.componentRef.setInput('content', 'Respuesta');
        fixture.detectChanges();
        expect(fixture.nativeElement.textContent).toContain('Razonamiento');
        expect(fixture.nativeElement.textContent).toContain('4 s');
    });

    it('should show the reasoning while the model is still thinking', () => {
        const fixture = TestBed.createComponent(AssistantMessage);
        fixture.componentRef.setInput('thinking', 'Pienso…');
        fixture.componentRef.setInput('streaming', true);
        fixture.detectChanges();
        expect(fixture.nativeElement.textContent).toContain('Analizando');
        expect(fixture.nativeElement.querySelector('.prose-thinking')).toBeTruthy();
    });
});

describe('ThinkingTimer', () => {
    it('should measure from the first reasoning token to the first answer token', () => {
        const timer = new ThinkingTimer();
        timer.onContent(5000);
        expect(timer.seconds).toBeUndefined();
        timer.onThinking(1000);
        timer.onThinking(2000);
        timer.onContent(4200);
        timer.onContent(9000);
        expect(timer.seconds).toBe(3);
    });
});

describe('groupHistory', () => {
    const conv = (id: number, updated: string, parent: number | null = null): ConversationListItem => ({
        id,
        title: `Conversación ${id}`,
        mode: 'general',
        forked_from_id: parent,
        created_at: updated,
        updated_at: updated,
    });

    it('should group by date and nest forks under their parent', () => {
        const now = new Date('2026-11-12T12:00:00');
        const groups = groupHistory(
            [
                conv(1, '2026-11-12T09:00:00'),
                conv(2, '2026-11-11T20:00:00'),
                conv(3, '2026-11-08T10:00:00'),
                conv(4, '2026-09-01T10:00:00'),
                conv(5, '2026-11-12T10:00:00', 1),
            ],
            now,
        );
        expect(groups.map((g) => g.label)).toEqual(['Hoy', 'Ayer', 'Últimos 7 días', 'Anteriores']);
        expect(groups[0].entries[0].conversation.id).toBe(1);
        expect(groups[0].entries[0].forks.map((f) => f.id)).toEqual([5]);
    });

    it('should show a fork as its own entry when its parent is not listed', () => {
        const groups = groupHistory([conv(5, '2026-11-12T10:00:00', 1)], new Date('2026-11-12T12:00:00'));
        expect(groups[0].entries[0].conversation.id).toBe(5);
    });
});
