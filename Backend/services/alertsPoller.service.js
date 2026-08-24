import redisClient from '../config/redisClient.js';
import { axiosInstance } from '../services/wazuhExtended.service.js';

const CACHE_TTL = 900;       // 15 minutes — same as controller
const POLL_INTERVAL = 30000; // 30 seconds between change checks

// Map<orgId, Set<res>>   — connected SSE response objects per org
const sseClients = new Map();
// Map<orgId, indexerCreds> — stored credentials per org (set on first SSE connect)
const orgCredentials = new Map();

// ─── Client registration ────────────────────────────────────────────────────

export function registerSseClient(orgId, res, indexerCreds) {
  if (!sseClients.has(orgId)) sseClients.set(orgId, new Set());
  sseClients.get(orgId).add(res);
  orgCredentials.set(orgId, indexerCreds);
  console.log(`[POLLER] SSE client registered for org ${orgId} (${sseClients.get(orgId).size} connected)`);
}

export function unregisterSseClient(orgId, res) {
  const clients = sseClients.get(orgId);
  if (!clients) return;
  clients.delete(res);
  if (clients.size === 0) {
    sseClients.delete(orgId);
    orgCredentials.delete(orgId);
    console.log(`[POLLER] Last SSE client disconnected for org ${orgId}`);
  } else {
    console.log(`[POLLER] SSE client removed for org ${orgId} (${clients.size} remaining)`);
  }
}

// ─── Notify helpers ─────────────────────────────────────────────────────────

function notifyClients(orgId, payload) {
  const clients = sseClients.get(orgId);
  if (!clients) return;
  const message = `data: ${JSON.stringify(payload)}\n\n`;
  clients.forEach(res => {
    try { res.write(message); } catch (err) {
      console.warn(`[POLLER] Write failed for org ${orgId}: ${err.message}`);
    }
  });
}

// ─── Lightweight alert count fetch ──────────────────────────────────────────

async function fetchCurrentAlertCount(indexerCreds) {
  const { host: INDEXER_HOST, username: INDEXER_USER, password: INDEXER_PASS } = indexerCreds;
  const authEncoded = Buffer.from(`${INDEXER_USER}:${INDEXER_PASS}`).toString('base64');

  const response = await axiosInstance.post(
    `${INDEXER_HOST}/wazuh-alerts*/_count`,
    {
      query: {
        bool: {
          filter: [
            { range: { '@timestamp': { gte: 'now-24h', lt: 'now' } } },
            { range: { 'rule.level': { gte: parseInt(process.env.WAZUH_MIN_ALERT_LEVEL) || 8 } } }
          ]
        }
      }
    },
    {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${authEncoded}`
      }
    }
  );

  return response.data?.count ?? 0;
}

// ─── Background poll loop ────────────────────────────────────────────────────

async function pollForChanges() {
  if (sseClients.size === 0) return;

  console.log(`[POLLER] Checking ${sseClients.size} org(s) for alert changes...`);

  for (const [orgId, clients] of sseClients.entries()) {
    if (clients.size === 0) continue;

    const indexerCreds = orgCredentials.get(orgId);
    if (!indexerCreds) continue;

    try {
      const currentCount = await fetchCurrentAlertCount(indexerCreds);

      // Dedicated poller state key (separate from request cache keys)
      const pollerKey = `alerts_poller_count:${orgId}`;
      const cachedRaw = await redisClient.get(pollerKey);
      const previousCount = cachedRaw !== null ? JSON.parse(cachedRaw) : null;

      // Always update poller state
      await redisClient.set(pollerKey, JSON.stringify(currentCount), { EX: CACHE_TTL * 2 });

      if (previousCount === null) {
        // First poll — establish baseline, nothing to notify yet
        console.log(`[POLLER] Baseline set for org ${orgId}: ${currentCount} alerts`);
        continue;
      }

      if (currentCount !== previousCount) {
        console.log(`[POLLER] ⚡ Change detected for org ${orgId}: ${previousCount} → ${currentCount}`);

        // Invalidate all data-derived cache keys for this org
        const patterns = [
          `alerts_count:${orgId}:*`,
          `alerts:${orgId}:*`,
          `total_events_count:${orgId}:*`,
          `total_logs_count:${orgId}:*`,
          `top_risk_entities:${orgId}:*`,
          `dashboard_metrics:${orgId}`,
          `agents_summary:${orgId}`,
          `agents_basic:${orgId}`,
          `dashboard_alerts:${orgId}:*`,
          `risk_matrix:${orgId}:*`,
          `security_metrics:${orgId}:*`,
          `compliance:${orgId}`,
          `compliance_framework:${orgId}:*`,
          `compliance_iso27001:${orgId}:*`,
          `events_count_by_agent:${orgId}:*`,
          `logs_count_by_agent:${orgId}:*`,
        ];

        for (const pattern of patterns) {
          const keys = await redisClient.keys(pattern);
          if (keys.length > 0) {
            await redisClient.del(keys);
            console.log(`[POLLER] Invalidated ${keys.length} keys matching "${pattern}"`);
          }
        }

        // Notify connected frontend clients
        notifyClients(orgId, {
          type: 'data-changed',
          count: currentCount,
          previousCount
        });
      } else {
        console.log(`[POLLER] No change for org ${orgId} (${currentCount} alerts)`);
      }
    } catch (err) {
      console.error(`[POLLER] Error polling org ${orgId}: ${err.message}`);
    }
  }
}

setInterval(pollForChanges, POLL_INTERVAL);
console.log(`[POLLER] Alert change detector started (every ${POLL_INTERVAL / 1000}s)`);
