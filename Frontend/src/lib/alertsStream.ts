/**
 * Singleton SSE client for alert data-change notifications.
 *
 * Multiple components subscribe here; only ONE SSE connection is kept open
 * regardless of how many subscribers exist. The connection is closed when the
 * last subscriber unmounts, and automatically restarted when the first new
 * subscriber registers (or when the orgId changes).
 */

import Cookies from 'js-cookie';

const BASE_URL = process.env.NEXT_PUBLIC_RBAC_BASE_IP ?? '';

type Listener = () => void;

// ── Module-level singleton state ─────────────────────────────────────────────
const listeners = new Set<Listener>();
let controller: AbortController | null = null;
let activeOrgId: string | null | undefined = undefined; // undefined = "not yet set"

// ── Internal helpers ─────────────────────────────────────────────────────────

function notifyAll() {
  listeners.forEach(fn => { try { fn(); } catch { /* ignore */ } });
}

async function connect(orgId: string | null) {
  // Abort any existing connection first
  controller?.abort();
  controller = new AbortController();
  activeOrgId = orgId;

  const token = Cookies.get('auth_token');
  if (!token) return;

  const params = new URLSearchParams();
  if (orgId) params.append('orgId', orgId);

  try {
    const res = await fetch(`${BASE_URL}/wazuh/alerts/stream?${params}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'text/event-stream',
      },
      signal: controller.signal,
    });

    if (!res.ok || !res.body) return;

    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buf += dec.decode(value, { stream: true });
      const chunks = buf.split('\n\n');
      buf = chunks.pop() ?? '';

      for (const chunk of chunks) {
        const line = chunk.split('\n').find(l => l.startsWith('data:'));
        if (!line) continue;
        try {
          const payload = JSON.parse(line.slice(5).trim());
          if (payload.type === 'data-changed') {
            console.log(
              `[SSE] Data changed (${payload.previousCount} → ${payload.count}), notifying ${listeners.size} subscriber(s)`
            );
            notifyAll();
          }
        } catch { /* ignore malformed chunks */ }
      }
    }
  } catch (err: any) {
    if (err?.name !== 'AbortError') {
      console.warn('[SSE] Connection closed:', err?.message ?? err);
    }
  }
}

function disconnect() {
  controller?.abort();
  controller = null;
  activeOrgId = undefined;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Subscribe a callback to be called whenever backend detects alert data changed.
 *
 * @param orgId   The current organisation ID (pass `null` for non-client mode).
 * @param onDataChanged  Called each time a `data-changed` SSE event arrives.
 * @returns  Unsubscribe function — call this in your `useEffect` cleanup.
 *
 * @example
 *   useEffect(() => {
 *     return subscribeToDataChanges(orgId, () => fetchData());
 *   }, [orgId]);
 */
export function subscribeToDataChanges(
  orgId: string | null,
  onDataChanged: Listener
): () => void {
  listeners.add(onDataChanged);

  // Start/restart connection if org changed or no active connection
  if (!controller || activeOrgId !== orgId) {
    connect(orgId);
  }

  return () => {
    listeners.delete(onDataChanged);
    if (listeners.size === 0) {
      disconnect();
    }
  };
}
