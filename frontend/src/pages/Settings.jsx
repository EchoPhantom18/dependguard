import { AnimatePresence, motion } from "framer-motion";
import {
  Bell,
  Bot,
  Code2,
  Download,
  Github,
  LifeBuoy,
  Paintbrush,
  RotateCcw,
  Save,
  Search,
  Settings as SettingsIcon,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { api } from "../api/client.js";
import IntegrationCard from "../components/IntegrationCard.jsx";
import SettingsSection from "../components/SettingsSection.jsx";
import SettingsTabs from "../components/SettingsTabs.jsx";
import ToggleSwitch from "../components/ToggleSwitch.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useTheme } from "../context/ThemeContext.jsx";


const DEFAULT_SETTINGS = {
  workspace_name: "DependGuard Workspace",
  default_scan_depth: "standard",
  preferred_ecosystem: "multi-language",
  auto_scan_uploads: true,
  remember_last_settings: true,
  notifications_enabled: true,
  email_alerts: true,
  weekly_security_reports: false,
  real_time_dashboard_alerts: true,
  critical_vulnerability_alerts: true,
  scan_completion_notifications: true,
  email_frequency: "instant",
  live_cve_monitoring: true,
  strict_risk_scoring: false,
  include_dev_dependencies: true,
  typosquatting_detection: true,
  abandoned_package_detection: true,
  license_compliance_enforcement: false,
  auto_fix_vulnerable_packages: false,
  supply_chain_analysis: true,
  vulnerability_threshold: "medium",
  severity_threshold: "medium",
  auto_generate_safe_manifest: true,
  preferred_manifest_type: "requirements.txt",
  ai_vulnerability_explanations: true,
  ai_remediation_suggestions: true,
  beginner_cybersecurity_mode: true,
  explain_risks_simple_language: true,
  auto_generated_fix_summaries: true,
  theme: "dark",
  dashboard_density: "comfortable",
  dashboard_animations: true,
  glassmorphism_effects: true,
  accent_color: "#22d3ee",
  generate_sbom_automatically: false,
  repository_auto_scanning: false,
  cache_cve_results: true,
  developer_debug_mode: false,
  integrations: {
    github: { connected: false, status: "not_connected" },
    gitlab: { connected: false, status: "not_connected" },
    slack: { connected: false, status: "not_connected" },
    discord: { connected: false, status: "not_connected" },
    webhooks: { connected: false, status: "not_connected" },
  },
};

const tabs = [
  { id: "general", label: "General", icon: SettingsIcon },
  { id: "security", label: "Security", icon: ShieldCheck },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "ai", label: "AI Features", icon: Bot },
  { id: "integrations", label: "Integrations", icon: Github },
  { id: "appearance", label: "Appearance", icon: Paintbrush },
  { id: "advanced", label: "Advanced", icon: Code2 },
];

const integrationCopy = {
  github: ["GitHub", "Connect repositories for repo scanning and pull request workflows."],
  gitlab: ["GitLab", "Prepare GitLab CI scans and future repository sync."],
  slack: ["Slack", "Send vulnerability and scan completion alerts to security channels."],
  discord: ["Discord", "Notify engineering teams about important dependency events."],
  webhooks: ["Webhooks", "Forward scan events to your internal automation systems."],
};


export default function Settings() {
  const { user } = useAuth();
  const { setTheme } = useTheme();
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [activeTab, setActiveTab] = useState("general");
  const [query, setQuery] = useState("");
  const [toast, setToast] = useState(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/settings")
      .then(({ data }) => {
        const merged = mergeSettings(data);
        setSettings(merged);
        setTheme(merged.theme);
      })
      .finally(() => setLoading(false));
  }, [setTheme]);

  const normalizedQuery = query.trim().toLowerCase();
  const visible = useMemo(
    () => (label, description = "") =>
      !normalizedQuery ||
      label.toLowerCase().includes(normalizedQuery) ||
      description.toLowerCase().includes(normalizedQuery),
    [normalizedQuery],
  );

  function mergeSettings(nextSettings) {
    return {
      ...DEFAULT_SETTINGS,
      ...nextSettings,
      integrations: {
        ...DEFAULT_SETTINGS.integrations,
        ...(nextSettings?.integrations || {}),
      },
    };
  }

  function updateSetting(name, value) {
    setSettings((current) => ({ ...current, [name]: value }));
    if (name === "theme") {
      setTheme(value);
    }
  }

  function updateIntegration(key, connected) {
    setSettings((current) => ({
      ...current,
      integrations: {
        ...current.integrations,
        [key]: {
          connected,
          status: connected ? "connected" : "not_connected",
        },
      },
    }));
  }

  async function saveSettings() {
    setSaving(true);
    setToast(null);
    try {
      const { data } = await api.put("/settings", settings);
      const merged = mergeSettings(data);
      setSettings(merged);
      setTheme(merged.theme);
      showToast("success", "Settings saved");
    } catch (error) {
      showToast("error", error.response?.data?.message || "Unable to save settings");
    } finally {
      setSaving(false);
    }
  }

  async function resetSettings() {
    setSaving(true);
    setToast(null);
    try {
      const { data } = await api.put("/settings", { reset_to_defaults: true });
      const merged = mergeSettings(data);
      setSettings(merged);
      setTheme(merged.theme);
      showToast("success", "Settings reset to defaults");
    } catch (error) {
      showToast("error", error.response?.data?.message || "Unable to reset settings");
    } finally {
      setSaving(false);
    }
  }

  async function clearCache() {
    const { data } = await api.post("/settings/actions/clear-cache");
    showToast("success", `${data.cleared} cached CVE results cleared`);
  }

  async function downloadAction(path, filename) {
    const response = await api.get(path, { responseType: "blob" });
    const url = URL.createObjectURL(response.data);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  function showToast(type, message) {
    setToast({ type, message });
    setTimeout(() => setToast(null), 2200);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Settings</h1>
          <p className="mt-1 text-sm text-slate-400">
            {user?.email} - enterprise security controls for your DependGuard workspace.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className="relative block min-w-[280px]">
            <Search size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              className="form-field px-10 py-2.5 text-sm"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search settings..."
            />
          </label>
          <button
            type="button"
            onClick={resetSettings}
            className="theme-button inline-flex items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-semibold hover:border-amber-300/40 hover:text-amber-200"
          >
            <RotateCcw size={16} />
            Reset defaults
          </button>
          <button
            type="button"
            onClick={saveSettings}
            disabled={saving}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-cyan-400 px-4 py-2.5 text-sm font-semibold text-slate-950 shadow-glow hover:bg-cyan-300 disabled:opacity-60"
          >
            <Save size={16} />
            {saving ? "Saving..." : "Save settings"}
          </button>
        </div>
      </div>

      <SettingsTabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          className="grid gap-6"
        >
          {loading ? (
            <div className="cyber-panel p-6 text-slate-300">Loading settings...</div>
          ) : (
            <TabContent
              activeTab={activeTab}
              settings={settings}
              visible={visible}
              updateSetting={updateSetting}
              updateIntegration={updateIntegration}
              clearCache={clearCache}
              downloadAction={downloadAction}
            />
          )}
        </motion.div>
      </AnimatePresence>

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            className={[
              "fixed bottom-5 right-5 z-[90] rounded-lg border px-4 py-3 text-sm font-semibold shadow-glow backdrop-blur",
              toast.type === "success"
                ? "border-emerald-300/30 bg-emerald-400/15 text-emerald-100"
                : "border-rose-300/30 bg-rose-400/15 text-rose-100",
            ].join(" ")}
          >
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}


function TabContent({ activeTab, settings, visible, updateSetting, updateIntegration, clearCache, downloadAction }) {
  if (activeTab === "general") {
    return (
      <SettingsSection title="General Settings" description="Workspace defaults used across scans and dashboards." icon={SettingsIcon}>
        <SettingInput label="Workspace name" description="Name shown across your DependGuard workspace." value={settings.workspace_name} onChange={(value) => updateSetting("workspace_name", value)} visible={visible} />
        <SettingSelect label="Default scan depth" description="Controls how much analysis DependGuard performs by default." value={settings.default_scan_depth} onChange={(value) => updateSetting("default_scan_depth", value)} options={[["basic", "Basic"], ["standard", "Standard"], ["deep", "Deep analysis"]]} visible={visible} />
        <SettingSelect label="Preferred ecosystem" description="Default package ecosystem for new scans." value={settings.preferred_ecosystem} onChange={(value) => updateSetting("preferred_ecosystem", value)} options={[["PyPI", "PyPI"], ["npm", "npm"], ["Maven", "Maven"], ["multi-language", "Multi-language"]]} visible={visible} />
        <SettingSelect label="Preferred manifest" description="Default manifest type used by scan forms." value={settings.preferred_manifest_type} onChange={(value) => updateSetting("preferred_manifest_type", value)} options={[["requirements.txt", "requirements.txt"], ["package.json", "package.json"], ["pom.xml", "pom.xml"], ["Pipfile", "Pipfile"]]} visible={visible} />
        <SettingToggle label="Auto-scan uploaded manifests" description="Automatically scan a file after it is uploaded." checked={settings.auto_scan_uploads} onChange={(value) => updateSetting("auto_scan_uploads", value)} visible={visible} />
        <SettingToggle label="Remember last used settings" description="Keep your most recent scan choices for the next workflow." checked={settings.remember_last_settings} onChange={(value) => updateSetting("remember_last_settings", value)} visible={visible} />
      </SettingsSection>
    );
  }

  if (activeTab === "security") {
    return (
      <SettingsSection title="Security Settings" description="Risk scoring, CVE monitoring, and supply-chain enforcement controls." icon={ShieldCheck}>
        <SettingToggle label="Enable live CVE monitoring" description="Use live vulnerability intelligence instead of demo-only mock data." checked={settings.live_cve_monitoring} onChange={(value) => updateSetting("live_cve_monitoring", value)} visible={visible} />
        <SettingToggle label="Strict risk scoring" description="Score findings more aggressively for security-sensitive projects." checked={settings.strict_risk_scoring} onChange={(value) => updateSetting("strict_risk_scoring", value)} visible={visible} />
        <SettingToggle label="Include dev dependencies" description="Scan packages used for testing, building, and development tooling." checked={settings.include_dev_dependencies} onChange={(value) => updateSetting("include_dev_dependencies", value)} visible={visible} />
        <SettingToggle label="Typosquatting detection" description="Flag package names that look suspiciously similar to popular packages." checked={settings.typosquatting_detection} onChange={(value) => updateSetting("typosquatting_detection", value)} visible={visible} />
        <SettingToggle label="Abandoned package detection" description="Highlight dependencies that appear stale or low-maintenance." checked={settings.abandoned_package_detection} onChange={(value) => updateSetting("abandoned_package_detection", value)} visible={visible} />
        <SettingToggle label="License compliance enforcement" description="Treat risky licenses as policy findings." checked={settings.license_compliance_enforcement} onChange={(value) => updateSetting("license_compliance_enforcement", value)} visible={visible} />
        <SettingToggle label="Auto-fix vulnerable packages" description="Prefer safe versions when generating safer manifests." checked={settings.auto_fix_vulnerable_packages} onChange={(value) => updateSetting("auto_fix_vulnerable_packages", value)} visible={visible} />
        <SettingToggle label="Auto-generate safer manifests" description="Prepare fixed manifests after each scan." checked={settings.auto_generate_safe_manifest} onChange={(value) => updateSetting("auto_generate_safe_manifest", value)} visible={visible} />
        <SettingToggle label="Supply chain analysis" description="Calculate package health, license, and maintenance signals." checked={settings.supply_chain_analysis} onChange={(value) => updateSetting("supply_chain_analysis", value)} visible={visible} />
        <SettingSelect label="Vulnerability threshold" description="Minimum severity that should trigger risk workflows." value={settings.vulnerability_threshold} onChange={(value) => updateSetting("vulnerability_threshold", value)} options={[["low", "Low"], ["medium", "Medium"], ["high", "High"], ["critical", "Critical"]]} visible={visible} />
        <SettingSelect label="Severity threshold" description="Legacy threshold used by existing DependGuard workflows." value={settings.severity_threshold} onChange={(value) => updateSetting("severity_threshold", value)} options={[["low", "Low"], ["medium", "Medium"], ["high", "High"], ["critical", "Critical"]]} visible={visible} />
      </SettingsSection>
    );
  }

  if (activeTab === "notifications") {
    return (
      <SettingsSection title="Notification Settings" description="Choose when DependGuard should alert your team." icon={Bell}>
        <SettingToggle label="Notifications" description="Master switch for DependGuard notifications." checked={settings.notifications_enabled} onChange={(value) => updateSetting("notifications_enabled", value)} visible={visible} />
        <SettingToggle label="Email alerts" description="Send dependency security alerts by email." checked={settings.email_alerts} onChange={(value) => updateSetting("email_alerts", value)} visible={visible} />
        <SettingToggle label="Weekly security reports" description="Send a weekly digest of vulnerability and license activity." checked={settings.weekly_security_reports} onChange={(value) => updateSetting("weekly_security_reports", value)} visible={visible} />
        <SettingToggle label="Real-time dashboard alerts" description="Show important alerts directly inside the dashboard." checked={settings.real_time_dashboard_alerts} onChange={(value) => updateSetting("real_time_dashboard_alerts", value)} visible={visible} />
        <SettingToggle label="Critical vulnerability alerts" description="Immediately alert when critical findings appear." checked={settings.critical_vulnerability_alerts} onChange={(value) => updateSetting("critical_vulnerability_alerts", value)} visible={visible} />
        <SettingToggle label="Scan completion notifications" description="Notify you when a scan finishes." checked={settings.scan_completion_notifications} onChange={(value) => updateSetting("scan_completion_notifications", value)} visible={visible} />
        <SettingSelect label="Email frequency" description="How often email alerts should be delivered." value={settings.email_frequency} onChange={(value) => updateSetting("email_frequency", value)} options={[["instant", "Instant"], ["daily", "Daily"], ["weekly", "Weekly"]]} visible={visible} />
      </SettingsSection>
    );
  }

  if (activeTab === "ai") {
    return (
      <SettingsSection title="AI Features" description="Control explanations, remediation language, and beginner guidance." icon={Bot}>
        <SettingToggle label="AI vulnerability explanations" description="Generate plain-language explanations for findings." checked={settings.ai_vulnerability_explanations} onChange={(value) => updateSetting("ai_vulnerability_explanations", value)} visible={visible} />
        <SettingToggle label="AI remediation suggestions" description="Suggest practical upgrade and mitigation steps." checked={settings.ai_remediation_suggestions} onChange={(value) => updateSetting("ai_remediation_suggestions", value)} visible={visible} />
        <SettingToggle label="Beginner cybersecurity mode" description="Use beginner-friendly descriptions across reports." checked={settings.beginner_cybersecurity_mode} onChange={(value) => updateSetting("beginner_cybersecurity_mode", value)} visible={visible} />
        <SettingToggle label="Explain risks in simple language" description="Avoid jargon when explaining vulnerabilities." checked={settings.explain_risks_simple_language} onChange={(value) => updateSetting("explain_risks_simple_language", value)} visible={visible} />
        <SettingToggle label="Auto-generated fix summaries" description="Create concise summaries of recommended fixes." checked={settings.auto_generated_fix_summaries} onChange={(value) => updateSetting("auto_generated_fix_summaries", value)} visible={visible} />
      </SettingsSection>
    );
  }

  if (activeTab === "integrations") {
    return (
      <SettingsSection title="Integrations" description="Connect tools for source control, chat, and automation." icon={Github}>
        <div className="grid gap-4 lg:grid-cols-2">
          {Object.entries(integrationCopy).map(([key, [name, description]]) => {
            if (!visible(name, description)) return null;
            const connected = Boolean(settings.integrations?.[key]?.connected);
            return (
              <IntegrationCard
                key={key}
                name={name}
                description={description}
                connected={connected}
                onConnect={() => updateIntegration(key, true)}
                onDisconnect={() => updateIntegration(key, false)}
              />
            );
          })}
        </div>
      </SettingsSection>
    );
  }

  if (activeTab === "appearance") {
    return (
      <SettingsSection title="Appearance Settings" description="Tune the dashboard experience for your team." icon={Paintbrush}>
        <SettingSelect label="Theme selector" description="Choose dark, light, or follow your system theme." value={settings.theme} onChange={(value) => updateSetting("theme", value)} options={[["dark", "Dark"], ["light", "Light"], ["system", "System"]]} visible={visible} />
        <SettingSelect label="Dashboard density" description="Compact shows more rows; comfortable gives more breathing room." value={settings.dashboard_density} onChange={(value) => updateSetting("dashboard_density", value)} options={[["compact", "Compact"], ["comfortable", "Comfortable"]]} visible={visible} />
        <SettingToggle label="Enable dashboard animations" description="Use smooth transitions and animated panels." checked={settings.dashboard_animations} onChange={(value) => updateSetting("dashboard_animations", value)} visible={visible} />
        <SettingToggle label="Enable glassmorphism effects" description="Use translucent panels and backdrop blur." checked={settings.glassmorphism_effects} onChange={(value) => updateSetting("glassmorphism_effects", value)} visible={visible} />
        <SettingColor label="Accent color picker" description="Choose the primary neon accent color." value={settings.accent_color} onChange={(value) => updateSetting("accent_color", value)} visible={visible} />
      </SettingsSection>
    );
  }

  return (
    <SettingsSection title="Advanced Settings" description="Developer tools, exports, cache controls, and automation flags." icon={SlidersHorizontal}>
      <SettingToggle label="Generate SBOM automatically" description="Prepare a software bill of materials after scans." checked={settings.generate_sbom_automatically} onChange={(value) => updateSetting("generate_sbom_automatically", value)} visible={visible} />
      <SettingToggle label="Enable repository auto-scanning" description="Automatically scan configured repositories." checked={settings.repository_auto_scanning} onChange={(value) => updateSetting("repository_auto_scanning", value)} visible={visible} />
      <SettingToggle label="Cache CVE results" description="Reuse vulnerability lookups to speed up repeated scans." checked={settings.cache_cve_results} onChange={(value) => updateSetting("cache_cve_results", value)} visible={visible} />
      <SettingToggle label="Developer/debug mode" description="Show extra diagnostics for local development." checked={settings.developer_debug_mode} onChange={(value) => updateSetting("developer_debug_mode", value)} visible={visible} />
      <div className="grid gap-3 sm:grid-cols-3">
        <AdvancedButton label="Clear cache" description="Delete cached CVE lookup results." icon={Trash2} onClick={clearCache} visible={visible} />
        <AdvancedButton label="Export logs" description="Download settings and recent scan diagnostics." icon={Download} onClick={() => downloadAction("/settings/actions/export-logs", "dependguard-settings-logs.txt")} visible={visible} />
        <AdvancedButton label="Export reports" description="Download a JSON export of saved scan reports." icon={Download} onClick={() => downloadAction("/settings/actions/export-reports", "dependguard-reports-export.json")} visible={visible} />
      </div>
    </SettingsSection>
  );
}


function SettingShell({ label, description, visible, children }) {
  if (!visible(label, description)) return null;

  return (
    <div
      title={description}
      className="flex flex-col gap-4 rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3 transition hover:border-cyan-300/20 hover:bg-cyan-400/10 sm:flex-row sm:items-center sm:justify-between"
    >
      <span>
        <span className="flex items-center gap-2 text-sm font-semibold text-white">
          {label}
          <LifeBuoy size={14} className="text-cyan-200" />
        </span>
        <span className="mt-1 block text-sm text-slate-400">{description}</span>
      </span>
      {children}
    </div>
  );
}


function SettingToggle({ label, description, checked, onChange, visible }) {
  return (
    <SettingShell label={label} description={description} visible={visible}>
      <ToggleSwitch checked={checked} onChange={onChange} label={label} />
    </SettingShell>
  );
}


function SettingInput({ label, description, value, onChange, visible }) {
  return (
    <SettingShell label={label} description={description} visible={visible}>
      <input className="form-field w-full px-3 py-2.5 text-sm sm:max-w-xs" value={value || ""} onChange={(event) => onChange(event.target.value)} />
    </SettingShell>
  );
}


function SettingSelect({ label, description, value, options, onChange, visible }) {
  return (
    <SettingShell label={label} description={description} visible={visible}>
      <select className="form-field w-full px-3 py-2.5 text-sm sm:max-w-xs" value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>
            {optionLabel}
          </option>
        ))}
      </select>
    </SettingShell>
  );
}


function SettingColor({ label, description, value, onChange, visible }) {
  return (
    <SettingShell label={label} description={description} visible={visible}>
      <div className="flex items-center gap-3">
        <input
          type="color"
          value={value || "#22d3ee"}
          onChange={(event) => onChange(event.target.value)}
          className="h-10 w-14 cursor-pointer rounded-lg border border-white/10 bg-transparent"
          aria-label={label}
        />
        <input className="form-field w-28 px-3 py-2 text-sm" value={value || ""} onChange={(event) => onChange(event.target.value)} />
      </div>
    </SettingShell>
  );
}


function AdvancedButton({ label, description, icon: Icon, onClick, visible }) {
  if (!visible(label, description)) return null;
  return (
    <button
      type="button"
      title={description}
      onClick={onClick}
      className="theme-button flex items-center justify-center gap-2 rounded-lg border px-3 py-3 text-sm font-semibold hover:border-cyan-300/40 hover:text-cyan-200"
    >
      <Icon size={16} />
      {label}
    </button>
  );
}
