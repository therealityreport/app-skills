export type StackFrame = {
  url?: string;
  file?: string;
  line?: number;
  column?: number;
  functionName?: string;
  resolved: boolean;
};

export function parseStackTrace(stack = ""): StackFrame[] {
  return stack
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const match = line.match(/at\s+(?:(.*?)\s+\()?(.+?):(\d+):(\d+)\)?$/);
      if (!match) return { url: line, resolved: false };
      return {
        functionName: match[1],
        url: match[2],
        file: match[2]?.startsWith("file:") ? match[2] : undefined,
        line: Number(match[3]),
        column: Number(match[4]),
        resolved: Boolean(match[2]?.startsWith("file:"))
      };
    });
}
