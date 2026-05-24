const severityMeta = {
  low: {
    label: "Low risk",
    colorClass: "bg-emerald-400",
    badgeClass: "border-emerald-300/30 bg-emerald-400/10 text-emerald-100",
  },
  medium: {
    label: "Medium risk",
    colorClass: "bg-yellow-400",
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

function scoreSeverity(score) {
  if (score >= 85) return "low";
  if (score >= 70) return "medium";
  if (score >= 45) return "high";
  return "critical";
}

function countSeverity(count, total = 0) {
  if (count === 0) return "low";
  if (count >= Math.max(8, total * 0.25)) return "critical";
  if (count >= Math.max(4, total * 0.12)) return "high";
  return "medium";
}

function riskScanSeverity(label, count) {
  if (label === "critical" && count > 0) return "critical";
  if (label === "high" && count > 0) return "high";
  if (label === "medium" && count > 0) return "medium";
  return "low";
}

const dashboardInsights = {
  securityScore: {
    title: "Security Score Explained",
    severity: (summary) => scoreSeverity(summary.security_score),
    valueText: (summary) => `Your project security score is ${summary.security_score}/100.`,
    meaning: "This is a quick health score for your project dependencies. Higher means safer.",
    whyMatters: "A lower score means your dependency set has more serious or more frequent security issues that deserve attention before release.",
    beginnerExplanation: "Think of this like a health score for your project's dependencies. A higher score means fewer known cracks in the building blocks your app uses.",
    calculation: [
      "vulnerability severity",
      "number of risky packages",
      "outdated dependency versions",
      "supply-chain risk signals",
    ],
    improvementTips: [
      "Upgrade vulnerable packages",
      "Remove unused dependencies",
      "Use safer package versions",
      "Re-scan after every dependency update",
    ],
  },
  dependenciesScanned: {
    title: "Dependencies Scanned Explained",
    severity: "low",
    valueText: (summary) => `${summary.total_dependencies} dependencies have been scanned across ${summary.total_scans} scans.`,
    meaning: "This counts the dependency packages DependGuard found in your uploaded or repository manifests.",
    whyMatters: "More scanned dependencies means better visibility. Unscanned dependencies can hide vulnerabilities and license risks.",
    beginnerExplanation: "Dependencies are packages your app borrows. Scanning them is like checking every ingredient before cooking.",
    calculation: ["direct packages in requirements.txt", "package.json dependencies", "Pipfile packages", "Maven dependencies"],
    improvementTips: [
      "Scan every supported manifest in the project",
      "Keep manifest files complete and committed",
      "Scan after adding or removing packages",
    ],
  },
  vulnerabilitiesFound: {
    title: "Vulnerabilities Found Explained",
    severity: (summary) => countSeverity(summary.total_vulnerabilities, summary.total_dependencies),
    valueText: (summary) => `${summary.total_vulnerabilities} vulnerabilities were detected in your dependencies.`,
    meaning: "This is the total number of known vulnerability matches found during your scans.",
    whyMatters: "Some vulnerabilities may allow attackers to crash applications, steal data, bypass controls, or execute malicious code.",
    beginnerExplanation: "A vulnerability is a known weak spot. DependGuard is pointing out packages where security researchers have already found a problem.",
    calculation: ["OSV CVE matches", "affected package versions", "severity ratings", "scan history totals"],
    improvementTips: [
      "Fix critical and high vulnerabilities first",
      "Upgrade to the safe version shown in scan results",
      "Regenerate lock files after upgrades",
      "Remove packages you do not use",
    ],
  },
  criticalFindings: {
    title: "Critical Findings Explained",
    severity: (summary) => (summary.severity_totals.critical > 0 ? "critical" : "low"),
    valueText: (summary) => `${summary.severity_totals.critical} critical findings are currently visible in your scan history.`,
    meaning: "Critical findings are the highest urgency vulnerabilities and should be handled first.",
    whyMatters: "Critical issues are more likely to be exploitable or have severe impact if attackers can reach the vulnerable code path.",
    beginnerExplanation: "If vulnerabilities are warning lights, critical findings are the red flashing lights.",
    calculation: ["CVE severity", "CVSS score when available", "package version affected status"],
    improvementTips: [
      "Patch critical packages immediately",
      "Review release notes before upgrading major versions",
      "Deploy fixes quickly after tests pass",
    ],
  },
  criticalRiskScans: {
    title: "Critical Risk Scans Explained",
    severity: (summary) => riskScanSeverity("critical", summary.risk_distribution.critical),
    valueText: (summary) => `${summary.risk_distribution.critical} scans are classified as critical risk.`,
    meaning: "These scans have the highest overall risk score based on vulnerability severity and density.",
    whyMatters: "A critical risk scan usually means several serious issues are grouped in one manifest or one package is especially dangerous.",
    beginnerExplanation: "This means a dependency list needs urgent attention, like a project health check coming back red.",
    calculation: ["risk score of 75 or higher", "critical/high findings", "finding density in the manifest"],
    improvementTips: [
      "Open each critical scan result",
      "Upgrade critical packages first",
      "Generate the safer manifest and compare changes",
    ],
  },
  highRiskScans: {
    title: "High Risk Scans Explained",
    severity: (summary) => riskScanSeverity("high", summary.risk_distribution.high),
    valueText: (summary) => `${summary.risk_distribution.high} scans are classified as high risk.`,
    meaning: "High risk scans have serious dependency issues but may be less urgent than critical scans.",
    whyMatters: "High risk findings can still become real attack paths, especially in internet-facing apps.",
    beginnerExplanation: "This is a strong warning that some dependency building blocks should be replaced soon.",
    calculation: ["risk score from 50 to 74", "high severity findings", "package update availability"],
    improvementTips: [
      "Patch high severity findings after critical items",
      "Check whether fixes are minor or patch releases",
      "Re-scan after updating",
    ],
  },
  mediumRiskScans: {
    title: "Medium Risk Scans Explained",
    severity: (summary) => riskScanSeverity("medium", summary.risk_distribution.medium),
    valueText: (summary) => `${summary.risk_distribution.medium} scans are classified as medium risk.`,
    meaning: "Medium risk scans contain issues that should be planned into regular maintenance.",
    whyMatters: "Medium issues can become more serious when combined with other bugs or exposed features.",
    beginnerExplanation: "This is like a yellow traffic light: slow down, review it, and fix it before it piles up.",
    calculation: ["risk score from 25 to 49", "medium severity findings", "dependency count"],
    improvementTips: [
      "Schedule dependency updates",
      "Use automated dependency PRs",
      "Keep test coverage ready for upgrades",
    ],
  },
  lowRiskScans: {
    title: "Low Risk Scans Explained",
    severity: "low",
    valueText: (summary) => `${summary.risk_distribution.low} scans are classified as low risk.`,
    meaning: "Low risk scans have few or no detected security issues.",
    whyMatters: "Low risk is good, but it is still a snapshot in time. New vulnerabilities can appear later.",
    beginnerExplanation: "This means the dependency check looks healthy right now, but it still needs regular checkups.",
    calculation: ["risk score below 25", "low finding count", "low severity impact"],
    improvementTips: [
      "Keep scanning after package changes",
      "Avoid adding unmaintained packages",
      "Keep lock files fresh",
    ],
  },
};

export function getDashboardInsight(key, summary) {
  const insight = dashboardInsights[key];
  if (!insight) return null;

  const severity = typeof insight.severity === "function" ? insight.severity(summary) : insight.severity;

  return {
    ...insight,
    severity,
    severityMeta: severityMeta[severity],
    valueText: typeof insight.valueText === "function" ? insight.valueText(summary) : insight.valueText,
  };
}

export default dashboardInsights;
