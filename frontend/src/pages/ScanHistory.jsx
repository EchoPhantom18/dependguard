import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, Eye, History, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { api } from "../api/client.js";
import EmptyState from "../components/EmptyState.jsx";
import SeverityBadge from "../components/SeverityBadge.jsx";


export default function ScanHistory() {
  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    api
      .get("/scans/history")
      .then(({ data }) => setScans(data.scans))
      .finally(() => setLoading(false));
  }, []);

  async function deleteScan(scanId) {
    await api.delete(`/history/${scanId}`);
    setScans((current) => current.filter((scan) => scan.id !== scanId));
  }

  async function clearAllHistory() {
    await api.delete("/history");
    setScans([]);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);

    try {
      if (deleteTarget.mode === "all") {
        await clearAllHistory();
      } else {
        await deleteScan(deleteTarget.scan.id);
      }

      setDeleteTarget(null);
      showToast("success", "Scan history deleted successfully.");
    } catch (error) {
      showToast("error", error.response?.data?.message || "Unable to delete scan history.");
    } finally {
      setDeleting(false);
    }
  }

  function showToast(type, message) {
    setToast({ type, message });
    setTimeout(() => setToast(null), 2400);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Scan History</h1>
          <p className="mt-1 text-sm text-slate-400">Saved scans from your DependGuard database.</p>
        </div>

        {scans.length > 0 && (
          <button
            type="button"
            onClick={() => setDeleteTarget({ mode: "all" })}
            className="inline-flex w-fit items-center gap-2 rounded-lg border border-rose-300/25 bg-rose-400/10 px-4 py-2.5 text-sm font-semibold text-rose-100 transition hover:border-rose-200/45 hover:bg-rose-400/20"
          >
            <Trash2 size={17} />
            Clear all history
          </button>
        )}
      </div>

      {loading ? (
        <div className="cyber-panel p-6 text-slate-300">Loading scan history...</div>
      ) : scans.length === 0 ? (
        <EmptyState title="No scan history yet" />
      ) : (
        <section className="cyber-panel overflow-hidden">
          <div className="flex items-center gap-2 border-b border-white/10 px-5 py-4">
            <History size={18} className="text-cyan-200" />
            <h2 className="font-semibold text-white">All Scans</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] text-left text-sm">
              <thead className="bg-white/[0.03] text-slate-400">
                <tr>
                  <th className="px-5 py-3 font-medium">Manifest</th>
                  <th className="px-5 py-3 font-medium">Type</th>
                  <th className="px-5 py-3 font-medium">Dependencies</th>
                  <th className="px-5 py-3 font-medium">Vulnerabilities</th>
                  <th className="px-5 py-3 font-medium">Risk</th>
                  <th className="px-5 py-3 font-medium">Severity</th>
                  <th className="px-5 py-3 font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {scans.map((scan) => {
                  const severityCounts = scan.severity_counts || {};
                  const severity =
                    severityCounts.critical > 0
                      ? "critical"
                      : severityCounts.high > 0
                        ? "high"
                        : severityCounts.medium > 0
                          ? "medium"
                          : "low";

                  return (
                    <tr key={scan.id} className="hover:bg-white/[0.03]">
                      <td className="px-5 py-4 font-semibold text-white">{scan.manifest_name}</td>
                      <td className="px-5 py-4 text-slate-300">{scan.manifest_type}</td>
                      <td className="px-5 py-4 text-slate-300">{scan.total_dependencies}</td>
                      <td className="px-5 py-4 text-slate-300">{scan.vulnerability_count}</td>
                      <td className="px-5 py-4 text-slate-300">{scan.risk_score}/100</td>
                      <td className="px-5 py-4">
                        <SeverityBadge severity={severity} />
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <Link
                            to={`/scan-results/${scan.id}`}
                            className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-slate-200 transition hover:bg-white/10"
                          >
                            <Eye size={16} />
                            View
                          </Link>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget({ mode: "single", scan })}
                            className="inline-flex items-center gap-2 rounded-lg border border-rose-300/25 bg-rose-400/10 px-3 py-2 text-sm font-semibold text-rose-100 transition hover:border-rose-200/45 hover:bg-rose-400/20"
                          >
                            <Trash2 size={16} />
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <DeleteConfirmationModal
        target={deleteTarget}
        deleting={deleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
      />

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            className={[
              "fixed bottom-5 right-5 z-[90] rounded-lg border px-4 py-3 text-sm font-semibold shadow-glow backdrop-blur",
              toast.type === "success"
                ? "border-emerald-300/30 bg-emerald-400/15 text-emerald-100"
                : "border-rose-300/30 bg-rose-400/15 text-rose-100",
            ].join(" ")}
          >
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}


function DeleteConfirmationModal({ target, deleting, onCancel, onConfirm }) {
  const isClearAll = target?.mode === "all";
  const title = isClearAll ? "Clear all scan history?" : "Delete scan history?";
  const message = isClearAll
    ? "This will permanently delete every scan record and all related findings, safe manifests, license results, supply-chain results, and generated report metadata."
    : "This will permanently delete this scan record and related findings.";

  return (
    <AnimatePresence>
      {target && (
        <motion.div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/80 px-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={deleting ? undefined : onCancel}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-history-title"
            className="cyber-panel w-full max-w-lg overflow-hidden"
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.96 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-white/10 p-5">
              <div className="flex items-start gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-rose-300/25 bg-rose-400/10 text-rose-100 shadow-glow">
                  <AlertTriangle size={22} />
                </span>
                <div>
                  <h2 id="delete-history-title" className="text-lg font-bold text-white">
                    {title}
                  </h2>
                  {target?.scan && (
                    <p className="mt-1 text-sm font-semibold text-cyan-200">
                      {target.scan.manifest_name}
                    </p>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={onCancel}
                disabled={deleting}
                className="theme-button inline-flex h-9 w-9 items-center justify-center rounded-lg border hover:border-cyan-300/40 hover:text-cyan-200 disabled:opacity-50"
                aria-label="Close delete confirmation"
              >
                <X size={17} />
              </button>
            </div>

            <div className="p-5">
              <p className="text-sm leading-6 text-slate-300">{message}</p>
              <p className="mt-3 rounded-lg border border-rose-300/20 bg-rose-400/10 px-3 py-2 text-sm font-semibold text-rose-100">
                This action cannot be undone.
              </p>
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-white/10 p-5 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={onCancel}
                disabled={deleting}
                className="theme-button inline-flex items-center justify-center rounded-lg border px-4 py-2.5 text-sm font-semibold disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={deleting}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-rose-300/30 bg-rose-500 px-4 py-2.5 text-sm font-semibold text-white shadow-glow transition hover:bg-rose-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Trash2 size={16} />
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
