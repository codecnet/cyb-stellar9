import {
  getDashboardMetricsService,
  getAgentsSummaryService,
  getAlertsService,
  refreshCacheService
} from '../services/wazuhService.js';
import redisClient from '../config/redisClient.js';

const CACHE_TTL = 900; // 15 minutes

export const getDashboardMetrics = async (req, res) => {
  try {
    if (!req.clientCreds) {
      console.log(`❌ Dashboard metrics: No client credentials found for request`);
      return res.status(403).json({
        error: 'Client credentials not found',
        userMessage: 'Unable to access organization data. Please contact your administrator.'
      });
    }

    if (!req.clientCreds.wazuhCredentials) {
      console.log(`❌ Dashboard metrics: Missing Wazuh credentials for org ${req.clientCreds.organizationId}`);
      return res.status(400).json({
        error: 'Wazuh credentials not configured',
        userMessage: 'This organization\'s security monitoring is not configured. Please contact your administrator.'
      });
    }

    const orgId = req.clientCreds.organizationId;
    const cacheKey = `dashboard_metrics:${orgId}`;

    try {
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        console.log(`[DASHBOARD METRICS] Cache HIT: ${orgId}`);
        res.setHeader('X-Cache', 'HIT');
        return res.json(JSON.parse(cached));
      }
      res.setHeader('X-Cache', 'MISS');
    } catch {
      console.warn('[DASHBOARD METRICS] Redis unavailable, continuing without cache');
    }

    console.log(`🔍 Dashboard metrics: Fetching data for org ${orgId}`);
    const data = await getDashboardMetricsService(req.clientCreds);
    console.log(`✅ Dashboard metrics: Successfully fetched data for org ${orgId}`);

    try {
      await redisClient.setEx(cacheKey, CACHE_TTL, JSON.stringify(data));
    } catch {
      console.warn('[DASHBOARD METRICS] Failed to set cache');
    }

    res.json(data);
  } catch (err) {
    console.error(`❌ Dashboard metrics error for org ${req.clientCreds?.organizationId}:`, err.message);

    // Provide user-friendly error messages based on error type
    let userMessage = 'Unable to fetch dashboard data. Please try again later.';
    let statusCode = 500;

    if (err.message.includes('ECONNREFUSED') || err.message.includes('ENOTFOUND')) {
      userMessage = 'Security monitoring server is temporarily unavailable. Please try again later.';
      statusCode = 503;
    } else if (err.message.includes('401') || err.message.includes('Unauthorized')) {
      userMessage = 'Authentication failed with security monitoring system. Please contact your administrator.';
      statusCode = 401;
    } else if (err.message.includes('timeout')) {
      userMessage = 'Request timed out. The security monitoring system may be experiencing high load.';
      statusCode = 504;
    }

    res.status(statusCode).json({
      success: false,
      message: userMessage,
      ...(process.env.NODE_ENV === 'development' && { debug: { error: err.message, stack: err.stack } })
    });
  }
};

export const getAgentsSummary = async (req, res) => {
  try {
    if (!req.clientCreds) {
      return res.status(403).json({
        error: 'Client credentials not found',
        userMessage: 'Unable to access organization data. Please contact your administrator.'
      });
    }

    if (!req.clientCreds.wazuhCredentials) {
      return res.status(400).json({
        error: 'Wazuh credentials not configured',
        userMessage: 'This organization\'s security monitoring is not configured. Please contact your administrator.'
      });
    }

    const orgId = req.clientCreds.organizationId;
    const cacheKey = `agents_summary:${orgId}`;

    try {
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        console.log(`[AGENTS SUMMARY] Cache HIT: ${orgId}`);
        res.setHeader('X-Cache', 'HIT');
        return res.json(JSON.parse(cached));
      }
      res.setHeader('X-Cache', 'MISS');
    } catch {
      console.warn('[AGENTS SUMMARY] Redis unavailable, continuing without cache');
    }

    const data = await getAgentsSummaryService(req.clientCreds);

    try {
      await redisClient.setEx(cacheKey, CACHE_TTL, JSON.stringify(data));
    } catch {
      console.warn('[AGENTS SUMMARY] Failed to set cache');
    }

    res.json(data);
  } catch (err) {
    console.error(`❌ Agents summary error for org ${req.clientCreds?.organizationId}:`, err.message);

    let userMessage = 'Unable to fetch agents data. Please try again later.';
    let statusCode = 500;

    if (err.message.includes('ECONNREFUSED') || err.message.includes('ENOTFOUND')) {
      userMessage = 'Security monitoring server is temporarily unavailable. Please try again later.';
      statusCode = 503;
    } else if (err.message.includes('401') || err.message.includes('Unauthorized')) {
      userMessage = 'Authentication failed with security monitoring system. Please contact your administrator.';
      statusCode = 401;
    }

    res.status(statusCode).json({
      success: false,
      message: userMessage,
      ...(process.env.NODE_ENV === 'development' && { debug: { error: err.message, stack: err.stack } })
    });
  }
};

export const getAlerts = async (req, res) => {
  try {
    if (!req.clientCreds) {
      return res.status(403).json({
        error: 'Client credentials not found',
        userMessage: 'Unable to access organization data. Please contact your administrator.'
      });
    }

    if (!req.clientCreds.indexerCredentials) {
      return res.status(400).json({
        error: 'Indexer credentials not configured',
        userMessage: 'This organization\'s alert indexing is not configured. Please contact your administrator.'
      });
    }

    const { severity = 8, size = 500, lastMinutes } = req.query;

    const orgId = req.clientCreds.organizationId;
    const cacheKey = `dashboard_alerts:${orgId}:${severity}:${size}:${lastMinutes || 'all'}`;

    try {
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        console.log(`[DASHBOARD ALERTS] Cache HIT: ${orgId}`);
        res.setHeader('X-Cache', 'HIT');
        return res.json(JSON.parse(cached));
      }
      res.setHeader('X-Cache', 'MISS');
    } catch {
      console.warn('[DASHBOARD ALERTS] Redis unavailable, continuing without cache');
    }

    const data = await getAlertsService(req.clientCreds.indexerCredentials, {
      severity: parseInt(severity),
      size: parseInt(size),
      lastMinutes: lastMinutes ? parseInt(lastMinutes) : undefined
    }, orgId);

    try {
      await redisClient.setEx(cacheKey, CACHE_TTL, JSON.stringify(data));
    } catch {
      console.warn('[DASHBOARD ALERTS] Failed to set cache');
    }

    res.json(data);
  } catch (err) {
    console.error(`❌ Alerts error for org ${req.clientCreds?.organizationId}:`, err.message);

    let userMessage = 'Unable to fetch alerts data. Please try again later.';
    let statusCode = 500;

    if (err.message.includes('ECONNREFUSED') || err.message.includes('ENOTFOUND')) {
      userMessage = 'Alert indexing server is temporarily unavailable. Please try again later.';
      statusCode = 503;
    } else if (err.message.includes('401') || err.message.includes('Unauthorized')) {
      userMessage = 'Authentication failed with alert indexing system. Please contact your administrator.';
      statusCode = 401;
    }

    res.status(statusCode).json({
      success: false,
      message: userMessage,
      ...(process.env.NODE_ENV === 'development' && { debug: { error: err.message, stack: err.stack } })
    });
  }
};

export const refreshCache = async (req, res) => {
  try {
    const { cacheKey } = req.body;
    await refreshCacheService(cacheKey);
    
    res.json({ success: true, message: 'Cache refreshed successfully' });
  } catch (err) {
    console.error('Cache refresh error:', err.message);
    res.status(500).json({
      success: false,
      message: 'Failed to refresh cache. Please try again later.',
      ...(process.env.NODE_ENV === 'development' && { debug: { error: err.message, stack: err.stack } })
    });
  }
};