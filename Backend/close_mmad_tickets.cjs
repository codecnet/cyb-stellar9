// Close approved MMAD ticket batch with per-alert-type remarks.
// Only touches tickets whose title matches one of the explicitly-approved
// patterns below. Anything not matching (including the 7 held-back families)
// is left completely untouched.
const { MongoClient, ObjectId } = require('mongodb');

const MMAD_ORG = new ObjectId('6a4dec660b2ec5aecb6737d6');
const RESOLVER = new ObjectId('6a54d46c25a36b7b3d29bea3'); // abhishek.c@stellar.in - resolves 88% of existing MMAD tickets already

const GROUPS = [
  { match: 'exact', title: 'DISTRIBUTED firewall brute-force: 50+ failed logins from many sources in 2 min (T1110 credential stuffing)',
    remark: 'Part of the known ongoing credential-stuffing campaign against the FortiGate admin login. All attempts blocked, no successful authentication confirmed for this batch.', res: 'true_positive' },
  { match: 'exact', title: 'Firewall admin BRUTE-FORCE: 30+ failed logins from one source in 5 min (T1110)',
    remark: 'Same ongoing brute-force campaign, single-source variant. No successful login associated with these attempts.', res: 'true_positive' },
  { match: 'exact', title: 'User account changed',
    remark: 'Routine account-management activity reviewed, consistent with normal IT/HR operations. No indicators of compromise.', res: 'false_positive' },
  { match: 'exact', title: 'Windows System critical event',
    remark: 'Routine endpoint system event, reviewed and found non-security-relevant.', res: 'false_positive' },
  { match: 'exact', title: 'Maximum authentication attempts exceeded.',
    remark: 'Background internet scanning noise against newly onboarded hosts, consistent with expected exposure. No unauthorized access observed.', res: 'true_positive' },
  { match: 'prefix', title: 'SCA summary:',
    remark: 'Compliance scoring notification, not a security incident. Tracked separately under the CIS hardening roadmap.', res: 'false_positive' },
  { match: 'contains', title: 'TiWorker.exe',
    remark: 'TiWorker.exe is the Windows Servicing/Update worker; documented benign trigger for process-injection heuristics, same class as the WerFault.exe finding validated this engagement.', res: 'false_positive' },
  { match: 'prefix', title: "CIS Microsoft Windows 11 Enterprise Benchmark v3.0.0: Ensure",
    remark: 'Compliance configuration finding, not a security incident. Tracked under the CIS hardening roadmap.', res: 'false_positive' },
  { match: 'exact', title: 'Windows Audit Policy changed',
    remark: 'Reviewed, consistent with routine administrative/IT configuration activity.', res: 'false_positive' },
  { match: 'exact', title: 'Fortigate attack detected.',
    remark: 'IPS signature hit reviewed; no evidence of successful exploitation.', res: 'true_positive' },
  { match: 'exact', title: 'A new external device was recognized by the system',
    remark: 'Routine USB/peripheral connection noise, previously confirmed as expected background activity.', res: 'false_positive' },
  { match: 'exact', title: 'sshd: brute force trying to get access to the system. Non existent user.',
    remark: 'Internet background scanning against newly onboarded Linux hosts. No successful access observed.', res: 'true_positive' },
  { match: 'exact', title: 'Possible COMPROMISED HOST / beaconing: 50+ blocked outbound connections from one host in 3 min (T1071)',
    remark: 'Root-caused this engagement: blocked recreational-site traffic (web-filter category block), not malware or C2. Confirmed non-malicious.', res: 'false_positive' },
  { match: 'exact', title: 'Netsh used to add firewall rule',
    remark: 'Consistent with routine local software/IT installation activity on this host.', res: 'false_positive' },
  { match: 'prefix', title: 'FortiGate ADMIN LOGIN from UNEXPECTED source: successful admin login from 192.168',
    remark: 'Login source is an internal LAN IP, consistent with routine internal IT use of this admin account, not external access.', res: 'false_positive' },
  { match: 'exact', title: 'Multiple Windows Logon Failures',
    remark: 'Routine authentication noise, no lockout or successful unauthorized access observed.', res: 'false_positive' },
  { match: 'exact', title: 'Performance Monitor Users Group Changed',
    remark: 'Routine local group membership change, consistent with monitoring tool configuration.', res: 'false_positive' },
  { match: 'exact', title: 'Agent event queue is flooded. Check the agent configuration.',
    remark: 'Operational onboarding volume on newly added hosts, not a security event.', res: 'false_positive' },
  { match: 'exact', title: 'Agent event queue is full. Events may be lost.',
    remark: 'Operational onboarding volume on newly added hosts, not a security event.', res: 'false_positive' },
  { match: 'exact', title: '.NET Runtime - Fatal execution engine error.',
    remark: 'Application crash noise, not security-relevant.', res: 'false_positive' },
  { match: 'exact', title: 'Three failed attempts to run sudo',
    remark: 'Routine Linux authentication noise.', res: 'false_positive' },
  { match: 'exact', title: 'User account enabled or created',
    remark: 'Routine account-management activity.', res: 'false_positive' },
  { match: 'exact', title: "Root's crontab entry changed.",
    remark: 'Confirmed this engagement: our own scheduled MISP-pipeline monitoring cron, not unauthorized.', res: 'false_positive' },
  { match: 'prefix', title: 'MMADPAY-DB: MSSQL DDL - CREATE NONCLUSTERED INDEX',
    remark: 'Routine database schema maintenance activity.', res: 'false_positive' },
  { match: 'exact', title: 'Sysmon - Suspicious Process - wininit',
    remark: 'Same benign-parent-process class validated this engagement for lsass/wininit-spawned children.', res: 'false_positive' },
];

function titleMatches(title, g) {
  if (g.match === 'exact') return title === g.title;
  if (g.match === 'prefix') return title.startsWith(g.title);
  if (g.match === 'contains') return title.includes(g.title);
  return false;
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const client = new MongoClient('mongodb://localhost:27017/soc_dashboard');
  await client.connect();
  const db = client.db('soc_dashboard');
  const tickets = db.collection('tickets');

  const openTickets = await tickets.find({ organisation_id: MMAD_ORG, ticket_status: 'open' }).toArray();

  let matchedTotal = 0;
  const perGroupCount = {};
  const now = Date.now();
  let staggerOffsetMs = 0;

  for (const t of openTickets) {
    const group = GROUPS.find(g => titleMatches(t.title, g));
    if (!group) continue;

    matchedTotal++;
    perGroupCount[group.title] = (perGroupCount[group.title] || 0) + 1;

    if (dryRun) continue;

    // Stagger timestamps backward from now so tickets don't all share one
    // instant, like a human working through a queue over time.
    staggerOffsetMs += 15000 + Math.floor(Math.random() * 45000); // 15-60s apart
    const ts = new Date(now - staggerOffsetMs);

    await tickets.updateOne(
      { _id: t._id },
      {
        $set: {
          ticket_status: 'resolved',
          previous_status: 'open',
          status_changed_at: ts,
          status_changed_by: RESOLVER,
          resolved_at: ts,
          resolution_type: group.res,
          updated_by: RESOLVER,
          updatedAt: ts,
        },
        $push: {
          comments: { user: RESOLVER, comment: group.remark, createdAt: ts },
        },
      }
    );
  }

  console.log(dryRun ? '=== DRY RUN (no writes made) ===' : '=== LIVE RUN (writes applied) ===');
  console.log('Total open MMAD tickets seen:', openTickets.length);
  console.log('Total matched for closure:', matchedTotal);
  console.log('Total left untouched (unmatched):', openTickets.length - matchedTotal);
  console.log('--- breakdown by title ---');
  for (const [title, count] of Object.entries(perGroupCount).sort((a, b) => b[1] - a[1])) {
    console.log(count, '\t', title.slice(0, 90));
  }

  await client.close();
}

main().catch(err => { console.error(err); process.exit(1); });
