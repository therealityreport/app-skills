import type { TimelineEvent } from "./types.js";

export function sortTimeline(events: TimelineEvent[]): TimelineEvent[] {
  return [...events].sort((a, b) => a.at.localeCompare(b.at) || a.id.localeCompare(b.id));
}

export function timelineEvent(kind: TimelineEvent["kind"], summary: string, metadata?: Record<string, unknown>): TimelineEvent {
  const at = new Date().toISOString();
  return {
    id: `${kind}-${at}-${Math.random().toString(36).slice(2, 8)}`,
    at,
    kind,
    summary,
    metadata
  };
}
