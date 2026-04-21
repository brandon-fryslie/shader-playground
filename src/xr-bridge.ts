// Remote eval bridge for on-device debugging.
//
// When the URL carries ?xrbridge=<topic-suffix>, this module opens an SSE
// channel to a public ntfy.sh topic and evaluates any message it receives as
// JS in the page context, posting the result back to a matching result topic.
// This lets anyone on the network send commands via `curl` without needing to
// physically reach Safari Web Inspector on the headset.
//
// [LAW:one-source-of-truth] The topic suffix is the entire addressability.
// Same suffix ↔ same session; different suffixes are isolated.
// [LAW:single-enforcer] One SSE connection per page. Init is idempotent —
// double-calls are no-ops after the first.
//
// Safety: only active when ?xrbridge is present. No persistent enable. Topics
// are public, so use a random suffix (the URL is the capability). Never do
// this on a production build.

interface BridgeResult {
  id?: string;
  ok: boolean;
  value?: unknown;
  error?: string;
  at: number;
}

let active = false;

export function maybeInitXrBridge(): void {
  if (active) return;
  const params = new URLSearchParams(location.search);
  const suffix = params.get('xrbridge');
  if (!suffix) return;

  const topic = `xrpb-${suffix}`;
  const cmdUrl = `https://ntfy.sh/${topic}-cmd/sse`;
  const resultUrl = `https://ntfy.sh/${topic}-result`;
  // eslint-disable-next-line no-console
  console.log('[xr-bridge] listening', {
    topic,
    cmd: `curl -d '<code>' https://ntfy.sh/${topic}-cmd`,
    results: `curl -sN https://ntfy.sh/${topic}-result/sse`,
  });

  active = true;
  const es = new EventSource(cmdUrl);
  es.onmessage = async (event: MessageEvent<string>) => {
    let body: { message?: string; id?: string } | null = null;
    try { body = JSON.parse(event.data); } catch { return; }
    const code = body?.message;
    if (!code) return;
    const id = body?.id;

    let result: BridgeResult;
    try {
      // Indirect eval runs in global scope so references to window/main module
      // globals resolve the same way a DevTools console would.
      const value = await Promise.resolve((0, eval)(code));
      result = { id, ok: true, value: serializable(value), at: Date.now() };
    } catch (err) {
      result = { id, ok: false, error: String(err), at: Date.now() };
    }
    try {
      await fetch(resultUrl, {
        method: 'POST',
        body: JSON.stringify(result),
        headers: { 'Content-Type': 'application/json' },
      });
    } catch {
      // Best-effort; if the result post fails (offline, relay down) the
      // command already ran. Caller can re-issue if they need confirmation.
    }
  };
  es.onerror = () => {
    // eslint-disable-next-line no-console
    console.warn('[xr-bridge] SSE error; EventSource auto-reconnects');
  };
}

// Strip things that don't survive JSON (functions, DOM nodes, cycles) so the
// result post never throws. Loses precision on exotic types; acceptable for
// a debug channel.
function serializable(v: unknown): unknown {
  try {
    return JSON.parse(JSON.stringify(v, (_key, val) => {
      if (typeof val === 'function') return `[function ${val.name || 'anonymous'}]`;
      if (val instanceof Element) return `[Element ${val.tagName}]`;
      if (val instanceof Map) return Array.from(val.entries());
      if (val instanceof Set) return Array.from(val.values());
      return val;
    }));
  } catch (e) {
    return `[unserializable: ${String(e)}]`;
  }
}
