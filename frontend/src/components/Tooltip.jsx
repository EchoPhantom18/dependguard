export default function Tooltip({ label }) {
  return (
    <span className="pointer-events-none absolute left-[calc(100%+0.75rem)] top-1/2 z-50 -translate-y-1/2 translate-x-1 whitespace-nowrap rounded-md border border-cyan-300/20 bg-slate-950/95 px-2.5 py-1.5 text-xs font-semibold text-cyan-50 opacity-0 shadow-glow backdrop-blur transition-all duration-200 ease-out group-hover:translate-x-0 group-hover:opacity-100">
      {label}
    </span>
  );
}
