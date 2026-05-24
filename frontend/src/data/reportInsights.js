const severityMeta = {
  low: {
    label: "Low risk",
    colorClass: "bg-emerald-400",
    badgeClass: "border-emerald-300/30 bg-emerald-400/10 text-emerald-100",
  },
  medium: {
    label: "Medium risk",
    colorClass: "bg-amber-400",
    badgeClass: "border-amber-300/30 bg-amber-400/10 text-amber-100",
  },
  high: {
    label: "High risk",
    colorClass: "bg-orange-400",
    badgeClass: "border-orange-300/30 bg-orange-400/10 text-orange-100",
  },
  critical: {
    label: "Critical risk",
    colorClass: "bg-rose-400",
    badgeClass: "border-rose-300/30 bg-rose-400/10 text-rose-100",
  },
};

function securityScoreSeverity(score) {
  if (score >= 85) return "low";
  if (score >= 70) return "medium";
  if (score >= 45) return "high";
  return "critical";
}

function riskScoreSeverity(score) {
  if (score >= 75) return "critical";
  if (score >= 50) return "high";
  if (score >= 25) return "medium";
  return "low";
}

function vulnerabilityCountSeverity(count) {
  if (count === 0) return "low";
  if (count >= 10) return "critical";
  if (count >= 5) return "high";
  return "medium";
}

const severityGuidance = {
  critical: {
    title: "Critical Findings Explained",
    meaning: "Critical vulnerabilities need immediate attention because they may have severe impact or easier exploit paths.",
    beginner: "Critical is the red alert category. Fix these before anything else.",
    improve: ["Patch immediately", "Deploy the safe manifest after testing", "Review whether exposed services use this package"],
  },
  high: {
    title: "High Findings Explained",
    meaning: "High vulnerabilities should be fixed as soon as possible because they can create serious security problems.",
    beginner: "High risk means this package is unsafe enough that you should not ignore it.",
    improve: ["Upgrade high-risk packages quickly", "Check if the vulnerable code path is used", "Re-scan after updating"],
  },
  medium: {
    title: "Medium Findings Explained",
    meaning: "Medium vulnerabilities should be fixed soon, especially if the package is used in sensitive areas.",
    beginner: "Medium is a warning sign. It may not be urgent today, but it should go into your next cleanup cycle.",
    improve: ["Plan dependency updates", "Bundle medium fixes into maintenance work", "Keep tests ready for package upgrades"],
  },
  low: {
    title: "Low Findings Explained",
    meaning: "Low vulnerabilities are lower priority, but they are still worth reviewing and tracking.",
    beginner: "Low risk is like a small maintenance issue. It is not the loudest alert, but it should not be forgotten.",
    improve: ["Review low findings during regular maintenance", "Keep dependencies fresh", "Avoid letting small issues pile up"],
  },
};

const reportInsights = {
  securityScore: {
    title: "Security Score Explained",
    severity: (report) => securityScoreSeverity(report.vulnerability_summary.security_score),
    valueText: (report) => `Security Score means how safe this scanned manifest is. This report scored ${report.vulnerability_summary.security_score}/100. Higher score is better.`,
    whyMatters: "A low security score means the manifest contains more serious dependency risks and needs fixes before it is trusted in production.",
    beginnerExplanation: "Think of this like a safety grade for this one manifest. A higher score means fewer known problems in the packages it uses.",
    calculation: ["risk score", "vulnerability severity", "number of findings", "safe version availability"],
    improvementTips: ["Upgrade vulnerable packages", "Use the generated safe manifest", "Remove unused dependencies", "Re-run the scan after changes"],
  },
  riskScore: {
    title: "Risk Score Explained",
    severity: (report) => riskScoreSeverity(report.vulnerability_summary.risk_score),
    valueText: (report) => `Risk Score means how dangerous the detected vulnerabilities are. This report has a risk score of ${report.vulnerability_summary.risk_score}/100.`,
    whyMatters: "Higher risk score means more security problems, more severe findings, or a higher concentration of vulnerable dependencies.",
    beginnerExplanation: "If Security Score is the health score, Risk Score is the danger meter. Lower is better.",
    calculation: ["critical findings", "high findings", "CVSS scores when available", "finding density"],
    improvementTips: ["Fix critical and high findings first", "Upgrade to safe versions", "Prefer maintained packages", "Reduce unnecessary dependencies"],
  },
  vulnerabilities: {
    title: "Vulnerabilities Explained",
    severity: (report) => vulnerabilityCountSeverity(report.vulnerability_summary.total),
    valueText: (report) => `${report.vulnerability_summary.total} security issues were found in this manifest's dependencies.`,
    whyMatters: "Vulnerabilities can allow attackers to crash applications, steal data, bypass protections, or execute malicious code.",
    beginnerExplanation: "A vulnerability is a known weak spot in a package. This number tells you how many weak spots DependGuard found.",
    calculation: ["OSV matches", "package name", "installed version", "affected version ranges"],
    improvementTips: ["Open the vulnerability table", "Patch packages with safe versions", "Read AI explanations for unclear findings", "Scan again after fixing"],
  },
  supplyChainScore: {
    title: "Supply Chain Score Explained",
    severity: (report) => riskScoreSeverity(report.supply_chain.overall_score),
    valueText: (report) => `Supply Chain Score measures package health, license risk, dependency safety, and maintenance risk. This score is ${report.supply_chain.overall_score}/100.`,
    whyMatters: "Supply-chain risk can come from more than CVEs: abandoned packages, risky licenses, typosquatting, and unpinned versions can all create exposure.",
    beginnerExplanation: "This checks whether the packages look trustworthy and maintainable, not just whether they have known CVEs.",
    calculation: ["CVE severity", "license risk", "version pinning", "maintainer/activity fallback signals", "typosquatting suspicion"],
    improvementTips: ["Replace unmaintained packages", "Review risky licenses", "Pin dependency versions", "Avoid suspicious package names"],
  },
};

export function getReportInsight(key, report) {
  if (["critical", "high", "medium", "low"].includes(key)) {
    const guidance = severityGuidance[key];
    const count = report.vulnerability_summary.severity_counts?.[key] || 0;
    return {
      title: guidance.title,
      severity: key,
      severityMeta: severityMeta[key],
      valueText: `${count} ${key} severity findings were found in this report.`,
      whyMatters: guidance.meaning,
      beginnerExplanation: guidance.beginner,
      calculation: ["OSV advisory severity", "CVSS score when available", "affected package version", "DependGuard severity normalization"],
      improvementTips: guidance.improve,
    };
  }

  const insight = reportInsights[key];
  if (!insight) return null;
  const severity = typeof insight.severity === "function" ? insight.severity(report) : insight.severity;

  return {
    ...insight,
    severity,
    severityMeta: severityMeta[severity],
    valueText: typeof insight.valueText === "function" ? insight.valueText(report) : insight.valueText,
  };
}

export default reportInsights;
