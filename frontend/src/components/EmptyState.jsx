import { Link } from "react-router-dom";
import { ScanLine } from "lucide-react";


export default function EmptyState({ title = "No scans yet", action = true }) {
  return (
    <div className="cyber-panel flex flex-col items-center justify-center px-6 py-12 text-center">
      <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-cyan-400/10 text-cyan-200 ring-1 ring-cyan-300/20">
        <ScanLine size={22} />
      </span>
      <h2 className="text-lg font-semibold text-white">{title}</h2>
      {action && (
        <Link
          to="/new-scan"
          className="mt-5 inline-flex items-center gap-2 rounded-lg bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-300"
        >
          <ScanLine size={16} />
          Start scan
        </Link>
      )}
    </div>
  );
}
