/**
 * Asset classification — type, criticality and data classification.
 *
 * BASIS
 *   RBI does not publish a fixed asset-criticality lookup. The Master Direction on
 *   Information Technology Governance, Risk, Controls and Assurance Practices
 *   (RBI/2023-24/107, effective 01-Apr-2024) and the Cyber Security Framework
 *   (DBS.CO/CSITE/BC.11/33.01.001/2015-16, Annex I) require the regulated entity to
 *   maintain an IT asset inventory and CLASSIFY assets by business criticality,
 *   identifying "critical systems". The mapping below implements that requirement
 *   using business impact (confidentiality / integrity / availability).
 *
 *   This scheme must be reviewed and signed off by the client as the regulated entity.
 *   Values set here apply ONLY when an asset is first created; any manual
 *   classification made later in the portal is preserved and never overwritten.
 *
 * TIERS
 *   critical - payment/customer-data systems and security infrastructure.
 *              Loss of C, I or A directly impacts customers, funds or regulatory standing.
 *   high     - production servers supporting business operations; privileged access hosts.
 *   medium   - standard user endpoints inside the payment environment.
 *   low      - non-production, test, and decommissioned assets.
 */

const SERVER_OS   = /(server|red hat|redhat|almalinux|rocky|centos|ubuntu|debian|linux|unix)/i;
const ENDPOINT_OS = /(windows (10|11|8|7)|macos|mac os|darwin)/i;

// name patterns, evaluated in order
const SECURITY_INFRA = /(firewall|fortigate|fortinet|palo ?alto|checkpoint|sophos|pritunl|vpn|ldap|radius|siem|wazuh|cyb-vmware|bastion)/i;
const PAYMENT_DATA   = /(mmadpay|payment|_db\b|database|\bdb\b|sql|oracle|mysql|postgres|redis|odin|xts|trade|tap_server|txn)/i;
const PRIV_ACCESS    = /(jump|jumpserver|bastion|admin|mgmt|manager|core|bootstrap|nfs|config)/i;
const NON_PROD       = /(^|[_\-.\s])(test|dev|staging|uat|sandbox|demo|poc|lab)([_\-.\s]|$)/i;

export function classifyAsset(input = {}) {
  const name = String(input.asset_name || input.wazuh_agent_name || '');
  const os   = String(input.operating_system || '');
  const agentId = String(input.wazuh_agent_id || '');

  // ---- asset_type ----
  let asset_type = 'endpoint';
  if (SECURITY_INFRA.test(name) && /firewall|fortigate|fortinet|palo|checkpoint|sophos/i.test(name)) {
    asset_type = 'security_device';
  } else if (PAYMENT_DATA.test(name) && /_db\b|database|\bdb\b|sql|oracle|mysql|postgres|redis/i.test(name)) {
    asset_type = 'database';
  } else if (SERVER_OS.test(os)) {
    asset_type = 'server';
  } else if (ENDPOINT_OS.test(os)) {
    asset_type = 'endpoint';
  }

  // ---- asset_criticality ----
  let asset_criticality;
  if (NON_PROD.test(name)) {
    asset_criticality = 'low';                       // non-production
  } else if (asset_type === 'security_device' || SECURITY_INFRA.test(name) || agentId === '000') {
    asset_criticality = 'critical';                  // security & monitoring infrastructure
  } else if (asset_type === 'database' || (asset_type === 'server' && PAYMENT_DATA.test(name))) {
    asset_criticality = 'critical';                  // payment / customer data systems
  } else if (asset_type === 'server' && PRIV_ACCESS.test(name)) {
    asset_criticality = 'high';                      // privileged access / core infrastructure
  } else if (asset_type === 'server') {
    asset_criticality = 'high';                      // other production servers
  } else {
    asset_criticality = 'medium';                    // standard user endpoints
  }

  // ---- data_classification ----
  let data_classification = 'internal';
  if (asset_criticality === 'critical') {
    data_classification = (asset_type === 'database' || PAYMENT_DATA.test(name)) ? 'restricted' : 'confidential';
  } else if (asset_criticality === 'high') {
    data_classification = 'confidential';
  }

  const environment = NON_PROD.test(name) ? 'non_production' : 'production';

  return { asset_type, asset_criticality, data_classification, environment };
}

