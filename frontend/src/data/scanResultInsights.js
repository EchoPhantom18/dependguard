import { getRiskLevel, getRiskReasons } from "../utils/riskScore.js";


const severityMeta = {
  safe: {
    label: "Safe",
    colorClass: "bg-emerald-400",
    badgeClass: "border-emerald-300/30 bg-emerald-400/10 text-emerald-100",
  },
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


function vulnerabilitySeverity(count, totalDependencies) {
  if (count === 0) return "low";
  if (count >= Math.max(8, totalDependencies * 0.25)) return "critical";
  if (count >= Math.max(4, totalDependencies * 0.12)) return "high";
  return "medium";
}


const scanResultInsights = {
  riskScore: {
    title: "Risk Score Explained",
    severity: (scan) => getRiskLevel(scan.risk_score || 0).key,
    valueText: (scan) => {
      const riskLevel = getRiskLevel(scan.risk_score || 0);
      return `This scan scored ${scan.risk_score}/100, which DependGuard classifies as ${riskLevel.label}. ${riskLevel.shortExplanation}`;
    },
    whyMatters: (scan) => {
      const riskLevel = getRiskLevel(scan.risk_score || 0);
      return `${riskLevel.analogy} A higher score means your manifest has more security exposure from vulnerable packages, severe CVEs, or fixes that have not been applied yet.`;
    },
    beginnerExplanation: (scan) => {
      const riskLevel = getRiskLevel(scan.risk_score || 0);
      return `Imagine your dependencies are doors into your application. The Risk Score tells you how many doors look weak and how serious those weak spots are. ${riskLevel.label} means: ${riskLevel.shortExplanation}`;
    },
    calculation: (scan) => [
      ...getRiskReasons(scan),
      "Severity matters: critical and high findings push the score up faster",
      "Safer versions lower risk after you upgrade and re-scan",
    ],
    improvementTips: (scan) => {
      const riskLevel = getRiskLevel(scan.risk_score || 0);
      if (riskLevel.key === "safe") {
        return [
          "Keep scanning after dependency changes",
          "Avoid adding unmaintained packages",
          "Keep package versions pinned and reviewed",
        ];
      }
      return [
        "Fix critical and high vulnerabilities first",
        "Generate the safer manifest and review version upgrades",
        "Remove dependencies your project no longer uses",
        "Re-run the scan after updating packages",
      ];
    },
  },
  dependencies: {
    title: "Dependencies Explained",
    severity: "low",
    valueText: (scan) =>
      `${scan.total_dependencies} packages were detected in your uploaded ${scan.manifest_type} manifest file.`,
    whyMatters:
      "Every dependency is third-party code your project relies on. More dependencies can mean more maintenance work and more places where vulnerabilities may appear later.",
    beginnerExplanation:
      "Dependencies are the packages your app borrows instead of writing everything from scratch. DependGuard counts them so you know what is being checked.",
    calculation: [
      "direct packages listed in the uploaded manifest",
      "supported manifest syntax such as requirements.txt and package.json",
      "dependency names and pinned versions when available",
    ],
    improvementTips: [
      "Keep manifest files complete and current",
      "Remove packages you do not actually use",
      "Prefer maintained packages with clear version pins",
      "Scan every manifest in the project",
    ],
  },
  vulnerabilities: {
    title: "Vulnerabilities Explained",
    severity: (scan) =>
      vulnerabilitySeverity(scan.vulnerability_count || 0, scan.total_dependencies || 0),
    valueText: (scan) =>
      `${scan.vulnerability_count} real OSV CVE matches were found in your dependencies.`,
    whyMatters:
      "Vulnerabilities can let attackers crash applications, steal data, bypass security controls, or execute malicious code depending on the package and how it is used.",
    beginnerExplanation:
      "A vulnerability is a known weak spot in a package version. This number tells you how many known weak spots matched your dependency list.",
    calculation: [
      "package name and installed version",
      "OSV advisory matches",
      "affected version ranges",
      "normalized severity for each finding",
    ],
    improvementTips: [
      "Open the vulnerability table and start with the highest severity rows",
      "Upgrade to the safe version shown by DependGuard",
      "Read the explanation panel for unclear CVEs",
      "Re-scan after fixing to confirm the count drops",
    ],
  },
};


export function getScanResultInsight(key, scan) {
  const insight = scanResultInsights[key];
  if (!insight) return null;

  const severity = typeof insight.severity === "function" ? insight.severity(scan) : insight.severity;

  return {
    ...insight,
    severity,
    severityMeta: severityMeta[severity],
    valueText: typeof insight.valueText === "function" ? insight.valueText(scan) : insight.valueText,
    whyMatters: typeof insight.whyMatters === "function" ? insight.whyMatters(scan) : insight.whyMatters,
    beginnerExplanation:
      typeof insight.beginnerExplanation === "function"
        ? insight.beginnerExplanation(scan)
        : insight.beginnerExplanation,
    calculation: typeof insight.calculation === "function" ? insight.calculation(scan) : insight.calculation,
    improvementTips:
      typeof insight.improvementTips === "function" ? insight.improvementTips(scan) : insight.improvementTips,
  };
}


export default scanResultInsights;
