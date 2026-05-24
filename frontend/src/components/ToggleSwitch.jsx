export default function ToggleSwitch({ checked, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={[
        "inline-flex h-8 w-14 shrink-0 items-center rounded-full border p-1 transition-all duration-200",
        checked
          ? "justify-end border-cyan-300/45 bg-cyan-400/30 shadow-glow"
          : "justify-start border-white/10 bg-white/10",
      ].join(" ")}
    >
      <span className="h-6 w-6 rounded-full bg-white shadow-lg transition-transform duration-200" />
    </button>
  );
}
