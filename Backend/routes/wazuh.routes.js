import express from 'express';
import { getAgentsBasic, getAgentsSummary, getAgentsStream, quarantineAgent, getQuarantineStatus } from '../controllers/agents.controller.js';
import { getAlerts, getAlertsCount, getAlertsStream, getTotalEventsCount, getTotalLogsCount, getEventsCountByAgent, getLogsCountByAgent, getAgentEvents, getAgentLogs, getTopRiskEntities } from '../controllers/alerts.controller.js';
import { getDashboardMetrics } from '../controllers/dashboardMetrics.controller.js';
import { getCompliance, getComplianceFramework } from '../controllers/compliance.controller.js';
import {
  getMitreGroups,
  getMitreMitigations,
  getMitreSoftware,
  getMitreTactics,
  getMitreTechniques,
  getMitreCoverage,
  getMitreStatistics
} from '../controllers/mitre.controller.js';
import { getRules, getRuleFiles, getRuleGroups, getRuleFileContent, saveRuleFile, deleteRuleFile } from '../controllers/rules.controller.js';
import { getCdbListFiles, getCdbListFileContent, saveCdbListFile, deleteCdbListFile } from '../controllers/iocList.controller.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';
import { organisationScope } from '../middlewares/organisationScope.middleware.js';
import { fetchClientCred } from '../middlewares/fetchClientCredentials.js';
import { rateLimiter } from '../middlewares/rateLimit.middleware.js';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);
router.use(organisationScope({}));
router.use(fetchClientCred);

// PATCH 15 (SECURITY): Test endpoint removed - use authenticated endpoints only
// If debugging is needed in development, check logs or use specific endpoints with valid auth

// Agents routes
router.get("/agents-basic", getAgentsBasic); // Fast endpoint - basic info only
router.get("/agents-summary", getAgentsSummary); // Slower endpoint - includes SCA/CIS/vulnerabilities
router.get("/agents-stream", getAgentsStream); // SSE endpoint - real-time streaming
router.put("/agent/quarantine", quarantineAgent);
router.get("/agent/:agentId/quarantine-status", getQuarantineStatus);

// Alerts routes
router.get("/alerts/stream", getAlertsStream);           // SSE stream — push notification when alert data changes
router.get("/alerts/count", getAlertsCount);             // Count endpoint (must be before /alerts route)
router.get("/alerts/total-count", getTotalEventsCount);  // Total events count (all events, no severity filter)
router.get("/alerts/count-by-agent", getEventsCountByAgent);  // Events count grouped by agent/machine
router.get("/alerts/top-risk-entities", getTopRiskEntities);  // Top 5 risk entities (hosts, users, processes) by critical alerts
router.get("/alerts", getAlerts);

// Logs routes
router.get("/logs/total-count", getTotalLogsCount);  // Total logs count from wazuh-archives-*
router.get("/logs/count-by-agent", getLogsCountByAgent);  // Logs count grouped by agent/machine

// Agent-specific events and logs routes
router.get("/agent/:agentId/events", getAgentEvents);  // Get events for a specific agent
router.get("/agent/:agentId/logs", getAgentLogs);  // Get logs for a specific agent

// Dashboard metrics routes
router.get("/dashboard-metrics", getDashboardMetrics);

// Compliance routes
router.get("/compliance", getCompliance);
router.get("/compliance/:framework", getComplianceFramework);

// Rules routes (must be before any :param routes)
router.get("/rules/files", getRuleFiles);                          // List rule XML files
router.get("/rules/files/:filename/content", getRuleFileContent);  // Raw XML content of a file
router.put("/rules/files/:filename", saveRuleFile);                // Create / overwrite a custom rule file
router.delete("/rules/files/:filename", deleteRuleFile);           // Delete a custom rule file
router.get("/rules/groups", getRuleGroups);                        // List rule groups
router.get("/rules", getRules);                                    // List rules with filters

// CDB List (IOC List) routes
router.get("/lists/files", getCdbListFiles);                           // List CDB list files
router.get("/lists/files/:filename/content", getCdbListFileContent);   // Get raw content of a CDB list file
router.put("/lists/files/:filename", saveCdbListFile);                 // Create / overwrite a CDB list file
router.delete("/lists/files/:filename", deleteCdbListFile);            // Delete a CDB list file

// MITRE ATT&CK routes
router.get("/mitre/groups", getMitreGroups);
router.get("/mitre/mitigations", getMitreMitigations);
router.get("/mitre/software", getMitreSoftware);
router.get("/mitre/tactics", getMitreTactics);
router.get("/mitre/techniques", getMitreTechniques);
router.get("/mitre/coverage", getMitreCoverage);
router.get("/mitre/statistics", getMitreStatistics);

export default router;