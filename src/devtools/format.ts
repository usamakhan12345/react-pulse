export function ms(value: number | null | undefined): string {
  if (value === null || value === undefined) return "–";
  if (value === 0) return "0ms";
  if (value < 0.1) return "<0.1ms";
  if (value < 10) return `${value.toFixed(2)}ms`;
  if (value < 100) return `${value.toFixed(1)}ms`;
  if (value < 1000) return `${Math.round(value)}ms`;
  return `${(value / 1000).toFixed(2)}s`;
}

export function gap(value: number | null | undefined): string {
  if (value === null || value === undefined) return "–";
  return value < 1000 ? `${Math.round(value)}ms` : `${(value / 1000).toFixed(1)}s`;
}

const pad = (n: number, size = 2) => String(n).padStart(size, "0");

/** Local wall-clock time with milliseconds, e.g. `14:03:09.452`. */
export function clock(at: number): string {
  const d = new Date(at);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${pad(d.getMilliseconds(), 3)}`;
}
