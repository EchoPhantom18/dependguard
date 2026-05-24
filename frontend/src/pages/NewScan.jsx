import { FileText, PlayCircle, UploadCloud } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { api } from "../api/client.js";


const sampleManifest = `flask==1.0
requests==2.19.0
django==2.0
urllib3==1.24.1`;


export default function NewScan() {
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [manifestText, setManifestText] = useState(sampleManifest);
  const [filename, setFilename] = useState("requirements.txt");
  const [dragging, setDragging] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState({
    includeDevDependencies: true,
    generateSafeManifest: true,
    explainFindings: true,
    strictRiskScoring: false,
  });

  const canScan = useMemo(() => Boolean(file || manifestText.trim()), [file, manifestText]);

  function updateConfig(event) {
    const { name, checked } = event.target;
    setConfig((current) => ({ ...current, [name]: checked }));
  }

  function handleDrop(event) {
    event.preventDefault();
    setDragging(false);
    const droppedFile = event.dataTransfer.files?.[0];
    if (droppedFile) readFile(droppedFile);
  }

  function readFile(nextFile) {
    setFile(nextFile);
    setFilename(nextFile.name);
    const reader = new FileReader();
    reader.onload = () => setManifestText(String(reader.result || ""));
    reader.readAsText(nextFile);
  }

  async function startScan() {
    if (!canScan) return;
    setLoading(true);
    setMessage("");

    try {
      let payload = { manifest_text: manifestText, filename, config };

      if (file) {
        const formData = new FormData();
        formData.append("file", file);
        const { data } = await api.post("/manifests/upload", formData);
        payload = {
          manifest_text: data.manifest_text,
          filename: data.filename,
          config,
        };
      }

      const { data } = await api.post("/scans", payload);
      navigate(`/scan-results/${data.scan.id}`);
    } catch (error) {
      setMessage(error.response?.data?.message || "Scan failed. Check the manifest and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">New Scan</h1>
        <p className="mt-1 text-sm text-slate-400">Upload or paste a dependency manifest.</p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <section
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          className={`cyber-panel flex min-h-[260px] flex-col items-center justify-center border-dashed p-8 text-center transition ${
            dragging ? "border-cyan-300/70 bg-cyan-400/10" : ""
          }`}
        >
          <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-lg bg-cyan-400/10 text-cyan-200 ring-1 ring-cyan-300/20">
            <UploadCloud size={26} />
          </span>
          <h2 className="text-lg font-semibold text-white">Drop manifest file</h2>
          <p className="mt-2 max-w-md text-sm text-slate-400">
            Supported files: requirements.txt, package.json, pom.xml, and Pipfile.
          </p>
          <label className="mt-6 inline-flex cursor-pointer items-center gap-2 rounded-lg bg-cyan-400 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-cyan-300">
            <FileText size={17} />
            Choose file
            <input
              className="sr-only"
              type="file"
              accept=".txt,.json,.xml,Pipfile,package.json,pom.xml"
              onChange={(event) => event.target.files?.[0] && readFile(event.target.files[0])}
            />
          </label>
          {file && <p className="mt-4 text-sm text-cyan-100">{file.name}</p>}
        </section>

        <section className="cyber-panel p-5">
          <h2 className="text-lg font-semibold text-white">Scan Configuration</h2>
          <div className="mt-4 space-y-3">
            {[
              ["includeDevDependencies", "Include dev dependencies"],
              ["generateSafeManifest", "Generate safe manifest"],
              ["explainFindings", "Explain findings"],
              ["strictRiskScoring", "Strict risk scoring"],
            ].map(([key, label]) => (
              <label key={key} className="flex items-center justify-between gap-4 rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-slate-200">
                <span>{label}</span>
                <input
                  type="checkbox"
                  name={key}
                  checked={config[key]}
                  onChange={updateConfig}
                  className="h-4 w-4 accent-cyan-300"
                />
              </label>
            ))}
          </div>
          <button
            type="button"
            onClick={startScan}
            disabled={!canScan || loading}
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-violet-400 px-4 py-3 text-sm font-bold text-slate-950 hover:bg-violet-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <PlayCircle size={18} />
            {loading ? "Scanning..." : "Start scan"}
          </button>
          {message && <p className="mt-3 text-sm text-rose-200">{message}</p>}
        </section>
      </div>

      <section className="cyber-panel p-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-white">Paste Manifest Text</h2>
          <input
            className="form-field max-w-[220px] px-3 py-2 text-sm"
            value={filename}
            onChange={(event) => setFilename(event.target.value)}
            aria-label="Manifest filename"
          />
        </div>
        <textarea
          className="form-field min-h-[280px] resize-y p-4 font-mono text-sm leading-6"
          value={manifestText}
          onChange={(event) => {
            setManifestText(event.target.value);
            setFile(null);
          }}
          spellCheck="false"
        />
      </section>
    </div>
  );
}
