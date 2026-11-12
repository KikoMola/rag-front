import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import {
    LucideBrain,
    LucideChevronDown,
    LucideDynamicIcon,
    LucideFileText,
    LucideLoader,
    LucideSparkles,
} from '@lucide/angular';
import { NgpPopover, NgpPopoverTrigger } from 'ng-primitives/popover';
import { MarkdownPipe } from '../../core/pipes/markdown.pipe';
import type { Source } from '../../core/models/conversation.model';

/**
 * Respuesta del asistente: razonamiento plegable, texto en Markdown y fuentes
 * citadas como etiquetas numeradas que abren el fragmento usado.
 * Las acciones del mensaje (copiar, bifurcar…) se proyectan con `[messageActions]`.
 */
@Component({
    selector: 'app-assistant-message',
    imports: [LucideDynamicIcon, MarkdownPipe, NgpPopover, NgpPopoverTrigger],
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: { class: 'flex flex-col items-start gap-2 w-full' },
    template: `
        @if (thinking()) {
            <div class="w-full max-w-3xl">
                <button
                    type="button"
                    (click)="toggleThinking.emit()"
                    [attr.aria-expanded]="thinkingVisible()"
                    class="flex items-center gap-2 px-3 h-8 rounded-lg bg-tertiary-fixed-dim/10 hover:bg-tertiary-fixed-dim/20 text-on-tertiary-fixed-variant transition-colors cursor-pointer outline-none focus-visible:outline-2 focus-visible:outline-surface-tint"
                >
                    <svg [lucideIcon]="LucideBrain" class="size-4"></svg>
                    <span class="text-sm font-semibold">
                        @if (thinkingInProgress()) {
                            Analizando...
                        } @else {
                            Razonamiento
                        }
                    </span>
                    @if (thinkingSeconds() != null && !thinkingInProgress()) {
                        <span class="text-xs opacity-80 tabular-nums">· {{ thinkingSeconds() }} s</span>
                    }
                    @if (thinkingInProgress()) {
                        <svg [lucideIcon]="LucideLoader" class="size-3.5 animate-spin"></svg>
                    } @else {
                        <svg
                            [lucideIcon]="LucideChevronDown"
                            class="size-3.5 transition-transform duration-200"
                            [class.rotate-180]="thinkingOpen()"
                        ></svg>
                    }
                </button>
                @if (thinkingVisible()) {
                    <div class="mt-2 border-l-2 border-tertiary-fixed-dim/50 pl-4 py-1">
                        <div class="prose prose-thinking" [innerHTML]="thinking() | markdown"></div>
                        @if (thinkingInProgress()) {
                            <span
                                class="inline-block w-1.5 h-4 bg-tertiary-fixed-dim/60 animate-pulse ml-1 align-middle"
                            ></span>
                        }
                    </div>
                }
            </div>
        }

        @if (content() || !thinking()) {
            <div
                class="bg-surface-container-lowest text-on-surface px-6 py-5 rounded-2xl rounded-tl-none max-w-3xl w-fit border border-outline-variant/30"
            >
                <div class="prose" [innerHTML]="content() | markdown"></div>
                @if (streaming()) {
                    <span class="inline-block w-1.5 h-5 bg-primary/60 animate-pulse ml-0.5 align-middle"></span>
                }
            </div>
        }

        @if (sources().length) {
            <div class="flex flex-wrap items-center gap-1.5 max-w-3xl" aria-label="Fuentes consultadas">
                <span class="text-xs text-on-surface-variant mr-1">Fuentes</span>
                @for (source of sources(); track source.filename + source.chunk_index; let i = $index) {
                    <button
                        type="button"
                        [ngpPopoverTrigger]="sourcePopover"
                        ngpPopoverTriggerPlacement="top-start"
                        class="inline-flex items-center gap-1.5 h-7 px-2 rounded-md bg-surface-container-high text-xs text-on-surface hover:bg-surface-container-highest cursor-pointer outline-none focus-visible:outline-2 focus-visible:outline-surface-tint"
                    >
                        <span class="font-semibold text-primary tabular-nums">{{ i + 1 }}</span>
                        <span class="truncate max-w-48">{{ baseName(source.filename) }}</span>
                        <span class="text-on-surface-variant tabular-nums">· frag. {{ source.chunk_index }}</span>
                    </button>
                    <ng-template #sourcePopover>
                        <div
                            ngpPopover
                            class="w-96 max-w-[calc(100vw-2rem)] rounded-xl bg-surface-container-lowest border border-outline-variant shadow-xl p-4"
                        >
                            <p class="flex items-center gap-2 text-sm font-semibold text-on-surface">
                                <svg [lucideIcon]="LucideFileText" class="size-4 text-primary shrink-0"></svg>
                                <span class="truncate">{{ source.filename }}</span>
                            </p>
                            <p class="text-xs text-on-surface-variant mt-0.5">Fragmento {{ source.chunk_index }}</p>
                            <p
                                class="text-sm text-on-surface leading-relaxed mt-3 max-h-60 overflow-y-auto whitespace-pre-line"
                            >
                                {{ source.excerpt }}
                            </p>
                        </div>
                    </ng-template>
                }
            </div>
        }

        <div class="flex items-center gap-1">
            <svg [lucideIcon]="LucideSparkles" class="size-3.5 text-primary-container"></svg>
            <span class="text-xs text-on-surface-variant mr-1">C.O.R.E. · {{ time() }}</span>
            <ng-content select="[messageActions]" />
        </div>
    `,
})
export class AssistantMessage {
    protected readonly LucideBrain = LucideBrain;
    protected readonly LucideChevronDown = LucideChevronDown;
    protected readonly LucideFileText = LucideFileText;
    protected readonly LucideLoader = LucideLoader;
    protected readonly LucideSparkles = LucideSparkles;

    readonly content = input('');
    readonly thinking = input<string | undefined>('');
    readonly thinkingSeconds = input<number | undefined>(undefined);
    readonly thinkingOpen = input(false);
    readonly streaming = input(false);
    readonly sources = input<Source[]>([]);
    readonly time = input('');

    readonly toggleThinking = output<void>();

    /** El modelo sigue pensando y aún no ha escrito la respuesta. */
    protected thinkingInProgress(): boolean {
        return this.streaming() && !this.content();
    }

    protected thinkingVisible(): boolean {
        return this.thinkingOpen() || this.thinkingInProgress();
    }

    protected baseName(filename: string): string {
        return filename.replace(/\.[^.]+$/, '');
    }
}
