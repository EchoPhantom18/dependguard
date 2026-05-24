import { Copy, Download, Workflow } from "lucide-react";
import { useState } from "react";

import { api } from "../api/client.js";


export default function CIIntegration() {
  const [provider, setProvider] = useState("github");
  const [backendUrl, setBackendUrl] = useState("http://localhost:5000/api");
  const [riskThreshold, setRiskThreshold] = useState(70);
  const [yaml, setYaml] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function generateConfig(event) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const { data } = await api.post("/ci/config", {
        provider,
        backend_url: backendUrl,
        risk_threshold: Number(riskThreshold),
      });
      setYaml(data.yaml);
      setMessage("CI configuration generated.");
    } catch (error) {
      setMessage(error.response?.data?.message || "Unable to generate CI config.");
    } finally {
      setLoading(false);
    }
  }

  async function copyYaml() {
    await navigator.clipboard.writeText(yaml);
    setMessage("Copied CI YAML to clipboard.");
  }

  function downloadYaml() {
    const blob = new Blob([yaml], { type: "text/yaml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "dependguard-ci.yml";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">CI/CD Integration</h1>
        <p className="mt-1 text-sm text-slate-400">Generate a pipeline config that scans dependency manifests on push and pull request events.</p>
      </div>

      <section className="cyber-panel p-5">
        <form onSubmit={generateConfig} className="grid gap-4 lg:grid-cols-[220px_1fr_180px_auto]">
          <label>
            <span className="mb-2 block text-sm font-medium text-slate-300">Provider</span>
            <select className="form-field px-3 py-2.5" value={provider} onChange={(event) => setProvider(event.target.value)}>
              <option value="github">GitHub Actions</option>
              <option value="gitlab">GitLab CI</option>
            </select>
          </label>
          <label>
            <span className="mb-2 block text-sm font-medium text-slate-300">DependGuard API URL</span>
            <input className="form-field px-3 py-2.5" value={backendUrl} onChange={(event) => setBackendUrl(event.target.value)} />
          </label>
          <label>
            <span className="mb-2 block text-sm font-medium text-slate-300">Fail threshold</span>
            <input
              className="form-field px-3 py-2.5"
              type="number"
              min="1"
              max="100"
              value={riskThreshold}
              onChange={(event) => setRiskThreshold(event.target.value)}
            />
          </label>
          <button
            type="submit"
            disabled={loading}
            className="mt-7 inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-cyan-400 px-4 text-sm font-semibold text-slate-950 shadow-glow hover:bg-cyan-300 disabled:opacity-60"
          >
            <Workflow size={17} />
            {loading ? "Generating..." : "Generate"}
          </button>
        </form>
        {message && <p className="mt-4 text-sm text-cyan-100">{message}</p>}
      </section>

      <section className="cyber-panel overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-white/10 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="font-semibold text-white">dependguard-ci.yml</h2>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={copyYaml} disabled={!yaml} className="theme-button inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm disabled:opacity-60">
              <Copy size={16} />
              Copy
            </button>
            <button type="button" onClick={downloadYaml} disabled={!yaml} className="theme-button inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm disabled:opacity-60">
              <Download size={16} />
              Download
            </button>
          </div>
        </div>
        <pre className="code-pane min-h-[520px] rounded-none border-0 p-5 whitespace-pre-wrap">
          {yaml || "Generate a CI configuration to preview it here."}
        </pre>
      </section>
    </div>
  );
}
