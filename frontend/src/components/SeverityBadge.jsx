export default function SeverityBadge({ severity }) {
  const styles = {
    critical: "bg-rose-500/10 text-rose-200 ring-rose-300/30",
    high: "bg-orange-500/10 text-orange-200 ring-orange-300/30",
    medium: "bg-amber-500/10 text-amber-100 ring-amber-300/30",
    low: "bg-emerald-500/10 text-emerald-100 ring-emerald-300/30",
  };

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${
        styles[severity] || styles.low
      }`}
    >
      {severity}
    </span>
  );
}
