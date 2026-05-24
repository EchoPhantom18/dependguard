import { AlertTriangle, ChevronDown, ChevronRight, PackageCheck, WandSparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { api } from "../api/client.js";
import EmptyState from "../components/EmptyState.jsx";
import InsightModal from "../components/InsightModal.jsx";
import MetricCard from "../components/MetricCard.jsx";
import PDFReportButton from "../components/PDFReportButton.jsx";
import RiskScoreExplanation from "../components/RiskScoreExplanation.jsx";
import SeverityBadge from "../components/SeverityBadge.jsx";
import VulnerabilityExplanation from "../components/VulnerabilityExplanation.jsx";
import { getScanResultInsight } from "../data/scanResultInsights.js";


const TABLE_PREVIEW_LIMIT = 3;


export default function ScanResults() {
  const { scanId } = useParams();
  const navigate = useNavigate();
  const [scan, setScan] = useState(null);
  const [expanded, setExpanded] = useState(null);
  const [showFullTable, setShowFullTable] = useState(false);
  const [selectedInsight, setSelectedInsight] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setExpanded(null);
    setShowFullTable(false);
    setSelectedInsight(null);
    api
      .get(`/scans/${scanId}`)
      .then(({ data }) => setScan(data.scan))
      .finally(() => setLoading(false));
  }, [scanId]);

  async function generateSafeManifest() {
    await api.post("/manifests/safe", { scan_id: scanId });
    navigate(`/safe-manifest/${scanId}`);
  }

  function toggleFullTable() {
    const nextShowFullTable = !showFullTable;
    setShowFullTable(nextShowFullTable);

    if (!nextShowFullTable && expanded) {
      const previewIds = new Set(scan.findings.slice(0, TABLE_PREVIEW_LIMIT).map((finding) => finding.id));
      if (!previewIds.has(expanded)) {
        setExpanded(null);
      }
    }
  }

  function openInsight(key) {
    setSelectedInsight(getScanResultInsight(key, scan));
  }

  if (loading) {
    return <div className="cyber-panel p-6 text-slate-300">Loading scan results...</div>;
  }

  if (!scan) {
    return <EmptyState title="Scan not found" />;
  }

  const visibleFindings = showFullTable
    ? scan.findings
    : scan.findings.slice(0, TABLE_PREVIEW_LIMIT);
  const isTableCollapsible = scan.findings.length > TABLE_PREVIEW_LIMIT;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Scan Results</h1>
          <p className="mt-1 text-sm text-slate-400">{scan.manifest_name}</p>
        </div>
        <button
          type="button"
          onClick={generateSafeManifest}
          className="inline-flex w-fit items-center gap-2 rounded-lg bg-cyan-400 px-4 py-2.5 text-sm font-semibold text-slate-950 shadow-glow hover:bg-cyan-300"
        >
          <WandSparkles size={17} />
          Generate safer manifest
        </button>
        <PDFReportButton scanId={scanId} />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <RiskScoreExplanation scan={scan} score={scan.risk_score} onClick={() => openInsight("riskScore")} />
        <MetricCard
          icon={PackageCheck}
          label="Dependencies"
          value={scan.total_dependencies}
          detail={scan.manifest_type}
          tone="cyan"
          onClick={() => openInsight("dependencies")}
        />
        <MetricCard
          icon={AlertTriangle}
          label="Vulnerabilities"
          value={scan.vulnerability_count}
          detail="OSV CVE matches"
          tone="violet"
          onClick={() => openInsight("vulnerabilities")}
        />
      </div>

      {scan.config?.warnings?.length > 0 && (
        <div className="rounded-lg border border-amber-300/25 bg-amber-400/10 p-4 text-sm text-amber-100">
          {scan.config.warnings.join(", ")}
        </div>
      )}

      {scan.findings.length === 0 ? (
        <EmptyState title="No vulnerabilities detected" action={false} />
      ) : (
        <section className="cyber-panel overflow-hidden">
          <div className="flex flex-col gap-2 border-b border-white/10 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-lg font-semibold text-white">Vulnerability Table</h2>
            <p className="text-sm text-slate-400">
              Showing {visibleFindings.length} of {scan.findings.length} vulnerabilities
            </p>
          </div>
          <div
            className={[
              "relative overflow-hidden transition-all duration-300 ease-in-out",
              showFullTable ? "max-h-[2000px]" : "max-h-[320px]",
            ].join(" ")}
          >
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-left text-sm">
                <thead className="bg-white/[0.03] text-slate-400">
                  <tr>
                    <th className="w-10 px-4 py-3" />
                    <th className="px-4 py-3 font-medium">Package</th>
                    <th className="px-4 py-3 font-medium">Version</th>
                    <th className="px-4 py-3 font-medium">Safe Version</th>
                    <th className="px-4 py-3 font-medium">Severity</th>
                    <th className="px-4 py-3 font-medium">CVE</th>
                    <th className="px-4 py-3 font-medium">Fix</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {visibleFindings.map((finding) => (
                    <tr key={finding.id} className="align-top hover:bg-white/[0.03]">
                      <td className="px-4 py-4">
                        <button
                          type="button"
                          onClick={() => setExpanded((current) => (current === finding.id ? null : finding.id))}
                          className="rounded-lg p-1 text-slate-300 hover:bg-white/10 hover:text-white"
                          title="Toggle details"
                        >
                          {expanded === finding.id ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        </button>
                      </td>
                      <td className="px-4 py-4 font-semibold text-white">{finding.package}</td>
                      <td className="px-4 py-4 text-slate-300">{finding.current_version}</td>
                      <td className="px-4 py-4 text-cyan-100">{finding.safe_version}</td>
                      <td className="px-4 py-4">
                        <SeverityBadge severity={finding.severity} />
                      </td>
                      <td className="px-4 py-4 text-slate-300">{finding.cve}</td>
                      <td className="px-4 py-4 text-slate-300">{finding.fix}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!showFullTable && isTableCollapsible && (
              <div className="vulnerability-table-fade pointer-events-none absolute inset-x-0 bottom-0 h-20" />
            )}
          </div>

          {isTableCollapsible && (
            <div className="flex justify-center border-t border-white/10 px-5 py-4">
              <button
                type="button"
                onClick={toggleFullTable}
                className="group inline-flex items-center gap-2 rounded-xl border border-cyan-300/25 bg-gradient-to-r from-cyan-400/15 to-violet-400/15 px-4 py-2.5 text-sm font-semibold text-cyan-100 shadow-glow transition-all duration-200 hover:-translate-y-0.5 hover:border-cyan-200/50 hover:from-cyan-400/25 hover:to-violet-400/25 hover:text-white"
              >
                {showFullTable ? "Hide Table" : "View Full Table"}
                <ChevronDown
                  size={17}
                  className={[
                    "transition-transform duration-300 ease-in-out",
                    showFullTable ? "rotate-180" : "",
                  ].join(" ")}
                />
              </button>
            </div>
          )}

          {expanded && (
            <div className="border-t border-white/10 bg-slate-950/60 p-5">
              {scan.findings
                .filter((finding) => finding.id === expanded)
                .map((finding) => (
                  <div key={finding.id}>
                    <h3 className="font-semibold text-white">{finding.summary}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-300">{finding.explanation}</p>
                    {finding.references?.length > 0 && (
                      <div className="mt-4 space-y-2">
                        <p className="text-sm font-semibold text-white">References</p>
                        {finding.references.slice(0, 5).map((reference) => (
                          <a
                            key={reference.url}
                            href={reference.url}
                            target="_blank"
                            rel="noreferrer"
                            className="block text-sm text-cyan-200 hover:text-cyan-100"
                          >
                            {reference.url}
                          </a>
                        ))}
                      </div>
                    )}
                    <VulnerabilityExplanation finding={finding} />
                  </div>
                ))}
            </div>
          )}
        </section>
      )}

      <div className="flex flex-wrap gap-3">
        <Link to="/reports" className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-white/10">
          Open reports
        </Link>
        <Link to={`/attack-graph/${scan.id}`} className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-white/10">
          Attack graph
        </Link>
        <Link to="/history" className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-white/10">
          Scan history
        </Link>
      </div>

      <InsightModal insight={selectedInsight} onClose={() => setSelectedInsight(null)} />
    </div>
  );
}
