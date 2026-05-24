export function getRiskLevel(score) {
  const normalizedScore = clampRiskScore(score);

  if (normalizedScore <= 20) {
    return {
      key: "safe",
      label: "Safe",
      badgeClass: "border-emerald-300/30 bg-emerald-400/10 text-emerald-100",
      colorClass: "bg-emerald-400",
      progressClass: "bg-gradient-to-r from-emerald-400 to-cyan-300",
      textClass: "text-emerald-200",
      shortExplanation: "Your dependency list looks healthy with very low detected security exposure.",
      analogy: "Think of this like a clean safety inspection: keep checking regularly, but there are no loud alarms right now.",
    };
  }

  if (normalizedScore <= 40) {
    return {
      key: "low",
      label: "Low Risk",
      badgeClass: "border-cyan-300/30 bg-cyan-400/10 text-cyan-100",
      colorClass: "bg-cyan-400",
      progressClass: "bg-gradient-to-r from-cyan-400 to-emerald-300",
      textClass: "text-cyan-200",
      shortExplanation: "Your dependencies are mostly safe, but some packages may need updates.",
      analogy: "This is like a house with a few loose locks. It is not an emergency, but it is worth tightening them.",
    };
  }

  if (normalizedScore <= 60) {
    return {
      key: "medium",
      label: "Medium Risk",
      badgeClass: "border-amber-300/30 bg-amber-400/10 text-amber-100",
      colorClass: "bg-amber-400",
      progressClass: "bg-gradient-to-r from-yellow-400 to-amber-400",
      textClass: "text-amber-200",
      shortExplanation: "Some dependencies need attention soon because known security issues were found.",
      analogy: "This is like a yellow warning light on a dashboard. You can keep moving, but you should schedule a fix.",
    };
  }

  if (normalizedScore <= 80) {
    return {
      key: "high",
      label: "High Risk",
      badgeClass: "border-orange-300/30 bg-orange-400/10 text-orange-100",
      colorClass: "bg-orange-400",
      progressClass: "bg-gradient-to-r from-orange-400 to-rose-400",
      textClass: "text-orange-200",
      shortExplanation: "Several risky dependencies were found and should be upgraded before production use.",
      analogy: "This is like finding multiple unlocked doors. Attackers may not get in today, but the exposure is real.",
    };
  }

  return {
    key: "critical",
    label: "Critical",
    badgeClass: "border-rose-300/30 bg-rose-400/10 text-rose-100",
    colorClass: "bg-rose-400",
    progressClass: "bg-gradient-to-r from-rose-500 to-red-400",
    textClass: "text-rose-200",
    shortExplanation: "This scan found serious dependency risk that needs immediate attention.",
    analogy: "This is the red alarm state. Treat it like a security door left open in a public place.",
  };
}


export function getRiskReasons(scan = {}) {
  const findings = scan.findings || [];
  const severityCounts = scan.severity_counts || {};
  const vulnerabilityCount = scan.vulnerability_count ?? findings.length;
  const safeVersionCount = findings.filter(
    (finding) => finding.safe_version && finding.safe_version !== finding.current_version,
  ).length;
  const reasons = [];

  if (vulnerabilityCount > 0) {
    reasons.push(`${vulnerabilityCount} vulnerable package match${vulnerabilityCount === 1 ? "" : "es"} detected`);
  } else {
    reasons.push("No vulnerable packages were detected in this scan");
  }

  if ((severityCounts.critical || 0) > 0 || (severityCounts.high || 0) > 0) {
    reasons.push("Critical or high severity findings increase the risk score");
  } else if ((severityCounts.medium || 0) > 0) {
    reasons.push("Medium severity findings add moderate risk");
  }

  if (safeVersionCount > 0) {
    reasons.push(`${safeVersionCount} safer package version${safeVersionCount === 1 ? " is" : "s are"} available`);
  }

  if (scan.total_dependencies > 0) {
    reasons.push(`${scan.total_dependencies} dependencies were checked for known OSV advisories`);
  }

  if (scan.config?.warnings?.length > 0) {
    reasons.push("Some live vulnerability lookups returned warnings");
  }

  return reasons.slice(0, 4);
}


function clampRiskScore(score) {
  const numericScore = Number(score);
  if (Number.isNaN(numericScore)) return 0;
  return Math.min(100, Math.max(0, Math.round(numericScore)));
}
