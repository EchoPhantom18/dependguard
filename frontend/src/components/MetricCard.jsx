export default function MetricCard({ icon: Icon, label, value, detail, tone = "cyan", onClick }) {
  const tones = {
    cyan: "text-cyan-200 bg-cyan-400/10 ring-cyan-300/20",
    violet: "text-violet-200 bg-violet-400/10 ring-violet-300/20",
    emerald: "text-emerald-200 bg-emerald-400/10 ring-emerald-300/20",
    rose: "text-rose-200 bg-rose-400/10 ring-rose-300/20",
    amber: "text-amber-200 bg-amber-400/10 ring-amber-300/20",
  };
  const Component = onClick ? "button" : "section";

  return (
    <Component
      type={onClick ? "button" : undefined}
      onClick={onClick}
      title={onClick ? "Click to learn more" : undefined}
      className={[
        "cyber-panel group relative w-full p-5 text-left",
        onClick
          ? "cursor-pointer transition-all duration-300 hover:-translate-y-0.5 hover:scale-[1.02] hover:border-cyan-400/70 hover:shadow-[0_0_32px_rgba(6,182,212,0.2)] focus:outline-none focus:ring-2 focus:ring-cyan-300/40"
          : "",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-slate-400">{label}</p>
          <p className="mt-3 text-3xl font-bold text-white">{value}</p>
          {detail && <p className="mt-2 text-sm text-slate-400">{detail}</p>}
        </div>
        <span className={`flex h-11 w-11 items-center justify-center rounded-lg ring-1 ${tones[tone]}`}>
          <Icon size={20} />
        </span>
      </div>
      {onClick && (
        <span className="pointer-events-none absolute bottom-4 right-4 rounded-full border border-cyan-300/20 bg-slate-950/90 px-2 py-1 text-[11px] font-semibold text-cyan-100 opacity-0 shadow-glow transition-opacity duration-200 group-hover:opacity-100">
          Click to learn more
        </span>
      )}
    </Component>
  );
}
