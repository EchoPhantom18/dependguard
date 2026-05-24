import { Download } from "lucide-react";
import { useState } from "react";

import { api } from "../api/client.js";


export default function PDFReportButton({ scanId, label = "Download PDF Report" }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function downloadPdf() {
    if (!scanId) return;
    setLoading(true);
    setMessage("");
    try {
      const response = await api.get(`/reports/pdf/${scanId}`, { responseType: "blob" });
      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `dependguard-security-report-${scanId}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      setMessage(error.response?.data?.message || "Unable to download PDF report.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <span className="inline-flex flex-col gap-1">
      <button
        type="button"
        onClick={downloadPdf}
        disabled={!scanId || loading}
        className="inline-flex items-center gap-2 rounded-lg bg-cyan-400 px-4 py-2.5 text-sm font-semibold text-slate-950 shadow-glow hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Download size={17} />
        {loading ? "Preparing PDF..." : label}
      </button>
      {message && <span className="text-xs text-rose-200">{message}</span>}
    </span>
  );
}
