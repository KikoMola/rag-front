import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import {
    LucideDynamicIcon,
    LucidePause,
    LucidePlay,
    LucideRotateCcw,
    LucideRotateCw,
    LucideX,
} from '@lucide/angular';
import { NgpSlider, NgpSliderRange, NgpSliderThumb, NgpSliderTrack } from 'ng-primitives/slider';
import { NgpTooltipTrigger } from 'ng-primitives/tooltip';
import { AudioPlayerService, formatClock } from '../../core/services/audio-player.service';
import { AppButton } from '../../shared/ui/button';

/** Barra de reproducción fija en la parte inferior; aparece cuando hay un audio cargado. */
@Component({
    selector: 'app-player-bar',
    imports: [LucideDynamicIcon, NgpSlider, NgpSliderTrack, NgpSliderRange, NgpSliderThumb, NgpTooltipTrigger, AppButton],
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: { class: 'block' },
    template: `
        @if (player.track(); as track) {
            <div
                class="border-t border-outline-variant/50 bg-surface-container-lowest px-4 py-3 shadow-[0_-8px_24px_rgb(0_0_0/0.06)]"
                role="region"
                aria-label="Reproductor de audio"
            >
                <div class="max-w-5xl mx-auto flex items-center gap-3 sm:gap-4">
                    <button
                        appButton
                        size="icon"
                        class="rounded-full shrink-0"
                        (click)="player.toggle()"
                        [attr.aria-label]="player.playing() ? 'Pausar' : 'Reproducir'"
                    >
                        <svg [lucideIcon]="player.playing() ? LucidePause : LucidePlay" class="size-5"></svg>
                    </button>

                    <div class="flex-1 min-w-0 flex flex-col gap-1.5">
                        <div class="flex items-baseline justify-between gap-3">
                            <p class="text-sm font-semibold text-on-surface truncate">
                                {{ track.title }}
                                <span class="font-normal text-on-surface-variant hidden sm:inline">· {{ track.subtitle }}</span>
                            </p>
                            <span class="text-xs text-on-surface-variant tabular-nums shrink-0">
                                {{ clock(player.currentTime()) }} / {{ clock(player.duration()) }}
                            </span>
                        </div>
                        <div
                            ngpSlider
                            [ngpSliderValue]="player.currentTime()"
                            [ngpSliderMax]="player.duration() || 1"
                            [ngpSliderStep]="1"
                            [ngpSliderDisabled]="!player.duration()"
                            (ngpSliderValueChange)="player.seek($event)"
                            class="group relative flex items-center h-4 cursor-pointer data-[disabled]:cursor-default"
                        >
                            <!-- La pista ocupa toda la altura para que sea fácil acertar; la línea visible es fina -->
                            <div ngpSliderTrack class="relative h-4 w-full flex items-center">
                                <div class="absolute inset-x-0 h-1.5 rounded-full bg-surface-container-high"></div>
                                <div ngpSliderRange class="absolute left-0 h-1.5 rounded-full bg-primary"></div>
                            </div>
                            <div
                                ngpSliderThumb
                                aria-label="Posición"
                                class="absolute size-3.5 -translate-x-1/2 rounded-full bg-primary shadow ring-2 ring-surface-container-lowest outline-none opacity-0 group-hover:opacity-100 focus-visible:opacity-100 focus-visible:ring-surface-tint"
                            ></div>
                        </div>
                        @if (player.error()) {
                            <p class="text-xs text-error" role="alert">{{ player.error() }}</p>
                        }
                    </div>

                    <div class="flex items-center gap-1 shrink-0">
                        <button
                            appButton
                            variant="ghost"
                            size="icon-sm"
                            class="hidden sm:inline-flex"
                            (click)="player.skip(-15)"
                            ngpTooltipTrigger
                        >
                            <span class="sr-only">Retroceder 15 s</span>
                            <svg [lucideIcon]="LucideRotateCcw" class="size-4"></svg>
                        </button>
                        <button
                            appButton
                            variant="ghost"
                            size="icon-sm"
                            class="hidden sm:inline-flex"
                            (click)="player.skip(15)"
                            ngpTooltipTrigger
                        >
                            <span class="sr-only">Avanzar 15 s</span>
                            <svg [lucideIcon]="LucideRotateCw" class="size-4"></svg>
                        </button>
                        <button
                            appButton
                            variant="secondary"
                            size="sm"
                            class="tabular-nums w-14"
                            (click)="player.cycleRate()"
                            [attr.aria-label]="'Velocidad ' + rateLabel() + ', cambiar'"
                        >
                            {{ rateLabel() }}
                        </button>
                        <button appButton variant="ghost" size="icon-sm" (click)="player.close()" ngpTooltipTrigger>
                            <span class="sr-only">Cerrar reproductor</span>
                            <svg [lucideIcon]="LucideX" class="size-4"></svg>
                        </button>
                    </div>
                </div>
            </div>
        }
    `,
})
export class PlayerBar {
    protected readonly LucidePause = LucidePause;
    protected readonly LucidePlay = LucidePlay;
    protected readonly LucideRotateCcw = LucideRotateCcw;
    protected readonly LucideRotateCw = LucideRotateCw;
    protected readonly LucideX = LucideX;

    protected readonly player = inject(AudioPlayerService);

    protected clock(seconds: number): string {
        return formatClock(seconds);
    }

    protected rateLabel(): string {
        return `${String(this.player.rate()).replace('.', ',')}×`;
    }
}
