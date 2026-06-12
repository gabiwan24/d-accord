/** Während Lautsprecher-Vorschau keine Mikrofon-Treffer zählen. */
let suppressedUntil = 0

export function suppressDetection(ms: number): void {
  suppressedUntil = Math.max(suppressedUntil, performance.now() + ms)
}

export function isDetectionSuppressed(): boolean {
  return performance.now() < suppressedUntil
}
