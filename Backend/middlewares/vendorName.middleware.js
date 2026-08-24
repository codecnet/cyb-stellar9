/**
 * Vendor-name normalisation for API responses.
 *
 * The upstream SIEM reports agent versions as "Wazuh v4.14.5". The portal is
 * branded CYB, so that token is rewritten on the way out of the API. Applied
 * centrally because the version string is passed through by several endpoints
 * (agents summary, agents stream, reports) rather than one.
 *
 * Deliberately narrow: it only rewrites the exact token "Wazuh v" inside STRING
 * values of the JSON body. Object keys are never touched, so field names such as
 * wazuh_agent_id / wazuh_manager_ip - which the frontend and database depend on -
 * are unaffected. Plain string replace, no regex.
 */
const FROM = "Wazuh v";
const TO = "CYB v";
const MAX_DEPTH = 12;

function scrub(node, depth) {
  if (node === null || typeof node !== "object" || depth > MAX_DEPTH) return;
  if (Array.isArray(node)) {
    for (let i = 0; i < node.length; i++) {
      const v = node[i];
      if (typeof v === "string") {
        if (v.indexOf(FROM) !== -1) node[i] = v.split(FROM).join(TO);
      } else if (v && typeof v === "object") scrub(v, depth + 1);
    }
    return;
  }
  for (const k of Object.keys(node)) {
    const v = node[k];
    if (typeof v === "string") {
      if (v.indexOf(FROM) !== -1) node[k] = v.split(FROM).join(TO);
    } else if (v && typeof v === "object") scrub(v, depth + 1);
  }
}

export function vendorNameMiddleware(req, res, next) {
  const originalJson = res.json.bind(res);
  res.json = function (body) {
    try { scrub(body, 0); } catch (e) { /* never block a response on branding */ }
    return originalJson(body);
  };
  next();
}

export { scrub as _scrubForTest };
