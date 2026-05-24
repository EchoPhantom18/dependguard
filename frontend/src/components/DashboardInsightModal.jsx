import { AnimatePresence, motion } from "framer-motion";
import { HelpCircle, ShieldCheck, X } from "lucide-react";
import { useEffect, useState } from "react";


export default function DashboardInsightModal({ insight, onClose }) {
  const [simpleMode, setSimpleMode] = useState(false);

  useEffect(() => {
    if (!insight) return undefined;

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [insight, onClose]);

  return (
    <AnimatePresence>
      {insight && (
        <motion.div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/72 px-4 py-8 backdrop-blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onMouseDown={onClose}
        >
          <motion.section
            role="dialog"
            aria-modal="true"
            aria-labelledby="dashboard-insight-title"
            className="cyber-panel max-h-[90vh] w-full max-w-2xl overflow-hidden"
            initial={{ opacity: 0, y: 18, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-white/10 px-5 py-4">
              <div className="flex items-start gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-cyan-400/10 text-cyan-100 ring-1 ring-cyan-300/20 shadow-glow">
                  <ShieldCheck size={21} />
                </span>
                <div>
                  <h2 id="dashboard-insight-title" className="text-xl font-bold text-white">
                    {insight.title}
                  </h2>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${insight.severityMeta.badgeClass}`}>
                      {insight.severityMeta.label}
                    </span>
                    <span className="text-xs text-slate-400">Beginner-friendly security insight</span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="theme-button inline-flex h-9 w-9 items-center justify-center rounded-lg border hover:border-cyan-300/40 hover:text-cyan-200"
                aria-label="Close insight"
              >
                <X size={18} />
              </button>
            </div>

            <div className="max-h-[calc(90vh-88px)] overflow-y-auto p-5">
              <div className="mb-5 h-2 overflow-hidden rounded-full bg-white/10">
                <div className={`h-full w-2/3 rounded-full ${insight.severityMeta.colorClass}`} />
              </div>

              <div className="mb-5 flex items-center justify-between gap-4 rounded-lg border border-cyan-300/15 bg-cyan-400/10 px-4 py-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-cyan-100">
                  <HelpCircle size={17} />
                  Explain like I am new to cybersecurity
                </div>
                <button
                  type="button"
                  onClick={() => setSimpleMode((current) => !current)}
                  className={`inline-flex h-8 w-14 shrink-0 items-center rounded-full border p-1 transition-colors duration-200 ${
                    simpleMode
                      ? "justify-end border-cyan-300/45 bg-cyan-400/30"
                      : "justify-start border-white/10 bg-white/10"
                  }`}
                  aria-pressed={simpleMode}
                >
                  <span
                    className="h-6 w-6 rounded-full bg-white shadow-lg transition-transform duration-200"
                  />
                </button>
              </div>

              <div className="grid gap-4">
                <InsightBlock title="What this metric means" content={insight.valueText} />
                {!simpleMode && <InsightBlock title="Why it matters" content={insight.whyMatters} />}
                <InsightBlock title="Beginner explanation" content={insight.beginnerExplanation} />
                {!simpleMode && (
                  <InsightList title="This metric is calculated using" items={insight.calculation} />
                )}
                <InsightList title="How to improve it" items={insight.improvementTips} />
              </div>
            </div>
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  );
}


function InsightBlock({ title, content }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
      <h3 className="text-sm font-semibold text-white">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-300">{content}</p>
    </div>
  );
}


function InsightList({ title, items }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
      <h3 className="text-sm font-semibold text-white">{title}</h3>
      <ul className="mt-2 space-y-2 text-sm leading-6 text-slate-300">
        {items.map((item) => (
          <li key={item} className="flex gap-2">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-300" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
