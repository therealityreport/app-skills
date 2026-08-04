export function cdpHealth(): { available: boolean; mode: "mock"; notes: string[] } {
  return {
    available: false,
    mode: "mock",
    notes: ["Live CDP websocket attachment is deferred in the first slice."]
  };
}
