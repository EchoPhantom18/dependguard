import "@xyflow/react/dist/style.css";

import { Background, Controls, ReactFlow } from "@xyflow/react";
import { ArrowLeft, Bot, FileText, GitBranch, ShieldAlert, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { api } from "../api/client.js";
import DashboardInsightModal from "../components/DashboardInsightModal.jsx";
import EmptyState from "../components/EmptyState.jsx";
import MetricCard from "../components/MetricCard.jsx";
import PDFReportButton from "../components/PDFReportButton.jsx";
import SeverityBadge from "../components/SeverityBadge.jsx";
import { getReportInsight } from "../data/reportInsights.js";


export default function ReportDetails() {
  const { scanId } = useParams();
  const navigate = useNavigate();
  const [report, setReport] = useState(null);
  const [selectedInsight, setSelectedInsight] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    setLoading(true);
    setMessage("");
    api
      .get(`/reports/${scanId}`)
      .then(({ data }) => setReport(data))
      .catch((error) => setMessage(error.response?.data?.message || "Unable to load report."))
      .finally(() => setLoading(false));
  }, [scanId]);

  if (loading) {
    return <div className="cyber-panel p-6 text-slate-300">Loading detailed report...</div>;
  }

  if (message) {
    return <EmptyState title={message} action={false} />;
  }

  if (!report) {
    return <EmptyState title="Report not found" action={false} />;
  }

  const { scan, vulnerability_summary: summary, license_analysis: licenses, supply_chain: supplyChain } = report;
  const graph = report.attack_graph;

  function openInsight(key) {
    setSelectedInsight(getReportInsight(key, report));
  }

  return (
    <div className="space-y-6">
      <nav className="flex flex-wrap items-center gap-2 text-sm text-slate-400">
        <Link to="/dashboard" className="hover:text-cyan-100">Dashboard</Link>
        <span>/</span>
        <Link to="/reports" className="hover:text-cyan-100">Reports</Link>
        <span>/</span>
        <span className="text-slate-200">{scan.manifest_name}</span>
      </nav>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">{scan.manifest_name}</h1>
          <p className="mt-1 text-sm text-slate-400">
            Scan date: {scan.created_at ? new Date(scan.created_at).toLocaleString() : "Not available"}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => navigate("/dashboard")}
            className="theme-button inline-flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-semibold hover:border-cyan-300/40 hover:text-cyan-200"
          >
            <ArrowLeft size={17} />
            Back to Dashboard
          </button>
          <PDFReportButton scanId={scanId} label="Download PDF" />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={ShieldCheck} label="Security Score" value={`${summary.security_score}/100`} detail="Higher is safer" tone="emerald" onClick={() => openInsight("securityScore")} />
        <MetricCard icon={ShieldAlert} label="Risk Score" value={`${summary.risk_score}/100`} detail={scan.manifest_type} tone="rose" onClick={() => openInsight("riskScore")} />
        <MetricCard icon={ShieldAlert} label="Vulnerabilities" value={summary.total} detail="Detected findings" tone="violet" onClick={() => openInsight("vulnerabilities")} />
        <MetricCard icon={ShieldCheck} label="Supply Chain Score" value={`${supplyChain.overall_score}/100`} detail={supplyChain.overall_risk_level} tone="cyan" onClick={() => openInsight("supplyChainScore")} />
      </div>

      <section className="grid gap-4 md:grid-cols-4">
        {["critical", "high", "medium", "low"].map((severity) => (
          <button
            key={severity}
            type="button"
            onClick={() => openInsight(severity)}
            title="Click to learn more"
            className={`risk-card group relative rounded-lg border p-4 text-left ring-1 transition-all duration-200 hover:-translate-y-0.5 hover:scale-[1.02] hover:shadow-glow focus:outline-none focus:ring-2 focus:ring-cyan-300/40 risk-${severity}`}
          >
            <p className="text-sm capitalize">{severity}</p>
            <p className="mt-3 text-3xl font-bold">{summary.severity_counts?.[severity] || 0}</p>
            <span className="pointer-events-none absolute bottom-4 right-4 rounded-full border border-cyan-300/20 bg-slate-950/90 px-2 py-1 text-[11px] font-semibold text-cyan-100 opacity-0 shadow-glow transition-opacity duration-200 group-hover:opacity-100">
              Click to learn more
            </span>
          </button>
        ))}
      </section>

      <section className="cyber-panel overflow-hidden">
        <div className="flex items-center gap-2 border-b border-white/10 px-5 py-4">
          <FileText size={18} className="text-cyan-200" />
          <h2 className="font-semibold text-white">Vulnerability Summary</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="bg-white/[0.03] text-slate-400">
              <tr>
                <th className="px-5 py-3 font-medium">Package</th>
                <th className="px-5 py-3 font-medium">Version</th>
                <th className="px-5 py-3 font-medium">Safe Version</th>
                <th className="px-5 py-3 font-medium">Severity</th>
                <th className="px-5 py-3 font-medium">CVE</th>
                <th className="px-5 py-3 font-medium">Fix</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {report.vulnerabilities.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-5 py-5 text-slate-300">No vulnerabilities were detected.</td>
                </tr>
              ) : (
                report.vulnerabilities.map((finding) => (
                  <tr key={finding.id} className="align-top hover:bg-white/[0.03]">
                    <td className="px-5 py-4 font-semibold text-white">{finding.package}</td>
                    <td className="px-5 py-4 text-slate-300">{finding.current_version}</td>
                    <td className="px-5 py-4 text-cyan-100">{finding.safe_version}</td>
                    <td className="px-5 py-4"><SeverityBadge severity={finding.severity} /></td>
                    <td className="px-5 py-4 text-slate-300">{finding.cve}</td>
                    <td className="px-5 py-4 text-slate-300">{finding.fix}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="cyber-panel overflow-hidden">
          <div className="border-b border-white/10 px-5 py-4">
            <h2 className="font-semibold text-white">Supply Chain Analysis</h2>
          </div>
          <div className="divide-y divide-white/10">
            {supplyChain.findings.slice(0, 8).map((item) => (
              <div key={`${item.package_name}-${item.version}`} className="px-5 py-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold text-white">{item.package_name}</p>
                  <span className="text-sm text-slate-300">{item.score}/100</span>
                </div>
                <p className="mt-1 text-xs uppercase tracking-wide text-cyan-100">{item.risk_level}</p>
                <ul className="mt-3 space-y-1 text-sm text-slate-300">
                  {item.reasons.slice(0, 3).map((reason) => (
                    <li key={reason}>{reason}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="cyber-panel overflow-hidden">
          <div className="border-b border-white/10 px-5 py-4">
            <h2 className="font-semibold text-white">License Risks</h2>
            <p className="mt-1 text-sm text-slate-400">{licenses.risky_count} of {licenses.total_dependencies} need review</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="bg-white/[0.03] text-slate-400">
                <tr>
                  <th className="px-5 py-3 font-medium">Package</th>
                  <th className="px-5 py-3 font-medium">License</th>
                  <th className="px-5 py-3 font-medium">Risk</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {licenses.findings.slice(0, 10).map((item) => (
                  <tr key={`${item.package_name}-${item.version}`} className="hover:bg-white/[0.03]">
                    <td className="px-5 py-4 font-semibold text-white">{item.package_name}</td>
                    <td className="px-5 py-4 text-slate-300">{item.license}</td>
                    <td className="px-5 py-4 text-slate-300">{item.risk_level}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {report.ai_explanations.length > 0 && (
        <section className="cyber-panel p-5">
          <div className="mb-4 flex items-center gap-2">
            <Bot size={18} className="text-cyan-200" />
            <h2 className="font-semibold text-white">AI Security Explanations</h2>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            {report.ai_explanations.slice(0, 6).map((item) => (
              <div key={`${item.package}-${item.cve}`} className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
                <h3 className="font-semibold text-white">{item.package} - {item.cve}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-300">{item.explanation.beginner_explanation}</p>
                <p className="mt-3 text-sm text-cyan-100">{item.explanation.how_to_fix}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="cyber-panel overflow-hidden">
          <div className="border-b border-white/10 px-5 py-4">
            <h2 className="font-semibold text-white">Safe Manifest</h2>
          </div>
          <pre className="code-pane max-h-[540px] min-h-[320px] rounded-none border-0 p-5 whitespace-pre-wrap">
            {report.safe_manifest || "No safe manifest generated."}
          </pre>
        </div>

        {graph?.nodes?.length > 0 && (
          <div className="cyber-panel overflow-hidden">
            <div className="flex items-center gap-2 border-b border-white/10 px-5 py-4">
              <GitBranch size={18} className="text-cyan-200" />
              <h2 className="font-semibold text-white">Dependency Graph</h2>
            </div>
            <div className="h-[540px] bg-slate-950/60">
              <ReactFlow
                className="dependguard-flow"
                nodes={graph.nodes}
                edges={graph.edges}
                fitView
                minZoom={0.25}
                proOptions={{ hideAttribution: true }}
              >
                <Controls className="dependguard-flow-controls" />
                <Background color="rgba(34, 211, 238, 0.22)" gap={24} />
              </ReactFlow>
            </div>
          </div>
        )}
      </section>

      <DashboardInsightModal insight={selectedInsight} onClose={() => setSelectedInsight(null)} />
    </div>
  );
}
