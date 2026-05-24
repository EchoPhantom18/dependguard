import "@xyflow/react/dist/style.css";

import { Background, Controls, ReactFlow } from "@xyflow/react";
import { GitBranch, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { api } from "../api/client.js";
import EmptyState from "../components/EmptyState.jsx";


export default function AttackGraph() {
  const { scanId } = useParams();
  const [scans, setScans] = useState([]);
  const [selectedScanId, setSelectedScanId] = useState(scanId || "");
  const [graph, setGraph] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    api.get("/scans/history").then(({ data }) => {
      setScans(data.scans);
      const firstId = scanId || data.scans[0]?.id;
      if (firstId) {
        setSelectedScanId(String(firstId));
      }
    });
  }, [scanId]);

  useEffect(() => {
    if (!selectedScanId) return;
    setLoading(true);
    setMessage("");
    api
      .get(`/attack-graph/${selectedScanId}`)
      .then(({ data }) => setGraph(data.graph))
      .catch((error) => setMessage(error.response?.data?.message || "Unable to load attack graph."))
      .finally(() => setLoading(false));
  }, [selectedScanId]);

  if (scans.length === 0) {
    return <EmptyState title="Run a scan to build an attack graph" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Dependency Attack Graph</h1>
          <p className="mt-1 text-sm text-slate-400">Visualize vulnerable package paths and related advisory nodes.</p>
        </div>
        <select
          className="form-field w-full px-3 py-2.5 text-sm sm:w-[320px]"
          value={selectedScanId}
          onChange={(event) => setSelectedScanId(event.target.value)}
        >
          {scans.map((scan) => (
            <option key={scan.id} value={scan.id}>
              #{scan.id} {scan.manifest_name}
            </option>
          ))}
        </select>
      </div>

      <section className="cyber-panel overflow-hidden">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div className="flex items-center gap-2">
            <GitBranch size={18} className="text-cyan-200" />
            <h2 className="font-semibold text-white">Exploit Path View</h2>
          </div>
          {selectedScanId && (
            <Link to={`/scan-results/${selectedScanId}`} className="text-sm font-medium text-cyan-200 hover:text-cyan-100">
              Open scan
            </Link>
          )}
        </div>

        <div className="h-[620px] bg-slate-950/60">
          {loading && (
            <div className="flex h-full items-center justify-center gap-2 text-slate-300">
              <Loader2 size={18} className="animate-spin" />
              Loading graph...
            </div>
          )}
          {!loading && graph && (
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
          )}
        </div>
      </section>

      {message && <div className="rounded-lg border border-rose-300/20 bg-rose-400/10 p-4 text-sm text-rose-100">{message}</div>}

      {graph?.paths?.length > 0 && (
        <section className="cyber-panel p-5">
          <h2 className="font-semibold text-white">Vulnerable Paths</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {graph.paths.map((path) => (
              <div key={path.join(">")} className="rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-slate-300">
                {path.join(" -> ")}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
