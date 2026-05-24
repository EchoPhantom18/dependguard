import { CheckCircle2, Plug, Unplug } from "lucide-react";


export default function IntegrationCard({ name, description, connected, onConnect, onDisconnect }) {
  return (
    <div
      title={description}
      className="rounded-lg border border-white/10 bg-white/[0.03] p-4 transition hover:border-cyan-300/25 hover:bg-cyan-400/10"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-semibold text-white">{name}</h3>
          <p className="mt-1 text-sm text-slate-400">{description}</p>
        </div>
        <span
          className={[
            "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold",
            connected
              ? "border-emerald-300/30 bg-emerald-400/10 text-emerald-100"
              : "border-slate-500/30 bg-white/5 text-slate-300",
          ].join(" ")}
        >
          {connected && <CheckCircle2 size={13} />}
          {connected ? "Connected" : "Not connected"}
        </span>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onConnect}
          className="theme-button inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold hover:border-cyan-300/40 hover:text-cyan-200"
        >
          <Plug size={15} />
          Connect
        </button>
        {connected && (
          <button
            type="button"
            onClick={onDisconnect}
            className="inline-flex items-center gap-2 rounded-lg border border-rose-300/25 bg-rose-400/10 px-3 py-2 text-sm font-semibold text-rose-100 hover:bg-rose-400/20"
          >
            <Unplug size={15} />
            Disconnect
          </button>
        )}
      </div>
    </div>
  );
}
