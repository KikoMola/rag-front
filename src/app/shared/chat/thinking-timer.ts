/** Mide cuánto tarda el modelo en pensar: desde el primer token de razonamiento hasta el primero de respuesta. */
export class ThinkingTimer {
    private start: number | null = null;
    seconds: number | undefined;

    onThinking(now = Date.now()): void {
        if (this.start === null) this.start = now;
    }

    onContent(now = Date.now()): void {
        if (this.start !== null && this.seconds === undefined) {
            this.seconds = Math.max(1, Math.round((now - this.start) / 1000));
        }
    }
}
