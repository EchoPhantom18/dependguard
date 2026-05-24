import { Scale } from "lucide-react";
import { useEffect, useState } from "react";

import { api } from "../api/client.js";
import EmptyState from "../components/EmptyState.jsx";


export default function LicenseCompliance() {
  const [scans, setScans] = useState([]);
  const [selectedScanId, setSelectedScanId] = useState("");
  const [result, setResult] = useState(null);
  const [message, setMessage] = useState("");
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
    api
      .post("/licenses/analyze", { scan_id: Number(selectedScanId) })
      .then(({ data }) => setResult(data))
      .catch((error) => setMessage(error.response?.data?.message || "Unable to analyze licenses."))
      .finally(() => setLoading(false));
  }, [selectedScanId]);

  if (scans.length === 0) {
    return <EmptyState title="Run a scan to analyze licenses" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">License Compliance Scanner</h1>
          <p className="mt-1 text-sm text-slate-400">Review GPL, AGPL, LGPL, unknown, and uncommon dependency licenses.</p>
        </div>
        <select className="form-field w-full px-3 py-2.5 text-sm sm:w-[320px]" value={selectedScanId} onChange={(event) => setSelectedScanId(event.target.value)}>
          {scans.map((scan) => (
            <option key={scan.id} value={scan.id}>
              #{scan.id} {scan.manifest_name}
            </option>
          ))}
        </select>
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="cyber-panel p-5">
          <p className="text-sm text-slate-400">Dependencies reviewed</p>
          <p className="mt-3 text-3xl font-bold text-white">{loading ? "..." : result?.total_dependencies ?? 0}</p>
        </div>
        <div className="cyber-panel p-5">
          <p className="text-sm text-slate-400">Needs review</p>
          <p className="mt-3 text-3xl font-bold text-white">{loading ? "..." : result?.risky_count ?? 0}</p>
        </div>
        <div className="cyber-panel p-5">
          <p className="text-sm text-slate-400">Policy</p>
          <p className="mt-3 text-lg font-semibold text-cyan-100">GPL/AGPL/LGPL flagged</p>
        </div>
      </section>

      {message && <div className="rounded-lg border border-rose-300/20 bg-rose-400/10 p-4 text-sm text-rose-100">{message}</div>}

      <section className="cyber-panel overflow-hidden">
        <div className="flex items-center gap-2 border-b border-white/10 px-5 py-4">
          <Scale size={18} className="text-cyan-200" />
          <h2 className="font-semibold text-white">License Table</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="bg-white/[0.03] text-slate-400">
              <tr>
                <th className="px-5 py-3 font-medium">Package</th>
                <th className="px-5 py-3 font-medium">Version</th>
                <th className="px-5 py-3 font-medium">License</th>
                <th className="px-5 py-3 font-medium">Risk</th>
                <th className="px-5 py-3 font-medium">Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {(result?.findings || []).map((item) => (
                <tr key={`${item.package_name}-${item.version}`} className="hover:bg-white/[0.03]">
                  <td className="px-5 py-4 font-semibold text-white">{item.package_name}</td>
                  <td className="px-5 py-4 text-slate-300">{item.version || "unknown"}</td>
                  <td className="px-5 py-4 text-slate-300">{item.license}</td>
                  <td className="px-5 py-4">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${item.risk_level === "safe" ? "bg-emerald-400/10 text-emerald-100" : "bg-amber-400/10 text-amber-100"}`}>
                      {item.risk_level}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-slate-300">{item.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
