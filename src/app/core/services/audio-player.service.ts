import { DOCUMENT } from '@angular/common';
import { Injectable, computed, inject, signal } from '@angular/core';

export interface PlayerTrack {
    id: number;
    title: string;
    subtitle: string;
    src: string;
}

const SPEEDS = [1, 1.25, 1.5, 1.75, 2, 0.8, 0.9];

/**
 * Reproductor único de la aplicación. Vive en el inyector raíz, así que el audio
 * sigue sonando aunque se cambie de pantalla.
 */
@Injectable({ providedIn: 'root' })
export class AudioPlayerService {
    private readonly document = inject(DOCUMENT);
    private audio: HTMLAudioElement | null = null;

    readonly track = signal<PlayerTrack | null>(null);
    readonly playing = signal(false);
    readonly currentTime = signal(0);
    readonly duration = signal(0);
    readonly rate = signal(1);
    readonly error = signal<string | null>(null);

    readonly progress = computed(() => (this.duration() ? (this.currentTime() / this.duration()) * 100 : 0));

    /** Reproduce una pista; si ya es la actual, alterna entre pausa y reproducción. */
    play(track: PlayerTrack): void {
        const el = this.element();
        if (this.track()?.id === track.id) {
            this.toggle();
            return;
        }
        this.track.set(track);
        this.error.set(null);
        this.currentTime.set(0);
        this.duration.set(0);
        el.src = track.src;
        el.playbackRate = this.rate();
        void el.play().catch(() => this.error.set('No se pudo reproducir el audio.'));
    }

    toggle(): void {
        const el = this.element();
        if (!this.track()) return;
        if (el.paused) {
            void el.play().catch(() => this.error.set('No se pudo reproducir el audio.'));
        } else {
            el.pause();
        }
    }

    seek(seconds: number): void {
        const el = this.element();
        el.currentTime = Math.max(0, Math.min(seconds, this.duration() || seconds));
        this.currentTime.set(el.currentTime);
    }

    skip(seconds: number): void {
        this.seek(this.currentTime() + seconds);
    }

    /** Pasa a la siguiente velocidad de la lista (1× → 1,25× → … → 0,9× → 1×). */
    cycleRate(): void {
        const next = SPEEDS[(SPEEDS.indexOf(this.rate()) + 1) % SPEEDS.length];
        this.rate.set(next);
        this.element().playbackRate = next;
    }

    close(): void {
        const el = this.element();
        el.pause();
        el.removeAttribute('src');
        el.load();
        this.track.set(null);
        this.playing.set(false);
    }

    /** Si se borra el audio que suena, se cierra el reproductor. */
    forget(id: number): void {
        if (this.track()?.id === id) this.close();
    }

    isCurrent(id: number): boolean {
        return this.track()?.id === id;
    }

    private element(): HTMLAudioElement {
        if (this.audio) return this.audio;
        const el = this.document.createElement('audio');
        el.preload = 'metadata';
        el.addEventListener('play', () => this.playing.set(true));
        el.addEventListener('pause', () => this.playing.set(false));
        el.addEventListener('ended', () => this.playing.set(false));
        el.addEventListener('timeupdate', () => this.currentTime.set(el.currentTime));
        el.addEventListener('durationchange', () => this.duration.set(Number.isFinite(el.duration) ? el.duration : 0));
        el.addEventListener('error', () => {
            if (this.track()) this.error.set('No se pudo cargar el audio.');
        });
        this.audio = el;
        return el;
    }
}

export function formatClock(seconds: number): string {
    const total = Math.max(0, Math.floor(seconds));
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = String(total % 60).padStart(2, '0');
    return h ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`;
}
