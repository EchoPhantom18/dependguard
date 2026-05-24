import { AlertTriangle, ExternalLink, Gauge, PackageCheck, ScanSearch, ShieldCheck } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";

import { api } from "../api/client.js";
import DashboardInsightModal from "../components/DashboardInsightModal.jsx";
import EmptyState from "../components/EmptyState.jsx";
import MetricCard from "../components/MetricCard.jsx";
import SeverityBadge from "../components/SeverityBadge.jsx";
import { getDashboardInsight } from "../data/dashboardInsights.js";


const RECENT_SCAN_PREVIEW_LIMIT = 1;


const fallbackSummary = {
  security_score: 100,
  total_dependencies: 0,
  total_vulnerabilities: 0,
  total_scans: 0,
  severity_totals: { critical: 0, high: 0, medium: 0, low: 0 },
  risk_distribution: { critical: 0, high: 0, medium: 0, low: 0 },
  recent_scans: [],
};


export default function Dashboard() {
  const navigate = useNavigate();
  const [summary, setSummary] = useState(fallbackSummary);
  const [selectedInsight, setSelectedInsight] = useState(null);
  const [showAllRecentScans, setShowAllRecentScans] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/dashboard/summary")
      .then(({ data }) => setSummary(data))
      .finally(() => setLoading(false));
  }, []);

  const distribution = [
    { label: "Critical", value: summary.risk_distribution.critical, tone: "risk-critical", insightKey: "criticalRiskScans", indicator: "bg-rose-400" },
    { label: "High", value: summary.risk_distribution.high, tone: "risk-high", insightKey: "highRiskScans", indicator: "bg-orange-400" },
    { label: "Medium", value: summary.risk_distribution.medium, tone: "risk-medium", insightKey: "mediumRiskScans", indicator: "bg-yellow-400" },
    { label: "Low", value: summary.risk_distribution.low, tone: "risk-low", insightKey: "lowRiskScans", indicator: "bg-emerald-400" },
  ];

  function openInsight(key) {
    setSelectedInsight(getDashboardInsight(key, summary));
  }

  function openReport(scanId) {
    navigate(`/reports/${scanId}`);
  }

  const recentScans = summary.recent_scans || [];
  const visibleScans = showAllRecentScans
    ? recentScans
    : recentScans.slice(0, RECENT_SCAN_PREVIEW_LIMIT);
  const isRecentScansCollapsible = recentScans.length > RECENT_SCAN_PREVIEW_LIMIT;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="mt-1 text-sm text-slate-400">Live scan telemetry from your DependGuard workspace.</p>
        </div>
        <Link
          to="/new-scan"
          className="inline-flex w-fit items-center gap-2 rounded-lg bg-cyan-400 px-4 py-2.5 text-sm font-semibold text-slate-950 shadow-glow hover:bg-cyan-300"
        >
          <ScanSearch size={17} />
          New scan
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={ShieldCheck}
          label="Security Score"
          value={loading ? "..." : `${summary.security_score}/100`}
          detail="Higher is safer"
          tone="emerald"
          onClick={() => openInsight("securityScore")}
        />
        <MetricCard
          icon={PackageCheck}
          label="Dependencies Scanned"
          value={loading ? "..." : summary.total_dependencies}
          detail={`${summary.total_scans} total scans`}
          tone="cyan"
          onClick={() => openInsight("dependenciesScanned")}
        />
        <MetricCard
          icon={AlertTriangle}
          label="Vulnerabilities Found"
          value={loading ? "..." : summary.total_vulnerabilities}
          detail="OSV CVE findings"
          tone="rose"
          onClick={() => openInsight("vulnerabilitiesFound")}
        />
        <MetricCard
          icon={Gauge}
          label="Critical Findings"
          value={loading ? "..." : summary.severity_totals.critical}
          detail="Highest priority"
          tone="violet"
          onClick={() => openInsight("criticalFindings")}
        />
      </div>

      <section className="grid gap-4 xl:grid-cols-4">
        {distribution.map((item) => (
          <button
            key={item.label}
            type="button"
            onClick={() => openInsight(item.insightKey)}
            title="Click to learn more"
            className={`risk-card group relative rounded-lg border p-4 text-left ring-1 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-glow focus:outline-none focus:ring-2 focus:ring-cyan-300/40 ${item.tone}`}
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm">{item.label} Risk Scans</p>
              <span className={`h-2.5 w-2.5 rounded-full ${item.indicator} shadow-glow`} />
            </div>
            <p className="mt-3 text-3xl font-bold">{item.value}</p>
            <span className="pointer-events-none absolute bottom-4 right-4 rounded-full border border-cyan-300/20 bg-slate-950/90 px-2 py-1 text-[11px] font-semibold text-cyan-100 opacity-0 shadow-glow transition-opacity duration-200 group-hover:opacity-100">
              Click to learn more
            </span>
          </button>
        ))}
      </section>

      <section className="cyber-panel overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-white/10 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">Recent Scans</h2>
            {recentScans.length > 0 && (
              <p className="mt-1 text-sm text-slate-400">
                Showing {visibleScans.length} of {recentScans.length} scans
              </p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {isRecentScansCollapsible && (
              <button
                type="button"
                onClick={() => setShowAllRecentScans((current) => !current)}
                className="rounded-xl border border-cyan-300/25 bg-gradient-to-r from-cyan-400/15 to-violet-400/15 px-3 py-2 text-sm font-semibold text-cyan-100 shadow-glow transition-all duration-200 hover:-translate-y-0.5 hover:border-cyan-200/50 hover:from-cyan-400/25 hover:to-violet-400/25 hover:text-white"
              >
                {showAllRecentScans ? "Show less" : "View all"}
              </button>
            )}
            <Link to="/history" className="text-sm font-medium text-cyan-200 hover:text-cyan-100">
              View history
            </Link>
          </div>
        </div>
        {recentScans.length === 0 ? (
          <div className="p-5">
            <EmptyState title="No recent scans" />
          </div>
        ) : (
          <div
            className={[
              "relative overflow-hidden transition-all duration-300 ease-in-out",
              showAllRecentScans ? "max-h-[1600px]" : "max-h-[310px]",
            ].join(" ")}
          >
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="bg-white/[0.03] text-slate-400">
                  <tr>
                    <th className="px-5 py-3 font-medium">Manifest</th>
                    <th className="px-5 py-3 font-medium">Type</th>
                    <th className="px-5 py-3 font-medium">Dependencies</th>
                    <th className="px-5 py-3 font-medium">Vulnerabilities</th>
                    <th className="px-5 py-3 font-medium">Risk</th>
                    <th className="px-5 py-3 font-medium">Top severity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {visibleScans.map((scan) => {
                    const topSeverity =
                      scan.severity_counts.critical > 0
                        ? "critical"
                        : scan.severity_counts.high > 0
                          ? "high"
                          : scan.severity_counts.medium > 0
                            ? "medium"
                            : "low";

                    return (
                      <tr key={scan.id} className="hover:bg-white/[0.03]">
                        <td className="px-5 py-4">
                          <button
                            type="button"
                            onClick={() => openReport(scan.id)}
                            className="group inline-flex cursor-pointer items-center gap-2 font-medium text-white transition hover:text-cyan-200 hover:underline hover:underline-offset-4 hover:drop-shadow-[0_0_8px_rgba(34,211,238,0.45)]"
                            title="Open detailed report"
                          >
                            {scan.manifest_name}
                            <ExternalLink size={14} className="opacity-60 transition group-hover:translate-x-0.5 group-hover:opacity-100" />
                          </button>
                        </td>
                        <td className="px-5 py-4 text-slate-300">{scan.manifest_type}</td>
                        <td className="px-5 py-4 text-slate-300">{scan.total_dependencies}</td>
                        <td className="px-5 py-4 text-slate-300">{scan.vulnerability_count}</td>
                        <td className="px-5 py-4 text-slate-300">{scan.risk_score}/100</td>
                        <td className="px-5 py-4">
                          <SeverityBadge severity={topSeverity} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {!showAllRecentScans && isRecentScansCollapsible && (
              <div className="vulnerability-table-fade pointer-events-none absolute inset-x-0 bottom-0 h-20" />
            )}
          </div>
        )}
      </section>

      <DashboardInsightModal insight={selectedInsight} onClose={() => setSelectedInsight(null)} />
    </div>
  );
}
