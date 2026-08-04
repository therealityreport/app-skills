export type CdpEvent = { method: string; params?: Record<string, unknown> };

export function summarizeEvents(events: CdpEvent[]): { count: number; methods: string[] } {
  return { count: events.length, methods: [...new Set(events.map((event) => event.method))] };
}
