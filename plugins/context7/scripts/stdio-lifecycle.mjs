// Shared stdio-MCP lifecycle handling.
//
// A stdio MCP server's contract is: when the client closes stdin, the server
// exits. A server that registers `stdin.on("data")` without ever observing
// EOF has no code path that notices the client is gone. On its own that is
// survivable -- once stdin ends, an idle event loop drains and the process
// exits by accident. It stops being survivable the moment the server spawns a
// child with piped stdio, because the child's stdout/stderr listeners hold a
// ref on the loop forever. The process then outlives its client permanently
// and is reparented to launchd.
//
// That combination leaked 16 three-process chains before this helper existed,
// and it leaked in proportion to real usage -- servers that were never called
// never spawned a child, so they exited cleanly and hid the bug.
//
// This module is vendored per-plugin on purpose: plugins install independently
// via symlink, so a cross-plugin import path would not survive installation.
// Keep the copies in sync by hand; the file is small and deliberately stable.

const DEFAULT_EXIT_GRACE_MS = 5000;
const DEFAULT_WATCHDOG_MS = 5000;

/**
 * Install EOF, signal, and parent-death handling for a stdio MCP server.
 *
 * @param {object} [options]
 * @param {() => void} [options.onShutdown] Synchronous cleanup. Must not throw;
 *   any throw is swallowed so one failing teardown cannot block exit.
 * @param {number} [options.exitGraceMs] Bounded window after `onShutdown` before
 *   forcing exit, so a child's SIGTERM has time to land and escalate.
 * @param {number} [options.watchdogMs] Parent-liveness poll interval.
 * @returns {(code?: number) => void} The idempotent shutdown function.
 */
export function installStdioLifecycle(options = {}) {
  const {
    onShutdown,
    exitGraceMs = DEFAULT_EXIT_GRACE_MS,
    watchdogMs = DEFAULT_WATCHDOG_MS
  } = options;

  let shuttingDown = false;

  const shutdown = (code = 0) => {
    if (shuttingDown) return;
    shuttingDown = true;

    try {
      onShutdown?.();
    } catch {
      // Teardown is best-effort. Exiting matters more than cleaning up neatly.
    }

    // Unref'd: if nothing else holds the loop we exit immediately. If a child
    // is still up its pipes keep the loop alive, so this still fires and caps
    // how long a wedged upstream can delay our exit.
    const forceExit = setTimeout(() => process.exit(code), exitGraceMs);
    forceExit.unref();
  };

  // The contract: client closed stdin, so we are done.
  process.stdin.on("end", () => shutdown(0));
  process.stdin.on("close", () => shutdown(0));
  process.stdin.on("error", () => shutdown(0));

  process.on("SIGTERM", () => shutdown(0));
  process.on("SIGINT", () => shutdown(0));
  process.on("SIGHUP", () => shutdown(0));

  // A SIGKILLed or force-quit client never closes the pipe cleanly, so EOF
  // alone is not enough. Reparenting to pid 1 is the kernel-proven signal that
  // our client is gone.
  const watchdog = setInterval(() => {
    if (process.ppid === 1) shutdown(0);
  }, watchdogMs);
  watchdog.unref();

  return shutdown;
}

/**
 * Signal a child and everything it spawned.
 *
 * Wrapper layers such as `npm exec` / `npx` do not forward signals to their own
 * children, so signalling the direct child leaves the real server running. A
 * child spawned with `detached: true` leads its own process group, and a
 * negative pid signals that whole group.
 *
 * @param {import("node:child_process").ChildProcess} child
 * @param {NodeJS.Signals} signal
 */
export function killProcessGroup(child, signal) {
  if (!child?.pid) return;
  try {
    process.kill(-child.pid, signal);
  } catch {
    // Not a group leader (or already reaped) -- fall back to the direct child.
    try {
      child.kill(signal);
    } catch {
      // Already gone.
    }
  }
}
