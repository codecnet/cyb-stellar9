import axiosInstance from "../config/axiosConfig.js";

// No caching - fetch fresh data every time

// Retry configuration
const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  retryableErrors: ['ECONNREFUSED', 'ENOTFOUND', 'ETIMEDOUT', 'timeout', '500', '502', '503', '504']
};

// Retry wrapper function
async function withRetry(operation, context = 'operation') {
  let lastError;

  for (let attempt = 1; attempt <= RETRY_CONFIG.maxRetries; attempt++) {
    try {
      const result = await operation();
      return result;
    } catch (error) {
      lastError = error;
      const isRetryable = RETRY_CONFIG.retryableErrors.some(errorType =>
        error.message.includes(errorType) ||
        error.code === errorType ||
        (error.response && RETRY_CONFIG.retryableErrors.includes(error.response.status?.toString()))
      );

      if (!isRetryable || attempt === RETRY_CONFIG.maxRetries) {
        break;
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(
        RETRY_CONFIG.baseDelay * Math.pow(2, attempt - 1),
        RETRY_CONFIG.maxDelay
      );

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

export const getWazuhToken = async (wazuhCredentials) => {
  const { host, username, password } = wazuhCredentials;

  console.log(`[i] Getting fresh Wazuh token for ${username} at ${host}...`);

  const authString = `${username}:${password}`;
  const authEncoded = Buffer.from(authString).toString("base64");

  return await withRetry(async () => {
    try {
      const response = await axiosInstance.post(
        `${host}/security/user/authenticate`,
        {},
        { headers: { Authorization: `Basic ${authEncoded}` } }
      );

      const { data } = response;
      if (data.error !== 0 || !data.data?.token) {
        throw new Error("Wazuh authentication failed");
      }

      console.log("[✓] Token acquired");
      return data.data.token;
    } catch (error) {
      if (error.response?.status === 401) {
        throw new Error(`Wazuh authentication failed: Invalid credentials`);
      }
      throw error;
    }
  }, `Wazuh authentication for ${username}`);
};

export const getActiveAgentIds = async (wazuhCredentials, token) => {
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: "application/json",
  };

  try {
    const response = await axiosInstance.get(
      `${wazuhCredentials.host}/agents?status=active`,
      { headers }
    );
    const agents = response.data.data?.affected_items || [];
    return agents.map((agent) => agent.id);
  } catch (error) {
    throw new Error(`Failed to fetch active agents: ${error.message}`);
  }
};

export const getAgentScore = async (wazuhCredentials, token, agentId) => {
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: "application/json",
  };

  try {
    const response = await axiosInstance.get(
      `${wazuhCredentials.host}/sca/${agentId}`,
      { headers }
    );
    const items = response.data.data?.affected_items || [];
    return items[0]?.score || null;
  } catch (error) {
    console.error(`SCA score error for agent ${agentId}:`, error.message);
    return null;
  }
};

export const computeAverageComplianceScore = async (wazuhCredentials) => {
  try {
    const token = await getWazuhToken(wazuhCredentials);
    const agentIds = await getActiveAgentIds(wazuhCredentials, token);

    const scores = await Promise.all(
      agentIds.map(async (agentId) => {
        return await getAgentScore(wazuhCredentials, token, agentId);
      })
    );

    const validScores = scores.filter((score) => score !== null);
    if (validScores.length === 0) return 0;

    const avgScore =
      validScores.reduce((sum, score) => sum + score, 0) / validScores.length;
    return Math.round(avgScore * 100) / 100;
  } catch (error) {
    console.error("Compliance score error:", error.message);
    return 0;
  }
};

export const getAgentsSummaryService = async (clientCreds) => {
  const { wazuhCredentials, indexerCredentials, organizationId } = clientCreds;

  const token = await getWazuhToken(wazuhCredentials);
  const headers = { Authorization: `Bearer ${token}` };

  try {
    const [agentsRes, vulnRes] = await Promise.all([
      axiosInstance.get(`${wazuhCredentials.host}/agents`, { headers }),
      fetchVulnerabilities(indexerCredentials),
    ]);

    const agents = agentsRes.data.data?.affected_items || [];
    const summary = {};

    for (const agent of agents) {
      if (agent.id === "000") continue;

      const agentData = {
        name: agent.name || "Unknown",
        ip: agent.ip,
        os_name: agent.os?.name,
        status: agent.status,
        vulnerabilities: vulnRes[agent.id] || [],
      };

      try {
        const scaRes = await axiosInstance.get(
          `${wazuhCredentials.host}/sca/${agent.id}`,
          { headers }
        );
        const scaItem = scaRes.data.data?.affected_items?.[0];
        if (scaItem) {
          agentData.score = scaItem.score;
          agentData.total_checks = scaItem.total_checks;
          agentData.pass = scaItem.pass;
          agentData.fail = scaItem.fail;
          agentData.invalid = scaItem.invalid;

          if (scaItem.policy_id) {
            const checksRes = await axiosInstance.get(
              `${wazuhCredentials.host}/sca/${agent.id}/checks/${scaItem.policy_id}`,
              { headers }
            );
            agentData.cis_checks = checksRes.data.data?.affected_items || [];
          }
        }
      } catch (err) {
        console.warn(`SCA fetch failed for agent ${agent.id}:`, err.message);
      }

      summary[agent.id] = agentData;
    }

    return { agents: summary };
  } catch (err) {
    console.error("Agents summary error:", err.message);
    throw err;
  }
};

export const getDashboardMetricsService = async (clientCreds) => {
  const { wazuhCredentials, indexerCredentials, organizationId } = clientCreds;

  return await withRetry(async () => {
    const token = await getWazuhToken(wazuhCredentials);
    const headers = { Authorization: `Bearer ${token}` };

    const [
      agentSummary,
      complianceScore,
      alertStats,
      wazuhHealth,
      hourlyAlerts,
    ] = await Promise.all([
      getAgentStatusSummary(wazuhCredentials, token),
      computeAverageComplianceScore(wazuhCredentials),
      getAlertStatistics(indexerCredentials),
      getWazuhHealth(wazuhCredentials, token),
      getHourlyAlerts(indexerCredentials),
    ]);

    const metrics = {
      total_alerts: alertStats.total,
      alerts_last_24hr: alertStats.last24h,
      critical_alerts: alertStats.critical,
      major_alerts: alertStats.major,
      minor_alerts: alertStats.minor,
      compliance_score: `${complianceScore}%`,
      active_agents: agentSummary,
      wazuh_health: wazuhHealth,
      hourly_alert_counts: hourlyAlerts,
    };

    return metrics;
  }, `Dashboard metrics for org ${organizationId}`);
};

export const getAlertsService = async (indexerCredentials, options = {}, organizationId = null) => {
  const { host, username, password } = indexerCredentials;
  const auth = Buffer.from(`${username}:${password}`).toString("base64");
  const minLevel = parseInt(process.env.WAZUH_MIN_ALERT_LEVEL) || 8;

  return await withRetry(async () => {
    const response = await axiosInstance.post(
      `${host}/wazuh-alerts-*/_search`,
      {
        query: { range: { "rule.level": { gte: minLevel } } },
        sort: [{ "@timestamp": { order: "desc" } }],
        size: 10000, // Elasticsearch max limit without pagination
        // Removed _source to fetch complete alert JSON with all fields
      },
      {
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/json",
        },
      }
    );

    const alerts =
      response.data.hits?.hits?.map((hit) => {
        const source = hit._source || {};
        // Return complete alert JSON with all fields
        return {
          alert_id: hit._id,
          // Include commonly used fields at top level for backward compatibility
          severity: source.rule?.level,
          alert_description: source.rule?.description,
          time: source["@timestamp"],
          host_name: source.predecoder?.hostname || "Host N/A",
          agent_name: source.agent?.name,
          agent_id: source.agent?.id,
          rule_groups: (source.rule?.groups || []).join(", "),
          // Include the complete alert data
          ...source
        };
      }) || [];

    return { alerts };
  }, `Alerts fetch for org ${organizationId}`);
};

// Helper functions
async function fetchVulnerabilities({ host, username, password }) {
  const auth = Buffer.from(`${username}:${password}`).toString("base64");
  try {
    const res = await axiosInstance.get(
      `${host}/wazuh-states-vulnerabilities-*/_search?size=1000`,
      { headers: { Authorization: `Basic ${auth}` } }
    );

    return (res.data.hits?.hits || []).reduce((acc, hit) => {
      const agentId = hit._source?.agent?.id;
      if (agentId) {
        acc[agentId] = acc[agentId] || [];
        acc[agentId].push({
          name: hit._source?.package?.name,
          id: hit._source?.vulnerability?.id,
          severity: hit._source?.vulnerability?.severity,
        });
      }
      return acc;
    }, {});
  } catch (err) {
    console.error("Vulnerabilities fetch error:", err.message);
    return {};
  }
}

async function getAgentStatusSummary(wazuhCredentials, token) {
  const headers = { Authorization: `Bearer ${token}` };
  try {
    const res = await axiosInstance.get(
      `${wazuhCredentials.host}/agents/summary/status`,
      { headers }
    );
    return res.data.data?.connection?.active;
  } catch (err) {
    console.error("Agent status error:", err.message);
    return 0;
  }
}

async function getAlertStatistics({ host, username, password }) {
  const auth = Buffer.from(`${username}:${password}`).toString("base64");
  try {
    const [totalRes, last24hRes] = await Promise.all([
      axiosInstance.post(
        `${host}/wazuh-alerts-*/_search`,
        {
          size: 0,
          aggs: {
            severity: {
              range: {
                field: "rule.level",
                ranges: [
                  { key: "Minor", to: 10 },
                  { key: "Major", from: 10, to: 13 },
                  { key: "Critical", from: 13 },
                ],
              },
            },
          },
        },
        {
          headers: {
            Authorization: `Basic ${auth}`,
            "Content-Type": "application/json",
          },
        }
      ),
      axiosInstance.post(
        `${host}/wazuh-alerts-*/_search`,
        {
          size: 0,
          query: {
            range: {
              timestamp: {
                gte: "now-24h",
                lte: "now",
              },
            },
          },
          aggs: {
            severity: {
              range: {
                field: "rule.level",
                ranges: [
                  { key: "Minor", to: 10 },
                  { key: "Major", from: 10, to: 13 },
                  { key: "Critical", from: 13 },
                ],
              },
            },
          },
        },
        {
          headers: {
            Authorization: `Basic ${auth}`,
            "Content-Type": "application/json",
          },
        }
      ),
    ]);

    const totalBuckets = totalRes.data.aggregations?.severity?.buckets || [];
    const totalalerts = totalBuckets.reduce(
      (sum, bucket) => sum + bucket.doc_count,
      0
    );
    const last24hBuckets =
      last24hRes.data.aggregations?.severity?.buckets || [];
    const last24htotal = last24hBuckets.reduce(
      (sum, bucket) => sum + bucket.doc_count,
      0
    );

    return {
      total: totalalerts || 0,
      last24h: last24htotal || 0,
      critical:
        last24hBuckets.find((b) => b.key === "Critical")?.doc_count || 0,
      major: last24hBuckets.find((b) => b.key === "Major")?.doc_count || 0,
      minor: last24hBuckets.find((b) => b.key === "Minor")?.doc_count || 0,
    };
  } catch (err) {
    console.error("Alert statistics error:", err.message);
    return {
      total: 0,
      last24h: 0,
      critical: 0,
      major: 0,
      minor: 0,
    };
  }
}

async function getWazuhHealth(wazuhCredentials, token) {
  const headers = { Authorization: `Bearer ${token}` };
  try {
    const res = await axiosInstance.get(
      `${wazuhCredentials.host}/manager/configuration/validation`,
      { headers }
    );
    return res.data.data?.affected_items?.[0]?.status || "unknown";
  } catch (err) {
    console.error("Wazuh health error:", err.message);
    return "error";
  }
}

async function getHourlyAlerts({ host, username, password }) {
  const auth = Buffer.from(`${username}:${password}`).toString("base64");
  try {
    const res = await axiosInstance.post(
      `${host}/wazuh-alerts*/_search`,
      {
        size: 0,
        query: {
          bool: {
            filter: [
              {
                range: {
                  "@timestamp": {
                    gte: "now-24h",
                    lt: "now",
                  },
                },
              },
            ],
          },
        },
        aggs: {
          severity_levels: {
            range: {
              field: "rule.level",
              ranges: [
                { key: "Minor", to: 10 },
                { key: "Major", from: 10, to: 13 },
                { key: "Critical", from: 13 },
              ],
            },
            aggs: {
              alerts_per_hour: {
                date_histogram: {
                  field: "@timestamp",
                  calendar_interval: "hour",
                  min_doc_count: 0,
                },
              },
            },
          },
        },
      },
      {
        headers: {
          Authorization: `Basic ${auth}`,
          Accept: "application/json",
        },
      }
    );

    const hourlyBuckets = res.data.aggregations.severity_levels.buckets;
    const hourlyAlertCounts = {};
    hourlyBuckets.forEach((severityBucket) => {
      const severityKey = severityBucket.key.toLowerCase(); // minor, major, critical
      hourlyAlertCounts[severityKey] =
        severityBucket.alerts_per_hour.buckets.map((bucket) => {
          const date = new Date(bucket.key_as_string);
          const hour = date.getUTCHours().toString(); // No zero padding as per example
          return {
            hour,
            count: bucket.doc_count,
          };
        });
    });
    return hourlyAlertCounts;
  } catch (err) {
    console.error("graph fetch error:", err.message);
    return {};
  }
}

// Cache refresh service removed - no caching in use
export const refreshCacheService = async (cacheKey) => {
  // No-op since caching is disabled
  return { cleared: 0, message: "Caching disabled - no cache to clear" };
};

/**
 * Get Wazuh rules from the Wazuh Manager API
 * Endpoint: GET {host}/rules
 * Supports filtering by rule_ids, level, group, filename, status, search, offset, limit
 */
export const getRulesService = async (wazuhCredentials, params = {}) => {
  const { host } = wazuhCredentials;

  return await withRetry(async () => {
    const token = await getWazuhToken(wazuhCredentials);
    const headers = { Authorization: `Bearer ${token}` };

    // Build query params — only include defined values
    const query = new URLSearchParams();
    if (params.rule_ids)  query.set('rule_ids', params.rule_ids);
    if (params.level !== undefined) query.set('level', params.level);
    if (params.group)     query.set('group', params.group);
    if (params.filename)  query.set('filename', params.filename);
    if (params.status)    query.set('status', params.status);
    if (params.search)    query.set('search', params.search);
    if (params.offset !== undefined) query.set('offset', params.offset);
    if (params.limit !== undefined)  query.set('limit', params.limit);

    const url = `${host}/rules${query.toString() ? `?${query.toString()}` : ''}`;
    console.log(`[i] Fetching Wazuh rules: ${url}`);

    const response = await axiosInstance.get(url, { headers });
    const { data } = response;

    if (data.error !== 0) {
      throw new Error(`Wazuh rules API error: ${data.message || 'Unknown error'}`);
    }

    console.log(`[✓] Rules fetched: ${data.data?.total_affected_items ?? 0} total`);
    return data.data;
  }, 'Wazuh getRules');
};

/**
 * Get Wazuh rule files (list of rule XML files on the manager)
 * Endpoint: GET {host}/rules/files
 */
export const getRuleFilesService = async (wazuhCredentials, params = {}) => {
  const { host } = wazuhCredentials;

  return await withRetry(async () => {
    const token = await getWazuhToken(wazuhCredentials);
    const headers = { Authorization: `Bearer ${token}` };

    const query = new URLSearchParams();
    if (params.offset !== undefined) query.set('offset', params.offset);
    if (params.limit !== undefined)  query.set('limit', params.limit);
    if (params.search)   query.set('search', params.search);
    if (params.status)   query.set('status', params.status);
    if (params.filename) query.set('filename', params.filename);

    const url = `${host}/rules/files${query.toString() ? `?${query.toString()}` : ''}`;
    console.log(`[i] Fetching Wazuh rule files: ${url}`);

    const response = await axiosInstance.get(url, { headers });
    const { data } = response;

    if (data.error !== 0) {
      throw new Error(`Wazuh rules/files API error: ${data.message || 'Unknown error'}`);
    }

    console.log(`[✓] Rule files fetched: ${data.data?.total_affected_items ?? 0} total`);
    return data.data;
  }, 'Wazuh getRuleFiles');
};

/**
 * Get Wazuh rule groups
 * Endpoint: GET {host}/rules/groups
 */
export const getRuleGroupsService = async (wazuhCredentials, params = {}) => {
  const { host } = wazuhCredentials;

  return await withRetry(async () => {
    const token = await getWazuhToken(wazuhCredentials);
    const headers = { Authorization: `Bearer ${token}` };

    const query = new URLSearchParams();
    if (params.offset !== undefined) query.set('offset', params.offset);
    if (params.limit !== undefined)  query.set('limit', params.limit);
    if (params.search)  query.set('search', params.search);

    const url = `${host}/rules/groups${query.toString() ? `?${query.toString()}` : ''}`;
    console.log(`[i] Fetching Wazuh rule groups: ${url}`);

    const response = await axiosInstance.get(url, { headers });
    const { data } = response;

    if (data.error !== 0) {
      throw new Error(`Wazuh rules/groups API error: ${data.message || 'Unknown error'}`);
    }

    console.log(`[✓] Rule groups fetched: ${data.data?.total_affected_items ?? 0} total`);
    return data.data;
  }, 'Wazuh getRuleGroups');
};

/**
 * Recursively converts a Wazuh JSON-object representation of XML back to an XML string.
 * Convention used by Wazuh:
 *   - Keys starting with "@" are XML attributes  (e.g. "@id" → id="…")
 *   - Key "#text" is the element's text content
 *   - All other keys are child elements (arrays → repeated siblings)
 */
function jsonObjToXml(obj, indent = '') {
  let result = '';

  for (const [key, rawValue] of Object.entries(obj)) {
    // Skip attribute and text-content markers — they're handled by the parent loop
    if (key.startsWith('@') || key === '#text') continue;

    const items = Array.isArray(rawValue) ? rawValue : [rawValue];

    for (const item of items) {
      if (typeof item === 'object' && item !== null) {
        // Collect attributes
        const attrStr = Object.entries(item)
          .filter(([k]) => k.startsWith('@'))
          .map(([k, v]) => ` ${k.slice(1)}="${v}"`)
          .join('');

        const textContent = item['#text'] !== undefined ? String(item['#text']) : null;
        const childKeys = Object.keys(item).filter(k => !k.startsWith('@') && k !== '#text');

        if (childKeys.length === 0 && textContent === null) {
          // Self-closing tag
          result += `${indent}<${key}${attrStr}/>\n`;
        } else if (childKeys.length === 0) {
          // Simple element with text content
          result += `${indent}<${key}${attrStr}>${textContent}</${key}>\n`;
        } else {
          // Element with child elements (and optional inline text)
          result += `${indent}<${key}${attrStr}>\n`;
          if (textContent !== null) {
            result += `${indent}  ${textContent}\n`;
          }
          const childObj = Object.fromEntries(
            Object.entries(item).filter(([k]) => !k.startsWith('@') && k !== '#text')
          );
          result += jsonObjToXml(childObj, indent + '  ');
          result += `${indent}</${key}>\n`;
        }
      } else {
        // Primitive value → simple element
        result += `${indent}<${key}>${item}</${key}>\n`;
      }
    }
  }

  return result;
}

/**
 * Get the raw XML content of a specific rule file
 * Endpoint: GET {host}/rules/files/{filename}
 * Wazuh returns a JSON envelope; affected_items[0] is the XML parsed as a JSON object.
 * We convert it back to a formatted XML string.
 */
export const getRuleFileContentService = async (wazuhCredentials, filename) => {
  const { host } = wazuhCredentials;

  return await withRetry(async () => {
    const token = await getWazuhToken(wazuhCredentials);

    const url = `${host}/rules/files/${encodeURIComponent(filename)}`;
    console.log(`[i] Fetching Wazuh rule file content: ${url}`);

    const response = await axiosInstance.get(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = response.data;

    if (data?.error !== 0) {
      throw new Error(`Wazuh rules/files API error: ${data?.message || 'Unknown error'}`);
    }

    const xmlObj = data?.data?.affected_items?.[0];
    if (!xmlObj) {
      throw new Error(`No content returned for rule file: ${filename}`);
    }

    // Convert the JSON object representation back to a formatted XML string
    const xmlString = jsonObjToXml(xmlObj, '');

    console.log(`[✓] Rule file content fetched and converted to XML: ${filename}`);
    return xmlString;
  }, `Wazuh getRuleFileContent(${filename})`);
};

/**
 * Create or overwrite a custom rule file on the Wazuh manager
 * Endpoint: PUT {host}/rules/files/{filename}
 * Body: raw XML string (saved to /var/ossec/etc/rules/{filename})
 */
export const saveRuleFileService = async (wazuhCredentials, filename, xmlContent) => {
  const { host } = wazuhCredentials;

  return await withRetry(async () => {
    const token = await getWazuhToken(wazuhCredentials);

    // overwrite=true is required by Wazuh when the file already exists.
    // Passing it unconditionally is safe — it is simply ignored for new files.
    const url = `${host}/rules/files/${encodeURIComponent(filename)}?overwrite=true`;
    console.log(`[i] Saving Wazuh rule file: ${url}`);

    const response = await axiosInstance.put(url, xmlContent, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/octet-stream',
      },
    });

    const { data } = response;

    if (data.error !== 0) {
      // Include detailed_error when available so the caller sees the exact XML parse issue
      const detail = data.data?.detail || data.data?.failed_items?.[0]?.error?.message || '';
      throw new Error(
        `Wazuh rules/files PUT error: ${data.message || 'Unknown error'}${detail ? ` — ${detail}` : ''}`
      );
    }

    console.log(`[✓] Rule file saved: ${filename}`);
    return data.data;
  }, `Wazuh saveRuleFile(${filename})`);
};

/**
 * Delete a custom rule file from the Wazuh manager
 * Endpoint: DELETE {host}/rules/files/{filename}
 */
export const deleteRuleFileService = async (wazuhCredentials, filename) => {
  const { host } = wazuhCredentials;

  return await withRetry(async () => {
    const token = await getWazuhToken(wazuhCredentials);

    const url = `${host}/rules/files/${encodeURIComponent(filename)}`;
    console.log(`[i] Deleting Wazuh rule file: ${url}`);

    const response = await axiosInstance.delete(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const { data } = response;

    if (data.error !== 0) {
      throw new Error(`Wazuh rules/files DELETE error: ${data.message || 'Unknown error'}`);
    }

    console.log(`[✓] Rule file deleted: ${filename}`);
    return data.data;
  }, `Wazuh deleteRuleFile(${filename})`);
};

// ─────────────────────────── CDB LIST (IOC List) ────────────────────────────

/**
 * Get CDB list files metadata
 * Endpoint: GET {host}/lists/files
 */
export const getCdbListFilesService = async (wazuhCredentials, { offset = 0, limit = 500, search, filename } = {}) => {
  const { host } = wazuhCredentials;

  return await withRetry(async () => {
    const token = await getWazuhToken(wazuhCredentials);

    const params = new URLSearchParams();
    params.append('offset', String(offset));
    params.append('limit', String(limit));
    if (search) params.append('search', search);
    if (filename) params.append('filename', filename);

    const url = `${host}/lists/files?${params.toString()}`;
    console.log(`[i] Fetching Wazuh CDB list files: ${url}`);

    const response = await axiosInstance.get(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = response.data;
    if (data?.error !== 0) {
      throw new Error(`Wazuh lists/files API error: ${data?.message || 'Unknown error'}`);
    }

    console.log('[✓] CDB list files fetched');
    return data.data;
  }, 'Wazuh getCdbListFiles');
};

/**
 * Get raw content of a CDB list file
 * Endpoint: GET {host}/lists/files/{filename}
 * Wazuh returns the raw key:value text in affected_items[0]
 */
export const getCdbListFileContentService = async (wazuhCredentials, filename) => {
  const { host } = wazuhCredentials;

  return await withRetry(async () => {
    const token = await getWazuhToken(wazuhCredentials);

    const url = `${host}/lists/files/${encodeURIComponent(filename)}`;
    console.log(`[i] Fetching Wazuh CDB list content: ${url}`);

    const response = await axiosInstance.get(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = response.data;
    if (data?.error !== 0) {
      throw new Error(`Wazuh lists/files content API error: ${data?.message || 'Unknown error'}`);
    }

    const content = data?.data?.affected_items?.[0];
    console.log(`[✓] CDB list content fetched: ${filename}`);

    if (typeof content === 'string') {
      return content;
    }

    // Wazuh returns the list as a JSON object { key: value, ... }
    // Convert it back to CDB plain-text format (one "key:value" per line)
    if (content && typeof content === 'object') {
      return Object.entries(content)
        .map(([k, v]) => (v ? `${k}:${v}` : `${k}:`))
        .join('\n');
    }

    return '';
  }, `Wazuh getCdbListFileContent(${filename})`);
};

/**
 * Create or overwrite a CDB list file
 * Endpoint: PUT {host}/lists/files/{filename}
 * Body: raw key:value text (one entry per line)
 */
/**
 * listPath is the full path string e.g. 'etc/lists/amazon'.
 * We strip the 'etc/lists/' prefix to get the subdirectory.
 */
export const saveCdbListFileService = async (wazuhCredentials, filename, content) => {
  const { host } = wazuhCredentials;

  return await withRetry(async () => {
    const token = await getWazuhToken(wazuhCredentials);

    const url = `${host}/lists/files/${encodeURIComponent(filename)}?overwrite=true`;
    console.log(`[i] Saving Wazuh CDB list file: ${url}`);

    const response = await axiosInstance.put(url, content, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/octet-stream',
      },
    });

    const { data } = response;
    if (data.error !== 0) {
      const detail = data.data?.detail || data.data?.failed_items?.[0]?.error?.message || '';
      throw new Error(
        `Wazuh lists/files PUT error: ${data.message || 'Unknown error'}${detail ? ` — ${detail}` : ''}`
      );
    }

    console.log(`[✓] CDB list file saved: ${filename}`);
    return data.data;
  }, `Wazuh saveCdbListFile(${filename})`);
};

/**
 * Delete a CDB list file
 * Endpoint: DELETE {host}/lists/files/{filename}
 */
export const deleteCdbListFileService = async (wazuhCredentials, filename) => {
  const { host } = wazuhCredentials;

  return await withRetry(async () => {
    const token = await getWazuhToken(wazuhCredentials);

    const url = `${host}/lists/files/${encodeURIComponent(filename)}`;
    console.log(`[i] Deleting Wazuh CDB list file: ${url}`);

    const response = await axiosInstance.delete(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const { data } = response;
    if (data.error !== 0) {
      throw new Error(`Wazuh lists/files DELETE error: ${data.message || 'Unknown error'}`);
    }

    console.log(`[✓] CDB list file deleted: ${filename}`);
    return data.data;
  }, `Wazuh deleteCdbListFile(${filename})`);
};
