const { execSync } = require('child_process');

const ALLOWED_IDS = new Set([
  'GHSA-2p57-rm9w-gvfp',
  'https://github.com/advisories/GHSA-2p57-rm9w-gvfp'
]);

const ALLOWED_PACKAGES = new Set([
  'ip',
  'ip-set',
  'load-ip-set',
  'bittorrent-tracker',
  'torrent-discovery',
  'webtorrent'
]);

const runAudit = () => {
  try {
    const output = execSync('npm audit --json', {
      stdio: ['ignore', 'pipe', 'inherit']
    }).toString();

    return JSON.parse(output);
  } catch (error) {
    if (error.stdout) {
      return JSON.parse(error.stdout.toString());
    }

    throw error;
  }
};

const collectIssues = (auditJson) => {
  const ids = new Set();

  if (!auditJson || typeof auditJson !== 'object') {
    return ids;
  }

  if (Array.isArray(auditJson.vulnerabilities)) {
    auditJson.vulnerabilities.forEach((item) => {
      if (item && item.id) {
        ids.add(item.id);
      }
    });
  }

  if (auditJson.vulnerabilities && typeof auditJson.vulnerabilities === 'object' && !Array.isArray(auditJson.vulnerabilities)) {
    Object.values(auditJson.vulnerabilities).forEach((vuln) => {
      const via = Array.isArray(vuln.via) ? vuln.via : [];

      via.forEach((entry) => {
        if (typeof entry === 'string') {
          ids.add(entry);
        } else if (entry && typeof entry === 'object') {
          ids.add(entry.id || entry.url || entry.name || entry.title);
        }
      });
    });
  }

  if (auditJson.advisories && typeof auditJson.advisories === 'object') {
    Object.values(auditJson.advisories).forEach((advisory) => {
      if (advisory && advisory.github_advisory_id) {
        ids.add(advisory.github_advisory_id);
      } else if (advisory && advisory.id) {
        ids.add(advisory.id);
      }
    });
  }

  return ids;
};

const isAllowed = (identifier) => {
  if (!identifier) {
    return false;
  }

  if (ALLOWED_IDS.has(identifier)) {
    return true;
  }

  return ALLOWED_PACKAGES.has(identifier.toString().toLowerCase());
};

const main = () => {
  const auditJson = runAudit();
  const identifiers = collectIssues(auditJson);

  const disallowed = Array.from(identifiers).filter((id) => !isAllowed(id));

  if (disallowed.length > 0) {
    console.error('\n❌ npm audit pronašao neočekivane ranjivosti:');
    disallowed.forEach((id) => console.error(`  - ${id}`));
    console.error('\nAžurirajte zavisnosti ili ažurirajte listu dozvoljenih advisories u scripts/check-audit.js');
    process.exit(1);
  }

  console.log('\n✅ npm audit – samo očekivane ranjivosti (ip-set chain).');
  process.exit(0);
};

main();
