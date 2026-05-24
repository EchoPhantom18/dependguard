import { motion } from "framer-motion";


export default function SettingsTabs({ tabs, activeTab, onChange }) {
  return (
    <div className="cyber-panel overflow-x-auto p-2">
      <div className="flex min-w-max gap-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              className={[
                "relative flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold transition",
                isActive ? "text-cyan-50" : "text-slate-400 hover:bg-white/[0.04] hover:text-slate-100",
              ].join(" ")}
            >
              {isActive && (
                <motion.span
                  layoutId="settings-active-tab"
                  className="absolute inset-0 rounded-lg border border-cyan-300/25 bg-cyan-400/10 shadow-glow"
                  transition={{ duration: 0.22, ease: "easeOut" }}
                />
              )}
              <span className="relative z-10 flex items-center gap-2">
                <Icon size={16} />
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
