import { ChevronDown, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";

import { api } from "../api/client.js";
import EmptyState from "../components/EmptyState.jsx";
import MetricCard from "../components/MetricCard.jsx";


const PACKAGE_PREVIEW_LIMIT = 3;
const REASON_PREVIEW_LIMIT = 3;


export default function SupplyChainScore() {
  const [scans, setScans] = useState([]);
  const [selectedScanId, setSelectedScanId] = useState("");
  const [result, setResult] = useState(null);
  const [message, setMessage] = useState("");
  const [showFullPackageTable, setShowFullPackageTable] = useState(false);
  const [expandedReasons, setExpandedReasons] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get("/scans/history").then(({ data }) => {
      setScans(data.scans);
      if (data.scans[0]) {
        setSelectedScanId(String(data.scans[0].id));
      }
    });
  }, []);

  useEffect(() => {
    if (!selectedScanId) return;
    setLoading(true);
    setMessage("");
    setShowFullPackageTable(false);
    setExpandedReasons({});
    api
      .post("/supply-chain/score", { scan_id: Number(selectedScanId) })
      .then(({ data }) => setResult(data))
      .catch((error) => setMessage(error.response?.data?.message || "Unable to calculate supply-chain score."))
      .finally(() => setLoading(false));
  }, [selectedScanId]);

  const packageRisks = result?.findings || [];
  const visiblePackageRisks = showFullPackageTable
    ? packageRisks
    : packageRisks.slice(0, PACKAGE_PREVIEW_LIMIT);
  const isPackageTableCollapsible = packageRisks.length > PACKAGE_PREVIEW_LIMIT;

  function toggleFullPackageTable() {
    setShowFullPackageTable((current) => !current);
  }

  function toggleReasons(packageName) {
    setExpandedReasons((current) => ({
      ...current,
      [packageName]: !current[packageName],
    }));
  }

  if (scans.length === 0) {
    return <EmptyState title="Run a scan to score supply-chain risk" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Supply Chain Risk Score</h1>
          <p className="mt-1 text-sm text-slate-400">Package-level scoring from CVEs, licenses, pinning, metadata, and typosquatting signals.</p>
        </div>
        <select className="form-field w-full px-3 py-2.5 text-sm sm:w-[320px]" value={selectedScanId} onChange={(event) => setSelectedScanId(event.target.value)}>
          {scans.map((scan) => (
            <option key={scan.id} value={scan.id}>
              #{scan.id} {scan.manifest_name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard icon={ShieldCheck} label="Overall Supply-Chain Score" value={loading ? "..." : `${result?.overall_score ?? 0}/100`} detail={result?.overall_risk_level || "low"} tone="cyan" />
        <MetricCard icon={ShieldCheck} label="Packages Scored" value={loading ? "..." : (result?.findings?.length ?? 0)} detail="Direct dependencies" tone="violet" />
        <MetricCard icon={ShieldCheck} label="High Risk Packages" value={loading ? "..." : (result?.findings || []).filter((item) => ["high", "critical"].includes(item.risk_level)).length} detail="Needs attention" tone="rose" />
      </div>

      {message && <div className="rounded-lg border border-rose-300/20 bg-rose-400/10 p-4 text-sm text-rose-100">{message}</div>}

      <section className="cyber-panel overflow-hidden">
        <div className="flex flex-col gap-2 border-b border-white/10 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="font-semibold text-white">Package Risk Details</h2>
          <p className="text-sm text-slate-400">
            Showing {visiblePackageRisks.length} of {packageRisks.length} packages
          </p>
        </div>
        <div
          className={[
            "relative overflow-hidden transition-all duration-300 ease-in-out",
            showFullPackageTable ? "max-h-[2000px]" : "max-h-[320px]",
          ].join(" ")}
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] text-left text-sm">
              <thead className="bg-white/[0.03] text-slate-400">
                <tr>
                  <th className="px-5 py-3 font-medium">Package</th>
                  <th className="px-5 py-3 font-medium">Version</th>
                  <th className="px-5 py-3 font-medium">Score</th>
                  <th className="px-5 py-3 font-medium">Risk</th>
                  <th className="px-5 py-3 font-medium">Reasons</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {visiblePackageRisks.map((item) => {
                  const packageKey = item.package_name;
                  const isReasonsExpanded = Boolean(expandedReasons[packageKey]);
                  const visibleReasons = isReasonsExpanded
                    ? item.reasons
                    : item.reasons.slice(0, REASON_PREVIEW_LIMIT);
                  const hasMoreReasons = item.reasons.length > REASON_PREVIEW_LIMIT;

                  return (
                    <tr key={`${item.package_name}-${item.version}`} className="align-top hover:bg-white/[0.03]">
                      <td className="px-5 py-4 font-semibold text-white">{item.package_name}</td>
                      <td className="px-5 py-4 text-slate-300">{item.version}</td>
                      <td className="px-5 py-4 text-slate-300">{item.score}/100</td>
                      <td className="px-5 py-4 text-slate-300">{item.risk_level}</td>
                      <td className="px-5 py-4 text-slate-300">
                        <p className="mb-2 text-xs text-slate-400">
                          Showing {visibleReasons.length} of {item.reasons.length} reasons
                        </p>
                        <ul className="space-y-1">
                          {visibleReasons.map((reason) => (
                            <li key={reason}>{reason}</li>
                          ))}
                        </ul>
                        {hasMoreReasons && (
                          <button
                            type="button"
                            onClick={() => toggleReasons(packageKey)}
                            className="mt-3 inline-flex items-center gap-1 rounded-lg border border-cyan-300/20 bg-cyan-400/10 px-2.5 py-1.5 text-xs font-semibold text-cyan-100 transition hover:border-cyan-200/40 hover:bg-cyan-400/20 hover:text-white"
                          >
                            {isReasonsExpanded ? "Hide reasons" : "Show all reasons"}
                            <ChevronDown
                              size={14}
                              className={[
                                "transition-transform duration-300 ease-in-out",
                                isReasonsExpanded ? "rotate-180" : "",
                              ].join(" ")}
                            />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {!showFullPackageTable && isPackageTableCollapsible && (
            <div className="vulnerability-table-fade pointer-events-none absolute inset-x-0 bottom-0 h-20" />
          )}
        </div>
        {isPackageTableCollapsible && (
          <div className="flex justify-center border-t border-white/10 px-5 py-4">
            <button
              type="button"
              onClick={toggleFullPackageTable}
              className="group inline-flex items-center gap-2 rounded-xl border border-cyan-300/25 bg-gradient-to-r from-cyan-400/15 to-violet-400/15 px-4 py-2.5 text-sm font-semibold text-cyan-100 shadow-glow transition-all duration-200 hover:-translate-y-0.5 hover:border-cyan-200/50 hover:from-cyan-400/25 hover:to-violet-400/25 hover:text-white"
            >
              {showFullPackageTable ? "Hide Package Risk Table" : "View Full Package Risk Table"}
              <ChevronDown
                size={17}
                className={[
                  "transition-transform duration-300 ease-in-out",
                  showFullPackageTable ? "rotate-180" : "",
                ].join(" ")}
              />
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
