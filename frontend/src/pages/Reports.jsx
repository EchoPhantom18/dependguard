import { Download, FileText, RefreshCcw } from "lucide-react";
import { useEffect, useState } from "react";

import { api } from "../api/client.js";
import EmptyState from "../components/EmptyState.jsx";
import PDFReportButton from "../components/PDFReportButton.jsx";


export default function Reports() {
  const [scans, setScans] = useState([]);
  const [selectedScanId, setSelectedScanId] = useState("");
  const [report, setReport] = useState("");

  useEffect(() => {
    api.get("/scans/history").then(({ data }) => {
      setScans(data.scans);
      if (data.scans[0]) {
        setSelectedScanId(String(data.scans[0].id));
        generateReport(data.scans[0].id);
      }
    });
  }, []);

  async function generateReport(nextScanId = selectedScanId) {
    if (!nextScanId) return;
    const { data } = await api.post("/reports", { scan_id: Number(nextScanId) });
    setReport(data.report_markdown);
  }

  function downloadReport() {
    const blob = new Blob([report], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `dependguard-report-${selectedScanId}.md`;
    link.click();
    URL.revokeObjectURL(url);
  }

  if (scans.length === 0) {
    return <EmptyState title="No reports available yet" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Reports</h1>
          <p className="mt-1 text-sm text-slate-400">Generate markdown reports from saved scan history.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => generateReport()}
            className="inline-flex items-center gap-2 rounded-lg border border-cyan-300/25 bg-cyan-400/10 px-4 py-2.5 text-sm font-semibold text-cyan-100 hover:bg-cyan-400/20"
          >
            <RefreshCcw size={17} />
            Generate
          </button>
          <button
            type="button"
            onClick={downloadReport}
            disabled={!report}
            className="inline-flex items-center gap-2 rounded-lg bg-cyan-400 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Download size={17} />
            Markdown
          </button>
          <PDFReportButton scanId={selectedScanId} label="PDF Report" />
        </div>
      </div>

      <section className="grid gap-6 xl:grid-cols-[360px_1fr]">
        <div className="cyber-panel overflow-hidden">
          <div className="flex items-center gap-2 border-b border-white/10 px-5 py-4">
            <FileText size={18} className="text-cyan-200" />
            <h2 className="font-semibold text-white">Scans</h2>
          </div>
          <div className="divide-y divide-white/10">
            {scans.map((scan) => (
              <button
                key={scan.id}
                type="button"
                onClick={() => {
                  setSelectedScanId(String(scan.id));
                  generateReport(scan.id);
                }}
                className={`block w-full px-5 py-4 text-left text-sm hover:bg-white/[0.04] ${
                  selectedScanId === String(scan.id) ? "bg-cyan-400/10 text-cyan-100" : "text-slate-300"
                }`}
              >
                <span className="block font-semibold">{scan.manifest_name}</span>
                <span className="mt-1 block text-xs text-slate-400">
                  Risk {scan.risk_score}/100, {scan.vulnerability_count} findings
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="cyber-panel overflow-hidden">
          <div className="border-b border-white/10 px-5 py-4">
            <h2 className="font-semibold text-white">Generated Report</h2>
          </div>
          <pre className="code-pane rounded-none border-0 p-5 whitespace-pre-wrap">{report}</pre>
        </div>
      </section>
    </div>
  );
}
