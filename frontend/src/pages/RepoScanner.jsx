import { Github, Loader2, ScanSearch } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";

import { api } from "../api/client.js";


export default function RepoScanner() {
  const [repoUrl, setRepoUrl] = useState("https://github.com/pallets/flask");
  const [branch, setBranch] = useState("");
  const [result, setResult] = useState(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function scanRepository(event) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    setResult(null);

    try {
      const { data } = await api.post("/repo/scan", { repo_url: repoUrl, branch });
      setResult(data);
    } catch (error) {
      setMessage(error.response?.data?.message || "Repository scan failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">GitHub Repository Scanner</h1>
        <p className="mt-1 text-sm text-slate-400">Fetch supported manifests from a GitHub repository and scan them with DependGuard.</p>
      </div>

      <section className="cyber-panel p-5">
        <form onSubmit={scanRepository} className="grid gap-4 lg:grid-cols-[1fr_220px_auto]">
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-300">GitHub repository URL</span>
            <input
              className="form-field px-3 py-2.5"
              value={repoUrl}
              onChange={(event) => setRepoUrl(event.target.value)}
              placeholder="https://github.com/owner/repo"
              required
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-300">Branch optional</span>
            <input
              className="form-field px-3 py-2.5"
              value={branch}
              onChange={(event) => setBranch(event.target.value)}
              placeholder="main"
            />
          </label>
          <button
            type="submit"
            disabled={loading}
            className="mt-7 inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-cyan-400 px-4 text-sm font-semibold text-slate-950 shadow-glow hover:bg-cyan-300 disabled:opacity-60"
          >
            {loading ? <Loader2 size={17} className="animate-spin" /> : <Github size={17} />}
            Scan repo
          </button>
        </form>
        {message && <p className="mt-4 text-sm text-rose-200">{message}</p>}
      </section>

      {result && (
        <section className="cyber-panel overflow-hidden">
          <div className="border-b border-white/10 px-5 py-4">
            <h2 className="font-semibold text-white">{result.repository_scan.repo_owner}/{result.repository_scan.repo_name}</h2>
            <p className="mt-1 text-sm text-slate-400">{result.repository_scan.message}</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-white/[0.03] text-slate-400">
                <tr>
                  <th className="px-5 py-3 font-medium">Manifest</th>
                  <th className="px-5 py-3 font-medium">Dependencies</th>
                  <th className="px-5 py-3 font-medium">Findings</th>
                  <th className="px-5 py-3 font-medium">Risk</th>
                  <th className="px-5 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {result.scans.map((scan) => (
                  <tr key={scan.id} className="hover:bg-white/[0.03]">
                    <td className="px-5 py-4 font-semibold text-white">{scan.manifest_name}</td>
                    <td className="px-5 py-4 text-slate-300">{scan.total_dependencies}</td>
                    <td className="px-5 py-4 text-slate-300">{scan.vulnerability_count}</td>
                    <td className="px-5 py-4 text-slate-300">{scan.risk_score}/100</td>
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-2">
                        <Link to={`/scan-results/${scan.id}`} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-cyan-100 hover:bg-white/10">
                          Results
                        </Link>
                        <Link to={`/attack-graph/${scan.id}`} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-cyan-100 hover:bg-white/10">
                          Graph
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {result.scans.length === 0 && (
            <div className="flex items-center gap-2 px-5 py-5 text-sm text-slate-300">
              <ScanSearch size={17} />
              No supported manifests were found in the repository root.
            </div>
          )}
        </section>
      )}
    </div>
  );
}
