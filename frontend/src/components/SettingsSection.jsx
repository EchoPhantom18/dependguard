export default function SettingsSection({ title, description, icon: Icon, children }) {
  return (
    <section className="cyber-panel p-5">
      <div className="mb-5 flex items-start gap-3 border-b border-white/10 pb-4">
        {Icon && (
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-400/10 text-cyan-200 ring-1 ring-cyan-300/20">
            <Icon size={18} />
          </span>
        )}
        <div>
          <h2 className="font-semibold text-white">{title}</h2>
          {description && <p className="mt-1 text-sm text-slate-400">{description}</p>}
        </div>
      </div>
      <div className="grid gap-4">{children}</div>
    </section>
  );
}
