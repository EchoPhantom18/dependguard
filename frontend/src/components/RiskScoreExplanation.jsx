import { HelpCircle, ShieldAlert } from "lucide-react";

import { getRiskLevel, getRiskReasons } from "../utils/riskScore.js";


export default function RiskScoreExplanation({ scan, score, onClick }) {
  const riskLevel = getRiskLevel(score);
  const reasons = getRiskReasons(scan);
  const normalizedScore = Math.min(100, Math.max(0, Number(score) || 0));

  return (
    <button
      type="button"
      onClick={onClick}
      title="Click to learn more"
      className="cyber-panel group relative w-full cursor-pointer p-5 text-left transition-all duration-300 hover:-translate-y-0.5 hover:scale-[1.02] hover:border-cyan-400/70 hover:shadow-[0_0_32px_rgba(6,182,212,0.2)] focus:outline-none focus:ring-2 focus:ring-cyan-300/40"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-slate-400">Risk Score</p>
          <p className="mt-3 text-3xl font-bold text-white">{normalizedScore}/100</p>
          <span
            className={[
              "mt-2 inline-flex rounded-full border px-2.5 py-1 text-xs font-bold uppercase tracking-wide",
              riskLevel.badgeClass,
            ].join(" ")}
          >
            {riskLevel.label}
          </span>
        </div>
        <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-rose-400/10 text-rose-200 ring-1 ring-rose-300/20">
          <ShieldAlert size={20} />
        </span>
      </div>

      <p className="mt-4 text-sm leading-6 text-slate-300">{riskLevel.shortExplanation}</p>

      <div className="mt-4">
        <div className="mb-2 flex items-center justify-between text-xs font-semibold text-slate-400">
          <span>Safe</span>
          <span>Critical</span>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-white/10">
          <div
            className={`h-full rounded-full ${riskLevel.progressClass}`}
            style={{ width: `${normalizedScore}%` }}
          />
        </div>
      </div>

      <div className="mt-4 rounded-lg border border-white/10 bg-white/[0.03] p-3">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-cyan-100">
          <HelpCircle size={14} />
          Why this score?
        </div>
        <ul className="mt-2 space-y-1.5 text-xs leading-5 text-slate-300">
          {reasons.map((reason) => (
            <li key={reason} className="flex gap-2">
              <span className={`mt-2 h-1.5 w-1.5 shrink-0 rounded-full ${riskLevel.colorClass}`} />
              <span>{reason}</span>
            </li>
          ))}
        </ul>
      </div>

      <span className="pointer-events-none absolute bottom-4 right-4 rounded-full border border-cyan-300/20 bg-slate-950/90 px-2 py-1 text-[11px] font-semibold text-cyan-100 opacity-0 shadow-glow transition-opacity duration-200 group-hover:opacity-100">
        Click to learn more
      </span>
    </button>
  );
}
