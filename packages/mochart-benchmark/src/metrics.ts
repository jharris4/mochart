export function nextFrame(): Promise<number> {
  return new Promise((resolve) => requestAnimationFrame(resolve));
}

/** Resolves after the browser has had a chance to paint the current DOM. */
export async function afterPaint(): Promise<void> {
  await nextFrame();
  await nextFrame();
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface FrameStats {
  frames: number;
  fps: number;
  avgMs: number;
  p95Ms: number;
  maxMs: number;
  over33: number;
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) {
    return 0;
  }
  const index = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[Math.max(0, index)];
}

/** Samples requestAnimationFrame deltas between start() and stop(). */
export class FrameSampler {
  private deltas: number[] = [];
  private running = false;
  private last = 0;
  private rafId = 0;

  start(): void {
    this.deltas = [];
    this.running = true;
    this.last = performance.now();
    const tick = (time: number) => {
      if (!this.running) {
        return;
      }
      this.deltas.push(time - this.last);
      this.last = time;
      this.rafId = requestAnimationFrame(tick);
    };
    this.rafId = requestAnimationFrame(tick);
  }

  stop(): FrameStats {
    this.running = false;
    cancelAnimationFrame(this.rafId);
    // drop the first delta: it includes setup time before sampling began
    const deltas = this.deltas.slice(1);
    if (deltas.length === 0) {
      return { frames: 0, fps: 0, avgMs: 0, p95Ms: 0, maxMs: 0, over33: 0 };
    }
    const total = deltas.reduce((sum, d) => sum + d, 0);
    const sorted = [...deltas].sort((a, b) => a - b);
    return {
      frames: deltas.length,
      fps: (deltas.length / total) * 1000,
      avgMs: total / deltas.length,
      p95Ms: percentile(sorted, 95),
      maxMs: sorted[sorted.length - 1],
      over33: deltas.filter((d) => d > 33.4).length
    };
  }
}

/** Continuously updates `element` with a rolling frame rate readout. */
export function startFpsMeter(element: HTMLElement): void {
  const window: number[] = [];
  let last = performance.now();
  let lastText = 0;
  const tick = (time: number) => {
    window.push(time - last);
    last = time;
    if (window.length > 30) {
      window.shift();
    }
    if (time - lastText > 250 && window.length > 0) {
      const avg = window.reduce((sum, d) => sum + d, 0) / window.length;
      element.textContent = Math.round(1000 / avg) + ' fps';
      lastText = time;
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

export function formatMs(value: number): string {
  return value >= 100 ? String(Math.round(value)) : value.toFixed(1);
}
