import { Check, Copy, Download, WandSparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { api } from "../api/client.js";
import EmptyState from "../components/EmptyState.jsx";


export default function SafeManifest() {
  const { scanId } = useParams();
  const [scan, setScan] = useState(null);
  const [safeManifest, setSafeManifest] = useState("");
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(Boolean(scanId));

  useEffect(() => {
    if (!scanId) return;

    async function loadSafeManifest() {
      const [{ data: scanData }, { data: safeData }] = await Promise.all([
        api.get(`/scans/${scanId}`),
        api.post("/manifests/safe", { scan_id: scanId }),
      ]);
      setScan(scanData.scan);
      setSafeManifest(safeData.safe_manifest);
      setLoading(false);
    }

    loadSafeManifest();
  }, [scanId]);

  const diffLines = useMemo(() => {
    const originalLines = (scan?.original_manifest || "").split("\n");
    const safeLines = (safeManifest || "").split("\n");
    return safeLines.map((line, index) => ({
      value: line,
      changed: line !== (originalLines[index] || ""),
    }));
  }, [safeManifest, scan]);

  async function copySafeManifest() {
    await navigator.clipboard.writeText(safeManifest);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function downloadSafeManifest() {
    const blob = new Blob([safeManifest], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `safe-${scan?.manifest_name || "manifest.txt"}`;
    link.click();
    URL.revokeObjectURL(url);
  }

  if (!scanId) {
    return <EmptyState title="Choose a scan to generate a safe manifest" />;
  }

  if (loading) {
    return <div className="cyber-panel p-6 text-slate-300">Generating safe manifest...</div>;
  }

  if (!scan) {
    return <EmptyState title="Scan not found" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Safe Manifest Generator</h1>
          <p className="mt-1 text-sm text-slate-400">{scan.manifest_name}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={copySafeManifest}
            className="inline-flex items-center gap-2 rounded-lg border border-cyan-300/25 bg-cyan-400/10 px-4 py-2.5 text-sm font-semibold text-cyan-100 hover:bg-cyan-400/20"
          >
            {copied ? <Check size={17} /> : <Copy size={17} />}
            {copied ? "Copied" : "Copy"}
          </button>
          <button
            type="button"
            onClick={downloadSafeManifest}
            className="inline-flex items-center gap-2 rounded-lg bg-cyan-400 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-cyan-300"
          >
            <Download size={17} />
            Download
          </button>
        </div>
      </div>

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="cyber-panel overflow-hidden">
          <div className="flex items-center gap-2 border-b border-white/10 px-5 py-4">
            <WandSparkles size={18} className="text-slate-300" />
            <h2 className="text-lg font-semibold text-white">Original Manifest</h2>
          </div>
          <pre className="code-pane rounded-none border-0 p-4">{scan.original_manifest}</pre>
        </div>

        <div className="cyber-panel overflow-hidden">
          <div className="flex items-center gap-2 border-b border-white/10 px-5 py-4">
            <WandSparkles size={18} className="text-cyan-200" />
            <h2 className="text-lg font-semibold text-white">Safer Generated Manifest</h2>
          </div>
          <div className="code-pane rounded-none border-0 p-4">
            {diffLines.map((line, index) => (
              <div
                key={`${line.value}-${index}`}
                className={line.changed ? "bg-emerald-400/20 text-emerald-100" : "text-blue-100"}
              >
                {line.value || " "}
              </div>
            ))}
          </div>
        </div>
      </section>

      <Link to={`/scan-results/${scanId}`} className="inline-flex rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-white/10">
        Back to results
      </Link>
    </div>
  );
}
