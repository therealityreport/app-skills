export function normalizeProfileName(name?: string): string {
  return name?.trim() || "unknown";
}
